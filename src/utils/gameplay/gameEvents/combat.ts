import {
  GameEventType,
  GamePhase,
  IAttackDeclaredPayload,
  IAttackLockedPayload,
  IAttackResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  IToHitModifier,
  IWeaponAttackData,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createAttackDeclaredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  targetId: string,
  weapons: readonly string[],
  toHitNumber: number,
  modifiers: readonly IToHitModifier[],
  weaponAttacks?: readonly IWeaponAttackData[],
): IGameEvent {
  const payload: IAttackDeclaredPayload = {
    attackerId,
    targetId,
    weapons,
    toHitNumber,
    modifiers,
    weaponAttacks,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackDeclared,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

export function createAttackLockedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
): IGameEvent {
  const payload: IAttackLockedPayload = { unitId };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackLocked,
      turn,
      GamePhase.WeaponAttack,
      unitId,
    ),
    payload,
  };
}

export function createAttackResolvedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  targetId: string,
  weaponId: string,
  roll: number,
  toHitNumber: number,
  hit: boolean,
  location?: string,
  damage?: number,
): IGameEvent {
  const payload: IAttackResolvedPayload = {
    attackerId,
    targetId,
    weaponId,
    roll,
    toHitNumber,
    hit,
    location,
    damage,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackResolved,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

export function createDamageAppliedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  location: string,
  damage: number,
  armorRemaining: number,
  structureRemaining: number,
  locationDestroyed: boolean,
  criticals?: readonly string[],
): IGameEvent {
  const payload: IDamageAppliedPayload = {
    unitId,
    location,
    damage,
    armorRemaining,
    structureRemaining,
    locationDestroyed,
    criticals,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.DamageApplied,
      turn,
      GamePhase.WeaponAttack,
      unitId,
    ),
    payload,
  };
}
