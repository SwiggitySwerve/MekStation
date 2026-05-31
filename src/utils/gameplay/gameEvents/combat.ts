import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type {
  IIndirectFireForwardObserverPayload,
  IIndirectFireNarcOverridePayload,
  IIndirectFireSpotterLostPayload,
  IIndirectFireSpotterSelectedPayload,
} from '@/types/gameplay/IndirectFireInterfaces';

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
  ISpottingDeclaredPayload,
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

export function createSpottingDeclaredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  targetId: string,
): IGameEvent {
  const payload: ISpottingDeclaredPayload = {
    unitId,
    targetId,
    turn,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.SpottingDeclared,
      turn,
      GamePhase.WeaponAttack,
      unitId,
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
 *
 * Per `add-combat-fidelity-suite` Phase 2: `viaTransfer` distinguishes
 * direct destruction (`false`) from cascade destruction (`true` —
 * residual damage flowed in from a previous destroyed location).
 * Optional for backward compatibility with pre-P2 callers.
 */
export function createLocationDestroyedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  location: string,
  cascadedTo?: string,
  viaTransfer?: boolean,
): IGameEvent {
  const payload: ILocationDestroyedPayload = {
    unitId,
    location,
    cascadedTo,
    viaTransfer,
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
  phase: GamePhase = GamePhase.WeaponAttack,
  ammoBinId?: string,
): IGameEvent {
  const payload: IComponentDestroyedPayload = {
    unitId,
    location,
    componentType,
    slotIndex,
    componentName,
    ...(ammoBinId !== undefined ? { ammoBinId } : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.ComponentDestroyed,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

// =============================================================================
// Indirect-Fire dispatch events (Wave 8 PR-K4)
// =============================================================================

/**
 * Emitted when a friendly LOS spotter is elected for an indirect-fire attack.
 * Payload mirrors IIndirectFireSpotterSelectedPayload (basis='los',
 * spotterId always non-null).
 */
export function createIndirectFireSpotterSelectedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  spotterId: string,
  weaponId: string,
  targetHex: IHexCoordinate,
  toHitPenalty: number,
  ammoId?: string,
): IGameEvent {
  const payload: IIndirectFireSpotterSelectedPayload = {
    attackerId,
    spotterId,
    weaponId,
    ammoId,
    targetHex,
    toHitPenalty,
    basis: 'los',
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.IndirectFireSpotterSelected,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

/**
 * Emitted when indirect fire is permitted via NARC/iNarc beacon instead of
 * a LOS spotter.
 */
export function createIndirectFireNarcOverrideEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  weaponId: string,
  targetHex: IHexCoordinate,
  basis: 'narc' | 'inarc',
  toHitPenalty: number,
  ammoId?: string,
): IGameEvent {
  const payload: IIndirectFireNarcOverridePayload = {
    attackerId,
    spotterId: null,
    weaponId,
    ammoId,
    targetHex,
    toHitPenalty,
    basis,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.IndirectFireNarcOverride,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

/**
 * Emitted in addition to IndirectFireSpotterSelected when the spotter's
 * pilot holds the FORWARD_OBSERVER SPA and the +1 spotter-walked penalty
 * is cancelled.
 */
export function createIndirectFireForwardObserverEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  spotterId: string,
  weaponId: string,
  targetHex: IHexCoordinate,
  toHitPenalty: number,
  ammoId?: string,
): IGameEvent {
  const payload: IIndirectFireForwardObserverPayload = {
    attackerId,
    spotterId,
    weaponId,
    ammoId,
    targetHex,
    toHitPenalty,
    basis: 'los',
    penaltyCancelled: 1,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.IndirectFireForwardObserver,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

/**
 * Emitted when the elected spotter is destroyed between to-hit time and
 * damage resolution, forcing an auto-miss.
 */
export function createIndirectFireSpotterLostEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  spotterId: string,
  weaponId: string,
  targetHex: IHexCoordinate,
  basis: 'los' | 'narc' | 'inarc' | 'semi-guided-tag',
  reason: string,
  ammoId?: string,
): IGameEvent {
  const payload: IIndirectFireSpotterLostPayload = {
    attackerId,
    spotterId,
    weaponId,
    ammoId,
    targetHex,
    toHitPenalty: 0,
    basis,
    reason,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.IndirectFireSpotterLost,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}
