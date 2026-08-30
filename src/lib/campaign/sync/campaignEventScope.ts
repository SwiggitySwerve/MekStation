/**
 * Per-event-type default access-scope classification (design D3 / task
 * 3.1). Emission sites stamp `scope` at construction; this table is the
 * default when the call site does not know a tighter classification
 * (for example a GM-authored hidden fact passes `gm` as an override).
 *
 * The `satisfies Record<CampaignEventType, CampaignEventScope>` clause
 * makes a new event type a compile error until it is classified.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D3)
 */

import type {
  CampaignEventScope,
  CampaignEventType,
} from '@/types/campaign/CampaignSync';

import { CAMPAIGN_EVENT_TYPES } from '@/types/campaign/CampaignSync';

/**
 * Default scope for each of the eight ledger event types.
 *
 * All eight current types are shared-ledger facts (day, funds, roster,
 * contract, pilot, salvage, and the full-state snapshot). They default
 * to `campaign` so every participant granted the campaign scope can
 * replay them. None of the current types is a GM-hidden fact; a future
 * hidden-opportunity event would either default to `gm` or pass an
 * explicit override at its emission site. Reclassification after
 * append is a new revelation event, never an edit of a stamped row.
 */
export const CAMPAIGN_EVENT_DEFAULT_SCOPE = {
  CampaignDayAdvanced: 'campaign',
  FundsChanged: 'campaign',
  PilotHired: 'campaign',
  ContractAccepted: 'campaign',
  RosterUnitChanged: 'campaign',
  SalvageAllocated: 'campaign',
  ParticipantRemoved: 'campaign',
  CampaignSnapshotPublished: 'campaign',
} as const satisfies Record<CampaignEventType, CampaignEventScope>;

/**
 * Resolve the scope to stamp: an explicit override wins, otherwise the
 * per-type default. Callers that know a tighter audience (GM-only,
 * team, or player) pass the override; everyone else inherits the table.
 */
export function resolveCampaignEventScope(
  type: CampaignEventType,
  override?: CampaignEventScope,
): CampaignEventScope {
  return override ?? CAMPAIGN_EVENT_DEFAULT_SCOPE[type];
}

/**
 * Freeze a campaign event so `scope` cannot be rewritten after
 * emission. Shallow freeze is enough: scope is a top-level string.
 * Nested payload mutation is a separate concern and is not a
 * reclassification path.
 */
export function freezeCampaignEvent<T extends object>(event: T): T {
  return Object.freeze(event);
}

/**
 * Runtime completeness check mirroring the replay-registry style: the
 * table must name every `CAMPAIGN_EVENT_TYPES` member exactly once.
 * The compile-time `satisfies` pin is the primary guard; this names
 * missing keys if a test constructs a partial table.
 */
export function assertCampaignEventScopeTableCompleteness(
  table: Record<string, CampaignEventScope> = CAMPAIGN_EVENT_DEFAULT_SCOPE,
): void {
  const expected = new Set<string>(CAMPAIGN_EVENT_TYPES);
  const actual = new Set(Object.keys(table));
  const missing = CAMPAIGN_EVENT_TYPES.filter((type) => !actual.has(type));
  const extra = Array.from(actual).filter((type) => !expected.has(type));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      'Campaign event scope table is not exhaustive: ' +
        `missing=[${missing.join(', ')}] extra=[${extra.join(', ')}]`,
    );
  }
}
