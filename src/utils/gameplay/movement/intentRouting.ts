/**
 * Waypoint routing engine for the Movement Intent Composer (change
 * `tactical-movement-intent-composer`, design D2 / D3).
 *
 * This is the pure engine surface phase 3's map interaction sits on top of.
 * It answers three questions, each by delegating to an EXISTING
 * `movement-system` code path — there is NO UI-local movement math here:
 *
 *  - D2 (task 2.1 / 2.2): route the cheapest legal leg between two consecutive
 *    Locomotion Path anchors using the same A* pathfinder the hover preview
 *    already uses (`findPath`), and price it — terrain-adjusted MP per hex plus
 *    facing-change MP at the pivot — via `calculateGroundPathMpCost`. The route
 *    is memoized per (unitId, mode, remainingMp, terrain revision) so a
 *    re-render or repeated hover does not re-run A* on large maps.
 *
 *  - D3 (task 2.3): Live Intersection. After every composition edit, recompute
 *    the set of hexes still placeable as a waypoint — the union, over every
 *    still-affordable Movement Budget, of that budget's reachable envelope
 *    filtered to the budget's REMAINING MP (budget MP minus the composed
 *    ledger total). `deriveReachableHexes` computes each hex's true `mpCost`;
 *    remaining MP is applied purely as a threshold, so the reach shrinks as the
 *    ledger grows without any local cost formula.
 *
 * Every MP value returned by this module originates from `movement-system`
 * (`findPath`, `calculateGroundPathMpCost`, `getMaxMP`, `getHeatMovementPenalty`,
 * `deriveReachableHexes`). The composer's Live Intersection guarantee — that a
 * player cannot compose an intent no budget affords — follows by construction:
 * `placeableWaypointHexes` never returns a hex whose reach cost exceeds every
 * remaining budget, so appending it is impossible.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-map-interface/spec.md
 */

import { getHeatMovementPenalty } from '@/constants/heat';
import {
  MovementType,
  type Facing,
  type IHexCoordinate,
  type IHexGrid,
  type ILocomotionLeg,
  type IMovementCapability,
  type IMovementRangeHex,
  type IUnitGameState,
  type StandUpMode,
} from '@/types/gameplay';

import { hexEquals, coordToKey } from '../hexMath';
import { type IMovementCostContext } from './calculations';
import { facingForPathEnd } from './eventPath';
import { movementModeForPath } from './mode';
import { getMaxMP } from './movementCapability';
import { findPath } from './pathfinding';
import { deriveReachableHexes } from './reachable';
import { calculateGroundPathMpCost } from './validation';

// ---------------------------------------------------------------------------
// Leg routing (D2, tasks 2.1 / 2.2)
// ---------------------------------------------------------------------------

/**
 * A single Locomotion Path anchor: the hex the leg starts from and the unit's
 * facing when it arrives there. The first leg's anchor is the unit's start hex
 * and start facing; each subsequent anchor is the previous leg's destination
 * and the previous leg's `finalFacing`.
 */
export interface IRouteAnchor {
  readonly hex: IHexCoordinate;
  readonly facing: Facing;
}

/**
 * Everything the router needs to route + price one leg. The `capability` and
 * `currentHeat` project the budget MP via `movement-system`; `mode` selects the
 * walk/run/jump cost table; `terrainRevision` participates only in the memo key
 * (bump it when the grid's terrain changes so stale routes are discarded).
 */
export interface IRouteLegRequest {
  readonly unitId: string;
  readonly grid: IHexGrid;
  readonly from: IRouteAnchor;
  readonly to: IHexCoordinate;
  readonly mode: MovementType;
  readonly capability: IMovementCapability;
  readonly currentHeat: number;
  /** MP already consumed by the composition so far (posture + prior legs). */
  readonly consumedMp: number;
  readonly movementContext?: IMovementCostContext;
  /** Opaque terrain-revision token; only affects memoization, never routing. */
  readonly terrainRevision?: number | string;
}

/**
 * Remaining MP for a mode after the composition-so-far is spent: the
 * damage/heat-adjusted budget minus the MP already consumed, floored at 0. Used
 * to cap the A* search (`maxCost`) so the router never returns a leg the
 * remaining budget cannot pay for. All inputs come from `movement-system`.
 */
export function remainingMpForMode(
  capability: IMovementCapability,
  mode: MovementType,
  currentHeat: number,
  consumedMp: number,
): number {
  const budget = getMaxMP(
    capability,
    mode,
    getHeatMovementPenalty(currentHeat),
  );
  return Math.max(0, budget - consumedMp);
}

/**
 * Route + price the cheapest legal leg from `from` to `to`. Returns `null` when
 * no legal path exists within the remaining budget (the click is unreachable —
 * Live Intersection would already have blocked it, so this is a defensive
 * no-op). The returned `ILocomotionLeg` carries:
 *
 *  - `path`: the A* hex sequence INCLUSIVE of `to`, EXCLUSIVE of `from`, exactly
 *    the shape the intent slice concatenates (`useGameplayStore.movementIntent`
 *    `intentToMovementDeclaration`).
 *  - `mpCost`: terrain-adjusted per-hex MP + facing-change (pivot) MP, from
 *    `calculateGroundPathMpCost`.
 *  - `to.facingChange`: the hexsides turned arriving at the destination (the
 *    pivot cost's driver), so the ledger can render the pivot indicator.
 *
 * Jump legs route point-to-point (no ground path); the pathfinder still yields
 * the straight step and the cost table zeroes terrain per `movement-system`.
 */
export function routeLeg(request: IRouteLegRequest): ILocomotionLeg | null {
  const {
    grid,
    from,
    to,
    mode,
    capability,
    currentHeat,
    consumedMp,
    movementContext,
  } = request;

  const remainingMp = remainingMpForMode(
    capability,
    mode,
    currentHeat,
    consumedMp,
  );
  const unitMovementType = movementModeForPath(mode, capability);

  // Degenerate: clicking the anchor hex itself is a facing-only leg (no move).
  if (hexEquals(from.hex, to)) {
    return null;
  }

  const rawPath = findPath({
    grid,
    start: from.hex,
    end: to,
    maxCost: remainingMp,
    movementType: unitMovementType,
    context: movementContext,
  });
  if (!rawPath || rawPath.length < 2) return null;

  // The final facing is the direction of travel into the destination hex — the
  // pivot at `to`. `calculateGroundPathMpCost` sums per-hex terrain MP plus the
  // turning MP needed to arrive at that facing from the anchor's facing.
  const finalFacing = facingForPathEnd(rawPath, from.facing);
  const mpCost = calculateGroundPathMpCost(
    grid,
    rawPath,
    unitMovementType,
    from.facing,
    finalFacing,
    movementContext,
  );
  if (!Number.isFinite(mpCost) || mpCost > remainingMp) return null;

  // Facing change accrued at the destination pivot (hexsides turned).
  const facingChange = facingChangeMagnitude(from.facing, finalFacing);

  // Leg `path` excludes `from` (the shared anchor) and includes `to`.
  const legPath = rawPath.slice(1);

  return {
    from: { hex: from.hex, facingChange: 0 },
    to: { hex: to, facingChange },
    path: legPath,
    mpCost,
  };
}

/** Shortest hexside rotation magnitude between two facings (0..3). */
function facingChangeMagnitude(from: Facing, to: Facing): number {
  const diff = Math.abs(from - to);
  return Math.min(diff, 6 - diff);
}

// ---------------------------------------------------------------------------
// Memoized leg routing (D2 risk mitigation, task 2.1)
// ---------------------------------------------------------------------------

/**
 * Build the memo key for a leg route. Per design D2 the memo is keyed on
 * (unitId, mode, remainingMp, terrain revision); the leg endpoints are added so
 * distinct clicks within the same (unit, mode, budget, terrain) frame do not
 * collide. `remainingMp` folds in `consumedMp` + heat + damage, so any budget
 * change invalidates the entry without an explicit dependency list.
 */
export function routeLegMemoKey(request: IRouteLegRequest): string {
  const remainingMp = remainingMpForMode(
    request.capability,
    request.mode,
    request.currentHeat,
    request.consumedMp,
  );
  const rev = request.terrainRevision ?? 0;
  return [
    request.unitId,
    request.mode,
    remainingMp,
    rev,
    request.from.hex.q,
    request.from.hex.r,
    request.from.facing,
    request.to.q,
    request.to.r,
  ].join(':');
}

/**
 * A memoizing wrapper over `routeLeg`. The cache is caller-owned (a Map the map
 * layer keeps for the lifetime of a composition frame), so this stays a pure
 * function of its inputs and never holds module-global state that could leak
 * across units or turns. `null` results are cached too — an unreachable click
 * is a stable answer for the same key.
 */
export function routeLegMemoized(
  request: IRouteLegRequest,
  cache: Map<string, ILocomotionLeg | null>,
): ILocomotionLeg | null {
  const key = routeLegMemoKey(request);
  if (cache.has(key)) return cache.get(key) ?? null;
  const leg = routeLeg(request);
  cache.set(key, leg);
  return leg;
}

// ---------------------------------------------------------------------------
// Live Intersection (D3, task 2.3)
// ---------------------------------------------------------------------------

/** One still-affordable budget the placeable-hex set is computed against. */
export interface IAffordableBudgetProjection {
  readonly mode: MovementType;
  /** Damage/heat-adjusted budget MP for the mode (from `movement-system`). */
  readonly budgetMp: number;
}

export interface IPlaceableHexRequest {
  readonly unit: IUnitGameState;
  readonly grid: IHexGrid;
  readonly capability: IMovementCapability;
  /** MP already consumed by the composition (posture + prior legs). */
  readonly consumedMp: number;
  /** The Movement Budgets Live Intersection still considers affordable. */
  readonly affordableBudgets: readonly IAffordableBudgetProjection[];
  readonly standUpMode?: StandUpMode;
}

/**
 * Recompute the per-mode reachable envelopes against REMAINING MP after the
 * composition-so-far. For each still-affordable budget, project its full
 * envelope with `deriveReachableHexes` (the exact envelope the map already
 * renders), then keep only hexes whose true `mpCost` fits the remaining MP
 * (`budgetMp - consumedMp`). The result maps each affordable mode to its
 * shrunken envelope; the map layer (phase 3) renders these simultaneously and
 * the palette gating derives from their union.
 *
 * A budget whose remaining MP is 0 contributes an empty envelope — "a budget
 * made entirely unaffordable SHALL have no envelope rendered" (tactical-map
 * delta, envelope-shrink scenario).
 */
export function reachableEnvelopesByMode(
  request: IPlaceableHexRequest,
): Map<MovementType, readonly IMovementRangeHex[]> {
  const { unit, grid, capability, consumedMp, affordableBudgets } = request;
  const standUpMode = request.standUpMode ?? 'normal';
  const byMode = new Map<MovementType, readonly IMovementRangeHex[]>();

  for (const budget of affordableBudgets) {
    const remaining = Math.max(0, budget.budgetMp - consumedMp);
    if (remaining <= 0) {
      byMode.set(budget.mode, []);
      continue;
    }
    const fullEnvelope = deriveReachableHexes(
      unit,
      budget.mode,
      grid,
      capability,
      standUpMode,
    );
    // Filter to remaining MP — `deriveReachableHexes` already computed each
    // hex's true reach cost, so this is a threshold, not a cost recomputation.
    const shrunken = fullEnvelope.filter((h) => h.mpCost <= remaining);
    byMode.set(budget.mode, shrunken);
  }

  return byMode;
}

/**
 * The flat set of hexes placeable as the next Waypoint: the union of every
 * affordable budget's remaining-MP envelope, keyed by coordinate. This is the
 * Live Intersection placeable-hex set — a hex absent from it can never be
 * appended, so composing an unaffordable intent is impossible by construction.
 */
export function placeableWaypointHexes(
  request: IPlaceableHexRequest,
): ReadonlySet<string> {
  const byMode = reachableEnvelopesByMode(request);
  const placeable = new Set<string>();
  for (const envelope of Array.from(byMode.values())) {
    for (const hex of envelope) {
      placeable.add(coordToKey(hex.hex));
    }
  }
  return placeable;
}

/**
 * Whether a candidate hex is a legal next Waypoint under the current remaining
 * budgets. The composer calls this before appending — a `false` result blocks
 * the click at the source (Live Intersection).
 */
export function isPlaceableWaypoint(
  request: IPlaceableHexRequest,
  candidate: IHexCoordinate,
): boolean {
  return placeableWaypointHexes(request).has(coordToKey(candidate));
}
