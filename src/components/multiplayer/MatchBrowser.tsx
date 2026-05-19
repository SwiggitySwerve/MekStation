/**
 * MatchBrowser — the match-discovery surface on the multiplayer hub.
 *
 * `add-matchmaking-and-spectator` (M3). Lists joinable lobbies (matches
 * in `status: 'lobby'` with an open human seat) returned by the
 * `GET /api/multiplayer/lobbies` endpoint, each with its layout, host,
 * and seat-occupancy summary. A one-click "Join" per row navigates the
 * player to `/multiplayer/lobby/[roomCode]` — exactly the route a
 * shared invite code opens (design D3): the browser is a *discovery*
 * layer over the unchanged room-code join path.
 *
 * The list is a snapshot at fetch time (design D7): it refreshes on an
 * interval and on an explicit user refresh, so a lobby that fills up or
 * launches drops off the list.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-matchmaking/spec.md
 */

import React, { useCallback, useEffect, useState } from 'react';

import type { IJoinableLobby } from '@/lib/multiplayer/server/joinableLobbies';

// =============================================================================
// Constants
// =============================================================================

/** Auto-refresh cadence for the joinable-lobby list (design D7). */
export const MATCH_BROWSER_REFRESH_MS = 15_000;

// =============================================================================
// Types
// =============================================================================

export interface IMatchBrowserProps {
  /**
   * Bearer token for the authenticated `GET /api/multiplayer/lobbies`
   * request. When `null` the browser shows an "unlock vault" prompt
   * rather than fetching — discovery is gated like every other
   * multiplayer endpoint.
   */
  readonly wireToken: string | null;
  /**
   * Navigate the player into a lobby by room code. Wired to
   * `router.push('/multiplayer/lobby/<code>')` by the hub page; injected
   * so the component is trivially testable without a router.
   */
  readonly onJoinLobby: (roomCode: string) => void;
  /**
   * Test seam: override the fetch implementation. Defaults to the
   * global `fetch`. The auto-refresh interval is also disabled when a
   * test passes `refreshMs: 0`.
   */
  readonly fetchImpl?: typeof fetch;
  /** Override the auto-refresh cadence; `0` disables the interval. */
  readonly refreshMs?: number;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

// =============================================================================
// Helpers
// =============================================================================

/** Human-readable occupancy label, e.g. "1 / 2 seats · 1 open". */
function occupancyLabel(lobby: IJoinableLobby): string {
  const { occupancy } = lobby;
  const parts = [
    `${occupancy.occupiedHumanSeats} / ${occupancy.humanSeats} seats`,
    `${occupancy.openHumanSeats} open`,
  ];
  if (occupancy.aiSeats > 0) parts.push(`${occupancy.aiSeats} AI`);
  if (occupancy.spectatorSeats > 0) {
    parts.push(`${occupancy.spectatorSeats} watching`);
  }
  return parts.join(' · ');
}

// =============================================================================
// Component
// =============================================================================

/**
 * The match browser. Fetches joinable lobbies, renders one row per
 * lobby with a Join button, refreshes on an interval + on demand, and
 * shows an empty state (not an error) when no lobbies are open.
 */
export function MatchBrowser({
  wireToken,
  onJoinLobby,
  fetchImpl,
  refreshMs = MATCH_BROWSER_REFRESH_MS,
}: IMatchBrowserProps): React.ReactElement {
  const [lobbies, setLobbies] = useState<readonly IJoinableLobby[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  const doFetch = fetchImpl ?? fetch;

  /**
   * Fetch the joinable-lobby list. A failure surfaces as an error
   * state; an empty list is a normal `ready` state with zero rows (the
   * empty-state branch, not an error — per the spec scenario).
   */
  const refresh = useCallback(async () => {
    if (!wireToken) return;
    setState((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    setError(null);
    try {
      const res = await doFetch('/api/multiplayer/lobbies', {
        headers: { Authorization: `Bearer ${wireToken}` },
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        lobbies: readonly IJoinableLobby[];
      };
      setLobbies(data.lobbies);
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load lobbies');
      setState('error');
    }
  }, [doFetch, wireToken]);

  // Initial fetch + auto-refresh interval (design D7). The interval is
  // cleared on unmount and re-armed if `refreshMs` / token changes.
  useEffect(() => {
    if (!wireToken) return;
    void refresh();
    if (refreshMs <= 0) return;
    const timer = setInterval(() => {
      void refresh();
    }, refreshMs);
    return () => clearInterval(timer);
  }, [refresh, refreshMs, wireToken]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!wireToken) {
    return (
      <section
        data-testid="match-browser"
        className="rounded-lg border border-slate-700 bg-slate-900 p-6"
      >
        <h2 className="mb-2 text-lg font-semibold text-sky-300">
          Browse matches
        </h2>
        <p className="text-sm text-slate-400">
          Unlock your vault to browse open lobbies.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="match-browser"
      className="rounded-lg border border-slate-700 bg-slate-900 p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sky-300">Browse matches</h2>
        <button
          type="button"
          data-testid="match-browser-refresh"
          onClick={() => {
            void refresh();
          }}
          disabled={state === 'loading'}
          className="rounded border border-slate-700 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          {state === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {state === 'error' && error && (
        <div
          role="alert"
          data-testid="match-browser-error"
          className="mb-3 rounded border border-rose-700 bg-rose-900/30 p-3 text-sm text-rose-200"
        >
          {error}
        </div>
      )}

      {state === 'ready' && lobbies.length === 0 && (
        <p
          data-testid="match-browser-empty"
          className="rounded border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400"
        >
          No open lobbies right now. Create a match or refresh.
        </p>
      )}

      {state === 'loading' && lobbies.length === 0 && (
        <p
          data-testid="match-browser-loading"
          className="text-sm text-slate-400"
        >
          Loading open lobbies…
        </p>
      )}

      {lobbies.length > 0 && (
        <ul data-testid="match-browser-list" className="flex flex-col gap-2">
          {lobbies.map((lobby) => (
            <li
              key={lobby.matchId}
              data-testid="match-browser-row"
              className="flex items-center justify-between gap-3 rounded border border-slate-700 bg-slate-950/50 p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-100">
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-sky-300 uppercase">
                    {lobby.layout}
                  </span>
                  <span className="truncate">{lobby.hostDisplayName}</span>
                  {lobby.fogOfWar && (
                    <span className="rounded bg-indigo-900/50 px-1.5 py-0.5 text-[10px] text-indigo-300 uppercase">
                      fog
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {occupancyLabel(lobby)}
                </p>
              </div>
              <button
                type="button"
                data-testid="match-browser-join"
                onClick={() => onJoinLobby(lobby.roomCode)}
                className="shrink-0 rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Join
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
