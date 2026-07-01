/**
 * `useIntentComposerMap` — the React glue for the Movement Intent Composer's map
 * surface (change `tactical-movement-intent-composer`, phase 3). It reads the
 * `movementIntent` store slice + composer actions and, using the pure derivation
 * in `GameSessionPage.movementIntent.ts`, produces the intent-first map outputs
 * `useGameMovementPlanning` overlays on the legacy movement projection:
 *
 *  - `envelopeHexes` (3.1) — simultaneous affordable-mode envelopes vs remaining MP,
 *  - `hoverPreview` (3.2) — hover path re-anchored at the last waypoint,
 *  - `handleComposerHexClick` (3.3) — click-adds-waypoint / pop-on-last,
 *  - `composedLegs` + `lastWaypointHex` (3.4) — Waypoint Layer inputs,
 *  - `handleFacingSelect` (3.5) — final facing at the last waypoint,
 *  - `handleBackspace` — Backspace pop (bound to `window` while active).
 *
 * All routing / MP comes from phase-1/2 (`movement-system`) — no UI-local math.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-map-interface/spec.md
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useGameplaySelector } from '@/stores/useGameplayStore';
import {
  Facing,
  type IHexCoordinate,
  type IHexGrid,
  type ILocomotionLeg,
  type IMovementCapability,
  type IMovementRangeHex,
  type IUnitGameState,
} from '@/types/gameplay';
import { type IEnvironmentalConditions } from '@/types/gameplay';

import {
  buildIntentEnvelopeHexes,
  lastWaypointHex as intentLastWaypointHex,
  resolveIntentHoverPreview,
  resolveWaypointClick,
  restoredFacingAfterPop,
  type IIntentHoverPreview,
} from './GameSessionPage.movementIntent';

export interface IntentComposerMapParams {
  /** `true` when the composer should own the map for the selected unit. */
  readonly active: boolean;
  readonly unitId: string | null;
  readonly unit: IUnitGameState | null;
  readonly capability: IMovementCapability | null;
  readonly grid: IHexGrid | null;
  readonly hoveredHex: IHexCoordinate | null;
  readonly environmentalConditions: IEnvironmentalConditions | undefined;
  readonly optionalRules: readonly string[];
}

export interface IntentComposerMap {
  readonly envelopeHexes: readonly IMovementRangeHex[];
  readonly hoverPreview: IIntentHoverPreview | null;
  readonly composedLegs: readonly ILocomotionLeg[];
  readonly lastWaypointHex: IHexCoordinate | null;
  readonly handleFacingSelect: (facing: Facing) => void;
  readonly handleBackspace: () => void;
  /**
   * Resolve a reachable-hex click. Returns `true` when the click was handled as
   * a composer edit (append / pop) OR should be swallowed; `false` when the
   * caller should fall through to its legacy click path.
   */
  readonly handleComposerHexClick: (hex: IHexCoordinate) => boolean;
}

export function useIntentComposerMap({
  active,
  unitId,
  unit,
  capability,
  grid,
  hoveredHex,
  environmentalConditions,
  optionalRules,
}: IntentComposerMapParams): IntentComposerMap {
  const movementIntent = useGameplaySelector((state) => state.movementIntent);
  const appendWaypoint = useGameplaySelector((state) => state.appendWaypoint);
  const popWaypoint = useGameplaySelector((state) => state.popWaypoint);
  const setFinalFacing = useGameplaySelector((state) => state.setFinalFacing);

  // Caller-owned route memo (design D2). Reset when the unit / grid changes so a
  // stale route never leaks across units or turns.
  const routeCacheRef = useRef<Map<string, ILocomotionLeg | null>>(new Map());
  useEffect(() => {
    routeCacheRef.current = new Map();
  }, [unitId, grid]);

  const ready = Boolean(active && unit && capability && grid && unitId);

  const budgetContext = useMemo(() => {
    if (!capability || !unit) return null;
    return {
      capability,
      currentHeat: unit.heat,
      movementHeatProfile: capability.movementHeatProfile,
    };
  }, [capability, unit]);

  const envelopeHexes = useMemo(() => {
    if (!ready || !unit || !capability || !grid || !budgetContext) {
      return [] as readonly IMovementRangeHex[];
    }
    return buildIntentEnvelopeHexes({
      intent: movementIntent,
      unit,
      capability,
      grid,
      budgetContext,
      environmentalConditions,
      optionalRules,
    });
  }, [
    ready,
    unit,
    capability,
    grid,
    budgetContext,
    movementIntent,
    environmentalConditions,
    optionalRules,
  ]);

  const hoverPreview = useMemo((): IIntentHoverPreview | null => {
    if (!ready || !unit || !capability || !grid || !budgetContext || !unitId) {
      return null;
    }
    return resolveIntentHoverPreview({
      intent: movementIntent,
      unit,
      capability,
      grid,
      budgetContext,
      hoveredHex,
      routeCache: routeCacheRef.current,
      unitId,
    });
  }, [
    ready,
    unit,
    capability,
    grid,
    budgetContext,
    unitId,
    movementIntent,
    hoveredHex,
  ]);

  const composedLegs = useMemo(() => {
    const locomotion = movementIntent.items.find(
      (item) => item.kind === 'locomotion',
    );
    return locomotion && locomotion.kind === 'locomotion'
      ? locomotion.legs
      : ([] as readonly ILocomotionLeg[]);
  }, [movementIntent]);

  const lastWaypointHex = useMemo(
    () => (ready ? intentLastWaypointHex(movementIntent) : null),
    [ready, movementIntent],
  );

  const handleFacingSelect = useCallback(
    (facing: Facing) => setFinalFacing(facing),
    [setFinalFacing],
  );

  const handleBackspace = useCallback(() => {
    if (!ready || !unit) return;
    popWaypoint(restoredFacingAfterPop(movementIntent, unit));
  }, [ready, unit, movementIntent, popWaypoint]);

  // Backspace pops the last Waypoint while the composer is active (spec: pop via
  // Backspace or last-waypoint-click). Ignored while typing in an input so a
  // Backspace in a chat / name field never mutates the path.
  useEffect(() => {
    if (!ready) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Backspace') return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        target?.isContentEditable === true
      ) {
        return;
      }
      event.preventDefault();
      handleBackspace();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ready, handleBackspace]);

  const handleComposerHexClick = useCallback(
    (hex: IHexCoordinate): boolean => {
      if (
        !ready ||
        !unit ||
        !capability ||
        !grid ||
        !budgetContext ||
        !unitId
      ) {
        return false;
      }
      const result = resolveWaypointClick({
        intent: movementIntent,
        unit,
        unitId,
        capability,
        grid,
        budgetContext,
        clickedHex: hex,
        routeCache: routeCacheRef.current,
      });
      if (result.kind === 'append') {
        appendWaypoint(result.leg, result.finalFacing);
        return true;
      }
      if (result.kind === 'pop') {
        popWaypoint(result.restoredFinalFacing);
        return true;
      }
      // 'ignore' — let the caller run its legacy click path (interactive click).
      return false;
    },
    [
      ready,
      unit,
      capability,
      grid,
      budgetContext,
      unitId,
      movementIntent,
      appendWaypoint,
      popWaypoint,
    ],
  );

  return {
    envelopeHexes,
    hoverPreview,
    composedLegs,
    lastWaypointHex,
    handleFacingSelect,
    handleBackspace,
    handleComposerHexClick,
  };
}
