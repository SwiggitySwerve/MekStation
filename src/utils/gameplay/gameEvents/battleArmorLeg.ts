import type {
  ILegAttackPayload,
  ILegAttackResolvedPayload,
} from '@/types/gameplay';

import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';

import {
  createBattleArmorEventBase as createBattleArmorLegEventBase,
  type IBattleArmorEventContext,
} from './battleArmorCommon';

/**
 * Emitted for every resolved leg-attack (success or failure).
 */
export interface ICreateLegAttackEventInput extends IBattleArmorEventContext {
  readonly targetUnitId: string;
  readonly success: boolean;
  readonly damageToLeg: number;
  readonly selfDamage: number;
  readonly survivingTroopers: number;
}

type LegAttackLegacyArgs = [
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetUnitId: string,
  success: boolean,
  damageToLeg: number,
  selfDamage: number,
  survivingTroopers: number,
];

function legAttackInput(
  input: ICreateLegAttackEventInput | string,
  legacy: [] | LegAttackLegacyArgs,
): ICreateLegAttackEventInput {
  if (typeof input !== 'string') return input;
  const [
    sequence,
    turn,
    phase,
    unitId,
    targetUnitId,
    success,
    damageToLeg,
    selfDamage,
    survivingTroopers,
  ] = legacy as LegAttackLegacyArgs;
  return {
    gameId: input,
    sequence,
    turn,
    phase,
    unitId,
    targetUnitId,
    success,
    damageToLeg,
    selfDamage,
    survivingTroopers,
  };
}

export function createLegAttackEvent(
  input: ICreateLegAttackEventInput | string,
  ...legacy: [] | LegAttackLegacyArgs
): IGameEvent {
  const eventInput = legAttackInput(input, legacy);
  const payload: ILegAttackPayload = {
    unitId: eventInput.unitId,
    targetUnitId: eventInput.targetUnitId,
    success: eventInput.success,
    damageToLeg: eventInput.damageToLeg,
    selfDamage: eventInput.selfDamage,
    survivingTroopers: eventInput.survivingTroopers,
  };
  return {
    ...createBattleArmorLegEventBase(eventInput, GameEventType.LegAttack),
    payload,
  };
}

/**
 * Emitted for every PR-L3 BA leg-attack resolution (Mek or Vehicle target),
 * carrying the resolved hit / damage / hitLocation / critModifier shape.
 *
 * Distinct from `createLegAttackEvent` (which serves the older
 * `add-battlearmor-combat-behavior` 2d6-vs-TN flow) so both event streams
 * co-exist during the IBASquadCombatState migration.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Leg Attack)
 */
export interface ICreateLegAttackResolvedEventInput extends IBattleArmorEventContext {
  readonly targetUnitId: string;
  readonly hit: boolean;
  readonly damage: number;
  readonly hitLocation: string;
  readonly critModifier: number;
  readonly survivingTroopers: number;
}

type LegAttackResolvedLegacyArgs = [
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetUnitId: string,
  hit: boolean,
  damage: number,
  hitLocation: string,
  critModifier: number,
  survivingTroopers: number,
];

function legAttackResolvedInput(
  input: ICreateLegAttackResolvedEventInput | string,
  legacy: [] | LegAttackResolvedLegacyArgs,
): ICreateLegAttackResolvedEventInput {
  if (typeof input !== 'string') return input;
  const [
    sequence,
    turn,
    phase,
    unitId,
    targetUnitId,
    hit,
    damage,
    hitLocation,
    critModifier,
    survivingTroopers,
  ] = legacy as LegAttackResolvedLegacyArgs;
  return {
    gameId: input,
    sequence,
    turn,
    phase,
    unitId,
    targetUnitId,
    hit,
    damage,
    hitLocation,
    critModifier,
    survivingTroopers,
  };
}

export function createLegAttackResolvedEvent(
  input: ICreateLegAttackResolvedEventInput | string,
  ...legacy: [] | LegAttackResolvedLegacyArgs
): IGameEvent {
  const eventInput = legAttackResolvedInput(input, legacy);
  const payload: ILegAttackResolvedPayload = {
    unitId: eventInput.unitId,
    targetUnitId: eventInput.targetUnitId,
    hit: eventInput.hit,
    damage: eventInput.damage,
    hitLocation: eventInput.hitLocation,
    critModifier: eventInput.critModifier,
    survivingTroopers: eventInput.survivingTroopers,
  };
  return {
    ...createBattleArmorLegEventBase(
      eventInput,
      GameEventType.LegAttackResolved,
    ),
    payload,
  };
}
