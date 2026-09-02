/**
 * The durable answer to "is this stream being rebuilt right now?"
 * (add-authoritative-history-branches task 2.2 adoption; umbrella 14.3).
 *
 * `readRebuildRefusal` is the RULE and takes its two stores as
 * parameters. This is the one place that resolves those stores from the
 * process's database, so the combat host and the campaign command
 * pipeline ask the same question of the same rows instead of each
 * assembling their own pair — which is how the two would eventually come
 * to disagree about which database the leases are in.
 *
 * MEASURED, and the reason this does not simply take a `Database`: the
 * branch and lease tables (migrations 23-24) live in `DATABASE_PATH`
 * (`./data/mekstation.db`), which `SQLiteService` owns. The multiplayer
 * match store opens a DIFFERENT file, `MULTIPLAYER_DB_PATH`
 * (`./data/multiplayer-matches.db`), so a caller holding the match
 * store's handle is holding the wrong database for this question.
 *
 * An uninitialized service answers null rather than throwing, the same
 * way `selectCommandRejectionAudit` treats the same database: no
 * initialized service means no lease table, which means no correction
 * can be in progress. `getSQLiteService()` constructs the service
 * without opening a file, so asking costs nothing.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/gm-combat-interventions/spec.md
 */

import type Database from 'better-sqlite3';

import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type { IEventHistoryStreamRef } from './EventHistoryBranchContract';
import type { StreamRebuildRefusal } from './EventHistoryCommandAdmission';

import { readRebuildRefusal } from './EventHistoryCommandAdmission';
import { SQLiteEventHistoryBranchStore } from './SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from './SQLiteEventHistoryCorrectionLeaseStore';

/**
 * The journal revision this stream is at.
 *
 * Read without naming a branch, exactly as the correction-lease store's
 * own head read does — asking for a branch here would let the two reads
 * disagree about which head they mean. A stream with no head row sits at
 * revision 0: nothing has been appended yet, which is not a missing
 * stream.
 */
function readStreamRevision(
  db: Database.Database,
  stream: IEventHistoryStreamRef,
): number {
  const row = db
    .prepare(
      `SELECT stream_revision AS revision
         FROM event_journal_stream_heads
        WHERE stream_type = ? AND stream_id = ?`,
    )
    .get(stream.streamType, stream.streamId) as
    | { readonly revision: number }
    | undefined;
  return row?.revision ?? 0;
}

/**
 * The live rebuild on this stream, or null.
 *
 * Keyed on the stream and nothing coarser. A gate that answered for the
 * process would stop every match and every campaign the moment one GM
 * started a single rewind.
 */
export function readDurableStreamRebuild(
  stream: IEventHistoryStreamRef,
): StreamRebuildRefusal | null {
  const service = getSQLiteService();
  if (!service.isInitialized()) return null;
  const db = service.getDatabase();
  const branches = new SQLiteEventHistoryBranchStore(db);
  const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches);
  return readRebuildRefusal(
    branches,
    leases,
    stream,
    readStreamRevision(db, stream),
  );
}
