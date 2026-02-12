import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { GameStatus, GamePhase, GameEventType } from '@/types/gameplay';
import { QuickGameStep } from '@/types/quickgame/QuickGameInterfaces';

import { QuickGameResults } from '../QuickGameResults';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

function createMockGame() {
  return {
    id: 'test-game-1',
    status: GameStatus.Completed,
    step: QuickGameStep.Results,
    playerForce: {
      name: 'Player Force',
      units: [
        {
          instanceId: 'unit-1',
          sourceUnitId: 'atlas-as7d',
          name: 'Atlas AS7-D',
          chassis: 'Atlas',
          variant: 'AS7-D',
          bv: 1897,
          tonnage: 100,
          gunnery: 4,
          piloting: 5,
          pilotName: 'John Smith',
          maxArmor: { head: 9 },
          maxStructure: { head: 3 },
          armor: { head: 0 },
          structure: { head: 0 },
          heat: 0,
          isDestroyed: true,
          isWithdrawn: false,
        },
        {
          instanceId: 'unit-2',
          sourceUnitId: 'centurion-cn9a',
          name: 'Centurion CN9-A',
          chassis: 'Centurion',
          variant: 'CN9-A',
          bv: 945,
          tonnage: 50,
          gunnery: 4,
          piloting: 5,
          pilotName: 'Jane Doe',
          maxArmor: { head: 9 },
          maxStructure: { head: 3 },
          armor: { head: 5 },
          structure: { head: 3 },
          heat: 0,
          isDestroyed: false,
          isWithdrawn: false,
        },
      ],
      totalBV: 2842,
      totalTonnage: 150,
    },
    opponentForce: {
      name: 'Opponent Force',
      units: [
        {
          instanceId: 'enemy-1',
          sourceUnitId: 'hunchback-hbk4g',
          name: 'Hunchback HBK-4G',
          chassis: 'Hunchback',
          variant: 'HBK-4G',
          bv: 1067,
          tonnage: 50,
          gunnery: 4,
          piloting: 5,
          pilotName: 'Enemy Pilot',
          maxArmor: { head: 9 },
          maxStructure: { head: 3 },
          armor: { head: 0 },
          structure: { head: 0 },
          heat: 0,
          isDestroyed: true,
          isWithdrawn: false,
        },
      ],
      totalBV: 1067,
      totalTonnage: 50,
    },
    scenarioConfig: {
      difficulty: 1.0,
      modifierCount: 2,
      allowNegativeModifiers: true,
      year: 3025,
    },
    scenario: {
      template: { name: 'Standup Fight' },
      mapPreset: { name: 'Plains', biome: 'temperate' },
    },
    phase: GamePhase.End,
    turn: 5,
    events: [
      {
        id: 'event-1',
        type: GameEventType.GameStarted,
        category: 'game',
        gameId: 'test-game-1',
        turn: 1,
        phase: GamePhase.Initiative,
        sequence: 1,
        timestamp: '2025-01-01T00:00:00Z',
      },
      {
        id: 'event-2',
        type: GameEventType.UnitDestroyed,
        category: 'combat',
        gameId: 'test-game-1',
        turn: 3,
        phase: GamePhase.WeaponAttack,
        sequence: 2,
        timestamp: '2025-01-01T00:05:00Z',
        actorId: 'unit-1',
      },
      {
        id: 'event-3',
        type: GameEventType.GameEnded,
        category: 'game',
        gameId: 'test-game-1',
        turn: 5,
        phase: GamePhase.End,
        sequence: 3,
        timestamp: '2025-01-01T00:10:00Z',
      },
    ],
    winner: 'player' as const,
    victoryReason: 'all_enemies_destroyed',
    startedAt: '2025-01-01T00:00:00Z',
    endedAt: '2025-01-01T00:10:00Z',
  };
}

function setMockGameState(game: ReturnType<typeof createMockGame> | null) {
  // Test mock data - bypass strict typing for scenario field
  useQuickGameStore.setState({
    // @ts-expect-error - Mock scenario doesn't need full IGeneratedScenario type
    game,
    isLoading: false,
    error: null,
    isDirty: false,
  });
}

describe('QuickGameResults', () => {
  beforeEach(() => {
    setMockGameState(createMockGame());
  });

  afterEach(() => {
    setMockGameState(null);
  });

  describe('Tab Navigation', () => {
    it('renders all four tabs', () => {
      render(<QuickGameResults />);

      expect(screen.getByRole('tab', { name: 'Summary' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Units' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Damage' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
    });

    it('starts with Summary tab selected', () => {
      render(<QuickGameResults />);

      const summaryTab = screen.getByRole('tab', { name: 'Summary' });
      expect(summaryTab).toHaveAttribute('aria-selected', 'true');
    });

    it('switches to Units tab when clicked', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      const unitsTab = screen.getByRole('tab', { name: 'Units' });
      await user.click(unitsTab);

      expect(unitsTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });

    it('has correct ARIA attributes for tabs', () => {
      render(<QuickGameResults />);

      const summaryTab = screen.getByRole('tab', { name: 'Summary' });
      expect(summaryTab).toHaveAttribute('aria-controls', 'tabpanel-summary');
      expect(summaryTab).toHaveAttribute('id', 'tab-summary');
    });

    it('has tablist role on tab container', () => {
      render(<QuickGameResults />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates to next tab with ArrowRight', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      const summaryTab = screen.getByRole('tab', { name: 'Summary' });
      summaryTab.focus();

      await user.keyboard('{ArrowRight}');

      const unitsTab = screen.getByRole('tab', { name: 'Units' });
      expect(unitsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('navigates to previous tab with ArrowLeft', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      const unitsTab = screen.getByRole('tab', { name: 'Units' });
      await user.click(unitsTab);

      await user.keyboard('{ArrowLeft}');

      const summaryTab = screen.getByRole('tab', { name: 'Summary' });
      expect(summaryTab).toHaveAttribute('aria-selected', 'true');
    });

    it('wraps from last to first tab with ArrowRight', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      const timelineTab = screen.getByRole('tab', { name: 'Timeline' });
      await user.click(timelineTab);

      await user.keyboard('{ArrowRight}');

      const summaryTab = screen.getByRole('tab', { name: 'Summary' });
      expect(summaryTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Summary Tab Content', () => {
    it('displays battle statistics', () => {
      render(<QuickGameResults />);
      expect(screen.getByText('Battle Statistics')).toBeInTheDocument();
    });

    it('displays scenario information', () => {
      render(<QuickGameResults />);
      expect(screen.getByText('Standup Fight')).toBeInTheDocument();
    });
  });

  describe('Units Tab Content', () => {
    it('shows all units from both forces', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      await user.click(screen.getByRole('tab', { name: 'Units' }));

      expect(screen.getByText('Atlas AS7-D')).toBeInTheDocument();
      expect(screen.getByText('Centurion CN9-A')).toBeInTheDocument();
      expect(screen.getByText('Hunchback HBK-4G')).toBeInTheDocument();
    });

    it('shows unit status - Destroyed in red', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      await user.click(screen.getByRole('tab', { name: 'Units' }));

      const destroyedStatus = screen.getAllByText('Destroyed');
      expect(destroyedStatus.length).toBeGreaterThan(0);
    });

    it('shows unit status - Survived in green', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      await user.click(screen.getByRole('tab', { name: 'Units' }));

      expect(screen.getByText('Survived')).toBeInTheDocument();
    });

    it('shows pilot names when available', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      await user.click(screen.getByRole('tab', { name: 'Units' }));

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  describe('Damage Tab Content', () => {
    it('shows empty state when no damage events', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      await user.click(screen.getByRole('tab', { name: 'Damage' }));

      expect(screen.getByText('No damage dealt')).toBeInTheDocument();
    });
  });

  describe('Timeline Tab Content', () => {
    it('shows events in timeline', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      await user.click(screen.getByRole('tab', { name: 'Timeline' }));

      expect(screen.getByText('Game Started')).toBeInTheDocument();
      expect(screen.getByText('Unit Destroyed')).toBeInTheDocument();
      expect(screen.getByText('Game Ended')).toBeInTheDocument();
    });

    it('shows turn numbers for events', async () => {
      const user = userEvent.setup();
      render(<QuickGameResults />);

      await user.click(screen.getByRole('tab', { name: 'Timeline' }));

      expect(screen.getByText('Turn 1')).toBeInTheDocument();
      expect(screen.getByText('Turn 3')).toBeInTheDocument();
      expect(screen.getByText('Turn 5')).toBeInTheDocument();
    });
  });

  describe('Result Banner', () => {
    it('shows Victory for player wins', () => {
      render(<QuickGameResults />);
      expect(screen.getByText('Victory!')).toBeInTheDocument();
    });

    it('shows victory reason', () => {
      render(<QuickGameResults />);
      expect(screen.getByText('all enemies destroyed')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders play again buttons', () => {
      render(<QuickGameResults />);

      expect(screen.getByTestId('play-again-same-btn')).toBeInTheDocument();
      expect(screen.getByTestId('play-again-new-btn')).toBeInTheDocument();
      expect(screen.getByTestId('exit-btn')).toBeInTheDocument();
    });
  });

  describe('No Game State', () => {
    it('shows message when no game available', () => {
      useQuickGameStore.setState({ game: null });

      render(<QuickGameResults />);

      expect(
        screen.getByText('No game results to display.'),
      ).toBeInTheDocument();
    });
  });
});
