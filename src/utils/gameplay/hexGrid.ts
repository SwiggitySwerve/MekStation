/**
 * Hex Grid Operations
 * Create and manage hex grids for gameplay.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import {
  IHexCoordinate,
  IHex,
  IHexGrid,
  IHexGridConfig,
} from '@/types/gameplay';

import { coordToKey, hexDistance, hexesInRange } from './hexMath';

// =============================================================================
// Grid Creation
// =============================================================================

/**
 * Create a default hex for a coordinate.
 */
export function createHex(coord: IHexCoordinate): IHex {
  return {
    coord,
    occupantId: null,
    terrain: 'clear',
    elevation: 0,
  };
}

/**
 * Create a hexagonal hex grid with the specified radius.
 * Radius 0 = just center hex (1 hex)
 * Radius 1 = center + 6 neighbors (7 hexes)
 * Radius n = 1 + 3*n*(n+1) hexes
 */
export function createHexGrid(config: IHexGridConfig): IHexGrid {
  const hexes = new Map<string, IHex>();
  const center: IHexCoordinate = { q: 0, r: 0 };

  const allCoords = hexesInRange(center, config.radius);

  for (const coord of allCoords) {
    const key = coordToKey(coord);
    hexes.set(key, createHex(coord));
  }

  return {
    config,
    hexes,
  };
}

/**
 * Create a rectangular hex grid.
 * @param width Number of columns
 * @param height Number of rows
 */
export function createRectangularGrid(width: number, height: number): IHexGrid {
  const hexes = new Map<string, IHex>();

  for (let r = 0; r < height; r++) {
    const rOffset = Math.floor(r / 2);
    for (let q = -rOffset; q < width - rOffset; q++) {
      const coord: IHexCoordinate = { q, r };
      const key = coordToKey(coord);
      hexes.set(key, createHex(coord));
    }
  }

  // Calculate equivalent radius for config
  const radius = Math.max(width, height);

  return {
    config: { radius },
    hexes,
  };
}

// =============================================================================
// Grid Queries
// =============================================================================

/**
 * Get a hex by coordinate.
 * Returns undefined if the coordinate is outside the grid.
 */
export function getHex(
  grid: IHexGrid,
  coord: IHexCoordinate,
): IHex | undefined {
  return grid.hexes.get(coordToKey(coord));
}

/**
 * Check if a coordinate is within the grid bounds.
 */
export function isInBounds(grid: IHexGrid, coord: IHexCoordinate): boolean {
  return grid.hexes.has(coordToKey(coord));
}

/**
 * Check if a hex is occupied.
 */
export function isOccupied(grid: IHexGrid, coord: IHexCoordinate): boolean {
  const hex = getHex(grid, coord);
  return hex?.occupantId !== null && hex?.occupantId !== undefined;
}

/**
 * Get the occupant of a hex.
 */
export function getOccupant(
  grid: IHexGrid,
  coord: IHexCoordinate,
): string | null {
  const hex = getHex(grid, coord);
  return hex?.occupantId ?? null;
}

/**
 * Get all hexes within range of a coordinate that are in bounds.
 */
export function getHexesInRange(
  grid: IHexGrid,
  center: IHexCoordinate,
  range: number,
): readonly IHex[] {
  const coords = hexesInRange(center, range);
  return coords
    .map((coord) => getHex(grid, coord))
    .filter((hex): hex is IHex => hex !== undefined);
}

/**
 * Get neighboring hexes that are in bounds.
 */
export function getNeighbors(
  grid: IHexGrid,
  coord: IHexCoordinate,
): readonly IHex[] {
  return getHexesInRange(grid, coord, 1).filter(
    (hex) => hexDistance(hex.coord, coord) === 1,
  );
}

/**
 * Get all empty (unoccupied) hexes in the grid.
 */
export function getEmptyHexes(grid: IHexGrid): readonly IHex[] {
  return Array.from(grid.hexes.values()).filter(
    (hex) => hex.occupantId === null,
  );
}

/**
 * Get all occupied hexes in the grid.
 */
export function getOccupiedHexes(grid: IHexGrid): readonly IHex[] {
  return Array.from(grid.hexes.values()).filter(
    (hex) => hex.occupantId !== null,
  );
}

/**
 * Find the hex where a unit is located.
 */
export function findUnitHex(grid: IHexGrid, unitId: string): IHex | undefined {
  return Array.from(grid.hexes.values()).find(
    (hex) => hex.occupantId === unitId,
  );
}

// =============================================================================
// Grid Mutations
// =============================================================================

/**
 * Place a unit on a hex (immutable - returns new grid).
 */
export function placeUnit(
  grid: IHexGrid,
  coord: IHexCoordinate,
  unitId: string,
): IHexGrid {
  const key = coordToKey(coord);
  const existingHex = grid.hexes.get(key);

  if (!existingHex) {
    throw new Error(`Hex at ${key} does not exist in grid`);
  }

  if (existingHex.occupantId !== null) {
    throw new Error(
      `Hex at ${key} is already occupied by ${existingHex.occupantId}`,
    );
  }

  const newHexes = new Map(grid.hexes);
  newHexes.set(key, { ...existingHex, occupantId: unitId });

  return {
    ...grid,
    hexes: newHexes,
  };
}

/**
 * Remove a unit from a hex (immutable - returns new grid).
 */
export function removeUnit(grid: IHexGrid, coord: IHexCoordinate): IHexGrid {
  const key = coordToKey(coord);
  const existingHex = grid.hexes.get(key);

  if (!existingHex) {
    throw new Error(`Hex at ${key} does not exist in grid`);
  }

  const newHexes = new Map(grid.hexes);
  newHexes.set(key, { ...existingHex, occupantId: null });

  return {
    ...grid,
    hexes: newHexes,
  };
}

/**
 * Move a unit from one hex to another (immutable - returns new grid).
 */
export function moveUnit(
  grid: IHexGrid,
  from: IHexCoordinate,
  to: IHexCoordinate,
): IHexGrid {
  const fromKey = coordToKey(from);
  const toKey = coordToKey(to);

  const fromHex = grid.hexes.get(fromKey);
  const toHex = grid.hexes.get(toKey);

  if (!fromHex) {
    throw new Error(`Source hex at ${fromKey} does not exist`);
  }

  if (!toHex) {
    throw new Error(`Destination hex at ${toKey} does not exist`);
  }

  if (fromHex.occupantId === null) {
    throw new Error(`Source hex at ${fromKey} is empty`);
  }

  if (toHex.occupantId !== null) {
    throw new Error(`Destination hex at ${toKey} is already occupied`);
  }

  const unitId = fromHex.occupantId;
  const newHexes = new Map(grid.hexes);
  newHexes.set(fromKey, { ...fromHex, occupantId: null });
  newHexes.set(toKey, { ...toHex, occupantId: unitId });

  return {
    ...grid,
    hexes: newHexes,
  };
}

/**
 * Update a hex's terrain (immutable - returns new grid).
 */
export function setTerrain(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrain: string,
): IHexGrid {
  const key = coordToKey(coord);
  const existingHex = grid.hexes.get(key);

  if (!existingHex) {
    throw new Error(`Hex at ${key} does not exist in grid`);
  }

  const newHexes = new Map(grid.hexes);
  newHexes.set(key, { ...existingHex, terrain });

  return {
    ...grid,
    hexes: newHexes,
  };
}

// =============================================================================
// Grid Statistics
// =============================================================================

/**
 * Get the total number of hexes in the grid.
 */
export function getHexCount(grid: IHexGrid): number {
  return grid.hexes.size;
}

/**
 * Get the number of occupied hexes.
 */
export function getOccupiedCount(grid: IHexGrid): number {
  return Array.from(grid.hexes.values()).filter(
    (hex) => hex.occupantId !== null,
  ).length;
}

/**
 * Get the number of empty hexes.
 */
export function getEmptyCount(grid: IHexGrid): number {
  return Array.from(grid.hexes.values()).filter(
    (hex) => hex.occupantId === null,
  ).length;
}
