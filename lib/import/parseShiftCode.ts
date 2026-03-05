import { ParsedShiftCode, SpecialCode } from "./types";

/**
 * Parse shift code into components
 * Intelligently matches shift type codes (can be multi-letter like "HO")
 * Then extracts position and sector from remainder
 * Examples: AP1, AS, HO, A
 */
export function parseShiftCode(
  code: string,
  specialCodeMap: Map<string, SpecialCode>,
  shiftTypeCodes: Set<string>
): ParsedShiftCode {
  const trimmedCode = code.trim().toUpperCase();

  // Check if it's a special code first
  if (specialCodeMap.has(trimmedCode)) {
    return {
      shiftTypeCode: null,
      specialCode: trimmedCode,
      positionCode: null,
      sectorCode: null,
    };
  }

  let shiftTypeCode: string | null = null;
  let positionCode: string | null = null;
  let sectorCode: string | null = null;

  // Try to match shift type by checking longest possible match first
  // This handles multi-letter shift types like "HO"
  for (let checkLen = Math.min(trimmedCode.length, 3); checkLen >= 1; checkLen--) {
    const potentialShiftType = trimmedCode.substring(0, checkLen);
    if (shiftTypeCodes.has(potentialShiftType)) {
      shiftTypeCode = potentialShiftType;
      const remainder = trimmedCode.substring(checkLen);

      // From remainder, extract sector (trailing digits) and position (letter)
      const sectorMatch = remainder.match(/(\d+)$/);
      if (sectorMatch) {
        sectorCode = sectorMatch[1];
        const withoutSector = remainder.substring(
          0,
          remainder.length - sectorCode.length
        );
        if (withoutSector.length > 0) {
          positionCode = withoutSector; // Everything before digits is position
        }
      } else {
        // No trailing digits, entire remainder is position
        if (remainder.length > 0) {
          positionCode = remainder;
        }
      }
      break;
    }
  }

  return {
    shiftTypeCode,
    specialCode: null,
    positionCode,
    sectorCode,
  };
}
