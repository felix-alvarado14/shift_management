import { NextResponse } from "next/server";
import { Workbook } from "exceljs";
import pool from "@/lib/db";
import { RowValues } from "exceljs";

interface StaticData {
  qualificationLevelMap: Map<string, number>;
  qualificationIdMap: Map<number, string>;
  positionQualificationMap: Map<string, number>;
  positionCodes: Set<string>;
  shiftTypeCodes: Set<string>;
  shiftTypeVersionMap: Map<string, ShiftTypeVersion[]>;
  specialCodeMap: Map<string, SpecialCode>;
  sectorCodeMap: Map<string, string>;
}

interface ShiftTypeVersion {
  versionStartDate: Date;
  versionEndDate: Date | null;
  versionHours: number;
  versionCountsAsWork: boolean;
  versionCountsAsOperational: boolean;
}

interface SpecialCode {
  specialCode: string;
  specialCodeCountsAsWork: boolean;
}

interface ParsedShiftCode {
  shiftTypeCode: string | null;
  specialCode: string | null;
  positionCode: string | null;
  sectorCode: string | null;
}

/**
 * Load all static data into memory to avoid repeated queries
 */
async function loadStaticData(connection: any): Promise<StaticData> {
  const qualificationLevelMap = new Map<string, number>();
  const qualificationIdMap = new Map<number, string>();
  const positionQualificationMap = new Map<string, number>();
  const positionCodes = new Set<string>();
  const shiftTypeVersionMap = new Map<string, ShiftTypeVersion[]>();
  const specialCodeMap = new Map<string, SpecialCode>();
  const sectorCodeMap = new Map<string, string>();

  // Load qualifications
  const [qualifications] = await connection.query(
    "SELECT qualification_id, qualification_level FROM qualifications"
  );
  (qualifications as any[]).forEach((qual) => {
    qualificationLevelMap.set(qual.qualification_id, qual.qualification_level);
    qualificationIdMap.set(qual.qualification_level, qual.qualification_id);
  });

  // Load positions with their qualification requirements
  const [positions] = await connection.query(
    "SELECT position_code, position_name FROM positions"
  );
  (positions as any[]).forEach((pos) => {
    positionCodes.add(pos.position_code);
    // Map position code to qualification level from database
    // Position codes correspond to qualification IDs (R, P, E, S, etc.)
    const qualLevel = qualificationLevelMap.get(pos.position_code);
    if (qualLevel !== undefined) {
      positionQualificationMap.set(pos.position_code, qualLevel);
    }
  });

  // Load sectors
  const [sectors] = await connection.query(
    "SELECT sector_code, sector_name FROM sectors"
  );
  (sectors as any[]).forEach((sector) => {
    sectorCodeMap.set(sector.sector_code, sector.sector_name);
  });

  // Load shift type versions and codes
  const [versions] = await connection.query(
    `SELECT 
      shift_type_code, 
      version_start_date, 
      version_end_date,
      version_hours, 
      version_counts_as_work, 
      version_counts_as_operational 
    FROM shift_type_versions 
    ORDER BY shift_type_code, version_start_date`
  );
  const shiftTypeCodes = new Set<string>();
  (versions as any[]).forEach((version) => {
    shiftTypeCodes.add(version.shift_type_code);
    const key = version.shift_type_code;
    if (!shiftTypeVersionMap.has(key)) {
      shiftTypeVersionMap.set(key, []);
    }
    shiftTypeVersionMap.get(key)!.push({
      versionStartDate: version.version_start_date,
      versionEndDate: version.version_end_date,
      versionHours: version.version_hours,
      versionCountsAsWork: version.version_counts_as_work,
      versionCountsAsOperational: version.version_counts_as_operational,
    });
  });

  // Load special codes
  const [specialCodes] = await connection.query(
    "SELECT special_code, special_code_counts_as_work FROM special_codes"
  );
  (specialCodes as any[]).forEach((code) => {
    specialCodeMap.set(code.special_code, {
      specialCode: code.special_code,
      specialCodeCountsAsWork: code.special_code_counts_as_work,
    });
  });

  return {
    qualificationLevelMap,
    qualificationIdMap,
    positionQualificationMap,
    positionCodes,
    shiftTypeCodes,
    shiftTypeVersionMap,
    specialCodeMap,
    sectorCodeMap,
  };
}

/**
 * Parse shift code into components
 * Intelligently matches shift type codes (can be multi-letter like "HO")
 * Then extracts position and sector from remainder
 * Examples: AP1, AS, HO, A
 */
function parseShiftCode(
  code: string,
  specialCodeMap: Map<string, SpecialCode>,
  shiftTypeCodes: Set<string>
): ParsedShiftCode {
  const trimmedCode = code.trim().toUpperCase();

  // Check if it's a special code first
  if (specialCodeMap.has(trimmedCode)) {
    return {
      shiftTypeCode: null,
      specialCode: trimmedCode,
      positionCode: null,
      sectorCode: null,
    };
  }

  let shiftTypeCode: string | null = null;
  let positionCode: string | null = null;
  let sectorCode: string | null = null;

  // Try to match shift type by checking longest possible match first
  // This handles multi-letter shift types like "HO"
  for (let checkLen = Math.min(trimmedCode.length, 3); checkLen >= 1; checkLen--) {
    const potentialShiftType = trimmedCode.substring(0, checkLen);
    if (shiftTypeCodes.has(potentialShiftType)) {
      shiftTypeCode = potentialShiftType;
      const remainder = trimmedCode.substring(checkLen);

      // From remainder, extract sector (trailing digits) and position (letter)
      const sectorMatch = remainder.match(/(\d+)$/);
      if (sectorMatch) {
        sectorCode = sectorMatch[1];
        const withoutSector = remainder.substring(
          0,
          remainder.length - sectorCode.length
        );
        if (withoutSector.length > 0) {
          positionCode = withoutSector; // Everything before digits is position
        }
      } else {
        // No trailing digits, entire remainder is position
        if (remainder.length > 0) {
          positionCode = remainder;
        }
      }
      break;
    }
  }

  return {
    shiftTypeCode,
    specialCode: null,
    positionCode,
    sectorCode,
  };
}

/**
 * Normalize a date to just the date part (YYYY-MM-DD) for comparison
 */
function normalizeDate(d: Date | string): Date {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Resolve the correct shift version for a given date
 */
function resolveShiftVersion(
  shiftTypeCode: string,
  registryDate: Date,
  shiftTypeVersionMap: Map<string, ShiftTypeVersion[]>
): ShiftTypeVersion | null {
  const versions = shiftTypeVersionMap.get(shiftTypeCode);
  if (!versions || versions.length === 0) {
    return null;
  }

  // Normalize registry date for comparison
  const normalizedRegistryDate = normalizeDate(registryDate);

  // Find the version that covers this date
  for (const version of versions) {
    const startDate = normalizeDate(version.versionStartDate);
    const endDate = version.versionEndDate ? normalizeDate(version.versionEndDate) : null;

    if (
      normalizedRegistryDate >= startDate &&
      (!endDate || normalizedRegistryDate <= endDate)
    ) {
      return version;
    }
  }

  return null;
}

/**
 * Insert or update employee with qualification
 */
async function upsertEmployee(
  connection: any,
  employeeId: string,
  employeeName: string,
  employeeInitials: string,
  qualificationId: string | null
): Promise<void> {
  const query = `
    INSERT INTO employees (employee_id, employee_name, employee_initials, qualification_id)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      employee_name = VALUES(employee_name),
      employee_initials = VALUES(employee_initials),
      qualification_id = VALUES(qualification_id),
      employee_updated_at = CURRENT_TIMESTAMP
  `;

  await connection.execute(query, [
    employeeId,
    employeeName,
    employeeInitials,
    qualificationId,
  ]);
}

/**
 * Insert registry record
 */
async function insertRegistry(
  connection: any,
  loadId: number,
  employeeId: string,
  registryDate: Date,
  shiftCodeOriginal: string,
  shiftTypeCode: string | null,
  specialCode: string | null,
  positionCode: string | null,
  sectorCode: string | null,
  registryHours: number,
  registryCountsAsWork: boolean,
  registryCountsAsOperational: boolean
): Promise<void> {
  const query = `
    INSERT INTO registries (
      load_id, employee_id, registry_date, shift_code_original,
      shift_type_code, special_code, position_code, sector_code,
      registry_hours, registry_counts_as_work, registry_counts_as_operational
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await connection.execute(query, [
    loadId,
    employeeId,
    registryDate,
    shiftCodeOriginal,
    shiftTypeCode,
    specialCode,
    positionCode,
    sectorCode,
    registryHours,
    registryCountsAsWork,
    registryCountsAsOperational,
  ]);
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

          // Parse shift code
          const parsed = parseShiftCode(
            dayData.shiftCode,
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
