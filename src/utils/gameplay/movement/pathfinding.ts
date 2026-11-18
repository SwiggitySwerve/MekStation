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
        // A NaN price becomes Infinity: both fail the finiteness guard, and
        // every call, first or memoised, returns the same stored value.
        if (Number.isNaN(cost)) cost = Infinity;
        row[direction] = cost;
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

interface IFloodNode extends IOpenNode {
  /** The hex may only end a path (`classifyNeighbourEntry`), so it is not expanded. */
  readonly endOnly: boolean;
}

/**
 * How a search may enter a neighbour hex:
 * - `blocked`: never;
 * - `endOnly`: only as the end of a path (an occupied hex);
 * - `open`: as the end or a hex passed through.
 *
 * The one owner of the neighbour-entry rule (AGENTS.md invariant 1). Both
 * `findPathInSearchSpace` and `floodSearchSpace` use it, with `enteredCost`
 * for the price and the bound, so a rule change moves the A* and the overlay's
 * flood together. A new `IFindPathOptions` key is handled here.
 */
export type NeighbourEntry = 'blocked' | 'endOnly' | 'open';

export function classifyNeighbourEntry(
  grid: IHexGrid,
  neighbor: IHexCoordinate,
  movementType: UnitMovementType,
  options: IFindPathOptions,
): NeighbourEntry {
  if (!isInBounds(grid, neighbor)) return 'blocked';
  if (
    options.requirePavementRoadBonusSurface &&
    !hexHasPavementRoadBonusSurface(grid, neighbor, movementType)
  ) {
    return 'blocked';
  }
  return isOccupied(grid, neighbor) ? 'endOnly' : 'open';
}

/**
 * Cost of the cheapest route so far to `neighbor` through `from`, or NaN when
 * the step has no finite price or the total exceeds `maxCost`. The first step
 * is the step out of the start, the only node without a parent.
 */
function enteredCost(
  space: IPathSearchSpace,
  from: IOpenNode,
  direction: number,
  neighbor: IHexCoordinate,
  maxCost: number,
): number {
  const moveCost = space.stepCost(
    from.coord,
    from.key,
    direction,
    neighbor,
    from.parent === null,
  );
  if (!Number.isFinite(moveCost)) return NaN;
  const tentativeG = from.g + moveCost;
  return tentativeG > maxCost ? NaN : tentativeG;
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
  const heap = new OpenNodeHeap<IOpenNode>();
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

      const entry = classifyNeighbourEntry(
        grid,
        neighbor,
        movementType,
        options,
      );
      if (entry === 'blocked') continue;
      if (entry === 'endOnly' && !hexEquals(neighbor, end)) continue;

      const tentativeG = enteredCost(
        space,
        current,
        direction,
        neighbor,
        maxCost,
      );
      if (Number.isNaN(tentativeG)) continue;

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
 * `maxCost`, under the entry rule `findPathInSearchSpace` uses
 * (`classifyNeighbourEntry` and `enteredCost`). An `endOnly` hex can end any
 * search, so it gets a cost but is never expanded (the start always is).
 * Step prices are at least 1, so this is plain Dijkstra.
 */
export function floodSearchSpace(
  space: IPathSearchSpace,
  maxCost: number,
  options: IFindPathOptions = {},
): ReadonlyMap<string, number> {
  const { grid, start, movementType } = space;
  const best = new Map<string, IFloodNode>();
  const settled = new Map<string, number>();
  const heap = new OpenNodeHeap<IFloodNode>();
  const startKey = coordToKey(start);
  let nextSeq = 0;
  const startNode: IFloodNode = {
    key: startKey,
    coord: start,
    g: 0,
    f: 0,
    parent: null,
    seq: nextSeq++,
    endOnly: false,
  };
  best.set(startKey, startNode);
  heap.push(startNode);

  while (heap.size > 0) {
    const current = heap.pop();
    if (best.get(current.key) !== current || settled.has(current.key)) {
      continue;
    }
    settled.set(current.key, current.g);
    if (current.endOnly) continue;

    const neighbors = hexNeighbors(current.coord);
    for (let direction = 0; direction < neighbors.length; direction++) {
      const neighbor = neighbors[direction];
      const neighborKey = coordToKey(neighbor);
      if (settled.has(neighborKey)) continue;
      const entry = classifyNeighbourEntry(
        grid,
        neighbor,
        movementType,
        options,
      );
      if (entry === 'blocked') continue;
      const tentativeG = enteredCost(
        space,
        current,
        direction,
        neighbor,
        maxCost,
      );
      if (Number.isNaN(tentativeG)) continue;
      const existing = best.get(neighborKey);
      if (!existing || tentativeG < existing.g) {
        const node: IFloodNode = {
          key: neighborKey,
          coord: neighbor,
          g: tentativeG,
          f: tentativeG,
          parent: current.key,
          seq: existing ? existing.seq : nextSeq++,
          endOnly: entry === 'endOnly',
        };
        best.set(neighborKey, node);
        heap.push(node);
      }
    }
  }

  return settled;
}

/** Binary min-heap of open nodes ordered by (f, seq). */
class OpenNodeHeap<T extends IOpenNode> {
  private readonly items: T[] = [];

  get size(): number {
    return this.items.length;
  }

  push(node: T): void {
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

  pop(): T {
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
