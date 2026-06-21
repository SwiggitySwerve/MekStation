import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/gameplay/quick',
    query: {},
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

const mockStartGame = jest.fn();
const mockStartSpectatorMode = jest.fn<Promise<void>, []>(
  async () => undefined,
);
const mockStartInteractiveSkirmish = jest.fn<Promise<void>, []>(
  async () => undefined,
);
const mockPreviousStep = jest.fn();
const mockGameplayState = {
  session: { id: 'quick-skirmish-1' },
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
    mockStartGame.mockClear();
    mockStartSpectatorMode.mockClear();
    mockStartInteractiveSkirmish.mockClear();
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

  it('launches the interactive skirmish without entering spectator mode', async () => {
    render(<QuickGameReview />);

    fireEvent.click(
      screen.getByRole('button', { name: /interactive skirmish/i }),
    );

    await waitFor(() => {
      expect(mockStartInteractiveSkirmish).toHaveBeenCalledTimes(1);
      expect(mockStartSpectatorMode).not.toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/gameplay/games/quick-skirmish-1',
      );
    });
  });
});
