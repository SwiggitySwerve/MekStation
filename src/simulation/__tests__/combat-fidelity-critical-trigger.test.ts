/**
 * Phase 6a — `add-combat-fidelity-suite` test pyramid (Task 6.3).
 *
 * Critical hit threshold ladder coverage: 6 tests pinning the canonical
 * 2d6 ladder per BattleTech Total Warfare p. 41 and MegaMek's
 * `TWGameManager.criticalEntity` switch (`E:/Projects/megamek/megamek/src/megamek/server/totalWarfare/TWGameManager.java`
 * lines 21564-21586):
 *
 *   roll <= 7  → 0 crits ("no effect")
 *   roll 8..9  → 1 crit
 *   roll 10..11 → 2 crits
 *   roll == 12 → 3 crits (or "limb blown off" per location, advanced rules)
 *
 * **Closure-roller pattern (P3 notepad)**: `getCriticalHitCount` is a
 * pure function of an integer roll, so we test it directly. The
 * `checkCriticalHitTrigger(structureDamage, roller?)` path uses the
 * `D6Roller` and is exercised via a SeededD6Roller for the
 * "no event when armor absorbs" case AND via a closure-based scripted
 * roller for the precise threshold cases per the pattern in
 * `notepad/learnings.md` "Runner-side seed sweep for crit emission tests".
 *
 * Spec anchor: `combat-resolution/spec.md` "Critical Hit Trigger" Requirement.
 */

import type { D6Roller } from '@/utils/gameplay/diceTypes';

import {
  checkCriticalHitTrigger,
  getCriticalHitCount,
} from '@/utils/gameplay/damage/critical';

import { SeededD6Roller } from '../core/SeededD6Roller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a `D6Roller` that returns the supplied 1d6 sequence in order.
 * Wraps mod-style if the consumer drains more rolls than scripted (so
 * the test won't crash if the implementation grows additional dice
 * draws). Per `notepad/learnings.md` P3 closure-roller pattern.
 */
function scriptedRoller(rolls: readonly number[]): D6Roller {
  let i = 0;
  return () => {
    const value = rolls[i % rolls.length];
    i++;
    return value;
  };
}

/**
 * Convenience: for a target 2d6 sum `total`, produce a 2-roll sequence
 * that produces it. Uses `(1, total - 1)` for total >= 2 and total <=
 * 7, and `(6, total - 6)` for total >= 8 — both halves stay in [1, 6].
 */
function rollerForSum(total: number): D6Roller {
  if (total >= 2 && total <= 7) {
    return scriptedRoller([1, total - 1]);
  }
  if (total >= 8 && total <= 12) {
    return scriptedRoller([6, total - 6]);
  }
  throw new Error(`unsupported total: ${total}`);
}

// ---------------------------------------------------------------------------
// Tests — 6 total covering the threshold ladder.
// ---------------------------------------------------------------------------

describe('combat-fidelity / Critical hit threshold ladder', () => {
  it('roll 7 -> 0 crits (no effect)', () => {
    expect(getCriticalHitCount(7)).toBe(0);
    expect(getCriticalHitCount(2)).toBe(0); // sanity: snake eyes also 0 on the count function
    expect(getCriticalHitCount(0)).toBe(0);
  });

  it('roll 8 and 9 -> 1 crit each (single-slot tier)', () => {
    expect(getCriticalHitCount(8)).toBe(1);
    expect(getCriticalHitCount(9)).toBe(1);
  });

  it('roll 10 and 11 -> 2 crits each (two-slot tier)', () => {
    expect(getCriticalHitCount(10)).toBe(2);
    expect(getCriticalHitCount(11)).toBe(2);
  });

  it('roll 12 -> 3 crits (boxcars / limb-blown-off tier)', () => {
    // Per MegaMek `TWGameManager.criticalEntity:21581` the 12 branch
    // emits `hits = 3`. Limb-blown-off is layered on top in the
    // resolver (`resolveCriticalHits`) when the location is a limb;
    // the count function itself returns 3 for any limb / non-limb.
    expect(getCriticalHitCount(12)).toBe(3);
  });

  it('checkCriticalHitTrigger: structureDamage <= 0 -> never triggers (no roll consumed)', () => {
    let calls = 0;
    const roller = (() => {
      calls++;
      return 6;
    }) as D6Roller;
    const r1 = checkCriticalHitTrigger(0, roller);
    const r2 = checkCriticalHitTrigger(-3, roller);
    expect(r1.triggered).toBe(false);
    expect(r2.triggered).toBe(false);
    expect(calls).toBe(0); // no rolls consumed when there's no structure damage
  });

  it('checkCriticalHitTrigger: structureDamage > 0 with scripted 2d6 -> triggered iff total >= 8', () => {
    // Drives the threshold round-trip through the live trigger function.
    // Roll 7 -> not triggered. Roll 8 -> triggered.
    const not_triggered = checkCriticalHitTrigger(5, rollerForSum(7));
    expect(not_triggered.triggered).toBe(false);
    expect(not_triggered.roll.total).toBe(7);

    const triggered = checkCriticalHitTrigger(5, rollerForSum(8));
    expect(triggered.triggered).toBe(true);
    expect(triggered.roll.total).toBe(8);

    // Reseat with SeededD6Roller — full path through the deterministic
    // adapter that production / scenario tests use. Doesn't assert a
    // specific outcome; asserts the triggered flag matches the >= 8
    // contract for whatever the seeded roll happens to produce.
    const seeded = checkCriticalHitTrigger(
      5,
      new SeededD6Roller(42).asD6Roller(),
    );
    expect(seeded.triggered).toBe(seeded.roll.total >= 8);
  });
});
