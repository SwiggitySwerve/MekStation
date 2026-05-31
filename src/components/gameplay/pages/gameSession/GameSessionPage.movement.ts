import { useCallback, useEffect, useMemo, useState } from 'react';

import type { InteractiveSession } from '@/engine/GameEngine';

import {
  useGameplaySelector,
  type IPlannedMovement,
} from '@/stores/useGameplayStore';
import {
  Facing,
  GamePhase,
  GameSide,
  type IGameSession,
  type IHexCoordinate,
  type IMovementRangeHex,
  MovementType,
} from '@/types/gameplay';
import { AXIAL_DIRECTION_DELTAS } from '@/types/gameplay/HexGridInterfaces';
import { findPath } from '@/utils/gameplay/movement/pathfinding';
import { deriveReachableHexes } from '@/utils/gameplay/movement/reachable';
import { logger } from '@/utils/logger';

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
  readonly isPlayerControlled: boolean;
  readonly movementRangeHexes: readonly IMovementRangeHex[];
  readonly hoveredPath: readonly IHexCoordinate[];
  readonly hoverMpCost: number | undefined;
  readonly hoverUnreachable: boolean;
  readonly mpLegend:
    | {
        readonly active: 'walk' | 'run' | 'jump';
        readonly jumpAvailable: boolean;
      }
    | undefined;
  readonly setHoveredHex: (hex: IHexCoordinate | null) => void;
  readonly handleHexClick: (hex: IHexCoordinate) => void;
}

function isRunBasedMovementType(movementType: MovementType): boolean {
  return (
    movementType === MovementType.Run || movementType === MovementType.Evade
  );
}

function groundMovementMode(movementType: MovementType): 'walk' | 'run' {
  return isRunBasedMovementType(movementType) ? 'run' : 'walk';
}

function groundMovementMaxCost(
  capability: ReturnType<InteractiveSession['getMovementCapability']> | null,
  movementType: MovementType,
): number {
  if (!capability) return Infinity;
  return isRunBasedMovementType(movementType)
    ? capability.runMP
    : capability.walkMP;
}

function facingFromPath(
  path: readonly IHexCoordinate[],
  fallback: Facing,
): Facing {
  if (path.length < 2) return fallback;
  const prev = path[path.length - 2];
  const last = path[path.length - 1];
  const dq = last.q - prev.q;
  const dr = last.r - prev.r;
  for (let i = 0; i < AXIAL_DIRECTION_DELTAS.length; i++) {
    const delta = AXIAL_DIRECTION_DELTAS[i];
    if (delta.q === dq && delta.r === dr) {
      return i as Facing;
    }
  }
  return fallback;
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

  const capability = useMemo(() => {
    if (!interactiveSession || !selectedUnitId) return null;
    return interactiveSession.getMovementCapability(selectedUnitId);
  }, [interactiveSession, selectedUnitId]);

  const selectedUnitState = useMemo(() => {
    if (!session || !selectedUnitId) return null;
    return session.currentState.units[selectedUnitId] ?? null;
  }, [session, selectedUnitId]);

  const selectedUnitInfo = useMemo(() => {
    if (!session || !selectedUnitId) return null;
    return session.units.find((u) => u.id === selectedUnitId) ?? null;
  }, [session, selectedUnitId]);

  const isPlayerControlled = selectedUnitInfo?.side === GameSide.Player;
  const movementType = plannedMovement?.movementType ?? MovementType.Walk;

  const movementRangeHexes = useMemo((): readonly IMovementRangeHex[] => {
    if (
      !interactiveSession ||
      !selectedUnitState ||
      !capability ||
      !isPlayerControlled ||
      phase !== GamePhase.Movement ||
      movementType === MovementType.Stationary
    ) {
      return [];
    }

    const grid = interactiveSession.getGrid();
    const primary = deriveReachableHexes(
      selectedUnitState,
      movementType,
      grid,
      capability,
    );
    if (!isRunBasedMovementType(movementType)) return primary;

    const walk = deriveReachableHexes(
      selectedUnitState,
      MovementType.Walk,
      grid,
      capability,
    );
    const keyed = new Map<string, IMovementRangeHex>();
    for (const h of primary) keyed.set(`${h.hex.q},${h.hex.r}`, h);
    for (const h of walk) keyed.set(`${h.hex.q},${h.hex.r}`, h);
    return Array.from(keyed.values());
  }, [
    interactiveSession,
    selectedUnitState,
    capability,
    isPlayerControlled,
    phase,
    movementType,
  ]);

  const reachableKeySet = useMemo(() => {
    const keys = new Set<string>();
    for (const r of movementRangeHexes) keys.add(`${r.hex.q},${r.hex.r}`);
    return keys;
  }, [movementRangeHexes]);

  const hoveredPath = useMemo((): readonly IHexCoordinate[] => {
    if (
      !hoveredHex ||
      !interactiveSession ||
      !selectedUnitState ||
      phase !== GamePhase.Movement ||
      !reachableKeySet.has(`${hoveredHex.q},${hoveredHex.r}`)
    ) {
      return [];
    }
    if (movementType === MovementType.Jump) {
      return [selectedUnitState.position, hoveredHex];
    }
    return (
      findPath(
        interactiveSession.getGrid(),
        selectedUnitState.position,
        hoveredHex,
        groundMovementMaxCost(capability, movementType),
        groundMovementMode(movementType),
        { pilotAbilities: selectedUnitState.abilities },
      ) ?? []
    );
  }, [
    hoveredHex,
    interactiveSession,
    selectedUnitState,
    phase,
    reachableKeySet,
    movementType,
    capability,
  ]);

  const hoverMpCost = useMemo(() => {
    if (!hoveredHex || !reachableKeySet.has(`${hoveredHex.q},${hoveredHex.r}`))
      return undefined;
    const entry = movementRangeHexes.find(
      (r) => r.hex.q === hoveredHex.q && r.hex.r === hoveredHex.r,
    );
    return entry?.mpCost;
  }, [hoveredHex, reachableKeySet, movementRangeHexes]);

  const hoverUnreachable =
    phase === GamePhase.Movement &&
    isPlayerControlled &&
    hoveredHex !== null &&
    movementRangeHexes.length > 0 &&
    !reachableKeySet.has(`${hoveredHex.q},${hoveredHex.r}`);

  const mpLegend = useMemo(() => {
    if (phase !== GamePhase.Movement || !isPlayerControlled || !capability) {
      return undefined;
    }
    const active =
      movementType === MovementType.Jump
        ? ('jump' as const)
        : isRunBasedMovementType(movementType)
          ? ('run' as const)
          : ('walk' as const);
    return { active, jumpAvailable: capability.jumpMP > 0 };
  }, [phase, isPlayerControlled, capability, movementType]);

  const handleHexClick = useCallback(
    (hex: IHexCoordinate) => {
      if (
        phase === GamePhase.Movement &&
        isPlayerControlled &&
        selectedUnitState
      ) {
        const plan = buildMovementPlan({
          hex,
          selectedUnitState,
          reachableKeySet,
          movementType,
          interactiveSession,
          capability,
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
      phase,
      isPlayerControlled,
      selectedUnitState,
      reachableKeySet,
      movementType,
      interactiveSession,
      capability,
      setPlannedMovement,
      handleInteractiveHexClick,
    ],
  );

  useEffect(() => {
    if (phase !== GamePhase.Movement && plannedMovement) {
      clearPlannedMovement();
    }
  }, [phase, plannedMovement, clearPlannedMovement]);

  return {
    capability,
    isPlayerControlled,
    movementRangeHexes,
    hoveredPath,
    hoverMpCost,
    hoverUnreachable,
    mpLegend,
    setHoveredHex,
    handleHexClick,
  };
}

interface MovementPlanParams {
  readonly hex: IHexCoordinate;
  readonly selectedUnitState: IGameSession['currentState']['units'][string];
  readonly reachableKeySet: ReadonlySet<string>;
  readonly movementType: MovementType;
  readonly interactiveSession: InteractiveSession | null;
  readonly capability: ReturnType<
    InteractiveSession['getMovementCapability']
  > | null;
}

function buildMovementPlan({
  hex,
  selectedUnitState,
  reachableKeySet,
  movementType,
  interactiveSession,
  capability,
}: MovementPlanParams): IPlannedMovement | null {
  if (!reachableKeySet.has(`${hex.q},${hex.r}`) || !interactiveSession) {
    return null;
  }
  const path =
    movementType === MovementType.Jump
      ? [selectedUnitState.position, hex]
      : (findPath(
          interactiveSession.getGrid(),
          selectedUnitState.position,
          hex,
          groundMovementMaxCost(capability, movementType),
          groundMovementMode(movementType),
          { pilotAbilities: selectedUnitState.abilities },
        ) ?? []);
  return {
    destination: hex,
    facing: facingFromPath(path, selectedUnitState.facing),
    movementType,
    path,
  };
}
