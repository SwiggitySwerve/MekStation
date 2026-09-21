import { act, renderHook } from '@testing-library/react';

import type { GmRewindPreviewOutcome } from '@/components/multiplayer/gmRewindPreviewPhrasing';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { useGmRewindProducers } from '@/pages-modules/multiplayer/useGmRewindProducers';
import { GameEventType } from '@/types/gameplay/GameSessionInterfaces';

const HEAD = { branchId: 'main-after-rewind', revision: 17, generation: 4 };
const MIRROR_EVENTS: readonly IGameEvent[] = [
  {
    id: 'evt-1',
    type: GameEventType.PhaseChanged,
    timestamp: '2026-09-17T00:00:01.000Z',
    sequence: 6,
    data: {},
  } as unknown as IGameEvent,
];
const EXPECTED_BODY = {
  targetRevision: 16,
  expectedBranchId: 'main-after-rewind',
  expectedRevision: 17,
  expectedDigest: '',
  expectedGeneration: 4,
};
const PREVIEW_ANSWER: GmRewindPreviewOutcome = {
  kind: 'preview',
  matchId: 'match-1',
  targetRevision: 16,
  priorHead: {
    branchId: 'main-after-rewind',
    revision: 17,
    effectiveGeneration: 4,
  },
  changedViewerIds: ['pid_host', 'pid_guest'],
  entries: [],
};
const COMMITTED = {
  kind: 'committed',
  matchId: 'match-1',
  activatedBranchId: 'candidate-1',
  priorBranchId: 'main-after-rewind',
  effectiveGeneration: 5,
  invalidations: [],
} as const;
const ORIGINAL_FETCH = global.fetch;

function mockFetch(status = 200, head: typeof HEAD | null = HEAD) {
  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/timeline')) {
      return {
        status,
        json: async () => ({
          timelineDigest: 'audit-only-digest',
          lineage: { effectiveHead: head },
        }),
      } as Response;
    }
    return {
      status: 200,
      json: async () =>
        url.endsWith('/rewind-preview') ? PREVIEW_ANSWER : COMMITTED,
    } as Response;
  });
  global.fetch = fetchMock as typeof fetch;
  return fetchMock;
}

function mountHook(
  matchId: string | null = 'match-1',
  wireToken: string | null = 'wire-token',
) {
  return renderHook(() =>
    useGmRewindProducers({ matchId, wireToken, mirrorEvents: MIRROR_EVENTS }),
  );
}

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
});

describe('useGmRewindProducers', () => {
  it('posts the server head and an empty digest, returning the preview outcome', async () => {
    const fetchMock = mockFetch();
    const { result } = mountHook();

    await act(async () => {
      await expect(result.current.onPreviewRewind()).resolves.toStrictEqual(
        PREVIEW_ANSWER,
      );
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/matches/match-1/rewind-preview',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wire-token',
        },
        body: JSON.stringify(EXPECTED_BODY),
      },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/matches/match-1/timeline',
      {
        method: 'GET',
        headers: { Authorization: 'Bearer wire-token' },
      },
    );
  });

  it.each([
    ['unavailable', 503, HEAD],
    ['no-head', 200, null],
  ] as const)(
    'does not post when the head is %s',
    async (_kind, status, head) => {
      const fetchMock = mockFetch(status, head);
      const { result } = mountHook();

      await act(async () => {
        await expect(result.current.onPreviewRewind()).resolves.toStrictEqual({
          kind: 'unavailable',
        });
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/matches/match-1/timeline', {
        method: 'GET',
        headers: { Authorization: 'Bearer wire-token' },
      });
    },
  );

  it('floors the target at zero for a zero server revision', async () => {
    const fetchMock = mockFetch(200, { ...HEAD, revision: 0 });
    const { result } = mountHook();

    await act(async () => {
      await result.current.onPreviewRewind();
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/matches/match-1/rewind-preview',
      expect.objectContaining({
        body: JSON.stringify({
          ...EXPECTED_BODY,
          targetRevision: 0,
          expectedRevision: 0,
        }),
      }),
    );
  });

  it('confirms the saved head without reading the changed server head again', async () => {
    const fetchMock = mockFetch();
    const { result } = mountHook();
    await act(async () => {
      await result.current.onPreviewRewind();
    });
    const nextFetch = mockFetch(200, {
      branchId: 'later-head',
      revision: 21,
      generation: 5,
    });
    await act(async () => {
      await expect(result.current.onConfirmRewind()).resolves.toStrictEqual(
        COMMITTED,
      );
    });

    expect(nextFetch).toHaveBeenCalledTimes(1);
    expect(nextFetch).toHaveBeenCalledWith(
      '/api/matches/match-1/rewind-commit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wire-token',
        },
        body: JSON.stringify(EXPECTED_BODY),
      },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [null, 'wire-token'],
    ['match-1', null],
  ])(
    'answers unavailable without fetching when identity is %s / %s',
    async (matchId, wireToken) => {
      const fetchMock = mockFetch();
      const { result } = mountHook(matchId, wireToken);
      await act(async () => {
        await expect(result.current.onPreviewRewind()).resolves.toStrictEqual({
          kind: 'unavailable',
        });
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
