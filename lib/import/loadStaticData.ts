import { StaticData, ShiftTypeVersion, SpecialCode } from "./types";

/**
 * Load all static data into memory to avoid repeated queries
 */
export async function loadStaticData(
  connection: any
): Promise<StaticData> {
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
