/**
 * SyncEngine — conflict resolution helpers
 *
 * Pure functions that implement the acceptRemote / fork resolution paths
 * plus conflict lookup. Extracted so the main SyncEngine class stays under
 * the per-file line limit without losing functionality.
 */

import type { IChangeLogEntry, ISyncConflict } from '@/types/vault';

import type { ChangeLogRepository } from './ChangeLogRepository';
import type { ContentApplyFn } from './SyncEngine';

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
 * Resolve a conflict by accepting the remote version. Marks the conflict
 * resolved and — if remoteData + applyFn are provided — writes the remote
 * payload back to local storage.
 */
export async function resolveAcceptRemote(
  changeLog: ChangeLogRepository,
  conflictId: string,
  options: {
    readonly remoteData?: string;
    readonly applyFn?: ContentApplyFn;
  },
): Promise<boolean> {
  const resolved = await changeLog.resolveConflict(conflictId, 'remote');
  if (!resolved) return false;

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

  return resolved;
}

/**
 * Resolve a conflict by forking — keeps the local version and writes the
 * remote payload into a new local item with a generated id. Returns the
 * forked item id when a fork was materialized; returns `true` when only
 * the resolution bookkeeping happened (no data and/or no applyFn).
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
  const resolved = await changeLog.resolveConflict(conflictId, 'forked');
  if (!resolved) return false;

  if (options.remoteData && options.applyFn) {
    const conflict = await findPendingConflictById(changeLog, conflictId);
    if (conflict) {
      const forkedItemId = `${conflict.itemId}-fork-${Date.now()}`;
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
      return { forkedItemId };
    }
  }

  return resolved;
}
