/**
 * Tests for the AI terrain-cost pathfinder.
 *
 * Covers the `AI Terrain-Cost Pathfinder` requirement of
 * `add-ai-terrain-aware-movement` — scenarios "Pathfinder routes around
 * costly terrain", "Pathfinding is deterministic", "Unreachable destination
 * is flagged", and "findAllPaths agrees with per-destination findPath".
 *
 * @spec openspec/changes/add-ai-terrain-aware-movement/specs/simulation-system/spec.md
 *   Requirement: AI Terrain-Cost Pathfinder
 */

import type {
  IHex,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import { MovementType, TerrainType } from '@/types/gameplay';

import { findAllPaths, findPath } from '../ai/AITerrainPathfinder';

/**
 * Build a hexagonal grid of the given radius. `terrainAt` maps a `"q,r"` key
 * to a terrain tag; unlisted hexes default to `clear`. `occupied` marks hexes
 * as blocked.
 */
function buildGrid(
  radius: number,
  terrainAt: Record<string, string> = {},
  occupied: IHexCoordinate[] = [],
): IHexGrid {
  const hexes = new Map<string, IHex>();
  const occupiedSet = new Set(occupied.map((c) => `${c.q},${c.r}`));
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue;
      const key = `${q},${r}`;
      hexes.set(key, {
        coord: { q, r },
        occupantId: occupiedSet.has(key) ? 'blocker' : null,
        terrain: terrainAt[key] ?? 'clear',
        elevation: 0,
      });
    }
  }
  return { config: { radius }, hexes };
}

function capability(walk: number, jump = 0): IMovementCapability {
  return { walkMP: walk, runMP: Math.ceil(walk * 1.5), jumpMP: jump };
}

describe('AITerrainPathfinder.findPath', () => {
  it('routes around costly terrain to a cheaper equal-length path', () => {
    // Origin (0,0) to destination (2,0). The straight-line route runs
    // through (1,0); make that hex heavy woods. An equal-hex-length
    // detour exists through clear ground.
    const grid = buildGrid(4, { '1,0': TerrainType.HeavyWoods });
    const path = findPath({
      grid,
      origin: { q: 0, r: 0 },
      destination: { q: 2, r: 0 },
      movementType: MovementType.Walk,
      capability: capability(6),
    });

    expect(path.reachable).toBe(true);
    // The detour avoids the heavy-woods hex entirely.
    const passesThroughWoods = path.hexes.some((h) => h.q === 1 && h.r === 0);
    expect(passesThroughWoods).toBe(false);

    // A straight route through heavy woods would cost 1 (enter 1,0 at +3)
    // + 1 (enter 2,0) = 4. The chosen clear detour costs 1 per hex.
    const straightCost = 3 + 1; // heavy woods entry (3) + clear entry (1)
    expect(path.totalMpCost).toBeLessThan(straightCost);
  });

  it('is deterministic — identical request yields identical result', () => {
    const grid = buildGrid(4, { '1,0': TerrainType.LightWoods });
    const request = {
      grid,
      origin: { q: 0, r: 0 },
      destination: { q: 3, r: 0 },
      movementType: MovementType.Walk,
      capability: capability(6),
    };
    const a = findPath(request);
    const b = findPath(request);
    expect(a.hexes).toEqual(b.hexes);
    expect(a.totalMpCost).toBe(b.totalMpCost);
    expect(a.reachable).toBe(b.reachable);
  });

  it('flags an unreachable destination when its cheapest path exceeds the budget', () => {
    const grid = buildGrid(8);
    // Destination 6 hexes away on a 2-MP budget — unreachable.
    const path = findPath({
      grid,
      origin: { q: 0, r: 0 },
      destination: { q: 6, r: 0 },
      movementType: MovementType.Walk,
      capability: capability(2),
    });
    expect(path.reachable).toBe(false);
    expect(path.destination).toEqual({ q: 6, r: 0 });
  });

  it('returns a zero-cost reachable path for the origin itself', () => {
    const grid = buildGrid(4);
    const path = findPath({
      grid,
      origin: { q: 0, r: 0 },
      destination: { q: 0, r: 0 },
      movementType: MovementType.Walk,
      capability: capability(4),
    });
    expect(path.reachable).toBe(true);
    expect(path.totalMpCost).toBe(0);
    expect(path.hexes).toEqual([]);
  });

  it('path hex sequence is origin-exclusive and destination-inclusive', () => {
    const grid = buildGrid(4);
    const path = findPath({
      grid,
      origin: { q: 0, r: 0 },
      destination: { q: 2, r: 0 },
      movementType: MovementType.Walk,
      capability: capability(4),
    });
    expect(path.hexes).not.toContainEqual({ q: 0, r: 0 });
    expect(path.hexes[path.hexes.length - 1]).toEqual({ q: 2, r: 0 });
  });

  it('costs every hop as 1 for jump movement, ignoring terrain', () => {
    const grid = buildGrid(4, {
      '1,0': TerrainType.HeavyWoods,
      '2,0': TerrainType.HeavyWoods,
    });
    const path = findPath({
      grid,
      origin: { q: 0, r: 0 },
      destination: { q: 2, r: 0 },
      movementType: MovementType.Jump,
      capability: capability(0, 4),
    });
    expect(path.reachable).toBe(true);
    // Two hops, terrain ignored: cost 2.
    expect(path.totalMpCost).toBe(2);
  });
});

describe('AITerrainPathfinder.findAllPaths', () => {
  it('agrees with per-destination findPath for every reachable hex', () => {
    const grid = buildGrid(5, {
      '1,0': TerrainType.HeavyWoods,
      '0,1': TerrainType.LightWoods,
      '-1,1': TerrainType.Swamp,
    });
    const origin = { q: 0, r: 0 };
    const cap = capability(5);
    const all = findAllPaths(grid, origin, MovementType.Walk, cap);

    for (const [key, path] of Array.from(all.entries())) {
      const single = findPath({
        grid,
        origin,
        destination: path.destination,
        movementType: MovementType.Walk,
        capability: cap,
      });
      expect(single.totalMpCost).toBe(path.totalMpCost);
      expect(single.hexes).toEqual(path.hexes);
      // Every key in the map is the canonical "q,r" of its destination.
      expect(key).toBe(`${path.destination.q},${path.destination.r}`);
    }
  });

  it('includes the origin with a zero-cost empty path', () => {
    const grid = buildGrid(4);
    const all = findAllPaths(
      grid,
      { q: 0, r: 0 },
      MovementType.Walk,
      capability(4),
    );
    const origin = all.get('0,0');
    expect(origin).toBeDefined();
    expect(origin?.totalMpCost).toBe(0);
    expect(origin?.hexes).toEqual([]);
  });

  it('only contains destinations within the MP budget', () => {
    const grid = buildGrid(8);
    const budget = 2;
    const all = findAllPaths(
      grid,
      { q: 0, r: 0 },
      MovementType.Walk,
      capability(budget),
    );
    for (const path of Array.from(all.values())) {
      expect(path.totalMpCost).toBeLessThanOrEqual(budget);
      expect(path.reachable).toBe(true);
    }
  });

  it('is deterministic across repeated calls', () => {
    const grid = buildGrid(5, { '1,0': TerrainType.HeavyWoods });
    const origin = { q: 0, r: 0 };
    const cap = capability(5);
    const a = findAllPaths(grid, origin, MovementType.Walk, cap);
    const b = findAllPaths(grid, origin, MovementType.Walk, cap);
    expect(a.size).toBe(b.size);
    for (const [key, path] of Array.from(a.entries())) {
      expect(b.get(key)?.totalMpCost).toBe(path.totalMpCost);
      expect(b.get(key)?.hexes).toEqual(path.hexes);
    }
  });

  it('returns only the origin when the MP budget is zero', () => {
    const grid = buildGrid(4);
    const all = findAllPaths(
      grid,
      { q: 0, r: 0 },
      MovementType.Stationary,
      capability(4),
    );
    expect(all.size).toBe(1);
    expect(all.has('0,0')).toBe(true);
  });
});
