/**
 * Version History Service
 *
 * Business logic for version history management including
 * tracking, diffing, and rollback functionality.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IVersionSnapshot,
  IVersionDiff,
  IVersionHistorySummary,
  ShareableContentType,
} from '@/types/vault';

import { createSingleton } from '../core/createSingleton';
import {
  VersionHistoryRepository,
  getVersionHistoryRepository,
} from './VersionHistoryRepository';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for saving a version
 */
export interface ISaveVersionOptions {
  /** Optional message describing the change */
  message?: string;
  /** Skip if content hash matches latest version */
  skipIfUnchanged?: boolean;
}

/**
 * Result of a rollback operation
 */
export interface IRollbackResult {
  success: boolean;
  restoredVersion?: IVersionSnapshot;
  error?: string;
}

/**
 * Callback to apply restored content
 */
export type ApplyContentFn = (
  itemId: string,
  contentType: ShareableContentType,
  content: string,
) => Promise<boolean>;

// =============================================================================
// Service
// =============================================================================

/**
 * Service for managing version history
 */
export class VersionHistoryService {
  private repository: VersionHistoryRepository;
  private applyContentFn?: ApplyContentFn;

  constructor(repository?: VersionHistoryRepository) {
    this.repository = repository ?? getVersionHistoryRepository();
  }

  /**
   * Set the function to apply restored content during rollback
   */
  setApplyContentFn(fn: ApplyContentFn): void {
    this.applyContentFn = fn;
  }

  // ===========================================================================
  // Version Tracking
  // ===========================================================================

  /**
   * Save a new version snapshot
   */
  async saveVersion(
    contentType: ShareableContentType,
    itemId: string,
    content: string,
    createdBy: string,
    options?: ISaveVersionOptions,
  ): Promise<IVersionSnapshot | null> {
    const contentHash = await this.computeHash(content);

    // Check if we should skip unchanged content
    if (options?.skipIfUnchanged) {
      const latest = await this.repository.getLatestVersion(
        itemId,
        contentType,
      );
      if (latest && latest.contentHash === contentHash) {
        return null; // No change, skip
      }
    }

    return this.repository.saveVersion(
      contentType,
      itemId,
      content,
      contentHash,
      createdBy,
      options?.message,
    );
  }

  /**
   * Get version history for an item
   */
  async getHistory(
    itemId: string,
    contentType: ShareableContentType,
    limit = 50,
  ): Promise<IVersionSnapshot[]> {
    return this.repository.getVersions(itemId, contentType, limit);
  }

  /**
   * Get a specific version
   */
  async getVersion(
    itemId: string,
    contentType: ShareableContentType,
    version: number,
  ): Promise<IVersionSnapshot | null> {
    return this.repository.getVersion(itemId, contentType, version);
  }

  /**
   * Get version by ID
   */
  async getVersionById(id: string): Promise<IVersionSnapshot | null> {
    return this.repository.getVersionById(id);
  }

  /**
   * Get the latest version
   */
  async getLatestVersion(
    itemId: string,
    contentType: ShareableContentType,
  ): Promise<IVersionSnapshot | null> {
    return this.repository.getLatestVersion(itemId, contentType);
  }

  /**
   * Get history summary for an item
   */
  async getHistorySummary(
    itemId: string,
    contentType: ShareableContentType,
  ): Promise<IVersionHistorySummary> {
    const versions = await this.repository.getVersions(
      itemId,
      contentType,
      1000,
    );
    const currentVersion = await this.repository.getCurrentVersionNumber(
      itemId,
      contentType,
    );
    const totalSizeBytes = await this.repository.getStorageUsed(
      itemId,
      contentType,
    );

    return {
      itemId,
      contentType,
      currentVersion,
      totalVersions: versions.length,
      oldestVersion:
        versions.length > 0 ? versions[versions.length - 1].createdAt : null,
      newestVersion: versions.length > 0 ? versions[0].createdAt : null,
      totalSizeBytes,
    };
  }

  // ===========================================================================
  // Version Diff
  // ===========================================================================

  /**
   * Compare two versions and return differences
   */
  async diffVersions(
    itemId: string,
    contentType: ShareableContentType,
    fromVersion: number,
    toVersion: number,
  ): Promise<IVersionDiff | null> {
    const fromSnapshot = await this.repository.getVersion(
      itemId,
      contentType,
      fromVersion,
    );
    const toSnapshot = await this.repository.getVersion(
      itemId,
      contentType,
      toVersion,
    );

    if (!fromSnapshot || !toSnapshot) {
      return null;
    }

    return this.computeDiff(fromSnapshot, toSnapshot);
  }

  /**
   * Compare a version with the latest
   */
  async diffWithLatest(
    itemId: string,
    contentType: ShareableContentType,
    version: number,
  ): Promise<IVersionDiff | null> {
    const snapshot = await this.repository.getVersion(
      itemId,
      contentType,
      version,
    );
    const latest = await this.repository.getLatestVersion(itemId, contentType);

    if (!snapshot || !latest) {
      return null;
    }

    return this.computeDiff(snapshot, latest);
  }

  /**
   * Compute diff between two snapshots
   */
  private computeDiff(
    fromSnapshot: IVersionSnapshot,
    toSnapshot: IVersionSnapshot,
  ): IVersionDiff {
    let fromData: Record<string, unknown>;
    let toData: Record<string, unknown>;

    try {
      fromData = JSON.parse(fromSnapshot.content) as Record<string, unknown>;
    } catch {
      fromData = { _raw: fromSnapshot.content };
    }

    try {
      toData = JSON.parse(toSnapshot.content) as Record<string, unknown>;
    } catch {
      toData = { _raw: toSnapshot.content };
    }

    const changedFields: string[] = [];
    const additions: Record<string, unknown> = {};
    const deletions: Record<string, unknown> = {};
    const modifications: Record<string, { from: unknown; to: unknown }> = {};

    // Find additions and modifications
    for (const key of Object.keys(toData)) {
      if (!(key in fromData)) {
        additions[key] = toData[key];
        changedFields.push(key);
      } else if (
        JSON.stringify(fromData[key]) !== JSON.stringify(toData[key])
      ) {
        modifications[key] = { from: fromData[key], to: toData[key] };
        changedFields.push(key);
      }
    }

    // Find deletions
    for (const key of Object.keys(fromData)) {
      if (!(key in toData)) {
        deletions[key] = fromData[key];
        changedFields.push(key);
      }
    }

    return {
      fromVersion: fromSnapshot.version,
      toVersion: toSnapshot.version,
      contentType: fromSnapshot.contentType,
      itemId: fromSnapshot.itemId,
      changedFields,
      additions,
      deletions,
      modifications,
    };
  }

  // ===========================================================================
  // Rollback
  // ===========================================================================

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(
    itemId: string,
    contentType: ShareableContentType,
    version: number,
    createdBy: string,
  ): Promise<IRollbackResult> {
    // Get the target version
    const targetVersion = await this.repository.getVersion(
      itemId,
      contentType,
      version,
    );

    if (!targetVersion) {
      return {
        success: false,
        error: `Version ${version} not found`,
      };
    }

    // Apply the content if we have a handler
    if (this.applyContentFn) {
      const applied = await this.applyContentFn(
        itemId,
        contentType,
        targetVersion.content,
      );

      if (!applied) {
        return {
          success: false,
          error: 'Failed to apply restored content',
        };
      }
    }

    // Save as a new version (rollback creates new version)
    const newVersion = await this.saveVersion(
      contentType,
      itemId,
      targetVersion.content,
      createdBy,
      { message: `Rollback to version ${version}` },
    );

    if (!newVersion) {
      return {
        success: false,
        error: 'Failed to save rollback version',
      };
    }

    return {
      success: true,
      restoredVersion: newVersion,
    };
  }

  /**
   * Rollback to a version by ID
   */
  async rollbackToVersionById(
    versionId: string,
    createdBy: string,
  ): Promise<IRollbackResult> {
    const targetVersion = await this.repository.getVersionById(versionId);

    if (!targetVersion) {
      return {
        success: false,
        error: 'Version not found',
      };
    }

    return this.rollbackToVersion(
      targetVersion.itemId,
      targetVersion.contentType,
      targetVersion.version,
      createdBy,
    );
  }

  // ===========================================================================
  // Maintenance
  // ===========================================================================

  /**
   * Prune old versions, keeping only the most recent N
   */
  async pruneVersions(
    itemId: string,
    contentType: ShareableContentType,
    keepCount: number,
  ): Promise<number> {
    return this.repository.pruneOldVersions(itemId, contentType, keepCount);
  }

  /**
   * Prune all versions older than a date
   */
  async pruneByDate(olderThan: Date): Promise<number> {
    return this.repository.pruneByDate(olderThan.toISOString());
  }

  /**
   * Delete all versions for an item
   */
  async deleteAllVersions(
    itemId: string,
    contentType: ShareableContentType,
  ): Promise<number> {
    return this.repository.deleteAllVersions(itemId, contentType);
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Compute content hash
   */
  private async computeHash(content: string): Promise<string> {
    // Use SubtleCrypto if available (browser/Node 15+)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple hash for testing
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

// =============================================================================
// Singleton
// =============================================================================

const versionHistoryServiceFactory = createSingleton(
  () => new VersionHistoryService(),
);

export function getVersionHistoryService(): VersionHistoryService {
  return versionHistoryServiceFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetVersionHistoryService(): void {
  versionHistoryServiceFactory.reset();
}
