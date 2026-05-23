import type { MapMovementPointLegendState } from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type { IPlannedMovement } from '@/stores/useGameplayStore';
import type {
  IGameSession,
  IHexCoordinate,
  IMovementCapability,
  IMovementRangeHex,
} from '@/types/gameplay';

import { getHeatMovementPenalty } from '@/constants/heat';
import { Facing, GamePhase, MovementType } from '@/types/gameplay';
import { AXIAL_DIRECTION_DELTAS } from '@/types/gameplay/HexGridInterfaces';
import { getMaxMP } from '@/utils/gameplay/movement';

export interface IEffectiveMovementMps {
  readonly walkMP: number;
  readonly runMP: number;
  readonly jumpMP: number;
}

interface MovementPlanParams {
  readonly hex: IHexCoordinate;
  readonly selectedUnitState: IGameSession['currentState']['units'][string];
  readonly movementRangeLookup: ReadonlyMap<string, IMovementRangeHex>;
  readonly movementType: MovementType;
}

function movementRangeKey(hex: IHexCoordinate): string {
  return `${hex.q},${hex.r}`;
}

export function getEffectiveMovementMps(
  capability: IMovementCapability,
  heat: number,
): IEffectiveMovementMps {
  const heatPenalty = getHeatMovementPenalty(heat);
  return {
    walkMP: getMaxMP(capability, MovementType.Walk, heatPenalty),
    runMP: getMaxMP(capability, MovementType.Run, heatPenalty),
    jumpMP: getMaxMP(capability, MovementType.Jump, heatPenalty),
  };
}

export function buildMovementLegendState({
  phase,
  isPlayerControlled,
  effectiveMovementMps,
  movementType,
  movementMode,
}: {
  readonly phase: GamePhase | undefined;
  readonly isPlayerControlled: boolean;
  readonly effectiveMovementMps: IEffectiveMovementMps | null;
  readonly movementType: MovementType;
  readonly movementMode?: string;
}): MapMovementPointLegendState | undefined {
  if (
    phase !== GamePhase.Movement ||
    !isPlayerControlled ||
    !effectiveMovementMps
  ) {
    return undefined;
  }
  const active =
    movementType === MovementType.Jump
      ? ('jump' as const)
      : movementType === MovementType.Run
        ? ('run' as const)
        : ('walk' as const);
  return {
    active,
    jumpAvailable: effectiveMovementMps.jumpMP > 0,
    movementMode,
    walkMP: effectiveMovementMps.walkMP,
    runMP: effectiveMovementMps.runMP,
    jumpMP: effectiveMovementMps.jumpMP,
  };
}

export function getPlannedMovementForSelectedUnit(
  plannedMovement: IPlannedMovement | null,
  selectedUnitId: string | null,
): IPlannedMovement | null {
  if (!plannedMovement || !selectedUnitId) return null;
  if (plannedMovement.unitId && plannedMovement.unitId !== selectedUnitId) {
    return null;
  }
  return plannedMovement;
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

export function movementPathFromRangeHex(
  movementRangeHex: IMovementRangeHex,
  origin: IHexCoordinate,
): readonly IHexCoordinate[] {
  if (movementRangeHex.path && movementRangeHex.path.length > 0) {
    return movementRangeHex.path;
  }
  return [origin, movementRangeHex.hex];
}

export function mergeRunMovementRangeHexes(
  run: readonly IMovementRangeHex[],
  walk: readonly IMovementRangeHex[],
): readonly IMovementRangeHex[] {
  const keyed = new Map<string, IMovementRangeHex>();
  for (const h of run) keyed.set(movementRangeKey(h.hex), h);
  for (const h of walk) {
    const key = movementRangeKey(h.hex);
    const existing = keyed.get(key);
    if (!existing || (!existing.reachable && h.reachable)) {
      keyed.set(key, h);
    }
  }
  return Array.from(keyed.values());
}

export function appendHoveredMovementProjection(
  movementRangeHexes: readonly IMovementRangeHex[],
  hoveredMovementProjection: IMovementRangeHex | null,
): readonly IMovementRangeHex[] {
  if (!hoveredMovementProjection) return movementRangeHexes;
  const hoveredKey = movementRangeKey(hoveredMovementProjection.hex);
  if (
    movementRangeHexes.some(
      (entry) => movementRangeKey(entry.hex) === hoveredKey,
    )
  ) {
    return movementRangeHexes;
  }
  return [...movementRangeHexes, hoveredMovementProjection];
}

export function buildMovementPlan({
  hex,
  selectedUnitState,
  movementRangeLookup,
  movementType,
}: MovementPlanParams): IPlannedMovement | null {
  const projectedMovement = movementRangeLookup.get(movementRangeKey(hex));
  if (!projectedMovement?.reachable) {
    return null;
  }
  const path = movementPathFromRangeHex(
    projectedMovement,
    selectedUnitState.position,
  );
  return {
    unitId: selectedUnitState.id,
    destination: projectedMovement.hex,
    facing: facingFromPath(path, selectedUnitState.facing),
    movementType: projectedMovement.movementType ?? movementType,
    path,
    mpCost: projectedMovement.mpCost,
    heatGenerated: projectedMovement.heatGenerated,
    movementMode: projectedMovement.movementMode,
    terrainCost: projectedMovement.terrainCost,
    elevationDelta: projectedMovement.elevationDelta,
    elevationCost: projectedMovement.elevationCost,
  };
}
