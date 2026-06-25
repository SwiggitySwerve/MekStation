/**
 * NetworkedGameSurface component tests.
 *
 * Covers the delta-spec scenarios the surface owns:
 *   - loading state until the mirror is built (task 3.3)
 *   - turn-ownership gate enables/disables controls (task 4.3)
 *   - rejected-intent toast surfaces without breaking the surface (2.4)
 *   - fog-on rendering never crashes (task 5.3)
 *   - pause overlay / resume / terminal panel (task 6.4)
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import type {
  IGameEvent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import { buildMirrorSession } from '@/lib/multiplayer/mirrorMatchSession';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

import { NetworkedGameSurface } from '../NetworkedGameSurface';

// =============================================================================
// Fixtures
// =============================================================================

function buildAuthoritativeSession(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    [
      {
        id: 'player-1',
        name: 'Atlas',
        side: GameSide.Player,
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'opponent-1',
        name: 'Marauder',
        side: GameSide.Opponent,
        unitRef: 'marauder-mad-3r',
        pilotRef: 'pilot-2',
        gunnery: 4,
        piloting: 5,
      },
    ],
    { id: 'match-fixture', createdAt: '2026-05-19T00:00:00.000Z' },
  );
  session = startGame(session, GameSide.Player);
  // Pin `movesFirst` so the fixture is deterministic — `firstMover`
  // drives the turn-ownership gate and a random roll would flake it.
  session = rollInitiative(session, GameSide.Player);
  session = advancePhase(session); // → Movement
  return session;
}

function buildServerPhaseSession(): IGameSession {
  return startGame(
    createGameSession(
      {
        mapRadius: 6,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      [
        {
          id: 'player-1',
          name: 'Atlas',
          side: GameSide.Player,
          unitRef: 'atlas-as7-d',
          pilotRef: 'pilot-1',
          gunnery: 4,
          piloting: 5,
        },
        {
          id: 'opponent-1',
          name: 'Marauder',
          side: GameSide.Opponent,
          unitRef: 'marauder-mad-3r',
          pilotRef: 'pilot-2',
          gunnery: 4,
          piloting: 5,
        },
      ],
      { id: 'match-fixture', createdAt: '2026-05-19T00:00:00.000Z' },
    ),
    GameSide.Player,
  );
}

const SEATS: readonly IMatchSeat[] = [
  {
    slotId: 'alpha-1',
    side: 'Alpha',
    seatNumber: 1,
    occupant: { playerId: 'pid_host', displayName: 'Host' },
    kind: 'human',
    ready: true,
  },
  {
    slotId: 'bravo-1',
    side: 'Bravo',
    seatNumber: 1,
    occupant: { playerId: 'pid_guest', displayName: 'Guest' },
    kind: 'human',
    ready: true,
  },
];

interface IRenderOptions {
  readonly session?: IGameSession | null;
  readonly events?: readonly IGameEvent[];
  readonly playerId?: string;
  readonly status?: 'connecting' | 'ready' | 'paused' | 'closed' | 'error';
  readonly intentError?: { code?: string; reason?: string } | null;
  readonly pausedInfo?: {
    pendingSlots: readonly string[];
    graceRemainingMs: number;
    pendingExpiresAtMs: number | null;
  } | null;
  readonly closedInfo?: { code?: string; reason?: string } | null;
  readonly onSendGameIntent?: jest.Mock;
}

function renderSurface(opts: IRenderOptions = {}) {
  const authoritative = buildAuthoritativeSession();
  const session =
    opts.session === undefined
      ? buildMirrorSession(authoritative.events)
      : opts.session;
  const onSendGameIntent = opts.onSendGameIntent ?? jest.fn(() => true);
  const onClearIntentError = jest.fn();
  render(
    <NetworkedGameSurface
      mirrorSession={session}
      mirrorEvents={opts.events ?? authoritative.events}
      seats={SEATS}
      playerId={opts.playerId ?? 'pid_host'}
      status={opts.status ?? 'ready'}
      pausedInfo={opts.pausedInfo ?? null}
      closedInfo={opts.closedInfo ?? null}
      intentError={opts.intentError ?? null}
      onClearIntentError={onClearIntentError}
      onSendGameIntent={onSendGameIntent}
    />,
  );
  return { onSendGameIntent, onClearIntentError };
}

// =============================================================================
// Loading state — task 3.3
// =============================================================================

describe('NetworkedGameSurface — loading', () => {
  it('shows the loading state until the mirror is built', () => {
    renderSurface({ session: null, events: [] });
    expect(screen.getByTestId('networked-game-loading')).toBeInTheDocument();
    expect(
      screen.queryByTestId('networked-game-surface'),
    ).not.toBeInTheDocument();
  });

  it('renders the playable surface once the mirror exists', () => {
    renderSurface();
    expect(screen.getByTestId('networked-game-surface')).toBeInTheDocument();
    expect(screen.getByTestId('hex-map-container')).toBeInTheDocument();
  });
});

// =============================================================================
// Turn-ownership gate — task 4.3
// =============================================================================

describe('NetworkedGameSurface — turn-ownership gate', () => {
  it('enables intent controls on the local side movement phase', () => {
    // firstMover defaults to Player; Alpha seat → GameSide.Player.
    renderSurface({ playerId: 'pid_host' });
    expect(screen.getByTestId('advance-phase-button')).not.toBeDisabled();
    expect(
      screen.queryByTestId('waiting-for-opponent'),
    ).not.toBeInTheDocument();
  });

  it('shows the waiting indicator during the opponent turn', () => {
    // pid_guest occupies Bravo → GameSide.Opponent; firstMover is
    // Player so it is NOT the guest's turn.
    renderSurface({ playerId: 'pid_guest' });
    expect(screen.getByTestId('waiting-for-opponent')).toBeInTheDocument();
  });

  it('allows a seated player to advance a server-owned phase', () => {
    const authoritative = buildServerPhaseSession();
    const onSendGameIntent = jest.fn(() => true);
    renderSurface({
      session: buildMirrorSession(authoritative.events),
      events: authoritative.events,
      playerId: 'pid_host',
      onSendGameIntent,
    });

    expect(
      screen.queryByTestId('waiting-for-opponent'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('advance-phase-button')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('advance-phase-button'));
    expect(onSendGameIntent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'endPhase' }),
    );
  });
});

// =============================================================================
// Rejected intent — task 2.4 / scenario "Rejected intent surfaces"
// =============================================================================

describe('NetworkedGameSurface — rejected intent', () => {
  it('shows a non-fatal toast for a server Error envelope', () => {
    renderSurface({
      intentError: { code: 'INVALID_INTENT', reason: 'wrong phase' },
    });
    const toast = screen.getByTestId('intent-error-toast');
    expect(toast).toHaveTextContent('INVALID_INTENT');
    expect(toast).toHaveTextContent('wrong phase');
    // The surface itself stays mounted — the connection is unaffected.
    expect(screen.getByTestId('networked-game-surface')).toBeInTheDocument();
  });
});

// =============================================================================
// Fog rendering — task 5.3
// =============================================================================

describe('NetworkedGameSurface — fog rendering', () => {
  it('renders coherently when mid-stream events are omitted (fog gap)', () => {
    const authoritative = buildAuthoritativeSession();
    // Drop every event after the seed — simulates a heavily fog-
    // redacted stream. The surface must still render the seed roster.
    const seedOnly = authoritative.events.slice(0, 1);
    expect(() =>
      renderSurface({
        session: buildMirrorSession(seedOnly),
        events: seedOnly,
      }),
    ).not.toThrow();
    expect(screen.getByTestId('networked-game-surface')).toBeInTheDocument();
  });
});

// =============================================================================
// Lifecycle — task 6.4
// =============================================================================

describe('NetworkedGameSurface — lifecycle', () => {
  it('renders the blocking pause overlay on MatchPaused', () => {
    renderSurface({
      status: 'paused',
      pausedInfo: {
        pendingSlots: ['bravo-1'],
        graceRemainingMs: 30_000,
        pendingExpiresAtMs: null,
      },
    });
    const overlay = screen.getByTestId('match-pause-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveTextContent('bravo-1');
  });

  it('disables intent controls while paused', () => {
    renderSurface({
      playerId: 'pid_host',
      status: 'paused',
      pausedInfo: {
        pendingSlots: ['bravo-1'],
        graceRemainingMs: 30_000,
        pendingExpiresAtMs: null,
      },
    });
    expect(screen.getByTestId('advance-phase-button')).toBeDisabled();
    expect(screen.getByTestId('concede-button')).toBeDisabled();
  });

  it('clears the pause overlay when status returns to ready', () => {
    renderSurface({ status: 'ready', pausedInfo: null });
    expect(screen.queryByTestId('match-pause-overlay')).not.toBeInTheDocument();
  });

  it('renders the terminal panel with a hub link on Close', () => {
    renderSurface({
      status: 'closed',
      closedInfo: { reason: 'Match closed' },
    });
    expect(screen.getByTestId('match-closed-panel')).toBeInTheDocument();
    const link = screen.getByTestId('match-closed-hub-link');
    expect(link).toHaveAttribute('href', '/multiplayer');
  });
});

// =============================================================================
// Intent emission — scenario "Player action becomes an intent"
// =============================================================================

describe('NetworkedGameSurface — intent emission', () => {
  it('forwards an advance-phase intent through onSendGameIntent', () => {
    const onSendGameIntent = jest.fn(() => true);
    renderSurface({ playerId: 'pid_host', onSendGameIntent });
    fireEvent.click(screen.getByTestId('advance-phase-button'));
    expect(onSendGameIntent).toHaveBeenCalledTimes(1);
    expect(onSendGameIntent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'endPhase' }),
    );
  });

  it('forwards a concede intent even during the opponent turn', () => {
    const onSendGameIntent = jest.fn(() => true);
    renderSurface({ playerId: 'pid_guest', onSendGameIntent });
    fireEvent.click(screen.getByTestId('concede-button'));
    expect(onSendGameIntent).toHaveBeenCalledTimes(1);
    expect(onSendGameIntent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'concede' }),
    );
  });

  it('does not direct the player to the single-player gameplay route', () => {
    renderSurface();
    const links = screen.queryAllByRole('link');
    for (const link of links) {
      expect(link).not.toHaveAttribute('href', '/gameplay');
    }
  });
});
