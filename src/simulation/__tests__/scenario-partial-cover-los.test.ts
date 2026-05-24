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
 *   The "leg-location hits convert to misses" rule and the runner's
 *   `partialCover` wiring shipped in the `complete-partial-cover-rules`
 *   change — `weaponAttack.ts` now derives `partialCover` from the
 *   target hex's terrain and `resolveWeaponHit` converts a covered leg
 *   hit into a miss. See the "SHIPPED" block at the foot of this file
 *   for the coverage pointers.
 *
 *   This file retains the to-hit modifier-function assertions (+1 when
 *   partial cover is on, null when off) — the load-bearing utility the
 *   runner wiring builds on.
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

  it('hull-down modifier replaces normal partial cover when both are active', () => {
    // MegaMek's ComputeTerrainMods treats hull-down as a stronger cover
    // modifier. MekStation suppresses normal partial cover here so one
    // terrain-cover modifier is emitted.
    const mod = calculateHullDownModifier(true, true);
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(2);
  });

  it('hull-down adds +2 when partial cover is NOT active', () => {
    // Without partial cover, hull-down on its own contributes +2.
    const mod = calculateHullDownModifier(true, false);
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(2);
  });

  // =============================================================================
  // SHIPPED — leg-location hits convert to misses
  // =============================================================================
  //
  // The leg-hit → miss rule and the runner's `partialCover` wiring landed in
  // the `complete-partial-cover-rules` change:
  //   - `weaponAttack.ts` derives `partialCover` from the target hex's
  //     terrain via `hexProvidesPartialCover` and threads it into both the
  //     to-hit calculation and `resolveWeaponHit`.
  //   - `resolveWeaponHit` converts a leg hit-location roll on a covered
  //     target into a miss before any damage applies.
  //
  // Deterministic coverage of the conversion (scripted hit-location roll)
  // lives in `src/simulation/runner/phases/__tests__/weaponAttackPartialCover.test.ts`,
  // and the terrain → cover derivation in
  // `src/utils/gameplay/__tests__/terrainCover.test.ts`. A full runner-level
  // scenario is not asserted here because the simulation runner currently
  // builds an all-clear grid (`createMinimalGrid`) with no varied terrain.
});
