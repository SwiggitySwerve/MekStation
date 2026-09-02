/**
 * The game-session page's command gate for P2P matches (umbrella 19.2,
 * finding #61).
 *
 * The page is where "which transport is this session on" is known - the
 * route's match id carries the `p2p-` prefix - so the page is what turns
 * the P2P status into the `CommandAvailability` the dock already takes.
 *
 * Returns `undefined` for a local battle rather than a permissive
 * answer. An ABSENT gate is what keeps the dock's pre-19.2 behaviour
 * provably unchanged for single player; a gate that always allows would
 * be one edit away from refusing commands that were always safe.
 */

import { useMemo } from 'react';

import type { CommandAvailability } from '@/types/gameplay/TacticalCommandInterfaces';

import { p2pCommandAvailability } from '@/lib/p2p/p2pCommandGate';
import { useGameplayStore } from '@/stores/useGameplayStore';

import { deriveReconnectRoomCode } from './useP2PReconnectSession';

export function useP2PCommandGate(
  matchId: string | null,
): CommandAvailability | undefined {
  const localMatchStatus = useGameplayStore((state) => state.localMatchStatus);
  const isP2PMatch =
    matchId !== null && deriveReconnectRoomCode(matchId) !== null;
  return useMemo(
    () => (isP2PMatch ? p2pCommandAvailability(localMatchStatus) : undefined),
    [isP2PMatch, localMatchStatus],
  );
}
