import { act, renderHook, waitFor } from '@testing-library/react';

import type { ICampaignActivityEntry } from '@/lib/campaign/activity/campaignActivityProjection';
import type { ICampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import type { IActivityLogEntry } from '@/types/campaign/ActivityLog';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import {
  _resetCampaignActivityFeedInFlightForTest,
  campaignActivityFeedCacheKey,
  LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL,
  requestAuthoritativeCampaignActivity,
  useCampaignActivityFeed,
} from '@/lib/campaign/hooks/useCampaignActivityFeed';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { createCampaign } from '@/types/campaign/Campaign';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

const CAMPAIGN_ID = 'campaign-activity-feed';
const MATCH_ID = 'match-activity-feed';
const PLAYER_ID = 'participant-feed-1';
const OTHER_PLAYER_ID = 'participant-feed-2';

const FIFO_ENTRY: IActivityLogEntry = {
  id: 'local-1',
  timestamp: '3025-01-01T00:00:00.000Z',
  campaignDay: 1,
  message: 'Local-only spend',
  category: 'finances',
  payload: { event: 'spend', amount: -100, currency: 'C-bills' },
};

const SERVER_ENTRY: ICampaignActivityEntry = {
  ordinal: 0,
  occurredAt: '3025-01-02T00:00:00.000Z',
  campaignDay: 2,
  category: 'finances',
  message: 'Spent 1,000 C-bills on Refit.',
  actorPlayerId: PLAYER_ID,
};

const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

function emitCapableTransport(
  playerId: string,
): ICampaignSyncTransport & { emit(message: IServerMessage): void } {
  const listeners = new Set<(message: IServerMessage) => void>();
  return {
    matchId: MATCH_ID,
    playerId,
    role: 'guest',
    sendProposal: jest.fn(),
    sendDecision: jest.fn(),
    sendHostIntent: jest.fn(),
    sendParticipation: jest.fn(),
    onFrame: (handler) => {
      listeners.add(handler);
      return () => {
        listeners.delete(handler);
      };
    },
    onError: jest.fn(() => () => undefined),
    close: jest.fn(),
    lastSeq: jest.fn(() => -1),
    emit: (message) => {
      listeners.forEach((handler) => handler(message));
    },
  };
}

function loadSoloWithFifo(): void {
  act(() => {
    useCampaignStore().setState({
      campaign: createCampaign('Solo Feed Co.', 'mercenary'),
      activityLog: [FIFO_ENTRY],
    });
  });
}

function loadCoopPair(playerId = PLAYER_ID) {
  const transport = emitCapableTransport(playerId);
  registerCampaignSyncTransport(transport);
  act(() => {
    useCampaignStore().setState({
      campaign: {
        ...createCampaign('Coop Feed Co.', 'mercenary'),
        id: CAMPAIGN_ID,
        coopSession: createHostCoopSession('ROOM1', MATCH_ID),
      },
    });
  });
  return transport;
}

describe('useCampaignActivityFeed', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    _resetCampaignActivityFeedInFlightForTest();
    _resetCampaignSyncTransportsForTest();
    resetCampaignStore();
    clientSafeStorage.removeItem('campaign-store');
    globalThis.fetch = originalFetch;
  });

  it('local source returns the Zustand FIFO with the honest source label and does not fetch', () => {
    loadSoloWithFifo();
    const { result } = renderHook(() => useCampaignActivityFeed(CAMPAIGN_ID));
    expect(result.current).toEqual({
      source: 'local',
      entries: [FIFO_ENTRY],
      sourceLabel: LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('needs-identity does not request the activity route', () => {
    act(() => {
      useCampaignStore().setState({
        campaign: {
          ...createCampaign('Rejoin Feed Co.', 'mercenary'),
          coopSession: createHostCoopSession('ROOM1', MATCH_ID),
        },
      });
    });
    const { result } = renderHook(() => useCampaignActivityFeed(CAMPAIGN_ID));
    expect(result.current.source).toBe('needs-identity');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pair fetches with sessionId and participantId and yields entries plus viewerSeat', async () => {
    loadCoopPair();
    fetchMock.mockImplementation(() =>
      jsonResponse(200, {
        kind: 'activity',
        viewerSeat: 'gm',
        entries: [SERVER_ENTRY],
      }),
    );
    const { result } = renderHook(() => useCampaignActivityFeed(CAMPAIGN_ID));
    await waitFor(() => {
      expect(result.current).toMatchObject({
        source: 'authoritative',
        status: 'ready',
        entries: [SERVER_ENTRY],
        viewerSeat: 'gm',
      });
    });
    const called = String(fetchMock.mock.calls[0]?.[0]);
    const url = new URL(called, 'http://localhost');
    expect(url.pathname).toBe(`/api/campaigns/${CAMPAIGN_ID}/activity`);
    expect(url.searchParams.get('sessionId')).toBe(MATCH_ID);
    expect(url.searchParams.get('participantId')).toBe(PLAYER_ID);
  });

  it('403 yields forbidden carrying the server error, not empty-ready and not local', async () => {
    loadCoopPair();
    fetchMock.mockImplementation(() =>
      jsonResponse(403, { error: 'not a participant in this session' }),
    );
    const { result } = renderHook(() => useCampaignActivityFeed(CAMPAIGN_ID));
    await waitFor(() => {
      expect(result.current).toMatchObject({
        source: 'authoritative',
        status: 'forbidden',
        message: 'not a participant in this session',
      });
    });
    expect(result.current.source).not.toBe('local');
  });

  it('500 yields error rather than an empty feed', async () => {
    loadCoopPair();
    fetchMock.mockImplementation(() =>
      jsonResponse(500, { error: 'failed to read campaign activity' }),
    );
    const { result } = renderHook(() => useCampaignActivityFeed(CAMPAIGN_ID));
    await waitFor(() => {
      expect(result.current).toMatchObject({
        source: 'authoritative',
        status: 'error',
      });
    });
    expect(result.current.source).not.toBe('local');
  });

  it('two consumers with the same key share one in-flight request', async () => {
    loadCoopPair();
    let releaseFetch: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          releaseFetch = resolve;
        }),
    );
    const first = renderHook(() => useCampaignActivityFeed(CAMPAIGN_ID));
    const second = renderHook(() => useCampaignActivityFeed(CAMPAIGN_ID));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    releaseFetch?.(
      await jsonResponse(200, {
        kind: 'activity',
        viewerSeat: 'player',
        entries: [],
      }),
    );
    await waitFor(() => {
      expect(
        first.result.current.source === 'authoritative' &&
          first.result.current.status,
      ).toBe('ready');
      expect(
        second.result.current.source === 'authoritative' &&
          second.result.current.status,
      ).toBe('ready');
    });
  });

  it('in-flight cache key includes participantId so two viewers do not share a feed', () => {
    expect(
      campaignActivityFeedCacheKey(CAMPAIGN_ID, MATCH_ID, PLAYER_ID),
    ).not.toBe(
      campaignActivityFeedCacheKey(CAMPAIGN_ID, MATCH_ID, OTHER_PLAYER_ID),
    );
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    requestAuthoritativeCampaignActivity(CAMPAIGN_ID, MATCH_ID, PLAYER_ID);
    requestAuthoritativeCampaignActivity(
      CAMPAIGN_ID,
      MATCH_ID,
      OTHER_PLAYER_ID,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a CampaignEvent on the live transport triggers exactly one refetch', async () => {
    const transport = loadCoopPair();
    fetchMock.mockImplementation(() =>
      jsonResponse(200, {
        kind: 'activity',
        viewerSeat: 'gm',
        entries: [SERVER_ENTRY],
      }),
    );
    const { result } = renderHook(() => useCampaignActivityFeed(CAMPAIGN_ID));
    await waitFor(() => {
      expect(
        result.current.source === 'authoritative' && result.current.status,
      ).toBe('ready');
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    act(() => {
      transport.emit({
        kind: 'CampaignEvent',
        matchId: MATCH_ID,
        ts: '3025-01-03T00:00:00.000Z',
        event: {
          type: 'FundsChanged',
          sequence: 1,
          campaignId: CAMPAIGN_ID,
          ts: '3025-01-03T00:00:00.000Z',
          authorPlayerId: PLAYER_ID,
          scope: 'campaign',
          payload: { delta: 1, reason: 'Test', balance: 1 },
        },
      });
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
  it('unmount aborts the in-flight request', () => {
    loadCoopPair();
    let passedSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url, init) => {
      passedSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => undefined);
    });
    const { unmount } = renderHook(() => useCampaignActivityFeed(CAMPAIGN_ID));
    expect(passedSignal?.aborted).toBe(false);
    unmount();
    expect(passedSignal?.aborted).toBe(true);
  });
});
