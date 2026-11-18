/**
 * Pathfinding Algorithms
 */

import { IHexCoordinate, IHexGrid } from '@/types/gameplay';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';

import type { UnitMovementType } from './types';

import { isInBounds, isOccupied } from '../hexGrid';
import { hexDistance, hexEquals, hexNeighbors, coordToKey } from '../hexMath';
import {
  getHexMovementCost,
  type IMovementCostContext,
  movementCostContextForStep,
} from './calculations';
import { isPavementRoadBonusSurfaceFeature } from './terrainRules';

export interface IFindPathOptions {
  readonly requirePavementRoadBonusSurface?: boolean;
}

export interface IFindPathRequest {
  readonly grid: IHexGrid;
  readonly start: IHexCoordinate;
  readonly end: IHexCoordinate;
  readonly maxCost?: number;
  readonly movementType?: UnitMovementType;
  readonly context?: IMovementCostContext;
  readonly options?: IFindPathOptions;
}

type FindPathArgs =
  | readonly [request: IFindPathRequest]
  | readonly [
      grid: IHexGrid,
      start: IHexCoordinate,
      end: IHexCoordinate,
      maxCost?: number,
      movementType?: UnitMovementType,
      context?: IMovementCostContext,
      options?: IFindPathOptions,
    ];

/**
 * Step pricing for searches from one start hex over one unchanged grid.
 * `findPath` prices each step afresh; a projection that runs many searches
 * from the same start shares one memoised space (`createPathSearchSpace`).
 */
export interface IPathSearchSpace {
  readonly grid: IHexGrid;
  readonly start: IHexCoordinate;
  readonly movementType: UnitMovementType;
  /** `getHexMovementCost` for entering `to`, the `direction`-th neighbour of `from`. */
  stepCost(
    from: IHexCoordinate,
    fromKey: string,
    direction: number,
    to: IHexCoordinate,
    isFirstStep: boolean,
  ): number;
}

/**
 * A search space whose step prices are computed once per (from hex,
 * direction, first step) and reused by every later search. The grid, start,
 * movement type and context must not change while the space is in use.
 */
export function createPathSearchSpace(
  grid: IHexGrid,
  start: IHexCoordinate,
  movementType: UnitMovementType,
  context: IMovementCostContext,
): IPathSearchSpace {
  const prices = new Map<string, Float64Array>();
  return {
    grid,
    start,
    movementType,
    stepCost(from, fromKey, direction, to, isFirstStep) {
      const priceKey = isFirstStep ? `${fromKey}!` : fromKey;
      let row = prices.get(priceKey);
      if (!row) {
        row = new Float64Array(6).fill(NaN);
        prices.set(priceKey, row);
      }
      let cost = row[direction];
      if (Number.isNaN(cost)) {
        cost = getHexMovementCost(
          grid,
          to,
          movementType,
          from,
          movementCostContextForStep(context, isFirstStep),
        );
        // A NaN price is stored as Infinity: both fail the finiteness guard.
        row[direction] = Number.isNaN(cost) ? Infinity : cost;
      }
      return cost;
    },
  };
}

function uncachedPathSearchSpace(
  grid: IHexGrid,
  start: IHexCoordinate,
  movementType: UnitMovementType,
  context: IMovementCostContext,
): IPathSearchSpace {
  return {
    grid,
    start,
    movementType,
    stepCost: (from, _fromKey, _direction, to, isFirstStep) =>
      getHexMovementCost(
        grid,
        to,
        movementType,
        from,
        movementCostContextForStep(context, isFirstStep),
      ),
  };
}

/**
 * Find the shortest path between two hexes using A*.
 * Returns the path or null if no path exists.
 */
export function findPath(
  ...args: FindPathArgs
): readonly IHexCoordinate[] | null {
  const {
    grid,
    start,
    end,
    maxCost = Infinity,
    movementType = 'walk',
    context = {},
    options = {},
  } = normalizeFindPathRequest(args);

  return findPathInSearchSpace(
    uncachedPathSearchSpace(grid, start, movementType, context),
    end,
    maxCost,
    options,
  );
}

interface IOpenNode {
  readonly key: string;
  readonly coord: IHexCoordinate;
  readonly g: number;
  readonly f: number;
  readonly parent: string | null;
  /** Order in which the key first entered the open set; kept on decrease-key. */
  readonly seq: number;
}

/**
 * A* over a search space. The open set is a binary heap ordered by
 * (f, seq): `seq` is the order in which a hex first entered the open set and
 * survives a decrease-key. That is the tie-break of the previous linear scan,
 * which took the first lowest-f entry in Map insertion order (re-setting an
 * existing Map key keeps its position). Stale heap entries are skipped.
 */
export function findPathInSearchSpace(
  space: IPathSearchSpace,
  end: IHexCoordinate,
  maxCost: number = Infinity,
  options: IFindPathOptions = {},
): readonly IHexCoordinate[] | null {
  const { grid, start, movementType } = space;
  if (hexEquals(start, end)) {
    return [start];
  }

  const openSet = new Map<string, IOpenNode>();
  const closedSet = new Map<string, IOpenNode>();
  const heap = new OpenNodeHeap();
  let nextSeq = 0;

  const startKey = coordToKey(start);
  const startNode: IOpenNode = {
    key: startKey,
    coord: start,
    g: 0,
    f: hexDistance(start, end),
    parent: null,
    seq: nextSeq++,
  };
  openSet.set(startKey, startNode);
  heap.push(startNode);

  while (heap.size > 0) {
    const current = heap.pop();
    if (openSet.get(current.key) !== current) continue;
    // The linear scan only selected an entry with f < Infinity.
    if (!(current.f < Infinity)) break;

    const currentKey = current.key;
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

    for (let direction = 0; direction < neighbors.length; direction++) {
      const neighbor = neighbors[direction];
      const neighborKey = coordToKey(neighbor);

      if (closedSet.has(neighborKey)) continue;

      if (!isInBounds(grid, neighbor)) continue;

      if (!hexEquals(neighbor, end) && isOccupied(grid, neighbor)) continue;

      if (
        options.requirePavementRoadBonusSurface &&
        !hexHasPavementRoadBonusSurface(grid, neighbor, movementType)
      ) {
        continue;
      }

      const moveCost = space.stepCost(
        current.coord,
        currentKey,
        direction,
        neighbor,
        current.parent === null,
      );
      if (!Number.isFinite(moveCost)) continue;
      const tentativeG = current.g + moveCost;

      if (tentativeG > maxCost) continue;

      const existingNode = openSet.get(neighborKey);

      if (!existingNode || tentativeG < existingNode.g) {
        const node: IOpenNode = {
          key: neighborKey,
          coord: neighbor,
          g: tentativeG,
          f: tentativeG + hexDistance(neighbor, end),
          parent: currentKey,
          seq: existingNode ? existingNode.seq : nextSeq++,
        };
        openSet.set(neighborKey, node);
        heap.push(node);
      }
    }
  }

  return null;
}

/**
 * Cheapest cost from the space's start to every hex it can enter for at most
 * `maxCost`, under the same entry rules as `findPathInSearchSpace`: in
 * bounds, the road-surface option, finite step prices. An occupied hex may
 * only end a path, so it gets a cost but is never expanded (the start is).
 * Step prices are at least 1, so this is plain Dijkstra.
 */
export function floodSearchSpace(
  space: IPathSearchSpace,
  maxCost: number,
  options: IFindPathOptions = {},
): ReadonlyMap<string, number> {
  const { grid, start, movementType } = space;
  const best = new Map<string, IOpenNode>();
  const settled = new Map<string, number>();
  const heap = new OpenNodeHeap();
  const startKey = coordToKey(start);
  let nextSeq = 0;
  const startNode: IOpenNode = {
    key: startKey,
    coord: start,
    g: 0,
    f: 0,
    parent: null,
    seq: nextSeq++,
  };
  best.set(startKey, startNode);
  heap.push(startNode);

  while (heap.size > 0) {
    const current = heap.pop();
    if (best.get(current.key) !== current || settled.has(current.key)) {
      continue;
    }
    settled.set(current.key, current.g);
    if (current.key !== startKey && isOccupied(grid, current.coord)) continue;

    const neighbors = hexNeighbors(current.coord);
    for (let direction = 0; direction < neighbors.length; direction++) {
      const neighbor = neighbors[direction];
      const neighborKey = coordToKey(neighbor);
      if (settled.has(neighborKey)) continue;
      if (!isInBounds(grid, neighbor)) continue;
      if (
        options.requirePavementRoadBonusSurface &&
        !hexHasPavementRoadBonusSurface(grid, neighbor, movementType)
      ) {
        continue;
      }
      const moveCost = space.stepCost(
        current.coord,
        current.key,
        direction,
        neighbor,
        current.key === startKey,
      );
      if (!Number.isFinite(moveCost)) continue;
      const tentativeG = current.g + moveCost;
      if (tentativeG > maxCost) continue;
      const existing = best.get(neighborKey);
      if (!existing || tentativeG < existing.g) {
        const node: IOpenNode = {
          key: neighborKey,
          coord: neighbor,
          g: tentativeG,
          f: tentativeG,
          parent: current.key,
          seq: existing ? existing.seq : nextSeq++,
        };
        best.set(neighborKey, node);
        heap.push(node);
      }
    }
  }

  return settled;
}

/** Binary min-heap of open nodes ordered by (f, seq). */
class OpenNodeHeap {
  private readonly items: IOpenNode[] = [];

  get size(): number {
    return this.items.length;
  }

  push(node: IOpenNode): void {
    const items = this.items;
    let index = items.length;
    items.push(node);
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parent = items[parentIndex];
      if (!precedes(node, parent)) break;
      items[index] = parent;
      index = parentIndex;
    }
    items[index] = node;
  }

  pop(): IOpenNode {
    const items = this.items;
    const top = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      let index = 0;
      const length = items.length;
      for (;;) {
        const left = 2 * index + 1;
        if (left >= length) break;
        const right = left + 1;
        const child =
          right < length && precedes(items[right], items[left]) ? right : left;
        if (!precedes(items[child], last)) break;
        items[index] = items[child];
        index = child;
      }
      items[index] = last;
    }
    return top;
  }
}

function precedes(a: IOpenNode, b: IOpenNode): boolean {
  return a.f < b.f || (a.f === b.f && a.seq < b.seq);
}

function normalizeFindPathRequest(args: FindPathArgs): IFindPathRequest {
  if (args.length === 1) return args[0];
  const [grid, start, end, maxCost, movementType, context, options] = args;
  return { grid, start, end, maxCost, movementType, context, options };
}

export function hexHasPavementRoadBonusSurface(
  grid: IHexGrid,
  coord: IHexCoordinate,
  movementType: UnitMovementType,
): boolean {
  const hex = grid.hexes.get(coordToKey(coord));
  if (!hex) return false;
  return terrainFeaturesFromString(hex.terrain).some((feature) =>
    isPavementRoadBonusSurfaceFeature(feature, movementType),
  );
}
