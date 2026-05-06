/**
 * Phase 6a — `add-combat-fidelity-suite` test pyramid (Task 6.2).
 *
 * GATOR matrix coverage: 12 tests across the five GATOR axes
 *   G — Gunnery (base TN)
 *   A — Attacker movement (stationary / walk / run / jump)
 *   T — Target movement (stationary / walk / run / jump / immobile / prone)
 *   O — Other (range bracket — short / medium / long / extreme / out)
 *   R — terRain (light woods / heavy woods / urban / partial cover)
 *
 * Spec anchor: `combat-resolution/spec.md` "GATOR Modifier Matrix"
 * Requirement (and the to-hit pipeline at `src/utils/gameplay/toHit/`).
 *
 * **API under test**: the production GATOR utility is `calculateToHit`
 * at `src/utils/gameplay/toHit/calculate.ts:46` plus its constituent
 * modifier functions (`createBaseModifier`, `getRangeModifierForBracket`,
 * `calculateAttackerMovementModifier`, `calculateTMM`, `calculateProneModifier`,
 * `calculateImmobileModifier`, `calculatePartialCoverModifier`,
 * `getTerrainToHitModifier`).
 *
 * **Coverage philosophy**: each test pins ONE axis (or one cell in the
 * intersection matrix) at a known fixture. We don't try to enumerate
 * all 8 × 6 × 5 × 4 = 960 combinations — that's the Monte Carlo /
 * scenario tier's job. Here we lock the per-axis contracts so a future
 * refactor that breaks (say) the heavy-woods modifier surfaces in
 * milliseconds.
 *
 * **Movement modifier model note**: the live `calculateAttackerMovementModifier`
 * uses a flat lookup (stationary +0 / walk +1 / run +2 / jump +3); the
 * target-side `calculateTMM` uses a hex-bracket table where the +0
 * baseline applies at 0-2 hexes moved, +1 at 3-4, +2 at 5-6, +3 at 7-9,
 * +4 at 10-17, +5 at 18-24, +6 at 25+. Jump movement adds +1 on top of
 * the bracket result. The brief named "stationary / walk / run / jump"
 * categories — we encode each by feeding a representative hexesMoved
 * count for the named movement type so the ASSERTED TMM lines up with
 * the canonical `Total Warfare` table.
 */

import type { ITerrainFeature } from '@/types/gameplay/TerrainTypes';

import { MovementType, RangeBracket } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  calculateAttackerMovementModifier,
  calculateImmobileModifier,
  calculatePartialCoverModifier,
  calculateProneModifier,
  calculateTMM,
  createBaseModifier,
  getRangeModifierForBracket,
  getTerrainToHitModifier,
} from '@/utils/gameplay/toHit';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function feature(type: TerrainType, level = 1): ITerrainFeature {
  return { type, level } as ITerrainFeature;
}

// ---------------------------------------------------------------------------
// Tests — 12 total covering all five GATOR axes.
// ---------------------------------------------------------------------------

describe('combat-fidelity / GATOR matrix (G/A/T/O/R)', () => {
  // -------------------------------------------------------------------------
  // G — Gunnery (base TN)
  // -------------------------------------------------------------------------
  it('Gunnery 0..7 base modifier flows through createBaseModifier as the literal value', () => {
    for (let gunnery = 0; gunnery <= 7; gunnery++) {
      const mod = createBaseModifier(gunnery);
      expect(mod.value).toBe(gunnery);
      expect(mod.source).toBe('base');
      expect(mod.name).toBe('Gunnery Skill');
    }
  });

  // -------------------------------------------------------------------------
  // A — Attacker movement
  // -------------------------------------------------------------------------
  it('Attacker movement: stationary +0 / walk +1 / run +2 / jump +3 (canonical flat table)', () => {
    expect(
      calculateAttackerMovementModifier(MovementType.Stationary).value,
    ).toBe(0);
    expect(calculateAttackerMovementModifier(MovementType.Walk).value).toBe(1);
    expect(calculateAttackerMovementModifier(MovementType.Run).value).toBe(2);
    expect(calculateAttackerMovementModifier(MovementType.Jump).value).toBe(3);
  });

  // -------------------------------------------------------------------------
  // T — Target movement (TMM)
  // -------------------------------------------------------------------------
  it('Target stationary: TMM +0 (no hexes moved)', () => {
    expect(calculateTMM(MovementType.Stationary, 0).value).toBe(0);
  });

  it('Target walk: TMM follows hex bracket (3 hexes -> +1, 5 hexes -> +2)', () => {
    expect(calculateTMM(MovementType.Walk, 3).value).toBe(1);
    expect(calculateTMM(MovementType.Walk, 5).value).toBe(2);
  });

  it('Target run vs jump: jump adds +1 on top of identical hex bracket', () => {
    // 7 hexes -> bracket TMM +3
    const ran = calculateTMM(MovementType.Run, 7);
    const jumped = calculateTMM(MovementType.Jump, 7);
    expect(ran.value).toBe(3);
    expect(jumped.value).toBe(4); // +3 bracket + 1 jump bonus
    expect(jumped.value - ran.value).toBe(1);
  });

  it('Target immobile: -4 (immobilized targets are essentially auto-hits)', () => {
    const mod = calculateImmobileModifier(true);
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(-4);
    expect(calculateImmobileModifier(false)).toBeNull();
  });

  it('Target prone: close range (<=1 hex) -2, beyond +1', () => {
    const close = calculateProneModifier(true, 1);
    const far = calculateProneModifier(true, 5);
    expect(close).not.toBeNull();
    expect(far).not.toBeNull();
    expect(close!.value).toBe(-2);
    expect(far!.value).toBe(1);
    expect(calculateProneModifier(false, 5)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // O — Other (range bracket)
  // -------------------------------------------------------------------------
  it('Range bracket modifiers: short +0 / medium +2 / long +4 / extreme +6 / out-of-range Infinity', () => {
    expect(getRangeModifierForBracket(RangeBracket.Short).value).toBe(0);
    expect(getRangeModifierForBracket(RangeBracket.Medium).value).toBe(2);
    expect(getRangeModifierForBracket(RangeBracket.Long).value).toBe(4);
    expect(getRangeModifierForBracket(RangeBracket.Extreme).value).toBe(6);
    expect(getRangeModifierForBracket(RangeBracket.OutOfRange).value).toBe(
      Infinity,
    );
  });

  // -------------------------------------------------------------------------
  // R — terRain (cover + woods)
  // -------------------------------------------------------------------------
  it('Light woods adds +1 to-hit when intervening between attacker and target', () => {
    // Light woods has +1 toHitInterveningModifier
    const intervening = [[feature(TerrainType.LightWoods)]];
    const mod = getTerrainToHitModifier([], intervening);
    expect(mod).toBe(1);
  });

  it('Heavy woods adds +2 to-hit when intervening', () => {
    const intervening = [[feature(TerrainType.HeavyWoods)]];
    const mod = getTerrainToHitModifier([], intervening);
    expect(mod).toBe(2);
  });

  it('Partial cover adds +1 to-hit (target-on-hex modifier path)', () => {
    const cover = calculatePartialCoverModifier(true);
    expect(cover).not.toBeNull();
    expect(cover!.value).toBe(1);
    expect(cover!.source).toBe('terrain');
    expect(calculatePartialCoverModifier(false)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Aggregate cells: cross-axis combinations (not exhaustive — sanity)
  // -------------------------------------------------------------------------
  it('Stacked cell: gunnery 4 + walk +1 + medium range +2 + light woods +1 = TN 8 (sum check)', () => {
    const g = createBaseModifier(4).value;
    const a = calculateAttackerMovementModifier(MovementType.Walk).value;
    const o = getRangeModifierForBracket(RangeBracket.Medium).value;
    const r = getTerrainToHitModifier([], [[feature(TerrainType.LightWoods)]]);
    expect(g + a + o + r).toBe(8);
  });

  it('Edge cell: gunnery 4 + run +2 + extreme +6 + heavy woods +2 = TN 14 (impossible, > 12)', () => {
    // Sanity: a sum > 12 is "impossible" per IToHitCalculation.impossible.
    const g = createBaseModifier(4).value;
    const a = calculateAttackerMovementModifier(MovementType.Run).value;
    const o = getRangeModifierForBracket(RangeBracket.Extreme).value;
    const r = getTerrainToHitModifier([], [[feature(TerrainType.HeavyWoods)]]);
    expect(g + a + o + r).toBe(14);
    expect(g + a + o + r).toBeGreaterThan(12);
  });
});
