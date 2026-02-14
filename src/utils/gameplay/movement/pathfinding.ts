/**
 * Pathfinding Algorithms
 */

import { IHexCoordinate, IHexGrid } from '@/types/gameplay';

import { isInBounds, isOccupied } from '../hexGrid';
import { hexDistance, hexEquals, hexNeighbors, coordToKey } from '../hexMath';

import { getHexMovementCost } from './calculations';

/**
 * Find the shortest path between two hexes using A*.
 * Returns the path or null if no path exists.
 */
export function findPath(
  grid: IHexGrid,
  start: IHexCoordinate,
  end: IHexCoordinate,
  maxCost: number = Infinity,
): readonly IHexCoordinate[] | null {
  if (hexEquals(start, end)) {
    return [start];
  }

  interface Node {
    coord: IHexCoordinate;
    g: number;
    f: number;
    parent: string | null;
  }

  const openSet = new Map<string, Node>();
  const closedSet = new Map<string, Node>();

  const startKey = coordToKey(start);
  openSet.set(startKey, {
    coord: start,
    g: 0,
    f: hexDistance(start, end),
    parent: null,
  });

  while (openSet.size > 0) {
    let currentKey: string | null = null;
    let lowestF = Infinity;

    for (const entry of Array.from(openSet.entries())) {
      const [key, node] = entry;
      if (node.f < lowestF) {
        lowestF = node.f;
        currentKey = key;
      }
    }

    if (currentKey === null) break;

    const current = openSet.get(currentKey)!;
    openSet.delete(currentKey);
    closedSet.set(currentKey, current);

    if (hexEquals(current.coord, end)) {
      const path: IHexCoordinate[] = [];
      let nodeKey: string | null = currentKey;

      while (nodeKey !== null) {
        const node = closedSet.get(nodeKey);
        if (!node) break;
        path.unshift(node.coord);
        nodeKey = node.parent;
      }

      return path;
    }

    const neighbors = hexNeighbors(current.coord);

    for (const neighbor of neighbors) {
      const neighborKey = coordToKey(neighbor);

      if (closedSet.has(neighborKey)) continue;

      if (!isInBounds(grid, neighbor)) continue;

      if (!hexEquals(neighbor, end) && isOccupied(grid, neighbor)) continue;

      const moveCost = getHexMovementCost(grid, neighbor);
      const tentativeG = current.g + moveCost;

      if (tentativeG > maxCost) continue;

      const existingNode = openSet.get(neighborKey);

      if (!existingNode || tentativeG < existingNode.g) {
        openSet.set(neighborKey, {
          coord: neighbor,
          g: tentativeG,
          f: tentativeG + hexDistance(neighbor, end),
          parent: currentKey,
        });
      }
    }
  }

  return null;
}
