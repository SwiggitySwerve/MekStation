/**
 * Swarm per-run unit-count derivation.
 *
 * Audit 2026-06-09 finding E-8: `generateRandomForce` silently retries
 * at `count + 1` on `BudgetUnsatisfiableError` (PT-010 widening), and
 * can also fill SHORT of `count` when the budget's lower bound is
 * reached early. The swarm CLI built `simConfig.unitCount` (and pilot
 * generation counts) from the CONFIGURED per-side counts while
 * `participants[]` / hydration / `bvTotal` were built from the ACTUAL
 * force assignments — so on a retry the runner fielded fewer units
 * than the participants array described (phantom participants) and the
 * replay manifest's `bvTotal` included BV for a unit that never
 * fielded.
 *
 * This helper is the single source of truth for the per-run counts:
 * derive everything downstream of force generation from the ACTUAL
 * `assignments.length` of each generated force. Pure function so the
 * count+1 path is unit-testable without spawning the CLI.
 *
 * @see docs/audits/2026-06-09-full-codebase-review.md (E-8)
 */

import { IForce } from '@/types/force/ForceInterfaces';

/** Per-side unit counts in the shape `ISimulationConfig.unitCount` expects. */
export interface ISwarmUnitCounts {
  /** Side A (runner-internal `player-*` units) — actual fielded count. */
  readonly player: number;
  /** Side B (runner-internal `opponent-*` units) — actual fielded count. */
  readonly opponent: number;
}

/**
 * Derive the per-run unit counts from the ACTUAL generated forces.
 *
 * The returned counts MUST drive pilot generation, `simConfig.unitCount`,
 * and (transitively) the runner's `player-${1..N}` / `opponent-${1..N}`
 * unit creation, so they stay 1:1 with `participants[]` and the
 * hydration map built from the same assignments.
 */
export function deriveSwarmUnitCounts(
  forceA: IForce,
  forceB: IForce,
): ISwarmUnitCounts {
  return {
    player: forceA.assignments.length,
    opponent: forceB.assignments.length,
  };
}
