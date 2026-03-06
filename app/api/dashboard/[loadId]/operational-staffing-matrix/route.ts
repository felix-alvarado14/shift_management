import { NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  buildACCombinations,
  filterACCombinationsByPositions,
} from "@/lib/acCombinationUtils";

interface MatrixRow {
  shift_code: string;
  days: Record<string, number>;
}

interface ShiftStaffingMatrixResponse {
  shift_code: string;
  days: Record<string, number>;
}

// Define shift order (same as in other matrices)
const SHIFT_ORDER_MAP: Record<string, number> = {
  // SUPERVISION
  'AS': 1, 'BS': 2, 'CS': 3,
  // EXECUTIVE
  'AE1': 4, 'AE2': 5, 'AE3': 6, 'AE4': 7,
  'BE1': 8, 'BE2': 9, 'BE3': 10, 'BE4': 11,
  'DE': 12, 'CE1': 13, 'CE2': 14,
  // PLANNER
  'AP1': 15, 'AP2': 16, 'AP3': 17, 'AP4': 18,
  'BP1': 19, 'BP2': 20, 'BP3': 21, 'BP4': 22,
  'DP': 23, 'CP1': 24, 'CP2': 25,
  // RADIO
  'AR': 26, 'BR': 27, 'DR': 28, 'CR': 29,
  // AC (always last)
  'AC': 999,
};

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

    // Parse position filter from query parameters
    const url = new URL(request.url);
    const positionsParam = url.searchParams.get('positions');
    const selectedPositions = new Set(
      positionsParam ? positionsParam.split(',') : ['S', 'E', 'P', 'R']
    );

    // Query registries to get full shift codes with positions
    // We need the original shift codes (AS, AE1, CP1, etc.) not the effective types
    const query = `
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
    `;

    const [allRows] = await connection.query(query, [loadId]);

    // Step 1: Build AC combinations from registry data
    const { employeeDaysShifts, acEmployeeDays, acCombinations } =
      buildACCombinations(allRows as any[]);

    // Step 2: Build shift-day map, handling AC combinations
    const shiftDayCountMap = new Map<string, Map<number, Set<string>>>();

    (allRows as any[]).forEach((row: any) => {
      const dateStr = row.registry_date.toISOString().split('T')[0];
      const employeeDayKey = `${row.employee_id}_${dateStr}`;
      // Extract day directly from date string to avoid timezone issues
      const day = parseInt(dateStr.split('-')[2], 10);
      const shiftCode = row.shift_code;

      // Skip empty shift codes
      if (!shiftCode || shiftCode.trim() === '') {
        return;
      }

      // If this employee-day is a double shift (A+C)
      if (acEmployeeDays.has(employeeDayKey)) {
        // Skip individual A and C shifts (they'll be counted as AC instead)
        if (row.shift_type_code === 'A' || row.shift_type_code === 'C') {
          return;
        }
      }

      // For all other shifts (non-A/C or single shifts), add normally
      if (!shiftDayCountMap.has(shiftCode)) {
        shiftDayCountMap.set(shiftCode, new Map());
      }
      if (!shiftDayCountMap.get(shiftCode)!.has(day)) {
        shiftDayCountMap.get(shiftCode)!.set(day, new Set());
      }
      shiftDayCountMap.get(shiftCode)!.get(day)!.add(row.employee_id);
    });

    // Step 3: Filter AC combinations based on selected positions
    let acRowData: Map<number, number> | null = null;
    if (acCombinations.size > 0) {
      const filteredCounts = filterACCombinationsByPositions(
        acCombinations,
        selectedPositions
      );
      if (filteredCounts.size > 0) {
        acRowData = filteredCounts;
      }
    }

    // Step 4: Convert to matrix format
    const matrixRows: ShiftStaffingMatrixResponse[] = [];
    
    shiftDayCountMap.forEach((dayMap, shiftCode) => {
      // Apply position filtering for non-AC shifts
      if (selectedPositions.size < 4) {
        // Filter is active
        const position = shiftCode.length >= 2 ? shiftCode[1] : '';
        if (!selectedPositions.has(position)) {
          return; // Skip this shift
        }
      }
      
      // Include this shift
      const days: Record<string, number> = {};
      dayMap.forEach((employees, day) => {
        days[String(day)] = employees.size;
      });

      if (Object.keys(days).length > 0) {
        matrixRows.push({ shift_code: shiftCode, days });
      }
    });

    // Add AC row if it has data
    if (acRowData) {
      const acDays: Record<string, number> = {};
      acRowData.forEach((count, day) => {
        acDays[String(day)] = count;
      });
      matrixRows.push({ shift_code: 'AC', days: acDays });
    }

    // Sort by shift order
    matrixRows.sort(
      (a, b) => (SHIFT_ORDER_MAP[a.shift_code] ?? 999) - (SHIFT_ORDER_MAP[b.shift_code] ?? 999)
    );

    const response = matrixRows;

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Operational staffing matrix error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch operational staffing matrix",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await connection.release();
  }
}
