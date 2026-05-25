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
  type IHexGrid,
  type IMovementRangeHex,
  MovementType,
} from '@/types/gameplay';
import {
  gridWithUnitOccupants,
  resolveRuntimeMovementCapability,
} from '@/utils/gameplay/movement';
import {
  deriveMovementRangeHexForDestination,
  deriveReachableHexes,
} from '@/utils/gameplay/movement/reachable';
import { logger } from '@/utils/logger';

import {
  appendHoveredMovementProjection,
  buildMovementModeSeedPlan,
  buildMovementPlan,
  buildMovementLegendState,
  canProjectMovementForSelectedUnit,
  getEffectiveMovementMps,
  getPlannedMovementForSelectedUnit,
  mergeJumpMovementRangeHexes,
  mergeRunMovementRangeHexes,
  movementPathFromRangeHex,
  movementTypeFromLegendSelection,
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

  const rawMovementCapability = useMemo(() => {
    if (!interactiveSession || !selectedUnitId) return null;
    return interactiveSession.getMovementCapability(selectedUnitId);
  }, [interactiveSession, selectedUnitId]);

  const selectedUnitState = useMemo(() => {
    if (!session || !selectedUnitId) return null;
    return session.currentState.units[selectedUnitId] ?? null;
  }, [session, selectedUnitId]);

  const capability = useMemo(() => {
    if (!rawMovementCapability || !selectedUnitState) {
      return rawMovementCapability;
    }
    return (
      resolveRuntimeMovementCapability(
        selectedUnitState,
        rawMovementCapability,
      ) ?? rawMovementCapability
    );
  }, [rawMovementCapability, selectedUnitState]);

  const selectedUnitInfo = useMemo(() => {
    if (!session || !selectedUnitId) return null;
    return session.units.find((u) => u.id === selectedUnitId) ?? null;
  }, [session, selectedUnitId]);

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
  const effectiveMovementMps = useMemo((): IEffectiveMovementMps | null => {
    if (!capability || !selectedUnitState) return null;
    return getEffectiveMovementMps(capability, selectedUnitState.heat);
  }, [capability, selectedUnitState]);
  const movementGrid = useMemo((): IHexGrid | null => {
    if (!interactiveSession) return null;
    const baseGrid = interactiveSession.getGrid();
    return session
      ? gridWithUnitOccupants(baseGrid, session.currentState.units)
      : baseGrid;
  }, [interactiveSession, session]);

  const baseMovementRangeHexes = useMemo((): readonly IMovementRangeHex[] => {
    if (
      !interactiveSession ||
      !selectedUnitState ||
      !capability ||
      !movementGrid ||
      !canProjectMovement ||
      movementType === MovementType.Stationary
    ) {
      return [];
    }

    const primary = deriveReachableHexes(
      selectedUnitState,
      movementType,
      movementGrid,
      capability,
      'normal',
      { optionalRules },
    );
    if (movementType === MovementType.Jump) {
      const run = deriveReachableHexes(
        selectedUnitState,
        MovementType.Run,
        movementGrid,
        capability,
        'normal',
        { optionalRules },
      );
      const walk = deriveReachableHexes(
        selectedUnitState,
        MovementType.Walk,
        movementGrid,
        capability,
        'normal',
        { optionalRules },
      );
      return mergeJumpMovementRangeHexes(primary, run, walk);
    }

    if (movementType !== MovementType.Run) return primary;

    const walk = deriveReachableHexes(
      selectedUnitState,
      MovementType.Walk,
      movementGrid,
      capability,
      'normal',
      { optionalRules },
    );
    return mergeRunMovementRangeHexes(primary, walk);
  }, [
    interactiveSession,
    selectedUnitState,
    capability,
    movementGrid,
    canProjectMovement,
    movementType,
    optionalRules,
  ]);

  const baseMovementRangeLookup = useMemo(() => {
    const lookup = new Map<string, IMovementRangeHex>();
    for (const entry of baseMovementRangeHexes) {
      lookup.set(`${entry.hex.q},${entry.hex.r}`, entry);
    }
    return lookup;
  }, [baseMovementRangeHexes]);

  const hoveredMovementProjection = useMemo((): IMovementRangeHex | null => {
    if (
      !hoveredHex ||
      !interactiveSession ||
      !selectedUnitState ||
      !capability ||
      !movementGrid ||
      !canProjectMovement ||
      movementType === MovementType.Stationary ||
      baseMovementRangeLookup.has(`${hoveredHex.q},${hoveredHex.r}`)
    ) {
      return null;
    }

    return deriveMovementRangeHexForDestination(
      selectedUnitState,
      movementType,
      movementGrid,
      capability,
      hoveredHex,
      'normal',
      { optionalRules },
    );
  }, [
    hoveredHex,
    interactiveSession,
    selectedUnitState,
    capability,
    movementGrid,
    canProjectMovement,
    movementType,
    baseMovementRangeLookup,
    optionalRules,
  ]);

  const movementRangeHexes = useMemo(
    () =>
      appendHoveredMovementProjection(
        baseMovementRangeHexes,
        hoveredMovementProjection,
      ),
    [baseMovementRangeHexes, hoveredMovementProjection],
  );

  const reachableKeySet = useMemo(() => {
    const keys = new Set<string>();
    for (const r of movementRangeHexes) {
      if (r.reachable) keys.add(`${r.hex.q},${r.hex.r}`);
    }
    return keys;
  }, [movementRangeHexes]);

  const movementRangeLookup = useMemo(() => {
    const lookup = new Map<string, IMovementRangeHex>();
    for (const entry of movementRangeHexes) {
      lookup.set(`${entry.hex.q},${entry.hex.r}`, entry);
    }
    return lookup;
  }, [movementRangeHexes]);

  const hoveredMovementRangeHex = useMemo(() => {
    if (!hoveredHex) return undefined;
    return movementRangeLookup.get(`${hoveredHex.q},${hoveredHex.r}`);
  }, [hoveredHex, movementRangeLookup]);

  const hoveredPath = useMemo((): readonly IHexCoordinate[] => {
    if (
      !hoveredMovementRangeHex?.reachable ||
      !selectedUnitState ||
      phase !== GamePhase.Movement
    ) {
      return [];
    }
    return movementPathFromRangeHex(
      hoveredMovementRangeHex,
      selectedUnitState.position,
    );
  }, [hoveredMovementRangeHex, selectedUnitState, phase]);

  const hoverMpCost = useMemo(() => {
    if (!hoveredMovementRangeHex?.reachable) return undefined;
    return hoveredMovementRangeHex.mpCost;
  }, [hoveredMovementRangeHex]);

  const hoverUnreachable =
    canProjectMovement &&
    hoveredHex !== null &&
    movementRangeHexes.length > 0 &&
    !reachableKeySet.has(`${hoveredHex.q},${hoveredHex.r}`);

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
      if (canProjectMovement && selectedUnitState) {
        const plan = buildMovementPlan({
          hex,
          selectedUnitState,
          movementRangeLookup,
          movementType,
        });
        if (plan) {
          setPlannedMovement(plan);
          return;
        }
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
      if (!canProjectMovement || !selectedUnitState) return;
      const selectedMovementType = movementTypeFromLegendSelection(mode);
      if (
        selectedMovementType === MovementType.Jump &&
        !effectiveMovementMps?.jumpMP
      ) {
        return;
      }
      setPlannedMovement(
        buildMovementModeSeedPlan({
          selectedUnitState,
          movementType: selectedMovementType,
        }),
      );
    },
    [
      canProjectMovement,
      selectedUnitState,
      effectiveMovementMps?.jumpMP,
      setPlannedMovement,
    ],
  );

  useEffect(() => {
    if (plannedMovement && !plannedMovementForSelected) {
      clearPlannedMovement();
      return;
    }
    if (plannedMovement && !canProjectMovement) {
      clearPlannedMovement();
      return;
    }
    if (phase !== GamePhase.Movement && plannedMovement) {
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
