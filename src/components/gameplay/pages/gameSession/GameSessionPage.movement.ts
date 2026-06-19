import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  MapMovementKind,
  MapMovementPointLegendState,
} from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type { InteractiveSession } from '@/engine/GameEngine';

import { useGameplaySelector } from '@/stores/useGameplayStore';
import {
  GamePhase,
  GameSide,
  type IGameSession,
  type IHexCoordinate,
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

  const handleHexClick = useCallback(
    (hex: IHexCoordinate) => {
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
    movementRangeHexes,
    hoveredHex,
    hoveredMovementRangeHex,
    hoveredPath,
    hoverMpCost,
    hoverUnreachable,
    mpLegend,
    setHoveredHex,
    handleHexClick,
    handleMovementModeSelect,
  };
}
