/**
 * The divergence callback reaches the store (umbrella 19.2, finding #62)
 * - the wiring half.
 *
 * `useP2PReconnectSession` has fired `onMirrorPrefixDivergence` with the
 * right verdict since the P2P work landed (its own suite has four rows
 * on that). What never existed is a caller passing one:
 * `GameSessionPage.lifecycle.ts` mounted the hook with `redirectToLobby`
 * and nothing else, so the verdict went to a `?.` and vanished.
 *
 * This row drives the REAL lifecycle hook and captures the options it
 * mounts the reconnect hook with, then fires the captured callback and
 * asserts the store carries it. A row that wrote the store directly
 * would pass with the callback still unpassed - which IS the finding.
 */

import type { NextRouter } from 'next/router';

import { renderHook } from '@testing-library/react';

import type { IUseP2PReconnectSessionOptions } from '@/hooks/useP2PReconnectSession';

import { useP2PMirrorStore } from '@/lib/p2p/p2pMirrorStore';

const mockCaptured: {
  matchId?: string | null;
  options?: IUseP2PReconnectSessionOptions;
} = {};

jest.mock('@/hooks/useP2PReconnectSession', () => ({
  deriveReconnectRoomCode: (matchId: string) =>
    matchId.startsWith('p2p-') ? matchId.slice('p2p-'.length) : null,
  useP2PReconnectSession: (
    matchId: string | null,
    options: IUseP2PReconnectSessionOptions,
  ) => {
    mockCaptured.matchId = matchId;
    mockCaptured.options = options;
  },
}));

jest.mock('@/hooks/useP2PPeerPresence', () => ({
  useP2PPeerPresence: () => {},
}));

import { useGameSessionLifecycle } from '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle';

const router = {
  replace: jest.fn(),
  push: jest.fn(),
  query: {},
  asPath: '/gameplay/games/p2p-ROOM01',
} as unknown as NextRouter;

function mountLifecycle(matchId: string | null): void {
  renderHook(() =>
    useGameSessionLifecycle({
      router,
      routeId: matchId,
      matchId,
      session: null,
      interactiveSession: null,
      isSpectatorMode: false,
      isCompletedForRedirect: false,
      isCampaignBound: false,
      loadSession: jest.fn(async () => {}),
      createDemoSession: jest.fn(),
    }),
  );
}

describe('game-session lifecycle mirror-divergence wiring', () => {
  beforeEach(() => {
    mockCaptured.matchId = undefined;
    mockCaptured.options = undefined;
    useP2PMirrorStore.getState().reset();
  });
  afterEach(() => {
    useP2PMirrorStore.getState().reset();
  });

  it('passes a divergence handler that records the verdict for this match', () => {
    mountLifecycle('p2p-ROOM01');

    expect(mockCaptured.options?.onMirrorPrefixDivergence).toBeDefined();
    mockCaptured.options?.onMirrorPrefixDivergence?.({
      kind: 'replaced',
      position: 1,
      storedId: 'id-b',
      receivedId: 'id-x',
    });

    expect(
      useP2PMirrorStore.getState().divergenceFor('p2p-ROOM01'),
    ).toStrictEqual({ kind: 'replaced', position: 1 });
  });

  it('records nothing for a clean prefix', () => {
    // The control: a handler that recorded every verdict would gate a
    // healthy match, and every row above would still pass.
    mountLifecycle('p2p-ROOM01');
    mockCaptured.options?.onMirrorPrefixDivergence?.({ kind: 'match' });
    expect(useP2PMirrorStore.getState().divergenceFor('p2p-ROOM01')).toBeNull();
  });
});
