import { NextResponse } from "next/server";
import pool from "@/lib/db";

interface MatrixRow {
  shift_code: string;
  day: number;
  employees: number;
}

interface ShiftStaffingMatrixResponse {
  shift_code: string;
  days: Record<string, number>;
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

    // Query registries to build the staffing matrix
    const query = `
      SELECT
        CONCAT(
          shift_type_code,
          IFNULL(position_code, ''),
          IFNULL(sector_code, '')
        ) AS shift_code,
        DAY(registry_date) AS day,
        COUNT(*) AS employees
      FROM registries
      WHERE load_id = ?
      GROUP BY shift_code, day
      ORDER BY shift_code, day
    `;

    const [rows] = await connection.query(query, [loadId]);

    // Convert flat result to pivot table structure
    const matrixMap = new Map<string, Record<string, number>>();

    (rows as MatrixRow[]).forEach((row) => {
      // Skip rows with empty shift codes
      if (!row.shift_code || row.shift_code.trim() === '') {
        return;
      }
      if (!matrixMap.has(row.shift_code)) {
        matrixMap.set(row.shift_code, {});
      }
      matrixMap.get(row.shift_code)![String(row.day)] = row.employees;
    });

    // Convert to desired JSON format
    const response: ShiftStaffingMatrixResponse[] = Array.from(
      matrixMap.entries()
    ).map(([shift_code, days]) => ({
      shift_code,
      days,
    }));

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Shift staffing matrix error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch shift staffing matrix",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await connection.release();
  }
}
