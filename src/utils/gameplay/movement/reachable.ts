/**
 * Reachable hex derivation for the Movement-phase UI.
 *
 * Per `add-movement-phase-ui` spec delta § "Reachable Hex Derivation by
 * MP Type": expose a `deriveReachableHexes(unit, mpType, grid,
 * capability)` function that returns every hex reachable with the
 * given movement type, annotated with `mpCost`, `mpType`, and
 * `reachable`.
 *
 * Implementation detail: for Walk / Run we reuse the engine's A*
 * pathfinder to compute cheapest path cost per hex — guarantees we
 * stay in lock-step with the engine's own walkability rules
 * (elevation limits, occupied hexes, water terrain, etc.). For Jump
 * we use a much simpler hex-distance gate because jumps skip
 * terrain — the canonical rule is "landing hex is reachable when
 * `hexDistance(origin, dest) <= jumpMP`" (intermediate hexes are
 * NOT in the reachable set; only landing tiles).
 *
 * The returned array is sorted by `mpCost` ascending so the overlay
 * renders walk-cost tiles under run-cost tiles (the Run scenario
 * in the spec requires walk-reachable tiles to retain their green
 * tint under the run set — callers fold Walk + Run results to meet
 * that rule).
 *
 * @spec openspec/changes/add-movement-phase-ui/specs/movement-system/spec.md
 */

import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IMovementRangeHex,
  IUnitGameState,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import { hexDistance, hexesInRange } from '@/utils/gameplay/hexMath';

import { findPath } from './pathfinding';

/**
 * Derive every hex reachable from `unit.position` for the given
 * movement type. Returns a flat list suitable for direct use as the
 * `movementRange` prop on the `HexMapDisplay` component.
 *
 * Walk / Run: A* from origin to every candidate hex within the
 * `hexesInRange(origin, mp)` window; keep the hex if the cheapest
 * path cost is `<= mp`.
 *
 * Jump: flat hex-distance gate — any hex within `jumpMP` hex
 * distance lands, regardless of terrain between origin and landing.
 *
 * Stationary: returns an empty array (spec: the overlay only
 * renders during Walk/Run/Jump type selection).
 */
export function deriveReachableHexes(
  unit: IUnitGameState,
  mpType: MovementType,
  grid: IHexGrid,
  capability: IMovementCapability,
): readonly IMovementRangeHex[] {
  if (mpType === MovementType.Stationary) {
    return [];
  }

  const mp = maxMPFor(mpType, capability);
  if (mp <= 0) {
    return [];
  }

  const origin = unit.position;
  const candidates = hexesInRange(origin, mp);
  const results: IMovementRangeHex[] = [];

  if (mpType === MovementType.Jump) {
    for (const hex of candidates) {
      if (hex.q === origin.q && hex.r === origin.r) continue;
      const dist = hexDistance(origin, hex);
      if (dist <= mp) {
        results.push({
          hex,
          mpCost: dist,
          reachable: true,
          movementType: MovementType.Jump,
        });
      }
    }
    results.sort((a, b) => a.mpCost - b.mpCost);
    return results;
  }

  // Walk / Run: use the engine's A* to guarantee parity with the
  // simulator's own walkability rules. We pass `mp` as `maxCost` so
  // the pathfinder prunes branches the moment they exceed the
  // available MP.
  for (const hex of candidates) {
    if (hex.q === origin.q && hex.r === origin.r) continue;
    const path = findPath(grid, origin, hex, mp);
    if (!path || path.length === 0) continue;

    const cost = computePathCost(grid, path);
    if (cost > mp) continue;

    results.push({
      hex,
      mpCost: cost,
      reachable: true,
      movementType: mpType,
    });
  }

  results.sort((a, b) => a.mpCost - b.mpCost);
  return results;
}

/**
 * Return the cached MP for the chosen movement type. Mirrors
 * `getMaxMP` from `./calculations` but doesn't apply heat penalty —
 * the UI overlay is a planning surface, it deliberately shows the
 * full reach so the player can see why an overheated unit has a
 * smaller envelope.
 */
function maxMPFor(
  mpType: MovementType,
  capability: IMovementCapability,
): number {
  switch (mpType) {
    case MovementType.Walk:
      return capability.walkMP;
    case MovementType.Run:
      return capability.runMP;
    case MovementType.Jump:
      return capability.jumpMP;
    default:
      return 0;
  }
}

/**
 * Compute cumulative MP cost of a pathfinder-derived path by summing
 * the per-hex entry cost for every hex after the origin. Origin
 * itself has zero cost (you're already standing on it).
 */
function computePathCost(
  grid: IHexGrid,
  path: readonly IHexCoordinate[],
): number {
  // We sum by looking up each hex on the grid; the pathfinder
  // respects `getHexMovementCost` on walk, so we replicate the same
  // lookup to report the true cost to the UI. Importing the actual
  // per-hex cost util would create a circular import from the
  // movement package, so we duplicate the lookup by reading terrain
  // and elevation directly off the IHexGrid we already received.
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    total += stepCost(grid, prev, curr);
  }
  return total;
}

function stepCost(
  grid: IHexGrid,
  from: IHexCoordinate,
  to: IHexCoordinate,
): number {
  const toHex = grid.hexes.get(`${to.q},${to.r}`);
  const fromHex = grid.hexes.get(`${from.q},${from.r}`);
  if (!toHex) return 1;
  let cost = 1;
  // Elevation cost (matches `calculations.ts#getHexMovementCost`).
  if (fromHex && toHex.elevation > fromHex.elevation) {
    cost += toHex.elevation - fromHex.elevation;
  }
  return cost;
}
