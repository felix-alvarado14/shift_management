import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { buildACCombinations } from "@/lib/acCombinationUtils";

interface EmployeeShiftCountsResponse {
  employee_id: string;
  employee_name: string;
  shift_code: string;
  shift_count: number;
  qualification_id: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ loadId: string }> }
) {
  const connection = await pool.getConnection();
  const resolvedParams = await params;

  try {
    const loadId = parseInt(resolvedParams.loadId);

    if (isNaN(loadId)) {
      return NextResponse.json(
        { success: false, message: "Invalid load_id" },
        { status: 400 }
      );
    }

    // Query all registries with dates to identify AC shifts
    const dataQuery = `
      SELECT
        r.employee_id,
        e.employee_name,
        e.employee_initials,
        IFNULL(e.qualification_id, '') AS qualification_id,
        r.registry_date,
        r.shift_type_code,
        r.position_code,
        r.sector_code,
        CONCAT(
          r.shift_type_code,
          IFNULL(r.position_code, ''),
          IFNULL(r.sector_code, '')
        ) AS shift_code
      FROM registries r
      LEFT JOIN employees e ON r.employee_id = e.employee_id
      WHERE r.load_id = ?
      AND r.registry_counts_as_operational = TRUE
      ORDER BY r.employee_id, r.registry_date
    `;

    const [dataRows] = await connection.query(dataQuery, [loadId]);
    const allRows = dataRows as any[];

    // Build AC combinations
    const { acEmployeeDays, acCombinations } = buildACCombinations(allRows);

    // Count shifts per employee, handling AC combinations
    const shiftCountsByEmployee = new Map<
      string,
      Map<string, { count: number; employee_name: string; qualification_id: string }>
    >();

    allRows.forEach((row: any) => {
      const dateStr = row.registry_date.toISOString().split('T')[0];
      const employeeDayKey = `${row.employee_id}_${dateStr}`;
      const shiftCode = row.shift_code;

      // Skip if empty shift code
      if (!shiftCode || shiftCode.trim() === '') {
        return;
      }

      // Skip individual A and C shifts that are part of AC combinations
      if (
        acEmployeeDays.has(employeeDayKey) &&
        (row.shift_type_code === 'A' || row.shift_type_code === 'C')
      ) {
        return;
      }

      // Initialize employee entry if needed
      if (!shiftCountsByEmployee.has(row.employee_id)) {
        shiftCountsByEmployee.set(row.employee_id, new Map());
      }

      const employeeShifts = shiftCountsByEmployee.get(row.employee_id)!;
      if (!employeeShifts.has(shiftCode)) {
        employeeShifts.set(shiftCode, {
          count: 0,
          employee_name: row.employee_name || '',
          qualification_id: row.qualification_id || '',
        });
      }

      employeeShifts.get(shiftCode)!.count += 1;
    });

    // Add AC shift counts per employee
    acCombinations.forEach((dayMap) => {
      dayMap.forEach((count) => {
        // For each AC combination, we need to find which employees had it
        // and add the AC counts accordingly
      });
    });

    // Process AC combinations to add AC counts per employee
    acEmployeeDays.forEach((employeeDayKey) => {
      const [employeeId, dateStr] = employeeDayKey.split('_');
      const acShiftForDay = allRows.find(
        (row: any) =>
          row.employee_id === employeeId &&
          row.registry_date.toISOString().split('T')[0] === dateStr
      );

      if (acShiftForDay) {
        if (!shiftCountsByEmployee.has(employeeId)) {
          shiftCountsByEmployee.set(employeeId, new Map());
        }

        const employeeShifts = shiftCountsByEmployee.get(employeeId)!;
        if (!employeeShifts.has('AC')) {
          employeeShifts.set('AC', {
            count: 0,
            employee_name: acShiftForDay.employee_name || '',
            qualification_id: acShiftForDay.qualification_id || '',
          });
        }

        employeeShifts.get('AC')!.count += 1;
      }
    });

    // Convert to response format
    const response: EmployeeShiftCountsResponse[] = [];

    shiftCountsByEmployee.forEach((shiftsMap, employeeId) => {
      const shiftArray = Array.from(shiftsMap.entries()).map(
        ([shiftCode, data]) => ({
          employee_id: employeeId,
          employee_name: data.employee_name,
          shift_code: shiftCode,
          shift_count: data.count,
          qualification_id: data.qualification_id,
        })
      );

      // Sort by shift order
      const shiftOrderMap: Record<string, number> = {
        'AS': 1, 'BS': 2, 'CS': 3,
        'AE1': 4, 'AE2': 5, 'AE3': 6, 'AE4': 7,
        'BE1': 8, 'BE2': 9, 'BE3': 10, 'BE4': 11,
        'DE': 12, 'CE1': 13, 'CE2': 14,
        'AP1': 15, 'AP2': 16, 'AP3': 17, 'AP4': 18,
        'BP1': 19, 'BP2': 20, 'BP3': 21, 'BP4': 22,
        'DP': 23, 'CP1': 24, 'CP2': 25,
        'AR': 26, 'BR': 27, 'DR': 28, 'CR': 29,
        'AC': 999,
      };

      shiftArray.sort((a, b) => {
        const orderA = shiftOrderMap[a.shift_code] ?? 999;
        const orderB = shiftOrderMap[b.shift_code] ?? 999;
        return orderA - orderB;
      });

      response.push(...shiftArray);
    });

    // Sort employees by ID (numeric)
    response.sort((a, b) => {
      const numA = parseInt(a.employee_id);
      const numB = parseInt(b.employee_id);
      return numA - numB;
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Employee shift counts error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch employee shift counts",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await connection.release();
  }
}
