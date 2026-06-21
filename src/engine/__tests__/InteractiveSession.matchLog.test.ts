import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

let mockAppendMatchEvent: jest.Mock;
let mockToast: jest.Mock;

jest.mock('@/lib/p2p/matchLogStorage', () => {
  const actual = jest.requireActual('@/lib/p2p/matchLogStorage');
  return {
    ...actual,
    matchLogStorage: {
      appendEvent: jest.fn(),
      getEventsForMatch: jest.fn(),
      getLastSequence: jest.fn(),
    },
  };
});

jest.mock('@/components/shared/Toast', () => ({
  toast: jest.fn(),
}));

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

import type { IWeapon } from '@/simulation/ai/types';

import { toast } from '@/components/shared/Toast';
import { MatchLogStorage, matchLogStorage } from '@/lib/p2p/matchLogStorage';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GamePhase,
  GameSide,
  LockState,
  type IGameConfig,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import {
  createGameStartedEvent,
  createPhaseChangedEvent,
} from '@/utils/gameplay/gameEvents';
import {
  advancePhase,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSession';

import type { IAdaptedUnit } from '../types';

import { createMinimalGrid } from '../GameEngine.helpers';
import { InteractiveSession } from '../InteractiveSession';

const MATCH_ID = 'sess_rehydrate';
const APPEND_MATCH_ID = 'sess_append';
const MATCH_LOG_DIVERGENCE_MESSAGE =
  'Match log save failed — local state may diverge';

interface IAppendAndPersistHarness {
  session: IGameSession;
  appendEvent: (event: IGameEvent) => void;
  hasMatchLogDiverged: () => boolean;
  isMatchLogHealthy: () => boolean;
}

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

function makeInteractiveSession(): InteractiveSession {
  const playerUnits = [makeAdaptedUnit('unit-player', GameSide.Player)];
  const opponentUnits = [makeAdaptedUnit('unit-opponent', GameSide.Opponent)];
  return new InteractiveSession(
    7,
    30,
    new SeededRandom(42),
    createMinimalGrid(7),
    playerUnits,
    opponentUnits,
    makeUnits(),
  );
}

function makeAppendHarness(): IAppendAndPersistHarness {
  const interactiveSession =
    makeInteractiveSession() as unknown as IAppendAndPersistHarness;
  interactiveSession.session = createGameSession(makeConfig(), makeUnits(), {
    id: APPEND_MATCH_ID,
    createdAt: '2026-04-30T00:00:00.000Z',
  });
  return interactiveSession;
}

function makeAppendEvents(): readonly IGameEvent[] {
  const phaseChanges: readonly [GamePhase, GamePhase][] = [
    [GamePhase.Initiative, GamePhase.Movement],
    [GamePhase.Movement, GamePhase.WeaponAttack],
    [GamePhase.WeaponAttack, GamePhase.PhysicalAttack],
    [GamePhase.PhysicalAttack, GamePhase.Heat],
  ];

  return [
    createGameStartedEvent(APPEND_MATCH_ID, 1, GameSide.Player),
    ...phaseChanges.map(([fromPhase, toPhase], index) =>
      createPhaseChangedEvent(
        APPEND_MATCH_ID,
        index + 2,
        1,
        fromPhase,
        toPhase,
      ),
    ),
  ];
}

async function settlePersistenceRejection(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
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
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    installFreshIndexedDB();
    mockAppendMatchEvent = matchLogStorage.appendEvent as jest.Mock;
    mockToast = toast as jest.Mock;
    mockAppendMatchEvent.mockReset();
    mockToast.mockReset();
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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

  it('surfaces a toast when the disk tail sequence differs from the hydrated in-memory log', async () => {
    const original = buildTwentyEventSession();
    const storage = {
      getEventsForMatch: jest.fn().mockResolvedValue(original.events),
      getLastSequence: jest.fn().mockResolvedValue(99),
    };

    await InteractiveSession.fromMatchLog(MATCH_ID, storage);

    expect(mockToast).toHaveBeenCalledWith({
      message: MATCH_LOG_DIVERGENCE_MESSAGE,
      variant: 'error',
    });
  });
});

describe('InteractiveSession match log persistence wiring', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAppendMatchEvent = matchLogStorage.appendEvent as jest.Mock;
    mockToast = toast as jest.Mock;
    mockAppendMatchEvent.mockReset();
    mockToast.mockReset();
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('persists five successful in-memory appends to match log storage by match id and sequence', () => {
    const records: { matchId: string; sequence: number }[] = [];
    mockAppendMatchEvent.mockImplementation(
      async (matchId: string, event: IGameEvent) => {
        records.push({ matchId, sequence: event.sequence });
        return {
          matchId,
          sequence: event.sequence,
          event,
          savedAt: '2026-04-30T00:00:00.000Z',
        };
      },
    );
    const harness = makeAppendHarness();

    for (const event of makeAppendEvents()) {
      harness.appendEvent(event);
    }

    expect(harness.session.events).toHaveLength(6);
    expect(records).toEqual(
      Array.from({ length: 5 }, (_, index) => ({
        matchId: APPEND_MATCH_ID,
        sequence: index + 1,
      })),
    );
  });

  it('keeps the in-memory append when match log persistence rejects and reports the failure', async () => {
    const error = new Error('IndexedDB write failed');
    mockAppendMatchEvent.mockRejectedValueOnce(error);
    const harness = makeAppendHarness();
    const [event] = makeAppendEvents();

    harness.appendEvent(event);
    await settlePersistenceRejection();

    expect(harness.session.events).toContain(event);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      MATCH_LOG_DIVERGENCE_MESSAGE,
      error,
    );
    expect(mockToast).toHaveBeenCalledWith({
      message: MATCH_LOG_DIVERGENCE_MESSAGE,
      variant: 'error',
    });
  });

  it('marks the session match log diverged when persistence rejects', async () => {
    const error = new Error('IndexedDB write failed');
    mockAppendMatchEvent.mockRejectedValueOnce(error);
    const harness = makeAppendHarness();
    const [event] = makeAppendEvents();

    expect(harness.hasMatchLogDiverged()).toBe(false);
    expect(harness.isMatchLogHealthy()).toBe(true);

    harness.appendEvent(event);
    await settlePersistenceRejection();

    expect(harness.hasMatchLogDiverged()).toBe(true);
    expect(harness.isMatchLogHealthy()).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      MATCH_LOG_DIVERGENCE_MESSAGE,
      error,
    );
  });
});
