export interface StaticData {
  qualificationLevelMap: Map<string, number>;
  qualificationIdMap: Map<number, string>;
  positionQualificationMap: Map<string, number>;
  positionCodes: Set<string>;
  shiftTypeCodes: Set<string>;
  shiftTypeVersionMap: Map<string, ShiftTypeVersion[]>;
  specialCodeMap: Map<string, SpecialCode>;
  sectorCodeMap: Map<string, string>;
}

export interface ShiftTypeVersion {
  versionStartDate: Date;
  versionEndDate: Date | null;
  versionHours: number;
  versionCountsAsWork: boolean;
  versionCountsAsOperational: boolean;
}

export interface SpecialCode {
  specialCode: string;
  specialCodeCountsAsWork: boolean;
}

export interface ParsedShiftCode {
  shiftTypeCode: string | null;
  specialCode: string | null;
  positionCode: string | null;
  sectorCode: string | null;
}
