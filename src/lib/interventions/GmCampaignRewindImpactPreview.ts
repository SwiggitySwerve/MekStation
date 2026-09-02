/**
 * Campaign rewind impact preview (seam 16.1-a). Reads only.
 *
 * A rewind is not a negative `projectDays`: that helper refuses days <= 0
 * and advances processors. This file never calls it. There is no
 * `readCampaignAtRevision`; both sides are `replayCampaignEvents` of the
 * campaign journal (full log vs prefix), then projected onto
 * `CAMPAIGN_ROOT_FIELDS` so `declareAffectedFamilies` remains the only
 * classifier. The letter's ten underivable families are named, never omitted.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/audit-timeline/spec.md
 */

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { replayCampaignEvents } from '@/lib/campaign/sync/applyCampaignEvent';
import { readCampaignJournalEvents } from '@/lib/campaign/sync/campaignJournalReads';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type { CampaignAffectedFamily } from './GmCampaignAffectedFamilies';

import {
  CAMPAIGN_ROOT_FIELDS,
  UNDERIVABLE_AFFECTED_FAMILIES,
  declareAffectedFamilies,
} from './GmCampaignAffectedFamilies';

export type GmCampaignRewindImpactRefusal =
  | 'not-gm'
  | 'unknown-campaign'
  | 'cutoff-not-in-history'
  | 'cutoff-is-current';

export type GmCampaignRewindImpactResult =
  | {
      readonly kind: 'preview';
      readonly campaignId: string;
      readonly cutoff: number;
      readonly currentRevision: number;
      readonly families: readonly CampaignAffectedFamily[];
      readonly underivable: readonly CampaignAffectedFamily[];
    }
  | {
      readonly kind: 'refused';
      readonly reason: GmCampaignRewindImpactRefusal;
      readonly detail: string;
    };

type CampaignRootField = (typeof CAMPAIGN_ROOT_FIELDS)[number];
type CampaignRootSnapshot = { readonly [K in CampaignRootField]: unknown };

export interface IPreviewGmCampaignRewindInput {
  readonly campaignId: string;
  readonly cutoff: number;
  readonly role: 'gm' | 'player';
  readonly readEvents: (
    campaignId: string,
  ) => Promise<readonly ICampaignEvent[]>;
}

/** Production reader. The journal clock is unused: this path never appends. */
export function readCampaignJournalForRewindPreview(
  campaignId: string,
): Promise<readonly ICampaignEvent[]> {
  return readCampaignJournalEvents(
    new SQLiteEventJournal<ICampaignJournalEnvelope>(
      getSQLiteService().getDatabase(),
      () => new Date().toISOString(),
    ),
    campaignId,
  );
}

function refuse(
  reason: GmCampaignRewindImpactRefusal,
  detail: string,
): GmCampaignRewindImpactResult {
  return Object.freeze({ kind: 'refused', reason, detail });
}

/**
 * Ledger keys the letter names but the root list does not (salvagePool,
 * factionStanding) stay off this snapshot so they remain `underivable`.
 */
function rootSnapshotFromJournal(
  state: ICampaignAuthoritativeState,
): CampaignRootSnapshot {
  return {
    currentDate: state.day,
    currentSystemId: undefined,
    repairQueue: undefined,
    partsInventory: undefined,
    unitCombatStates: {
      rosterUnits: state.rosterUnits,
      pilots: state.pilots,
      forceUnits: state.forceUnits ?? {},
    },
    finances: state.balance,
    missions: state.contracts,
    loans: undefined,
    unitMarket: undefined,
    personnelMarket: undefined,
    contractMarket: undefined,
  };
}

function changedRootRefs(
  campaignId: string,
  before: CampaignRootSnapshot,
  after: CampaignRootSnapshot,
): readonly string[] {
  return CAMPAIGN_ROOT_FIELDS.filter(
    (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]),
  ).map((field) => `campaign:${campaignId}:${field}`);
}

export async function previewGmCampaignRewind(
  input: IPreviewGmCampaignRewindInput,
): Promise<GmCampaignRewindImpactResult> {
  if (input.role !== 'gm') {
    return refuse('not-gm', 'Only the campaign GM may preview a rewind.');
  }

  const events = await input.readEvents(input.campaignId);
  if (events.length === 0) {
    return refuse(
      'unknown-campaign',
      'No campaign journal exists to preview a rewind against.',
    );
  }

  const currentRevision = events.length;
  if (!Number.isSafeInteger(input.cutoff)) {
    return refuse(
      'cutoff-not-in-history',
      'Rewind cutoff must be a committed journal revision.',
    );
  }
  if (input.cutoff === currentRevision) {
    return refuse(
      'cutoff-is-current',
      'Cutoff equals the current revision; a rewind would change nothing.',
    );
  }
  if (input.cutoff < 0 || input.cutoff > currentRevision) {
    return refuse(
      'cutoff-not-in-history',
      'Rewind cutoff is not a revision in this campaign journal.',
    );
  }

  const families = declareAffectedFamilies(
    input.campaignId,
    changedRootRefs(
      input.campaignId,
      rootSnapshotFromJournal(
        replayCampaignEvents(input.campaignId, events.slice(0, input.cutoff)),
      ),
      rootSnapshotFromJournal(replayCampaignEvents(input.campaignId, events)),
    ),
  );

  return Object.freeze({
    kind: 'preview',
    campaignId: input.campaignId,
    cutoff: input.cutoff,
    currentRevision,
    families,
    underivable: UNDERIVABLE_AFFECTED_FAMILIES,
  });
}
