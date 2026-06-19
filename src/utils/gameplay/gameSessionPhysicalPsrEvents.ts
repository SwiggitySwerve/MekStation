import {
  GamePhase,
  IGameSession,
  IPhysicalDisplacement,
  PSRTrigger,
  type IPhysicalAttackDeclaredPayload,
} from '@/types/gameplay';

import { createPSRTriggeredEvent } from './gameEvents';
import { appendEvent } from './gameSessionCore';
import {
  CHARGE_HIT_PSR_MODIFIER,
  DFA_TARGET_PSR_MODIFIER,
  type IPhysicalAttackResult,
  type PhysicalAttackType,
} from './physicalAttacks';
import { createDominoEffectPSR } from './pilotingSkillRolls';

interface IPhysicalPsrDescriptor {
  readonly reason: string;
  readonly additionalModifier: number;
  readonly triggerSource: string;
  readonly reasonCode?: PSRTrigger;
}

interface IAppendPhysicalAttackPsrEventsOptions {
  readonly session: IGameSession;
  readonly turn: number;
  readonly payload: IPhysicalAttackDeclaredPayload;
  readonly result: IPhysicalAttackResult;
  readonly targetBasePilotingSkill?: number;
  readonly attackerBasePilotingSkill: number;
  readonly displacements: readonly IPhysicalDisplacement[];
  readonly impossibleDisplacementDestroyedUnitId?: string;
  readonly chargeHitDisplacementBlocked: boolean;
  readonly dfaMissFallApplies: boolean;
}

const TARGET_HIT_PSR_BY_ATTACK_TYPE: Partial<
  Record<PhysicalAttackType, IPhysicalPsrDescriptor>
> = {
  kick: {
    reason: 'Kicked',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Kicked,
    reasonCode: PSRTrigger.Kicked,
  },
  charge: {
    reason: 'Charged',
    additionalModifier: CHARGE_HIT_PSR_MODIFIER,
    triggerSource: PSRTrigger.Charged,
    reasonCode: PSRTrigger.Charged,
  },
  dfa: {
    reason: 'Hit by DFA',
    additionalModifier: DFA_TARGET_PSR_MODIFIER,
    triggerSource: PSRTrigger.DFATarget,
    reasonCode: PSRTrigger.DFATarget,
  },
  push: {
    reason: 'Pushed',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Pushed,
    reasonCode: PSRTrigger.Pushed,
  },
  trip: {
    reason: 'Tripped',
    additionalModifier: 0,
    triggerSource: 'trip',
  },
};

const ATTACKER_HIT_PSR_BY_ATTACK_TYPE: Partial<
  Record<
    PhysicalAttackType,
    Pick<IPhysicalPsrDescriptor, 'reason' | 'triggerSource' | 'reasonCode'>
  >
> = {
  charge: {
    reason: 'Hit charge',
    triggerSource: 'charge_attacker_hit',
    reasonCode: PSRTrigger.Charged,
  },
  dfa: {
    reason: 'Executed DFA',
    triggerSource: 'dfa_attacker_hit',
    reasonCode: PSRTrigger.DFATarget,
  },
  thrash: {
    reason: 'Thrashing attack',
    triggerSource: 'thrash_attacker_hit',
  },
};

const ATTACKER_MISS_PSR_BY_ATTACK_TYPE: Partial<
  Record<
    PhysicalAttackType,
    Pick<IPhysicalPsrDescriptor, 'triggerSource' | 'reasonCode'>
  >
> = {
  kick: {
    triggerSource: 'kick_miss',
    reasonCode: PSRTrigger.KickMiss,
  },
  charge: {
    triggerSource: 'charge_miss',
    reasonCode: PSRTrigger.ChargeMiss,
  },
  dfa: {
    triggerSource: 'dfa_miss',
    reasonCode: PSRTrigger.DFAMiss,
  },
};

function targetHitPsrDescriptor(
  attackType: PhysicalAttackType,
): IPhysicalPsrDescriptor {
  return (
    TARGET_HIT_PSR_BY_ATTACK_TYPE[attackType] ?? {
      reason: 'Hit by physical attack',
      additionalModifier: 0,
      triggerSource: 'physical_attack_target',
    }
  );
}

function attackerHitPsrDescriptor(
  attackType: PhysicalAttackType,
  additionalModifier: number,
): IPhysicalPsrDescriptor {
  const descriptor = ATTACKER_HIT_PSR_BY_ATTACK_TYPE[attackType];
  return {
    reason: descriptor?.reason ?? `Hit ${attackType}`,
    additionalModifier,
    triggerSource: descriptor?.triggerSource ?? 'physical_attacker_hit',
    ...(descriptor?.reasonCode !== undefined
      ? { reasonCode: descriptor.reasonCode }
      : {}),
  };
}

function attackerMissPsrDescriptor(
  attackType: PhysicalAttackType,
  additionalModifier: number,
): IPhysicalPsrDescriptor {
  const descriptor = ATTACKER_MISS_PSR_BY_ATTACK_TYPE[attackType];
  return {
    reason: `Missed ${attackType}`,
    additionalModifier,
    triggerSource: descriptor?.triggerSource ?? 'physical_miss',
    ...(descriptor?.reasonCode !== undefined
      ? { reasonCode: descriptor.reasonCode }
      : {}),
  };
}

function appendPhysicalPsrEvent(
  session: IGameSession,
  options: {
    readonly turn: number;
    readonly unitId: string;
    readonly descriptor: IPhysicalPsrDescriptor;
    readonly basePilotingSkill?: number;
  },
): IGameSession {
  return appendEvent(
    session,
    createPSRTriggeredEvent({
      gameId: session.id,
      sequence: session.events.length,
      turn: options.turn,
      phase: GamePhase.PhysicalAttack,
      unitId: options.unitId,
      reason: options.descriptor.reason,
      additionalModifier: options.descriptor.additionalModifier,
      triggerSource: options.descriptor.triggerSource,
      basePilotingSkill: options.basePilotingSkill,
      reasonCode: options.descriptor.reasonCode,
    }),
  );
}

function dominoEffectDisplacedUnitIds(
  displacements: readonly IPhysicalDisplacement[],
): readonly string[] {
  return displacements
    .filter((displacement) => displacement.reason === 'domino')
    .map((displacement) => displacement.unitId);
}

function appendDominoEffectPsrEvents(
  session: IGameSession,
  options: {
    readonly turn: number;
    readonly displacements: readonly IPhysicalDisplacement[];
  },
): IGameSession {
  let currentSession = session;

  for (const dominoUnitId of dominoEffectDisplacedUnitIds(
    options.displacements,
  )) {
    const dominoPsr = createDominoEffectPSR(dominoUnitId);
    const dominoUnit =
      currentSession.currentState.units[dominoUnitId] ??
      currentSession.units.find((unit) => unit.id === dominoUnitId);
    currentSession = appendPhysicalPsrEvent(currentSession, {
      turn: options.turn,
      unitId: dominoUnitId,
      descriptor: dominoPsr,
      basePilotingSkill: dominoUnit?.piloting,
    });
  }

  return currentSession;
}

export function appendPhysicalAttackPsrEvents(
  options: IAppendPhysicalAttackPsrEventsOptions,
): IGameSession {
  const { payload, result } = options;
  let currentSession = options.session;

  if (
    result.hit &&
    result.targetPSR &&
    options.impossibleDisplacementDestroyedUnitId !== payload.targetId &&
    !options.chargeHitDisplacementBlocked
  ) {
    currentSession = appendPhysicalPsrEvent(currentSession, {
      turn: options.turn,
      unitId: payload.targetId,
      descriptor: targetHitPsrDescriptor(payload.attackType),
      basePilotingSkill: options.targetBasePilotingSkill,
    });
  }

  if (
    result.hit &&
    result.attackerPSR &&
    !options.chargeHitDisplacementBlocked
  ) {
    currentSession = appendPhysicalPsrEvent(currentSession, {
      turn: options.turn,
      unitId: payload.attackerId,
      descriptor: attackerHitPsrDescriptor(
        payload.attackType,
        result.attackerPSRModifier,
      ),
      basePilotingSkill: options.attackerBasePilotingSkill,
    });
  }

  if (
    !result.hit &&
    result.attackerPSR &&
    options.impossibleDisplacementDestroyedUnitId !== payload.attackerId &&
    !options.dfaMissFallApplies
  ) {
    currentSession = appendPhysicalPsrEvent(currentSession, {
      turn: options.turn,
      unitId: payload.attackerId,
      descriptor: attackerMissPsrDescriptor(
        payload.attackType,
        result.attackerPSRModifier,
      ),
      basePilotingSkill: options.attackerBasePilotingSkill,
    });
  }

  return appendDominoEffectPsrEvents(currentSession, {
    turn: options.turn,
    displacements: options.displacements,
  });
}
