import 'fake-indexeddb/auto';
import type { NextRouter } from 'next/router';

import { act, renderHook } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';

import type { IForce } from '@/types/force';

import {
  _resetCombatOutcomeBus,
  subscribeToCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';
import {
  INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE,
  persistInteractiveLaunchRecoveryLog,
} from '@/engine/InteractiveSession.persistence';
import * as launchPersistence from '@/engine/InteractiveSession.persistence';
import {
  MatchLogStorage,
  type IMatchMetadataRecord,
} from '@/lib/p2p/matchLogStorage';
import {
  GameEventType,
  GameSide,
  GameStatus,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';
import {
  createGameSession,
  endGame,
  startGame,
} from '@/utils/gameplay/gameSession';

import {
  buildGameSessionRoute,
  publishAutoResolvedCampaignOutcome,
  usePreBattleLaunch,
} from '../usePreBattleLaunch';

const mockRunToCompletion = jest.fn();
const mockLinkEncounterSession = jest.fn();
const mockCompleteEncounterSession = jest.fn();
jest.mock('@/engine/InteractiveSession.persistence', () => {
  const actual = jest.requireActual<
    typeof import('@/engine/InteractiveSession.persistence')
  >('@/engine/InteractiveSession.persistence');
  return {
    __esModule: true,
    ...actual,
    persistInteractiveLaunchRecoveryLog: (
      ...args: Parameters<typeof actual.persistInteractiveLaunchRecoveryLog>
    ) => actual.persistInteractiveLaunchRecoveryLog(...args),
  };
});
jest.mock('@/engine/GameEngine', () => ({
  GameEngine: jest.fn().mockImplementation(() => ({
    runToCompletion: mockRunToCompletion,
  })),
}));
jest.mock('@/components/gameplay/pages/preBattleSessionBuilder', () => ({
  getAssignedUnitIds: () => ['unit'],
  buildPreparedBattleData: async () => ({
    playerAdapted: [{ id: 'player' }],
    opponentAdapted: [{ id: 'opponent' }],
    gameUnits: [],
  }),
}));
jest.mock('@/services/encounter/encounterLifecycleClient', () => ({
  linkEncounterSession: (session: IGameSession, options: unknown) =>
    mockLinkEncounterSession(session, options),
  completeEncounterSession: (session: IGameSession) =>
    mockCompleteEncounterSession(session),
}));

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

describe('pre-battle launch campaign linkage helpers', () => {
  afterEach(() => {
    _resetCombatOutcomeBus();
  });

  it('keeps campaign and mission context in game-session navigation', () => {
    expect(
      buildGameSessionRoute('sess_linked', {
        campaignId: 'campaign-alpha',
        contractId: 'contract-17',
        scenarioId: 'scenario-3',
        missionId: 'mission-9',
      }),
    ).toBe(
      '/gameplay/games/sess_linked?campaignId=campaign-alpha&missionId=mission-9',
    );
  });

  it('falls back to contract or scenario context when no mission query exists', () => {
    expect(
      buildGameSessionRoute('sess_contract', {
        campaignId: 'campaign-alpha',
        contractId: 'contract-17',
        scenarioId: 'scenario-3',
      }),
    ).toBe(
      '/gameplay/games/sess_contract?campaignId=campaign-alpha&missionId=contract-17',
    );

    expect(
      buildGameSessionRoute('sess_scenario', {
        campaignId: 'campaign-alpha',
        scenarioId: 'scenario-3',
      }),
    ).toBe(
      '/gameplay/games/sess_scenario?campaignId=campaign-alpha&missionId=scenario-3',
    );
  });

  it('leaves standalone sessions on the plain game route', () => {
    expect(buildGameSessionRoute('sess_standalone')).toBe(
      '/gameplay/games/sess_standalone',
    );
    expect(
      buildGameSessionRoute('sess_no_campaign', {
        contractId: 'contract-17',
        scenarioId: 'scenario-3',
      }),
    ).toBe('/gameplay/games/sess_no_campaign');
  });

  it('publishes an auto-resolved campaign outcome when contract linkage exists', () => {
    const events: ICombatOutcomeReadyEvent[] = [];
    const unsubscribe = subscribeToCombatOutcome((event) => {
      events.push(event);
    });
    const base = createGameSession(
      {
        ...makeConfig(),
        campaignId: 'campaign-alpha',
        contractId: 'contract-17',
        scenarioId: 'scenario-3',
      },
      makeUnits(),
      {
        id: 'sess_auto_campaign_outcome',
        createdAt: '2026-06-21T00:00:00.000Z',
      },
    );
    const active = startGame(base, GameSide.Player);
    const completed = endGame(active, GameSide.Player, 'destruction');

    expect(
      publishAutoResolvedCampaignOutcome(completed, {
        campaignId: 'campaign-alpha',
        contractId: 'contract-17',
        scenarioId: 'scenario-3',
      }),
    ).toBe(true);

    expect(events).toHaveLength(1);
    expect(events[0]?.matchId).toBe('sess_auto_campaign_outcome');
    expect(events[0]?.outcome.contractId).toBe('contract-17');
    expect(events[0]?.outcome.scenarioId).toBe('scenario-3');
    unsubscribe();
  });

  it('does not publish standalone auto-resolve outcomes to campaign subscribers', () => {
    const events: ICombatOutcomeReadyEvent[] = [];
    const unsubscribe = subscribeToCombatOutcome((event) => {
      events.push(event);
    });
    const completed = endGame(
      startGame(
        createGameSession(makeConfig(), makeUnits(), {
          id: 'sess_auto_standalone',
          createdAt: '2026-06-21T00:00:00.000Z',
        }),
        GameSide.Player,
      ),
      GameSide.Player,
      'destruction',
    );

    expect(publishAutoResolvedCampaignOutcome(completed)).toBe(false);
    expect(events).toHaveLength(0);
    unsubscribe();
  });
});

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
    ).resolves.toBeUndefined();

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

  it('rejects launch when recovery storage is unavailable', async () => {
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
    ).rejects.toThrow(INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE);

    expect(storage.upsertMatchMetadata).not.toHaveBeenCalled();
  });

  it('rejects launch when active-match metadata cannot be persisted', async () => {
    const session = startGame(
      createGameSession(makeConfig(), makeUnits(), {
        id: 'sess_launch_metadata_failure',
        createdAt: '2026-06-21T00:00:00.000Z',
      }),
      GameSide.Player,
    );
    const storage = {
      appendEvent: jest.fn().mockResolvedValue(undefined),
      flushPendingWrites: jest.fn().mockResolvedValue(undefined),
      upsertMatchMetadata: jest
        .fn()
        .mockRejectedValue(new Error('metadata write failed')),
    };

    await expect(
      persistInteractiveLaunchRecoveryLog(session, storage),
    ).rejects.toThrow(INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE);

    expect(storage.appendEvent).toHaveBeenCalledTimes(session.events.length);
    expect(storage.flushPendingWrites).toHaveBeenCalledTimes(1);
    expect(storage.upsertMatchMetadata).toHaveBeenCalledWith({
      matchId: session.id,
      status: 'active',
    });
  });

  it('rejects launch when appending the recovery log throws synchronously', async () => {
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
    ).rejects.toThrow(INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE);

    expect(storage.flushPendingWrites).not.toHaveBeenCalled();
    expect(storage.upsertMatchMetadata).not.toHaveBeenCalled();
  });
});

describe('auto-resolve navigation recovery', () => {
  beforeEach(() => {
    mockRunToCompletion.mockReset();
    mockLinkEncounterSession.mockReset().mockResolvedValue(undefined);
    mockCompleteEncounterSession.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function completedSession(): IGameSession {
    return endGame(
      startGame(
        createGameSession(
          {
            ...makeConfig(),
            encounterId: 'auto-recovery-encounter',
            seed: 424242,
          },
          makeUnits(),
          {
            id: 'auto-recovery-session',
            createdAt: '2026-06-21T00:00:00.000Z',
          },
        ),
        GameSide.Player,
      ),
      GameSide.Player,
      'destruction',
    );
  }

  function launchHook(push: NextRouter['push']) {
    const publish = jest.fn();
    const showToast = jest.fn();
    const { result } = renderHook(() =>
      usePreBattleLaunch({
        playerForce: { id: 'player' } as IForce,
        opponentForce: { id: 'opponent' } as IForce,
        pilots: [],
        mapConfig: undefined,
        router: { push } as NextRouter,
        setSession: publish,
        setInteractiveSession: jest.fn(),
        setSpectatorMode: jest.fn(),
        setIsResolving: jest.fn(),
        showToast,
      }),
    );
    return { result, publish, showToast };
  }

  it('commits completed recovery history before a navigation can discard memory', async () => {
    const session = completedSession();
    mockRunToCompletion.mockReturnValue(session);
    const database = new IDBFactory();
    const options = {
      dbName: 'auto-resolve-navigation-recovery',
      indexedDB: database,
      scheduleFrame: () => undefined,
    };
    const writer = new MatchLogStorage(options);
    const reader = new MatchLogStorage(options);
    let releaseCommit: () => void = () => undefined;
    const commitGate = new Promise<void>((resolve) => {
      releaseCommit = resolve;
    });
    const flush = writer.flushPendingWrites;
    jest.spyOn(writer, 'flushPendingWrites').mockImplementation(async () => {
      await commitGate;
      await flush();
    });
    const persist = launchPersistence.persistInteractiveLaunchRecoveryLog;
    let pendingPersistence: Promise<void> | undefined;
    jest
      .spyOn(launchPersistence, 'persistInteractiveLaunchRecoveryLog')
      .mockImplementation((value) => {
        pendingPersistence = persist(value, writer);
        return pendingPersistence;
      });
    const recovered: IGameSession[] = [];
    const push = jest.fn(async () => {
      // A route fallback/reload has lost the launching runtime and its store.
      recovered.push(
        await launchPersistence.hydrateRecoverableSessionFromMatchLog(
          session.id,
          reader,
        ),
      );
      return true;
    });
    const hook = launchHook(push);
    let launch = Promise.resolve();
    try {
      await act(async () => {
        launch = hook.result.current('auto');
      });

      expect(await reader.getEventsForMatch(session.id)).toEqual([]);
      expect(mockLinkEncounterSession).not.toHaveBeenCalled();
      expect(mockCompleteEncounterSession).not.toHaveBeenCalled();
      expect(hook.publish).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();

      releaseCommit();
      await act(async () => launch);

      expect(push).toHaveBeenCalledWith(`/gameplay/games/${session.id}`);
      expect(recovered).toHaveLength(1);
      expect(recovered[0].currentState).toEqual(session.currentState);
      expect(recovered[0].currentState.status).toBe(GameStatus.Completed);
      expect(recovered[0].config).toEqual(session.config);
      expect(recovered[0].events.map((event) => event.id)).toEqual(
        session.events.map((event) => event.id),
      );
      expect(recovered[0].events.at(-1)?.type).toBe(GameEventType.GameEnded);
      expect(await reader.getMatchMetadata(session.id)).toMatchObject({
        matchId: session.id,
        status: 'completed',
      });
    } finally {
      releaseCommit();
      await launch;
      await pendingPersistence;
      writer.close();
      reader.close();
    }
  });

  it('keeps the encounter launchable when completed history cannot be saved', async () => {
    mockRunToCompletion.mockReturnValue(completedSession());
    jest
      .spyOn(launchPersistence, 'persistInteractiveLaunchRecoveryLog')
      .mockRejectedValue(
        new Error(INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE),
      );
    const push = jest.fn().mockResolvedValue(true);
    const hook = launchHook(push);

    await act(async () => hook.result.current('auto'));

    expect(mockLinkEncounterSession).not.toHaveBeenCalled();
    expect(mockCompleteEncounterSession).not.toHaveBeenCalled();
    expect(hook.publish).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(hook.showToast).toHaveBeenCalledWith({
      message: INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE,
      variant: 'error',
    });
  });
});
