/**
 * `add-sp-combat-determinism` task 2.2 — persistence round-trip proof
 * for design D3 / risk R2.
 *
 * D3 persists the GameEngine's resolved seed onto `IGameConfig.seed` so
 * recovery (D4) can re-seed deterministically. That contract is only
 * honest if the seed actually survives the real persistence boundary —
 * `GameCreated` event -> `MatchLogStorage` (IndexedDB) -> event-log
 * read-back -> `hydrateGameSessionFromEvents`. R2 calls out the exact
 * failure mode this proves against: if the `GameCreated` payload or the
 * hydrator ever started pruning unknown `IGameConfig` fields, the seed
 * would die silently and recovery would fall back to the legacy
 * `0xc0ffee` path with no test noticing. This suite drives through a
 * real `MatchLogStorage` instance (backed by `fake-indexeddb`, per the
 * existing `InteractiveSession.matchLog.test.ts` convention) rather than
 * a hand-rolled in-memory array, so a pruning regression at the real
 * serialization boundary would actually be caught.
 */

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// Recovery's `fromSessionAsync` re-derives adapted units via
// `adaptUnit` (`CompendiumAdapter`). Mocked so the test is deterministic
// and doesn't depend on the on-disk catalog — same pattern as
// `InteractiveSession.recovery.test.ts`.
jest.mock('../adapters/CompendiumAdapter', () => {
  const mockAdaptUnit = jest.fn();
  return {
    adaptUnit: mockAdaptUnit,
    __mockAdaptUnit: mockAdaptUnit,
  };
});

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

import type { IWeapon } from '@/simulation/ai/types';

import { MatchLogStorage } from '@/lib/p2p/matchLogStorage';
import {
  GameSide,
  LockState,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

import type { IAdaptedUnit } from '../types';

import { GameEngine } from '../GameEngine';
import { InteractiveSession } from '../InteractiveSession';
import { hydrateRecoverableSessionFromMatchLog } from '../InteractiveSession.persistence';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const adapterModule = require('../adapters/CompendiumAdapter') as {
  __mockAdaptUnit: jest.Mock;
};
const mockAdaptUnit = adapterModule.__mockAdaptUnit;

function installFreshIndexedDB(): void {
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    writable: true,
    configurable: true,
  });
}

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAdaptedUnit(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: -2 } : { q: 0, r: 2 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [makeWeapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function makeGameUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'player-1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'player-1',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'opponent-1',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'opponent-1',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

describe('InteractiveSession seed persistence round-trip (add-sp-combat-determinism R2)', () => {
  let storage: MatchLogStorage;

  beforeEach(() => {
    installFreshIndexedDB();
    storage = new MatchLogStorage({
      dbName: 'seed-persistence-round-trip-test',
      now: () => '2026-07-10T00:00:00.000Z',
    });
    mockAdaptUnit.mockReset();
    mockAdaptUnit.mockImplementation(
      async (
        unitRef: string,
        options: { side: GameSide } = { side: GameSide.Player },
      ) => makeAdaptedUnit(unitRef, options.side),
    );
  });

  afterEach(() => {
    storage.close();
  });

  it('a GameEngine-resolved seed survives GameCreated -> IndexedDB -> hydrate -> fromSessionAsync', async () => {
    const SEED = 918273;
    const engine = new GameEngine({ seed: SEED, mapRadius: 6, turnLimit: 4 });
    const source = engine.createInteractiveSession(
      [makeAdaptedUnit('player-1', GameSide.Player)],
      [makeAdaptedUnit('opponent-1', GameSide.Opponent)],
      makeGameUnits(),
    );
    const sourceSession = source.getSession();
    // Sanity precondition — Group 1 (task 1.2/1.3) already covers this
    // stamping; asserted here only so a round-trip failure downstream is
    // unambiguously a persistence bug, not a stamping regression.
    expect(sourceSession.config.seed).toBe(SEED);

    const matchId = sourceSession.id;
    await Promise.all(
      sourceSession.events.map((event) => storage.appendEvent(matchId, event)),
    );

    // Stage 1: the raw event-log round trip through real IndexedDB
    // storage — proves the `GameCreated` payload and the hydrator do
    // not prune the new `IGameConfig.seed` field.
    const hydrated = await hydrateRecoverableSessionFromMatchLog(
      matchId,
      storage,
    );
    expect(hydrated.config.seed).toBe(SEED);

    // Stage 2: the full live recovery factory chain — proves
    // `fromSessionAsync`'s adopted `instance.session` (task 2.1) still
    // carries the seed after the adapted-units derivation step.
    const recovered = await InteractiveSession.fromSessionAsync(hydrated);
    expect(recovered.getSession().config.seed).toBe(SEED);
  });

  it('a direct construction that omits the seed round-trips with config.seed absent (D3 unchanged-behavior case)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SeededRandom } = require('@/simulation/core/SeededRandom') as {
      SeededRandom: new (seed: number) => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMinimalGrid } = require('../GameEngine.helpers') as {
      createMinimalGrid: (radius: number) => unknown;
    };

    const source = new InteractiveSession(
      6,
      4,
      new SeededRandom(1) as never,
      createMinimalGrid(6) as never,
      [makeAdaptedUnit('player-1', GameSide.Player)],
      [makeAdaptedUnit('opponent-1', GameSide.Opponent)],
      makeGameUnits(),
      // linkage, d6Roller, optionalRules, victoryConditions, seed — all
      // omitted, mirroring MP / most direct test constructions.
    );
    const sourceSession = source.getSession();
    expect(sourceSession.config.seed).toBeUndefined();

    const matchId = sourceSession.id;
    await Promise.all(
      sourceSession.events.map((event) => storage.appendEvent(matchId, event)),
    );

    const hydrated = await hydrateRecoverableSessionFromMatchLog(
      matchId,
      storage,
    );
    expect(hydrated.config.seed).toBeUndefined();

    const recovered = await InteractiveSession.fromSessionAsync(hydrated);
    expect(recovered.getSession().config.seed).toBeUndefined();
  });
});
