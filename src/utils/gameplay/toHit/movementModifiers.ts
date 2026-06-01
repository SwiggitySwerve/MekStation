import { MovementType } from '@/types/gameplay';
import { IToHitModifierDetail } from '@/types/gameplay';

import { ATTACKER_MOVEMENT_MODIFIERS, TMM_BRACKETS } from './constants';

export function calculateAttackerMovementModifier(
  movementType: MovementType,
): IToHitModifierDetail {
  const value = ATTACKER_MOVEMENT_MODIFIERS[movementType];
  return {
    name: 'Attacker Movement',
    value,
    source: 'attacker_movement',
    description: `Attacker ${movementType}: +${value}`,
  };
}

export function calculateTMM(
  movementType: MovementType,
  hexesMoved: number,
): IToHitModifierDetail {
  if (movementType === MovementType.Stationary || hexesMoved === 0) {
    return {
      name: 'Target Movement (TMM)',
      value: 0,
      source: 'target_movement',
      description: 'Target is stationary',
    };
  }

  let tmm =
    TMM_BRACKETS.find((bracket) => {
      return hexesMoved >= bracket.min && hexesMoved <= bracket.max;
    })?.tmm ?? 0;

  if (movementType === MovementType.Jump) {
    tmm += 1;
  }

  return {
    name: 'Target Movement (TMM)',
    value: tmm,
    source: 'target_movement',
    description: `Target moved ${hexesMoved} hexes${movementType === MovementType.Jump ? ' (jumped)' : ''}: +${tmm}`,
  };
}

export function calculateTargetEvasionModifier(
  isEvading: boolean | undefined,
  isProne: boolean,
  evasionBonus?: number,
): IToHitModifierDetail | null {
  if (isEvading !== true || isProne) return null;

  const bonus =
    evasionBonus === undefined
      ? 1
      : Number.isFinite(evasionBonus)
        ? Math.min(3, Math.max(0, Math.trunc(evasionBonus)))
        : 0;
  if (bonus <= 0) return null;

  return {
    name: 'Target Evasion',
    value: bonus,
    source: 'target_movement',
    description: `Target is evading: +${bonus}`,
  };
}

export function calculateTargetSprintedModifier(
  sprintedThisTurn: boolean | undefined,
): IToHitModifierDetail | null {
  if (sprintedThisTurn !== true) return null;

  return {
    name: 'Target Sprinted',
    value: -1,
    source: 'target_movement',
    description: 'Target sprinted this turn: -1',
  };
}
