import "server-only";

/**
 * Convert a venue-local "YYYY-MM-DDTHH:mm" (datetime-local input) to a UTC
 * Date, honouring DST for the given IANA zone. Two-pass offset resolution
 * handles the transition edges well enough for event scheduling.
 */
export function localToUtc(local: string, timeZone = "Europe/Malta"): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) {
    throw new Error(`invalid datetime: "${local}"`);
  }
  const wallClockAsUtc = new Date(`${local}:00Z`);
  let utc = new Date(wallClockAsUtc.getTime() - tzOffsetMs(timeZone, wallClockAsUtc));
  // Second pass: recompute with the candidate instant (DST boundary accuracy).
  utc = new Date(wallClockAsUtc.getTime() - tzOffsetMs(timeZone, utc));
  return utc;
}

function tzOffsetMs(timeZone: string, at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - at.getTime();
}
