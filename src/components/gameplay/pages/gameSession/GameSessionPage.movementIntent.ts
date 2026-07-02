/**
 * Map-side derivation for the Movement Intent Composer (change
 * `tactical-movement-intent-composer`, phase 3 — tactical-map-interface delta).
 *
 * This module turns the composed `movementIntent` slice (phase 1) plus the
 * routing engine (phase 2) into the exact map props `useGameMovementPlanning`
 * feeds `HexMapDisplay`:
 *
 *  - 3.1 Simultaneous affordable-mode envelopes recomputed against REMAINING MP
 *    (`buildIntentEnvelopeHexes`). Every still-affordable Movement Budget's
 *    reachable envelope is projected through the SAME rule-correct
 *    `deriveReachableHexes` path the legacy single-mode envelope used
 *    (threading `environmentalConditions` + `optionalRules`), filtered to
 *    `budgetMp − ledgerTotal`, then merged per hex so a hex reachable under
 *    several modes carries all of them (Walk cyan / Run yellow / Jump red via
 *    the existing `HexCell` palette). NO UI-local MP math — every cost comes
 *    from `movement-system`.
 *
 *  - 3.2 Hover preview re-anchored at the last placed Waypoint (falls back to
 *    the unit), cumulative MP including the composed ledger
 *    (`resolveIntentHoverPreview`). Uses phase-2 `routeLegMemoized`.
 *
 *  - 3.3 Click-adds-waypoint routing (`resolveWaypointClick`): route the leg
 *    from the current anchor to the clicked hex via `routeLegMemoized`; a click
 *    on the current last waypoint is a pop signal.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-map-interface/spec.md
 */

import { withSameHexMovementOptions } from '@/components/gameplay/HexMapDisplay/HexCell.movementOptionSummaries';
import {
  selectAffordableBudgets,
  selectLedgerTotalMp,
  type IBudgetProjectionContext,
} from '@/stores/useGameplayStore.movementIntent';
import {
  Facing,
  MovementType,
  type IEnvironmentalConditions,
  type IHexCoordinate,
  type IHexGrid,
  type ILocomotionLeg,
  type IMovementCapability,
  type IMovementIntentState,
  type IMovementRangeHex,
  type IUnitGameState,
} from '@/types/gameplay';
import { hexEquals } from '@/utils/gameplay/hexMath';
import {
  remainingMpForMode,
  routeLegMemoized,
  type IRouteAnchor,
  type IRouteLegRequest,
} from '@/utils/gameplay/movement/intentRouting';
import { deriveReachableHexes } from '@/utils/gameplay/movement/reachable';

// ---------------------------------------------------------------------------
// Locomotion path geometry
// ---------------------------------------------------------------------------

/**
 * The locomotion legs composed so far, or `undefined` when no locomotion item
 * exists yet. A pure read of the intent slice — the single source of truth for
 * where the path is currently anchored.
 */
export function composedLegs(
  intent: IMovementIntentState,
): readonly ILocomotionLeg[] {
  const locomotion = intent.items.find((item) => item.kind === 'locomotion');
  return locomotion && locomotion.kind === 'locomotion' ? locomotion.legs : [];
}

/**
 * The hex the next leg anchors at: the destination of the last composed leg, or
 * the unit's current hex when the path is empty. This is the "last placed
 * waypoint (or the selected unit when no waypoint is placed)" the hover preview
 * and the next click both anchor at (spec: Path Preview re-anchors at last
 * waypoint).
 */
export function currentPathAnchor(
  intent: IMovementIntentState,
  unit: IUnitGameState,
): IRouteAnchor {
  const legs = composedLegs(intent);
  if (legs.length === 0) {
    return { hex: unit.position, facing: unit.facing };
  }
  const lastLeg = legs[legs.length - 1];
  const locomotion = intent.items.find(
    (item): item is Extract<typeof item, { kind: 'locomotion' }> =>
      item.kind === 'locomotion',
  );
  // The facing arriving at the last waypoint is the composed final facing.
  return {
    hex: lastLeg.to.hex,
    facing: locomotion?.finalFacing ?? unit.facing,
  };
}

/** The current last waypoint hex, or `null` when the path is empty. */
export function lastWaypointHex(
  intent: IMovementIntentState,
): IHexCoordinate | null {
  const legs = composedLegs(intent);
  return legs.length === 0 ? null : legs[legs.length - 1].to.hex;
}

/**
 * The facing to restore when the last leg is popped: the facing arriving at the
 * new last waypoint (the leg before the popped one), or the unit's facing when
 * popping the only leg.
 */
export function restoredFacingAfterPop(
  intent: IMovementIntentState,
  unit: IUnitGameState,
): Facing {
  const legs = composedLegs(intent);
  if (legs.length <= 1) return unit.facing;
  // The facing arriving at the new last waypoint is the direction of travel of
  // the leg that will become last (its `to.facingChange` records the hexsides
  // turned; the concrete facing is recovered from that leg's path end).
  const priorLeg = legs[legs.length - 2];
  return facingFromLegPath(priorLeg, unit.facing);
}

/**
 * The facing a unit ends a leg with — the direction of travel into the leg's
 * destination hex. Derived from the leg's routed `path`, not recomputed.
 */
function facingFromLegPath(leg: ILocomotionLeg, fallback: Facing): Facing {
  const path = leg.path;
  if (path.length === 0) return fallback;
  const to = path[path.length - 1];
  const from = path.length >= 2 ? path[path.length - 2] : leg.from.hex;
  return facingBetween(from, to, fallback);
}

/** Axial direction → `Facing` index (flat-top hex, matches the engine). */
function facingBetween(
  from: IHexCoordinate,
  to: IHexCoordinate,
  fallback: Facing,
): Facing {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  // Axial neighbour deltas ordered N, NE, SE, S, SW, NW (Facing enum order).
  const deltas: readonly (readonly [number, number])[] = [
    [0, -1],
    [1, -1],
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
  ];
  for (let i = 0; i < deltas.length; i++) {
    if (deltas[i][0] === dq && deltas[i][1] === dr) return i as Facing;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// 3.1 — Simultaneous affordable-mode envelopes (Live Intersection)
// ---------------------------------------------------------------------------

export interface IIntentEnvelopeParams {
  readonly intent: IMovementIntentState;
  readonly unit: IUnitGameState;
  readonly capability: IMovementCapability;
  readonly grid: IHexGrid;
  readonly budgetContext: IBudgetProjectionContext;
  readonly environmentalConditions: IEnvironmentalConditions | undefined;
  readonly optionalRules: readonly string[];
}

/**
 * Build the merged reachable-hex set for ALL still-affordable Movement Budgets,
 * each filtered to its REMAINING MP after the composed ledger. Hexes reachable
 * under several modes are merged so `HexCell` can render every mode's palette
 * simultaneously (Walk cyan / Run yellow / Jump red). A budget whose remaining
 * MP is 0 contributes no hexes — "a budget made entirely unaffordable SHALL
 * have no envelope rendered".
 */
export function buildIntentEnvelopeHexes({
  intent,
  unit,
  capability,
  grid,
  budgetContext,
  environmentalConditions,
  optionalRules,
}: IIntentEnvelopeParams): readonly IMovementRangeHex[] {
  const ledgerTotal = selectLedgerTotalMp(intent);
  const affordable = selectAffordableBudgets(intent, budgetContext);
  if (affordable.length === 0) return [];

  const ruleOptions = { environmentalConditions, optionalRules };
  const byHex = new Map<string, IMovementRangeHex[]>();

  for (const budget of affordable) {
    const remaining = remainingMpForMode(
      capability,
      budget.mode,
      budgetContext.currentHeat,
      ledgerTotal,
    );
    if (remaining <= 0) continue;

    const envelope = deriveReachableHexes(
      unit,
      budget.mode,
      grid,
      capability,
      'normal',
      ruleOptions,
    );
    for (const rangeHex of envelope) {
      // Threshold only — `deriveReachableHexes` already computed each hex's true
      // reach cost, so remaining MP is applied purely as a filter.
      if (!rangeHex.reachable || rangeHex.mpCost > remaining) continue;
      const key = `${rangeHex.hex.q},${rangeHex.hex.r}`;
      const entries = byHex.get(key) ?? [];
      entries.push(rangeHex);
      byHex.set(key, entries);
    }
  }

  const merged: IMovementRangeHex[] = [];
  byHex.forEach((entries) => merged.push(withSameHexMovementOptions(entries)));
  return merged;
}

// ---------------------------------------------------------------------------
// 3.2 — Hover preview re-anchored at the last waypoint
// ---------------------------------------------------------------------------

export interface IIntentHoverPreview {
  /** Full path to highlight (anchor → hovered hex, inclusive of both). */
  readonly path: readonly IHexCoordinate[];
  /** Cumulative MP including the composed ledger + the previewed leg. */
  readonly cumulativeMpCost: number;
  /** `true` when the hovered hex cannot be reached under any remaining budget. */
  readonly unreachable: boolean;
}

export interface IResolveHoverParams {
  readonly intent: IMovementIntentState;
  readonly unit: IUnitGameState;
  readonly capability: IMovementCapability;
  readonly grid: IHexGrid;
  readonly budgetContext: IBudgetProjectionContext;
  readonly hoveredHex: IHexCoordinate | null;
  readonly routeCache: Map<string, ILocomotionLeg | null>;
  readonly unitId: string;
  readonly terrainRevision?: number | string;
}

/**
 * Resolve the hover preview for the intent-first flow: route the cheapest leg
 * from the current anchor (last waypoint, else unit) to the hovered hex under
 * the cheapest affordable mode that reaches it, and report the cumulative MP
 * (ledger + this leg). Returns `null` when there is no hovered hex; returns an
 * `unreachable` preview when no affordable mode reaches it.
 */
export function resolveIntentHoverPreview({
  intent,
  unit,
  capability,
  grid,
  budgetContext,
  hoveredHex,
  routeCache,
  unitId,
  terrainRevision,
}: IResolveHoverParams): IIntentHoverPreview | null {
  if (!hoveredHex) return null;
  const anchor = currentPathAnchor(intent, unit);
  const ledgerTotal = selectLedgerTotalMp(intent);

  // Hovering the anchor itself is a no-op (facing-only) — no leg to preview.
  if (hexEquals(anchor.hex, hoveredHex)) return null;

  const leg = routeCheapestLeg({
    intent,
    unitId,
    capability,
    grid,
    budgetContext,
    anchor,
    to: hoveredHex,
    ledgerTotal,
    routeCache,
    terrainRevision,
  });

  if (!leg) {
    return { path: [], cumulativeMpCost: ledgerTotal, unreachable: true };
  }

  return {
    path: [anchor.hex, ...leg.path],
    cumulativeMpCost: ledgerTotal + leg.mpCost,
    unreachable: false,
  };
}

// ---------------------------------------------------------------------------
// 3.3 — Click-adds-waypoint routing
// ---------------------------------------------------------------------------

export type IntentClickResult =
  | {
      readonly kind: 'append';
      readonly leg: ILocomotionLeg;
      readonly finalFacing: Facing;
    }
  | { readonly kind: 'pop'; readonly restoredFinalFacing: Facing }
  | { readonly kind: 'ignore' };

export interface IResolveClickParams {
  readonly intent: IMovementIntentState;
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly capability: IMovementCapability;
  readonly grid: IHexGrid;
  readonly budgetContext: IBudgetProjectionContext;
  readonly clickedHex: IHexCoordinate;
  readonly routeCache: Map<string, ILocomotionLeg | null>;
  readonly terrainRevision?: number | string;
}

/**
 * Resolve a reachable-hex click into a composer edit:
 *
 *  - clicking the current last waypoint → `pop` (spec: pop limited to last
 *    waypoint / Backspace);
 *  - clicking any other affordable hex → `append` the routed leg;
 *  - an unreachable click → `ignore` (Live Intersection blocks at the source).
 */
export function resolveWaypointClick({
  intent,
  unit,
  unitId,
  capability,
  grid,
  budgetContext,
  clickedHex,
  routeCache,
  terrainRevision,
}: IResolveClickParams): IntentClickResult {
  const last = lastWaypointHex(intent);
  if (last && hexEquals(last, clickedHex)) {
    return {
      kind: 'pop',
      restoredFinalFacing: restoredFacingAfterPop(intent, unit),
    };
  }

  const anchor = currentPathAnchor(intent, unit);
  if (hexEquals(anchor.hex, clickedHex)) return { kind: 'ignore' };

  const ledgerTotal = selectLedgerTotalMp(intent);
  const leg = routeCheapestLeg({
    intent,
    unitId,
    capability,
    grid,
    budgetContext,
    anchor,
    to: clickedHex,
    ledgerTotal,
    routeCache,
    terrainRevision,
  });
  if (!leg) return { kind: 'ignore' };

  return {
    kind: 'append',
    leg,
    finalFacing: facingFromLegPath(leg, anchor.facing),
  };
}

// ---------------------------------------------------------------------------
// Shared leg routing
// ---------------------------------------------------------------------------

interface RouteCheapestLegParams {
  readonly intent: IMovementIntentState;
  readonly unitId: string;
  readonly capability: IMovementCapability;
  readonly grid: IHexGrid;
  readonly budgetContext: IBudgetProjectionContext;
  readonly anchor: IRouteAnchor;
  readonly to: IHexCoordinate;
  readonly ledgerTotal: number;
  readonly routeCache: Map<string, ILocomotionLeg | null>;
  readonly terrainRevision?: number | string;
}

/**
 * Route the cheapest leg from `anchor` to `to`. If the player has already
 * Locked-In a mode, route only under that mode; otherwise try each still
 * affordable mode (cheapest budget MP first) and take the first that reaches the
 * hex. Every leg is priced by phase-2 `routeLegMemoized` — no local MP math.
 */
function routeCheapestLeg({
  intent,
  unitId,
  capability,
  grid,
  budgetContext,
  anchor,
  to,
  ledgerTotal,
  routeCache,
  terrainRevision,
}: RouteCheapestLegParams): ILocomotionLeg | null {
  const modes: readonly MovementType[] = intent.lockedMode
    ? [intent.lockedMode]
    : selectAffordableBudgets(intent, budgetContext).map(
        (budget) => budget.mode,
      );

  for (const mode of modes) {
    const request: IRouteLegRequest = {
      unitId,
      grid,
      from: anchor,
      to,
      mode,
      capability,
      currentHeat: budgetContext.currentHeat,
      consumedMp: ledgerTotal,
      terrainRevision,
    };
    const leg = routeLegMemoized(request, routeCache);
    if (leg) return leg;
  }
  return null;
}
