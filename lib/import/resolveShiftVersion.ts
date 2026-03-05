import { ShiftTypeVersion } from "./types";

/**
 * Normalize a date to just the date part (YYYY-MM-DD) for comparison
 */
function normalizeDate(d: Date | string): Date {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Resolve the correct shift version for a given date
 */
export function resolveShiftVersion(
  shiftTypeCode: string,
  registryDate: Date,
  shiftTypeVersionMap: Map<string, ShiftTypeVersion[]>
): ShiftTypeVersion | null {
  const versions = shiftTypeVersionMap.get(shiftTypeCode);
  if (!versions || versions.length === 0) {
    return null;
  }

  // Normalize registry date for comparison
  const normalizedRegistryDate = normalizeDate(registryDate);

  // Find the version that covers this date
  for (const version of versions) {
    const startDate = normalizeDate(version.versionStartDate);
    const endDate = version.versionEndDate
      ? normalizeDate(version.versionEndDate)
      : null;

    if (
      normalizedRegistryDate >= startDate &&
      (!endDate || normalizedRegistryDate <= endDate)
    ) {
      return version;
    }
  }

  return null;
}
