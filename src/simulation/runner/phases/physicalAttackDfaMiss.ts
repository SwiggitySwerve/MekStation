import {
  GameEventType,
  GamePhase,
  IGameState,
  PSRTrigger,
} from '@/types/gameplay';
import {
  resolveDfaMissFallDamage,
  resolveDfaMissFallPilotDamageAvoidance,
} from '@/utils/gameplay/physicalAttacks';

import type {
  DfaMissFall,
  PhysicalAttackResolutionOptions,
  PhysicalDisplacement,
} from './physicalAttackResolutionTypes';

import {
  DEFAULT_PILOTING,
  DEFAULT_TONNAGE,
} from '../SimulationRunnerConstants';
import { applyPhysicalDamageClusterLocations } from './physicalAttackDamage';
import { dfaMissDropsAttacker } from './physicalAttackHelpers';
import {
  applyDfaMissFallPilotDamage,
  markUnitFallenAfterDfaMiss,
} from './physicalAttackState';
import { createGameEvent } from './utils';

export function physicalDfaMissFall(
  options: PhysicalAttackResolutionOptions & {
    readonly displacements: readonly PhysicalDisplacement[];
    readonly impossibleDisplacementDestroyedUnitId?: string;
  },
): DfaMissFall | undefined {
  if (
    options.result.hit ||
    options.attackType !== 'dfa' ||
    options.impossibleDisplacementDestroyedUnitId === options.unitId ||
    !dfaMissDropsAttacker(options.displacements, options.unitId)
  ) {
    return undefined;
  }
  return resolveDfaMissFallDamage(
    DEFAULT_TONNAGE,
    options.unit.facing,
    options.d6Roller,
  );
}

export function applyDfaMissFallEffects(
  options: PhysicalAttackResolutionOptions & {
    readonly dfaMissFall?: DfaMissFall;
  },
): IGameState {
  if (options.dfaMissFall === undefined) return options.state;
  const dfaMissFall = options.dfaMissFall;
  let currentState = applyPhysicalDamageClusterLocations({
    state: options.state,
    events: options.events,
    gameId: options.gameId,
    unitId: options.unitId,
    clusters: dfaMissFall.clusters,
    d6Roller: options.d6Roller,
    optionalRules: options.optionalRules,
    manifestsByUnit: options.manifestsByUnit,
  });
  const pilotDamageAvoidance = resolveDfaMissFallPilotDamageAvoidance(
    options.unit.piloting ?? DEFAULT_PILOTING,
    dfaMissFall.fallHeight,
    options.d6Roller,
    options.unit.abilities ?? [],
  );
  currentState = markUnitFallenAfterDfaMiss(
    currentState,
    options.unitId,
    dfaMissFall.newFacing,
  );
  options.events.push(
    createGameEvent(
      options.gameId,
      options.events.length,
      GameEventType.UnitFell,
      currentState.turn,
      GamePhase.PhysicalAttack,
      {
        unitId: options.unitId,
        fallDamage: dfaMissFall.fallDamage,
        newFacing: dfaMissFall.newFacing,
        pilotDamage: pilotDamageAvoidance.pilotDamage,
        location: 'dfa_miss',
        reason: 'Missed DFA',
        reasonCode: PSRTrigger.DFAMiss,
      },
      options.unitId,
    ),
  );
  return applyDfaMissFallPilotDamage({
    state: currentState,
    events: options.events,
    gameId: options.gameId,
    unitId: options.unitId,
    pilotDamage: pilotDamageAvoidance.pilotDamage,
    d6Roller: options.d6Roller,
  });
}
