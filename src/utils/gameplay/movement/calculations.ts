/**
 * Movement Point Calculations
 */

import {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  MovementType,
} from '@/types/gameplay';
import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  getHeatMovementPenalty,
  isTSMActive,
} from '@/types/validation/HeatManagement';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';
import { getPrimaryTerrainFeatureFromTerrainTag } from '@/utils/gameplay/terrainMovementCost';

import type { UnitMovementType } from './types';

import { getHex } from '../hexGrid';
import { hexDistance, hexLine } from '../hexMath';
import {
  directionalCliffBlockedReason,
  wigeSheerCliffAscentCost,
} from './cliffTerrain';
import {
  movementCostContextForStep,
  type IMovementCostContext,
} from './costContext';
import {
  blocksWaterMovement,
  bridgeClearanceBlockedReason,
  formatMovementModeForReason,
  isPavementSurfaceFeature,
  isPavementRoadBonusEligibleMode,
  maxElevationChangeForMovementType,
  paysElevationCost,
  requiresOpenWaterTerrain,
  requiresRailTerrain,
  requiresWaterTerrain,
  waterMovementCostModifier,
} from './terrainRules';
import { wigeBuildingClimbModeCost } from './wigeClimbModeCost';

export const PAVEMENT_ROAD_BONUS_MP = 1;

export {
  movementCostContextForCapability,
  movementCostContextForStep,
} from './costContext';
export type { IMovementCostContext } from './costContext';

export interface IMovementStepCostBreakdown {
  readonly mpCost: number;
  readonly baseCost: number;
  readonly terrainCost: number;
  readonly elevationCost: number;
  readonly elevationDelta: number;
  readonly blockedReason?: string;
}

function elevationCostMultiplier(
  movementType: UnitMovementType,
  context: IMovementCostContext,
): number {
  if (
    context.movementTerrainProfile === 'infantry' ||
    movementType === 'tracked' ||
    movementType === 'wheeled' ||
    movementType === 'hover'
  ) {
    return 2;
  }
  return 1;
}

/**
 * Calculate running MP from walking MP.
 * Run MP = ceil(walk MP * 1.5)
 */
export function calculateRunMP(walkMP: number): number {
  return Math.ceil(walkMP * 1.5);
}

/**
 * Calculate TacOps Sprint MP from walking MP.
 * Base Sprint MP = walk MP * 2.
 */
export function calculateSprintMP(walkMP: number): number {
  return walkMP * 2;
}

export function getSprintMPForCapability(
  capability: IMovementCapability,
): number {
  return capability.sprintMP ?? calculateSprintMP(capability.walkMP);
}

/**
 * Create movement capability from base values.
 */
export function createMovementCapability(
  walkMP: number,
  jumpMP: number = 0,
): IMovementCapability {
  return {
    walkMP,
    runMP: calculateRunMP(walkMP),
    jumpMP,
  };
}

function normalizePartialWingJumpBonus(
  partialWingJumpBonus: number | undefined,
): number {
  if (
    typeof partialWingJumpBonus !== 'number' ||
    !Number.isFinite(partialWingJumpBonus)
  ) {
    return 0;
  }
  return Math.max(0, Math.floor(partialWingJumpBonus));
}

/**
 * Apply an explicit Partial Wing jump bonus to a movement capability. MegaMek
 * only applies the wing bonus when the Mek already has positive jump MP.
 */
export function applyPartialWingJumpBonus(
  capability: IMovementCapability,
  partialWingJumpBonus: number | undefined,
): IMovementCapability {
  const bonus = normalizePartialWingJumpBonus(partialWingJumpBonus);
  if (bonus <= 0 || capability.jumpMP <= 0) {
    return capability;
  }

  return {
    ...capability,
    jumpMP: capability.jumpMP + bonus,
    partialWingJumpBonus: bonus,
  };
}

/**
 * Apply destroyed jump jets before optional jump enhancers. A jump-jet critical
 * removes one point of base jump MP; once all base jump capability is gone,
 * effects like Partial Wing cannot create a jump move on their own.
 */
export function applyJumpJetCriticalDamage(
  capability: IMovementCapability,
  jumpJetsDestroyed: number | undefined,
): IMovementCapability {
  if (
    typeof jumpJetsDestroyed !== 'number' ||
    !Number.isFinite(jumpJetsDestroyed) ||
    jumpJetsDestroyed <= 0
  ) {
    return capability;
  }

  return {
    ...capability,
    jumpMP: Math.max(0, capability.jumpMP - Math.floor(jumpJetsDestroyed)),
  };
}

/**
 * Apply explicit active MASC/Supercharger run and sprint MP. MegaMek derives
 * boosted MP from the already-effective walk MP: one active booster doubles
 * run MP and raises sprint MP to ceil(walk MP * 2.5); both active boosters
 * produce ceil(walk MP * 2.5) run MP and walk MP * 3 sprint MP.
 */
export function applyActiveMPBoosters(
  capability: IMovementCapability,
  activeMASC: boolean | undefined,
  activeSupercharger: boolean | undefined,
): IMovementCapability {
  const hasMASC = activeMASC === true;
  const hasSupercharger = activeSupercharger === true;
  if (!hasMASC && !hasSupercharger) {
    return capability;
  }

  const runMP =
    hasMASC && hasSupercharger
      ? Math.ceil(capability.walkMP * 2.5)
      : capability.walkMP * 2;
  const sprintMP =
    hasMASC && hasSupercharger
      ? capability.walkMP * 3
      : Math.ceil(capability.walkMP * 2.5);

  return {
    ...capability,
    runMP,
    sprintMP,
  };
}

/**
 * Re-derive run MP from a heat-adjusted walk MP, preserving the run/walk
 * formula family the capability encodes. MegaMek derives run MP from the
 * already-heat-adjusted walk MP (Entity.getRunMP `ceil(walk * 1.5)`; with
 * boosters Mek.getRunMP routes through MPBoosters.calculateRunMP(walk)),
 * so MASC/Supercharger and run-equals-walk capabilities must keep their
 * own derivation instead of collapsing to the standard 1.5x formula.
 * Audit 2026-06-09 C-1.
 */
function deriveRunMPFromAdjustedWalk(
  capability: IMovementCapability,
  adjustedWalkMP: number,
): number {
  const { walkMP, runMP } = capability;
  // Standard BattleMech derivation: run = ceil(walk * 1.5).
  if (runMP === calculateRunMP(walkMP)) return calculateRunMP(adjustedWalkMP);
  // Single active MASC or Supercharger: run = walk * 2.
  if (runMP === walkMP * 2) return adjustedWalkMP * 2;
  // MASC + Supercharger both active: run = ceil(walk * 2.5).
  if (runMP === Math.ceil(walkMP * 2.5)) {
    return Math.ceil(adjustedWalkMP * 2.5);
  }
  // Run-equals-walk capabilities (e.g. LAM fighter ground taxi).
  if (runMP === walkMP) return adjustedWalkMP;
  // Unknown relationship: preserve the capability's additive offset from
  // the standard derivation (e.g. flat run-MP reductions).
  return Math.max(
    0,
    calculateRunMP(adjustedWalkMP) + (runMP - calculateRunMP(walkMP)),
  );
}

/**
 * Re-derive sprint MP from a heat-adjusted walk MP, preserving the
 * sprint/walk formula family the capability encodes. MegaMek computes
 * sprint MP from the heat-adjusted walk MP (Mek.getSprintMP: walk * 2
 * without boosters, MPBoosters.calculateSprintMP(walk) with boosters).
 * Audit 2026-06-09 C-1.
 */
function deriveSprintMPFromAdjustedWalk(
  capability: IMovementCapability,
  adjustedWalkMP: number,
): number {
  const { walkMP } = capability;
  const sprintMP = getSprintMPForCapability(capability);
  // Standard sprint derivation: sprint = walk * 2.
  if (sprintMP === calculateSprintMP(walkMP)) {
    return calculateSprintMP(adjustedWalkMP);
  }
  // Single active MASC or Supercharger: sprint = ceil(walk * 2.5).
  if (sprintMP === Math.ceil(walkMP * 2.5)) {
    return Math.ceil(adjustedWalkMP * 2.5);
  }
  // MASC + Supercharger both active: sprint = walk * 3.
  if (sprintMP === walkMP * 3) return adjustedWalkMP * 3;
  // Unknown relationship: preserve the additive offset from the standard
  // derivation.
  return Math.max(
    0,
    calculateSprintMP(adjustedWalkMP) + (sprintMP - calculateSprintMP(walkMP)),
  );
}

/**
 * Get the maximum MP available for a movement type.
 *
 * Audit 2026-06-09 C-1/C-2 (MegaMek rules alignment): the heat penalty
 * `floor(heat / 5)` applies to WALK MP only (BipedMek.getWalkMP
 * `mp -= heat / 5`). Run / sprint / evade MP are re-derived from the
 * heat-adjusted walk MP (Entity.getRunMP `ceil(walk * 1.5)`,
 * Mek.getSprintMP `walk * 2`) — never by subtracting the penalty from the
 * pre-derived run/sprint values. Jump MP has NO heat term (Mek.getJumpMP).
 * Worked example: walk 5 / run 8 at heat 10 → penalty 2 → walk 3,
 * run ceil(3 * 1.5) = 5 (not 8 - 2 = 6); jump unchanged. Callers that
 * track current heat pass `heatPenalty`; legacy callers that omit it get
 * the raw MP. The penalty never drives MP negative.
 */
export function getMaxMP(
  capability: IMovementCapability,
  movementType: MovementType,
  heatPenalty: number = 0,
): number {
  if (heatPenalty <= 0) return getRawMaxMP(capability, movementType);

  const adjustedWalkMP = Math.max(0, capability.walkMP - heatPenalty);
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return adjustedWalkMP;
    case MovementType.Run:
    case MovementType.Evade:
      return Math.max(
        0,
        deriveRunMPFromAdjustedWalk(capability, adjustedWalkMP),
      );
    case MovementType.Sprint:
      return Math.max(
        0,
        deriveSprintMPFromAdjustedWalk(capability, adjustedWalkMP),
      );
    case MovementType.Jump:
      // Audit 2026-06-09 C-2: jump MP is heat-immune.
      return capability.jumpMP;
    default:
      return 0;
  }
}

function getRawMaxMP(
  capability: IMovementCapability,
  movementType: MovementType,
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return capability.walkMP;
    case MovementType.Run:
    case MovementType.Evade:
      return capability.runMP;
    case MovementType.Sprint:
      return getSprintMPForCapability(capability);
    case MovementType.Jump:
      return capability.jumpMP;
    default:
      return 0;
  }
}

export function getPavementRoadBonusMP(
  movementMode: UnitMovementType,
  context: Pick<
    IMovementCostContext,
    'optionalRules' | 'pavementRoadBonusProfile'
  > = {},
): number {
  return isPavementRoadBonusEligibleMode(movementMode, context)
    ? PAVEMENT_ROAD_BONUS_MP
    : 0;
}

/**
 * Get the MP cost to enter a hex based on terrain and movement type.
 * Includes terrain modifiers and elevation change costs.
 */
export function getHexMovementCost(
  grid: IHexGrid,
  coord: IHexCoordinate,
  movementType: UnitMovementType = 'walk',
  fromCoord?: IHexCoordinate,
  context: IMovementCostContext = {},
): number {
  return getMovementStepCostBreakdown(
    grid,
    coord,
    movementType,
    fromCoord,
    context,
  ).mpCost;
}

export function getMovementStepCostBreakdown(
  grid: IHexGrid,
  coord: IHexCoordinate,
  movementType: UnitMovementType = 'walk',
  fromCoord?: IHexCoordinate,
  context: IMovementCostContext = {},
): IMovementStepCostBreakdown {
  const hex = getHex(grid, coord);
  if (!hex) {
    return {
      mpCost: Infinity,
      baseCost: 0,
      terrainCost: 0,
      elevationCost: 0,
      elevationDelta: 0,
      blockedReason: 'Destination is outside map bounds',
    };
  }

  const baseCost = 1;
  let terrainCost = 0;

  const terrainFeatures = terrainFeaturesFromString(hex.terrain);
  const hasWaterFeature = terrainFeatures.some(
    (feature) => feature.type === TerrainType.Water,
  );
  const waterLevel = Math.max(
    0,
    ...terrainFeatures
      .filter((feature) => feature.type === TerrainType.Water)
      .map((feature) => feature.level),
  );
  const hasPavementSurfaceFeature = terrainFeatures.some((feature) =>
    isPavementSurfaceFeature(feature),
  );
  const bridgeLevels = terrainFeatures
    .filter((feature) => feature.type === TerrainType.Bridge)
    .map((feature) => feature.level);
  const bridgeLevel =
    bridgeLevels.length > 0 ? Math.max(...bridgeLevels) : null;
  const hasIceFeature = terrainFeatures.some(
    (feature) => feature.type === TerrainType.Ice,
  );
  const hasSurfaceIce = hasWaterFeature && hasIceFeature && waterLevel > 0;
  const hasWoodsFeature = terrainFeatures.some(
    (feature) =>
      feature.type === TerrainType.LightWoods ||
      feature.type === TerrainType.HeavyWoods,
  );

  if (requiresWaterTerrain(movementType) && !hasWaterFeature) {
    return {
      mpCost: Infinity,
      baseCost,
      terrainCost: 0,
      elevationCost: 0,
      elevationDelta: 0,
      blockedReason: `${formatMovementModeForReason(movementType)} movement requires water terrain`,
    };
  }
  if (requiresOpenWaterTerrain(movementType) && hasSurfaceIce) {
    return {
      mpCost: Infinity,
      baseCost,
      terrainCost: 0,
      elevationCost: 0,
      elevationDelta: 0,
      blockedReason: `${formatMovementModeForReason(movementType)} movement requires open water terrain`,
    };
  }
  const bridgeClearanceBlocked = bridgeClearanceBlockedReason(
    movementType,
    bridgeLevel,
    hex.elevation,
    waterLevel,
    context,
  );
  if (bridgeClearanceBlocked) {
    return {
      mpCost: Infinity,
      baseCost,
      terrainCost: 0,
      elevationCost: 0,
      elevationDelta: 0,
      blockedReason: bridgeClearanceBlocked,
    };
  }

  // Rail terrain is not encoded yet; fail closed so rail units do not inherit
  // ordinary ground movement legality by accident.
  if (requiresRailTerrain(movementType)) {
    return {
      mpCost: Infinity,
      baseCost,
      terrainCost: 0,
      elevationCost: 0,
      elevationDelta: 0,
      blockedReason: `${formatMovementModeForReason(movementType)} movement requires rail terrain`,
    };
  }

  const primaryTerrainFeature = getPrimaryTerrainFeatureFromTerrainTag(
    hex.terrain,
  );
  if (primaryTerrainFeature) {
    const terrainType = primaryTerrainFeature.type;
    const terrainProps = TERRAIN_PROPERTIES[terrainType];

    if (terrainProps) {
      terrainCost =
        terrainType === TerrainType.Water
          ? 0
          : (terrainProps.movementCostModifier[movementType] ?? 0);
      if (
        hasMountaineerMovementRelief(context) &&
        isBattleMechGroundMovement(movementType) &&
        (terrainType === TerrainType.Rough ||
          terrainType === TerrainType.Rubble)
      ) {
        terrainCost = Math.max(0, terrainCost - 1);
      }

      if (
        hasWaterFeature &&
        !hasPavementSurfaceFeature &&
        !hasSurfaceIce &&
        waterLevel > 0 &&
        blocksWaterMovement(movementType, context) &&
        !context.waterCapability?.fullyAmphibious &&
        !hasFrogmanWaterMovement(context)
      ) {
        return {
          mpCost: Infinity,
          baseCost,
          terrainCost,
          elevationCost: 0,
          elevationDelta: 0,
          blockedReason: 'Water blocks ground movement',
        };
      }
    }
  }

  if (hasWaterFeature && !hasPavementSurfaceFeature && !hasSurfaceIce) {
    terrainCost += waterMovementCostModifier(movementType, waterLevel, context);
  }

  if (movementType === 'jump') {
    terrainCost = 0;
  }

  let elevationCost = 0;
  let elevationDelta = 0;
  if (fromCoord) {
    const fromHex = getHex(grid, fromCoord);
    if (fromHex) {
      elevationDelta = hex.elevation - fromHex.elevation;
      const elevationChange = Math.abs(elevationDelta);
      const cliffBlockedReason = directionalCliffBlockedReason({
        movementType,
        toTerrainFeatures: terrainFeatures,
        fromCoord,
        toCoord: coord,
        elevationDelta,
        hasPavementSurfaceFeature,
        movementModeLabel: formatMovementModeForReason(movementType),
      });
      if (cliffBlockedReason) {
        return {
          mpCost: Infinity,
          baseCost,
          terrainCost,
          elevationCost: 0,
          elevationDelta,
          blockedReason: cliffBlockedReason,
        };
      }

      if (elevationChange > 0 && paysElevationCost(movementType)) {
        elevationCost =
          elevationChange * elevationCostMultiplier(movementType, context);
        const maxElevationChange = maxElevationChangeForMovementType(
          movementType,
          context,
        );

        if (
          maxElevationChange !== null &&
          elevationChange > maxElevationChange
        ) {
          const limitLabel =
            maxElevationChange === 2
              ? 'ground movement limit'
              : `${formatMovementModeForReason(movementType)} movement limit`;
          return {
            mpCost: Infinity,
            baseCost,
            terrainCost,
            elevationCost,
            elevationDelta,
            blockedReason: `Elevation change of ${elevationChange} exceeds ${limitLabel}`,
          };
        }
        if (
          hasMountaineerMovementRelief(context) &&
          isBattleMechGroundMovement(movementType)
        ) {
          elevationCost = Math.max(0, elevationCost - 1);
        }
      }
      terrainCost += wigeSheerCliffAscentCost({
        grid,
        fromCoord,
        toCoord: coord,
        toTerrainFeatures: terrainFeatures,
        movementType,
        elevationDelta,
      });
      terrainCost += wigeBuildingClimbModeCost({
        grid,
        fromCoord,
        toCoord: coord,
        toElevation: hex.elevation,
        toTerrainFeatures: terrainFeatures,
        movementType,
      });
    }
  }

  const infantryWoodsDiscount =
    context.movementTerrainProfile === 'infantry' &&
    hasWoodsFeature &&
    !hasPavementSurfaceFeature
      ? 1
      : 0;
  const totalCost = Math.max(
    1,
    baseCost + terrainCost + elevationCost - infantryWoodsDiscount,
  );

  return {
    mpCost: totalCost,
    baseCost,
    terrainCost: totalCost - baseCost - elevationCost,
    elevationCost,
    elevationDelta,
  };
}

function hasMountaineerMovementRelief(
  context: IMovementCostContext | undefined,
): boolean {
  return hasSPA(context?.pilotAbilities ?? [], 'tm_mountaineer');
}

function hasFrogmanWaterMovement(
  context: IMovementCostContext | undefined,
): boolean {
  return (
    context?.waterCapability?.frogmanSpecialist === true ||
    hasSPA(context?.pilotAbilities ?? [], 'tm_frogman')
  );
}

function isBattleMechGroundMovement(movementType: UnitMovementType): boolean {
  return movementType === 'walk' || movementType === 'run';
}

export function getJumpElevationDelta(
  grid: IHexGrid,
  from: IHexCoordinate,
  to: IHexCoordinate,
): number {
  const toHex = getHex(grid, to);
  const fromHex = getHex(grid, from);
  if (!toHex || !fromHex) return 0;
  return toHex.elevation - fromHex.elevation;
}

export function getJumpElevationBlockedReason(
  grid: IHexGrid,
  from: IHexCoordinate,
  to: IHexCoordinate,
  effectiveJumpMP: number,
): string | null {
  const elevationDelta = getJumpElevationDelta(grid, from, to);
  if (elevationDelta <= effectiveJumpMP) return null;
  return `Jump elevation rise of ${elevationDelta} exceeds jump MP ${effectiveJumpMP}`;
}

function formatElevationForReason(elevation: number): string {
  return elevation >= 0 ? `+${elevation}` : `${elevation}`;
}

function representedJumpTerrainHeight(
  grid: IHexGrid,
  coord: IHexCoordinate,
): number | null {
  const hex = getHex(grid, coord);
  if (!hex) return null;

  const buildingHeight = Math.max(
    0,
    ...terrainFeaturesFromString(hex.terrain)
      .filter((feature) => feature.type === TerrainType.Building)
      .map((feature) => feature.level),
  );
  return hex.elevation + buildingHeight;
}

export function getJumpClearanceBlockedReason(
  grid: IHexGrid,
  from: IHexCoordinate,
  to: IHexCoordinate,
  effectiveJumpMP: number,
): string | null {
  const fromHex = getHex(grid, from);
  if (!fromHex) return null;

  const jumpClearance = fromHex.elevation + effectiveJumpMP;
  for (const hex of hexLine(from, to).slice(1)) {
    const terrainHeight = representedJumpTerrainHeight(grid, hex);
    if (terrainHeight === null || terrainHeight <= jumpClearance) continue;
    return `Jump path height ${formatElevationForReason(terrainHeight)} at (${hex.q},${hex.r}) exceeds jump clearance ${formatElevationForReason(jumpClearance)}`;
  }
  return null;
}

export function calculatePathMovementCost(
  grid: IHexGrid,
  path: readonly IHexCoordinate[],
  movementType: UnitMovementType = 'walk',
  context: IMovementCostContext = {},
): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    total += getHexMovementCost(
      grid,
      curr,
      movementType,
      prev,
      movementCostContextForStep(context, i === 1),
    );
  }
  return total;
}

/**
 * Calculate the minimum MP cost to move from one hex to another.
 * Uses straight-line distance (pathfinding would use actual path cost).
 */
export function estimateMovementCost(
  from: IHexCoordinate,
  to: IHexCoordinate,
): number {
  return hexDistance(from, to);
}

/**
 * Compute the effective walk MP for a unit given its base walk MP, current
 * heat, and TSM equipment status. Combines the canonical Total Warfare
 * arithmetic for the two simultaneous walk-MP modifiers:
 *
 *   - TSM (Triple Strength Myomer) bonus: +2 walk MP when active (heat >= 9
 *     activation threshold, see `isTSMActive`).
 *   - Heat-induced movement penalty: `floor(heat / 5)` MP — -1 at heat 5+,
 *     -2 at 10+, -3 at 15+, and so on (see `getHeatMovementPenalty`).
 *
 * The two modifiers stack additively against base walk MP and the result is
 * floored at 0 (an overheated TSM-less mech never has negative walk MP).
 *
 * @spec openspec/changes/tier5-audit-cleanup/specs/heat-management-system/spec.md
 *   Requirement: TSM Walk-MP Combined With Heat Penalty
 *
 * @param baseWalkMP - The unit's nominal walk MP (engine rating / tonnage).
 * @param currentHeat - Current heat level on the unit's heat track.
 * @param hasTSM - Whether the unit has Triple Strength Myomer installed.
 * @returns The effective walk MP after both modifiers combine, never below 0.
 */
export function getEffectiveWalkMP(
  baseWalkMP: number,
  currentHeat: number,
  hasTSM: boolean,
): number {
  const tsmBonus = hasTSM && isTSMActive(currentHeat) ? 2 : 0;
  const heatPenalty = getHeatMovementPenalty(currentHeat);
  return Math.max(0, baseWalkMP + tsmBonus - heatPenalty);
}

/**
 * Build the movement capability a BattleMech should validate against when TSM
 * and heat are both known at runner time. MegaMek applies heat/TSM to walk MP
 * first, then derives run (and sprint) MP from the adjusted walk MP; jump MP
 * is heat-immune — Mek.getJumpMP has no heat term (audit 2026-06-09 C-2; the
 * previous jump reduction here pinned the wrong behavior).
 */
export function getHeatAdjustedMovementCapability(
  capability: IMovementCapability,
  currentHeat: number,
  hasTSM: boolean,
): IMovementCapability {
  const walkMP = getEffectiveWalkMP(capability.walkMP, currentHeat, hasTSM);

  return {
    ...capability,
    walkMP,
    runMP: Math.max(0, deriveRunMPFromAdjustedWalk(capability, walkMP)),
    // Audit 2026-06-09 C-1: a pre-set sprint MP must also re-derive from the
    // adjusted walk so it cannot go stale against the new walk/run values.
    ...(capability.sprintMP !== undefined
      ? {
          sprintMP: Math.max(
            0,
            deriveSprintMPFromAdjustedWalk(capability, walkMP),
          ),
        }
      : {}),
  };
}
