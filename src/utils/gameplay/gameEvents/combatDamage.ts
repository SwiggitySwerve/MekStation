import {
  GameEventType,
  GamePhase,
  IComponentDestroyedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  ILocationDestroyedPayload,
  ITransferDamagePayload,
} from '@/types/gameplay';

import { createEventBase } from './base';

interface ICombatEventContext {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
}

export interface ICreateDamageAppliedEventInput extends ICombatEventContext {
  readonly unitId: string;
  readonly location: string;
  readonly damage: number;
  readonly armorRemaining: number;
  readonly structureRemaining: number;
  readonly locationDestroyed: boolean;
  readonly criticals?: readonly string[];
  readonly phase?: GamePhase;
}

type DamageAppliedLegacyArgs = [
  sequence: number,
  turn: number,
  unitId: string,
  location: string,
  damage: number,
  armorRemaining: number,
  structureRemaining: number,
  locationDestroyed: boolean,
  criticals?: readonly string[],
  phase?: GamePhase,
];

function damageAppliedInput(
  input: ICreateDamageAppliedEventInput | string,
  legacy: [] | DamageAppliedLegacyArgs,
): ICreateDamageAppliedEventInput {
  if (typeof input !== 'string') return input;
  const args = legacy as DamageAppliedLegacyArgs;
  const [
    sequence,
    turn,
    unitId,
    location,
    damage,
    armorRemaining,
    structureRemaining,
    locationDestroyed,
    criticals,
    phase,
  ] = args;
  return {
    gameId: input,
    sequence,
    turn,
    unitId,
    location,
    damage,
    armorRemaining,
    structureRemaining,
    locationDestroyed,
    criticals,
    phase,
  };
}

export function createDamageAppliedEvent(
  input: ICreateDamageAppliedEventInput | string,
  ...legacy: [] | DamageAppliedLegacyArgs
): IGameEvent {
  const {
    armorRemaining,
    criticals,
    damage,
    gameId,
    location,
    locationDestroyed,
    phase = GamePhase.WeaponAttack,
    sequence,
    structureRemaining,
    turn,
    unitId,
  } = damageAppliedInput(input, legacy);
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
      phase,
      unitId,
    ),
    payload,
  };
}

export interface ICreateLocationDestroyedEventInput extends ICombatEventContext {
  readonly unitId: string;
  readonly location: string;
  readonly cascadedTo?: string;
  readonly viaTransfer?: boolean;
  readonly phase?: GamePhase;
}

type LocationDestroyedLegacyArgs = [
  sequence: number,
  turn: number,
  unitId: string,
  location: string,
  cascadedTo?: string,
  viaTransfer?: boolean,
  phase?: GamePhase,
];

function locationDestroyedInput(
  input: ICreateLocationDestroyedEventInput | string,
  legacy: [] | LocationDestroyedLegacyArgs,
): ICreateLocationDestroyedEventInput {
  if (typeof input !== 'string') return input;
  const args = legacy as LocationDestroyedLegacyArgs;
  const [sequence, turn, unitId, location, cascadedTo, viaTransfer, phase] =
    args;
  return {
    gameId: input,
    sequence,
    turn,
    unitId,
    location,
    cascadedTo,
    viaTransfer,
    phase,
  };
}

/**
 * Per `integrate-damage-pipeline`: location's internal structure reached
 * zero. Optionally carries `cascadedTo` when destruction triggered a
 * linked-location destruction (side torso -> arm cascade).
 *
 * Per `add-combat-fidelity-suite` Phase 2: `viaTransfer` distinguishes
 * direct destruction (`false`) from cascade destruction (`true` - residual
 * damage flowed in from a previous destroyed location).
 */
export function createLocationDestroyedEvent(
  input: ICreateLocationDestroyedEventInput | string,
  ...legacy: [] | LocationDestroyedLegacyArgs
): IGameEvent {
  const {
    cascadedTo,
    gameId,
    location,
    phase = GamePhase.WeaponAttack,
    sequence,
    turn,
    unitId,
    viaTransfer,
  } = locationDestroyedInput(input, legacy);
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
      phase,
      unitId,
    ),
    payload,
  };
}

export interface ICreateTransferDamageEventInput extends ICombatEventContext {
  readonly unitId: string;
  readonly fromLocation: string;
  readonly toLocation: string;
  readonly damage: number;
  readonly phase?: GamePhase;
}

type TransferDamageLegacyArgs = [
  sequence: number,
  turn: number,
  unitId: string,
  fromLocation: string,
  toLocation: string,
  damage: number,
  phase?: GamePhase,
];

function transferDamageInput(
  input: ICreateTransferDamageEventInput | string,
  legacy: [] | TransferDamageLegacyArgs,
): ICreateTransferDamageEventInput {
  if (typeof input !== 'string') return input;
  const args = legacy as TransferDamageLegacyArgs;
  const [sequence, turn, unitId, fromLocation, toLocation, damage, phase] =
    args;
  return {
    gameId: input,
    sequence,
    turn,
    unitId,
    fromLocation,
    toLocation,
    damage,
    phase,
  };
}

/**
 * Per `integrate-damage-pipeline`: damage transferred from a destroyed
 * `fromLocation` to its canonical `toLocation`. Multiple events may fire in
 * sequence for a single shot (arm -> side torso -> center torso).
 */
export function createTransferDamageEvent(
  input: ICreateTransferDamageEventInput | string,
  ...legacy: [] | TransferDamageLegacyArgs
): IGameEvent {
  const {
    damage,
    fromLocation,
    gameId,
    phase = GamePhase.WeaponAttack,
    sequence,
    toLocation,
    turn,
    unitId,
  } = transferDamageInput(input, legacy);
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
      phase,
      unitId,
    ),
    payload,
  };
}

export interface ICreateComponentDestroyedEventInput extends ICombatEventContext {
  readonly unitId: string;
  readonly location: string;
  readonly componentType: string;
  readonly slotIndex: number;
  readonly componentName?: string;
  readonly phase?: GamePhase;
  readonly ammoBinId?: string;
}

type ComponentDestroyedLegacyArgs = [
  sequence: number,
  turn: number,
  unitId: string,
  location: string,
  componentType: string,
  slotIndex: number,
  componentName?: string,
  phase?: GamePhase,
  ammoBinId?: string,
];

function componentDestroyedInput(
  input: ICreateComponentDestroyedEventInput | string,
  legacy: [] | ComponentDestroyedLegacyArgs,
): ICreateComponentDestroyedEventInput {
  if (typeof input !== 'string') return input;
  const args = legacy as ComponentDestroyedLegacyArgs;
  const [
    sequence,
    turn,
    unitId,
    location,
    componentType,
    slotIndex,
    componentName,
    phase,
    ammoBinId,
  ] = args;
  return {
    gameId: input,
    sequence,
    turn,
    unitId,
    location,
    componentType,
    slotIndex,
    componentName,
    phase,
    ammoBinId,
  };
}

/**
 * Per `integrate-damage-pipeline`: a specific component has been destroyed by
 * a critical-hit roll. Provides slot index for UI highlight and
 * `componentType` for icon selection.
 */
export function createComponentDestroyedEvent(
  input: ICreateComponentDestroyedEventInput | string,
  ...legacy: [] | ComponentDestroyedLegacyArgs
): IGameEvent {
  const {
    ammoBinId,
    componentName,
    componentType,
    gameId,
    location,
    phase = GamePhase.WeaponAttack,
    sequence,
    slotIndex,
    turn,
    unitId,
  } = componentDestroyedInput(input, legacy);
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
