/**
 * The D-8 seeded corpus, regenerated: C4's 16-seed method (REPLAY-PSR-FIX
 * D-8(ii)) without its artifact capture. Atlas AS7-D and Marauder MAD-3R on
 * each side, the real GameEngine, a deterministic UUID sequence and a fixed
 * clock, both installed by the calling test (jest.mock must sit there).
 */
import { createHash } from 'node:crypto';

import type { IAdaptedUnit } from '@/engine/types';
import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import {
  GameSide,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';

import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import marauder from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/Marauder MAD-3R.json';

export const SEEDED_GAME_CLOCK = '2026-11-01T00:00:00.000Z';

const DESIGNS = [atlas, marauder] as unknown as readonly IFullUnit[];

export function seededGameUuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;
}

/** Atlas and Marauder on each side, as C4's contract forces. */
export function seededForces(): {
  readonly player: readonly IAdaptedUnit[];
  readonly opponent: readonly IAdaptedUnit[];
  readonly gameUnits: readonly IGameUnit[];
} {
  const adapted = [GameSide.Player, GameSide.Opponent].flatMap((side) =>
    DESIGNS.map((data, index) => ({
      ...adaptUnitFromData(data, { side }),
      id: `${side}-${index}`,
    })),
  );
  const gameUnits: IGameUnit[] = adapted.map((unit) => ({
    id: unit.id,
    name: unit.id,
    side: unit.side,
    unitRef: DESIGNS[Number(unit.id.slice(-1))].id,
    pilotRef: 'Regular',
    gunnery: 4,
    piloting: 5,
  }));
  return {
    player: adapted.filter((unit) => unit.side === GameSide.Player),
    opponent: adapted.filter((unit) => unit.side === GameSide.Opponent),
    gameUnits,
  };
}

/** Caller resets its UUID sequence before each call. */
export function playSeededGame(seed: number): IGameSession {
  const { player, opponent, gameUnits } = seededForces();
  return new GameEngine({ seed }).runToCompletion(player, opponent, gameUnits);
}

/**
 * C4's `rawDigest`: sha256 of each event's JSON.stringify, joined by `\n`,
 * with no canonicalisation, so key order and every value count.
 */
export function eventStreamDigest(events: readonly IGameEvent[]): string {
  return createHash('sha256')
    .update(events.map((event) => JSON.stringify(event)).join('\n'))
    .digest('hex');
}

/**
 * A state image that keeps what JSON drops: own `undefined` values,
 * non-finite numbers and -0 (C4's `lossless`).
 */
export function losslessStateImage(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item === undefined) return { LOSSLESS_VALUE: 'undefined' };
    if (
      typeof item === 'number' &&
      (!Number.isFinite(item) || Object.is(item, -0))
    ) {
      return { LOSSLESS_VALUE: Object.is(item, -0) ? '-0' : String(item) };
    }
    return item;
  });
}
