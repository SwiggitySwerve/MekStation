/**
 * Watches the P2P awareness roster and records when a peer is gone
 * (umbrella 19.2, finding #63).
 *
 * `deriveLocalMatchStatusFromAwareness` has existed since the P2P work
 * landed, and its only caller was `useSyncRoom` - a hook nothing in the
 * app mounts. So the peer-drop detector was dead code, and the only
 * writer that ever ran was `useP2PReconnectSession`'s reconnect
 * timeout, which fires on a COLD RELOAD into a match. A peer vanishing
 * mid-match set no status at all, which is why the dock kept every
 * command live while the other player was gone.
 *
 * This hook mounts that detector on the surface that needs it. It
 * writes the SAME store field the timeout path writes - one field, two
 * writers - so the gate has one thing to read and no new state exists
 * to drift.
 */

import { useEffect } from 'react';

import type { IGameSessionAwarenessState } from '@/lib/p2p/gameSessionRoles';

import {
  deriveLocalMatchStatusFromAwareness,
  getGameSessionAwarenessStates,
} from '@/lib/p2p/gameSessionRoles';
import { getLocalPeerId as getSyncLocalPeerId } from '@/lib/p2p/SyncProvider';
import { useSyncRoomStore } from '@/lib/p2p/useSyncRoomStore';
import { useGameplayStore } from '@/stores/useGameplayStore';

import { deriveReconnectRoomCode } from './useP2PReconnectSession';

/** How often the roster is re-read; awareness events are unreliable. */
const PEER_POLL_INTERVAL_MS = 1000;

export interface IUseP2PPeerPresenceOptions {
  readonly getPeers?: () => readonly IGameSessionAwarenessState[];
  readonly getLocalPeerId?: () => string | null;
  readonly pollIntervalMs?: number;
}

/**
 * Poll the awareness roster for this match and keep the gameplay
 * store's local match status current.
 *
 * A non-P2P match id is a local battle: there are no peers to lose, so
 * the hook does not poll and does not write. That is the single-player
 * carve-out at its source rather than a special case further down.
 */
export function useP2PPeerPresence(
  matchId: string | null,
  options: IUseP2PPeerPresenceOptions = {},
): void {
  const getPeers = options.getPeers;
  const getLocalPeerId = options.getLocalPeerId;
  const pollIntervalMs = options.pollIntervalMs ?? PEER_POLL_INTERVAL_MS;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!matchId || deriveReconnectRoomCode(matchId) === null) return;

    const readPeers = getPeers ?? defaultGetPeers;
    const readLocalPeerId = getLocalPeerId ?? defaultGetLocalPeerId;
    let previous: readonly IGameSessionAwarenessState[] = [];

    const sample = (): void => {
      const current = readPeers();
      const status = deriveLocalMatchStatusFromAwareness(
        previous,
        current,
        readLocalPeerId(),
      );
      previous = current;
      // `null` means "the roster says nothing about the local peer" -
      // it is not an answer, and overwriting a real status with a
      // guess is how a gate starts lying.
      if (status === 'guestPending' || status === 'hostPending') {
        useGameplayStore.getState().setLocalMatchStatus(status);
      } else if (status === 'live') {
        useGameplayStore.getState().resetLocalMatchStatus();
      }
    };

    // Sample once at mount so `previous` is the real roster rather than
    // an empty one. Without it the first poll compares "nobody" against
    // "everybody" and reports a join, and the first real DEPARTURE is
    // the second poll - a whole interval of commands issued into a
    // match the peer already left.
    //
    // A mount where the peer is ALREADY absent writes nothing: the
    // roster shows no departure, only an absence, and that case belongs
    // to `useP2PReconnectSession`'s timeout. Guessing here would race
    // that hook to write the same field from less information.
    sample();
    const interval = setInterval(sample, pollIntervalMs);
    return () => clearInterval(interval);
  }, [matchId, getPeers, getLocalPeerId, pollIntervalMs]);
}

function defaultGetPeers(): readonly IGameSessionAwarenessState[] {
  const awareness =
    useSyncRoomStore.getState().activeRoom?.webrtcProvider.awareness;
  return awareness
    ? getGameSessionAwarenessStates(awareness)
    : getGameSessionAwarenessStates();
}

function defaultGetLocalPeerId(): string | null {
  return getSyncLocalPeerId() ?? useSyncRoomStore.getState().localPeerId;
}
