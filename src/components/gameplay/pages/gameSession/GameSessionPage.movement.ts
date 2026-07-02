import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  MapMovementKind,
  MapMovementPointLegendState,
} from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type { InteractiveSession } from '@/engine/GameEngine';

import { useGameplaySelector } from '@/stores/useGameplayStore';
import {
  Facing,
  GamePhase,
  GameSide,
  type IGameSession,
  type IHexCoordinate,
  type ILocomotionLeg,
  type IMovementRangeHex,
  MovementType,
} from '@/types/gameplay';
import { logger } from '@/utils/logger';

import {
  buildMovementGrid,
  buildMovementRangeLookup,
  buildReachableKeySet,
  buildSelectedMovementModePlan,
  deriveBaseMovementRangeHexes,
  deriveHoveredMovementProjection,
  getHoverMpCost,
  getHoveredMovementRangeHex,
  getHoveredPath,
  getHoverUnreachable,
  getRawMovementCapability,
  getSelectedUnitInfo,
  getSelectedUnitState,
  resolveMovementCapability,
  selectMovementPlan,
  shouldClearPlannedMovement,
} from './GameSessionPage.movement.helpers';
import { useIntentComposerMap } from './GameSessionPage.movementIntent.hook';
import {
  appendHoveredMovementProjection,
  buildMovementLegendState,
  canProjectMovementForSelectedUnit,
  getEffectiveMovementMps,
  getPlannedMovementForSelectedUnit,
  type IEffectiveMovementMps,
} from './GameSessionPage.movementPlanning';

const EMPTY_OPTIONAL_RULES: readonly string[] = [];

interface MovementPlanningParams {
  readonly session: IGameSession | null;
  readonly interactiveSession: InteractiveSession | null;
  readonly selectedUnitId: string | null;
  readonly phase: GamePhase | undefined;
  readonly handleInteractiveHexClick: (hex: IHexCoordinate) => void;
}

interface MovementPlanningResult {
  readonly capability: ReturnType<
    InteractiveSession['getMovementCapability']
  > | null;
  readonly effectiveMovementMps: IEffectiveMovementMps | null;
  readonly isPlayerControlled: boolean;
  readonly movementRangeHexes: readonly IMovementRangeHex[];
  readonly hoveredHex: IHexCoordinate | null;
  readonly hoveredMovementRangeHex: IMovementRangeHex | undefined;
  readonly hoveredPath: readonly IHexCoordinate[];
  readonly hoverMpCost: number | undefined;
  readonly hoverUnreachable: boolean;
  readonly mpLegend: MapMovementPointLegendState | undefined;
  readonly setHoveredHex: (hex: IHexCoordinate | null) => void;
  readonly handleHexClick: (hex: IHexCoordinate) => void;
  readonly handleMovementModeSelect: (mode: MapMovementKind) => void;
  /**
   * Intent-first (tactical-movement-intent-composer, phase 3) outputs. When the
   * composer is active for the selected unit these drive the map's Waypoint
   * Layer and pop affordance; they are inert (empty / null) otherwise so the
   * legacy path is untouched.
   */
  readonly composerActive: boolean;
  /** The composed Locomotion Path legs so the Waypoint Layer can render markers. */
  readonly composedLegs: readonly ILocomotionLeg[];
  /** The current last waypoint hex, or `null` when the path is empty. */
  readonly lastWaypointHex: IHexCoordinate | null;
  /** Pop the final leg (Backspace / last-waypoint-click). */
  readonly handleWaypointBackspace: () => void;
  /** Set the final facing at the last waypoint (Facing Picker Overlay). */
  readonly handleFacingSelect: (facing: Facing) => void;
}

export function useGameMovementPlanning({
  session,
  interactiveSession,
  selectedUnitId,
  phase,
  handleInteractiveHexClick,
}: MovementPlanningParams): MovementPlanningResult {
  const plannedMovement = useGameplaySelector((state) => state.plannedMovement);
  const setPlannedMovement = useGameplaySelector(
    (state) => state.setPlannedMovement,
  );
  const clearPlannedMovement = useGameplaySelector(
    (state) => state.clearPlannedMovement,
  );
  const [hoveredHex, setHoveredHex] = useState<IHexCoordinate | null>(null);

  const rawMovementCapability = useMemo(
    () => getRawMovementCapability(interactiveSession, selectedUnitId),
    [interactiveSession, selectedUnitId],
  );

  const selectedUnitState = useMemo(
    () => getSelectedUnitState(session, selectedUnitId),
    [session, selectedUnitId],
  );

  const capability = useMemo(
    () => resolveMovementCapability(rawMovementCapability, selectedUnitState),
    [rawMovementCapability, selectedUnitState],
  );

  const selectedUnitInfo = useMemo(
    () => getSelectedUnitInfo(session, selectedUnitId),
    [session, selectedUnitId],
  );

  const isPlayerControlled = selectedUnitInfo?.side === GameSide.Player;
  const canProjectMovement = canProjectMovementForSelectedUnit({
    phase,
    isPlayerControlled,
    selectedUnitState,
  });
  const plannedMovementForSelected = getPlannedMovementForSelectedUnit(
    plannedMovement,
    selectedUnitId,
  );
  const movementType =
    plannedMovementForSelected?.movementType ?? MovementType.Walk;
  const optionalRules = session?.config.optionalRules ?? EMPTY_OPTIONAL_RULES;
  const environmentalConditions = session?.config.environmentalConditions;
  const effectiveMovementMps = useMemo((): IEffectiveMovementMps | null => {
    if (!capability || !selectedUnitState) return null;
    return getEffectiveMovementMps(capability, selectedUnitState.heat);
  }, [capability, selectedUnitState]);
  const movementGrid = useMemo(
    () => buildMovementGrid(interactiveSession, session),
    [interactiveSession, session],
  );

  const baseMovementRangeHexes = useMemo(
    () =>
      deriveBaseMovementRangeHexes({
        interactiveSession,
        selectedUnitState,
        capability,
        movementGrid,
        canProjectMovement,
        movementType,
        environmentalConditions,
        optionalRules,
      }),
    [
      interactiveSession,
      selectedUnitState,
      capability,
      movementGrid,
      canProjectMovement,
      movementType,
      optionalRules,
      environmentalConditions,
    ],
  );

  const baseMovementRangeLookup = useMemo(
    () => buildMovementRangeLookup(baseMovementRangeHexes),
    [baseMovementRangeHexes],
  );

  const hoveredMovementProjection = useMemo(
    () =>
      deriveHoveredMovementProjection({
        hoveredHex,
        interactiveSession,
        selectedUnitState,
        capability,
        movementGrid,
        canProjectMovement,
        movementType,
        baseMovementRangeLookup,
        optionalRules,
      }),
    [
      hoveredHex,
      interactiveSession,
      selectedUnitState,
      capability,
      movementGrid,
      canProjectMovement,
      movementType,
      baseMovementRangeLookup,
      optionalRules,
    ],
  );

  const movementRangeHexes = useMemo(
    () =>
      appendHoveredMovementProjection(
        baseMovementRangeHexes,
        hoveredMovementProjection,
      ),
    [baseMovementRangeHexes, hoveredMovementProjection],
  );

  const reachableKeySet = useMemo(
    () => buildReachableKeySet(movementRangeHexes),
    [movementRangeHexes],
  );

  const movementRangeLookup = useMemo(
    () => buildMovementRangeLookup(movementRangeHexes),
    [movementRangeHexes],
  );

  const hoveredMovementRangeHex = useMemo(
    () => getHoveredMovementRangeHex(hoveredHex, movementRangeLookup),
    [hoveredHex, movementRangeLookup],
  );

  const hoveredPath = useMemo(
    () => getHoveredPath(hoveredMovementRangeHex, selectedUnitState, phase),
    [hoveredMovementRangeHex, selectedUnitState, phase],
  );

  const hoverMpCost = useMemo(
    () => getHoverMpCost(hoveredMovementRangeHex),
    [hoveredMovementRangeHex],
  );

  const hoverUnreachable = getHoverUnreachable({
    canProjectMovement,
    hoveredHex,
    movementRangeHexes,
    reachableKeySet,
  });

  const mpLegend = useMemo(() => {
    return buildMovementLegendState({
      phase,
      isPlayerControlled: canProjectMovement,
      effectiveMovementMps,
      movementType,
      movementMode: capability?.movementMode,
    });
  }, [
    capability?.movementMode,
    canProjectMovement,
    effectiveMovementMps,
    movementType,
    phase,
  ]);

  // -------------------------------------------------------------------------
  // Intent-first flow (tactical-movement-intent-composer, phase 3)
  //
  // When the composer is active for the selected unit, the map is driven by the
  // `movementIntent` slice: simultaneous affordable-mode envelopes recomputed
  // against remaining MP, a hover preview re-anchored at the last waypoint, and
  // click-adds-waypoint. All costs come from `movement-system` via phase-1/2.
  // The wiring lives in `useIntentComposerMap` to keep this hook focused.
  // -------------------------------------------------------------------------
  const composerActive = Boolean(
    canProjectMovement && capability && selectedUnitState && movementGrid,
  );
  const intentComposer = useIntentComposerMap({
    active: composerActive,
    unitId: selectedUnitId,
    unit: selectedUnitState,
    capability,
    grid: movementGrid,
    hoveredHex,
    environmentalConditions,
    optionalRules,
  });

  // Effective map outputs: intent-first when the composer owns the map, legacy
  // single-mode projection otherwise (so the legacy dock / legend still work
  // until phase 4 removes them).
  const effectiveMovementRangeHexes = composerActive
    ? intentComposer.envelopeHexes
    : movementRangeHexes;

  const effectiveHoveredPath = composerActive
    ? (intentComposer.hoverPreview?.path ?? [])
    : hoveredPath;

  const effectiveHoverMpCost = composerActive
    ? intentComposer.hoverPreview && !intentComposer.hoverPreview.unreachable
      ? intentComposer.hoverPreview.cumulativeMpCost
      : undefined
    : hoverMpCost;

  const effectiveHoverUnreachable = composerActive
    ? Boolean(intentComposer.hoverPreview?.unreachable)
    : hoverUnreachable;

  const handleHexClick = useCallback(
    (hex: IHexCoordinate) => {
      // Intent-first: a reachable-hex click appends a Waypoint; clicking the last
      // waypoint pops it (handled inside `handleComposerHexClick`). A `false`
      // return means the click was not a composer edit — fall through to the
      // legacy plan / interactive path.
      if (composerActive) {
        if (intentComposer.handleComposerHexClick(hex)) return;
        if (interactiveSession) handleInteractiveHexClick(hex);
        return;
      }

      const plan = selectMovementPlan({
        hex,
        canProjectMovement,
        selectedUnitState,
        movementRangeLookup,
        movementType,
      });
      if (plan) {
        setPlannedMovement(plan);
        return;
      }

      if (interactiveSession) {
        handleInteractiveHexClick(hex);
      } else {
        logger.debug('Hex clicked:', hex);
      }
    },
    [
      composerActive,
      intentComposer,
      canProjectMovement,
      selectedUnitState,
      movementRangeLookup,
      movementType,
      interactiveSession,
      setPlannedMovement,
      handleInteractiveHexClick,
    ],
  );

  const handleMovementModeSelect = useCallback(
    (mode: MapMovementKind) => {
      const plan = buildSelectedMovementModePlan({
        mode,
        canProjectMovement,
        selectedUnitState,
        effectiveMovementMps,
      });
      if (plan) setPlannedMovement(plan);
    },
    [
      canProjectMovement,
      selectedUnitState,
      effectiveMovementMps,
      setPlannedMovement,
    ],
  );

  useEffect(() => {
    if (
      shouldClearPlannedMovement({
        plannedMovement,
        plannedMovementForSelected,
        canProjectMovement,
        phase,
      })
    ) {
      clearPlannedMovement();
    }
  }, [
    canProjectMovement,
    phase,
    plannedMovement,
    plannedMovementForSelected,
    clearPlannedMovement,
  ]);

  return {
    capability,
    effectiveMovementMps,
    isPlayerControlled,
    movementRangeHexes: effectiveMovementRangeHexes,
    hoveredHex,
    hoveredMovementRangeHex,
    hoveredPath: effectiveHoveredPath,
    hoverMpCost: effectiveHoverMpCost,
    hoverUnreachable: effectiveHoverUnreachable,
    mpLegend,
    setHoveredHex,
    handleHexClick,
    handleMovementModeSelect,
    composerActive,
    composedLegs: intentComposer.composedLegs,
    lastWaypointHex: intentComposer.lastWaypointHex,
    handleWaypointBackspace: intentComposer.handleBackspace,
    handleFacingSelect: intentComposer.handleFacingSelect,
  };
}
