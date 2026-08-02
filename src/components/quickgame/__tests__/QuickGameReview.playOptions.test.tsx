import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { navigateToGameSession } from '@/lib/gameplay/tacticalNavigation';

const mockRouterPush = jest.fn();
const mockNavigateToGameSession = navigateToGameSession as jest.MockedFunction<
  typeof navigateToGameSession
>;
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/gameplay/quick',
    query: {},
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

jest.mock('@/lib/gameplay/tacticalNavigation', () => ({
  navigateToGameSession: jest.fn(),
}));

const mockStartGame = jest.fn<boolean, []>();
const mockStartBattle = jest.fn<Promise<void>, []>();
const mockStartSpectatorMode = jest.fn<Promise<void>, []>();
const mockStartInteractiveSkirmish = jest.fn<Promise<void>, []>();
const mockPreviousStep = jest.fn();
const mockGameplayState: {
  session: { id: string; matchId?: string } | null;
} = {
  session: null,
};

jest.mock('@/stores/useGameplayStore', () => ({
  useGameplayStore: {
    getState: () => mockGameplayState,
  },
}));

const mockQuickGameState = {
  game: {
    id: 'quick-game-1',
    playerForce: {
      name: 'Player Force',
      units: [
        {
          instanceId: 'atlas-1',
          sourceUnitId: 'atlas-as7-d',
          name: 'Atlas AS7-D',
          chassis: 'Atlas',
          variant: 'AS7-D',
          bv: 1897,
          tonnage: 100,
          gunnery: 4,
          piloting: 5,
        },
      ],
      totalBV: 1897,
      totalTonnage: 100,
    },
    opponentForce: {
      name: 'Opposition',
      units: [
        {
          instanceId: 'hunchback-1',
          sourceUnitId: 'hunchback-hbk-4g',
          name: 'Hunchback HBK-4G',
          chassis: 'Hunchback',
          variant: 'HBK-4G',
          bv: 1041,
          tonnage: 50,
          gunnery: 4,
          piloting: 5,
        },
      ],
      totalBV: 1041,
      totalTonnage: 50,
    },
    scenarioConfig: { enemyFaction: 'pirates' },
    scenario: {
      template: {
        name: 'Training Skirmish',
        description: 'A small practice fight.',
        objectiveType: 'annihilation',
        victoryConditions: [{ description: 'Destroy the opposition.' }],
      },
      mapPreset: { name: 'Open Field', biome: 'grassland' },
      turnLimit: 10,
      modifiers: [],
    },
  },
  previousStep: mockPreviousStep,
  startGame: mockStartGame,
  startBattle: mockStartBattle,
  startSpectatorMode: mockStartSpectatorMode,
  startInteractiveSkirmish: mockStartInteractiveSkirmish,
  isLoading: false,
};

jest.mock('@/stores/useQuickGameStore', () => ({
  useQuickGameSelector: (
    selector: (state: typeof mockQuickGameState) => unknown,
  ) => selector(mockQuickGameState),
}));

import { QuickGameReview } from '../QuickGameReview';

describe('QuickGameReview play options', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockNavigateToGameSession.mockReset();
    mockStartGame.mockReset();
    mockStartGame.mockReturnValue(true);
    mockStartBattle.mockReset();
    mockStartBattle.mockResolvedValue(undefined);
    mockStartSpectatorMode.mockReset();
    mockStartInteractiveSkirmish.mockReset();
    mockGameplayState.session = null;
    mockStartSpectatorMode.mockImplementation(async () => {
      mockGameplayState.session = {
        id: 'quick-session-1',
        matchId: 'quick-skirmish-1',
      };
    });
    mockStartInteractiveSkirmish.mockImplementation(async () => {
      mockGameplayState.session = {
        id: 'quick-session-1',
        matchId: 'quick-skirmish-1',
      };
    });
  });

  it('distinguishes Auto-Resolve, spectator, and interactive skirmish options', () => {
    render(<QuickGameReview />);

    expect(
      screen.getByRole('button', { name: /auto-resolve/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /watch ai battle/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /interactive skirmish/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^start battle$/i }),
    ).not.toBeInTheDocument();
  });

  it('starts auto-resolve only from the explicit user action', () => {
    render(<QuickGameReview />);

    fireEvent.click(screen.getByRole('button', { name: /auto-resolve/i }));

    expect(mockStartGame).toHaveBeenCalledTimes(1);
    expect(mockStartBattle).toHaveBeenCalledTimes(1);
    expect(mockStartSpectatorMode).not.toHaveBeenCalled();
    expect(mockStartInteractiveSkirmish).not.toHaveBeenCalled();
  });

  it('does not auto-resolve when the setup transition fails validation', () => {
    mockStartGame.mockReturnValueOnce(false);
    render(<QuickGameReview />);

    fireEvent.click(screen.getByRole('button', { name: /auto-resolve/i }));

    expect(mockStartGame).toHaveBeenCalledTimes(1);
    expect(mockStartBattle).not.toHaveBeenCalled();
  });

  it('routes the interactive skirmish by its persisted match ID', async () => {
    render(<QuickGameReview />);

    fireEvent.click(
      screen.getByRole('button', { name: /interactive skirmish/i }),
    );

    await waitFor(() => {
      expect(mockStartInteractiveSkirmish).toHaveBeenCalledTimes(1);
      expect(mockStartSpectatorMode).not.toHaveBeenCalled();
      expect(mockNavigateToGameSession).toHaveBeenCalledWith(
        'quick-skirmish-1',
        expect.objectContaining({ push: mockRouterPush }),
      );
    });
  });

  it('preserves spectator intent in the persisted match route', async () => {
    render(<QuickGameReview />);

    fireEvent.click(screen.getByRole('button', { name: /watch ai battle/i }));

    await waitFor(() => {
      expect(mockStartSpectatorMode).toHaveBeenCalledTimes(1);
      expect(mockNavigateToGameSession).toHaveBeenCalledWith(
        'quick-skirmish-1',
        expect.objectContaining({ push: mockRouterPush }),
        { spectator: true },
      );
    });
  });

  it.each([
    {
      buttonName: /watch ai battle/i,
      start: mockStartSpectatorMode,
    },
    {
      buttonName: /interactive skirmish/i,
      start: mockStartInteractiveSkirmish,
    },
  ])(
    'does not navigate a stale gameplay session when launch persistence fails',
    async ({ buttonName, start }) => {
      mockGameplayState.session = { id: 'stale-session' };
      start.mockResolvedValueOnce(undefined);
      render(<QuickGameReview />);

      fireEvent.click(screen.getByRole('button', { name: buttonName }));

      await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
      expect(mockNavigateToGameSession).not.toHaveBeenCalled();
    },
  );
});
