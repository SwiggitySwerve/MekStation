/**
 * Combat Statistics Projection Functions
 * Aggregate combat statistics from game events.
 */

import {
  IGameEvent,
  GameEventType,
  IDamageAppliedPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';

import {
  getDamageAppliedPayload,
  getUnitDestroyedPayload,
} from './eventPayloads';

export interface IDamageMatrix {
  readonly matrix: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly totalDealt: ReadonlyMap<string, number>;
  readonly totalReceived: ReadonlyMap<string, number>;
}

export interface IKillCredit {
  readonly killerId: string | undefined;
  readonly victimId: string;
  readonly turn: number;
}

export interface IUnitPerformance {
  readonly unitId: string;
  readonly damageDealt: number;
  readonly damageReceived: number;
  readonly kills: number;
  readonly survived: boolean;
}

export function projectDamageMatrix(
  events: readonly IGameEvent[],
): IDamageMatrix {
  const matrix = new Map<string, Map<string, number>>();
  const totalDealt = new Map<string, number>();
  const totalReceived = new Map<string, number>();

  for (const event of events) {
    if (event.type !== GameEventType.DamageApplied) continue;

    const payload = getDamageAppliedPayload(event);
    if (!payload) continue;

    const sourceId = payload.sourceUnitId ?? 'Self/Environment';
    const targetId = payload.unitId;
    const damage = payload.damage;

    if (!matrix.has(sourceId)) {
      matrix.set(sourceId, new Map());
    }
    const sourceMap = matrix.get(sourceId)!;
    sourceMap.set(targetId, (sourceMap.get(targetId) ?? 0) + damage);

    totalDealt.set(sourceId, (totalDealt.get(sourceId) ?? 0) + damage);
    totalReceived.set(targetId, (totalReceived.get(targetId) ?? 0) + damage);
  }

  return {
    matrix: new Map(
      Array.from(matrix.entries()).map(([key, value]) => [key, new Map(value)]),
    ),
    totalDealt: new Map(totalDealt),
    totalReceived: new Map(totalReceived),
  };
}

export function projectKillCredits(
  events: readonly IGameEvent[],
): readonly IKillCredit[] {
  const credits: IKillCredit[] = [];

  for (const event of events) {
    if (event.type !== GameEventType.UnitDestroyed) continue;

    const payload = getUnitDestroyedPayload(event);
    if (!payload) continue;

    credits.push({
      killerId: payload.killerUnitId,
      victimId: payload.unitId,
      turn: event.turn,
    });
  }

  return credits;
}

export function projectUnitPerformance(
  events: readonly IGameEvent[],
  unitId: string,
): IUnitPerformance {
  let damageDealt = 0;
  let damageReceived = 0;
  let kills = 0;
  let survived = true;

  for (const event of events) {
    if (event.type === GameEventType.DamageApplied) {
      const payload = getDamageAppliedPayload(event);
      if (!payload) continue;

      if (payload.sourceUnitId === unitId) {
        damageDealt += payload.damage;
      }

      if (payload.unitId === unitId) {
        damageReceived += payload.damage;
      }
    } else if (event.type === GameEventType.UnitDestroyed) {
      const payload = getUnitDestroyedPayload(event);
      if (!payload) continue;

      if (payload.killerUnitId === unitId) {
        kills++;
      }

      if (payload.unitId === unitId) {
        survived = false;
      }
    }
  }

  return {
    unitId,
    damageDealt,
    damageReceived,
    kills,
    survived,
  };
}
