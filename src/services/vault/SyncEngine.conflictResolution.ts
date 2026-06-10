/**
 * SyncEngine — conflict resolution helpers
 *
 * Pure functions that implement the acceptRemote / fork resolution paths
 * plus conflict lookup. Extracted so the main SyncEngine class stays under
 * the per-file line limit without losing functionality.
 */

import type { IChangeLogEntry, ISyncConflict } from '@/types/vault';

import type { ChangeLogRepository } from './ChangeLogRepository';
import type { ContentApplyFn } from './SyncEngine.types';

/**
 * Shape returned by the pending-conflict lookup on ChangeLogRepository.
 * Matches what {@link mapPendingConflicts} emits and what the conflict
 * helpers consume.
 */
export interface IPendingConflictRow {
  readonly id: string;
  readonly contentType: ISyncConflict['contentType'];
  readonly itemId: string;
  readonly itemName: string;
  readonly localVersion: number;
  readonly localHash: string;
  readonly remoteVersion: number;
  readonly remoteHash: string;
  readonly remotePeerId: string;
  readonly detectedAt: string;
}

/**
 * Promote a stored pending-conflict row into the public ISyncConflict shape
 * by tagging every entry with resolution: 'pending'.
 */
export function mapPendingConflicts(
  rows: readonly IPendingConflictRow[],
): ISyncConflict[] {
  return rows.map((row) => ({
    id: row.id,
    contentType: row.contentType,
    itemId: row.itemId,
    itemName: row.itemName,
    localVersion: row.localVersion,
    localHash: row.localHash,
    remoteVersion: row.remoteVersion,
    remoteHash: row.remoteHash,
    remotePeerId: row.remotePeerId,
    detectedAt: row.detectedAt,
    resolution: 'pending' as const,
  }));
}

/**
 * Fetch a single conflict from the pending list, or null if already
 * resolved / never existed.
 */
export async function findPendingConflictById(
  changeLog: ChangeLogRepository,
  conflictId: string,
): Promise<ISyncConflict | null> {
  const rows = await changeLog.getPendingConflicts();
  const pending = mapPendingConflicts(rows);
  return pending.find((c) => c.id === conflictId) ?? null;
}

/**
 * Resolve a conflict by accepting the remote version. Looks the conflict
 * up while it is STILL pending, writes the remote payload back to local
 * storage (when remoteData + applyFn are provided), then marks it
 * resolved.
 *
 * Ordering matters (audit 2026-06-09 W5.2): `resolveConflict()` flips
 * `resolution` away from `'pending'`, and the lookup only scans pending
 * rows — resolving first made the conflict invisible, so accept-remote
 * never actually applied the remote data. Applying BEFORE resolving also
 * keeps the conflict pending (retryable) if the apply callback throws.
 */
export async function resolveAcceptRemote(
  changeLog: ChangeLogRepository,
  conflictId: string,
  options: {
    readonly remoteData?: string;
    readonly applyFn?: ContentApplyFn;
  },
): Promise<boolean> {
  if (options.remoteData && options.applyFn) {
    const conflict = await findPendingConflictById(changeLog, conflictId);
    if (conflict) {
      await options.applyFn(
        conflict.itemId,
        conflict.contentType,
        options.remoteData,
      );
    }
  }

  return changeLog.resolveConflict(conflictId, 'remote');
}

/**
 * Resolve a conflict by forking — keeps the local version and writes the
 * remote payload into a new local item with a generated id. Returns the
 * forked item id when a fork was materialized; returns `true` when only
 * the resolution bookkeeping happened (no data and/or no applyFn).
 *
 * Same ordering fix as {@link resolveAcceptRemote} (audit 2026-06-09
 * W5.2): the conflict must be looked up while still pending, and the
 * fork materialized BEFORE the resolution flips — otherwise the lookup
 * misses and the fork silently never exists.
 */
export async function resolveFork(
  changeLog: ChangeLogRepository,
  conflictId: string,
  options: {
    readonly remoteData?: string;
    readonly applyFn?: ContentApplyFn;
    readonly recordLocalChange: (
      contentType: IChangeLogEntry['contentType'],
      itemId: string,
      data: string,
    ) => Promise<IChangeLogEntry>;
  },
): Promise<boolean | { forkedItemId: string }> {
  let forkedItemId: string | null = null;

  if (options.remoteData && options.applyFn) {
    const conflict = await findPendingConflictById(changeLog, conflictId);
    if (conflict) {
      forkedItemId = `${conflict.itemId}-fork-${Date.now()}`;
      await options.applyFn(
        forkedItemId,
        conflict.contentType,
        options.remoteData,
      );
      await options.recordLocalChange(
        conflict.contentType,
        forkedItemId,
        options.remoteData,
      );
    }
  }

  const resolved = await changeLog.resolveConflict(conflictId, 'forked');
  if (!resolved) return false;

  return forkedItemId !== null ? { forkedItemId } : resolved;
}
