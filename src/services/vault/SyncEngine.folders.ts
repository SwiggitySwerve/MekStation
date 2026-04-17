/**
 * SyncEngine — folder-level sync helpers
 *
 * Pure functions that operate on a ChangeLogRepository + sync-state map.
 * SyncEngine's folder methods delegate to these so the main class stays
 * under the per-file line limit.
 */

import type {
  IChangeLogEntry,
  ISyncState,
  ShareableContentType,
} from '@/types/vault';

import type { ChangeLogRepository } from './ChangeLogRepository';

/**
 * Check whether a change belongs to an item that lives in a given folder.
 * Folder membership is encoded in the change's JSON data payload.
 */
export function isChangeForFolderItem(
  change: IChangeLogEntry,
  folderId: string,
): boolean {
  if (!change.data) return false;
  try {
    const data = JSON.parse(change.data) as { folderId?: string };
    return data.folderId === folderId;
  } catch {
    return false;
  }
}

/**
 * Fetch the change set for a folder — folder-level changes plus any item
 * changes that reference this folder in their data payload.
 */
export async function getChangesForFolder(
  changeLog: ChangeLogRepository,
  folderId: string,
  fromVersion = 0,
  limit = 100,
): Promise<IChangeLogEntry[]> {
  const allChanges = await changeLog.getChangesSince(fromVersion, limit * 10);
  return allChanges.filter(
    (change) =>
      (change.contentType === 'folder' && change.itemId === folderId) ||
      isChangeForFolderItem(change, folderId),
  );
}

/**
 * Fetch the changes for a folder that a peer hasn't seen yet.
 */
export async function getFolderChangesForPeer(
  changeLog: ChangeLogRepository,
  syncStates: Map<string, ISyncState>,
  folderId: string,
  peerId: string,
  limit = 100,
): Promise<IChangeLogEntry[]> {
  const state = syncStates.get(peerId);
  const fromVersion = state?.lastVersion ?? 0;
  return getChangesForFolder(changeLog, folderId, fromVersion, limit);
}

/**
 * Filter incoming peer changes down to just the ones for the given folder.
 */
export function filterFolderChanges(
  changes: readonly IChangeLogEntry[],
  folderId: string,
): IChangeLogEntry[] {
  return changes.filter(
    (change) =>
      (change.contentType === 'folder' && change.itemId === folderId) ||
      isChangeForFolderItem(change, folderId),
  );
}

/**
 * Enumerate folders with at least one unsynced change, either at the folder
 * level or via a descendant item whose change data references the folder.
 */
export async function getFoldersWithUnsyncedChanges(
  changeLog: ChangeLogRepository,
): Promise<string[]> {
  const unsynced = await changeLog.getUnsynced();
  const folderIds = new Set<string>();
  for (const change of unsynced) {
    if (change.contentType === 'folder') {
      folderIds.add(change.itemId);
    } else if (change.data) {
      try {
        const data = JSON.parse(change.data) as { folderId?: string };
        if (data.folderId) {
          folderIds.add(data.folderId);
        }
      } catch {
        // Ignore parse errors — bad JSON just means no folder attribution.
      }
    }
  }
  return Array.from(folderIds);
}

/**
 * Build the canonical JSON payload for a folder-membership update.
 */
export function buildFolderMembershipPayload(
  action: 'item_added' | 'item_removed',
  folderId: string,
  itemId: string,
  itemType: ShareableContentType,
): string {
  return JSON.stringify({ action, folderId, itemId, itemType });
}
