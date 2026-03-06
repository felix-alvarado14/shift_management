import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { buildACCombinations } from "@/lib/acCombinationUtils";

interface ShiftCountRow {
  shift_code: string;
  shift_count: number;
}

interface EmployeeDetailShiftsResponse {
  employee_id: string;
  employee_name: string;
  shifts: ShiftCountRow[];
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ loadId: string; employeeId: string }>;
  }
) {
  const connection = await pool.getConnection();
  const resolvedParams = await params;

  try {
    const loadId = parseInt(resolvedParams.loadId);
    const employeeId = resolvedParams.employeeId;

    if (isNaN(loadId)) {
      return NextResponse.json(
        { success: false, message: "Invalid load_id" },
        { status: 400 }
      );
    }

    if (!employeeId) {
      return NextResponse.json(
        { success: false, message: "Invalid employee_id" },
        { status: 400 }
      );
    }

    // Get employee name
    const [employeeRows] = await connection.query(
      `
      SELECT employee_name
      FROM employees
      WHERE employee_id = ?
      `,
      [employeeId]
    );

    let employeeName = employeeId;
    if (Array.isArray(employeeRows) && employeeRows.length > 0) {
      const row: any = employeeRows[0];
      employeeName = row.employee_name || employeeId;
    }

    // Get all registries with dates to identify AC combinations
    const [allDataRows] = await connection.query(
      `
      SELECT
        r.employee_id,
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
      WHERE r.load_id = ?
      AND r.registry_counts_as_operational = TRUE
      ORDER BY r.registry_date, r.employee_id
      `,
      [loadId]
    );

    // Build AC combinations for all data
    const { acEmployeeDays, acCombinations } = buildACCombinations(
      allDataRows as any[]
    );

    // Get shifts for this specific employee, handling AC combinations
    const shiftCounts = new Map<string, number>();
    let acShiftCount = 0;

    (allDataRows as any[]).forEach((row: any) => {
      if (row.employee_id !== employeeId) {
        return;
      }

      const dateStr = row.registry_date.toISOString().split('T')[0];
      const employeeDayKey = `${row.employee_id}_${dateStr}`;
      const shiftCode = row.shift_code;

      if (!shiftCode || shiftCode.trim() === '') {
        return;
      }

      // If on an AC day, skip C shifts (count only A)
      if (
        acEmployeeDays.has(employeeDayKey) &&
        row.shift_type_code === 'C'
      ) {
        return;
      }

      // If on an AC day and this is an A shift, count it as AC instead
      if (
        acEmployeeDays.has(employeeDayKey) &&
        row.shift_type_code === 'A'
      ) {
        // Skip adding the A shift, we'll add AC instead (only once per day)
        return;
      }

      shiftCounts.set(shiftCode, (shiftCounts.get(shiftCode) || 0) + 1);
    });

    // Count AC shifts for this employee
    acEmployeeDays.forEach((employeeDayKey) => {
      const [dateStr] = employeeDayKey.split('_');
      if (employeeDayKey.startsWith(`${employeeId}_`)) {
        acShiftCount += 1;
      }
    });

    // Build shift array with shift order
    const SHIFT_ORDER_MAP: Record<string, number> = {
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

    const shifts: ShiftCountRow[] = Array.from(shiftCounts.entries())
      .map(([shift_code, shift_count]) => ({
        shift_code,
        shift_count,
      }))
      .sort(
        (a, b) =>
          (SHIFT_ORDER_MAP[a.shift_code] ?? 999) -
          (SHIFT_ORDER_MAP[b.shift_code] ?? 999)
      );

    // Add AC shift if this employee has any
    if (acShiftCount > 0) {
      shifts.push({
        shift_code: 'AC',
        shift_count: acShiftCount,
      });
    }

    const response: EmployeeDetailShiftsResponse = {
      employee_id: employeeId,
      employee_name: employeeName,
      shifts,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Employee detail shifts error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch employee detail shifts",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await connection.release();
  }
}
