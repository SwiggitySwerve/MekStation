/**
 * The journal owns the campaign record's transaction (roadmap unit U35b,
 * OD-mvp-hard-cutover). The genesis of a create under journal authority,
 * or the checkpoint of a whole-envelope PUT on a journal-native campaign,
 * commits in ONE immediate transaction the journal writer owns: `prepare`
 * plans the save and builds the snapshot of the record it would store,
 * reading only; `extend` writes the `campaigns` row on the writer's handle
 * and then appends. The writer forbids nesting `saveCampaign` there, so the
 * service exposes its plan and its row write separately.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D1, D10)
 */

import type Database from 'better-sqlite3';

import type { SQLiteEventJournalWriter } from '@/lib/events/journal/SQLiteEventJournalWriter';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { writeCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import {
  campaignRecordRow,
  type CampaignSaveResult,
} from '@/services/campaignPersistence/CampaignPersistenceService';

import {
  CAMPAIGN_STREAM_TYPE,
  toJournalBatch,
  type ICampaignJournalEnvelope,
} from '../sync/JournalCampaignEventStore';
import { createJournalNativeMarker } from './campaignAuthorityMigration';
import { campaignSnapshotCommand } from './campaignSourceGenesis';

export type CampaignRecordJournalSaveResult =
  | CampaignSaveResult
  | { readonly kind: 'invalid-campaign-projection'; readonly reason: string };

/**
 * The campaign stream's root head revision on a borrowed handle, 0 when
 * there is no stream. Campaign events append on the root branch with
 * sequence N at revision N + 1, so this is also the next sequence.
 */
function campaignRootRevision(
  db: Database.Database,
  campaignId: string,
): number {
  const row = db
    .prepare(
      `SELECT stream_revision AS revision FROM event_journal_stream_heads
        WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
    )
    .get(CAMPAIGN_STREAM_TYPE, campaignId, ROOT_EVENT_BRANCH_ID) as
    | { readonly revision: number }
    | undefined;
  return row?.revision ?? 0;
}

/**
 * Save `envelope` at `baseVersion` and append its snapshot in one immediate
 * transaction the journal writer owns. A refused plan or projection returns
 * before anything is written. A checkpoint appends at the stream's next
 * sequence; a genesis at sequence 0, and a committed genesis also writes
 * the journal-native marker on the same handle. A genesis refused by the
 * revision or command-identity guard keeps the row and writes no marker
 * (what such a create did before); any other append that does not commit
 * throws, and a throw rolls back the row, the append and the marker.
 */
export async function saveCampaignRecordThroughJournal(
  journal: Pick<
    SQLiteEventJournalWriter<ICampaignJournalEnvelope>,
    'appendPreparedWithExtension'
  >,
  input: {
    readonly purpose: 'genesis' | 'checkpoint';
    readonly envelope: SerializedCampaign;
    readonly baseVersion: number;
    readonly hostInstanceId: string;
    readonly occurredAt: string;
  },
): Promise<CampaignRecordJournalSaveResult> {
  const campaignId = input.envelope.campaignId;
  const genesis = input.purpose === 'genesis';
  return journal.appendPreparedWithExtension<
    SerializedCampaign,
    CampaignRecordJournalSaveResult
  >(
    (db) => {
      const plan = campaignRecordRow.plan(
        db,
        input.envelope,
        input.baseVersion,
        input.hostInstanceId,
      );
      if (plan.kind !== 'ok') return { kind: 'refused', result: plan };
      // The snapshot is of the record the row becomes (instance id and
      // authority pinned, migrated), not of the incoming envelope.
      const snapshot = campaignSnapshotCommand({
        envelope: plan.record,
        purpose: input.purpose,
        sequence: genesis ? 0 : campaignRootRevision(db, campaignId),
        occurredAt: input.occurredAt,
      });
      if (snapshot.kind !== 'ready') {
        return { kind: 'refused', result: snapshot };
      }
      return {
        kind: 'ready',
        context: plan.record,
        raw: toJournalBatch(snapshot),
      };
    },
    (db, record, append) => {
      campaignRecordRow.write(db, record);
      const appended = append();
      if (appended.kind === 'committed') {
        if (genesis) {
          writeCampaignMigrationMarker(
            createJournalNativeMarker(campaignId),
            db,
          );
        }
        return { kind: 'ok', record };
      }
      if (
        genesis &&
        (appended.kind === 'revision-conflict' ||
          appended.kind === 'command-identity-conflict')
      ) {
        return { kind: 'ok', record };
      }
      // A checkpoint's head was read in this same immediate transaction, so
      // this is not expected; throwing keeps the row from standing ahead of
      // a journal that refused it.
      throw new Error(
        `Campaign ${input.purpose} append did not commit: ${appended.kind}`,
      );
    },
  );
}
