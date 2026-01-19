/**
 * Unit Position Management
 * Track and manage unit positions on the hex grid.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import {
  IHexCoordinate,
  IUnitPosition,
  Facing,
} from '@/types/gameplay';

// =============================================================================
// Position Creation
// =============================================================================

/**
 * Create a new unit position.
 */
export function createUnitPosition(
  unitId: string,
  coord: IHexCoordinate,
  facing: Facing = Facing.North,
  prone: boolean = false
): IUnitPosition {
  return {
    unitId,
    coord,
    facing,
    prone,
  };
}

// =============================================================================
// Position Updates (Immutable)
// =============================================================================

/**
 * Update the coordinate of a unit position.
 */
export function setPositionCoord(
  position: IUnitPosition,
  coord: IHexCoordinate
): IUnitPosition {
  return { ...position, coord };
}

/**
 * Update the facing of a unit position.
 */
export function setPositionFacing(
  position: IUnitPosition,
  facing: Facing
): IUnitPosition {
  return { ...position, facing };
}

/**
 * Set a unit to prone status.
 */
export function setPositionProne(
  position: IUnitPosition,
  prone: boolean
): IUnitPosition {
  return { ...position, prone };
}

/**
 * Move a unit to a new coordinate with a new facing.
 */
export function movePosition(
  position: IUnitPosition,
  coord: IHexCoordinate,
  facing: Facing
): IUnitPosition {
  return {
    ...position,
    coord,
    facing,
    prone: false, // Standing up if was prone
  };
}

// =============================================================================
// Facing Operations
// =============================================================================

/**
 * Rotate facing clockwise by N steps (60 degrees each).
 */
export function rotateFacingClockwise(facing: Facing, steps: number = 1): Facing {
  return ((facing + steps) % 6) as Facing;
}

/**
 * Rotate facing counter-clockwise by N steps (60 degrees each).
 */
export function rotateFacingCounterClockwise(facing: Facing, steps: number = 1): Facing {
  return (((facing - steps) % 6) + 6) % 6 as Facing;
}

/**
 * Get the opposite facing (180 degrees rotation).
 */
export function getOppositeFacing(facing: Facing): Facing {
  return ((facing + 3) % 6) as Facing;
}

/**
 * Calculate the minimum number of facing changes to go from one facing to another.
 * Returns a value from 0 to 3.
 */
export function getFacingDifference(from: Facing, to: Facing): number {
  const diff = Math.abs(from - to);
  return Math.min(diff, 6 - diff);
}

/**
 * Get the direction to rotate (1 = clockwise, -1 = counter-clockwise, 0 = same).
 */
export function getFacingRotationDirection(from: Facing, to: Facing): number {
  if (from === to) return 0;
  
  const clockwiseDiff = (to - from + 6) % 6;
  const counterClockwiseDiff = (from - to + 6) % 6;
  
  if (clockwiseDiff <= counterClockwiseDiff) {
    return 1; // Clockwise is shorter or equal
  }
  return -1; // Counter-clockwise is shorter
}

// =============================================================================
// Position Queries
// =============================================================================

/**
 * Check if a unit is prone.
 */
export function isUnitProne(position: IUnitPosition): boolean {
  return position.prone;
}

/**
 * Check if two positions are at the same coordinate.
 */
export function isSameHex(a: IUnitPosition, b: IUnitPosition): boolean {
  return a.coord.q === b.coord.q && a.coord.r === b.coord.r;
}

/**
 * Get facing name for display.
 */
export function getFacingName(facing: Facing): string {
  const names: Record<Facing, string> = {
    [Facing.North]: 'North',
    [Facing.Northeast]: 'Northeast',
    [Facing.Southeast]: 'Southeast',
    [Facing.South]: 'South',
    [Facing.Southwest]: 'Southwest',
    [Facing.Northwest]: 'Northwest',
  };
  return names[facing];
}

/**
 * Get facing abbreviation for compact display.
 */
export function getFacingAbbreviation(facing: Facing): string {
  const abbrs: Record<Facing, string> = {
    [Facing.North]: 'N',
    [Facing.Northeast]: 'NE',
    [Facing.Southeast]: 'SE',
    [Facing.South]: 'S',
    [Facing.Southwest]: 'SW',
    [Facing.Northwest]: 'NW',
  };
  return abbrs[facing];
}

// =============================================================================
// Position Map Management
// =============================================================================

/**
 * A map of unit positions by unit ID.
 */
export type UnitPositionMap = Map<string, IUnitPosition>;

/**
 * Create an empty position map.
 */
export function createPositionMap(): UnitPositionMap {
  return new Map();
}

/**
 * Get a unit's position from the map.
 */
export function getUnitPosition(
  map: UnitPositionMap,
  unitId: string
): IUnitPosition | undefined {
  return map.get(unitId);
}

/**
 * Set a unit's position in the map (immutable - returns new map).
 */
export function setUnitPosition(
  map: UnitPositionMap,
  position: IUnitPosition
): UnitPositionMap {
  const newMap = new Map(map);
  newMap.set(position.unitId, position);
  return newMap;
}

/**
 * Remove a unit from the position map (immutable - returns new map).
 */
export function removeUnitPosition(
  map: UnitPositionMap,
  unitId: string
): UnitPositionMap {
  const newMap = new Map(map);
  newMap.delete(unitId);
  return newMap;
}

/**
 * Find a unit at a specific coordinate.
 */
export function findUnitAtCoord(
  map: UnitPositionMap,
  coord: IHexCoordinate
): IUnitPosition | undefined {
  for (const position of Array.from(map.values())) {
    if (position.coord.q === coord.q && position.coord.r === coord.r) {
      return position;
    }
  }
  return undefined;
}

/**
 * Get all unit positions as an array.
 */
export function getAllPositions(map: UnitPositionMap): readonly IUnitPosition[] {
  return Array.from(map.values());
}

/**
 * Get all unit IDs that have positions.
 */
export function getAllUnitIds(map: UnitPositionMap): readonly string[] {
  return Array.from(map.keys());
}
