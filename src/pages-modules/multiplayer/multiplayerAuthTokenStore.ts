/**
 * Session-scoped wire-identity persistence for the multiplayer lobby
 * (umbrella 6.4's cold-reload clause).
 *
 * A hard reload mid-match remounts the lobby page with fresh React
 * state, and the minted token lived only in that state - so every
 * reload landed on the password prompt and the live match view never
 * returned. The co-op campaign path already persists its wire token in
 * sessionStorage (coopCampaignAuthTokenStore, the store #1357 moved
 * credentials INTO when they left the URL); this is the same pattern
 * keyed by room code, which the reload URL carries. sessionStorage is
 * per-tab and dies with it - the same custody class the campaign token
 * already accepted.
 */

import type { MultiplayerTokenState } from './multiplayerPage.helpers';

const STORAGE_PREFIX = 'mekstation.multiplayer.token.';

function storageKey(roomCode: string): string {
  return `${STORAGE_PREFIX}${roomCode.toUpperCase()}`;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage ?? null;
}

export interface IStoredMultiplayerAuth {
  readonly state: MultiplayerTokenState;
  /**
   * The resolved matchId rides with the identity because the invite
   * deliberately stops resolving once the match goes active - a party
   * to the match still knows which match it is, and the socket still
   * authenticates the wire token server-side.
   */
  readonly matchId: string | null;
}

export function storeMultiplayerToken(
  roomCode: string,
  state: MultiplayerTokenState,
  matchId: string | null,
): void {
  const storage = getSessionStorage();
  if (!storage) return;
  const stored: IStoredMultiplayerAuth = { state, matchId };
  storage.setItem(storageKey(roomCode), JSON.stringify(stored));
}

export function readMultiplayerToken(
  roomCode: string | null | undefined,
): IStoredMultiplayerAuth | null {
  if (!roomCode) return null;
  const storage = getSessionStorage();
  if (!storage) return null;
  const raw = storage.getItem(storageKey(roomCode));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      state?: Partial<MultiplayerTokenState> & {
        token?: { playerId?: unknown };
      };
      matchId?: unknown;
    };
    const state = parsed.state;
    if (
      state &&
      typeof state.wireToken === 'string' &&
      state.token !== null &&
      typeof state.token === 'object' &&
      typeof state.token.playerId === 'string' &&
      typeof state.displayName === 'string'
    ) {
      return {
        state: state as MultiplayerTokenState,
        matchId: typeof parsed.matchId === 'string' ? parsed.matchId : null,
      };
    }
    // A terminal stale-token rejection deliberately retains only this
    // durable route. It is not a malformed credential and must survive
    // until the next successful vault reauthentication replaces it.
    if (typeof parsed.matchId === 'string' && state === undefined) {
      return null;
    }
  } catch {
    // Malformed storage falls through to removal below.
  }
  storage.removeItem(storageKey(roomCode));
  return null;
}

export function readMultiplayerMatchId(
  roomCode: string | null | undefined,
): string | null {
  if (!roomCode) return null;
  const storage = getSessionStorage();
  if (!storage) return null;
  const raw = storage.getItem(storageKey(roomCode));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { matchId?: unknown };
    return typeof parsed.matchId === 'string' ? parsed.matchId : null;
  } catch {
    return null;
  }
}

/** Drop a refused wire credential without losing the match resume route. */
export function clearMultiplayerTokenCredential(roomCode: string): void {
  const storage = getSessionStorage();
  if (!storage) return;
  const matchId = readMultiplayerMatchId(roomCode);
  if (matchId) {
    storage.setItem(storageKey(roomCode), JSON.stringify({ matchId }));
    return;
  }
  storage.removeItem(storageKey(roomCode));
}

export function clearMultiplayerToken(roomCode: string): void {
  getSessionStorage()?.removeItem(storageKey(roomCode));
}
