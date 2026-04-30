import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

import { MatchLogStorage } from '@/lib/p2p/matchLogStorage';
import {
  GameSide,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSession';

import { InteractiveSession } from '../InteractiveSession';

const MATCH_ID = 'sess_rehydrate';

function installFreshIndexedDB(): void {
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
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
      id: 'unit-player',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'unit-opponent',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function buildTwentyEventSession(): IGameSession {
  let session = createGameSession(makeConfig(), makeUnits(), {
    id: MATCH_ID,
    createdAt: '2026-04-30T00:00:00.000Z',
  });
  session = startGame(session, GameSide.Player);

  while (session.events.length < 20) {
    session = advancePhase(session);
  }

  return session;
}

describe('InteractiveSession.fromMatchLog', () => {
  beforeEach(() => {
    installFreshIndexedDB();
  });

  it('hydrates a persisted match log into an equivalent game session', async () => {
    const storage = new MatchLogStorage({
      dbName: 'interactive-session-match-log-test',
      now: () => '2026-04-30T00:00:00.000Z',
    });
    const original = buildTwentyEventSession();

    await Promise.all(
      original.events.map((event) => storage.appendEvent(MATCH_ID, event)),
    );

    const hydrated = await InteractiveSession.fromMatchLog(MATCH_ID, storage);

    expect(hydrated.id).toBe(MATCH_ID);
    expect(hydrated.matchId).toBe(MATCH_ID);
    expect(hydrated.events).toHaveLength(20);
    expect(hydrated.events.map((event) => event.sequence)).toEqual(
      Array.from({ length: 20 }, (_, sequence) => sequence),
    );
    expect(hydrated.currentState).toEqual(original.currentState);
    storage.close();
  });

  it('throws a clear error for an unknown match id', async () => {
    const storage = new MatchLogStorage({
      dbName: 'interactive-session-missing-log-test',
      now: () => '2026-04-30T00:00:00.000Z',
    });

    await expect(
      InteractiveSession.fromMatchLog('sess_missing', storage),
    ).rejects.toThrow('Match log not found');
    storage.close();
  });
});
