/**
 * AI spotting and vision advisor — fog-of-war awareness.
 *
 * Per `add-ai-advanced-systems` design D3: the engine ships a per-side
 * fog-of-war module (`src/lib/multiplayer/server/fogOfWar.ts`) that decides,
 * via `canPlayerSeeUnit` in `src/utils/gameplay/visibility.ts`, whether one
 * side can see a unit — line of sight within sensor range. The bot reads
 * none of it. This advisor consumes those same fog-of-war spotting
 * primitives (without modifying the module) and advises move scoring:
 *
 *   - **scouting** — a destination that newly spots a previously-unspotted
 *     enemy earns a bonus. Spotting an enemy that no friendly unit could
 *     see before enables indirect fire and lance awareness.
 *   - **LOS-breaking** — a destination that breaks an enemy's spotting line
 *     to the moving unit earns a smaller bonus. This complements A1's
 *     LOS-denial term (which uses raw `calculateLOS`); A4's term is
 *     fog-of-war-aware — it values denying the *enemy's* spotting of this
 *     unit, i.e. the enemy can no longer see this unit within its sensor
 *     range.
 *
 * The advisor models spotting with exactly the primitives `fogOfWar.ts`
 * uses — `calculateLOS` for terrain-blocked line of sight, plus a
 * sensor-range distance gate (`canPlayerSeeUnit`'s `DEFAULT_SENSOR_RANGE`).
 * It never modifies the fog-of-war module and never hides enemy positions
 * from the bot's planner (proposal Non-Goals): the bot reasons with full
 * knowledge of enemy positions; the advisor only *values* gaining spotting.
 *
 * This module is a pure deterministic function of unit / grid state — it
 * never consumes `SeededRandom` (design D6).
 *
 * @spec openspec/changes/add-ai-advanced-systems/specs/simulation-system/spec.md
 *   Requirement: AI Spotting and Vision Awareness
 */

import type { IHexCoordinate, IHexGrid } from '@/types/gameplay';

import { hexDistance } from '@/utils/gameplay/hexMath';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';

import type { IAIUnitState } from './types';

/**
 * The advice an `AIVisionAdvisor` produces for one candidate destination.
 * Both fields are non-negative magnitudes; `scoreMove` combines them as
 * `scoutBonus + losBreakBonus`, scaled by `visionWeight`.
 */
export interface IVisionAdvice {
  /** Bonus magnitude for scouting a previously-unspotted enemy (>= 0). */
  readonly scoutBonus: number;
  /** Bonus magnitude for breaking an enemy's spotting line to this unit (>= 0). */
  readonly losBreakBonus: number;
}

/** The inert advice — both terms zero. Returned on the disabled / no-data path. */
const NO_ADVICE: IVisionAdvice = { scoutBonus: 0, losBreakBonus: 0 };

/**
 * The sensor range, in hexes, beyond which a unit cannot spot an enemy even
 * with clear line of sight. Mirrors `DEFAULT_SENSOR_RANGE` in
 * `src/utils/gameplay/visibility.ts` — the fog-of-war baseline `canPlayerSeeUnit`
 * uses — so the advisor's spotting model matches the engine's.
 */
const SENSOR_RANGE = 10;

/**
 * The full LOS-break bonus is a fraction of the scouting bonus. Per design
 * D3 the LOS-break term is a "smaller `+visionWeight` share" — it complements
 * A1's LOS-denial term rather than duplicating it, so it only tilts ties.
 */
const LOS_BREAK_FRACTION = 0.4;

/**
 * The inputs `adviseDestination` needs beyond the destination hex.
 */
export interface IVisionContext {
  /** The hex grid — needed for `calculateLOS` terrain blocking. */
  readonly grid: IHexGrid;
  /** Every living enemy unit visible to the planner. */
  readonly enemies: readonly IAIUnitState[];
  /**
   * The moving unit's friendly lancemates (excluding the unit itself). Used
   * to decide whether an enemy was *previously* spotted by the side — an
   * enemy already in a lancemate's LOS + sensor range is not newly scouted.
   * Empty / absent => only the moving unit's own prior spotting counts.
   */
  readonly lancemates?: readonly IAIUnitState[];
}

/**
 * True when `observer` can spot a unit at `targetPos` — terrain-unblocked
 * line of sight within sensor range. This is exactly the model
 * `canPlayerSeeUnit` applies in `visibility.ts` (the fog-of-war primitive),
 * lifted to operate on `IAIUnitState` positions.
 */
function canSpot(
  observerPos: IHexCoordinate,
  targetPos: IHexCoordinate,
  grid: IHexGrid,
): boolean {
  if (hexDistance(observerPos, targetPos) > SENSOR_RANGE) {
    return false;
  }
  return calculateLOS(observerPos, targetPos, grid).hasLOS;
}

/**
 * Advise move scoring for one candidate destination of the moving unit.
 *
 *   - `scoutBonus` — for each living enemy that NO friendly unit (the moving
 *     unit at its current hex, or any lancemate) can currently spot, but
 *     that the moving unit COULD spot from the destination, add one unit of
 *     bonus. The destination newly reveals that enemy to the bot's side.
 *   - `losBreakBonus` — when at least one enemy can currently spot the
 *     moving unit (LOS + sensor range to its current hex) but NO enemy can
 *     spot it at the destination, add the fractional LOS-break bonus. The
 *     destination breaks the enemy's spotting line to the unit.
 *
 * Both terms are raw magnitudes; the caller scales them by `visionWeight`.
 *
 * Pure — never mutates inputs, consumes no `SeededRandom`.
 */
export function adviseDestination(
  movingUnit: IAIUnitState,
  destination: IHexCoordinate,
  context: IVisionContext,
): IVisionAdvice {
  const { grid, enemies } = context;
  const lancemates = context.lancemates ?? [];

  const livingEnemies = enemies.filter(
    (enemy) => !enemy.destroyed && enemy.unitId !== movingUnit.unitId,
  );

  // --- Scouting ---------------------------------------------------------
  // An enemy is "previously spotted" when the moving unit at its CURRENT hex
  // or any living lancemate can already see it. Count enemies that flip from
  // unspotted to spotted once the moving unit stands on the destination.
  let scoutBonus = 0;
  for (const enemy of livingEnemies) {
    const spottedNow =
      canSpot(movingUnit.position, enemy.position, grid) ||
      lancemates.some(
        (mate) =>
          !mate.destroyed && canSpot(mate.position, enemy.position, grid),
      );
    if (spottedNow) continue;
    if (canSpot(destination, enemy.position, grid)) {
      scoutBonus += 1;
    }
  }

  // --- LOS-breaking -----------------------------------------------------
  // The moving unit is currently spotted by an enemy when any living enemy
  // can see its CURRENT hex. The destination breaks that line when NO living
  // enemy can spot the unit there.
  const spottedAtOrigin = livingEnemies.some((enemy) =>
    canSpot(enemy.position, movingUnit.position, grid),
  );
  let losBreakBonus = 0;
  if (spottedAtOrigin) {
    const spottedAtDestination = livingEnemies.some((enemy) =>
      canSpot(enemy.position, destination, grid),
    );
    if (!spottedAtDestination) {
      losBreakBonus = LOS_BREAK_FRACTION;
    }
  }

  return { scoutBonus, losBreakBonus };
}

/**
 * Convenience guard for callers that resolved an inert advanced block — when
 * advanced systems are disabled the advisor is never consulted, but exposing
 * the inert advice keeps the call site uniform.
 */
export function inertVisionAdvice(): IVisionAdvice {
  return NO_ADVICE;
}

/**
 * Per-change test hook: re-export the spotting model constants so unit tests
 * can pin the vision math. Not part of the public surface.
 */
export const __testing__ = {
  SENSOR_RANGE,
  LOS_BREAK_FRACTION,
  canSpot,
};
