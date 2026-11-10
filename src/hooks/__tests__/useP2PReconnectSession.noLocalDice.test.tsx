/**
 * A guest that reconnects and applies the host's events never rolls
 * dice itself (C-1c PR 0, Option A - the positive side).
 *
 * The red side is `InteractiveSession.mirrorDice.test.ts`: a mirror
 * roller that is reached throws. This test is the other half. If any
 * production guest path resolved a PSR locally, the roller installed by
 * the real `defaultAdoptRebuiltSession` would be called here, and this
 * test would find it - which would be a second bug, not a flake.
 *
 * Real edges: the real adopt, the real in-memory append, the real
 * gameplay store, a real host session driven through one whole turn
 * including the End-phase PSR the host resolves. Only the channel, the
 * durable log and the room are injected.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

// The factory is the only seam that lets this test count calls to the
// roller the real adopt installs.
jest.mock('@/lib/p2p/mirrorDiceRoller', () => ({
  ...jest.requireActual('@/lib/p2p/mirrorDiceRoller'),
  createMirrorDiceRoller: jest.fn(),
}));

import type { IGameSessionChannel } from '@/lib/p2p';
import type { IGameEvent, IGameSession } from '@/types/gameplay';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { useP2PReconnectSession } from '@/hooks/useP2PReconnectSession';
import * as mirrorDiceRoller from '@/lib/p2p/mirrorDiceRoller';
import { useP2PMirrorStore } from '@/lib/p2p/p2pMirrorStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GameEventType, GamePhase } from '@/types/gameplay';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';

import { runHostThroughFirstTurn } from '../../engine/__tests__/InteractiveSession.psrEndFixture.test-helpers';

const MATCH_ID = 'match-1';

function makeChannel() {
  let replayCallback: Parameters<
    IGameSessionChannel['onReplayStream']
  >[0] = () => undefined;
  const channel = {
    broadcastEvent: jest.fn(),
    onPeerEvent: jest.fn(() => jest.fn()),
    broadcastIntent: jest.fn(),
    onPeerIntent: jest.fn(() => jest.fn()),
    broadcastRejection: jest.fn(),
    onPeerRejection: jest.fn(() => jest.fn()),
    broadcastReconnectRequest: jest.fn(),
    onReconnectRequest: jest.fn(() => jest.fn()),
    broadcastReplayStream: jest.fn(),
    onReplayStream: jest.fn((callback) => {
      replayCallback = callback;
      return jest.fn();
    }),
    broadcastReconnectReject: jest.fn(),
    onReconnectReject: jest.fn(() => jest.fn()),
  } as IGameSessionChannel;
  return {
    channel,
    emitReplay: (events: readonly IGameEvent[]) =>
      replayCallback({
        kind: 'replay-stream',
        matchId: MATCH_ID,
        events,
        done: true,
      }),
  };
}

const metadata = {
  matchId: MATCH_ID,
  hostPeerId: 'host-peer',
  guestPeerId: 'guest-peer',
  status: 'active' as const,
  lastActivity: '2026-04-30T00:00:00.000Z',
};

function countOf(session: IGameSession, type: GameEventType): number {
  return session.events.filter((event) => event.type === type).length;
}

describe('P2P guest reconnect never rolls dice', () => {
  let hostSession: IGameSession;
  let rollerCalls: jest.Mock;

  beforeEach(() => {
    useP2PMirrorStore.getState().reset();
    hostSession = runHostThroughFirstTurn();
    rollerCalls = jest.fn();
    // Wrap the real mirror roller so a call is both counted and still fatal.
    const real = jest.requireActual<typeof mirrorDiceRoller>(
      '@/lib/p2p/mirrorDiceRoller',
    ).createMirrorDiceRoller;
    jest
      .mocked(mirrorDiceRoller.createMirrorDiceRoller)
      .mockImplementation(() => {
        const roller = real();
        return () => {
          rollerCalls();
          return roller();
        };
      });
  });
  afterEach(() => {
    useP2PMirrorStore.getState().reset();
    useGameplayStore.getState().reset?.();
  });

  it('the host turn really includes a host-resolved PSR (non-vacuity)', () => {
    expect(countOf(hostSession, GameEventType.PSRTriggered)).toBeGreaterThan(0);
    expect(countOf(hostSession, GameEventType.PSRResolved)).toBeGreaterThan(0);
    expect(hostSession.currentState.turn).toBe(2);
    expect(hostSession.currentState.phase).toBe(GamePhase.Initiative);
  });

  it('applies a whole host turn, PSR included, through the real adopt and append without calling the roller', async () => {
    const hostEvents = hostSession.events;
    const prefixLength = hostEvents.findIndex(
      (event) => event.type === GameEventType.PSRTriggered,
    );
    expect(prefixLength).toBeGreaterThan(0);
    const prefix = hostEvents.slice(0, prefixLength);

    // The guest's board before the reconnect: the host's log up to the
    // moment the PSR was queued, adopted exactly as production adopts it.
    const store = useGameplayStore.getState();
    const prefixSession = hydrateGameSessionFromEvents(hostSession.id, prefix);
    const seeded = InteractiveSession.fromSession(
      prefixSession,
      mirrorDiceRoller.createMirrorDiceRoller(),
    );
    store.setInteractiveSession(seeded);

    const { channel, emitReplay } = makeChannel();
    renderHook(() =>
      useP2PReconnectSession(MATCH_ID, {
        getLastSequence: jest.fn().mockResolvedValue(prefix.length - 1),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        // The prefix lives in memory only (nothing durable to reconcile),
        // so the host answers with the tail from the guest's last sequence.
        getEventsForMatch: jest.fn().mockResolvedValue([]),
        deleteEventsForMatch: jest.fn().mockResolvedValue(undefined),
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => true,
        createChannel: () => channel,
        persistReplayEvent: jest.fn().mockResolvedValue(undefined),
        redirectToLobby: jest.fn(),
      }),
    );

    await waitFor(() =>
      expect(channel.broadcastReconnectRequest).toHaveBeenCalled(),
    );
    act(() => emitReplay(hostEvents.slice(prefixLength)));

    await waitFor(() =>
      expect(
        useGameplayStore.getState().interactiveSession?.getSession().events,
      ).toHaveLength(hostEvents.length),
    );

    const guest = useGameplayStore.getState().interactiveSession;
    expect(guest).not.toBeNull();
    const guestSession = guest!.getSession();
    // The guest holds the host's PSR outcome, byte for byte, and got it
    // without rolling.
    expect(countOf(guestSession, GameEventType.PSRResolved)).toBe(
      countOf(hostSession, GameEventType.PSRResolved),
    );
    expect(guestSession.currentState).toEqual(hostSession.currentState);
    expect(rollerCalls).not.toHaveBeenCalled();
  });

  it('adopts a rebuilt session with the mirror roller and still never rolls', async () => {
    const hostEvents = hostSession.events;
    const store = useGameplayStore.getState();
    // A stale board the divergence path will replace.
    store.setInteractiveSession(
      InteractiveSession.fromSession(
        hydrateGameSessionFromEvents(MATCH_ID, hostEvents.slice(0, 2)),
        mirrorDiceRoller.createMirrorDiceRoller(),
      ),
    );
    const stale = hostEvents
      .slice(0, 2)
      .map((event, index) =>
        index === 1 ? { ...event, id: 'stale-event' } : event,
      );

    const { channel, emitReplay } = makeChannel();
    renderHook(() =>
      useP2PReconnectSession(MATCH_ID, {
        getLastSequence: jest.fn().mockResolvedValue(1),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        getEventsForMatch: jest.fn().mockResolvedValue(stale),
        deleteEventsForMatch: jest.fn().mockResolvedValue(undefined),
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => true,
        createChannel: () => channel,
        persistReplayEvent: jest.fn().mockResolvedValue(undefined),
        hydrateFromMatchLog: jest.fn().mockResolvedValue(hostSession),
        redirectToLobby: jest.fn(),
      }),
    );

    await waitFor(() =>
      expect(channel.broadcastReconnectRequest).toHaveBeenCalled(),
    );
    // Forget the roller the stale board above was built with: only the
    // adoption the hook performs may count.
    jest.mocked(mirrorDiceRoller.createMirrorDiceRoller).mockClear();
    act(() => emitReplay(hostEvents));

    await waitFor(() =>
      expect(
        useGameplayStore.getState().interactiveSession?.getSession().events,
      ).toHaveLength(hostEvents.length),
    );
    expect(
      mirrorDiceRoller.createMirrorDiceRoller as jest.Mock,
    ).toHaveBeenCalled();
    expect(rollerCalls).not.toHaveBeenCalled();
  });
});
