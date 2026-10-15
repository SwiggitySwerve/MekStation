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

import * as compendiumAdapter from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import {
  hydrateRecoverableSessionWithReport,
  persistInteractiveLaunchRecoveryLog,
} from '@/engine/InteractiveSession.persistence';
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
jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  ...jest.requireActual('@/engine/adapters/CompendiumAdapter'),
  adaptUnit: jest.fn(),
}));

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

const armor = {
  head: 9,
  center_torso: 31,
  left_torso: 22,
  right_torso: 22,
  left_arm: 17,
  right_arm: 17,
  left_leg: 21,
  right_leg: 21,
};
const structure = {
  head: 3,
  center_torso: 21,
  left_torso: 14,
  right_torso: 14,
  left_arm: 11,
  right_arm: 11,
  left_leg: 14,
  right_leg: 14,
};

function adaptedUnit(id: string, side: GameSide, armed = false): IAdaptedUnit {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: -3 } : { q: 0, r: 3 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { ...armor },
    structure: { ...structure },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: armed
      ? [
          {
            id: `${id}-laser`,
            name: 'Medium Laser',
            shortRange: 9,
            mediumRange: 12,
            longRange: 15,
            minRange: 0,
            damage: 5,
            heat: 3,
            ammoPerTon: -1,
            destroyed: false,
          },
        ]
      : [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function installLinkedBattle(armed = false) {
  const player = createQuickGameUnit({
    sourceUnitId: 'atlas-as7-d',
    name: 'Atlas',
    chassis: 'Atlas',
    variant: 'AS7-D',
    bv: 1897,
    tonnage: 100,
    gunnery: 4,
    piloting: 5,
    maxArmor: { ...armor },
    maxStructure: { ...structure },
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
    maxArmor: { ...armor },
    maxStructure: { ...structure },
  });
  const units: IGameUnit[] = [
    {
      id: player.instanceId,
      name: player.name,
      side: GameSide.Player,
      unitRef: player.sourceUnitId,
      pilotRef: 'player',
      gunnery: armed ? 0 : 4,
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
    [adaptedUnit(player.instanceId, GameSide.Player, armed)],
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
    jest.mocked(compendiumAdapter.adaptUnit).mockReset();
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

  it('retains detailed results after reload without a preloaded GameplayStore session', async () => {
    jest.useFakeTimers({
      now: new Date('2026-10-13T06:00:00Z'),
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
      ],
    });
    const { interactive, game } = installLinkedBattle(true);
    await persistInteractiveLaunchRecoveryLog(interactive.getSession());
    interactive.advancePhase();
    interactive.advancePhase();
    const player = game.playerForce.units[0].instanceId;
    const opponent = game.opponentForce!.units[0].instanceId;
    jest.setSystemTime(new Date('2026-10-13T06:06:00Z'));
    interactive.applyAttack(player, opponent, [`${player}-laser`]);
    interactive.advancePhase();
    expect(
      interactive
        .getSession()
        .events.some((event) => event.type === GameEventType.DamageApplied),
    ).toBe(true);
    interactive.concede(GameSide.Player);
    useGameplayStore.getState().checkGameOver();
    await flushMatchLogWrites();
    const recovered = await hydrateRecoverableSessionWithReport(
      interactive.getSession().id,
    );
    expect(recovered.session.currentState.result).toEqual(
      interactive.getSession().currentState.result,
    );
    const first = render(<QuickGamePage />);
    expect(
      await screen.findByText('Player conceded the battle.'),
    ).toBeInTheDocument();
    expect(screen.getByText('6 min')).toBeInTheDocument();
    expect(screen.getByText('Damage Dealt')).toBeInTheDocument();
    const before = screen.getByRole('tabpanel', {
      name: 'Summary',
    }).textContent;
    const persisted = sessionStorage.getItem(QUICK_GAME_STORAGE_KEY)!;
    first.unmount();
    useQuickGameStore.getState().clearGame();
    sessionStorage.setItem(QUICK_GAME_STORAGE_KEY, persisted);
    await useQuickGameStore.persist.rehydrate();
    useGameplayStore.setState({
      session: null,
      interactiveSession: null,
      spectatorMode: null,
    });
    jest.setSystemTime(new Date('2026-10-13T07:00:00Z'));
    render(<QuickGamePage />);
    expect(
      await screen.findByText('Player conceded the battle.'),
    ).toBeInTheDocument();
    expect(screen.getByText('6 min')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: 'Summary' }).textContent).toBe(
      before,
    );
    expect(useGameplayStore.getState().session).toBeNull();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('opens an old terminal tactical link on the first cold Quick Game entry', async () => {
    const { interactive, game } = installLinkedBattle();
    await persistInteractiveLaunchRecoveryLog(interactive.getSession());
    const persistedPlaying = sessionStorage.getItem(QUICK_GAME_STORAGE_KEY)!;
    interactive.concede(GameSide.Player);
    await flushMatchLogWrites();
    useQuickGameStore.getState().clearGame();
    sessionStorage.setItem(QUICK_GAME_STORAGE_KEY, persistedPlaying);
    await useQuickGameStore.persist.rehydrate();
    useGameplayStore.setState({
      session: null,
      interactiveSession: null,
      spectatorMode: null,
    });
    render(<QuickGamePage />);
    expect(
      await screen.findByTestId('play-again-same-btn'),
    ).toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(useQuickGameStore.getState().game).toMatchObject({
      id: game.id,
      status: GameStatus.Completed,
      winner: 'opponent',
    });
    expect(useGameplayStore.getState().session).toBeNull();
  });

  it('keeps detailed Results for the current unlinked auto-resolve session', async () => {
    const { game } = installLinkedBattle();
    jest
      .mocked(compendiumAdapter.adaptUnit)
      .mockResolvedValueOnce(adaptedUnit('player', GameSide.Player))
      .mockResolvedValueOnce(adaptedUnit('opponent', GameSide.Opponent));
    useQuickGameStore.setState({
      game: { ...game, activeTacticalSession: null },
      seedOverride: 42,
    });
    await useQuickGameStore.getState().startBattle();
    expect(useQuickGameStore.getState().game?.status).toBe(
      GameStatus.Completed,
    );
    expect(useQuickGameStore.getState().game?.activeTacticalSession).toBeNull();
    render(<QuickGamePage />);
    expect(
      await screen.findByTestId('play-again-same-btn'),
    ).toBeInTheDocument();
    expect(screen.getByText('Damage Dealt')).toBeInTheDocument();
    expect(
      screen.queryByText(/Detailed battle results are unavailable/),
    ).not.toBeInTheDocument();
  });

  it('keeps restart and exit usable when recorded details cannot be recovered', async () => {
    const { game, terminal } = finishBattle(GameSide.Player);
    useQuickGameStore.getState().reconcileTacticalCompletion(game.id, terminal);
    useGameplayStore.setState({
      session: null,
      interactiveSession: null,
      spectatorMode: null,
    });
    render(<QuickGamePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Detailed battle results are unavailable/,
    );
    expect(screen.getByTestId('play-again-same-btn')).toBeEnabled();
    expect(screen.getByTestId('exit-btn')).toBeEnabled();
    fireEvent.click(screen.getByTestId('play-again-new-btn'));
    expect(
      await screen.findByRole('heading', { name: 'Select Your Units' }),
    ).toBeInTheDocument();
    expect(useQuickGameStore.getState().game?.id).not.toBe(game.id);
  });
});
