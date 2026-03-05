import { NextResponse } from "next/server";
import { Workbook } from "exceljs";
import { RowValues } from "exceljs";
import pool from "@/lib/db";
import { loadStaticData } from "@/lib/import/loadStaticData";
import { parseShiftCode } from "@/lib/import/parseShiftCode";
import { resolveShiftVersion } from "@/lib/import/resolveShiftVersion";
import { upsertEmployee } from "@/lib/import/employeeService";
import { insertRegistry } from "@/lib/import/registryService";

interface RowData {
  employeeId: string;
  employeeName: string;
  employeeInitials: string;
  days: Array<{ day: number; shiftCode: string }>;
}

interface RegistryData {
  employeeId: string;
  registryDate: Date;
  shiftCodeOriginal: string;
  shiftTypeCode: string | null;
  specialCode: string | null;
  positionCode: string | null;
  sectorCode: string | null;
  registryHours: number;
  registryCountsAsWork: boolean;
  registryCountsAsOperational: boolean;
}

/**
 * Main endpoint handler
 */
export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    // Parse request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const loadYear = parseInt(formData.get("load_year") as string);
    const loadMonth = parseInt(formData.get("load_month") as string);
    const loadType = formData.get("load_type") as "P" | "R";

    // Validation
    if (!file || isNaN(loadYear) || isNaN(loadMonth) || !loadType) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing or invalid required fields",
        },
        { status: 400 }
      );
    }

    if (loadMonth < 1 || loadMonth > 12) {
      return NextResponse.json(
        { success: false, message: "Invalid load_month (1-12)" },
        { status: 400 }
      );
    }

    if (!["P", "R"].includes(loadType)) {
      return NextResponse.json(
        { success: false, message: "Invalid load_type (must be P or R)" },
        { status: 400 }
      );
    }

    // Start transaction
    await connection.beginTransaction();

    try {
      // Insert load record
      const [loadResult] = await connection.execute(
        `INSERT INTO loads (load_file_name, load_year, load_month, load_type)
         VALUES (?, ?, ?, ?)`,
        [file.name, loadYear, loadMonth, loadType]
      );
      const loadId = (loadResult as any).insertId;

      // Load static data into memory
      const staticData = await loadStaticData(connection);

      // Read Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error("No worksheet found in Excel file");
      }

      let totalEmployeesProcessed = 0;
      let totalRegistriesInserted = 0;

      // Collect all row data first (synchronously)
      interface RowData {
        employeeId: string;
        employeeName: string;
        employeeInitials: string;
        days: Array<{ day: number; shiftCode: string }>;
      }

      const rowsData: RowData[] = [];

      worksheet.eachRow((row, rowNumber) => {
        // Skip header rows (rowNumber 1)
        if (rowNumber === 1) return;

        const cells = row.values as RowValues;
        if (!cells || !Array.isArray(cells) || cells.length < 4) return;

        // Column 1: employee_id (must be numeric)
        const employeeId = cells[1];
        if (!employeeId) return;

        // Validate that first column is truly numeric (not text header)
        const employeeIdNum = Number(employeeId);
        if (isNaN(employeeIdNum) || employeeIdNum <= 0) {
          return; // Skip non-numeric rows (headers)
        }

        const employeeIdStr = String(employeeIdNum);
        const employeeInitials = String(cells[2] || "").trim();
        const employeeName = String(cells[3] || "").trim();

        // Skip rows without a valid name
        if (!employeeName) return;

        // Validate column constraints to prevent insertion errors
        if (employeeIdStr.length > 20) {
          return;
        }
        if (employeeName.length > 100) {
          return;
        }
        if (employeeInitials.length > 10) {
          return;
        }

        const days: Array<{ day: number; shiftCode: string }> = [];

        // Collect day columns (4 onward = days 1-31)
        for (let dayIndex = 4; dayIndex < cells.length; dayIndex++) {
          const day = dayIndex - 3; // Day 1 is at index 4
          if (day > 31) break;

          const shiftCodeOriginal = cells[dayIndex];
          if (shiftCodeOriginal && String(shiftCodeOriginal).trim() !== "") {
            days.push({ day, shiftCode: String(shiftCodeOriginal) });
          }
        }

        rowsData.push({
          employeeId: employeeIdStr,
          employeeName,
          employeeInitials,
          days,
        });
      });

      // First Pass: Determine employee qualifications and collect registry data
      const processedEmployees = new Map<string, {
        name: string;
        initials: string;
        highestQualLevel: number;
        highestQualId: string | null;
      }>();

      interface RegistryData {
        employeeId: string;
        registryDate: Date;
        shiftCodeOriginal: string;
        shiftTypeCode: string | null;
        specialCode: string | null;
        positionCode: string | null;
        sectorCode: string | null;
        registryHours: number;
        registryCountsAsWork: boolean;
        registryCountsAsOperational: boolean;
      }

      const registriesToInsert: RegistryData[] = [];

      for (const rowData of rowsData) {
        // Initialize tracking for this employee
        if (!processedEmployees.has(rowData.employeeId)) {
          processedEmployees.set(rowData.employeeId, {
            name: rowData.employeeName,
            initials: rowData.employeeInitials,
            highestQualLevel: 0,
            highestQualId: null,
          });
          totalEmployeesProcessed++;
        }

        const employeeData = processedEmployees.get(rowData.employeeId)!;

        // Process each day for this employee
        for (const dayData of rowData.days) {
          // Build registry date
          const registryDate = new Date(loadYear, loadMonth - 1, dayData.day);

          // Check if this is a compound shift (format: AX/CX)
          // Compound shifts like AS/CP1 should be split and inserted as two separate registries
          const shiftCodesToProcess = dayData.shiftCode.includes('/')
            ? dayData.shiftCode.split('/')
            : [dayData.shiftCode];

          // Process each individual shift
          for (const shiftCode of shiftCodesToProcess) {
            // Parse shift code
            const parsed = parseShiftCode(
              shiftCode,
              staticData.specialCodeMap,
              staticData.shiftTypeCodes
            );

            let registryHours = 0;
            let registryCountsAsWork = false;
            let registryCountsAsOperational = false;

            // Handle special code
            if (parsed.specialCode) {
              const specialCode = staticData.specialCodeMap.get(
                parsed.specialCode
              );
              if (specialCode) {
                registryCountsAsWork = specialCode.specialCodeCountsAsWork;
                registryCountsAsOperational = false;
              }

              registriesToInsert.push({
                employeeId: rowData.employeeId,
                registryDate,
                shiftCodeOriginal: dayData.shiftCode,
                shiftTypeCode: null,
                specialCode: parsed.specialCode,
                positionCode: null,
                sectorCode: null,
                registryHours,
                registryCountsAsWork,
                registryCountsAsOperational,
              });
            }
            // Handle regular shift code
            else if (parsed.shiftTypeCode) {
              // Resolve shift version
              const version = resolveShiftVersion(
                parsed.shiftTypeCode,
                registryDate,
                staticData.shiftTypeVersionMap
              );

              if (version) {
                registryHours = version.versionHours;
                registryCountsAsWork = version.versionCountsAsWork;
                registryCountsAsOperational =
                  version.versionCountsAsOperational;
              }

              // Update highest qualification if position exists
              if (parsed.positionCode) {
                const qualLevel = staticData.positionQualificationMap.get(
                  parsed.positionCode
                ) || 0;
                if (qualLevel > employeeData.highestQualLevel) {
                  employeeData.highestQualLevel = qualLevel;
                }
              }

              // Validate sector_code and position_code exist in database
              const validatedSectorCode = parsed.sectorCode && staticData.sectorCodeMap.has(parsed.sectorCode)
                ? parsed.sectorCode
                : null;
              const validatedPositionCode = parsed.positionCode && staticData.positionCodes.has(parsed.positionCode)
                ? parsed.positionCode
                : null;

              registriesToInsert.push({
                employeeId: rowData.employeeId,
                registryDate,
                shiftCodeOriginal: dayData.shiftCode,
                shiftTypeCode: parsed.shiftTypeCode,
                specialCode: null,
                positionCode: validatedPositionCode,
                sectorCode: validatedSectorCode,
                registryHours,
                registryCountsAsWork,
                registryCountsAsOperational,
              });
            }
          }
        }
      }

      // Second Pass: Upsert all employees FIRST (before inserting registries)
      for (const [employeeId, data] of processedEmployees) {
        const qualId = data.highestQualLevel > 0
          ? staticData.qualificationIdMap.get(data.highestQualLevel)
          : null;

        await upsertEmployee(
          connection,
          employeeId,
          data.name,
          data.initials,
          qualId || null
        );
      }

      // Third Pass: Now insert all registries (employees exist now)
      for (const registry of registriesToInsert) {
        await insertRegistry(
          connection,
          loadId,
          registry.employeeId,
          registry.registryDate,
          registry.shiftCodeOriginal,
          registry.shiftTypeCode,
          registry.specialCode,
          registry.positionCode,
          registry.sectorCode,
          registry.registryHours,
          registry.registryCountsAsWork,
          registry.registryCountsAsOperational
        );
        totalRegistriesInserted++;
      }

      // Commit transaction
      await connection.commit();

      return NextResponse.json({
        success: true,
        load_id: loadId,
        total_employees_processed: totalEmployeesProcessed,
        total_registries_inserted: totalRegistriesInserted,
      });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Import error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to process import",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await connection.release();
  }
}
