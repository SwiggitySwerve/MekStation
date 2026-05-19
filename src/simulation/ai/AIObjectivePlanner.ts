/**
 * AI objective planner — reads the scenario objective map and turns it into
 * a plan the bot can act on.
 *
 * Per `add-ai-objective-awareness` design D1 / D2 / D3: where the objective
 * engine (`add-scenario-objective-engine`) supplies the spatial objective
 * system — `IObjectiveMarker` records on `state.objectives`, control
 * detection, victory evaluation — and A3a's `AILancePlanner` supplies the
 * per-side per-turn combat plan, this module is the connector. It:
 *
 *   1. `classifyObjectives` — reads `session.currentState.objectives` and the
 *      scenario objective type and classifies each marker for the bot's side
 *      as `take`, `hold`, or `deny` (D1).
 *   2. `assignObjectiveRoles` — assigns each friendly unit an objective role
 *      (`capture`, `hold`, `screen`) and the hex it works toward / holds,
 *      producing the `IObjectiveLancePlan` that rides on A3a's
 *      `ILanceTurnPlan` (D2 / D3).
 *
 * Everything here is a pure deterministic function of the objective map and
 * the unit set — no `SeededRandom` is consumed, role ties break on canonical
 * unit-id order (design D6). The planner only *reads* the objective markers;
 * it never writes them — placement, control detection, and victory
 * evaluation stay owned by the objective engine.
 *
 * @spec openspec/changes/add-ai-objective-awareness/specs/simulation-system/spec.md
 *   Requirement: Objective Ingestion and Classification
 *   Requirement: Objective-Aware Lance Planning
 */

import type { IGameSession, IHexCoordinate } from '@/types/gameplay';
import type {
  IObjectiveMarker,
  ObjectiveMarkerType,
} from '@/types/scenario/ScenarioInterfaces';

import { GameSide } from '@/types/gameplay';
import { coordToKey, keyToCoord } from '@/utils/gameplay/hexMath';
import {
  ATTACKER_SIDE,
  gameSideToObjectiveSide,
} from '@/utils/gameplay/objectives';

import type { IAIUnitState } from './types';

/**
 * What the bot must do with an objective marker (design D1):
 *
 *   - `take` — a marker the bot must control to win (an attacker's `capture`
 *     marker; a `breakthrough` exit hex it must reach).
 *   - `hold` — a marker the bot must keep controlling to win (a defender's
 *     `defend` marker; an attacker's `capture` marker once it owns it).
 *   - `deny` — a marker the bot must keep the enemy off (an attacker's
 *     `capture` / `breakthrough` marker the bot is defending against).
 */
export type ObjectiveIntent = 'take' | 'hold' | 'deny';

/** One objective marker paired with the bot's intent toward it. */
export interface IClassifiedObjective {
  readonly marker: IObjectiveMarker;
  readonly intent: ObjectiveIntent;
}

/**
 * The objective role a single friendly unit plays this turn (design D2):
 *
 *   - `capture` — the unit closest to a `take` marker; it moves onto it.
 *   - `hold` — a unit on (or nearest) a `hold` marker; it stays planted.
 *   - `screen` — every other unit; it plays normal A3a coordinated combat,
 *     covering the objective-bearing units.
 */
export type ObjectiveRole = 'capture' | 'hold' | 'screen';

/**
 * The objective layer that rides on A3a's `ILanceTurnPlan`. Carries the
 * scenario objective type, each unit's role, and — for the role-bearing
 * capture / hold units — the hex it is working toward or holding.
 */
export interface IObjectiveLancePlan {
  /**
   * The scenario objective type the bot is playing. `'destroy'` whenever the
   * objective map is empty — in which case `roles`/`targetHexes` are empty
   * and the bot falls through to pure A3a behavior.
   */
  readonly scenarioType: ObjectiveMarkerType | 'destroy';
  /** friendlyUnitId -> objective role. */
  readonly roles: ReadonlyMap<string, ObjectiveRole>;
  /**
   * Per role-bearing (capture / hold) unit, the hex it is working toward or
   * holding. Screen units never appear in this map.
   */
  readonly targetHexes: ReadonlyMap<string, IHexCoordinate>;
}

/**
 * A function the caller supplies so the planner can measure how far a unit
 * is from an objective hex. Production callers pass a terrain-cost
 * pathfinder probe (`AITerrainPathfinder.findPath` total MP cost); tests can
 * pass a plain hex-distance. A larger number means "further away".
 *
 * Keeping the cost source injectable keeps this module free of a grid /
 * movement-capability dependency and a pathfinder import cycle.
 */
export type ObjectiveCostFn = (
  unit: IAIUnitState,
  hex: IHexCoordinate,
) => number;

/**
 * Read the session's objective map and classify each marker for the bot's
 * side.
 *
 * The scenario objective type is derived from the markers themselves — the
 * single-objective model means every marker shares one `objectiveType`
 * (mirroring `evaluateObjectiveOutcome`). An empty / absent objective map is
 * a `Destroy` scenario and yields no classified objectives, so the bot falls
 * through to pure coordinated combat.
 *
 * Classification (design D1), keyed by the bot's attacker / defender role —
 * generated scenarios make the `player` side the attacker:
 *
 *   - `capture` / `breakthrough` — the attacker must reach the marker, so
 *     the bot classifies it `take` when it is the attacker and `deny` when
 *     it is the defender.
 *   - `defend` — the defender must keep the marker, so the bot classifies it
 *     `hold` when it is the defender and `take` when it is the attacker.
 *
 * Pure deterministic function — never mutates a marker.
 *
 * @spec simulation-system — Objective Ingestion and Classification
 */
export function classifyObjectives(
  session: IGameSession,
  botSide: GameSide,
): readonly IClassifiedObjective[] {
  const objectiveMap = session.currentState.objectives;
  if (!objectiveMap) return [];

  // Canonical-key order keeps the classified list deterministic regardless
  // of the map's insertion order.
  const markers = Object.values(objectiveMap);
  if (markers.length === 0) return [];

  const botObjectiveSide = gameSideToObjectiveSide(botSide);
  const botIsAttacker = botObjectiveSide === ATTACKER_SIDE;

  const classified: IClassifiedObjective[] = [];
  for (const marker of markers) {
    classified.push({ marker, intent: intentFor(marker, botIsAttacker) });
  }

  // Sort by hex key so the order is stable and reproducible.
  classified.sort((a, b) =>
    a.marker.hexKey < b.marker.hexKey
      ? -1
      : a.marker.hexKey > b.marker.hexKey
        ? 1
        : 0,
  );
  return classified;
}

/**
 * Resolve the bot's intent toward one marker given whether the bot is the
 * attacking side. Pure helper for `classifyObjectives`.
 */
function intentFor(
  marker: IObjectiveMarker,
  botIsAttacker: boolean,
): ObjectiveIntent {
  switch (marker.objectiveType) {
    case 'capture':
    case 'breakthrough':
      // The attacker must reach / hold the marker; the defender must keep
      // the attacker off it.
      return botIsAttacker ? 'take' : 'deny';
    case 'defend':
      // The defender keeps the marker; the attacker must take it.
      return botIsAttacker ? 'take' : 'hold';
    default:
      // Unreachable — `ObjectiveMarkerType` has only the three families
      // above — but TypeScript's exhaustiveness needs a fallback.
      return botIsAttacker ? 'take' : 'deny';
  }
}

/** Internal: a candidate (unit, cost-to-hex) pair for role assignment. */
interface UnitCost {
  readonly unit: IAIUnitState;
  readonly cost: number;
}

/**
 * Assign objective roles to a friendly lance from a set of classified
 * objectives (design D2 / D3).
 *
 *   - For every `take` (and `deny`) marker, the single closest *living*
 *     friendly unit by `costFn` receives the `capture` role with that
 *     marker's hex as its target. The closest unit per marker is the
 *     design's "single closest unit per marker" rule (D2 open question).
 *   - For every `hold` marker, the friendly unit on the marker — or, if
 *     none, the closest — receives the `hold` role with that marker's hex.
 *   - Every other living unit receives the `screen` role and no target hex.
 *
 * A unit is only ever assigned one role; once it carries a capture or hold
 * role it is removed from the candidate pool, so it will not also be picked
 * for a second marker. Ties in `costFn` break on canonical unit-id order, so
 * the assignment is fully deterministic and consumes no `SeededRandom`.
 *
 * When `classified` is empty (a `Destroy` scenario) every unit is `screen`
 * and `targetHexes` is empty — the caller treats this as "no objective
 * layer" and the bot plays pure A3a.
 *
 * @spec simulation-system — Objective-Aware Lance Planning
 */
export function assignObjectiveRoles(
  friendly: readonly IAIUnitState[],
  classified: readonly IClassifiedObjective[],
  costFn: ObjectiveCostFn,
): {
  roles: Map<string, ObjectiveRole>;
  targetHexes: Map<string, IHexCoordinate>;
} {
  const roles = new Map<string, ObjectiveRole>();
  const targetHexes = new Map<string, IHexCoordinate>();

  const living = friendly.filter((u) => !u.destroyed);
  // Default every living unit to `screen`; capture / hold assignment below
  // overrides the units it claims.
  for (const unit of living) {
    roles.set(unit.unitId, 'screen');
  }
  if (classified.length === 0) {
    return { roles, targetHexes };
  }

  // Units still free to take an objective role. A unit is pulled from this
  // pool the moment it is assigned, so no unit gets two roles.
  const available = new Set(living.map((u) => u.unitId));

  // Iterate the classified objectives in their (already canonical) order so
  // the assignment is deterministic. Hold markers are handled in the same
  // pass — `hold` prefers a unit physically on the hex.
  for (const { marker, intent } of classified) {
    if (available.size === 0) break;
    const hex = keyToCoord(marker.hexKey);
    const hexKey = marker.hexKey;

    if (intent === 'hold') {
      // Prefer a unit already on the marker hex; that unit is keeping
      // control right now and should plant rather than move.
      const onMarker = living
        .filter(
          (u) => available.has(u.unitId) && coordToKey(u.position) === hexKey,
        )
        .sort(byUnitId);
      const holder =
        onMarker[0] ?? closestAvailable(living, available, hex, costFn);
      if (holder) {
        roles.set(holder.unitId, 'hold');
        targetHexes.set(holder.unitId, hex);
        available.delete(holder.unitId);
      }
      continue;
    }

    // `take` and `deny` both produce a capture role — the bot must put a
    // unit onto the marker, whether to win it or to contest the enemy off
    // it. The single closest available unit is committed.
    const seeker = closestAvailable(living, available, hex, costFn);
    if (seeker) {
      roles.set(seeker.unitId, 'capture');
      targetHexes.set(seeker.unitId, hex);
      available.delete(seeker.unitId);
    }
  }

  return { roles, targetHexes };
}

/**
 * Pick the available living unit closest to `hex` by `costFn`. Ties break on
 * canonical unit-id order so the result is deterministic. Returns `null`
 * when no unit is available.
 */
function closestAvailable(
  living: readonly IAIUnitState[],
  available: ReadonlySet<string>,
  hex: IHexCoordinate,
  costFn: ObjectiveCostFn,
): IAIUnitState | null {
  const candidates: UnitCost[] = [];
  for (const unit of living) {
    if (!available.has(unit.unitId)) continue;
    candidates.push({ unit, cost: costFn(unit, hex) });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    return byUnitId(a.unit, b.unit);
  });
  return candidates[0].unit;
}

/** Canonical lexicographic unit-id comparator for deterministic tie-breaks. */
function byUnitId(a: IAIUnitState, b: IAIUnitState): number {
  return a.unitId < b.unitId ? -1 : a.unitId > b.unitId ? 1 : 0;
}

/**
 * Build the full `IObjectiveLancePlan` — classify the session's objective
 * map for the bot's side, then assign every friendly unit a role.
 *
 * When the objective map is empty the plan's `scenarioType` is `'destroy'`,
 * every unit is `screen`, and `targetHexes` is empty — the caller treats
 * this as "no objective layer" and the bot plays pure A3a.
 *
 * Pure deterministic function — no `SeededRandom` consumption.
 *
 * @spec simulation-system — Objective-Aware Lance Planning
 */
export function planObjectives(
  session: IGameSession,
  botSide: GameSide,
  friendly: readonly IAIUnitState[],
  costFn: ObjectiveCostFn,
): IObjectiveLancePlan {
  const classified = classifyObjectives(session, botSide);
  const { roles, targetHexes } = assignObjectiveRoles(
    friendly,
    classified,
    costFn,
  );

  const scenarioType: ObjectiveMarkerType | 'destroy' =
    classified.length > 0 ? classified[0].marker.objectiveType : 'destroy';

  return Object.freeze({
    scenarioType,
    roles,
    targetHexes,
  });
}
