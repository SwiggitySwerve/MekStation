/**
 * SeededD6Roller — adapter that bridges the engine-layer `SeededRandom`
 * (Mulberry32 PRNG, returns floats in [0, 1)) into the gameplay-layer
 * `D6Roller` contract (`() => number` returning an integer 1–6).
 *
 * Two layers, two contracts:
 *   - `SeededRandom` (src/simulation/core/SeededRandom.ts) — engine PRNG.
 *   - `D6Roller` (src/utils/gameplay/diceTypes.ts) — gameplay dice contract.
 *
 * This adapter keeps both contracts intact and makes the seam explicit
 * for production swaps:
 *   - `defaultD6Roller`  → Math.random fallback (production single-player).
 *   - `CryptoDiceRoller` → server-side authoritative rolls.
 *   - `ReplayDiceRoller` → P2P guest replays the host's roll log.
 *   - `SeededD6Roller`   → unit / scenario / Monte Carlo tests.
 *
 * The class exposes `rollD6()` and `roll2d6()` as methods on the instance
 * (the spec scenarios reference `seededRoller.roll2d6()`), and an
 * `asD6Roller()` adapter returns a bound `() => number` so existing
 * `D6Roller`-typed callsites can consume it without code changes.
 */

import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { SeededRandom } from './SeededRandom';

export class SeededD6Roller {
  private readonly random: SeededRandom;

  constructor(seedOrRandom: number | SeededRandom) {
    // Accept either a raw seed (most common) or an existing `SeededRandom`
    // so callers that already advanced the engine PRNG can share state.
    this.random =
      typeof seedOrRandom === 'number'
        ? new SeededRandom(seedOrRandom)
        : seedOrRandom;
  }

  /**
   * Roll a single d6. Returns an integer in [1, 6].
   *
   * Uses `SeededRandom.next()` directly (returns [0, 1) uniform) so we
   * never call `Math.random()` from this file — the determinism audit
   * CI guard would fail on any such regression.
   */
  rollD6 = (): number => {
    return Math.floor(this.random.next() * 6) + 1;
  };

  /**
   * Roll 2d6 and return the integer sum in [2, 12]. Each die is rolled
   * independently from the same underlying PRNG stream so the marginal
   * distribution per die is uniform 1/6 and the joint distribution is
   * the canonical 1/36-per-pair triangle (P(7) = 6/36 peak).
   */
  roll2d6 = (): number => {
    return this.rollD6() + this.rollD6();
  };

  /**
   * Function-shape adapter for callsites typed against the existing
   * `D6Roller = () => number` contract (e.g. `roll2d6(diceRoller)` in
   * `src/utils/gameplay/diceTypes.ts`). Returns the bound `rollD6`
   * method so the function carries the roller's state with it.
   */
  asD6Roller = (): D6Roller => {
    return this.rollD6;
  };
}
