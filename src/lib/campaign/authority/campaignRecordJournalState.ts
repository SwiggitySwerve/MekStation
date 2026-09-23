/**
 * The saved campaign record and the journal's state, kept from erasing
 * each other (roadmap unit U35e, owner decision OD-u35d-server-and-host-fix,
 * server half).
 *
 * A record checkpoint snapshots the saved envelope, which does not represent
 * the journal's pilots, contracts or salvage pool; `readCampaignJournalState`
 * gives the checkpoint the journal's own values to carry forward. A campaign
 * command appends without touching the saved record; on a journal-native
 * campaign `rewriteCampaignRecordAfterCommand` writes the record back with
 * the command's balance and date at the next version, inside the command's
 * append transaction, so a save built before the command is refused (409)
 * instead of checkpointing over it.
 *
 * Both run synchronously on a journal writer's borrowed handle.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D1, D10)
 */

import type Database from 'better-sqlite3';

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { readCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { campaignRecordRow } from '@/services/campaignPersistence/CampaignPersistenceService';

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
 * After a campaign command committed on `db` (and inside its transaction,
 * so a throw here rolls the append back): write the campaign's stored
 * record back at version + 1 with the balance and current date of the
 * journal's post-command state. Writes nothing when the campaign has no
 * saved record, or when its cutover marker is not in journal state (then
 * the record, not the journal, is the campaign's authority and a save does
 * not checkpoint over the journal).
 */
export function rewriteCampaignRecordAfterCommand(
  db: Database.Database,
  campaignId: string,
): void {
  const marker = readCampaignMigrationMarker(campaignId, db);
  if (marker.kind !== 'ok' || marker.marker.state !== 'journal') return;
  const row = db
    .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
    .get(campaignId) as
    | { readonly version: number; readonly payload: string }
    | undefined;
  if (row === undefined) return;
  campaignRecordRow.write(
    db,
    recordAtJournalState(
      JSON.parse(row.payload) as SerializedCampaign,
      row.version + 1,
      readCampaignJournalState(db, campaignId),
    ),
  );
}

/**
 * `stored` at `version` with `state`'s balance and, when the stored date
 * does not already map to `state.day`, the campaign start date plus
 * `state.day` calendar days (the inverse of the projection's day). A record
 * with no start date keeps its date: its projected day is always 0. Every
 * other field, faction standing included (no command event changes it),
 * is kept as stored.
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
  return {
    ...stored,
    version,
    body: {
      ...body,
      currentDate,
      finances: { ...body.finances, balance: state.balance },
    },
  };
}
