/**
 * The default wiring `useP2PReconnectSession` uses when a caller injects
 * nothing - the real stores, the real channel, the real match log.
 *
 * Split out of `useP2PReconnectSession.ts` when the divergence rebuild
 * (umbrella 19.2, E4c-B2) pushed that file past `max-lines`, following
 * the sibling-file convention the rest of the tree uses. These are the
 * production edges; the hook above is the flow.
 */

import type { IGameSession } from '@/types/gameplay';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  createGameSessionChannel,
  getGameSessionAwarenessStates,
  getLocalPeerId as getSyncLocalPeerId,
  matchLogStorage,
  normalizeRoomCode,
  type IGameSessionChannel,
} from '@/lib/p2p';
import { useSyncRoomStore } from '@/lib/p2p/useSyncRoomStore';
import { useGameplayStore } from '@/stores/useGameplayStore';

const P2P_MATCH_ID_PREFIX = 'p2p-';

export function deriveReconnectRoomCode(matchId: string): string | null {
  if (!matchId.startsWith(P2P_MATCH_ID_PREFIX)) return null;
  const rawRoomCode = matchId.slice(P2P_MATCH_ID_PREFIX.length);
  return rawRoomCode ? normalizeRoomCode(rawRoomCode) : null;
}

export async function defaultEnsureSyncRoom(matchId: string): Promise<void> {
  const store = useSyncRoomStore.getState();
  const roomCode = deriveReconnectRoomCode(matchId);
  if (!roomCode) return;
  if (store.activeRoom?.roomCode === roomCode) return;
  await store.joinRoom(roomCode);
}

export function defaultGetLocalPeerId(): string | null {
  return getSyncLocalPeerId() ?? useSyncRoomStore.getState().localPeerId;
}

export function defaultGetHostPresent(hostPeerId: string | null): boolean {
  if (!hostPeerId) return false;
  return getGameSessionAwarenessStates().some((peer) => {
    return peer.role === 'host' && peer.peerId === hostPeerId;
  });
}

export function defaultCreateChannel(
  matchId: string,
  localPeerId: string,
): IGameSessionChannel {
  return createGameSessionChannel({ matchId, localPeerId });
}

export async function appendReplayEventToActiveSession(
  matchId: string,
  event: IGameEvent,
): Promise<void> {
  const store = useGameplayStore.getState();
  const interactiveSession = store.interactiveSession;
  if (interactiveSession) {
    interactiveSession.appendEvent(event);
    store.setSession(interactiveSession.getSession());
    return;
  }
  await matchLogStorage.appendEvent(matchId, event);
}

export function defaultSetHydratedSession(session: IGameSession): void {
  useGameplayStore.getState().setSession(session);
}

/** Durable append - never short-circuits to the in-memory session. */
export async function persistReplayEventToMatchLog(
  matchId: string,
  event: IGameEvent,
): Promise<void> {
  await matchLogStorage.appendEvent(matchId, event);
}

/**
 * Replace the live board with the rebuilt one.
 *
 * The interactive session is replaced too, not just the store's
 * `session`: it is the authority the dock commits through, and leaving
 * the stale one in place would rebuild the display over a board that
 * still disagrees with the peer.
 */
export function defaultAdoptRebuiltSession(session: IGameSession): void {
  const store = useGameplayStore.getState();
  if (store.interactiveSession) {
    store.setInteractiveSession(InteractiveSession.fromSession(session));
  }
  store.setSession(session);
}

export function defaultSetHostPending(): void {
  useGameplayStore.getState().setLocalMatchStatus('hostPending');
}

export function defaultSetLive(): void {
  useGameplayStore.getState().resetLocalMatchStatus();
}

export function defaultRedirectToLobby(matchId: string, reason: string): void {
  const roomCode = deriveReconnectRoomCode(matchId);
  const target = roomCode
    ? `/gameplay/lobby/${encodeURIComponent(roomCode)}`
    : '/gameplay/games';
  window.location.assign(`${target}?error=${encodeURIComponent(reason)}`);
}

export function defaultGetHostEventsFromSeq(
  seq: number,
): readonly IGameEvent[] {
  const interactiveSession = useGameplayStore.getState().interactiveSession;
  const session =
    interactiveSession?.getSession() ?? useGameplayStore.getState().session;
  return (session?.events ?? [])
    .filter((event) => event.sequence >= seq)
    .sort((left, right) => left.sequence - right.sequence);
}
