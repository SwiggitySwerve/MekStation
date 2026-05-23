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

import { getHeatMovementPenalty } from '@/constants/heat';
import { MovementType } from '@/types/gameplay';
import { isInBounds, isOccupied } from '@/utils/gameplay/hexGrid';
import { hexDistance, hexesInRange } from '@/utils/gameplay/hexMath';
import { representedUnitImmobileReason } from '@/utils/gameplay/unitImmobility';

import {
  calculatePathMovementCost,
  getJumpElevationBlockedReason,
  getJumpElevationDelta,
  getMaxMP,
  getPavementRoadBonusMP,
  movementCostContextForCapability,
} from './calculations';
import { immobileMovementRangeHex } from './immobilityProjection';
import { movementModeForPath, movementModeForRange } from './mode';
import { calculateMovementHeat } from './modifiers';
import { findPath } from './pathfinding';
import {
  blockedRangeHex,
  compareRangeHexes,
  finalStepCost,
  insufficientMpRangeHex,
  occupiedRangeHex,
  outOfBoundsRangeHex,
} from './rangeHexProjection';
import {
  deriveStandUpProjection,
  withStandUpProjection,
} from './standUpProjection';
import { getStandingCost } from './validation';

/**
 * Derive every hex reachable from `unit.position` for the given
 * movement type. Returns a flat list suitable for direct use as the
 * `movementRange` prop on the `HexMapDisplay` component.
 *
 * Walk / Run: A* from origin to every candidate hex within the
 * `hexesInRange(origin, mp)` window; keep the hex if the cheapest
 * path cost is `<= mp`.
 *
 * Jump: flat hex-distance gate — any hex within heat-adjusted `jumpMP`
 * hex distance lands, regardless of terrain between origin and landing.
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

  const mp = getMaxMP(capability, mpType, getHeatMovementPenalty(unit.heat));
  if (mp <= 0) {
    return [];
  }

  const origin = unit.position;
  const projectionMovementMode = movementModeForRange(mpType, capability);
  const standingCost =
    unit.prone && mpType !== MovementType.Jump
      ? getStandingCost(capability)
      : 0;
  const pathBudget = Math.max(0, mp - standingCost);
  const candidateRange =
    mpType === MovementType.Jump
      ? mp
      : pathBudget + getPavementRoadBonusMP(projectionMovementMode);
  const candidates = hexesInRange(origin, candidateRange);
  const results: IMovementRangeHex[] = [];

  const projectCandidate = (hex: IHexCoordinate): IMovementRangeHex | null =>
    deriveMovementRangeHexForDestination(unit, mpType, grid, capability, hex);

  if (mpType === MovementType.Jump) {
    for (const hex of candidates) {
      const projection = projectCandidate(hex);
      if (projection) results.push(projection);
    }
    results.sort(compareRangeHexes);
    return results;
  }

  // Walk / Run: use the engine's A* to guarantee parity with the
  // simulator's own walkability rules. The destination projection
  // subtracts stand-up MP from the path budget when the unit starts prone.
  for (const hex of candidates) {
    const projection = projectCandidate(hex);
    if (projection) results.push(projection);
  }

  results.sort(compareRangeHexes);
  return results;
}

export function deriveMovementRangeHexForDestination(
  unit: IUnitGameState,
  mpType: MovementType,
  grid: IHexGrid,
  capability: IMovementCapability,
  hex: IHexCoordinate,
): IMovementRangeHex | null {
  if (mpType === MovementType.Stationary) {
    return null;
  }

  const origin = unit.position;
  if (hex.q === origin.q && hex.r === origin.r) {
    return null;
  }

  const mp = getMaxMP(capability, mpType, getHeatMovementPenalty(unit.heat));
  const dist = hexDistance(origin, hex);
  const heatGenerated = calculateMovementHeat(
    mpType,
    dist,
    capability.movementMode,
  );
  const movementMode =
    mpType === MovementType.Jump
      ? movementModeForRange(mpType, capability)
      : movementModeForPath(mpType, capability);
  const costContext = movementCostContextForCapability(mpType, capability);
  const standingCost = unit.prone ? getStandingCost(capability) : 0;
  const pathBudget = mp - standingCost;
  const maxPathCost =
    mpType === MovementType.Jump
      ? mp
      : pathBudget + getPavementRoadBonusMP(movementMode);
  const immobileReason = representedUnitImmobileReason(unit);
  if (immobileReason) {
    return immobileMovementRangeHex({
      grid,
      origin,
      hex,
      mpType,
      movementMode,
      reason: immobileReason,
    });
  }

  const standUpProjection = deriveStandUpProjection(unit, capability);

  if (!isInBounds(grid, hex)) {
    return withStandUpProjection(
      outOfBoundsRangeHex({
        hex,
        mpType,
        movementMode: movementModeForPath(mpType, capability),
        mpCost: dist,
        path: [origin, hex],
      }),
      standUpProjection,
    );
  }

  if (isOccupied(grid, hex)) {
    return withStandUpProjection(
      occupiedRangeHex({
        grid,
        origin,
        hex,
        mpType,
        movementMode,
        mpCost: dist,
        path: [origin, hex],
      }),
      standUpProjection,
    );
  }

  if (mpType === MovementType.Jump && capability.jumpMP <= 0) {
    const details = 'Unit cannot jump (no jump jets)';
    return {
      hex,
      mpCost: 0,
      terrainCost: 0,
      elevationDelta: getJumpElevationDelta(grid, origin, hex),
      elevationCost: 0,
      path: [origin, hex],
      heatGenerated: 0,
      movementMode,
      reachable: false,
      movementType: MovementType.Jump,
      blockedReason: details,
      movementInvalidReason: 'JumpUnavailable',
      movementInvalidDetails: details,
    };
  }

  if (unit.prone && mpType === MovementType.Jump) {
    const details = 'Unit is prone and must stand before jumping';
    return {
      hex,
      mpCost: standingCost,
      terrainCost: 0,
      elevationDelta: getJumpElevationDelta(grid, origin, hex),
      elevationCost: 0,
      path: [origin, hex],
      heatGenerated: 0,
      movementMode,
      reachable: false,
      movementType: MovementType.Jump,
      blockedReason: details,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails: details,
      ...standUpProjection,
    };
  }

  if (
    standUpProjection.standUpPsrImpossibleReason &&
    mpType !== MovementType.Jump
  ) {
    const details = standUpProjection.standUpPsrImpossibleReason;
    return {
      hex,
      mpCost: standingCost,
      terrainCost: undefined,
      elevationDelta: undefined,
      elevationCost: undefined,
      path: [origin, hex],
      heatGenerated: 0,
      movementMode,
      reachable: false,
      movementType: mpType,
      blockedReason: details,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails: details,
      ...standUpProjection,
    };
  }

  if (standingCost > mp) {
    const details = `Unit needs ${standingCost} MP to stand, but max range for ${mpType} is ${mp}`;
    return {
      hex,
      mpCost: standingCost,
      terrainCost: mpType === MovementType.Jump ? 0 : undefined,
      elevationDelta:
        mpType === MovementType.Jump
          ? getJumpElevationDelta(grid, origin, hex)
          : undefined,
      elevationCost: mpType === MovementType.Jump ? 0 : undefined,
      path: [origin, hex],
      heatGenerated: 0,
      movementMode,
      reachable: false,
      movementType: mpType,
      blockedReason: details,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: details,
      ...standUpProjection,
    };
  }

  if (mp <= 0) {
    const details = `Destination is ${dist} hexes away, but max range for ${mpType} is ${mp}`;
    return {
      hex,
      mpCost: dist,
      terrainCost: mpType === MovementType.Jump ? 0 : undefined,
      elevationDelta:
        mpType === MovementType.Jump
          ? getJumpElevationDelta(grid, origin, hex)
          : undefined,
      elevationCost: mpType === MovementType.Jump ? 0 : undefined,
      path: [origin, hex],
      heatGenerated: 0,
      movementMode,
      reachable: false,
      movementType: mpType,
      blockedReason: details,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: details,
    };
  }

  if (dist > maxPathCost) {
    if (standingCost > 0) {
      const details = `Destination is ${dist} hexes away, but max range for ${mpType} after standing is ${maxPathCost}`;
      return {
        hex,
        mpCost: dist + standingCost,
        terrainCost: undefined,
        elevationDelta: undefined,
        elevationCost: undefined,
        path: [origin, hex],
        heatGenerated: 0,
        movementMode,
        reachable: false,
        movementType: mpType,
        blockedReason: details,
        movementInvalidReason: 'InsufficientMP',
        movementInvalidDetails: details,
        ...standUpProjection,
      };
    }
    return insufficientMpRangeHex({
      grid,
      origin,
      hex,
      mpType,
      movementMode,
      mpCost: dist,
      maxCost: maxPathCost,
      costContext,
    });
  }

  if (mpType === MovementType.Jump) {
    const elevationDelta = getJumpElevationDelta(grid, origin, hex);
    const blockedReason = getJumpElevationBlockedReason(grid, origin, hex, mp);
    if (blockedReason) {
      return {
        hex,
        mpCost: dist,
        elevationDelta,
        elevationCost: 0,
        terrainCost: 0,
        path: [origin, hex],
        heatGenerated: 0,
        movementMode,
        reachable: false,
        movementType: MovementType.Jump,
        blockedReason,
        movementInvalidReason: 'TerrainBlocked',
        movementInvalidDetails: blockedReason,
      };
    }

    return {
      hex,
      mpCost: dist,
      elevationDelta,
      elevationCost: 0,
      terrainCost: 0,
      path: [origin, hex],
      heatGenerated,
      movementMode,
      reachable: true,
      movementType: MovementType.Jump,
    };
  }

  const path =
    findPath(grid, origin, hex, pathBudget, movementMode, costContext) ??
    (maxPathCost > pathBudget
      ? findPath(grid, origin, hex, maxPathCost, movementMode, costContext, {
          requirePavementRoadBonusSurface: true,
        })
      : null);
  if (!path || path.length === 0) {
    return withStandUpProjection(
      blockedRangeHex({
        grid,
        origin,
        hex,
        mpType,
        movementMode,
        maxCost: maxPathCost,
        blockedReason: `No legal ${movementMode} path within ${maxPathCost} MP`,
        costContext,
      }),
      standUpProjection,
    );
  }

  const pathCost = calculatePathMovementCost(
    grid,
    path,
    movementMode,
    costContext,
  );
  const cost = pathCost + standingCost;
  const maxTotalCost = maxPathCost + standingCost;
  if (cost > maxTotalCost) {
    const finalStep = finalStepCost(grid, path, movementMode, costContext);
    const details =
      standingCost > 0
        ? `Path costs ${cost} MP including stand-up, but only ${maxTotalCost} MP is available`
        : `Path costs ${cost} MP, but only ${maxPathCost} MP is available`;
    return {
      hex,
      mpCost: cost,
      terrainCost: finalStep?.terrainCost,
      elevationDelta: finalStep?.elevationDelta,
      elevationCost: finalStep?.elevationCost,
      path,
      heatGenerated: 0,
      movementMode,
      reachable: false,
      movementType: mpType,
      blockedReason: details,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: details,
      ...standUpProjection,
    };
  }
  const finalStep = finalStepCost(grid, path, movementMode, costContext);

  return {
    hex,
    mpCost: cost,
    terrainCost: finalStep?.terrainCost,
    elevationDelta: finalStep?.elevationDelta,
    elevationCost: finalStep?.elevationCost,
    path,
    heatGenerated,
    movementMode,
    reachable: true,
    movementType: mpType,
    ...standUpProjection,
  };
}
