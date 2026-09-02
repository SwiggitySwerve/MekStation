/**
 * The mirror-divergence half of the P2P command gate (umbrella 19.2,
 * findings #62 and #79).
 *
 * When a guest's stored match log disagrees with the peer's authoritative
 * stream, `reconcileMatchLogMirror` DELETES the durable log and
 * `applyReplayStream` appends the peer's events on top of whatever the
 * in-memory session already had - then calls `setLive()`. The client
 * detects that its history was wrong and tells itself everything is fine
 * (#79). `onMirrorPrefixDivergence` has been the intended way to say so
 * since the P2P work landed, and nothing ever passed one (#62).
 *
 * These rows pin the gate's answer. The divergence is deliberately NOT
 * an arm of `localMatchStatus`: the peer-presence detector rewrites that
 * field every second while the peer is present, and divergence is
 * detected in exactly that state - on a replay the peer just streamed -
 * so an arm there would be erased within a second of being set.
 */

import type { LocalMatchStatus } from '@/stores/useGameplayStore';

import { p2pCommandAvailability } from '../p2pCommandGate';
import { useP2PMirrorStore } from '../p2pMirrorStore';

const REPLACED = { kind: 'replaced', position: 3 } as const;
const TRUNCATED = { kind: 'truncated', position: 5 } as const;

function reasonFor(
  status: LocalMatchStatus,
  divergence: Parameters<typeof p2pCommandAvailability>[1],
): string {
  const availability = p2pCommandAvailability(status, divergence);
  if (availability.available) throw new Error('expected a refusal');
  return availability.reason;
}

describe('p2pCommandAvailability with a diverged mirror', () => {
  it.each([
    ['replaced', REPLACED],
    ['truncated', TRUNCATED],
  ])('refuses commands after a %s prefix', (_kind, divergence) => {
    // Both verdict shapes are the same fact for the player: the history
    // they were playing is not the history the other player has.
    expect(p2pCommandAvailability('live', divergence).available).toBe(false);
  });

  it('says something a peer-loss refusal never says', () => {
    const divergenceReason = reasonFor('live', REPLACED);
    const peerLossReason = reasonFor('hostPending', null);
    expect(divergenceReason).not.toBe(peerLossReason);
    expect(divergenceReason).not.toMatch(/[0-9]/);
    expect(divergenceReason).not.toContain('match stream');
  });

  it('outranks a missing peer', () => {
    // Precedence, and not arbitrarily: a peer who left may come back,
    // and the refusal says so. A diverged board does not heal by
    // waiting, and telling the player to wait would be a lie.
    expect(reasonFor('hostPending', REPLACED)).toBe(
      reasonFor('live', REPLACED),
    );
    expect(reasonFor('hostPending', REPLACED)).not.toBe(
      reasonFor('hostPending', null),
    );
  });

  it('leaves a clean match playable', () => {
    // The vacuity guard for every row above.
    expect(p2pCommandAvailability('live', null)).toStrictEqual({
      available: true,
    });
  });
});

describe('useP2PMirrorStore', () => {
  beforeEach(() => {
    useP2PMirrorStore.getState().reset();
  });
  afterEach(() => {
    useP2PMirrorStore.getState().reset();
  });

  it('records a non-match verdict against the match it happened in', () => {
    useP2PMirrorStore.getState().recordDivergence('p2p-ROOM01', {
      kind: 'replaced',
      position: 3,
      storedId: 'id-b',
      receivedId: 'id-x',
    });
    expect(
      useP2PMirrorStore.getState().divergenceFor('p2p-ROOM01'),
    ).toStrictEqual({ kind: 'replaced', position: 3 });
  });

  it('ignores a match verdict', () => {
    useP2PMirrorStore.getState().recordDivergence('p2p-ROOM01', {
      kind: 'match',
    });
    expect(useP2PMirrorStore.getState().divergenceFor('p2p-ROOM01')).toBeNull();
  });

  it('does not carry one match divergence into another', () => {
    // The flag is sticky for the session, and a session outlives a
    // match: without the match id a player who diverged in one battle
    // would find their next one refused before it began.
    useP2PMirrorStore
      .getState()
      .recordDivergence('p2p-ROOM01', { kind: 'truncated', position: 2 });
    expect(useP2PMirrorStore.getState().divergenceFor('p2p-ROOM02')).toBeNull();
  });

  it('offers no way to clear a divergence for the match it happened in', () => {
    // E4c-B1 ships the refusal, not the recovery. The board really is
    // wrong until it is rebuilt from the peer's log, and a clear() the
    // UI could call would be a button that lies. `reset` exists for a
    // fresh session, and clearing by recording a `match` verdict must
    // NOT work - after a divergence the log was deleted, so the very
    // next reconcile returns `match` trivially, and treating that as
    // recovery is the false-clear this row forbids.
    const store = useP2PMirrorStore.getState();
    store.recordDivergence('p2p-ROOM01', { kind: 'truncated', position: 2 });
    store.recordDivergence('p2p-ROOM01', { kind: 'match' });
    expect(store.divergenceFor('p2p-ROOM01')).toStrictEqual({
      kind: 'truncated',
      position: 2,
    });
  });
});
