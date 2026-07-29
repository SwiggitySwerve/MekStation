/**
 * Game-page dispatcher payload threading test.
 *
 * Audit 2026-06-09 G cluster (remediation W5.1a): the game page's
 * `handleInteractiveAction` special-cases a handful of action ids and
 * forwards everything else to the store's `handleAction` — but the
 * default (and non-interactive) paths dropped the structured
 * `TacticalActionPayload`. Payload-carrying commands dispatched from
 * the TacticalActionDock (e.g. `torso-twist` with a direction) lost
 * their payload and silently misbehaved.
 *
 * Contract under test: any non-special-cased action id forwards BOTH
 * the action id AND the payload to the store, in interactive and
 * non-interactive sessions alike.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { InteractiveSession } from '@/engine/InteractiveSession';

import { createDemoSession } from '@/__fixtures__/gameplay';
import GameSessionPage from '@/pages/gameplay/games/[id]';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GamePhase,
  GameSide,
  type TacticalActionPayload,
} from '@/types/gameplay';

// Captures the onAction dispatcher GameplayLayout receives so the test
// can invoke it exactly like the TacticalActionDock does.
const mockCapturedLayout: {
  onAction?: (actionId: string, payload?: TacticalActionPayload) => void;
} = {};
const mockPhaseQueueProjection: {
  activeUnitId?: string;
  activeSide: GameSide;
} = {
  activeUnitId: undefined,
  activeSide: GameSide.Player,
};

jest.mock('@/components/gameplay/GameplayLayout', () => ({
  GameplayLayout: (props: {
    onAction: (actionId: string, payload?: TacticalActionPayload) => void;
  }) => {
    mockCapturedLayout.onAction = props.onAction;
    return <div data-testid="gameplay-layout-mock" />;
  },
}));

jest.mock('@/components/gameplay/SpectatorView', () => ({
  SpectatorView: () => <div data-testid="spectator-view-mock" />,
}));

jest.mock('@/components/gameplay/CombatPlanningPanel', () => ({
  CombatPlanningPanel: () => <div data-testid="planning-panel-mock" />,
}));

jest.mock('@/hooks/gameplay', () => ({
  usePhaseQueueProjection: () => mockPhaseQueueProjection,
}));

// The lifecycle hook redirects/loads sessions — irrelevant here.
jest.mock(
  '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle',
  () => ({
    resolveGameSessionRouteId: jest.fn(() => 'demo-game-001'),
    useGameSessionLifecycle: jest.fn(),
  }),
);

// Movement planning pulls capabilities off the interactive session —
// stub the whole surface so the page renders with a bare session stub.
jest.mock(
  '@/components/gameplay/pages/gameSession/GameSessionPage.movement',
  () => ({
    useGameMovementPlanning: () => ({
      isPlayerControlled: false,
      handleHexClick: jest.fn(),
      setHoveredHex: jest.fn(),
      movementRangeHexes: [],
      hoveredHex: null,
      hoveredMovementRangeHex: undefined,
      hoveredPath: [],
      hoverMpCost: undefined,
      hoverUnreachable: false,
      mpLegend: undefined,
      handleMovementModeSelect: jest.fn(),
      effectiveMovementMps: null,
      capability: null,
    }),
  }),
);

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    query: { id: 'demo-game-001' },
    pathname: '/gameplay/games/[id]',
    isReady: true,
  }),
}));

describe('game-page dispatcher payload threading', () => {
  beforeEach(() => {
    mockCapturedLayout.onAction = undefined;
    mockPhaseQueueProjection.activeUnitId = undefined;
    mockPhaseQueueProjection.activeSide = GameSide.Player;
  });

  /** Seed the real store with a session and spies for the dispatcher. */
  function seedStore(interactive: boolean): jest.Mock {
    const handleAction = jest.fn();
    useGameplayStore.setState({
      session: createDemoSession(),
      isLoading: false,
      error: null,
      interactiveSession: interactive
        ? ({ getResult: () => null } as unknown as InteractiveSession)
        : null,
      interactivePhase: null,
      spectatorMode: null,
      handleAction,
      checkGameOver: jest.fn(),
    } as never);
    return handleAction;
  }

  it('forwards the payload for non-special-cased commands in interactive sessions', () => {
    const handleAction = seedStore(true);
    render(<GameSessionPage />);
    expect(screen.getByTestId('gameplay-layout-mock')).toBeInTheDocument();

    mockCapturedLayout.onAction?.('torso-twist', { direction: 'left' });

    expect(handleAction).toHaveBeenCalledWith('torso-twist', {
      direction: 'left',
    });
  });

  it('forwards the payload on the non-interactive path too', () => {
    const handleAction = seedStore(false);
    render(<GameSessionPage />);

    mockCapturedLayout.onAction?.('request-spot', {
      unitId: 'player-a',
      targetUnitId: 'opponent-a',
    });

    expect(handleAction).toHaveBeenCalledWith('request-spot', {
      unitId: 'player-a',
      targetUnitId: 'opponent-a',
    });
  });

  it('dispatches the active opponent movement unit to the AI', () => {
    const session = createDemoSession();
    const runAITurn = jest.fn();
    mockPhaseQueueProjection.activeUnitId = 'opponent-a';
    mockPhaseQueueProjection.activeSide = GameSide.Opponent;
    useGameplayStore.setState({
      session: {
        ...session,
        currentState: {
          ...session.currentState,
          phase: GamePhase.Movement,
        },
      },
      isLoading: false,
      error: null,
      interactiveSession: {
        getResult: () => null,
      } as unknown as InteractiveSession,
      interactivePhase: null,
      spectatorMode: null,
      runAITurn,
      checkGameOver: jest.fn(),
    } as never);

    render(<GameSessionPage />);

    expect(runAITurn).toHaveBeenCalledWith('opponent-a');
  });
});
