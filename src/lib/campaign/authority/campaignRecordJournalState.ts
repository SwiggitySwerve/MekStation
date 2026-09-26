/**
 * The saved campaign record and the journal's state, kept from erasing
 * each other (roadmap unit U35e, owner decision OD-u35d-server-and-host-fix,
 * server half).
 *
 * A record checkpoint snapshots the saved envelope, which does not represent
 * the journal's pilots, contracts or salvage pool; `readCampaignJournalState`
 * gives the checkpoint the journal's own values to carry forward. A campaign
 * command or a combat outcome appends without touching the saved record; on
 * a journal-native campaign `rewriteCampaignRecordAfterCommand` writes the
 * record back with the journal's balance, date and roster readiness at the
 * next version, inside the append's transaction, so a save built before the
 * append is refused (409) instead of checkpointing over it (U35e, U35g). For
 * a co-op GM funds correction (ApplyGmIntervention) the same write also
 * appends the correction to the record's intervention history (U97).
 *
 * Both run synchronously on a journal writer's borrowed handle.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D1, D10)
 */

import type Database from 'better-sqlite3';

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IGmCampaignFundsTransactionEffect } from '@/types/interventions';

import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { readCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { campaignRecordRow } from '@/services/campaignPersistence/CampaignPersistenceService';
import { TransactionType } from '@/types/campaign/Transaction';

import { addCampaignDays } from '../campaignCalendar';
import { replayCampaignEvents } from '../sync/applyCampaignEvent';
import {
  CAMPAIGN_STREAM_TYPE,
  type ICampaignJournalEnvelope,
} from '../sync/JournalCampaignEventStore';
import { dayBetween } from './campaignSourceGenesis';

/**
 * The campaign's journal state on `db`: every event of its stream on the
 * root branch (where campaign commands and snapshots append), in revision
 * order, replayed from an empty state. It parses the stored payloads as
 * they are and does not re-verify each event's digest, as the journal's
 * async reader does.
 */
export function readCampaignJournalState(
  db: Database.Database,
  campaignId: string,
): ICampaignAuthoritativeState {
  const rows = db
    .prepare(
      `SELECT payload_json AS payloadJson FROM event_journal_events
        WHERE stream_type = ? AND stream_id = ? AND branch_id = ?
        ORDER BY stream_revision`,
    )
    .all(CAMPAIGN_STREAM_TYPE, campaignId, ROOT_EVENT_BRANCH_ID) as {
    readonly payloadJson: string;
  }[];
  return replayCampaignEvents(
    campaignId,
    rows.map(
      (row) =>
        (JSON.parse(row.payloadJson) as ICampaignJournalEnvelope).campaignEvent,
    ),
  );
}

/**
 * After a campaign command or a combat outcome committed on `db` (and inside
 * its transaction, so a throw here rolls the append back): write the
 * campaign's stored record back at version + 1 with the balance, current
 * date and roster readiness of the journal's post-append state and, when
 * `batch` carries a GM intervention id, that intervention's history entries
 * (`withGmInterventionEntries`). Writes nothing when the campaign has no
 * saved record, or when its cutover marker is not in journal state (then the
 * record, not the journal, is the campaign's authority and a save does not
 * checkpoint over the journal).
 */
export function rewriteCampaignRecordAfterCommand(
  db: Database.Database,
  campaignId: string,
  batch?: {
    readonly events: readonly ICampaignEvent[];
    readonly gmInterventionId?: string;
  },
): void {
  const marker = readCampaignMigrationMarker(campaignId, db);
  if (marker.kind !== 'ok' || marker.marker.state !== 'journal') return;
  const row = db
    .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
    .get(campaignId) as
    | { readonly version: number; readonly payload: string }
    | undefined;
  if (row === undefined) return;
  const record = recordAtJournalState(
    JSON.parse(row.payload) as SerializedCampaign,
    row.version + 1,
    readCampaignJournalState(db, campaignId),
  );
  campaignRecordRow.write(
    db,
    batch?.gmInterventionId === undefined
      ? record
      : withGmInterventionEntries(record, batch.gmInterventionId, batch.events),
  );
}

/**
 * `record` with one intervention history entry appended to
 * `gmInterventionEvents` per FundsChanged in `events` (an ApplyGmIntervention
 * commits exactly one). The entry is a funds-transaction effect built from
 * the committed event only: its reason as the public summary, its signed
 * delta as `after.transaction.amountCents` (cents), `interventionId`, and its
 * commit sequence in the transaction id
 * `campaign-event:<campaignId>:<sequence>` (also `transactionId`). The
 * balances are the event's resulting balance and that minus the delta, in
 * cents; the transaction list stays empty because the host keeps none; the
 * date is the record's current date. It carries no GM-private metadata,
 * which the host never receives.
 */
function withGmInterventionEntries(
  record: SerializedCampaign,
  interventionId: string,
  events: readonly ICampaignEvent[],
): SerializedCampaign {
  const entries = events.flatMap(
    (event): IGmCampaignFundsTransactionEffect[] => {
      if (event.type !== 'FundsChanged') return [];
      const { delta, reason, balance } = event.payload;
      const transactionId = `campaign-event:${record.campaignId}:${event.sequence}`;
      return [
        {
          type: 'gm.campaign.funds_transaction_corrected',
          domain: 'economy',
          family: 'funds-transaction',
          interventionId,
          transactionId,
          changedStateRefs: [`campaign:${record.campaignId}:finances`],
          publicSummary: reason,
          before: { balanceCents: (balance - delta) * 100, transactionIds: [] },
          after: {
            balanceCents: balance * 100,
            transaction: {
              id: transactionId,
              type: TransactionType.Miscellaneous,
              amountCents: delta * 100,
              date: record.body.currentDate,
              description: reason,
            },
          },
        },
      ];
    },
  );
  return {
    ...record,
    body: {
      ...record.body,
      gmInterventionEvents: [
        ...(record.body.gmInterventionEvents ?? []),
        ...entries,
      ],
    },
  };
}

/**
 * The record readiness of each journal roster status: the inverse of the
 * checkpoint projection's readiness-to-status map (campaignSourceGenesis).
 */
const STATUS_READINESS = {
  operational: 'Ready',
  damaged: 'Damaged',
  destroyed: 'Destroyed',
} as const;

/**
 * `stored` at `version` with `state`'s balance and, when the stored date
 * does not already map to `state.day`, the campaign start date plus
 * `state.day` calendar days (the inverse of the projection's day). A record
 * with no start date keeps its date: its projected day is always 0. Each
 * roster projection unit the journal also holds takes the readiness of its
 * journal status; a projection unit the journal lacks, the projection's
 * other fields and force membership are kept, and a record without a roster
 * projection gains none. Every other field, faction standing included (no
 * command or outcome event changes it), is kept as stored.
 */
function recordAtJournalState(
  stored: SerializedCampaign,
  version: number,
  state: ICampaignAuthoritativeState,
): SerializedCampaign {
  const body = stored.body;
  const start = body.campaignStartDate;
  const currentDate =
    start !== undefined && dayBetween(start, body.currentDate) !== state.day
      ? addCampaignDays(new Date(start), state.day).toISOString()
      : body.currentDate;
  const roster = body.rosterProjection;
  return {
    ...stored,
    version,
    body: {
      ...body,
      currentDate,
      finances: { ...body.finances, balance: state.balance },
      ...(roster === undefined
        ? {}
        : {
            rosterProjection: {
              ...roster,
              units: roster.units.map((unit) => {
                const journal = state.rosterUnits[unit.unitId];
                return journal === undefined
                  ? unit
                  : { ...unit, readiness: STATUS_READINESS[journal.status] };
              }),
            },
          }),
    },
  };
}
