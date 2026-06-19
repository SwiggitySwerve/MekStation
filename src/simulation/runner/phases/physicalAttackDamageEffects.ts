import { IGameState } from '@/types/gameplay';
import {
  isZweihanderPhysicalAttackType,
  splitPhysicalDamageIntoClusters,
} from '@/utils/gameplay/physicalAttacks';

import type { PhysicalAttackResolutionOptions } from './physicalAttackResolutionTypes';

import {
  applyDfaAttackerLegDamage,
  applyPhysicalCriticalHits,
  applyPhysicalDamageClusters,
} from './physicalAttackDamage';
import {
  clearBrushOffSwarmingState,
  removeOneBrushOffINarcPod,
  zweihanderSelfCriticalLocations,
} from './physicalAttackHelpers';
import { applyGrappleState } from './physicalAttackState';

export function applyPhysicalDamageEffects(
  options: PhysicalAttackResolutionOptions & {
    readonly brushOffSelectedINarcPod?: NonNullable<
      PhysicalAttackResolutionOptions['selectedINarcPod']
    >;
  },
): IGameState {
  let currentState = applyTargetPhysicalDamage(options);
  currentState = applyBrushOffHitEffects({ ...options, state: currentState });
  currentState = applyGrappleHitEffects({ ...options, state: currentState });
  currentState = applyTwoHandedZweihanderCriticals({
    ...options,
    state: currentState,
  });
  currentState = applyBrushOffMissAttackerDamage({
    ...options,
    state: currentState,
  });
  currentState = applyChargeAttackerDamage({ ...options, state: currentState });
  return applyDfaAttackerLegDamageEffects({
    ...options,
    state: currentState,
  });
}

function applyTargetPhysicalDamage(
  options: PhysicalAttackResolutionOptions,
): IGameState {
  if (
    !options.result.hit ||
    options.result.targetDamage <= 0 ||
    !options.result.hitLocation
  ) {
    return options.state;
  }
  const targetClusters =
    options.attackType === 'charge' || options.attackType === 'dfa'
      ? splitPhysicalDamageIntoClusters(options.result.targetDamage)
      : [options.result.targetDamage];
  return applyPhysicalDamageClusters({
    state: options.state,
    events: options.events,
    gameId: options.gameId,
    unitId: options.target.id,
    clusters: targetClusters,
    hitTable: options.attackType === 'kick' ? 'kick' : 'punch',
    d6Roller: options.d6Roller,
    optionalRules: options.optionalRules,
    sourceUnitId: options.unitId,
    firstHitLocation: options.result.hitLocation,
    manifestsByUnit: options.manifestsByUnit,
  });
}

function applyBrushOffHitEffects(
  options: PhysicalAttackResolutionOptions & {
    readonly brushOffSelectedINarcPod?: PhysicalAttackResolutionOptions['selectedINarcPod'];
  },
): IGameState {
  if (!options.result.hit || options.attackType !== 'brush-off') {
    return options.state;
  }
  let currentState = options.state;
  if (options.attackInput.targetIsSwarmingInfantryOnAttacker === true) {
    currentState = clearBrushOffSwarmingState(currentState, options.target.id);
  }
  if (options.targetHasINarcPods) {
    currentState = removeOneBrushOffINarcPod(
      currentState,
      options.target.id,
      options.brushOffSelectedINarcPod,
    );
  }
  return currentState;
}

function applyGrappleHitEffects(
  options: PhysicalAttackResolutionOptions,
): IGameState {
  if (!options.result.hit || options.attackType !== 'grapple') {
    return options.state;
  }
  return applyGrappleState(options.state, options.unitId, options.target.id);
}

function applyTwoHandedZweihanderCriticals(
  options: PhysicalAttackResolutionOptions,
): IGameState {
  if (
    !options.declaredTwoHandedZweihander ||
    options.result.restrictionReasonCode !== undefined ||
    !isZweihanderPhysicalAttackType(options.attackType)
  ) {
    return options.state;
  }
  return applyPhysicalCriticalHits({
    state: options.state,
    events: options.events,
    gameId: options.gameId,
    unitId: options.unitId,
    locations: zweihanderSelfCriticalLocations(
      options.attackType,
      options.effectiveLimb,
    ),
    d6Roller: options.d6Roller,
    optionalRules: options.optionalRules,
    sourceUnitId: options.unitId,
    manifestsByUnit: options.manifestsByUnit,
  });
}

function applyBrushOffMissAttackerDamage(
  options: PhysicalAttackResolutionOptions,
): IGameState {
  if (
    options.result.hit ||
    options.attackType !== 'brush-off' ||
    options.result.attackerDamage <= 0 ||
    !options.result.hitLocation
  ) {
    return options.state;
  }
  return applyPhysicalDamageClusters({
    state: options.state,
    events: options.events,
    gameId: options.gameId,
    unitId: options.unitId,
    clusters: [options.result.attackerDamage],
    hitTable: 'punch',
    d6Roller: options.d6Roller,
    optionalRules: options.optionalRules,
    sourceUnitId: options.unitId,
    firstHitLocation: options.result.hitLocation,
    manifestsByUnit: options.manifestsByUnit,
  });
}

function applyChargeAttackerDamage(
  options: PhysicalAttackResolutionOptions,
): IGameState {
  if (
    !options.result.hit ||
    options.attackType !== 'charge' ||
    options.result.attackerDamage <= 0
  ) {
    return options.state;
  }
  return applyPhysicalDamageClusters({
    state: options.state,
    events: options.events,
    gameId: options.gameId,
    unitId: options.unitId,
    clusters: splitPhysicalDamageIntoClusters(options.result.attackerDamage),
    hitTable: 'punch',
    d6Roller: options.d6Roller,
    optionalRules: options.optionalRules,
    manifestsByUnit: options.manifestsByUnit,
  });
}

function applyDfaAttackerLegDamageEffects(
  options: PhysicalAttackResolutionOptions,
): IGameState {
  if (
    !options.result.hit ||
    options.attackType !== 'dfa' ||
    options.result.attackerLegDamagePerLeg <= 0
  ) {
    return options.state;
  }
  return applyDfaAttackerLegDamage({
    state: options.state,
    events: options.events,
    gameId: options.gameId,
    unitId: options.unitId,
    clusters: splitPhysicalDamageIntoClusters(
      options.result.attackerLegDamagePerLeg * 2,
    ),
    d6Roller: options.d6Roller,
    optionalRules: options.optionalRules,
    manifestsByUnit: options.manifestsByUnit,
  });
}
