/**
 * Utilities for handling AC shift combinations
 * AC shifts occur when an employee works both A-shift AND C-shift on the same day
 */

export interface ACCombinationData {
  // Map: employee_date → Map<shiftType, shiftCode>
  // e.g., "123_2026-03-06" → {A: "AS", C: "CP1"}
  employeeDaysShifts: Map<string, Map<string, string>>;
  
  // Set of employee-dates with both A and C shifts
  // e.g., {"123_2026-03-06", "124_2026-03-06"}
  acEmployeeDays: Set<string>;
  
  // Map: combinationKey → Map<day, count>
  // Key format: "AS|CP1" (aShiftCode|cShiftCode)
  // e.g., {"AS|CP1" → {6: 2, 7: 1}, "AE2|CP1" → {6: 1}}
  acCombinations: Map<string, Map<number, number>>;
}

export interface RegistryRow {
  employee_id: string;
  registry_date: Date;
  shift_type_code: string;
  position_code: string | null;
  sector_code: string | null;
  shift_code: string;
  [key: string]: any; // Allow other fields
}

/**
 * Analyzes registry data to identify AC shift combinations
 * @param allRows - Raw registry data from database query
 * @returns ACCombinationData with employeeDaysShifts, acEmployeeDays, and acCombinations
 */
export function buildACCombinations(allRows: RegistryRow[]): ACCombinationData {
  // Step 1: Map shifts per employee-date
  const employeeDaysShifts = new Map<string, Map<string, string>>();

  allRows.forEach((row: RegistryRow) => {
    const dateStr = row.registry_date.toISOString().split('T')[0];
    const key = `${row.employee_id}_${dateStr}`;

    if (!employeeDaysShifts.has(key)) {
      employeeDaysShifts.set(key, new Map());
    }
    employeeDaysShifts.get(key)!.set(row.shift_type_code, row.shift_code);
  });

  // Step 2: Identify employee-dates with both A and C shifts
  const acEmployeeDays = new Set<string>();
  employeeDaysShifts.forEach((shiftMap, key) => {
    if (shiftMap.has('A') && shiftMap.has('C')) {
      acEmployeeDays.add(key);
    }
  });

  // Step 3: Build combinations map with counts per day
  const acCombinations = new Map<string, Map<number, number>>();

  acEmployeeDays.forEach((key) => {
    const shiftMap = employeeDaysShifts.get(key)!;
    const aShiftCode = shiftMap.get('A')!;
    const cShiftCode = shiftMap.get('C')!;
    const combinationKey = `${aShiftCode}|${cShiftCode}`;
    const dateStr = key.split('_')[1];
    // Extract day directly from date string (YYYY-MM-DD) to avoid timezone issues
    const dayFromString = parseInt(dateStr.split('-')[2], 10);

    if (!acCombinations.has(combinationKey)) {
      acCombinations.set(combinationKey, new Map());
    }
    const dayMap = acCombinations.get(combinationKey)!;
    dayMap.set(dayFromString, (dayMap.get(dayFromString) || 0) + 1);
  });

  return {
    employeeDaysShifts,
    acEmployeeDays,
    acCombinations,
  };
}

/**
 * Filters AC combinations based on selected positions
 * @param acCombinations - Map of shift combinations
 * @param selectedPositions - Set of selected position codes (e.g., {'S', 'E'})
 * @returns Filtered day-count map with only combinations matching positions
 */
export function filterACCombinationsByPositions(
  acCombinations: Map<string, Map<number, number>>,
  selectedPositions: Set<string>
): Map<number, number> {
  const acDayCountsFiltered = new Map<number, number>();

  // If no filter (all 4 positions), include all combinations
  if (selectedPositions.size === 4) {
    acCombinations.forEach((dayMap) => {
      dayMap.forEach((count, day) => {
        acDayCountsFiltered.set(day, (acDayCountsFiltered.get(day) || 0) + count);
      });
    });
    return acDayCountsFiltered;
  }

  // Filter is active - check each combination
  acCombinations.forEach((dayMap, combinationKey) => {
    // Extract shift codes: "AS|CP1" → ["AS", "CP1"]
    const [aShiftCode, cShiftCode] = combinationKey.split('|');
    
    // Extract positions (index 1 of each shift code)
    const aPosition = aShiftCode.length >= 2 ? aShiftCode[1] : '';
    const cPosition = cShiftCode.length >= 2 ? cShiftCode[1] : '';

    // Include if at least one position matches filter
    if (selectedPositions.has(aPosition) || selectedPositions.has(cPosition)) {
      dayMap.forEach((count, day) => {
        acDayCountsFiltered.set(day, (acDayCountsFiltered.get(day) || 0) + count);
      });
    }
  });

  return acDayCountsFiltered;
}

/**
 * Gets all unique positions involved in AC combinations
 * @param acCombinations - Map of shift combinations
 * @returns Set of positions (e.g., {'S', 'E', 'P'})
 */
export function getACCombinationPositions(
  acCombinations: Map<string, Map<number, number>>
): Set<string> {
  const positions = new Set<string>();

  acCombinations.forEach((_, combinationKey) => {
    const [aShiftCode, cShiftCode] = combinationKey.split('|');
    
    const aPosition = aShiftCode.length >= 2 ? aShiftCode[1] : '';
    const cPosition = cShiftCode.length >= 2 ? cShiftCode[1] : '';
    
    if (aPosition) positions.add(aPosition);
    if (cPosition) positions.add(cPosition);
  });

  return positions;
}
