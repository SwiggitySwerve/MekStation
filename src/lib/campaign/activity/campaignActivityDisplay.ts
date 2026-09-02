/**
 * Display-row adapter for campaign activity.
 *
 * Authoritative entries carry `ordinal` and `occurredAt` and have no
 * `id` or `payload`. The card and log table already key and filter on
 * `{ id, campaignDay, category, message }`. Mapping here — not in the
 * components — keeps both surfaces on one shape and stops anyone from
 * reading a payload the journal row does not have.
 *
 * `ordinal` becomes `id` because it is already this viewer's gapless
 * position. Using the journal sequence instead would reintroduce the
 * concealment side-channel the projection exists to close.
 */

import type { ICampaignActivityEntry } from '@/lib/campaign/activity/campaignActivityProjection';
import type { CampaignActivityFeedState } from '@/lib/campaign/hooks/useCampaignActivityFeed';
import type {
  ActivityLogCategory,
  IActivityLogEntry,
} from '@/types/campaign/ActivityLog';

export interface ICampaignActivityDisplayRow {
  readonly id: string;
  readonly campaignDay: number;
  readonly category: ActivityLogCategory;
  readonly message: string;
}

export interface ICampaignActivityFeedNotice {
  readonly testid: string;
  readonly message: string;
}

export const SHARED_ACTIVITY_LOG_LOADING_MESSAGE =
  'Loading the shared campaign log.';

export const SHARED_ACTIVITY_LOG_EMPTY_MESSAGE =
  'The shared log has nothing yet.';

export const SHARED_ACTIVITY_LOG_ERROR_FALLBACK =
  'The shared campaign log could not be loaded.';

/** Authoritative journal row → the four fields the surfaces render. */
export function toCampaignActivityDisplayRow(
  entry: ICampaignActivityEntry,
): ICampaignActivityDisplayRow {
  return {
    id: String(entry.ordinal),
    campaignDay: entry.campaignDay,
    category: entry.category,
    message: entry.message,
  };
}

/** Solo FIFO row → the same four fields, dropping timestamp and payload. */
export function toLocalActivityDisplayRow(
  entry: IActivityLogEntry,
): ICampaignActivityDisplayRow {
  return {
    id: entry.id,
    campaignDay: entry.campaignDay,
    category: entry.category,
    message: entry.message,
  };
}

/**
 * Preserve caller order. The projection already chose the sequence;
 * sorting here by day or message would silently rewrite history.
 */
export function toCampaignActivityDisplayRows(
  entries: readonly ICampaignActivityEntry[],
): readonly ICampaignActivityDisplayRow[] {
  return entries.map(toCampaignActivityDisplayRow);
}

export function toLocalActivityDisplayRows(
  entries: readonly IActivityLogEntry[],
): readonly ICampaignActivityDisplayRow[] {
  return entries.map(toLocalActivityDisplayRow);
}

/**
 * Rows only when the feed is actually showing a log. Loading, forbidden,
 * error, and needs-identity yield nothing so a leftover FIFO array cannot
 * paint through a status the server already answered.
 */
export function displayRowsFromCampaignActivityFeed(
  feed: CampaignActivityFeedState,
): readonly ICampaignActivityDisplayRow[] {
  if (feed.source === 'local') {
    return toLocalActivityDisplayRows(feed.entries);
  }
  if (feed.source === 'authoritative' && feed.status === 'ready') {
    return toCampaignActivityDisplayRows(feed.entries);
  }
  return [];
}

function nonBlank(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * Status copy the card and log table share. Forbidden keeps the server
 * string so a 403 cannot collapse into the empty-ready sentence.
 */
export function campaignActivityFeedNotice(
  feed: CampaignActivityFeedState,
): ICampaignActivityFeedNotice | null {
  if (feed.source === 'needs-identity') {
    return {
      testid: 'activity-log-needs-identity',
      message: nonBlank(
        feed.message,
        'Rejoin this co-op session to load the shared campaign log.',
      ),
    };
  }
  if (feed.source !== 'authoritative') return null;
  if (feed.status === 'loading') {
    return {
      testid: 'activity-log-loading',
      message: SHARED_ACTIVITY_LOG_LOADING_MESSAGE,
    };
  }
  if (feed.status === 'forbidden') {
    return {
      testid: 'activity-log-forbidden',
      message: nonBlank(feed.message, 'forbidden'),
    };
  }
  if (feed.status === 'error') {
    return {
      testid: 'activity-log-error',
      message: nonBlank(feed.message, SHARED_ACTIVITY_LOG_ERROR_FALLBACK),
    };
  }
  if (feed.status === 'ready' && feed.entries.length === 0) {
    return {
      testid: 'activity-log-empty',
      message: SHARED_ACTIVITY_LOG_EMPTY_MESSAGE,
    };
  }
  return null;
}
