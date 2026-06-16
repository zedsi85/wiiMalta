/**
 * Deterministic pseudo-QR matrix from a seed (a visual concept, not scannable).
 * Shared by the QRTicket component and the homepage phone mock-up so both render
 * the same stylized code.
 */
export function qrCells(seed = "WII", n = 21): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const cells: number[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (isFinder(r, c)) {
        const rr = r % 7;
        const cc = (c >= n - 7 ? c - (n - 7) : c) % 7;
        const ring = rr === 0 || rr === 6 || cc === 0 || cc === 6;
        const core = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
        cells.push(ring || core ? 1 : 0);
      } else {
        cells.push(rnd() > 0.55 ? 1 : 0);
      }
    }
  return cells;
}
