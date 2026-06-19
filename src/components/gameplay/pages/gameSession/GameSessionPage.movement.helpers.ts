import type { MapMovementKind } from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type { InteractiveSession } from '@/engine/GameEngine';

import {
  GamePhase,
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

import {
  buildMovementModeSeedPlan,
  buildMovementPlan,
  getPlannedMovementForSelectedUnit,
  mergeJumpMovementRangeHexes,
  mergeRunMovementRangeHexes,
  movementPathFromRangeHex,
  movementTypeFromLegendSelection,
  type IEffectiveMovementMps,
} from './GameSessionPage.movementPlanning';

type MovementCapability = ReturnType<
  InteractiveSession['getMovementCapability']
>;

interface BaseMovementRangeParams {
  readonly interactiveSession: InteractiveSession | null;
  readonly selectedUnitState:
    | IGameSession['currentState']['units'][string]
    | null;
  readonly capability: MovementCapability | null;
  readonly movementGrid: IHexGrid | null;
  readonly canProjectMovement: boolean;
  readonly movementType: MovementType;
  readonly environmentalConditions: IGameSession['config']['environmentalConditions'];
  readonly optionalRules: readonly string[];
}

export function getRawMovementCapability(
  interactiveSession: InteractiveSession | null,
  selectedUnitId: string | null,
): MovementCapability | null {
  if (!interactiveSession || !selectedUnitId) return null;
  return interactiveSession.getMovementCapability(selectedUnitId);
}

export function getSelectedUnitState(
  session: IGameSession | null,
  selectedUnitId: string | null,
): IGameSession['currentState']['units'][string] | null {
  if (!session || !selectedUnitId) return null;
  return session.currentState.units[selectedUnitId] ?? null;
}

export function getSelectedUnitInfo(
  session: IGameSession | null,
  selectedUnitId: string | null,
): IGameSession['units'][number] | null {
  if (!session || !selectedUnitId) return null;
  return session.units.find((unit) => unit.id === selectedUnitId) ?? null;
}

export function resolveMovementCapability(
  rawMovementCapability: MovementCapability | null,
  selectedUnitState: IGameSession['currentState']['units'][string] | null,
): MovementCapability | null {
  if (!rawMovementCapability || !selectedUnitState) {
    return rawMovementCapability;
  }
  return (
    resolveRuntimeMovementCapability(
      selectedUnitState,
      rawMovementCapability,
    ) ?? rawMovementCapability
  );
}

export function buildMovementGrid(
  interactiveSession: InteractiveSession | null,
  session: IGameSession | null,
): IHexGrid | null {
  if (!interactiveSession) return null;
  const baseGrid = interactiveSession.getGrid();
  return session
    ? gridWithUnitOccupants(baseGrid, session.currentState.units)
    : baseGrid;
}

function deriveMovementRangeForType(
  params: Omit<BaseMovementRangeParams, 'movementType'> & {
    readonly movementType: MovementType;
  },
): readonly IMovementRangeHex[] {
  const {
    selectedUnitState,
    movementType,
    movementGrid,
    capability,
    environmentalConditions,
    optionalRules,
  } = params;
  if (!selectedUnitState || !movementGrid || !capability) return [];
  return deriveReachableHexes(
    selectedUnitState,
    movementType,
    movementGrid,
    capability,
    'normal',
    { environmentalConditions, optionalRules },
  );
}

export function deriveBaseMovementRangeHexes({
  interactiveSession,
  selectedUnitState,
  capability,
  movementGrid,
  canProjectMovement,
  movementType,
  environmentalConditions,
  optionalRules,
}: BaseMovementRangeParams): readonly IMovementRangeHex[] {
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

  const rangeParams = {
    interactiveSession,
    selectedUnitState,
    capability,
    movementGrid,
    canProjectMovement,
    environmentalConditions,
    optionalRules,
  };
  const primary = deriveMovementRangeForType({ ...rangeParams, movementType });

  if (movementType === MovementType.Jump) {
    return mergeJumpMovementRangeHexes(
      primary,
      deriveMovementRangeForType({
        ...rangeParams,
        movementType: MovementType.Run,
      }),
      deriveMovementRangeForType({
        ...rangeParams,
        movementType: MovementType.Walk,
      }),
    );
  }

  if (movementType !== MovementType.Run) return primary;

  return mergeRunMovementRangeHexes(
    primary,
    deriveMovementRangeForType({
      ...rangeParams,
      movementType: MovementType.Walk,
    }),
  );
}

export function buildMovementRangeLookup(
  movementRangeHexes: readonly IMovementRangeHex[],
): Map<string, IMovementRangeHex> {
  const lookup = new Map<string, IMovementRangeHex>();
  for (const entry of movementRangeHexes) {
    lookup.set(`${entry.hex.q},${entry.hex.r}`, entry);
  }
  return lookup;
}

export function buildReachableKeySet(
  movementRangeHexes: readonly IMovementRangeHex[],
): Set<string> {
  const keys = new Set<string>();
  for (const rangeHex of movementRangeHexes) {
    if (rangeHex.reachable) keys.add(`${rangeHex.hex.q},${rangeHex.hex.r}`);
  }
  return keys;
}

export function deriveHoveredMovementProjection(params: {
  readonly hoveredHex: IHexCoordinate | null;
  readonly interactiveSession: InteractiveSession | null;
  readonly selectedUnitState:
    | IGameSession['currentState']['units'][string]
    | null;
  readonly capability: MovementCapability | null;
  readonly movementGrid: IHexGrid | null;
  readonly canProjectMovement: boolean;
  readonly movementType: MovementType;
  readonly baseMovementRangeLookup: Map<string, IMovementRangeHex>;
  readonly optionalRules: readonly string[];
}): IMovementRangeHex | null {
  const {
    hoveredHex,
    interactiveSession,
    selectedUnitState,
    capability,
    movementGrid,
    canProjectMovement,
    movementType,
    baseMovementRangeLookup,
    optionalRules,
  } = params;
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
}

export function getHoveredMovementRangeHex(
  hoveredHex: IHexCoordinate | null,
  movementRangeLookup: Map<string, IMovementRangeHex>,
): IMovementRangeHex | undefined {
  if (!hoveredHex) return undefined;
  return movementRangeLookup.get(`${hoveredHex.q},${hoveredHex.r}`);
}

export function getHoveredPath(
  hoveredMovementRangeHex: IMovementRangeHex | undefined,
  selectedUnitState: IGameSession['currentState']['units'][string] | null,
  phase: GamePhase | undefined,
): readonly IHexCoordinate[] {
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
}

export function getHoverMpCost(
  hoveredMovementRangeHex: IMovementRangeHex | undefined,
): number | undefined {
  if (!hoveredMovementRangeHex?.reachable) return undefined;
  return hoveredMovementRangeHex.mpCost;
}

export function getHoverUnreachable(params: {
  readonly canProjectMovement: boolean;
  readonly hoveredHex: IHexCoordinate | null;
  readonly movementRangeHexes: readonly IMovementRangeHex[];
  readonly reachableKeySet: Set<string>;
}): boolean {
  const {
    canProjectMovement,
    hoveredHex,
    movementRangeHexes,
    reachableKeySet,
  } = params;
  return (
    canProjectMovement &&
    hoveredHex !== null &&
    movementRangeHexes.length > 0 &&
    !reachableKeySet.has(`${hoveredHex.q},${hoveredHex.r}`)
  );
}

export function selectMovementPlan(params: {
  readonly hex: IHexCoordinate;
  readonly canProjectMovement: boolean;
  readonly selectedUnitState:
    | IGameSession['currentState']['units'][string]
    | null;
  readonly movementRangeLookup: Map<string, IMovementRangeHex>;
  readonly movementType: MovementType;
}): ReturnType<typeof buildMovementPlan> | null {
  const {
    hex,
    canProjectMovement,
    selectedUnitState,
    movementRangeLookup,
    movementType,
  } = params;
  if (!canProjectMovement || !selectedUnitState) return null;
  return buildMovementPlan({
    hex,
    selectedUnitState,
    movementRangeLookup,
    movementType,
  });
}

export function buildSelectedMovementModePlan(params: {
  readonly mode: MapMovementKind;
  readonly canProjectMovement: boolean;
  readonly selectedUnitState:
    | IGameSession['currentState']['units'][string]
    | null;
  readonly effectiveMovementMps: IEffectiveMovementMps | null;
}): ReturnType<typeof buildMovementModeSeedPlan> | null {
  const { mode, canProjectMovement, selectedUnitState, effectiveMovementMps } =
    params;
  if (!canProjectMovement || !selectedUnitState) return null;
  const selectedMovementType = movementTypeFromLegendSelection(mode);
  if (
    selectedMovementType === MovementType.Jump &&
    !effectiveMovementMps?.jumpMP
  ) {
    return null;
  }
  return buildMovementModeSeedPlan({
    selectedUnitState,
    movementType: selectedMovementType,
  });
}

export function shouldClearPlannedMovement(params: {
  readonly plannedMovement: unknown;
  readonly plannedMovementForSelected: ReturnType<
    typeof getPlannedMovementForSelectedUnit
  >;
  readonly canProjectMovement: boolean;
  readonly phase: GamePhase | undefined;
}): boolean {
  const {
    plannedMovement,
    plannedMovementForSelected,
    canProjectMovement,
    phase,
  } = params;
  if (!plannedMovement) return false;
  if (!plannedMovementForSelected) return true;
  if (!canProjectMovement) return true;
  return phase !== GamePhase.Movement;
}
