import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

import { hydrateRecoverableSessionFromMatchLog } from '@/engine/InteractiveSession.persistence';
import { navigateToGameSession } from '@/lib/gameplay/tacticalNavigation';
import { GameStatus, GameSide, type IGameSession } from '@/types/gameplay';
import { QuickGameStep } from '@/types/quickgame';
import {
  createGameSession,
  startGame,
  endGame,
} from '@/utils/gameplay/gameSession';

const mockStartBattle = jest.fn();
const mockPlayAgain = jest.fn();
const mockReconcileTacticalCompletion = jest.fn();
const mockClearGame = jest.fn();
const mockNavigateToGameSession = navigateToGameSession as jest.MockedFunction<
  typeof navigateToGameSession
>;
const mockRouterPush = jest.fn();
let mockRouterAsPath = '/gameplay/quick';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/gameplay/quick',
    asPath: mockRouterAsPath,
    query: {},
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

const mockQuickGameState = {
  game: {
    id: 'quick-game-1',
    status: GameStatus.Active,
    step: QuickGameStep.Playing,
    activeTacticalSession: null as {
      id: string;
      mode: 'interactive' | 'spectator';
    } | null,
    scenario: {
      template: { name: 'Training Skirmish' },
      mapPreset: { name: 'Open Field', biome: 'grassland' },
    },
    playerForce: { units: [{ instanceId: 'atlas-1' }] },
    opponentForce: { units: [{ instanceId: 'locust-1' }] },
  },
  isLoading: false,
  error: null as string | null,
  startBattle: mockStartBattle,
  playAgain: mockPlayAgain,
  reconcileTacticalCompletion: mockReconcileTacticalCompletion,
  clearGame: mockClearGame,
};

const mockGameplayState = {
  session: null as IGameSession | null,
  interactiveSession: null as { id: string } | null,
  spectatorMode: null as { enabled: boolean } | null,
};

jest.mock('@/stores/useQuickGameStore', () => ({
  useQuickGameSelector: (
    selector: (state: typeof mockQuickGameState) => unknown,
  ) => selector(mockQuickGameState),
}));

jest.mock('@/stores/useGameplayStore', () => ({
  useGameplaySelector: (
    selector: (state: typeof mockGameplayState) => unknown,
  ) => selector(mockGameplayState),
}));

jest.mock('@/lib/gameplay/tacticalNavigation', () => {
  const actual = jest.requireActual('@/lib/gameplay/tacticalNavigation');
  return {
    ...actual,
    navigateToGameSession: jest.fn(actual.navigateToGameSession),
  };
});

jest.mock('@/pages/gameplay/games/[id]', () => ({
  __esModule: true,
  default: () => null,
}));

import { QuickGamePlay } from '../QuickGamePlay';

jest.mock('@/engine/InteractiveSession.persistence', () => ({
  ...jest.requireActual('@/engine/InteractiveSession.persistence'),
  hydrateRecoverableSessionFromMatchLog: jest.fn(),
}));

function activeSession(id: string, matchId?: string): IGameSession {
  return {
    ...startGame(
      createGameSession(
        {
          mapRadius: 7,
          turnLimit: 30,
          victoryConditions: ['elimination'],
          optionalRules: [],
        },
        [],
        { id },
      ),
      GameSide.Player,
    ),
    ...(matchId ? { matchId } : {}),
  };
}

describe('QuickGamePlay live tactical session guard', () => {
  beforeEach(() => {
    mockStartBattle.mockClear();
    mockPlayAgain.mockClear();
    mockReconcileTacticalCompletion.mockClear();
    mockClearGame.mockClear();
    jest
      .mocked(hydrateRecoverableSessionFromMatchLog)
      .mockReset()
      .mockImplementation(async (id) => activeSession(id));
    mockNavigateToGameSession.mockClear();
    mockRouterPush.mockReset().mockResolvedValue(true);
    mockRouterAsPath = '/gameplay/quick';
    mockQuickGameState.isLoading = false;
    mockQuickGameState.error = null;
    mockGameplayState.session = null;
    mockGameplayState.interactiveSession = null;
    mockGameplayState.spectatorMode = null;
    mockQuickGameState.game.activeTacticalSession = null;
  });

  it('does not fabricate a result for an active game without a recoverable session', async () => {
    render(<QuickGamePlay />);

    expect(
      screen.getByRole('heading', { name: /battle session unavailable/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no battle result has been recorded/i),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockStartBattle).not.toHaveBeenCalled();
      expect(mockNavigateToGameSession).not.toHaveBeenCalled();
    });
  });

  it('routes a persisted interactive session into recovery without auto-resolving', async () => {
    mockQuickGameState.game.activeTacticalSession = {
      id: 'persisted-session',
      mode: 'interactive',
    };

    render(<QuickGamePlay />);

    expect(screen.getByText(/recovering tactical battle/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockNavigateToGameSession).toHaveBeenCalledWith(
        'persisted-session',
        expect.objectContaining({ push: mockRouterPush }),
        { spectator: false },
      );
      expect(mockStartBattle).not.toHaveBeenCalled();
    });
  });

  it('preserves spectator intent while routing a persisted session', async () => {
    mockQuickGameState.game.activeTacticalSession = {
      id: 'persisted-spectator-session',
      mode: 'spectator',
    };

    render(<QuickGamePlay />);

    await waitFor(() => {
      expect(mockNavigateToGameSession).toHaveBeenCalledWith(
        'persisted-spectator-session',
        expect.objectContaining({ push: mockRouterPush }),
        { spectator: true },
      );
      expect(mockStartBattle).not.toHaveBeenCalled();
    });
  });

  it('does not auto-resolve over a live interactive tactical session', async () => {
    mockGameplayState.session = activeSession('interactive-session');
    mockGameplayState.interactiveSession = { id: 'interactive-session' };

    render(<QuickGamePlay />);

    expect(screen.getByText(/opening tactical battle/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockStartBattle).not.toHaveBeenCalled();
      expect(mockNavigateToGameSession).toHaveBeenCalledWith(
        'interactive-session',
        expect.objectContaining({ push: mockRouterPush }),
        { spectator: false },
      );
    });
  });

  it('requests the same tactical route only once across rerenders', () => {
    mockGameplayState.session = activeSession('interactive-session');
    mockGameplayState.interactiveSession = { id: 'interactive-session' };

    const { rerender } = render(<QuickGamePlay />);
    rerender(<QuickGamePlay />);
    rerender(<QuickGamePlay />);

    expect(mockNavigateToGameSession).toHaveBeenCalledTimes(1);

    mockGameplayState.session = activeSession('next-session');
    rerender(<QuickGamePlay />);
    expect(mockNavigateToGameSession).toHaveBeenCalledTimes(2);
    expect(mockNavigateToGameSession).toHaveBeenLastCalledWith(
      'next-session',
      expect.objectContaining({ push: mockRouterPush }),
      { spectator: false },
    );
  });

  it('does not push again after reaching a tactical session route', () => {
    mockGameplayState.session = activeSession('interactive-session');
    mockGameplayState.interactiveSession = { id: 'interactive-session' };
    const { rerender } = render(<QuickGamePlay />);
    mockRouterAsPath = '/gameplay/games/interactive-session';
    rerender(<QuickGamePlay />);

    expect(mockNavigateToGameSession).toHaveBeenCalledTimes(1);
  });

  it('does not auto-resolve over an active spectator tactical session', async () => {
    mockGameplayState.session = activeSession(
      'spectator-session',
      'spectator-match',
    );
    mockGameplayState.spectatorMode = { enabled: true };

    render(<QuickGamePlay />);

    expect(screen.getByText(/opening tactical battle/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockStartBattle).not.toHaveBeenCalled();
      expect(mockNavigateToGameSession).toHaveBeenCalledWith(
        'spectator-match',
        expect.objectContaining({ push: mockRouterPush }),
        { spectator: true },
      );
    });
  });
  it.each(['cancelled', 'rejected'] as const)(
    'releases a deferred %s navigation for explicit retry without rerender retries',
    async (outcome) => {
      let resolve!: (value: boolean) => void;
      let reject!: (reason: Error) => void;
      mockRouterPush.mockImplementationOnce(
        () =>
          new Promise<boolean>((yes, no) => {
            resolve = yes;
            reject = no;
          }),
      );
      mockGameplayState.session = activeSession('interactive-session');
      mockGameplayState.interactiveSession = { id: 'interactive-session' };
      const { rerender } = render(<QuickGamePlay />);
      rerender(<QuickGamePlay />);
      rerender(<QuickGamePlay />);
      expect(mockRouterPush).toHaveBeenCalledTimes(1);

      await act(async () => {
        if (outcome === 'cancelled') resolve(false);
        else reject(new Error('route failed'));
      });
      expect(screen.getByRole('alert')).toHaveTextContent(/could not open/i);
      rerender(<QuickGamePlay />);
      rerender(<QuickGamePlay />);
      expect(mockRouterPush).toHaveBeenCalledTimes(1);
      expect(mockStartBattle).not.toHaveBeenCalled();

      fireEvent.click(
        screen.getByRole('button', { name: /retry opening battle/i }),
      );
      await waitFor(() => expect(mockRouterPush).toHaveBeenCalledTimes(2));
      expect(mockRouterPush).toHaveBeenLastCalledWith(
        '/gameplay/games/interactive-session',
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      rerender(<QuickGamePlay />);
      expect(mockRouterPush).toHaveBeenCalledTimes(2);
    },
  );

  it('retains the duplicate guard after deferred navigation succeeds', async () => {
    let resolve!: (value: boolean) => void;
    mockRouterPush.mockImplementationOnce(
      () =>
        new Promise<boolean>((yes) => {
          resolve = yes;
        }),
    );
    mockGameplayState.session = activeSession('interactive-session');
    mockGameplayState.interactiveSession = { id: 'interactive-session' };
    const { rerender } = render(<QuickGamePlay />);
    rerender(<QuickGamePlay />);
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    await act(async () => resolve(true));
    rerender(<QuickGamePlay />);
    rerender(<QuickGamePlay />);
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not let an old cancellation overwrite a newer session navigation', async () => {
    let resolve!: (value: boolean) => void;
    mockRouterPush.mockImplementationOnce(
      () =>
        new Promise<boolean>((yes) => {
          resolve = yes;
        }),
    );
    mockGameplayState.session = activeSession('old-session');
    mockGameplayState.interactiveSession = { id: 'old-session' };
    const { rerender } = render(<QuickGamePlay />);
    mockGameplayState.session = activeSession('new-session');
    rerender(<QuickGamePlay />);
    expect(mockRouterPush).toHaveBeenCalledTimes(2);
    await act(async () => resolve(false));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    rerender(<QuickGamePlay />);
    expect(mockRouterPush).toHaveBeenCalledTimes(2);
  });

  it('adopts matching recorded completion without routing from the stale Active render', () => {
    const session = endGame(
      activeSession('completed-session'),
      GameSide.Opponent,
      'concede',
    );
    mockQuickGameState.game.activeTacticalSession = {
      id: session.id,
      mode: 'interactive',
    };
    mockGameplayState.session = session;
    mockGameplayState.interactiveSession = { id: session.id };
    render(<QuickGamePlay />);
    expect(mockReconcileTacticalCompletion).toHaveBeenCalledWith(
      'quick-game-1',
      session,
    );
    expect(mockNavigateToGameSession).not.toHaveBeenCalled();
    expect(mockStartBattle).not.toHaveBeenCalled();
  });

  it.each([GameStatus.Active, GameStatus.Completed])(
    'keeps the linked target when a foreign %s session is retained',
    async (status) => {
      const active = activeSession('foreign-session');
      mockGameplayState.session =
        status === GameStatus.Active
          ? active
          : endGame(active, GameSide.Opponent, 'concede');
      mockGameplayState.interactiveSession = { id: 'foreign-session' };
      mockQuickGameState.game.activeTacticalSession = {
        id: 'linked-session',
        mode: 'spectator',
      };
      render(<QuickGamePlay />);
      expect(mockReconcileTacticalCompletion).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(mockNavigateToGameSession).toHaveBeenCalledWith(
          'linked-session',
          expect.objectContaining({ push: mockRouterPush }),
          { spectator: true },
        ),
      );
    },
  );

  it('keeps recovery failure non-destructive with explicit retry, restart and exit', async () => {
    jest
      .mocked(hydrateRecoverableSessionFromMatchLog)
      .mockRejectedValueOnce(
        new Error('Match log is corrupt and cannot be recovered'),
      );
    mockQuickGameState.game.activeTacticalSession = {
      id: 'corrupt-match',
      mode: 'interactive',
    };
    render(<QuickGamePlay />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Match log is corrupt',
    );
    expect(mockNavigateToGameSession).not.toHaveBeenCalled();
    expect(mockStartBattle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start New Setup' }));
    expect(mockPlayAgain).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Exit to Games' }));
    expect(mockClearGame).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith('/gameplay/games');
  });
});
