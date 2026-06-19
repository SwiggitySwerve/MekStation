import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import { FiringArc, MovementType } from '@/types/gameplay';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { getHex } from '@/utils/gameplay/hexGrid';
import { coordToKey, hexDistance } from '@/utils/gameplay/hexMath';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';
import { terrainTagOffersCover } from '@/utils/gameplay/terrainCover';

import type { IElectronicWarfareContext } from './AIElectronicWarfareAdvisor';
import type { ObjectiveRole } from './AIObjectivePlanner';
import type { IAIPath } from './AITerrainPathfinder';
import type {
  IAITierAdvancedParameters,
  IAITierCoordinationParameters,
  IAITierMovementParameters,
  IAITierObjectiveParameters,
} from './AITierRegistry';
import type { IVisionContext } from './AIVisionAdvisor';
import type { IAIUnitState, IMove } from './types';

import { adviseDestination as adviseEcmDestination } from './AIElectronicWarfareAdvisor';
import { adviseDestination as adviseVisionDestination } from './AIVisionAdvisor';

export interface IScoreMoveContext {
  readonly attacker: IAIUnitState;
  readonly allUnits: readonly IAIUnitState[];
  readonly grid: IHexGrid;
  readonly highestThreatTarget?: IAIUnitState;
  readonly capability?: IMovementCapability;
  readonly tierMovement?: IAITierMovementParameters;
  readonly pathByDestination?: ReadonlyMap<string, IAIPath>;
  readonly tierCoordination?: IAITierCoordinationParameters;
  readonly lanceCentroid?: IHexCoordinate;
  readonly lancemates?: readonly IAIUnitState[];
  readonly tierObjective?: IAITierObjectiveParameters;
  readonly objectiveRole?: ObjectiveRole;
  readonly objectiveHex?: IHexCoordinate;
  readonly tierAdvanced?: IAITierAdvancedParameters;
  readonly jumpEvaluationScore?: number;
  readonly electronicWarfare?: IElectronicWarfareContext;
  readonly vision?: IVisionContext;
}

const ON_MARKER_BONUS_HEXES = 20;
const ADJACENT_HOLD_FRACTION = 0.5;

function destinationOffersCover(
  grid: IHexGrid,
  destination: IHexCoordinate,
): boolean {
  const hex = getHex(grid, destination);
  if (!hex) return false;
  return terrainTagOffersCover(hex.terrain);
}

export function scoreMove(move: IMove, ctx: IScoreMoveContext): number {
  const { attacker, allUnits, grid, highestThreatTarget } = ctx;
  let score = 0;

  const livingEnemies = allUnits.filter(
    (u) => !u.destroyed && u.unitId !== attacker.unitId,
  );
  const anyEnemyHasLOS = livingEnemies.some(
    (enemy) => calculateLOS(enemy.position, move.destination, grid).hasLOS,
  );
  if (anyEnemyHasLOS) score += 1000;

  if (highestThreatTarget && !highestThreatTarget.destroyed) {
    const arcResult = determineArc(
      {
        unitId: attacker.unitId,
        coord: move.destination,
        facing: move.facing,
        prone: false,
      },
      highestThreatTarget.position,
    );
    if (arcResult.arc === FiringArc.Front) score += 500;
  }

  if (livingEnemies.length > 0) {
    let nearestDistance = Infinity;
    for (const enemy of livingEnemies) {
      const d = hexDistance(move.destination, enemy.position);
      if (d < nearestDistance) nearestDistance = d;
    }
    score -= 100 * nearestDistance;
  }

  score -= move.heatGenerated;
  score += terrainAwareScore(move, ctx);
  score += cohesionScore(move, ctx);
  score += objectiveScore(move, ctx);
  score += advancedScore(move, ctx);

  return score;
}

function advancedScore(move: IMove, ctx: IScoreMoveContext): number {
  const { tierAdvanced } = ctx;
  if (!tierAdvanced || !tierAdvanced.advancedSystems) return 0;

  let delta = 0;

  if (
    move.movementType === MovementType.Jump &&
    tierAdvanced.jumpTacticsWeight !== 0 &&
    ctx.jumpEvaluationScore !== undefined
  ) {
    delta += tierAdvanced.jumpTacticsWeight * ctx.jumpEvaluationScore;
  }

  if (
    ctx.electronicWarfare &&
    (tierAdvanced.ecmAvoidanceWeight !== 0 ||
      tierAdvanced.ecmCoverageWeight !== 0)
  ) {
    const advice = adviseEcmDestination(
      ctx.attacker,
      move.destination,
      ctx.electronicWarfare,
    );
    delta += tierAdvanced.ecmCoverageWeight * advice.coverageBonus;
    delta -= tierAdvanced.ecmAvoidanceWeight * advice.hostileBubblePenalty;
  }

  if (ctx.vision && tierAdvanced.visionWeight !== 0) {
    const advice = adviseVisionDestination(
      ctx.attacker,
      move.destination,
      ctx.vision,
    );
    delta +=
      tierAdvanced.visionWeight * (advice.scoutBonus + advice.losBreakBonus);
  }

  return delta;
}

function objectiveScore(move: IMove, ctx: IScoreMoveContext): number {
  const { tierObjective, objectiveRole, objectiveHex, attacker } = ctx;

  if (!tierObjective || !tierObjective.objectiveAwareness) return 0;
  if (!objectiveRole || objectiveRole === 'screen') return 0;
  if (!objectiveHex) return 0;

  const destDistance = hexDistance(move.destination, objectiveHex);

  if (objectiveRole === 'capture') {
    const { objectiveSeekingWeight } = tierObjective;
    if (objectiveSeekingWeight === 0) return 0;
    if (destDistance === 0) {
      return objectiveSeekingWeight * ON_MARKER_BONUS_HEXES;
    }
    const originDistance = hexDistance(attacker.position, objectiveHex);
    return objectiveSeekingWeight * (originDistance - destDistance);
  }

  const { objectiveHoldWeight } = tierObjective;
  if (objectiveHoldWeight === 0) return 0;
  if (destDistance === 0) return objectiveHoldWeight;
  if (destDistance === 1) {
    return objectiveHoldWeight * ADJACENT_HOLD_FRACTION;
  }
  return 0;
}

function cohesionScore(move: IMove, ctx: IScoreMoveContext): number {
  const { tierCoordination, lanceCentroid, grid, allUnits, attacker } = ctx;

  if (
    !tierCoordination ||
    !tierCoordination.lanceCoordination ||
    tierCoordination.cohesionWeight === 0
  ) {
    return 0;
  }
  if (!lanceCentroid) return 0;

  const { cohesionRadius, cohesionWeight } = tierCoordination;
  let delta = 0;

  const centroidDistance = hexDistance(move.destination, lanceCentroid);
  if (centroidDistance > cohesionRadius) {
    delta -= cohesionWeight * (centroidDistance - cohesionRadius);
  }

  const lancemates = ctx.lancemates ?? [];
  const livingEnemies = allUnits.filter(
    (u) => !u.destroyed && u.unitId !== attacker.unitId,
  );
  const destInEnemyLOS = livingEnemies.some((enemy) => {
    if (lancemates.some((m) => m.unitId === enemy.unitId)) return false;
    return calculateLOS(enemy.position, move.destination, grid).hasLOS;
  });
  if (destInEnemyLOS) {
    const hasNearbyLancemate = lancemates.some(
      (mate) =>
        !mate.destroyed &&
        hexDistance(mate.position, move.destination) <= cohesionRadius,
    );
    if (!hasNearbyLancemate) delta -= cohesionWeight;
  }

  return delta;
}

function terrainAwareScore(move: IMove, ctx: IScoreMoveContext): number {
  const { grid, highestThreatTarget, tierMovement, pathByDestination } = ctx;

  if (!tierMovement || !tierMovement.pathfinderEnabled) return 0;

  let delta = 0;

  if (
    tierMovement.coverWeight !== 0 &&
    destinationOffersCover(grid, move.destination)
  ) {
    delta += tierMovement.coverWeight;
  }

  if (
    tierMovement.losDenialWeight !== 0 &&
    highestThreatTarget &&
    !highestThreatTarget.destroyed
  ) {
    const threatLOS = calculateLOS(
      highestThreatTarget.position,
      move.destination,
      grid,
    );
    if (!threatLOS.hasLOS) delta += tierMovement.losDenialWeight;
  }

  if (tierMovement.terrainCostWeight !== 0 && pathByDestination) {
    const path = pathByDestination.get(coordToKey(move.destination));
    if (path) {
      const straightLine = hexDistance(ctx.attacker.position, move.destination);
      const inefficiency = path.totalMpCost - straightLine;
      if (inefficiency > 0) {
        delta -= tierMovement.terrainCostWeight * inefficiency;
      }
    }
  }

  return delta;
}
