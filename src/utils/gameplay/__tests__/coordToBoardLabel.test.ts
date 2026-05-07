/**
 * Unit tests for `coordToBoardLabel` per
 * `enrich-movement-declared-with-chain-and-displacement` (movement-system
 * delta — Hex Coordinate Board Label Utility).
 *
 * The contract:
 *   - Axial origin `{q:0, r:0}` → `'0101'`
 *   - Round-trip identity with `convertOffsetToAxial` from
 *     `src/lib/parsers/megaMekBoard.ts:30` over the in-range MegaMek
 *     board coordinate space.
 *   - Output is always exactly 4 chars (zero-padded col + row).
 */

import { coordToBoardLabel } from '../hexMath';

// Mirror of the inverse helper at src/lib/parsers/megaMekBoard.ts:30
// — duplicated locally so this test can run without parser imports.
function convertOffsetToAxial(
  col: number,
  row: number,
): { q: number; r: number } {
  const q = col - 1;
  const r = row - 1 - Math.floor((col - 1) / 2);
  return { q, r };
}

describe('coordToBoardLabel', () => {
  it('maps axial origin {q:0, r:0} to "0101"', () => {
    expect(coordToBoardLabel({ q: 0, r: 0 })).toBe('0101');
  });

  it('round-trips the (col=12, row=7) board hex via axial', () => {
    const axial = convertOffsetToAxial(12, 7);
    expect(coordToBoardLabel(axial)).toBe('1207');
  });

  it('round-trips (col=1, row=1) — top-left of a standard board', () => {
    const axial = convertOffsetToAxial(1, 1);
    expect(coordToBoardLabel(axial)).toBe('0101');
  });

  it('round-trips (col=2, row=1) — exercises the offset-row offset', () => {
    // col=2 has the +1 row offset: q=1, r=1-1-0=0 (floor(1/2) = 0).
    // Inverse: col = q+1 = 2, row = r+1+floor(q/2) = 0+1+0 = 1.
    const axial = convertOffsetToAxial(2, 1);
    expect(coordToBoardLabel(axial)).toBe('0201');
  });

  it('round-trips (col=3, row=5) — exercises the floor-div ramp', () => {
    // col=3 → q=2, r=5-1-floor(2/2)=3. Back: col=3, row=3+1+1=5.
    const axial = convertOffsetToAxial(3, 5);
    expect(coordToBoardLabel(axial)).toBe('0305');
  });

  it('round-trips a sweep across the 1..16 × 1..17 standard board', () => {
    // The default MegaMek "standard" board is 16 cols × 17 rows; the
    // in-range coordinate set is the 1-indexed Cartesian product. We
    // assert exact round-trip identity for every cell.
    for (let col = 1; col <= 16; col++) {
      for (let row = 1; row <= 17; row++) {
        const axial = convertOffsetToAxial(col, row);
        const expected =
          String(col).padStart(2, '0') + String(row).padStart(2, '0');
        expect(coordToBoardLabel(axial)).toBe(expected);
      }
    }
  });

  it('always returns a 4-character string', () => {
    expect(coordToBoardLabel({ q: 0, r: 0 }).length).toBe(4);
    expect(coordToBoardLabel({ q: 9, r: 9 }).length).toBe(4);
    expect(coordToBoardLabel({ q: 50, r: 50 }).length).toBe(4);
  });

  it('zero-pads single-digit columns and rows', () => {
    // q=0 → col=1 ("01"), r=0 → row=1 ("01")
    expect(coordToBoardLabel({ q: 0, r: 0 })).toBe('0101');
    // q=8 → col=9 ("09"), r=4 → row=4+1+floor(8/2)=9 ("09")
    expect(coordToBoardLabel({ q: 8, r: 4 })).toBe('0909');
  });

  it('wraps modulo-100 to preserve the 4-char length on out-of-range inputs', () => {
    // 100 % 100 = 0 → "00", which is what the inverse parser would
    // need to read a 4-digit token. This is defensive — production
    // boards never exceed 99 columns.
    const wrapped = coordToBoardLabel({ q: 99, r: 0 });
    expect(wrapped.length).toBe(4);
    // col = q+1 = 100 → "00", row = r+1+floor(99/2)=1+49=50 → "50"
    expect(wrapped).toBe('0050');
  });
});
