/**
 * Multiplayer lobby page — game-surface integration test.
 *
 * Per `complete-multiplayer-game-surface` task 7.3: the page renders the
 * lobby panel while `status === 'lobby'` and the networked game surface
 * once the lobby flips to `status === 'active'`.
 *
 * Lives under `src/__tests__/pages/` (not `src/pages/__tests__/`) so the
 * Next.js route validator does not treat the spec as a broken route.
 *
 * @spec openspec/specs/multiplayer-game-surface/spec.md
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

import type { IUseMultiplayerSessionResult } from '@/hooks/useMultiplayerSession';
import type { ILobbyUpdated } from '@/types/multiplayer/Protocol';

import { buildMirrorSession } from '@/lib/multiplayer/mirrorMatchSession';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { encodeTokenForWire } from '@/types/multiplayer/Player';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { roomCode: 'ROOM01' } }),
}));

// The networked game surface needs only the hook's contract — the hook
// itself is exercised by its own suite. A mutable holder lets each test
// swap the lobby status before render.
let mockSession: IUseMultiplayerSessionResult;
jest.mock('@/hooks/useMultiplayerSession', () => ({
  useMultiplayerSession: () => mockSession,
}));

import LobbyPage from '@/pages/multiplayer/lobby/[roomCode]';

// =============================================================================
// Fixtures
// =============================================================================

const PLAYER_ID = 'pid_3yJ8Qw1aBcDeFgHiJkLmNoPqRsTuVwXyZ';

function wireToken(): string {
  return encodeTokenForWire({
    playerId: PLAYER_ID,
    issuedAt: '2026-05-19T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    publicKey: 'cHVibGljLWtleQ==',
    signature: 'c2lnbmF0dXJl',
  });
}

function lobbyState(status: 'lobby' | 'active'): ILobbyUpdated {
  return {
    kind: 'LobbyUpdated',
    matchId: 'match-1',
    ts: '2026-05-19T00:00:00.000Z',
    status,
    hostPlayerId: PLAYER_ID,
    seats: [
      {
        slotId: 'alpha-1',
        side: 'Alpha',
        seatNumber: 1,
        occupant: { playerId: PLAYER_ID, displayName: 'Host' },
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
    ],
  };
}

function buildMirror() {
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
    { id: 'match-1', createdAt: '2026-05-19T00:00:00.000Z' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player);
  session = advancePhase(session);
  return {
    mirror: buildMirrorSession(session.events),
    events: session.events,
  };
}

function baseSession(status: 'lobby' | 'active'): IUseMultiplayerSessionResult {
  const { mirror, events } = buildMirror();
  return {
    status: status === 'active' ? 'ready' : 'connecting',
    lobbyState: lobbyState(status),
    events: [],
    error: null,
    sendIntent: jest.fn(),
    lastSeq: -1,
    mirrorSession: status === 'active' ? mirror : null,
    mirrorEvents: status === 'active' ? events : [],
    sendGameIntent: jest.fn(() => true),
    intentError: null,
    clearIntentError: jest.fn(),
    pausedInfo: null,
    closedInfo: null,
  };
}

function mockFetch(): void {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/multiplayer/invites/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ matchId: 'match-1', status: 'lobby' }),
      } as Response;
    }
    if (url.includes('/api/multiplayer/auth/token')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          token: wireToken(),
          playerId: PLAYER_ID,
          displayName: 'Host',
        }),
      } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  }) as unknown as typeof fetch;
}

/**
 * Drive the page past the vault-unlock gate: type a password, click
 * "Connect to lobby", wait for the token mint to resolve.
 */
async function unlockVault(): Promise<void> {
  await waitFor(() =>
    expect(screen.getByText('Unlock vault')).toBeInTheDocument(),
  );
  fireEvent.change(screen.getByPlaceholderText('Vault password'), {
    target: { value: 'hunter2' },
  });
  await act(async () => {
    fireEvent.click(screen.getByText('Connect to lobby'));
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('Multiplayer lobby page — surface swap on status', () => {
  beforeEach(() => {
    mockFetch();
  });

  it('renders the lobby panel while status is lobby', async () => {
    mockSession = baseSession('lobby');
    render(<LobbyPage />);
    await unlockVault();

    // The lobby panel is shown; the game surface is NOT mounted.
    await waitFor(() =>
      expect(
        screen.queryByTestId('networked-game-surface'),
      ).not.toBeInTheDocument(),
    );
  });

  it('mounts the networked game surface once the lobby flips to active', async () => {
    mockSession = baseSession('active');
    render(<LobbyPage />);
    await unlockVault();

    await waitFor(() =>
      expect(screen.getByTestId('networked-game-surface')).toBeInTheDocument(),
    );
    // The prior placeholder routed the player to `/gameplay`; the real
    // surface never does.
    const links = screen.queryAllByRole('link');
    for (const link of links) {
      expect(link).not.toHaveAttribute('href', '/gameplay');
    }
  });

  it('renders multiplayer unavailable when the socket closes with the stub marker', async () => {
    mockSession = {
      ...baseSession('lobby'),
      status: 'closed',
      lobbyState: null,
      error: {
        code: 'INTERNAL_ERROR',
        reason:
          'WebSocket handler is a Wave 2 stub; full intent dispatch lands in Wave 3',
      },
      closedInfo: {
        code: 'INTERNAL_ERROR',
        reason:
          'WebSocket handler is a Wave 2 stub; full intent dispatch lands in Wave 3',
      },
    };
    render(<LobbyPage />);
    await unlockVault();

    expect(
      await screen.findByTestId('multiplayer-unavailable-panel'),
    ).toHaveTextContent('Multiplayer unavailable');
    expect(screen.queryByText('Joining lobby...')).not.toBeInTheDocument();
  });

  it('no longer references the single-player gameplay placeholder copy', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/multiplayer/lobby/[roomCode].tsx'),
      'utf8',
    );
    expect(src).not.toContain('dedicated multiplayer game UI');
    expect(src).toContain('NetworkedGameSurface');
  });
});
