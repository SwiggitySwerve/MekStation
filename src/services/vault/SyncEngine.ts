/**
 * Sync Engine
 *
 * Manages synchronization of vault content between peers.
 * Handles change tracking, reconciliation, and conflict detection.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IChangeLogEntry,
  ISyncState,
  ISyncConflict,
  ShareableContentType,
  ChangeType,
} from '@/types/vault';
import {
  ChangeLogRepository,
  getChangeLogRepository,
} from './ChangeLogRepository';

// =============================================================================
// Types
// =============================================================================

/**
 * Sync result for a single peer
 */
export interface ISyncResult {
  success: boolean;
  peerId: string;
  changesSent: number;
  changesReceived: number;
  conflictsDetected: number;
  errors: string[];
}

/**
 * Reconciliation result
 */
export interface IReconciliationResult {
  applied: IChangeLogEntry[];
  conflicts: ISyncConflict[];
  skipped: IChangeLogEntry[];
}

/**
 * Content hash function type
 */
export type ContentHashFn = (
  itemId: string,
  contentType: ShareableContentType | 'folder'
) => Promise<string | null>;

/**
 * Content data function type
 */
export type ContentDataFn = (
  itemId: string,
  contentType: ShareableContentType | 'folder'
) => Promise<string | null>;

// =============================================================================
// Service
// =============================================================================

/**
 * Sync Engine for managing vault synchronization
 */
export class SyncEngine {
  private changeLog: ChangeLogRepository;
  private syncStates: Map<string, ISyncState> = new Map();
  private contentHashFn?: ContentHashFn;
  private contentDataFn?: ContentDataFn;

  constructor(changeLog?: ChangeLogRepository) {
    this.changeLog = changeLog ?? getChangeLogRepository();
  }

  /**
   * Set content hash function for computing content hashes
   */
  setContentHashFn(fn: ContentHashFn): void {
    this.contentHashFn = fn;
  }

  /**
   * Set content data function for getting content data
   */
  setContentDataFn(fn: ContentDataFn): void {
    this.contentDataFn = fn;
  }

  // ===========================================================================
  // Change Tracking
  // ===========================================================================

  /**
   * Record a local change
   */
  async recordChange(
    changeType: ChangeType,
    contentType: ShareableContentType | 'folder',
    itemId: string,
    data?: string
  ): Promise<IChangeLogEntry> {
    const contentHash = this.contentHashFn
      ? await this.contentHashFn(itemId, contentType)
      : null;

    return this.changeLog.recordChange(
      changeType,
      contentType,
      itemId,
      contentHash,
      data ?? null
    );
  }

  /**
   * Get changes to send to a peer
   */
  async getChangesForPeer(
    peerId: string,
    limit = 100
  ): Promise<IChangeLogEntry[]> {
    const state = this.syncStates.get(peerId);
    const fromVersion = state?.lastVersion ?? 0;

    return this.changeLog.getChangesSince(fromVersion, limit);
  }

  /**
   * Get all unsynced local changes
   */
  async getUnsyncedChanges(): Promise<IChangeLogEntry[]> {
    return this.changeLog.getUnsynced();
  }

  /**
   * Get current version
   */
  async getCurrentVersion(): Promise<number> {
    return this.changeLog.getCurrentVersion();
  }

  // ===========================================================================
  // Reconciliation
  // ===========================================================================

  /**
   * Apply changes received from a peer
   */
  async applyRemoteChanges(
    peerId: string,
    changes: IChangeLogEntry[]
  ): Promise<IReconciliationResult> {
    const applied: IChangeLogEntry[] = [];
    const conflicts: ISyncConflict[] = [];
    const skipped: IChangeLogEntry[] = [];

    for (const remoteChange of changes) {
      // Get local state for this item
      const localChange = await this.changeLog.getLatestForItem(
        remoteChange.itemId,
        remoteChange.contentType
      );

      // No local changes - apply directly
      if (!localChange) {
        await this.applyChange(remoteChange, peerId);
        applied.push(remoteChange);
        continue;
      }

      // Check for conflict
      if (this.isConflict(localChange, remoteChange)) {
        const conflict = await this.createConflict(
          localChange,
          remoteChange,
          peerId
        );
        conflicts.push(conflict);
        continue;
      }

      // Remote is newer - apply
      if (remoteChange.version > localChange.version) {
        await this.applyChange(remoteChange, peerId);
        applied.push(remoteChange);
      } else {
        // Local is newer or same - skip remote
        skipped.push(remoteChange);
      }
    }

    // Update sync state for this peer
    if (changes.length > 0) {
      const maxVersion = Math.max(...changes.map((c) => c.version));
      this.updateSyncState(peerId, maxVersion);
    }

    return { applied, conflicts, skipped };
  }

  /**
   * Check if two changes conflict
   */
  private isConflict(
    local: IChangeLogEntry,
    remote: IChangeLogEntry
  ): boolean {
    // No conflict if hashes match (same content)
    if (
      local.contentHash &&
      remote.contentHash &&
      local.contentHash === remote.contentHash
    ) {
      return false;
    }

    // Conflict if both modified the same item independently
    // (different versions with different hashes)
    if (
      local.version !== remote.version &&
      local.contentHash !== remote.contentHash &&
      !local.synced // Local change hasn't been synced yet
    ) {
      return true;
    }

    return false;
  }

  /**
   * Create a conflict record
   */
  private async createConflict(
    local: IChangeLogEntry,
    remote: IChangeLogEntry,
    peerId: string
  ): Promise<ISyncConflict> {
    const conflictId = await this.changeLog.recordConflict({
      contentType: local.contentType,
      itemId: local.itemId,
      itemName: local.itemId, // TODO: Get actual item name
      localVersion: local.version,
      localHash: local.contentHash || '',
      remoteVersion: remote.version,
      remoteHash: remote.contentHash || '',
      remotePeerId: peerId,
    });

    return {
      id: conflictId,
      contentType: local.contentType,
      itemId: local.itemId,
      itemName: local.itemId,
      localVersion: local.version,
      localHash: local.contentHash || '',
      remoteVersion: remote.version,
      remoteHash: remote.contentHash || '',
      remotePeerId: peerId,
      detectedAt: new Date().toISOString(),
      resolution: 'pending',
    };
  }

  /**
   * Apply a remote change locally
   */
  private async applyChange(
    change: IChangeLogEntry,
    sourceId: string
  ): Promise<void> {
    // Record the change as coming from a remote source
    await this.changeLog.recordChange(
      change.changeType,
      change.contentType,
      change.itemId,
      change.contentHash,
      change.data,
      sourceId
    );

    // The actual content update would be handled by a callback
    // registered with the sync engine
  }

  // ===========================================================================
  // Conflict Resolution
  // ===========================================================================

  /**
   * Get pending conflicts
   */
  async getPendingConflicts(): Promise<ISyncConflict[]> {
    const rows = await this.changeLog.getPendingConflicts();
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
   * Resolve a conflict by keeping local version
   */
  async resolveKeepLocal(conflictId: string): Promise<boolean> {
    return this.changeLog.resolveConflict(conflictId, 'local');
  }

  /**
   * Resolve a conflict by accepting remote version
   */
  async resolveAcceptRemote(conflictId: string): Promise<boolean> {
    // Mark conflict as resolved
    const resolved = await this.changeLog.resolveConflict(conflictId, 'remote');

    // TODO: Apply the remote content to local storage

    return resolved;
  }

  /**
   * Resolve a conflict by forking (keep both versions)
   */
  async resolveFork(conflictId: string): Promise<boolean> {
    // Mark conflict as resolved
    const resolved = await this.changeLog.resolveConflict(conflictId, 'forked');

    // TODO: Create a copy of the item with the remote content

    return resolved;
  }

  // ===========================================================================
  // Sync State Management
  // ===========================================================================

  /**
   * Get sync state for a peer
   */
  getSyncState(peerId: string): ISyncState | undefined {
    return this.syncStates.get(peerId);
  }

  /**
   * Update sync state for a peer
   */
  private updateSyncState(peerId: string, lastVersion: number): void {
    const existing = this.syncStates.get(peerId) || {
      peerId,
      lastVersion: 0,
      lastSyncAt: null,
      status: 'idle' as const,
      pendingOutbound: 0,
      pendingInbound: 0,
    };

    this.syncStates.set(peerId, {
      ...existing,
      lastVersion: Math.max(existing.lastVersion, lastVersion),
      lastSyncAt: new Date().toISOString(),
    });
  }

  /**
   * Set sync status for a peer
   */
  setSyncStatus(peerId: string, status: 'idle' | 'syncing' | 'error'): void {
    const existing = this.syncStates.get(peerId) || {
      peerId,
      lastVersion: 0,
      lastSyncAt: null,
      status: 'idle' as const,
      pendingOutbound: 0,
      pendingInbound: 0,
    };

    this.syncStates.set(peerId, {
      ...existing,
      status,
    });
  }

  /**
   * Mark local changes as synced to a peer
   */
  async markSyncedToPeer(peerId: string, changeIds: string[]): Promise<void> {
    await this.changeLog.markSynced(changeIds);
  }

  /**
   * Get all sync states
   */
  getAllSyncStates(): ISyncState[] {
    return Array.from(this.syncStates.values());
  }

  /**
   * Reset sync state for a peer
   */
  resetSyncState(peerId: string): void {
    this.syncStates.delete(peerId);
  }

  // ===========================================================================
  // Folder-Level Sync
  // ===========================================================================

  /**
   * Record a folder change (when folder is created/updated/deleted)
   */
  async recordFolderChange(
    changeType: ChangeType,
    folderId: string,
    folderData?: string
  ): Promise<IChangeLogEntry> {
    return this.recordChange(changeType, 'folder', folderId, folderData);
  }

  /**
   * Record when an item is added to a folder
   */
  async recordFolderItemAdded(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType
  ): Promise<IChangeLogEntry> {
    const data = JSON.stringify({
      action: 'item_added',
      folderId,
      itemId,
      itemType,
    });
    return this.recordChange('update', 'folder', folderId, data);
  }

  /**
   * Record when an item is removed from a folder
   */
  async recordFolderItemRemoved(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType
  ): Promise<IChangeLogEntry> {
    const data = JSON.stringify({
      action: 'item_removed',
      folderId,
      itemId,
      itemType,
    });
    return this.recordChange('update', 'folder', folderId, data);
  }

  /**
   * Get changes for a specific folder (folder and all its items)
   */
  async getChangesForFolder(
    folderId: string,
    fromVersion = 0,
    limit = 100
  ): Promise<IChangeLogEntry[]> {
    // Get all changes since version
    const allChanges = await this.changeLog.getChangesSince(fromVersion, limit * 10);
    
    // Filter to folder changes and items in that folder
    // For now, we track folder-level changes directly
    // Item membership tracking is via the folder update entries
    return allChanges.filter(
      (change) =>
        (change.contentType === 'folder' && change.itemId === folderId) ||
        this.isChangeForFolderItem(change, folderId)
    );
  }

  /**
   * Check if a change is for an item that belongs to a folder
   * This uses the change data to determine folder membership
   */
  private isChangeForFolderItem(
    change: IChangeLogEntry,
    folderId: string
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
   * Sync a specific folder with a peer
   * Returns changes that need to be sent to the peer
   */
  async getFolderChangesForPeer(
    folderId: string,
    peerId: string,
    limit = 100
  ): Promise<IChangeLogEntry[]> {
    const state = this.syncStates.get(peerId);
    const fromVersion = state?.lastVersion ?? 0;

    return this.getChangesForFolder(folderId, fromVersion, limit);
  }

  /**
   * Apply folder-specific changes from a peer
   */
  async applyFolderChanges(
    folderId: string,
    peerId: string,
    changes: IChangeLogEntry[]
  ): Promise<IReconciliationResult> {
    // Filter changes to only those for this folder
    const folderChanges = changes.filter(
      (change) =>
        (change.contentType === 'folder' && change.itemId === folderId) ||
        this.isChangeForFolderItem(change, folderId)
    );

    return this.applyRemoteChanges(peerId, folderChanges);
  }

  /**
   * Get folders that have unsynced changes
   */
  async getFoldersWithUnsyncedChanges(): Promise<string[]> {
    const unsynced = await this.getUnsyncedChanges();
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
          // Ignore parse errors
        }
      }
    }

    return Array.from(folderIds);
  }

  /**
   * Get sync status for a specific folder
   */
  async getFolderSyncStatus(
    folderId: string,
    peerId: string
  ): Promise<{
    pendingOutbound: number;
    lastSyncAt: string | null;
  }> {
    const state = this.syncStates.get(peerId);
    const pendingChanges = await this.getFolderChangesForPeer(folderId, peerId);

    return {
      pendingOutbound: pendingChanges.length,
      lastSyncAt: state?.lastSyncAt ?? null,
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

let syncEngine: SyncEngine | null = null;

export function getSyncEngine(): SyncEngine {
  if (!syncEngine) {
    syncEngine = new SyncEngine();
  }
  return syncEngine;
}

/**
 * Reset the singleton (for testing)
 */
export function resetSyncEngine(): void {
  syncEngine = null;
}
