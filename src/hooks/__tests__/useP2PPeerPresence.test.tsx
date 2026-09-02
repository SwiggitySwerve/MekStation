/**
 * The P2P peer-drop detector (umbrella 19.2, finding #63).
 *
 * `deriveLocalMatchStatusFromAwareness` has existed since the P2P work
 * landed, and its only caller was `useSyncRoom` - a hook nothing mounts.
 * So a peer vanishing MID-MATCH set no status at all, and the only
 * writer that ever ran was the reconnect timeout, which fires on a cold
 * reload into a match. A gate over that alone would be decorative.
 *
 * These rows drive the detector the game-session page mounts, against
 * the real gameplay store, with awareness injected.
 */

import { act, renderHook } from '@testing-library/react';

import type { IGameSessionAwarenessState } from '@/lib/p2p/gameSessionRoles';

import { useP2PPeerPresence } from '@/hooks/useP2PPeerPresence';
import { useGameplayStore } from '@/stores/useGameplayStore';

const HOST: IGameSessionAwarenessState = {
  peerId: 'peer-host',
  role: 'host',
  assignedAt: '2026-09-02T00:00:00.000Z',
};
const GUEST: IGameSessionAwarenessState = {
  peerId: 'peer-guest',
  role: 'guest',
  assignedAt: '2026-09-02T00:00:00.000Z',
};

const P2P_MATCH = 'p2p-ROOM01';

function mountDetector(
  matchId: string | null,
  peerFrames: readonly (readonly IGameSessionAwarenessState[])[],
  localPeerId: string,
) {
  let frame = 0;
  const getPeers = jest.fn(() => {
    const current = peerFrames[Math.min(frame, peerFrames.length - 1)];
    frame += 1;
    return current;
  });
  const view = renderHook(() =>
    useP2PPeerPresence(matchId, {
      getPeers,
      getLocalPeerId: () => localPeerId,
      pollIntervalMs: 1000,
    }),
  );
  return { ...view, getPeers };
}

function tick(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe('useP2PPeerPresence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useGameplayStore.getState().resetLocalMatchStatus();
  });
  afterEach(() => {
    jest.useRealTimers();
    useGameplayStore.getState().resetLocalMatchStatus();
  });

  it('lands on hostPending when the guest sees the host disappear', () => {
    const { unmount } = mountDetector(
      P2P_MATCH,
      [[HOST, GUEST], [GUEST]],
      GUEST.peerId,
    );
    tick(1000);
    expect(useGameplayStore.getState().localMatchStatus).toBe('hostPending');
    unmount();
  });

  it('lands on guestPending when the host sees the guest disappear', () => {
    const { unmount } = mountDetector(
      P2P_MATCH,
      [[HOST, GUEST], [HOST]],
      HOST.peerId,
    );
    tick(1000);
    expect(useGameplayStore.getState().localMatchStatus).toBe('guestPending');
    unmount();
  });

  it('returns to live when the peer comes back', () => {
    // The recovery half. A gate that refuses forever after one dropped
    // frame is worse than no gate: the player cannot finish the match.
    const { unmount } = mountDetector(
      P2P_MATCH,
      [[HOST, GUEST], [GUEST], [HOST, GUEST]],
      GUEST.peerId,
    );
    tick(1000);
    expect(useGameplayStore.getState().localMatchStatus).toBe('hostPending');
    tick(1000);
    expect(useGameplayStore.getState().localMatchStatus).toBe('live');
    unmount();
  });

  it('never writes the aborted status', () => {
    // `aborted` is reachable-when-emitted on this transport: only the
    // WebSocket seat-timeout writes it, and nothing in the P2P path
    // does. The gate still answers for it; this row is what keeps the
    // claim honest rather than a comment.
    const { unmount } = mountDetector(
      P2P_MATCH,
      [[HOST, GUEST], [GUEST], [], [HOST, GUEST], []],
      GUEST.peerId,
    );
    for (let index = 0; index < 5; index += 1) {
      tick(1000);
      expect(useGameplayStore.getState().localMatchStatus).not.toBe('aborted');
    }
    unmount();
  });

  it('does nothing for a session that is not a P2P match', () => {
    // The single-player carve-out at its source: a local battle has no
    // peers to lose, and must never be polled or gated.
    const { getPeers, unmount } = mountDetector(
      'demo-game-001',
      [[HOST, GUEST], [GUEST]],
      GUEST.peerId,
    );
    tick(5000);
    expect(getPeers).not.toHaveBeenCalled();
    expect(useGameplayStore.getState().localMatchStatus).toBe('live');
    unmount();
  });

  it('stops polling once the surface unmounts', () => {
    const { getPeers, unmount } = mountDetector(
      P2P_MATCH,
      [[HOST, GUEST], [GUEST]],
      GUEST.peerId,
    );
    tick(1000);
    const callsWhileMounted = getPeers.mock.calls.length;
    unmount();
    tick(5000);
    expect(getPeers.mock.calls.length).toBe(callsWhileMounted);
  });
});
