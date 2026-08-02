import { waitFor } from '@testing-library/react';

import { INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE } from '@/engine/InteractiveSession.persistence';
import {
  GameEventType,
  GameSide,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';

const mockAppendEvent = jest.fn<Promise<void>, [string, IGameEvent]>();
const mockFlushPendingWrites = jest.fn<Promise<void>, []>();
const mockUpsertMatchMetadata = jest.fn<Promise<void>, [unknown]>();
const mockCreateInteractiveSession = jest.fn();
const mockSetInteractiveSession = jest.fn();
const mockSetSpectatorMode = jest.fn();

jest.mock('@/engine/GameEngine', () => ({
  GameEngine: jest.fn().mockImplementation(() => ({
    createInteractiveSession: (...args: unknown[]) =>
      mockCreateInteractiveSession(...args),
  })),
}));

jest.mock('@/lib/p2p/matchLogStorage', () => ({
  matchLogStorage: {
    appendEvent: (...args: [string, IGameEvent]) => mockAppendEvent(...args),
    flushPendingWrites: () => mockFlushPendingWrites(),
    upsertMatchMetadata: (metadata: unknown) =>
      mockUpsertMatchMetadata(metadata),
  },
}));

jest.mock('@/stores/useGameplayStore', () => ({
  useGameplayStore: {
    getState: () => ({
      setInteractiveSession: mockSetInteractiveSession,
      setSpectatorMode: (...args: unknown[]) => mockSetSpectatorMode(...args),
    }),
  },
}));

jest.mock('@/stores/useQuickGameStore.helpers', () => ({
  adaptUnits: jest.fn(async () => []),
}));

import {
  createQuickGameInstance,
  createQuickGameUnit,
} from '@/types/quickgame';

import { useQuickGameStore } from '../useQuickGameStore';

const SESSION_ID = 'quick-session-id';
const MATCH_ID = 'quick-match-id';

function makeBootstrapSession(): IGameSession {
  const units: readonly IGameUnit[] = [
    {
      id: 'atlas-1',
      name: 'Atlas AS7-D',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'locust-1',
      name: 'Locust LCT-1V',
      side: GameSide.Opponent,
      unitRef: 'locust-lct-1v',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];

  return {
    ...startGame(
      createGameSession(
        {
          mapRadius: 7,
          turnLimit: 30,
          victoryConditions: ['elimination'],
          optionalRules: [],
        },
        units,
        { id: SESSION_ID },
      ),
      GameSide.Player,
    ),
    matchId: MATCH_ID,
  };
}

function installLaunchableQuickGame(): void {
  const opponent = createQuickGameUnit({
    sourceUnitId: 'locust-lct-1v',
    name: 'Locust LCT-1V',
    chassis: 'Locust',
    variant: 'LCT-1V',
    bv: 432,
    tonnage: 20,
    gunnery: 4,
    piloting: 5,
    maxArmor: {},
    maxStructure: {},
  });
  const game = createQuickGameInstance();

  useQuickGameStore.setState({
    game: {
      ...game,
      opponentForce: {
        name: 'Opposition',
        units: [opponent],
        totalBV: opponent.bv,
        totalTonnage: opponent.tonnage,
      },
    },
    isLoading: false,
    error: null,
    isDirty: false,
    seedOverride: 42,
  });
}

function expectBootstrapWrites(): void {
  expect(mockAppendEvent.mock.calls).toEqual([
    [MATCH_ID, expect.objectContaining({ type: GameEventType.GameCreated })],
    [MATCH_ID, expect.objectContaining({ type: GameEventType.GameStarted })],
  ]);
}

describe('useQuickGameStore bootstrap persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockAppendEvent.mockReset();
    mockFlushPendingWrites.mockReset();
    mockUpsertMatchMetadata.mockReset();
    mockCreateInteractiveSession.mockReset();
    mockSetInteractiveSession.mockReset();
    mockSetSpectatorMode.mockReset();
    mockAppendEvent.mockResolvedValue(undefined);
    mockFlushPendingWrites.mockResolvedValue(undefined);
    mockUpsertMatchMetadata.mockResolvedValue(undefined);
    mockCreateInteractiveSession.mockReturnValue({
      getSession: makeBootstrapSession,
    });
    installLaunchableQuickGame();
  });

  it('persists the interactive bootstrap before adopting the tactical session', async () => {
    const releaseWrites: (() => void)[] = [];
    mockAppendEvent.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseWrites.push(resolve);
        }),
    );

    const launch = useQuickGameStore.getState().startInteractiveSkirmish();

    await waitFor(() => expect(mockAppendEvent).toHaveBeenCalledTimes(2));
    expectBootstrapWrites();
    expect(mockSetInteractiveSession).not.toHaveBeenCalled();

    for (const release of releaseWrites) {
      release();
    }
    await expect(launch).resolves.toBeUndefined();

    expect(mockUpsertMatchMetadata).toHaveBeenCalledWith({
      matchId: MATCH_ID,
      status: 'active',
    });
    expect(mockSetInteractiveSession).toHaveBeenCalledTimes(1);
    expect(useQuickGameStore.getState().game?.activeTacticalSession).toEqual({
      id: MATCH_ID,
      mode: 'interactive',
    });
  });

  it('persists the spectator bootstrap before adopting the tactical session', async () => {
    const releaseWrites: (() => void)[] = [];
    mockAppendEvent.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseWrites.push(resolve);
        }),
    );

    const launch = useQuickGameStore.getState().startSpectatorMode();

    await waitFor(() => expect(mockAppendEvent).toHaveBeenCalledTimes(2));
    expectBootstrapWrites();
    expect(mockSetSpectatorMode).not.toHaveBeenCalled();

    for (const release of releaseWrites) {
      release();
    }
    await expect(launch).resolves.toBeUndefined();

    expect(mockUpsertMatchMetadata).toHaveBeenCalledWith({
      matchId: MATCH_ID,
      status: 'active',
    });
    expect(mockSetSpectatorMode).toHaveBeenCalledTimes(1);
    expect(useQuickGameStore.getState().game?.activeTacticalSession).toEqual({
      id: MATCH_ID,
      mode: 'spectator',
    });
  });

  it('keeps the interactive session unadopted when bootstrap persistence rejects', async () => {
    mockAppendEvent.mockRejectedValueOnce(new Error('IndexedDB blocked'));

    await expect(
      useQuickGameStore.getState().startInteractiveSkirmish(),
    ).resolves.toBeUndefined();

    expect(mockSetInteractiveSession).not.toHaveBeenCalled();
    expect(useQuickGameStore.getState().error).toBe(
      INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE,
    );
  });

  it('keeps the spectator session unadopted when bootstrap persistence rejects', async () => {
    mockAppendEvent.mockRejectedValueOnce(new Error('IndexedDB blocked'));

    await expect(
      useQuickGameStore.getState().startSpectatorMode(),
    ).resolves.toBeUndefined();

    expect(mockSetSpectatorMode).not.toHaveBeenCalled();
    expect(useQuickGameStore.getState().error).toBe(
      INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE,
    );
  });
});
