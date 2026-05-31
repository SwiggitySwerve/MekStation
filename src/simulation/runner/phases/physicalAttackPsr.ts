import { IGameState, IPendingPSR } from '@/types/gameplay';
import {
  IPhysicalAttackResult,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';
import {
  createChargedPSR,
  createChargeMissPSR,
  createDFAAttackerPSR,
  createDFAMissPSR,
  createDFATargetPSR,
  createDominoEffectPSR,
  createKickedPSR,
  createKickMissPSR,
  createPushedPSR,
} from '@/utils/gameplay/pilotingSkillRolls';

export function targetPSRForAttack(
  attackType: PhysicalAttackType,
  targetId: string,
): IPendingPSR | null {
  switch (attackType) {
    case 'kick':
      return createKickedPSR(targetId);
    case 'charge':
      return createChargedPSR(targetId);
    case 'dfa':
      return createDFATargetPSR(targetId);
    case 'push':
      return createPushedPSR(targetId);
    case 'trip':
      return {
        entityId: targetId,
        reason: 'Tripped',
        additionalModifier: 0,
        triggerSource: 'trip',
      };
    default:
      return null;
  }
}

export function dominoEffectPSRForDisplacement(unitId: string): IPendingPSR {
  return createDominoEffectPSR(unitId);
}

export function attackerMissPSRForAttack(
  attackType: PhysicalAttackType,
  attackerId: string,
  result: IPhysicalAttackResult,
): IPendingPSR {
  switch (attackType) {
    case 'kick':
      return createKickMissPSR(attackerId);
    case 'charge':
      return createChargeMissPSR(attackerId);
    case 'dfa':
      return createDFAMissPSR(attackerId);
    default:
      return {
        entityId: attackerId,
        reason: `${attackType} missed`,
        additionalModifier: result.attackerPSRModifier,
        triggerSource: `${attackType}_miss`,
      };
  }
}

export function attackerHitPSRForAttack(
  attackType: PhysicalAttackType,
  attackerId: string,
  result: IPhysicalAttackResult,
): IPendingPSR | null {
  switch (attackType) {
    case 'charge':
      return {
        ...createChargedPSR(attackerId),
        additionalModifier: result.attackerPSRModifier,
      };
    case 'dfa':
      return {
        ...createDFAAttackerPSR(attackerId),
        additionalModifier: result.attackerPSRModifier,
      };
    default:
      return null;
  }
}

export function queuePendingPSR(
  state: IGameState,
  unitId: string,
  psr: IPendingPSR,
): IGameState {
  const unit = state.units[unitId];
  if (!unit || unit.destroyed) return state;
  const existingPSRs = unit.pendingPSRs ?? [];
  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        pendingPSRs: [...existingPSRs, psr],
      },
    },
  };
}
