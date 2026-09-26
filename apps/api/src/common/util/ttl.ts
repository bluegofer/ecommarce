/**
 * Parse a JWT TTL value into seconds.
 *
 * Accepts:
 *   - number: 900 (seconds)
 *   - numeric string: "900" (seconds)
 *   - timespan string: "15m" (15 minutes), "7d" (7 days), "12h", "30s"
 *   - undefined / empty / invalid → returns fallback
 */
export function parseTtlSeconds(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value !== 'string' || value.length === 0) return fallback;

  const s = value.trim();

  // Plain numeric string — treat as seconds.
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return n > 0 ? n : fallback;
  }

  // Timespan string: <number><unit> where unit ∈ {s, m, h, d}.
  const m = /^(\d+)([smhd])$/.exec(s);
  if (m && m[1] !== undefined && m[2] !== undefined) {
    const n = parseInt(m[1], 10);
    const unit = m[2] as 's' | 'm' | 'h' | 'd';
    const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
    return n * multiplier;
  }

  // Unknown format — safe fallback.
  return fallback;
}