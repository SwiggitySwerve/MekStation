import type { IHexGrid, IMovementCapability } from '@/types/gameplay';
import type { IElectronicWarfareState } from '@/utils/gameplay/electronicWarfare';

import { MovementType } from '@/types/gameplay';

import type { SeededRandom } from '../core/SeededRandom';
import type { IElectronicWarfareContext } from './AIElectronicWarfareAdvisor';
import type { IAILanceContext } from './AILancePlanner';
import type {
  IAITierAdvancedParameters,
  IAITierResourceParameters,
} from './AITierRegistry';
import type { IVisionContext } from './AIVisionAdvisor';
import type { IScoreMoveContext } from './MoveAI';
import type { IAIUnitState } from './types';

import { evaluateJump } from './AIJumpTactics';
import { scoreTarget } from './AttackAI';
import { retreatMovementType } from './RetreatAI';

const JUMP_TACTICS_THRESHOLD = 150;

export interface IAIAdvancedContext {
  readonly movingUnitTeamId: string;
  readonly ewState: IElectronicWarfareState;
}

export function selectMovementType({
  unit,
  capability,
  grid,
  enemies,
  advanced,
  resource,
  random,
}: {
  unit: IAIUnitState;
  capability: IMovementCapability;
  grid: IHexGrid;
  enemies: readonly IAIUnitState[];
  advanced: IAITierAdvancedParameters;
  resource: IAITierResourceParameters;
  random: SeededRandom;
}): MovementType {
  if (capability.walkMP === 0 && capability.jumpMP === 0) {
    return MovementType.Stationary;
  }

  if (unit.isRetreating) {
    const choice = retreatMovementType({
      walkAvailable: capability.walkMP > 0,
      runAvailable: capability.runMP > 0,
    });
    switch (choice) {
      case 'run':
        return MovementType.Run;
      case 'walk':
        return MovementType.Walk;
      case 'stationary':
      default:
        return MovementType.Stationary;
    }
  }

  if (advanced.advancedSystems && capability.jumpMP > 0) {
    const evaluation = evaluateJump(unit, grid, capability, enemies, {
      heatDissipation: unit.heatDissipation,
      heatLookaheadTurns: resource.heatLookaheadTurns,
    });
    if (evaluation.bestJumpScore >= JUMP_TACTICS_THRESHOLD) {
      return MovementType.Jump;
    }
    const runWalkRoll = random.next();
    return runWalkRoll < 0.6 ? MovementType.Run : MovementType.Walk;
  }

  const roll = random.next();
  if (capability.jumpMP > 0 && roll < 0.2) {
    return MovementType.Jump;
  }
  if (roll < 0.6) {
    return MovementType.Run;
  }
  return MovementType.Walk;
}

export function buildMoveScoreContext({
  unit,
  allUnits,
  grid,
  capability,
  lanceContext,
  advancedContext,
  advanced,
  resource,
}: {
  unit: IAIUnitState;
  allUnits?: readonly IAIUnitState[];
  grid: IHexGrid;
  capability: IMovementCapability;
  lanceContext?: IAILanceContext;
  advancedContext?: IAIAdvancedContext;
  advanced: IAITierAdvancedParameters;
  resource: IAITierResourceParameters;
}): IScoreMoveContext | undefined {
  if (!allUnits || unit.isRetreating) return undefined;

  const livingEnemies = allUnits.filter(
    (u) => !u.destroyed && u.unitId !== unit.unitId,
  );
  if (livingEnemies.length === 0) return undefined;

  return {
    attacker: unit,
    allUnits,
    grid,
    highestThreatTarget: selectHighestThreat(unit, livingEnemies),
    capability,
    ...(lanceContext
      ? {
          lanceCentroid: lanceContext.plan.lanceCentroid,
          lancemates: lanceContext.lancemates.filter(
            (m) => m.unitId !== unit.unitId,
          ),
        }
      : {}),
    ...objectiveMoveFields(unit.unitId, lanceContext),
    ...advancedMoveFields({
      unit,
      grid,
      capability,
      livingEnemies,
      lanceContext,
      advancedContext,
      advanced,
      resource,
    }),
  };
}

function advancedMoveFields({
  unit,
  grid,
  capability,
  livingEnemies,
  lanceContext,
  advancedContext,
  advanced,
  resource,
}: {
  unit: IAIUnitState;
  grid: IHexGrid;
  capability: IMovementCapability;
  livingEnemies: readonly IAIUnitState[];
  lanceContext?: IAILanceContext;
  advancedContext?: IAIAdvancedContext;
  advanced: IAITierAdvancedParameters;
  resource: IAITierResourceParameters;
}): Partial<
  Pick<
    IScoreMoveContext,
    'jumpEvaluationScore' | 'electronicWarfare' | 'vision'
  >
> {
  if (!advanced.advancedSystems) {
    return {};
  }

  const lancemates = lanceContext
    ? lanceContext.lancemates.filter((m) => m.unitId !== unit.unitId)
    : [];

  const jumpEvaluation = evaluateJump(unit, grid, capability, livingEnemies, {
    heatDissipation: unit.heatDissipation,
    heatLookaheadTurns: resource.heatLookaheadTurns,
  });

  const vision: IVisionContext = {
    grid,
    enemies: livingEnemies,
    lancemates,
  };

  const electronicWarfare: IElectronicWarfareContext | undefined =
    advancedContext
      ? {
          movingUnitTeamId: advancedContext.movingUnitTeamId,
          ewState: advancedContext.ewState,
          lancemates,
        }
      : undefined;

  return {
    jumpEvaluationScore: jumpEvaluation.bestJumpScore,
    vision,
    ...(electronicWarfare ? { electronicWarfare } : {}),
  };
}

function selectHighestThreat(
  attacker: IAIUnitState,
  livingEnemies: readonly IAIUnitState[],
): IAIUnitState | undefined {
  let bestScore = -Infinity;
  let best: IAIUnitState | undefined;
  for (const enemy of livingEnemies) {
    const score = scoreTarget(attacker, enemy);
    if (score > bestScore) {
      bestScore = score;
      best = enemy;
    }
  }
  return best;
}

function objectiveMoveFields(
  unitId: string,
  lanceContext?: IAILanceContext,
): Partial<Pick<IScoreMoveContext, 'objectiveRole' | 'objectiveHex'>> {
  const objectivePlan = lanceContext?.plan.objectivePlan;
  if (!objectivePlan) return {};

  const role = objectivePlan.roles.get(unitId);
  if (!role || role === 'screen') return {};

  const hex = objectivePlan.targetHexes.get(unitId);
  if (!hex) return {};

  return { objectiveRole: role, objectiveHex: hex };
}
