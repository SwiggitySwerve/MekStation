/**
 * The host GM correction surface on the production multiplayer pages
 * (roadmap U5b, E2E-25's client half).
 *
 * The relationship this pins is a PAGE relationship, not a component one:
 * `NetworkedGameSurface` has rendered `NetworkedHostGmControls` for a
 * `host-gm` projection since umbrella 19.3, but only when a caller passes
 * both correction handlers - and the only caller that ever did was
 * `/e2e/networked-command-proof`. So in production the host GM had no
 * correction control at all, and E2E-25's "GM finalizes a correction with
 * a private reason" had no surface to start from. A row that stopped at
 * the component would pass with the page still passing nothing.
 *
 * Lives under `src/pages-modules/multiplayer/__tests__/` rather than
 * `src/pages/multiplayer/__tests__/` because `next.config.ts` sets
 * `pageExtensions: ['ts','tsx','js','jsx']`, so a `.tsx` under `src/pages`
 * would be picked up as a route.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
 */

import '@testing-library/jest-dom';
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

import { commitGmCombatRewind } from '@/lib/multiplayer/client/commitGmCombatRewind';
import { previewGmCombatRewind } from '@/lib/multiplayer/client/previewGmCombatRewind';
import { buildMirrorSession } from '@/lib/multiplayer/mirrorMatchSession';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  decodeTokenFromWire,
  encodeTokenForWire,
} from '@/types/multiplayer/Player';
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

const mockQuery: { roomCode?: string; matchId?: string } = {
  roomCode: 'ROOM01',
};
jest.mock('next/router', () => ({
  useRouter: () => ({ query: mockQuery }),
}));

let mockSession: IUseMultiplayerSessionResult;
jest.mock('@/hooks/useMultiplayerSession', () => ({
  useMultiplayerSession: () => mockSession,
}));

jest.mock('@/lib/multiplayer/client/previewGmCombatRewind', () => ({
  previewGmCombatRewind: jest.fn(),
}));

jest.mock('@/lib/multiplayer/client/commitGmCombatRewind', () => ({
  commitGmCombatRewind: jest.fn(),
  GmCombatRewindTransportError: class GmCombatRewindTransportError extends Error {
    override readonly name = 'GmCombatRewindTransportError';
  },
}));

import LobbyPage from '@/pages/multiplayer/lobby/[roomCode]';
import SpectatePage from '@/pages/multiplayer/spectate/[matchId]';

const mockedPreview = previewGmCombatRewind as jest.MockedFunction<
  typeof previewGmCombatRewind
>;
const mockedCommit = commitGmCombatRewind as jest.MockedFunction<
  typeof commitGmCombatRewind
>;

// =============================================================================
// Fixtures
// =============================================================================

const HOST_ID = 'pid_3yJ8Qw1aBcDeFgHiJkLmNoPqRsTuVwXyZ';
const GUEST_ID = 'pid_guest';
const TOKEN_KEY = 'mekstation.multiplayer.token.ROOM01';

function wireTokenFor(playerId: string): string {
  return encodeTokenForWire({
    playerId,
    issuedAt: '2026-09-17T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    publicKey: 'cHVibGljLWtleQ==',
    signature: 'c2lnbmF0dXJl',
  });
}

/** Seed the page's per-room identity so the vault prompt is skipped. */
function seedIdentity(playerId: string, displayName: string): void {
  const wire = wireTokenFor(playerId);
  const token = decodeTokenFromWire(wire);
  if (!token) throw new Error('fixture token did not decode');
  window.sessionStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({
      state: { wireToken: wire, token, displayName },
      matchId: 'match-1',
    }),
  );
}

function lobbyState(): ILobbyUpdated {
  return {
    kind: 'LobbyUpdated',
    matchId: 'match-1',
    ts: '2026-09-17T00:00:00.000Z',
    status: 'active',
    hostPlayerId: HOST_ID,
    seats: [
      {
        slotId: 'alpha-1',
        side: 'Alpha',
        seatNumber: 1,
        occupant: { playerId: HOST_ID, displayName: 'Host' },
        kind: 'human',
        ready: true,
      },
      {
        slotId: 'bravo-1',
        side: 'Bravo',
        seatNumber: 1,
        occupant: { playerId: GUEST_ID, displayName: 'Guest' },
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
    { id: 'match-1', createdAt: '2026-09-17T00:00:00.000Z' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player);
  session = advancePhase(session);
  return { mirror: buildMirrorSession(session.events), events: session.events };
}

function activeSession(): IUseMultiplayerSessionResult {
  const { mirror, events } = buildMirror();
  return {
    status: 'ready',
    lobbyState: lobbyState(),
    events: [],
    error: null,
    sendIntent: jest.fn(),
    lastSeq: -1,
    mirrorSession: mirror,
    mirrorEvents: events,
    mirrorBlocked: null,
    sendGameIntent: jest.fn(() => true),
    intentError: null,
    clearIntentError: jest.fn(),
    pausedInfo: null,
    closedInfo: null,
    projectionSignal: null,
  };
}

function mockFetch(): void {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/multiplayer/invites/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ matchId: 'match-1', status: 'active' }),
      } as Response;
    }
    if (url.includes('/spectate')) {
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }
    if (url.includes('/api/multiplayer/auth/token')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          token: wireTokenFor(GUEST_ID),
          playerId: GUEST_ID,
          displayName: 'Watcher',
        }),
      } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  }) as unknown as typeof fetch;
}

const CORRECTION_TESTIDS = [
  'networked-host-gm-controls',
  'networked-gm-preview-btn',
  'networked-gm-approve-btn',
  'networked-gm-private-reason',
] as const;

// =============================================================================
// Rows
// =============================================================================

describe('multiplayer lobby page - the host GM correction surface', () => {
  beforeEach(() => {
    mockQuery.roomCode = 'ROOM01';
    delete mockQuery.matchId;
    mockFetch();
    window.sessionStorage.clear();
    mockedPreview.mockReset();
    mockedPreview.mockResolvedValue({ kind: 'unavailable' });
    mockedCommit.mockReset();
  });

  it('mounts the correction controls and the private-reason input for the host GM', async () => {
    seedIdentity(HOST_ID, 'Host');
    mockSession = activeSession();
    render(<LobbyPage />);

    await waitFor(() =>
      expect(screen.getByTestId('networked-game-surface')).toBeInTheDocument(),
    );
    for (const testId of CORRECTION_TESTIDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
  });

  it('gives the private-reason input an accessible name that says who can read it', async () => {
    seedIdentity(HOST_ID, 'Host');
    mockSession = activeSession();
    render(<LobbyPage />);

    const input = await screen.findByLabelText('Private reason (GM only)');
    expect(input).toBe(screen.getByTestId('networked-gm-private-reason'));
  });

  it('mounts none of it for a player at the same table', async () => {
    seedIdentity(GUEST_ID, 'Guest');
    mockSession = activeSession();
    render(<LobbyPage />);

    await waitFor(() =>
      expect(screen.getByTestId('networked-game-surface')).toBeInTheDocument(),
    );
    for (const testId of CORRECTION_TESTIDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    }
  });
});

describe('multiplayer spectate page - the host GM correction surface', () => {
  beforeEach(() => {
    delete mockQuery.roomCode;
    mockQuery.matchId = 'match-1';
    mockFetch();
    window.sessionStorage.clear();
    mockedPreview.mockReset();
    mockedPreview.mockResolvedValue({ kind: 'unavailable' });
    mockedCommit.mockReset();
  });

  it('mounts none of it for a spectator', async () => {
    mockSession = activeSession();
    render(<SpectatePage />);

    await waitFor(() =>
      expect(screen.getByText('Unlock vault to spectate')).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByPlaceholderText('Vault password'), {
      target: { value: 'hunter2' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Watch match'));
    });

    await waitFor(() =>
      expect(screen.getByTestId('networked-game-surface')).toBeInTheDocument(),
    );
    for (const testId of CORRECTION_TESTIDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    }
  });
});
