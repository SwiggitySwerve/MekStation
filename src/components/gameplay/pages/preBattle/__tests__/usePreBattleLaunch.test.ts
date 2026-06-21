import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import {
  MatchLogStorage,
  type IMatchMetadataRecord,
} from '@/lib/p2p/matchLogStorage';
import {
  GameEventType,
  GameSide,
  type IGameConfig,
  type IGameUnit,
} from '@/types/gameplay';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';

import { persistInteractiveLaunchRecoveryLog } from '../usePreBattleLaunch';

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

function makeConfig(): IGameConfig {
  return {
    mapRadius: 7,
    turnLimit: 30,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function makeUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'atlas-as7-d',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'marauder-mad-3r',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

describe('persistInteractiveLaunchRecoveryLog', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      value: new IDBFactory(),
      writable: true,
      configurable: true,
    });
  });

  it('flushes a recoverable GameCreated log and metadata before navigation', async () => {
    const storage = new MatchLogStorage({
      dbName: 'pre-battle-launch-recovery-test',
      now: () => '2026-06-21T00:00:00.000Z',
      scheduleFrame: (callback) => callback(),
    });
    const base = createGameSession(makeConfig(), makeUnits(), {
      id: 'sess_launch_recoverable',
      createdAt: '2026-06-21T00:00:00.000Z',
    });
    const session = startGame(base, GameSide.Player);

    await expect(
      persistInteractiveLaunchRecoveryLog(session, storage),
    ).resolves.toBe(true);

    const events = await storage.getEventsForMatch(session.id);
    const metadata = (await storage.getMatchMetadata(
      session.id,
    )) as IMatchMetadataRecord;

    expect(events).toHaveLength(session.events.length);
    expect(events[0]?.type).toBe(GameEventType.GameCreated);
    expect(metadata).toMatchObject({
      matchId: session.id,
      status: 'active',
    });
    storage.close();
  });

  it('returns false without crashing when launch recovery storage is unavailable', async () => {
    const session = startGame(
      createGameSession(makeConfig(), makeUnits(), {
        id: 'sess_launch_storage_unavailable',
        createdAt: '2026-06-21T00:00:00.000Z',
      }),
      GameSide.Player,
    );
    const storage = {
      appendEvent: jest.fn().mockRejectedValue(new Error('IndexedDB blocked')),
      flushPendingWrites: jest
        .fn()
        .mockRejectedValue(new Error('flush failed')),
      upsertMatchMetadata: jest.fn(),
    };

    await expect(
      persistInteractiveLaunchRecoveryLog(session, storage),
    ).resolves.toBe(false);

    expect(storage.upsertMatchMetadata).not.toHaveBeenCalled();
  });

  it('returns false without crashing when appending the launch log throws synchronously', async () => {
    const session = startGame(
      createGameSession(makeConfig(), makeUnits(), {
        id: 'sess_launch_sync_storage_failure',
        createdAt: '2026-06-21T00:00:00.000Z',
      }),
      GameSide.Player,
    );
    const storage = {
      appendEvent: jest.fn(() => {
        throw new Error('IndexedDB blocked before queueing');
      }),
      flushPendingWrites: jest.fn(),
      upsertMatchMetadata: jest.fn(),
    };

    await expect(
      persistInteractiveLaunchRecoveryLog(session, storage),
    ).resolves.toBe(false);

    expect(storage.flushPendingWrites).not.toHaveBeenCalled();
    expect(storage.upsertMatchMetadata).not.toHaveBeenCalled();
  });
});
