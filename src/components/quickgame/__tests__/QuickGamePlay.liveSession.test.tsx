import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { navigateToGameSession } from '@/lib/gameplay/tacticalNavigation';
import { GameStatus } from '@/types/gameplay';

const mockStartBattle = jest.fn();
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
};

const mockGameplayState = {
  session: null as { id: string } | null,
  interactiveSession: null as unknown,
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
    mockNavigateToGameSession.mockClear();
    mockRouterPush.mockClear();
    mockQuickGameState.isLoading = false;
    mockQuickGameState.error = null;
    mockGameplayState.session = null;
    mockGameplayState.interactiveSession = null;
    mockGameplayState.spectatorMode = null;
  });

  it('auto-resolves an active quick game when no tactical session is live', async () => {
    render(<QuickGamePlay />);

    await waitFor(() => expect(mockStartBattle).toHaveBeenCalledTimes(1));
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
    mockGameplayState.session = { id: 'spectator-session' };
    mockGameplayState.spectatorMode = { enabled: true };

    render(<QuickGamePlay />);

    expect(screen.getByText(/opening tactical battle/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockStartBattle).not.toHaveBeenCalled();
      expect(mockNavigateToGameSession).toHaveBeenCalledWith(
        'spectator-session',
        expect.objectContaining({ push: mockRouterPush }),
      );
    });
  });
});
