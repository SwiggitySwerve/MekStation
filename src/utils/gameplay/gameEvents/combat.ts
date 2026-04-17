import {
  GameEventType,
  GamePhase,
  IAttackDeclaredPayload,
  IAttackInvalidPayload,
  IAttackLockedPayload,
  IAttackResolvedPayload,
  IComponentDestroyedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  ILocationDestroyedPayload,
  IToHitModifier,
  ITransferDamagePayload,
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
  heat?: number,
  attackerArc?: 'front' | 'left' | 'right' | 'rear',
  ammoBinId?: string | null,
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
    heat,
    attackerArc,
    ammoBinId,
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

export function createAttackInvalidEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  targetId: string,
  reason: IAttackInvalidPayload['reason'],
  weaponId?: string,
  details?: string,
): IGameEvent {
  const payload: IAttackInvalidPayload = {
    attackerId,
    targetId,
    reason,
    weaponId,
    details,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackInvalid,
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

/**
 * Per `integrate-damage-pipeline`: location's internal structure reached
 * zero. Optionally carries `cascadedTo` when destruction triggered a
 * linked-location destruction (side torso → arm cascade).
 */
export function createLocationDestroyedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  location: string,
  cascadedTo?: string,
): IGameEvent {
  const payload: ILocationDestroyedPayload = {
    unitId,
    location,
    cascadedTo,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.LocationDestroyed,
      turn,
      GamePhase.WeaponAttack,
      unitId,
    ),
    payload,
  };
}

/**
 * Per `integrate-damage-pipeline`: damage transferred from a destroyed
 * `fromLocation` to its canonical `toLocation`. Multiple events may
 * fire in sequence for a single shot (arm → side torso → center torso).
 */
export function createTransferDamageEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  fromLocation: string,
  toLocation: string,
  damage: number,
): IGameEvent {
  const payload: ITransferDamagePayload = {
    unitId,
    fromLocation,
    toLocation,
    damage,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.TransferDamage,
      turn,
      GamePhase.WeaponAttack,
      unitId,
    ),
    payload,
  };
}

/**
 * Per `integrate-damage-pipeline`: a specific component has been
 * destroyed by a critical-hit roll. Provides slot index for UI highlight
 * and `componentType` for icon selection.
 */
export function createComponentDestroyedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  location: string,
  componentType: string,
  slotIndex: number,
  componentName?: string,
): IGameEvent {
  const payload: IComponentDestroyedPayload = {
    unitId,
    location,
    componentType,
    slotIndex,
    componentName,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.ComponentDestroyed,
      turn,
      GamePhase.WeaponAttack,
      unitId,
    ),
    payload,
  };
}
