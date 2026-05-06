/**
 * Phase 6b of `add-combat-fidelity-suite` — scenario test for task 6.13.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/firing-arc-calculation/spec.md
 *     - "Partial Cover (Total Warfare p. 53)" — +1 to-hit modifier;
 *       leg-location hits convert to misses.
 *
 * Strategy:
 *   The to-hit modifier portion of partial cover IS implemented at the
 *   utility layer — `calculatePartialCoverModifier(true)` returns
 *   `{ value: 1, source: 'terrain' }`. The +1 modifier is correctly
 *   plumbed through `calculateGATORToHit` when `target.partialCover`
 *   is true.
 *
 *   The "leg-location hits convert to misses" rule is NOT yet wired
 *   — `weaponAttack.ts:600` always passes `partialCover: false` to
 *   the to-hit context, AND there is no code path that maps a
 *   hit-location roll on a leg into a miss when partial cover is
 *   active. That follow-on work is OUT OF SCOPE for this change per
 *   the task brief; we surface it via a `it.skip` test with a TODO
 *   citing the deferred follow-up.
 *
 *   What IS in scope: assert that the to-hit modifier function works
 *   correctly for the partial-cover input (+1 when on, +0 when off)
 *   so a future PR that wires partialCover through the runner will
 *   immediately benefit from the existing utility.
 */

import {
  calculatePartialCoverModifier,
  calculateHullDownModifier,
} from '@/utils/gameplay/toHit';

describe('Scenario: partial cover LOS (P6b — task 6.13)', () => {
  // =============================================================================
  // ACTIVE — partial-cover modifier function is wired and asserts hold
  // =============================================================================
  it('partial-cover modifier function returns +1 to-hit when partialCover is true', () => {
    // Direct utility-layer assertion — `calculatePartialCoverModifier(true)`
    // MUST return a +1 modifier with `source: 'terrain'`. This is the
    // load-bearing rule for the spec scenario; the runner-side
    // wiring (`partialCover` = true at the AttackDeclared seam) is
    // the part deferred to a follow-on.
    const mod = calculatePartialCoverModifier(true);
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
    expect(mod!.source).toBe('terrain');
    expect(mod!.name).toBe('Partial Cover');
  });

  it('partial-cover modifier function returns null when partialCover is false', () => {
    // When the target is NOT in partial cover, the function returns
    // `null` so the modifier does not appear in the to-hit list at
    // all (cleaner than emitting a +0 line).
    const mod = calculatePartialCoverModifier(false);
    expect(mod).toBeNull();
  });

  it('hull-down modifier suppresses when partial cover is already active (mutex rule)', () => {
    // Per Total Warfare p. 53, hull-down and partial-cover do not
    // stack. When a target is in partial cover (e.g., level 1 hill),
    // hull-down does NOT add a second +1 modifier — the partial-
    // cover one is the canonical bucket.
    const mod = calculateHullDownModifier(true, true);
    expect(mod).toBeNull();
  });

  it('hull-down adds +1 when partial cover is NOT active', () => {
    // Without partial cover, hull-down on its own contributes +1.
    const mod = calculateHullDownModifier(true, false);
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
  });

  // =============================================================================
  // DEFERRED — leg-location hits convert to misses (rule not yet wired)
  // =============================================================================

  /**
   * TODO(deferred): wire the partial-cover branch in `weaponAttack.ts`
   * so the runner (a) passes `partialCover: true` to the to-hit
   * calculator when terrain provides cover, and (b) the post-hit-
   * location-roll branch converts leg hits (`left_leg` / `right_leg`)
   * into misses per the Total Warfare partial-cover rule.
   *
   * Tracked under `notepad/issues.md` — "Partial cover leg-miss rule
   * not yet wired" (deferred follow-on, see the change-folder issue
   * log).
   *
   * When the rule lands, flip `it.skip` to `it`. The assertion below
   * is the spec's load-bearing contract: a leg hit on a partially-
   * covered target MUST become a miss before damage applies.
   */
  it.skip('leg-location hits on partially-covered target convert to misses (DEFERRED — see notepad/issues.md)', () => {
    // Placeholder assertion shape for the future-on PR:
    //   1. Build a primed scenario where a target is in partial cover.
    //   2. Run runAttackPhase with a roller pre-scripted to roll a leg
    //      hit-location.
    //   3. Assert the AttackResolved event reports `hit: false` (the
    //      leg hit was converted to a miss).
    //   4. Assert no DamageApplied event for the leg location.
    expect(true).toBe(true);
  });
});
