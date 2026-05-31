import type {
  IGameEvent,
  IPhysicalAttackDeclaredPayload,
} from '@/types/gameplay';

import { GameEventType } from '@/types/gameplay';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

import type { PhysicalAttackLimb, PhysicalAttackType } from './types';

export const BASE_ALLOWED_PHYSICAL_ATTACKS = 1;
export const MELEE_MASTER_ALLOWED_PHYSICAL_ATTACKS = 2;

export function getAllowedPhysicalAttackCount(
  abilities: readonly string[] = [],
): number {
  return hasSPA(abilities, 'melee_master')
    ? MELEE_MASTER_ALLOWED_PHYSICAL_ATTACKS
    : BASE_ALLOWED_PHYSICAL_ATTACKS;
}

export function physicalAttackDeclarationsForTurn(
  events: readonly IGameEvent[],
  turn: number,
  attackerId: string,
): readonly IPhysicalAttackDeclaredPayload[] {
  return events.flatMap((event) => {
    if (event.type !== GameEventType.PhysicalAttackDeclared) return [];
    if (event.turn !== turn) return [];

    const payload = event.payload as IPhysicalAttackDeclaredPayload;
    return payload.attackerId === attackerId ? [payload] : [];
  });
}

export function physicalAttackLimbsUsedThisTurn(
  events: readonly IGameEvent[],
  turn: number,
  attackerId: string,
): readonly PhysicalAttackLimb[] {
  return physicalAttackDeclarationsForTurn(events, turn, attackerId).flatMap(
    (payload) => (payload.limb ? [payload.limb] : []),
  );
}

export function physicalAttackLimbForDeclaration(
  attackType: PhysicalAttackType,
  options: {
    readonly limb?: PhysicalAttackLimb;
    readonly arm?: 'left' | 'right';
  } = {},
): PhysicalAttackLimb | undefined {
  if (options.limb) return options.limb;

  if (attackType === 'punch') {
    return options.arm === 'left' ? 'leftArm' : 'rightArm';
  }

  if (attackType === 'kick') {
    return 'rightLeg';
  }

  return undefined;
}
