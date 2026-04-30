/**
 * Per-player unit visibility helpers for fog-of-war filtering.
 *
 * @spec openspec/changes/add-fog-of-war-event-filtering/specs/spatial-combat-system/spec.md
 */

import type { IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import {
  GameSide,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay/GameSessionInterfaces';

import { hexDistance } from './hexMath';
import { calculateLOS } from './lineOfSight';

// IUnitGameState has no canonical sensor-range field today, so use the
// fog-of-war spec baseline until a state field is introduced.
const DEFAULT_SENSOR_RANGE = 10;

const EMPTY_CLEAR_GRID: IHexGrid = {
  config: { radius: 0 },
  hexes: new Map(),
};

interface IVisibilitySideAssignment {
  readonly playerId: string;
  readonly side: string;
}

interface IVisibilityStateAugments {
  readonly grid?: IHexGrid;
  readonly sideOwners?: Partial<Record<GameSide, string>> | null;
  readonly sideAssignments?: readonly IVisibilitySideAssignment[] | null;
}

type VisibilityState = IGameState & IVisibilityStateAugments;

type UnitWithSensorRange = IUnitGameState & {
  readonly sensorRange?: number;
};

/**
 * Return true when the player owns the target unit or any owned unit has
 * line of sight to it within sensor range.
 */
export function canPlayerSeeUnit(
  playerId: string,
  unitId: string,
  state: IGameState,
): boolean {
  const visibilityState = state as VisibilityState;
  const target = visibilityState.units[unitId];

  if (!target) {
    return false;
  }

  if (isUnitOwnedByPlayer(playerId, target, visibilityState)) {
    return true;
  }

  const grid = visibilityState.grid ?? EMPTY_CLEAR_GRID;

  return getUnitsOwnedByPlayer(playerId, visibilityState).some((observer) => {
    if (
      hexDistance(observer.position, target.position) > getSensorRange(observer)
    ) {
      return false;
    }

    return calculateLOS(observer.position, target.position, grid).hasLOS;
  });
}

/**
 * Return all unit ids currently visible to a player, sorted for deterministic
 * cache keys and replay/filter comparisons.
 */
export function visibleUnitsForPlayer(
  playerId: string,
  state: IGameState,
): string[] {
  const visibleIds = new Set<string>();

  for (const unitId of Object.keys(state.units)) {
    if (canPlayerSeeUnit(playerId, unitId, state)) {
      visibleIds.add(unitId);
    }
  }

  return Array.from(visibleIds).sort((a, b) => a.localeCompare(b));
}

function getUnitsOwnedByPlayer(
  playerId: string,
  state: VisibilityState,
): readonly IUnitGameState[] {
  return Object.values(state.units).filter((unit) =>
    isUnitOwnedByPlayer(playerId, unit, state),
  );
}

function isUnitOwnedByPlayer(
  playerId: string,
  unit: IUnitGameState,
  state: VisibilityState,
): boolean {
  return getOwnerIdForSide(unit.side, state) === playerId;
}

function getOwnerIdForSide(side: GameSide, state: VisibilityState): string {
  const ownerFromSideMap = state.sideOwners?.[side];
  if (ownerFromSideMap !== undefined) {
    return ownerFromSideMap;
  }

  const assignment = state.sideAssignments?.find((candidate) => {
    return candidate.side === side;
  });

  return assignment?.playerId ?? side;
}

function getSensorRange(unit: IUnitGameState): number {
  const { sensorRange } = unit as UnitWithSensorRange;

  if (
    typeof sensorRange === 'number' &&
    Number.isFinite(sensorRange) &&
    sensorRange >= 0
  ) {
    return sensorRange;
  }

  return DEFAULT_SENSOR_RANGE;
}
