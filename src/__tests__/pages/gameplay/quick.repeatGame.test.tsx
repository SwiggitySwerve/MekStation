import 'fake-indexeddb/auto';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';

import type { IAdaptedUnit } from '@/engine/types';
import type { IGameUnit } from '@/types/gameplay';

import { GameEngine } from '@/engine/GameEngine';
import {
  flushMatchLogWrites,
  matchLogStorage,
} from '@/lib/p2p/matchLogStorage';
import QuickGamePage from '@/pages/gameplay/quick';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import {
  Facing,
  GameEventType,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
} from '@/types/gameplay';
import {
  createQuickGameInstance,
  createQuickGameUnit,
  QuickGameStep,
  QUICK_GAME_STORAGE_KEY,
} from '@/types/quickgame';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

const mockRouterPush = jest.fn<Promise<boolean>, [string]>();
const mockRouter = {
  push: mockRouterPush,
  asPath: '/gameplay/quick',
  pathname: '/gameplay/quick',
  query: {},
  events: { on: jest.fn(), off: jest.fn() },
};

jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock('next/head', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/gameplay/games/[id]', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/services/units/quickGameSavedDesigns', () => ({
  listQuickGameSavedDesigns: jest.fn(async () => []),
  loadQuickGameSavedDesign: jest.fn(),
}));

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

function adaptedUnit(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: -3 } : { q: 0, r: 3 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { head: 9, center_torso: 31 },
    structure: { head: 3, center_torso: 21 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function installLinkedBattle() {
  const player = createQuickGameUnit({
    sourceUnitId: 'atlas-as7-d',
    name: 'Atlas',
    chassis: 'Atlas',
    variant: 'AS7-D',
    bv: 1897,
    tonnage: 100,
    gunnery: 4,
    piloting: 5,
    maxArmor: { head: 9, center_torso: 31 },
    maxStructure: { head: 3, center_torso: 21 },
  });
  const opponent = createQuickGameUnit({
    sourceUnitId: 'locust-lct-1v',
    name: 'Locust',
    chassis: 'Locust',
    variant: 'LCT-1V',
    bv: 432,
    tonnage: 20,
    gunnery: 4,
    piloting: 5,
    maxArmor: { head: 9, center_torso: 31 },
    maxStructure: { head: 3, center_torso: 21 },
  });
  const units: IGameUnit[] = [
    {
      id: player.instanceId,
      name: player.name,
      side: GameSide.Player,
      unitRef: player.sourceUnitId,
      pilotRef: 'player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: opponent.instanceId,
      name: opponent.name,
      side: GameSide.Opponent,
      unitRef: opponent.sourceUnitId,
      pilotRef: 'opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
  const interactive = new GameEngine({
    seed: 42,
    mapRadius: 5,
    turnLimit: 20,
  }).createInteractiveSession(
    [adaptedUnit(player.instanceId, GameSide.Player)],
    [adaptedUnit(opponent.instanceId, GameSide.Opponent)],
    units,
  );
  useGameplayStore.getState().setInteractiveSession(interactive);
  const session = interactive.getSession();
  const game = createQuickGameInstance();
  game.status = GameStatus.Active;
  game.step = QuickGameStep.Playing;
  game.playerForce = {
    name: 'Player',
    units: [player],
    totalBV: player.bv,
    totalTonnage: player.tonnage,
  };
  game.opponentForce = {
    name: 'Opponent',
    units: [opponent],
    totalBV: opponent.bv,
    totalTonnage: opponent.tonnage,
  };
  game.activeTacticalSession = {
    id: session.matchId ?? session.id,
    mode: 'interactive',
  };
  useQuickGameStore.setState({
    game,
    isLoading: false,
    error: null,
    isDirty: false,
  });
  return { interactive, game };
}

function finishBattle(side: GameSide) {
  const battle = installLinkedBattle();
  const prefix = battle.interactive.getSession().events;
  battle.interactive.concede(side);
  expect(useGameplayStore.getState().checkGameOver()).toBe(true);
  const terminal = battle.interactive.getSession();
  expect(terminal.currentState.status).toBe(GameStatus.Completed);
  expect(terminal.events.slice(0, prefix.length)).toEqual(prefix);
  expect(
    terminal.events.filter((event) => event.type === GameEventType.GameEnded),
  ).toHaveLength(1);
  return { ...battle, terminal };
}

describe('Quick Game entry after a genuine tactical completion', () => {
  beforeEach(() => {
    matchLogStorage.close();
    Object.defineProperty(globalThis, 'indexedDB', {
      value: new IDBFactory(),
      writable: true,
      configurable: true,
    });
    sessionStorage.clear();
    useQuickGameStore.getState().clearGame();
    useGameplayStore.setState({
      session: null,
      interactiveSession: null,
      spectatorMode: null,
    });
    mockRouterPush.mockReset().mockResolvedValue(true);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
  });

  afterEach(async () => {
    cleanup();
    jest.restoreAllMocks();
    jest.useRealTimers();
    await flushMatchLogWrites();
    matchLogStorage.close();
  });

  it.each([GameSide.Player, GameSide.Opponent])(
    'opens the recorded result and restart controls after %s concedes',
    async (side) => {
      const { game, terminal } = finishBattle(side);
      render(<QuickGamePage />);
      expect(
        await screen.findByTestId('play-again-same-btn'),
      ).toBeInTheDocument();
      expect(mockRouterPush).not.toHaveBeenCalled();
      expect(useQuickGameStore.getState().game).toEqual({
        ...game,
        status: GameStatus.Completed,
        step: QuickGameStep.Results,
        winner: side === GameSide.Player ? 'opponent' : 'player',
        victoryReason: 'concede',
        events: terminal.events,
        turn: terminal.currentState.turn,
        endedAt: terminal.events.find(
          (event) => event.type === GameEventType.GameEnded,
        )!.timestamp,
      });
      expect(useGameplayStore.getState().session).toBe(terminal);
    },
  );

  it.each([
    ['play-again-same-btn', true],
    ['play-again-new-btn', false],
  ] as const)(
    'starts a new setup through %s without changing the old match log',
    async (button, keepUnits) => {
      const { game, terminal } = finishBattle(GameSide.Player);
      render(<QuickGamePage />);
      fireEvent.click(await screen.findByTestId(button));
      expect(
        await screen.findByRole('heading', { name: 'Select Your Units' }),
      ).toBeInTheDocument();
      const next = useQuickGameStore.getState().game!;
      expect(next.id).not.toBe(game.id);
      expect(next).toMatchObject({
        status: GameStatus.Setup,
        step: QuickGameStep.SelectUnits,
        activeTacticalSession: null,
        events: [],
        winner: null,
        endedAt: null,
      });
      expect(next.playerForce.units).toHaveLength(keepUnits ? 1 : 0);
      if (keepUnits)
        expect(next.playerForce.units[0]).toMatchObject({
          sourceUnitId: game.playerForce.units[0].sourceUnitId,
          armor: game.playerForce.units[0].maxArmor,
        });
      expect(useGameplayStore.getState().session).toBe(terminal);
      expect(mockRouterPush).not.toHaveBeenCalled();
    },
  );

  it('exits completed results through the existing clear and Games navigation', async () => {
    const { terminal } = finishBattle(GameSide.Player);
    render(<QuickGamePage />);
    fireEvent.click(await screen.findByTestId('exit-btn'));
    expect(useQuickGameStore.getState().game).toBeNull();
    expect(mockRouterPush).toHaveBeenCalledWith('/gameplay/games');
    expect(useGameplayStore.getState().session).toBe(terminal);
  });

  it('reconciles restored Playing state with a public rehydrated terminal log', async () => {
    const { game, terminal } = finishBattle(GameSide.Player);
    const persisted = sessionStorage.getItem(QUICK_GAME_STORAGE_KEY)!;
    useQuickGameStore.getState().clearGame();
    sessionStorage.setItem(QUICK_GAME_STORAGE_KEY, persisted);
    await useQuickGameStore.persist.rehydrate();
    expect(useQuickGameStore.getState().game).toEqual(game);
    const replay = hydrateGameSessionFromEvents(terminal.id, terminal.events);
    expect(replay.currentState.result).toEqual(terminal.currentState.result);
    useGameplayStore.getState().setSession(replay);
    render(<QuickGamePage />);
    expect(
      await screen.findByTestId('play-again-same-btn'),
    ).toBeInTheDocument();
    expect(useQuickGameStore.getState().game?.events).toEqual(terminal.events);
    expect(mockRouterPush).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/replay-library/quick',
        expect.objectContaining({ method: 'POST', body: expect.any(String) }),
      ),
    );
    const calls = jest
      .mocked(globalThis.fetch)
      .mock.calls.filter(([url]) => url === '/api/replay-library/quick');
    expect(calls).toHaveLength(1);
    const body = JSON.parse(String(calls[0][1]?.body));
    expect(body).toMatchObject({ gameId: game.id, winner: 'opponent' });
    expect(body.events).toEqual(JSON.parse(JSON.stringify(terminal.events)));
  });
});
