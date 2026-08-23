/**
 * Campaign list omission contract (task 1.5)
 *
 * GET /api/campaigns keeps returning `ICampaignSummary[]` so existing
 * callers do not break. Rows the store cannot read are described in
 * `X-MekStation-Campaign-List-Omissions` as `{ id, reason }` only —
 * never the unreadable payload.
 */

import type { ICampaignSummary } from '@/types/campaign/SerializedCampaign';

/** Response header carrying skipped list rows. */
export const CAMPAIGN_LIST_OMISSIONS_HEADER =
  'X-MekStation-Campaign-List-Omissions';

/** Why a stored row was withheld from the list body. */
export type CampaignListOmissionReason = 'corrupt' | 'invalid_authority';

/** One skipped campaign: identity and cause, no payload. */
export interface ICampaignListOmission {
  readonly id: string;
  readonly reason: CampaignListOmissionReason;
}

/** List service result: healthy summaries plus skipped rows. */
export interface ICampaignListResult {
  readonly summaries: readonly ICampaignSummary[];
  readonly omitted: readonly ICampaignListOmission[];
}

const OMISSION_REASONS: readonly CampaignListOmissionReason[] = [
  'corrupt',
  'invalid_authority',
];

/**
 * True when `value` is a known list-omission reason. Used so JSON
 * from the header cannot smuggle an arbitrary string into UI copy.
 */
function isCampaignListOmissionReason(
  value: unknown,
): value is CampaignListOmissionReason {
  return (
    typeof value === 'string' &&
    (OMISSION_REASONS as readonly string[]).includes(value)
  );
}

/**
 * Encode skipped rows for the list response header. Only `id` and
 * `reason` are serialized so a corrupt payload cannot leak onto the
 * wire through this channel.
 */
export function encodeCampaignListOmissions(
  omitted: readonly ICampaignListOmission[],
): string {
  const safe: ICampaignListOmission[] = omitted.map((entry) => ({
    id: entry.id,
    reason: entry.reason,
  }));
  return JSON.stringify(safe);
}

/**
 * Parse the list-omissions header. Missing, malformed, or hostile
 * values become an empty list so a bad header cannot break listing
 * healthy campaigns or inject unknown fields (including payload).
 */
export function decodeCampaignListOmissions(
  headerValue: string | string[] | number | undefined,
): readonly ICampaignListOmission[] {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof raw !== 'string' || raw.length === 0) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const omitted: ICampaignListOmission[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const record = entry as { id?: unknown; reason?: unknown };
    if (typeof record.id !== 'string' || record.id.length === 0) {
      continue;
    }
    if (!isCampaignListOmissionReason(record.reason)) {
      continue;
    }
    omitted.push({ id: record.id, reason: record.reason });
  }
  return omitted;
}

/**
 * Read omissions from a fetch Response-like object. Callers whose
 * mocks omit `headers` get an empty list instead of a throw.
 */
export function readCampaignListOmissionsFromResponse(response: {
  readonly headers?: { get?: (name: string) => string | null };
}): readonly ICampaignListOmission[] {
  const getter = response.headers?.get;
  if (typeof getter !== 'function') {
    return [];
  }
  const value = getter.call(response.headers, CAMPAIGN_LIST_OMISSIONS_HEADER);
  return decodeCampaignListOmissions(value ?? undefined);
}
