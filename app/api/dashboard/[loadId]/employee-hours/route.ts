import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { buildACCombinations } from "@/lib/acCombinationUtils";

interface EmployeeHoursResponse {
  employee_id: string;
  employee_name: string;
  employee_initials: string;
  operational_hours: number;
  non_operational_hours: number;
  effective_work_hours: number;
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
        ) AS shift_code,
        r.registry_hours,
        r.registry_counts_as_operational,
        r.registry_counts_as_work
      FROM registries r
      LEFT JOIN employees e ON r.employee_id = e.employee_id
      WHERE r.load_id = ?
      ORDER BY r.employee_id, r.registry_date
    `;

    const [dataRows] = await connection.query(dataQuery, [loadId]);
    const allRows = dataRows as any[];

    // Build AC combinations
    const { acEmployeeDays } = buildACCombinations(allRows);

    // Calculate hours per employee, avoiding double-counting AC shifts
    const employeeHours = new Map<
      string,
      {
        employee_name: string;
        employee_initials: string;
        qualification_id: string;
        operational_hours: number;
        non_operational_hours: number;
        effective_work_hours: number;
      }
    >();

    allRows.forEach((row: any) => {
      const dateStr = row.registry_date.toISOString().split('T')[0];
      const employeeDayKey = `${row.employee_id}_${dateStr}`;

      // Include all shifts - for AC days, we count both A and C hours together
      // (not skipping any to get total hours)

      if (!employeeHours.has(row.employee_id)) {
        employeeHours.set(row.employee_id, {
          employee_name: row.employee_name || '',
          employee_initials: row.employee_initials || '',
          qualification_id: row.qualification_id || '',
          operational_hours: 0,
          non_operational_hours: 0,
          effective_work_hours: 0,
        });
      }

      const hours = employeeHours.get(row.employee_id)!;
      const registryHours = Number(row.registry_hours) || 0;

      if (row.registry_counts_as_operational) {
        hours.operational_hours += registryHours;
      } else if (row.registry_counts_as_work) {
        hours.non_operational_hours += registryHours;
      }

      if (row.registry_counts_as_work) {
        hours.effective_work_hours += registryHours;
      }
    });

    // Convert to response format
    const response: EmployeeHoursResponse[] = Array.from(
      employeeHours.entries()
    )
      .map(([employee_id, hours]) => ({
        employee_id,
        employee_name: hours.employee_name,
        employee_initials: hours.employee_initials,
        operational_hours: hours.operational_hours,
        non_operational_hours: hours.non_operational_hours,
        effective_work_hours: hours.effective_work_hours,
        qualification_id: hours.qualification_id,
      }))
      .sort((a, b) => {
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
    console.error("Employee hours error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch employee hours",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await connection.release();
  }
}
