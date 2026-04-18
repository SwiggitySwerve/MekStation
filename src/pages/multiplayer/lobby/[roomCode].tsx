/**
 * Multiplayer Lobby — `/multiplayer/lobby/[roomCode]`.
 *
 * Pages Router lobby panel page. Wave 5 of Phase 4 (capstone integration).
 *
 * Flow:
 *   1. Read `roomCode` from the URL.
 *   2. Mint or reuse a vault token via `/api/multiplayer/auth/token`.
 *   3. Resolve `roomCode` -> `matchId` via the invite endpoint.
 *   4. Open a WebSocket via `useMultiplayerSession` and render
 *      `LobbyPanel` from the `LobbyUpdated` snapshots the server pushes.
 *   5. When the lobby flips to `status === 'active'`, switch the surface
 *      to a "match in progress" placeholder. The full game UI is out of
 *      scope for Wave 5; the placeholder links back to the existing
 *      single-player game UI as the gameplay surface.
 */

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import type { IPlayerToken } from '@/types/multiplayer/Player';

import { LobbyPanel } from '@/components/multiplayer/LobbyPanel';
import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import { decodeTokenFromWire } from '@/types/multiplayer/Player';

// =============================================================================
// Types
// =============================================================================

interface ITokenState {
  readonly wireToken: string;
  readonly token: IPlayerToken;
  readonly displayName: string;
}

interface IInviteResolution {
  readonly matchId: string;
  readonly status: 'lobby' | 'active' | 'completed';
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build the WebSocket URL from the current page origin. Mirrors the
 * REST `/api/multiplayer/matches` response's `wsUrl` shape so a future
 * SSR-issued URL would be a drop-in replacement.
 */
function buildWsUrl(matchId: string): string | null {
  if (typeof window === 'undefined') return null;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/api/multiplayer/socket?matchId=${encodeURIComponent(matchId)}`;
}

/**
 * Mint a token via the auth endpoint. Used inline whenever the lobby
 * page boots without one in state — sets up state for the
 * `useMultiplayerSession` connect call.
 */
async function mintToken(password: string): Promise<ITokenState> {
  const res = await fetch('/api/multiplayer/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    token: string;
    playerId: string;
    displayName: string;
  };
  const decoded = decodeTokenFromWire(data.token);
  if (!decoded) throw new Error('Server returned a malformed token');
  return {
    wireToken: data.token,
    token: decoded,
    displayName: data.displayName,
  };
}

// =============================================================================
// Page
// =============================================================================

export default function LobbyPage(): React.ReactElement {
  const router = useRouter();
  const roomCode =
    typeof router.query.roomCode === 'string' ? router.query.roomCode : null;

  const [resolution, setResolution] = useState<IInviteResolution | null>(null);
  const [tokenState, setTokenState] = useState<ITokenState | null>(null);
  const [password, setPassword] = useState<string>('');
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Resolve room code -> matchId once the route param is hydrated.
  // Re-resolves if the user navigates between codes without unmounting.
  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    setResolveError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/multiplayer/invites/${encodeURIComponent(roomCode)}`,
        );
        if (cancelled) return;
        if (res.status === 404) {
          setResolveError('Invite code not found or expired');
          return;
        }
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as IInviteResolution;
        setResolution(data);
      } catch (e) {
        if (!cancelled) {
          setResolveError(
            e instanceof Error ? e.message : 'Failed to resolve invite',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  // Build the connect args once the prerequisites are in place.
  // `useMultiplayerSession` itself handles SSR by no-op'ing when any
  // arg is null.
  const wsUrl = resolution ? buildWsUrl(resolution.matchId) : null;
  const auth = useMemo(
    () =>
      tokenState
        ? {
            playerId: tokenState.token.playerId,
            token: tokenState.token,
          }
        : null,
    [tokenState],
  );
  const session = useMultiplayerSession(
    wsUrl,
    resolution?.matchId ?? null,
    auth,
  );

  // After the WS opens + first LobbyUpdated arrives, we may need to
  // OccupySeat to take a slot. The host's seat was auto-occupied at
  // create time; joiners take the first open human seat.
  useEffect(() => {
    if (!session.lobbyState || !tokenState) return;
    const ownSeat = session.lobbyState.seats.find(
      (s) => s.occupant?.playerId === tokenState.token.playerId,
    );
    if (ownSeat) return;
    const target = session.lobbyState.seats.find(
      (s) => s.kind === 'human' && !s.occupant,
    );
    if (!target) return;
    // Fire and forget — the LobbyUpdated broadcast that follows is the
    // confirmation. If OccupySeat fails (race with another joiner), the
    // server replies with INVALID_INTENT and the user retries by
    // clicking another empty seat in the panel.
    session.sendIntent({ kind: 'OccupySeat', slotId: target.slotId });
    // We only want to attempt occupy once per snapshot transition where
    // we don't yet sit anywhere. Re-running on every render would spam
    // the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.lobbyState?.seats.length, tokenState?.token.playerId]);

  // ---------------------------------------------------------------------------
  // Render branches
  // ---------------------------------------------------------------------------

  if (!roomCode) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-slate-200">
        <p>Loading…</p>
      </div>
    );
  }

  if (resolveError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-slate-200">
        <Link
          href="/multiplayer"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back to multiplayer hub
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Lobby not found</h1>
        <p className="mt-2 text-sm text-rose-400">{resolveError}</p>
      </div>
    );
  }

  if (!tokenState) {
    return (
      <div className="mx-auto max-w-md px-4 py-8 text-slate-200">
        <Link
          href="/multiplayer"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back to multiplayer hub
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Unlock vault</h1>
        <p className="mt-2 text-xs text-slate-400">
          Lobby <span className="font-mono text-slate-200">{roomCode}</span>{' '}
          requires a signed identity. Enter your vault password to mint a token.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          placeholder="Vault password"
        />
        <button
          type="button"
          onClick={() => {
            setAuthError(null);
            void (async () => {
              try {
                const t = await mintToken(password);
                setTokenState(t);
              } catch (e) {
                setAuthError(
                  e instanceof Error ? e.message : 'Failed to mint token',
                );
              }
            })();
          }}
          disabled={password.length === 0}
          className="mt-2 w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Connect to lobby
        </button>
        {authError && (
          <p className="mt-2 text-xs text-rose-400" role="alert">
            {authError}
          </p>
        )}
      </div>
    );
  }

  if (!resolution || !session.lobbyState) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-slate-200">
        <Link
          href="/multiplayer"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back to multiplayer hub
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Joining lobby…</h1>
        <p className="mt-2 text-xs text-slate-400">
          Status: {session.status}. Waiting for the first lobby snapshot.
        </p>
        {session.error && (
          <p className="mt-2 text-xs text-rose-400" role="alert">
            {session.error.code}: {session.error.reason}
          </p>
        )}
      </div>
    );
  }

  const isActive = session.lobbyState.status === 'active';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-200">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/multiplayer"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back to multiplayer hub
        </Link>
        <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-300">
          {roomCode}
        </span>
      </header>

      {session.error && session.status !== 'ready' && (
        <div className="mb-4 rounded border border-rose-700 bg-rose-900/20 p-3 text-sm text-rose-200">
          {session.error.code}: {session.error.reason}
        </div>
      )}

      {!isActive ? (
        <LobbyPanel
          lobbyState={session.lobbyState}
          myPlayerId={tokenState.token.playerId}
          onIntent={session.sendIntent}
        />
      ) : (
        <section className="rounded-lg border border-emerald-700 bg-emerald-900/10 p-6 text-center">
          <h2 className="text-2xl font-semibold text-emerald-200">
            Match starting…
          </h2>
          <p className="mt-2 text-sm text-emerald-300/80">
            Engine has launched. The dedicated multiplayer game UI is wired in a
            future wave. For now, hop over to the existing gameplay surface to
            continue.
          </p>
          <Link
            href="/gameplay"
            className="mt-4 inline-block rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Open gameplay
          </Link>
        </section>
      )}
    </div>
  );
}
