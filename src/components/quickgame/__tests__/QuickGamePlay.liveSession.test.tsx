import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { navigateToGameSession } from '@/lib/gameplay/tacticalNavigation';
import { GameStatus } from '@/types/gameplay';
import { QuickGameStep } from '@/types/quickgame';

const mockStartBattle = jest.fn();
const mockPlayAgain = jest.fn();
const mockNavigateToGameSession = navigateToGameSession as jest.MockedFunction<
  typeof navigateToGameSession
>;
const mockRouterPush = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/gameplay/quick',
    asPath: '/gameplay/quick',
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
};

const mockGameplayState = {
  session: null as { id: string; matchId?: string } | null,
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

jest.mock('@/lib/gameplay/tacticalNavigation', () => ({
  navigateToGameSession: jest.fn(),
}));

import { QuickGamePlay } from '../QuickGamePlay';

describe('QuickGamePlay live tactical session guard', () => {
  beforeEach(() => {
    mockStartBattle.mockClear();
    mockPlayAgain.mockClear();
    mockNavigateToGameSession.mockClear();
    mockRouterPush.mockClear();
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
    mockGameplayState.session = { id: 'interactive-session' };
    mockGameplayState.interactiveSession = { id: 'interactive-session' };

    render(<QuickGamePlay />);

    expect(screen.getByText(/opening tactical battle/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockStartBattle).not.toHaveBeenCalled();
      expect(mockNavigateToGameSession).toHaveBeenCalledWith(
        'interactive-session',
        expect.objectContaining({ push: mockRouterPush }),
      );
    });
  });

  it('does not auto-resolve over an active spectator tactical session', async () => {
    mockGameplayState.session = {
      id: 'spectator-session',
      matchId: 'spectator-match',
    };
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
});
