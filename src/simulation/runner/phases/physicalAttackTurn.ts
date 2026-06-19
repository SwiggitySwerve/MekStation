import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

import {
  IGameEvent,
  IGameState,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';
import { resolvePhysicalAttack } from '@/utils/gameplay/physicalAttacks';

import type { IAIPlayer } from '../../ai/IAIPlayer';

import { SeededRandom } from '../../core/SeededRandom';
import { buildPhysicalAttackInput } from './physicalAttackInput';
import { applyPhysicalAttackResolution } from './physicalAttackResolution';
import {
  isInactivePhysicalAttackUnit,
  isPronePhysicalAttackBlocked,
  physicalAttackEnemyUnits,
  selectPhysicalAttack,
} from './physicalAttackSelection';

export function runPhysicalAttackForUnit(options: {
  readonly currentState: IGameState;
  readonly unitId: string;
  readonly botPlayer?: IAIPlayer;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly random: SeededRandom;
  readonly d6Roller: () => number;
  readonly grid?: IHexGrid;
  readonly movementCapabilitiesByUnit?: ReadonlyMap<
    string,
    IMovementCapability
  >;
  readonly optionalRules?: readonly string[];
  readonly manifestsByUnit?: Map<string, CriticalSlotManifest>;
}): { readonly state: IGameState; readonly grid?: IHexGrid } {
  const unit = options.currentState.units[options.unitId];
  if (isInactivePhysicalAttackUnit(unit)) {
    return { state: options.currentState, grid: options.grid };
  }

  const enemies = physicalAttackEnemyUnits(options.currentState, unit);
  if (enemies.length === 0) {
    return { state: options.currentState, grid: options.grid };
  }

  const selection = selectPhysicalAttack({
    unit,
    enemies,
    botPlayer: options.botPlayer,
    random: options.random,
    grid: options.grid,
    movementCapabilitiesByUnit: options.movementCapabilitiesByUnit,
    optionalRules: options.optionalRules,
  });
  if (!selection) {
    return { state: options.currentState, grid: options.grid };
  }
  if (isPronePhysicalAttackBlocked(unit, selection.attackType)) {
    return { state: options.currentState, grid: options.grid };
  }

  const builtAttack = buildPhysicalAttackInput({
    state: options.currentState,
    grid: options.grid,
    unit,
    selection,
    optionalRules: options.optionalRules,
  });
  const result = resolvePhysicalAttack(
    builtAttack.attackInput,
    options.d6Roller,
  );

  return applyPhysicalAttackResolution({
    state: options.currentState,
    grid: options.grid,
    events: options.events,
    gameId: options.gameId,
    unitId: options.unitId,
    unit,
    target: selection.target,
    attackType: selection.attackType,
    attackInput: builtAttack.attackInput,
    result,
    d6Roller: options.d6Roller,
    optionalRules: options.optionalRules,
    manifestsByUnit: options.manifestsByUnit,
    effectiveLimb: builtAttack.effectiveLimb,
    declaredTwoHandedZweihander: selection.declaredTwoHandedZweihander,
    selectedINarcPod: selection.selectedINarcPod,
    blockerStepOutDecision: selection.blockerStepOutDecision,
    targetHasINarcPods: builtAttack.targetHasINarcPods,
  });
}
