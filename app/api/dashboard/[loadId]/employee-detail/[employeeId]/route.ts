import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { buildACCombinations } from "@/lib/acCombinationUtils";

interface NonOperationalActivity {
  code: string;
  count: number;
}

interface ShiftCount {
  shift: string;
  count: number;
}

interface OperationalHours {
  shift: string;
  hours: number;
}

interface NonOperationalHours {
  code: string;
  hours: number;
}

interface EmployeeDetailResponse {
  employee_id: string;
  employee_name: string;
  non_operational_activities: NonOperationalActivity[];
  shift_counts: ShiftCount[];
  operational_hours: OperationalHours[];
  non_operational_hours: NonOperationalHours[];
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

    // Query 1: Non-operational activities (special_code counts + HO shifts)
    const [nonOpActivities] = await connection.query(
      `
      SELECT
        special_code AS code,
        COUNT(*) AS count
      FROM registries
      WHERE load_id = ?
      AND employee_id = ?
      AND special_code IS NOT NULL
      GROUP BY special_code
      UNION ALL
      SELECT
        shift_type_code AS code,
        COUNT(*) AS count
      FROM registries
      WHERE load_id = ?
      AND employee_id = ?
      AND shift_type_code = 'HO'
      GROUP BY shift_type_code
      ORDER BY code
      `,
      [loadId, employeeId, loadId, employeeId]
    );

    // Get all operational registries to identify AC shifts
    const [allOpData] = await connection.query(
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
        ) AS shift_code,
        r.registry_hours,
        r.registry_counts_as_operational
      FROM registries r
      WHERE r.load_id = ?
      AND r.registry_counts_as_operational = 1
      ORDER BY r.registry_date
      `,
      [loadId]
    );

    // Build AC combinations for all operational data
    const { acEmployeeDays } = buildACCombinations(allOpData as any[]);

    // Query 2: Number of shifts with AC logic
    const shiftCountsMap = new Map<string, number>();
    let acShiftCountForEmployee = 0;

    (allOpData as any[]).forEach((row: any) => {
      if (row.employee_id !== employeeId) {
        return;
      }

      const dateStr = row.registry_date.toISOString().split('T')[0];
      const employeeDayKey = `${row.employee_id}_${dateStr}`;

      // Skip C shifts on AC days
      if (
        acEmployeeDays.has(employeeDayKey) &&
        row.shift_type_code === 'C'
      ) {
        return;
      }

      // For A shifts on AC days, don't count them here (we'll count as AC)
      if (
        acEmployeeDays.has(employeeDayKey) &&
        row.shift_type_code === 'A'
      ) {
        return;
      }

      // Skip HO shifts (like in original)
      if (row.shift_type_code === 'HO') {
        return;
      }

      shiftCountsMap.set(
        row.shift_type_code,
        (shiftCountsMap.get(row.shift_type_code) || 0) + 1
      );
    });

    // Count AC shifts for this employee
    acEmployeeDays.forEach((employeeDayKey) => {
      if (employeeDayKey.startsWith(`${employeeId}_`)) {
        acShiftCountForEmployee += 1;
      }
    });

    // Query 3: Operational hours by shift with AC logic
    const opHoursMap = new Map<string, number>();
    let acHoursForEmployee = 0;

    (allOpData as any[]).forEach((row: any) => {
      if (row.employee_id !== employeeId) {
        return;
      }

      const dateStr = row.registry_date.toISOString().split('T')[0];
      const employeeDayKey = `${row.employee_id}_${dateStr}`;
      const hours = Number(row.registry_hours) || 0;

      // Skip C shifts on AC days
      if (
        acEmployeeDays.has(employeeDayKey) &&
        row.shift_type_code === 'C'
      ) {
        return;
      }

      // For A shifts on AC days, add hours to AC (not to A)
      if (
        acEmployeeDays.has(employeeDayKey) &&
        row.shift_type_code === 'A'
      ) {
        return;
      }

      // Skip HO shifts
      if (row.shift_type_code === 'HO') {
        return;
      }

      opHoursMap.set(
        row.shift_type_code,
        (opHoursMap.get(row.shift_type_code) || 0) + hours
      );
    });

    // Sum AC hours (for AC days, both A and C hours count)
    (allOpData as any[]).forEach((row: any) => {
      if (row.employee_id !== employeeId) {
        return;
      }

      const dateStr = row.registry_date.toISOString().split('T')[0];
      const employeeDayKey = `${row.employee_id}_${dateStr}`;
      const hours = Number(row.registry_hours) || 0;

      if (
        acEmployeeDays.has(employeeDayKey) &&
        (row.shift_type_code === 'A' || row.shift_type_code === 'C')
      ) {
        acHoursForEmployee += hours;
      }
    });

    // Convert maps to response format
    const shiftCounts = Array.from(shiftCountsMap.entries()).map(
      ([shift, count]) => ({
        shift,
        count,
      })
    );

    const opHours = Array.from(opHoursMap.entries()).map(
      ([shift, hours]) => ({
        shift,
        hours,
      })
    );

    // Add AC counts if this employee has AC shifts
    if (acShiftCountForEmployee > 0) {
      shiftCounts.push({
        shift: 'AC',
        count: acShiftCountForEmployee,
      });
      opHours.push({
        shift: 'AC',
        hours: acHoursForEmployee,
      });
    }

    // Query 4: Non-operational hours (special_code + HO shifts)
    const [nonOpHours] = await connection.query(
      `
      SELECT
        special_code AS code,
        SUM(registry_hours) AS hours
      FROM registries
      WHERE load_id = ?
      AND employee_id = ?
      AND registry_counts_as_operational = 0
      AND registry_counts_as_work = 1
      AND special_code IS NOT NULL
      GROUP BY special_code
      UNION ALL
      SELECT
        shift_type_code AS code,
        SUM(registry_hours) AS hours
      FROM registries
      WHERE load_id = ?
      AND employee_id = ?
      AND shift_type_code = 'HO'
      GROUP BY shift_type_code
      ORDER BY code
      `,
      [loadId, employeeId, loadId, employeeId]
    );

    // Query 5: Get employee name
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

    const response: EmployeeDetailResponse = {
      employee_id: employeeId,
      employee_name: employeeName,
      non_operational_activities: (nonOpActivities as NonOperationalActivity[]).map(
        (row: any) => ({
          code: row.code || "",
          count: Number(row.count) || 0,
        })
      ),
      shift_counts: shiftCounts.map((row: any) => ({
        shift: row.shift || "",
        count: Number(row.count) || 0,
      })),
      operational_hours: opHours.map((row: any) => ({
        shift: row.shift || "",
        hours: Number(row.hours) || 0,
      })),
      non_operational_hours: (nonOpHours as NonOperationalHours[]).map(
        (row: any) => ({
          code: row.code || "",
          hours: Number(row.hours) || 0,
        })
      ),
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Employee detail error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch employee detail",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await connection.release();
  }
}
