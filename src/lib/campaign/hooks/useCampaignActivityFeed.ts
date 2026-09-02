/**
 * One viewer's campaign activity: local FIFO, a rejoin prompt, or the
 * authoritative route. The client never re-filters by role — viewerSeat
 * is an echo of the seat the server already resolved.
 */

import { useEffect, useState } from 'react';
import { useStore } from 'zustand';

import type { ICampaignActivityEntry } from '@/lib/campaign/activity/campaignActivityProjection';
import type { CampaignSeat } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import type { IActivityLogEntry } from '@/types/campaign/ActivityLog';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { getActiveCampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

import { useCampaignViewerIdentity } from './useCampaignViewerIdentity';

export const LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL =
  "This browser's campaign log (not shared)";

export const CAMPAIGN_ACTIVITY_NEEDS_IDENTITY_MESSAGE =
  'Rejoin this co-op session to load the shared campaign log.';

export type CampaignActivityFeedState =
  | {
      readonly source: 'local';
      readonly entries: readonly IActivityLogEntry[];
      readonly sourceLabel: typeof LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL;
    }
  | {
      readonly source: 'needs-identity';
      readonly message: string;
    }
  | {
      readonly source: 'authoritative';
      readonly status: 'loading' | 'ready' | 'forbidden' | 'error';
      readonly entries: readonly ICampaignActivityEntry[];
      readonly viewerSeat: CampaignSeat | null;
      readonly message?: string;
    };

type AuthoritativeOutcome = Extract<
  CampaignActivityFeedState,
  { source: 'authoritative' }
>;

type InFlightOutcome = AuthoritativeOutcome | { readonly status: 'aborted' };

interface IInFlightEntry {
  readonly promise: Promise<InFlightOutcome>;
  readonly controller: AbortController;
  refs: number;
}

const inFlight = new Map<string, IInFlightEntry>();

/**
 * participantId is part of the key on purpose. Two viewers in one
 * session are different people; dropping it would let a second mount
 * reuse the first viewer's body and seat echo.
 */
export function campaignActivityFeedCacheKey(
  campaignId: string,
  sessionId: string,
  participantId: string,
): string {
  return `${campaignId}\0${sessionId}\0${participantId}`;
}

export function _resetCampaignActivityFeedInFlightForTest(): void {
  // forEach rather than for-of: this tsconfig targets ES5, where a Map
  // iterator cannot be spread or iterated without downlevelIteration.
  inFlight.forEach((entry) => {
    entry.controller.abort();
  });
  inFlight.clear();
}

function readErrorString(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const error = Reflect.get(body, 'error');
  return typeof error === 'string' ? error : undefined;
}

function isActivityBody(body: unknown): body is {
  readonly kind: 'activity';
  readonly viewerSeat: CampaignSeat;
  readonly entries: readonly ICampaignActivityEntry[];
} {
  if (typeof body !== 'object' || body === null) return false;
  const kind = Reflect.get(body, 'kind');
  const viewerSeat = Reflect.get(body, 'viewerSeat');
  const entries = Reflect.get(body, 'entries');
  return (
    kind === 'activity' &&
    (viewerSeat === 'gm' || viewerSeat === 'player') &&
    Array.isArray(entries)
  );
}

async function parseActivityResponse(
  response: Response,
): Promise<AuthoritativeOutcome> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (response.status === 403) {
    return {
      source: 'authoritative',
      status: 'forbidden',
      entries: [],
      viewerSeat: null,
      message: readErrorString(body) ?? 'forbidden',
    };
  }
  if (!response.ok) {
    return {
      source: 'authoritative',
      status: 'error',
      entries: [],
      viewerSeat: null,
      message: readErrorString(body),
    };
  }
  if (!isActivityBody(body)) {
    return {
      source: 'authoritative',
      status: 'error',
      entries: [],
      viewerSeat: null,
      message: 'unexpected activity response',
    };
  }
  return {
    source: 'authoritative',
    status: 'ready',
    entries: body.entries,
    viewerSeat: body.viewerSeat,
  };
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      Reflect.get(error, 'name') === 'AbortError')
  );
}

/** Shared in-flight GET so two mounted consumers of the same viewer share one request. */
export function requestAuthoritativeCampaignActivity(
  campaignId: string,
  sessionId: string,
  participantId: string,
): {
  readonly promise: Promise<InFlightOutcome>;
  readonly release: () => void;
} {
  const key = campaignActivityFeedCacheKey(
    campaignId,
    sessionId,
    participantId,
  );
  let entry = inFlight.get(key);
  if (!entry) {
    const controller = new AbortController();
    const params = new URLSearchParams({ sessionId, participantId });
    const url = `/api/campaigns/${encodeURIComponent(campaignId)}/activity?${params.toString()}`;
    const promise: Promise<InFlightOutcome> = fetch(url, {
      method: 'GET',
      signal: controller.signal,
    })
      .then(parseActivityResponse)
      .catch((error: unknown) => {
        if (isAbortError(error)) return { status: 'aborted' as const };
        return {
          source: 'authoritative' as const,
          status: 'error' as const,
          entries: [],
          viewerSeat: null,
        };
      })
      .finally(() => {
        if (inFlight.get(key)?.promise === promise) {
          inFlight.delete(key);
        }
      });
    entry = { promise, controller, refs: 0 };
    inFlight.set(key, entry);
  }
  entry.refs += 1;
  const held = entry;
  return {
    promise: held.promise,
    release: () => {
      const current = inFlight.get(key);
      if (!current || current.promise !== held.promise) return;
      current.refs -= 1;
      if (current.refs <= 0) {
        current.controller.abort();
        inFlight.delete(key);
      }
    },
  };
}

function localFeed(
  entries: readonly IActivityLogEntry[],
): CampaignActivityFeedState {
  return {
    source: 'local',
    entries,
    sourceLabel: LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL,
  };
}

function needsIdentityFeed(): CampaignActivityFeedState {
  return {
    source: 'needs-identity',
    message: CAMPAIGN_ACTIVITY_NEEDS_IDENTITY_MESSAGE,
  };
}

function loadingFeed(): AuthoritativeOutcome {
  return {
    source: 'authoritative',
    status: 'loading',
    entries: [],
    viewerSeat: null,
  };
}

export function useCampaignActivityFeed(
  campaignId: string,
): CampaignActivityFeedState {
  const identity = useCampaignViewerIdentity();
  const sessionId = identity.kind === 'none' ? '' : identity.sessionId;
  const participantId = identity.kind === 'pair' ? identity.participantId : '';
  const store = useCampaignStore();
  const activityLog = useStore(store, (state) => state.activityLog);
  const [authoritative, setAuthoritative] =
    useState<AuthoritativeOutcome | null>(null);

  useEffect(() => {
    if (identity.kind !== 'pair') {
      setAuthoritative(null);
      return undefined;
    }
    let cancelled = false;
    let releaseCurrent: (() => void) | undefined;

    const run = (): void => {
      releaseCurrent?.();
      const acquired = requestAuthoritativeCampaignActivity(
        campaignId,
        sessionId,
        participantId,
      );
      releaseCurrent = acquired.release;
      void acquired.promise.then((outcome) => {
        if (cancelled || outcome.status === 'aborted') return;
        setAuthoritative(outcome);
      });
    };

    setAuthoritative(loadingFeed());
    run();

    const onFocus = (): void => {
      run();
    };
    window.addEventListener('focus', onFocus);

    const transport = getActiveCampaignSyncTransport(sessionId);
    const unsubscribe = transport?.onFrame((message: IServerMessage) => {
      if (message.kind === 'CampaignEvent') run();
    });

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      unsubscribe?.();
      releaseCurrent?.();
    };
  }, [campaignId, identity.kind, sessionId, participantId]);

  if (identity.kind === 'none') return localFeed(activityLog);
  if (identity.kind === 'needs-identity') return needsIdentityFeed();
  return authoritative ?? loadingFeed();
}
