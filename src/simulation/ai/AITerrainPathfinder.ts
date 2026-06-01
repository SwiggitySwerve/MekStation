/**
 * AI terrain-cost pathfinder.
 *
 * A deterministic cheapest-path search over per-hex terrain movement cost.
 * Where `getValidDestinations` yields a flat set of reachable hexes with no
 * notion of *which path* was cheapest, this module computes the actual
 * cheapest legal path — total movement points spent plus the ordered hex
 * sequence — so the AI move scorer can prefer a destination reached cheaply
 * over an equivalent destination reached through a wasteful route.
 *
 * The API surface (`IAIPath`, `IAIPathfindRequest`, `findPath`,
 * `findAllPaths`) is FROZEN by `add-ai-terrain-aware-movement` design D2.
 * Later Wave 2 changes (A2 resource planning, A3a coordination, A3b
 * objectives, A4 advanced systems) author against this signature — it must
 * not change.
 *
 * Implementation is uniform-cost (Dijkstra) search over hex neighbors with
 * edge weight = the terrain movement cost of the hex being entered. Ties
 * between equal-cost frontier nodes are broken by canonical hex-neighbor
 * order (North, Northeast, Southeast, South, Southwest, Northwest), so the
 * result is fully deterministic — identical request always yields an
 * identical `IAIPath` — without consuming `SeededRandom`.
 *
 * @spec openspec/changes/add-ai-terrain-aware-movement/specs/simulation-system/spec.md
 *   Requirement: AI Terrain-Cost Pathfinder
 */

import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import { getHex, isInBounds, isOccupied } from '@/utils/gameplay/hexGrid';
import {
  coordToKey,
  hexDistance,
  hexNeighbors,
} from '@/utils/gameplay/hexMath';
import { getSprintMPForCapability } from '@/utils/gameplay/movement';
import { getHexMovementCostFromTerrainTag } from '@/utils/gameplay/terrainMovementCost';

/** A single legal path from origin to a destination hex. */
export interface IAIPath {
  readonly destination: IHexCoordinate;
  /** Ordered hexes from origin (exclusive) to destination (inclusive). */
  readonly hexes: readonly IHexCoordinate[];
  /** Total movement points consumed along the path. */
  readonly totalMpCost: number;
  /** True when every hex on the path was within the MP budget. */
  readonly reachable: boolean;
}

/** A request to find the cheapest path to a single destination hex. */
export interface IAIPathfindRequest {
  readonly grid: IHexGrid;
  readonly origin: IHexCoordinate;
  readonly destination: IHexCoordinate;
  readonly movementType: MovementType;
  readonly capability: IMovementCapability;
}

/**
 * Movement-point budget for a movement type. Mirrors the raw MP lookup the
 * movement utilities use (`getRawMaxMP`) — the pathfinder reasons about reach
 * before heat penalties, matching how `getValidDestinations` is consumed by
 * the AI move generator. Stationary has no budget.
 */
function mpBudget(
  movementType: MovementType,
  capability: IMovementCapability,
): number {
  switch (movementType) {
    case MovementType.Walk:
      return capability.walkMP;
    case MovementType.Run:
    case MovementType.Evade:
      return capability.runMP;
    case MovementType.Sprint:
      return getSprintMPForCapability(capability);
    case MovementType.Jump:
      return capability.jumpMP;
    case MovementType.Stationary:
    default:
      return 0;
  }
}

/**
 * Per-hex entry cost for the pathfinder edge weight.
 *
 * Walk / Run pay the terrain movement cost of the hex being entered (open
 * ground `1`, light woods `2`, heavy woods `3`, ...). Jump skips terrain
 * entirely — every hop is a flat `1` — matching the canonical rule that
 * jump movement ignores intervening terrain cost.
 */
function hexEntryCost(
  grid: IHexGrid,
  coord: IHexCoordinate,
  movementType: MovementType,
): number {
  if (movementType === MovementType.Jump) {
    return 1;
  }
  return getHexMovementCostFromTerrainTag(getHex(grid, coord));
}

/** Internal frontier node for the uniform-cost search. */
interface DijkstraNode {
  readonly coord: IHexCoordinate;
  /** Cumulative cost from origin to this hex. */
  readonly cost: number;
  /** Canonical key of the predecessor hex, or `null` at the origin. */
  readonly parent: string | null;
}

/**
 * Run a single uniform-cost (Dijkstra) sweep from `origin` over the grid.
 *
 * Returns the settled `cost` and `parent` for every hex reachable within the
 * search horizon. The search is bounded by `maxCost` — nodes whose cumulative
 * cost would exceed the budget are still recorded (so a best-effort partial
 * path to an out-of-budget destination can be reconstructed) but are not
 * expanded further, keeping the sweep finite even on large grids.
 *
 * Determinism: the frontier is drained lowest-cost-first; ties between
 * equal-cost frontier entries are broken by insertion order, and neighbors
 * are always inserted in canonical `hexNeighbors` order (N, NE, SE, S, SW,
 * NW). No `SeededRandom` is consumed.
 */
function dijkstraSweep(
  grid: IHexGrid,
  origin: IHexCoordinate,
  movementType: MovementType,
  maxCost: number,
): Map<string, DijkstraNode> {
  const settled = new Map<string, DijkstraNode>();
  const frontier = new Map<string, DijkstraNode>();

  const originKey = coordToKey(origin);
  frontier.set(originKey, { coord: origin, cost: 0, parent: null });

  while (frontier.size > 0) {
    // Select the lowest-cost frontier node. On a cost tie the FIRST such
    // node in iteration order wins — Map preserves insertion order, and
    // neighbors are always inserted in canonical hex-neighbor order, so
    // the tie-break is deterministic without a seeded roll.
    let bestKey: string | null = null;
    let bestNode: DijkstraNode | null = null;
    for (const [key, node] of Array.from(frontier.entries())) {
      if (bestNode === null || node.cost < bestNode.cost) {
        bestKey = key;
        bestNode = node;
      }
    }
    if (bestKey === null || bestNode === null) break;

    frontier.delete(bestKey);
    settled.set(bestKey, bestNode);

    // A node already past the budget is recorded (for best-effort partial
    // paths) but never expanded — beyond the budget every onward hex is
    // also out of budget, so expansion would only grow the sweep.
    if (bestNode.cost >= maxCost) {
      continue;
    }

    for (const neighbor of hexNeighbors(bestNode.coord)) {
      const neighborKey = coordToKey(neighbor);
      if (settled.has(neighborKey)) continue;
      if (!isInBounds(grid, neighbor)) continue;
      // Occupied hexes cannot be entered or passed through. The origin is
      // never re-evaluated (it is settled first), so the unit's own hex
      // does not block its outbound search.
      if (isOccupied(grid, neighbor)) continue;

      const stepCost = hexEntryCost(grid, neighbor, movementType);
      const tentativeCost = bestNode.cost + stepCost;

      const existing = frontier.get(neighborKey);
      if (!existing || tentativeCost < existing.cost) {
        frontier.set(neighborKey, {
          coord: neighbor,
          cost: tentativeCost,
          parent: bestKey,
        });
      }
    }
  }

  return settled;
}

/**
 * Reconstruct the ordered hex sequence from origin to `destination` by
 * walking the `parent` chain in the settled node map. The returned list
 * EXCLUDES the origin and INCLUDES the destination, per the `IAIPath.hexes`
 * contract. Returns an empty array when the destination was never settled.
 */
function reconstructPath(
  settled: Map<string, DijkstraNode>,
  destinationKey: string,
): IHexCoordinate[] {
  const reversed: IHexCoordinate[] = [];
  let key: string | null = destinationKey;
  while (key !== null) {
    const node = settled.get(key);
    if (!node) break;
    reversed.push(node.coord);
    key = node.parent;
  }
  // `reversed` runs destination -> ... -> origin. Drop the origin (last
  // element) and flip so the result is origin-exclusive, destination-last.
  reversed.pop();
  reversed.reverse();
  return reversed;
}

/**
 * Build the `IAIPath` for a single destination from a completed sweep.
 *
 * When the destination was never settled (off-grid, fully walled off, or
 * unreachable within the search horizon) the path falls back to the straight
 * hex-distance estimate with `reachable: false` and an empty hex list — a
 * safe, deterministic best-effort answer the move scorer can still consume.
 */
function pathFromSweep(
  settled: Map<string, DijkstraNode>,
  origin: IHexCoordinate,
  destination: IHexCoordinate,
  budget: number,
): IAIPath {
  const destinationKey = coordToKey(destination);
  const node = settled.get(destinationKey);

  if (!node) {
    return {
      destination,
      hexes: [],
      totalMpCost: hexDistance(origin, destination),
      reachable: false,
    };
  }

  const hexes = reconstructPath(settled, destinationKey);
  return {
    destination,
    hexes,
    totalMpCost: node.cost,
    reachable: node.cost <= budget,
  };
}

/**
 * Deterministic cheapest-path search over per-hex terrain movement cost.
 *
 * Pure: identical request => identical `IAIPath`. Returns `reachable: false`
 * with a best-effort partial path when the destination exceeds the MP
 * budget. The origin-to-itself request returns a zero-cost reachable path
 * with an empty hex list.
 *
 * FROZEN API — `add-ai-terrain-aware-movement` design D2.
 */
export function findPath(request: IAIPathfindRequest): IAIPath {
  const { grid, origin, destination, movementType, capability } = request;
  const budget = mpBudget(movementType, capability);

  if (origin.q === destination.q && origin.r === destination.r) {
    return { destination, hexes: [], totalMpCost: 0, reachable: true };
  }

  // The sweep horizon is the larger of the budget and the straight-line
  // distance to the destination: the budget covers reachable paths, and
  // extending to the hex distance guarantees a best-effort partial path is
  // found even when the destination sits past the budget.
  const horizon = Math.max(budget, hexDistance(origin, destination));
  const settled = dijkstraSweep(grid, origin, movementType, horizon);
  return pathFromSweep(settled, origin, destination, budget);
}

/**
 * Cheapest path to every reachable destination in a single Dijkstra pass.
 *
 * Keyed by the canonical `"q,r"` hex string. Used by `MoveAI.selectMove` so
 * scoring N candidate destinations costs one sweep, not N separate searches.
 * Only destinations whose cheapest path cost is within the MP budget appear
 * in the map (each carries `reachable: true`); the origin itself is included
 * with a zero-cost empty path.
 *
 * The path for any given destination is identical to what `findPath` returns
 * for that same destination — both reconstruct from the same uniform-cost
 * search.
 *
 * FROZEN API — `add-ai-terrain-aware-movement` design D2.
 */
export function findAllPaths(
  grid: IHexGrid,
  origin: IHexCoordinate,
  movementType: MovementType,
  capability: IMovementCapability,
): ReadonlyMap<string, IAIPath> {
  const budget = mpBudget(movementType, capability);
  const result = new Map<string, IAIPath>();

  // Origin: zero-cost, always reachable, empty hex list.
  result.set(coordToKey(origin), {
    destination: origin,
    hexes: [],
    totalMpCost: 0,
    reachable: true,
  });

  if (budget <= 0) {
    return result;
  }

  const settled = dijkstraSweep(grid, origin, movementType, budget);
  for (const [key, node] of Array.from(settled.entries())) {
    if (node.cost > budget) continue;
    if (node.cost === 0) continue; // origin already inserted above
    result.set(key, {
      destination: node.coord,
      hexes: reconstructPath(settled, key),
      totalMpCost: node.cost,
      reachable: true,
    });
  }

  return result;
}
