/**
 * QuickGameReplayPanel — render tests covering the 3 spec scenarios
 * from `add-quickgame-replay-panel` (quick-session delta —
 * "Quick-Game Results Page Renders Hex-Map Replay"):
 *
 * 1. Replay tab is visible alongside existing tabs (covered indirectly
 *    via QuickGameResults.test.tsx — this file proves the panel itself
 *    renders).
 * 2. Replay panel projects hex-map state from in-memory events
 *    (`<HexMapDisplay>` mounts with non-empty token set).
 * 3. Scrubber state is owned by useSharedReplayPlayer (transport
 *    controls render and respond to clicks via the hook's actions).
 *
 * Plus an empty-events guard.
 *
 * @spec openspec/changes/add-quickgame-replay-panel/specs/quick-session/spec.md
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IGameCreatedPayload,
  IGameEvent,
  IGameUnit,
  IMovementDeclaredPayload,
  MovementType,
} from '@/types/gameplay';

import { QuickGameReplayPanel } from '../QuickGameReplayPanel';

// =============================================================================
// Mock the heavy HexMapDisplay component so the test stays fast and
// asserts only the wiring contract — that QuickGameReplayPanel passes a
// non-empty token set + hex terrain + radius into the map.
// =============================================================================

jest.mock('@/components/gameplay/HexMapDisplay/HexMapDisplay', () => ({
  HexMapDisplay: ({
    radius,
    tokens,
  }: {
    radius: number;
    tokens: readonly { unitId: string }[];
  }) => (
    <div
      data-testid="hex-map-display-mock"
      data-radius={radius}
      data-token-count={tokens.length}
    >
      {tokens.map((t) => (
        <span key={t.unitId} data-testid={`token-${t.unitId}`} />
      ))}
    </div>
  ),
}));

// =============================================================================
// Fixture helpers
// =============================================================================

function makeUnit(
  overrides: Partial<IGameUnit> & Pick<IGameUnit, 'id' | 'name' | 'side'>,
): IGameUnit {
  return {
    unitRef: 'atlas-as7-d',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<IGameEvent> &
    Pick<IGameEvent, 'type' | 'payload' | 'sequence'>,
): IGameEvent {
  return {
    id: `evt-${overrides.sequence}`,
    gameId: 'test-game',
    timestamp: '2026-05-07T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.Movement,
    side: GameSide.Player,
    ...overrides,
  };
}

function makeStandardEvents(): readonly IGameEvent[] {
  const gameCreated: IGameCreatedPayload = {
    config: {
      mapRadius: 17,
      turnLimit: 0,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    units: [
      makeUnit({ id: 'player-1', name: 'Atlas AS7-D', side: GameSide.Player }),
      makeUnit({
        id: 'opponent-1',
        name: 'Stalker STK-3F',
        side: GameSide.Opponent,
      }),
    ],
  };
  const move1: IMovementDeclaredPayload = {
    unitId: 'player-1',
    movementType: MovementType.Walk,
    from: { q: 0, r: 0 },
    to: { q: 1, r: 0 },
    facing: Facing.North,
    mpUsed: 1,
    heatGenerated: 1,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
  };
  return [
    makeEvent({
      sequence: 0,
      type: GameEventType.GameCreated,
      payload: gameCreated,
      phase: GamePhase.Initiative,
    }),
    makeEvent({
      sequence: 1,
      type: GameEventType.MovementDeclared,
      payload: move1,
      actorId: 'player-1',
    }),
  ];
}

// =============================================================================
// Tests
// =============================================================================

describe('QuickGameReplayPanel', () => {
  describe('Empty-events guard', () => {
    it('renders the placeholder when events.length === 0', () => {
      render(<QuickGameReplayPanel events={[]} gameId="g-empty" />);

      expect(screen.getByText(/no events were recorded/i)).toBeInTheDocument();
      expect(
        screen.queryByTestId('hex-map-display-mock'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Hex-map projection', () => {
    it('mounts HexMapDisplay with tokens projected from useHexMapStateFromEvents', () => {
      const events = makeStandardEvents();
      render(<QuickGameReplayPanel events={events} gameId="g-1" />);

      const map = screen.getByTestId('hex-map-display-mock');
      expect(map).toBeInTheDocument();
      // GameCreated seeds 2 tokens (player-1 + opponent-1).
      expect(map).toHaveAttribute('data-token-count', '2');
      expect(screen.getByTestId('token-player-1')).toBeInTheDocument();
      expect(screen.getByTestId('token-opponent-1')).toBeInTheDocument();
      // mapRadius from GameCreated payload.
      expect(map).toHaveAttribute('data-radius', '17');
    });
  });

  describe('Scrubber state owned by useSharedReplayPlayer', () => {
    it('renders the transport controls (play / step) sourced from the shared player hook', () => {
      const events = makeStandardEvents();
      render(<QuickGameReplayPanel events={events} gameId="g-1" />);

      // The shared ReplayControls component renders title-bearing
      // buttons. Their presence confirms the panel composed
      // useSharedReplayPlayer's actions correctly.
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /step forward/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /step backward/i }),
      ).toBeInTheDocument();
    });

    it('clicking step forward advances playback (no separate state machine)', async () => {
      const user = userEvent.setup();
      const events = makeStandardEvents();
      render(<QuickGameReplayPanel events={events} gameId="g-1" />);

      // Initial state: stopped — "Press Play to start" copy.
      expect(screen.getByText(/press play to start/i)).toBeInTheDocument();

      const stepForward = screen.getByRole('button', { name: /step forward/i });
      await user.click(stepForward);

      // After a single step the panel is no longer at the start; the
      // step-backward button should now be enabled (not disabled).
      const stepBackward = screen.getByRole('button', {
        name: /step backward/i,
      });
      expect(stepBackward).not.toBeDisabled();
    });
  });
});
