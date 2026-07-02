/**
 * VibroClawAttackResolved event factory.
 *
 * Per `wire-vibroclaw-attack-dispatch`: emitted once per resolved BA
 * vibro-claw melee attack. Record event — damage application flows through
 * standard `DamageApplied` events emitted by the same dispatch (one per
 * claw-sized cluster), never through a side-channel.
 */

import type { IVibroClawAttackResolvedPayload } from '@/types/gameplay';

import { GameEventType, type IGameEvent } from '@/types/gameplay';

import {
  createBattleArmorEventBase,
  type IBattleArmorEventContext,
} from './battleArmorCommon';

export interface ICreateVibroClawAttackResolvedEventInput extends IBattleArmorEventContext {
  readonly targetUnitId: string;
  /** Total damage dealt (missileHits × claws). */
  readonly damage: number;
  /** Cluster-table hits rolled against the surviving trooper count. */
  readonly missileHits: number;
  /** Claw count used for the attack. */
  readonly vibroClawCount: number;
  /** Surviving troopers in the attacking squad at resolution time. */
  readonly survivingTroopers: number;
}

export function createVibroClawAttackResolvedEvent(
  input: ICreateVibroClawAttackResolvedEventInput,
): IGameEvent {
  const payload: IVibroClawAttackResolvedPayload = {
    unitId: input.unitId,
    targetUnitId: input.targetUnitId,
    damage: input.damage,
    missileHits: input.missileHits,
    vibroClawCount: input.vibroClawCount,
    survivingTroopers: input.survivingTroopers,
  };
  return {
    ...createBattleArmorEventBase(input, GameEventType.VibroClawAttackResolved),
    payload,
  };
}
