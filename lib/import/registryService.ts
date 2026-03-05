/**
 * Insert registry record
 */
export async function insertRegistry(
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
