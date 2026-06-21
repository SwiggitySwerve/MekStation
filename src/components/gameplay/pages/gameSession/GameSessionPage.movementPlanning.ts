import type {
  MapMovementKind,
  MapMovementPointLegendState,
} from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type { IPlannedMovement } from '@/stores/useGameplayStore';
import type {
  IGameSession,
  IHexCoordinate,
  IMovementCapability,
  IMovementRangeHex,
  IMovementRangeModeOption,
} from '@/types/gameplay';

import { getHeatMovementPenalty } from '@/constants/heat';
import { Facing, GamePhase, GameSide, MovementType } from '@/types/gameplay';
import { AXIAL_DIRECTION_DELTAS } from '@/types/gameplay/HexGridInterfaces';
import {
  getMaxMP,
  movementDeclarationLockInvalidState,
} from '@/utils/gameplay/movement';

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

export function canProjectMovementForSelectedUnit({
  phase,
  isPlayerControlled,
  selectedUnitState,
}: {
  readonly phase: GamePhase | undefined;
  readonly isPlayerControlled: boolean;
  readonly selectedUnitState:
    | IGameSession['currentState']['units'][string]
    | null;
}): boolean {
  return (
    phase === GamePhase.Movement &&
    isPlayerControlled &&
    selectedUnitState !== null &&
    movementDeclarationLockInvalidState(selectedUnitState.lockState) === null
  );
}

export function movementTypeFromCommandPayload(
  payload: unknown,
): MovementType | null {
  if (!payload || typeof payload !== 'object') return null;
  const mode = (payload as { readonly mode?: unknown }).mode;
  switch (mode) {
    case 'walk':
      return MovementType.Walk;
    case 'run':
      return MovementType.Run;
    case 'jump':
      return MovementType.Jump;
    // Audit 2026-06-09 A-3 restoration: the tactical dock's sprint/evade
    // commands commit `lock` with these modes; without the mapping the
    // game-page dispatcher would fall through to skipPhase().
    case 'sprint':
      return MovementType.Sprint;
    case 'evade':
      return MovementType.Evade;
    default:
      return null;
  }
}

export function movementTypeFromLegendSelection(
  mode: MapMovementKind,
): MovementType {
  switch (mode) {
    case 'walk':
      return MovementType.Walk;
    case 'run':
      return MovementType.Run;
    case 'jump':
      return MovementType.Jump;
  }
}

export function buildMovementModeSeedPlan({
  selectedUnitState,
  movementType,
}: {
  readonly selectedUnitState: IGameSession['currentState']['units'][string];
  readonly movementType: MovementType;
}): IPlannedMovement {
  return {
    unitId: selectedUnitState.id,
    destination: selectedUnitState.position,
    facing: selectedUnitState.facing,
    movementType,
    path: [],
  };
}

export function buildMovementModeSeedPlanFromCommandPayload({
  phase,
  payload,
  selectedUnitState,
}: {
  readonly phase: GamePhase | undefined;
  readonly payload: unknown;
  readonly selectedUnitState:
    | IGameSession['currentState']['units'][string]
    | null;
}): IPlannedMovement | null {
  if (!selectedUnitState) return null;
  if (
    !canProjectMovementForSelectedUnit({
      phase,
      isPlayerControlled: selectedUnitState?.side === GameSide.Player,
      selectedUnitState,
    })
  ) {
    return null;
  }
  const movementType = movementTypeFromCommandPayload(payload);
  if (!movementType) return null;
  return buildMovementModeSeedPlan({ selectedUnitState, movementType });
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

function movementRangeModeOptionFor(
  movementRangeHex: IMovementRangeHex,
): IMovementRangeModeOption {
  return {
    movementType: movementRangeHex.movementType,
    movementMode: movementRangeHex.movementMode,
    reachable: movementRangeHex.reachable,
    mpCost: movementRangeHex.mpCost,
    terrainCost: movementRangeHex.terrainCost,
    turningCost: movementRangeHex.turningCost,
    elevationDelta: movementRangeHex.elevationDelta,
    elevationCost: movementRangeHex.elevationCost,
    heatGenerated: movementRangeHex.heatGenerated,
    conversionStepCount: movementRangeHex.conversionStepCount,
    conversionMpCost: movementRangeHex.conversionMpCost,
    altitudeControlStepCount: movementRangeHex.altitudeControlStepCount,
    altitudeControlMpCost: movementRangeHex.altitudeControlMpCost,
    altitudeControlRequired: movementRangeHex.altitudeControlRequired,
    altitudeControlMode: movementRangeHex.altitudeControlMode,
    altitudeControlAltitude: movementRangeHex.altitudeControlAltitude,
    hullDownExitRequired: movementRangeHex.hullDownExitRequired,
    hullDownExitCost: movementRangeHex.hullDownExitCost,
    blockedReason: movementRangeHex.blockedReason,
    movementInvalidReason: movementRangeHex.movementInvalidReason,
    movementInvalidDetails: movementRangeHex.movementInvalidDetails,
  };
}

function chooseRunOverlayPrimary(
  candidates: readonly IMovementRangeHex[],
): IMovementRangeHex {
  const activeRun = candidates.find(
    (candidate) => candidate.movementType === MovementType.Run,
  );
  const reachableWalk = candidates.find(
    (candidate) =>
      candidate.movementType === MovementType.Walk && candidate.reachable,
  );
  if (activeRun && !activeRun.reachable && reachableWalk) return reachableWalk;
  return activeRun ?? candidates[0];
}

function withRunOverlayMovementOptions(
  candidates: readonly IMovementRangeHex[],
): IMovementRangeHex {
  const primary = chooseRunOverlayPrimary(candidates);
  return withPrimaryMovementOptions(primary, candidates);
}

function withPrimaryMovementOptions(
  primary: IMovementRangeHex,
  candidates: readonly IMovementRangeHex[],
): IMovementRangeHex {
  if (candidates.length === 1) return primary;
  const ordered = [
    primary,
    ...candidates.filter((candidate) => candidate !== primary),
  ];
  return {
    ...primary,
    movementModeOptions: ordered.map(movementRangeModeOptionFor),
  };
}

export function mergeRunMovementRangeHexes(
  run: readonly IMovementRangeHex[],
  walk: readonly IMovementRangeHex[],
): readonly IMovementRangeHex[] {
  const grouped = new Map<string, IMovementRangeHex[]>();
  const addRangeHex = (movementRangeHex: IMovementRangeHex): void => {
    const key = movementRangeKey(movementRangeHex.hex);
    const entries = grouped.get(key);
    if (entries) {
      entries.push(movementRangeHex);
      return;
    }
    grouped.set(key, [movementRangeHex]);
  };

  for (const movementRangeHex of run) addRangeHex(movementRangeHex);
  for (const movementRangeHex of walk) addRangeHex(movementRangeHex);

  return Array.from(grouped.values()).map(withRunOverlayMovementOptions);
}

export function mergeJumpMovementRangeHexes(
  jump: readonly IMovementRangeHex[],
  run: readonly IMovementRangeHex[],
  walk: readonly IMovementRangeHex[],
): readonly IMovementRangeHex[] {
  const alternativeOptions = new Map<string, IMovementRangeHex[]>();
  const addAlternative = (movementRangeHex: IMovementRangeHex): void => {
    const key = movementRangeKey(movementRangeHex.hex);
    const entries = alternativeOptions.get(key);
    if (entries) {
      entries.push(movementRangeHex);
      return;
    }
    alternativeOptions.set(key, [movementRangeHex]);
  };

  for (const movementRangeHex of run) addAlternative(movementRangeHex);
  for (const movementRangeHex of walk) addAlternative(movementRangeHex);

  return jump.map((jumpRangeHex) => {
    const candidates = [
      jumpRangeHex,
      ...(alternativeOptions.get(movementRangeKey(jumpRangeHex.hex)) ?? []),
    ];
    return withPrimaryMovementOptions(jumpRangeHex, candidates);
  });
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
    conversionStepCount: projectedMovement.conversionStepCount,
    conversionMpCost: projectedMovement.conversionMpCost,
    altitudeControlStepCount: projectedMovement.altitudeControlStepCount,
    altitudeControlMpCost: projectedMovement.altitudeControlMpCost,
    movementMode: projectedMovement.movementMode,
    terrainCost: projectedMovement.terrainCost,
    turningCost: projectedMovement.turningCost,
    elevationDelta: projectedMovement.elevationDelta,
    elevationCost: projectedMovement.elevationCost,
  };
}
