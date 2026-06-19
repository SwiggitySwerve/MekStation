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

import type {
  ContentApplyFn,
  ContentDataFn,
  ContentHashFn,
  ItemNameFn,
} from './SyncEngine.types';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import {
  ChangeLogRepository,
  getChangeLogRepository,
} from './ChangeLogRepository';
import {
  mapPendingConflicts,
  resolveAcceptRemote as resolveAcceptRemoteHelper,
  resolveFork as resolveForkHelper,
} from './SyncEngine.conflictResolution';
import {
  buildFolderMembershipPayload,
  filterFolderChanges,
  getChangesForFolder as getChangesForFolderHelper,
  getFolderChangesForPeer as getFolderChangesForPeerHelper,
  getFoldersWithUnsyncedChanges as getFoldersWithUnsyncedChangesHelper,
} from './SyncEngine.folders';

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

// Re-exported from SyncEngine.types so existing consumers that import these
// callback types from `@/services/vault/SyncEngine` (or via the vault barrel
// index) keep working unchanged.
export type { ContentHashFn, ContentDataFn, ItemNameFn, ContentApplyFn };

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
  private itemNameFn?: ItemNameFn;
  private contentApplyFn?: ContentApplyFn;

  constructor(changeLog?: ChangeLogRepository) {
    this.changeLog = changeLog ?? getChangeLogRepository();
  }

  /**
   * Set content hash function for computing content hashes
   */
  readonly setContentHashFn = (fn: ContentHashFn): void => {
    this.contentHashFn = fn;
  };

  /**
   * Set content data function for getting content data
   */
  readonly setContentDataFn = (fn: ContentDataFn): void => {
    this.contentDataFn = fn;
  };

  /**
   * Register a resolver that maps (itemId, contentType) → display name.
   * Used so conflict records carry a human-readable name rather than a raw id.
   */
  readonly setItemNameFn = (fn: ItemNameFn): void => {
    this.itemNameFn = fn;
  };

  /**
   * Register a callback that persists remote content to local storage.
   * Used by applyChange (no-conflict path) and by conflict resolution paths
   * (acceptRemote, fork) so the sync engine stays storage-agnostic.
   */
  readonly setContentApplyFn = (fn: ContentApplyFn): void => {
    this.contentApplyFn = fn;
  };

  // ===========================================================================
  // Change Tracking
  // ===========================================================================

  /**
   * Record a local change
   */
  readonly recordChange = async (
    changeType: ChangeType,
    contentType: ShareableContentType | 'folder',
    itemId: string,
    data?: string,
  ): Promise<IChangeLogEntry> => {
    const contentHash = this.contentHashFn
      ? await this.contentHashFn(itemId, contentType)
      : null;

    return this.changeLog.recordChange(
      changeType,
      contentType,
      itemId,
      contentHash,
      data ?? null,
    );
  };

  /**
   * Get changes to send to a peer
   */
  readonly getChangesForPeer = async (
    peerId: string,
    limit = 100,
  ): Promise<IChangeLogEntry[]> => {
    const state = this.syncStates.get(peerId);
    const fromVersion = state?.lastVersion ?? 0;

    return this.changeLog.getChangesSince(fromVersion, limit);
  };

  /**
   * Get all unsynced local changes
   */
  readonly getUnsyncedChanges = async (): Promise<IChangeLogEntry[]> => {
    return this.changeLog.getUnsynced();
  };

  /**
   * Get current version
   */
  readonly getCurrentVersion = async (): Promise<number> => {
    return this.changeLog.getCurrentVersion();
  };

  // ===========================================================================
  // Reconciliation
  // ===========================================================================

  /**
   * Apply changes received from a peer
   */
  readonly applyRemoteChanges = async (
    peerId: string,
    changes: IChangeLogEntry[],
  ): Promise<IReconciliationResult> => {
    const applied: IChangeLogEntry[] = [];
    const conflicts: ISyncConflict[] = [];
    const skipped: IChangeLogEntry[] = [];

    for (const remoteChange of changes) {
      // Get local state for this item
      const localChange = await this.changeLog.getLatestForItem(
        remoteChange.itemId,
        remoteChange.contentType,
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
          peerId,
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
  };

  /**
   * Check if two changes conflict
   */
  private isConflict(local: IChangeLogEntry, remote: IChangeLogEntry): boolean {
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
   * Create a conflict record. Resolves a human-readable item name via the
   * registered itemNameFn when available, otherwise falls back to the raw id
   * so the conflict row always carries something the UI can display.
   */
  private async createConflict(
    local: IChangeLogEntry,
    remote: IChangeLogEntry,
    peerId: string,
  ): Promise<ISyncConflict> {
    const resolvedName =
      (this.itemNameFn
        ? await this.itemNameFn(local.itemId, local.contentType)
        : null) ?? local.itemId;

    const conflictId = await this.changeLog.recordConflict({
      contentType: local.contentType,
      itemId: local.itemId,
      itemName: resolvedName,
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
      itemName: resolvedName,
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
   * Apply a remote change locally. Records the incoming change against the
   * changelog, then — if a content-apply callback is registered and the
   * change carries data — writes that data back to local storage.
   */
  private async applyChange(
    change: IChangeLogEntry,
    sourceId: string,
  ): Promise<void> {
    await this.changeLog.recordChange(
      change.changeType,
      change.contentType,
      change.itemId,
      change.contentHash,
      change.data,
      sourceId,
    );

    if (this.contentApplyFn && change.data) {
      await this.contentApplyFn(change.itemId, change.contentType, change.data);
    }
  }

  // ===========================================================================
  // Conflict Resolution
  // ===========================================================================

  /**
   * Get pending conflicts
   */
  readonly getPendingConflicts = async (): Promise<ISyncConflict[]> => {
    const rows = await this.changeLog.getPendingConflicts();
    return mapPendingConflicts(rows);
  };

  /**
   * Resolve a conflict by keeping local version
   */
  readonly resolveKeepLocal = async (conflictId: string): Promise<boolean> => {
    return this.changeLog.resolveConflict(conflictId, 'local');
  };

  /**
   * Resolve a conflict by accepting the remote version. Writes the supplied
   * remote payload to local storage via the registered apply callback.
   */
  readonly resolveAcceptRemote = async (
    conflictId: string,
    remoteData?: string,
  ): Promise<boolean> => {
    return resolveAcceptRemoteHelper(this.changeLog, conflictId, {
      remoteData,
      applyFn: this.contentApplyFn,
    });
  };

  /**
   * Resolve a conflict by forking — keep the local version and write the
   * remote version into a new local item with a generated id.
   */
  readonly resolveFork = async (
    conflictId: string,
    remoteData?: string,
  ): Promise<boolean | { forkedItemId: string }> => {
    return resolveForkHelper(this.changeLog, conflictId, {
      remoteData,
      applyFn: this.contentApplyFn,
      recordLocalChange: (contentType, itemId, data) =>
        this.recordChange('create', contentType, itemId, data),
    });
  };

  // ===========================================================================
  // Sync State Management
  // ===========================================================================

  /**
   * Get sync state for a peer
   */
  readonly getSyncState = (peerId: string): ISyncState | undefined => {
    return this.syncStates.get(peerId);
  };

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
  readonly setSyncStatus = (
    peerId: string,
    status: 'idle' | 'syncing' | 'error',
  ): void => {
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
  };

  /**
   * Mark local changes as synced to a peer
   */
  readonly markSyncedToPeer = async (
    peerId: string,
    changeIds: string[],
  ): Promise<void> => {
    await this.changeLog.markSynced(changeIds);
  };

  /**
   * Get all sync states
   */
  readonly getAllSyncStates = (): ISyncState[] => {
    return Array.from(this.syncStates.values());
  };

  /**
   * Reset sync state for a peer
   */
  readonly resetSyncState = (peerId: string): void => {
    this.syncStates.delete(peerId);
  };

  // ===========================================================================
  // Folder-Level Sync
  // ===========================================================================

  /**
   * Record a folder change (when folder is created/updated/deleted)
   */
  readonly recordFolderChange = async (
    changeType: ChangeType,
    folderId: string,
    folderData?: string,
  ): Promise<IChangeLogEntry> => {
    return this.recordChange(changeType, 'folder', folderId, folderData);
  };

  /**
   * Record when an item is added to a folder
   */
  readonly recordFolderItemAdded = async (
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<IChangeLogEntry> => {
    return this.recordChange(
      'update',
      'folder',
      folderId,
      buildFolderMembershipPayload('item_added', folderId, itemId, itemType),
    );
  };

  /**
   * Record when an item is removed from a folder
   */
  readonly recordFolderItemRemoved = async (
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<IChangeLogEntry> => {
    return this.recordChange(
      'update',
      'folder',
      folderId,
      buildFolderMembershipPayload('item_removed', folderId, itemId, itemType),
    );
  };

  /**
   * Get changes for a specific folder (folder and all its items)
   */
  readonly getChangesForFolder = async (
    folderId: string,
    fromVersion = 0,
    limit = 100,
  ): Promise<IChangeLogEntry[]> => {
    return getChangesForFolderHelper(
      this.changeLog,
      folderId,
      fromVersion,
      limit,
    );
  };

  /**
   * Sync a specific folder with a peer
   * Returns changes that need to be sent to the peer
   */
  readonly getFolderChangesForPeer = async (
    folderId: string,
    peerId: string,
    limit = 100,
  ): Promise<IChangeLogEntry[]> => {
    return getFolderChangesForPeerHelper(
      this.changeLog,
      this.syncStates,
      folderId,
      peerId,
      limit,
    );
  };

  /**
   * Apply folder-specific changes from a peer
   */
  readonly applyFolderChanges = async (
    folderId: string,
    peerId: string,
    changes: IChangeLogEntry[],
  ): Promise<IReconciliationResult> => {
    return this.applyRemoteChanges(
      peerId,
      filterFolderChanges(changes, folderId),
    );
  };

  /**
   * Get folders that have unsynced changes
   */
  readonly getFoldersWithUnsyncedChanges = async (): Promise<string[]> => {
    return getFoldersWithUnsyncedChangesHelper(this.changeLog);
  };

  /**
   * Get sync status for a specific folder
   */
  readonly getFolderSyncStatus = async (
    folderId: string,
    peerId: string,
  ): Promise<{
    pendingOutbound: number;
    lastSyncAt: string | null;
  }> => {
    const state = this.syncStates.get(peerId);
    const pendingChanges = await this.getFolderChangesForPeer(folderId, peerId);

    return {
      pendingOutbound: pendingChanges.length,
      lastSyncAt: state?.lastSyncAt ?? null,
    };
  };
}

// =============================================================================
// Singleton
// =============================================================================

const syncEngineFactory: SingletonFactory<SyncEngine> = createSingleton(
  (): SyncEngine => new SyncEngine(),
);

export function getSyncEngine(): SyncEngine {
  return syncEngineFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetSyncEngine(): void {
  syncEngineFactory.reset();
}
