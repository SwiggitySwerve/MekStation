/**
 * Version Repository
 *
 * Data access layer for unit version history stored in SQLite.
 * Handles version listing, retrieval, and revert operations.
 *
 * @spec openspec/specs/unit-versioning/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import {
  IVersionRecord,
  IVersionMetadata,
  IUnitOperationResult,
  UnitErrorCode,
} from '@/types/persistence/UnitPersistence';

import { getSQLiteService } from '../persistence/SQLiteService';

/**
 * Database row type for unit_versions table
 */
interface VersionRow {
  id: string;
  unit_id: string;
  version: number;
  data: string;
  saved_at: string;
  notes: string | null;
  revert_source: number | null;
}

/**
 * Version Repository interface
 */
export interface IVersionRepository {
  getVersionHistory(unitId: string): readonly IVersionMetadata[];
  getVersion(unitId: string, version: number): IVersionRecord | null;
  getLatestVersion(unitId: string): IVersionRecord | null;
  revert(
    unitId: string,
    targetVersion: number,
    notes?: string,
  ): IUnitOperationResult;
  getVersionCount(unitId: string): number;
}

/**
 * Version Repository implementation
 */
export class VersionRepository implements IVersionRepository {
  /**
   * Get version history for a unit (metadata only, no data)
   */
  getVersionHistory(unitId: string): readonly IVersionMetadata[] {
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(`
      SELECT version, saved_at, notes, revert_source
      FROM unit_versions
      WHERE unit_id = ?
      ORDER BY version DESC
    `)
      .all(unitId) as VersionRow[];

    return rows.map((row) => ({
      version: row.version,
      savedAt: row.saved_at,
      notes: row.notes,
      revertSource: row.revert_source,
    }));
  }

  /**
   * Get a specific version of a unit
   */
  getVersion(unitId: string, version: number): IVersionRecord | null {
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(`
      SELECT * FROM unit_versions
      WHERE unit_id = ? AND version = ?
    `)
      .get(unitId, version) as VersionRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToRecord(row);
  }

  /**
   * Get the latest version of a unit
   */
  getLatestVersion(unitId: string): IVersionRecord | null {
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(`
      SELECT * FROM unit_versions
      WHERE unit_id = ?
      ORDER BY version DESC
      LIMIT 1
    `)
      .get(unitId) as VersionRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToRecord(row);
  }

  /**
   * Revert a unit to a previous version
   * Creates a new version with the data from the target version
   */
  revert(
    unitId: string,
    targetVersion: number,
    notes?: string,
  ): IUnitOperationResult {
    const db = getSQLiteService().getDatabase();

    // Get the target version
    const targetVersionRecord = this.getVersion(unitId, targetVersion);
    if (!targetVersionRecord) {
      return {
        success: false,
        error: {
          message: `Version ${targetVersion} not found`,
          errorCode: UnitErrorCode.VERSION_NOT_FOUND,
        },
      };
    }

    // Get current version number
    const currentVersionResult = db
      .prepare(`
      SELECT current_version FROM custom_units WHERE id = ?
    `)
      .get(unitId) as { current_version: number } | undefined;

    if (!currentVersionResult) {
      return {
        success: false,
        error: {
          message: `Unit "${unitId}" not found`,
          errorCode: UnitErrorCode.NOT_FOUND,
        },
      };
    }

    const newVersion = currentVersionResult.current_version + 1;
    const now = new Date().toISOString();
    const revertNotes = notes || `Reverted from version ${targetVersion}`;

    try {
      // Create revert in a transaction
      const revertTransaction = db.transaction(() => {
        // Update unit with data from target version
        const updateUnit = db.prepare(`
          UPDATE custom_units
          SET data = ?, current_version = ?, updated_at = ?
          WHERE id = ?
        `);

        updateUnit.run(targetVersionRecord.data, newVersion, now, unitId);

        // Create new version entry
        const versionId = uuidv4();
        const insertVersion = db.prepare(`
          INSERT INTO unit_versions (id, unit_id, version, data, saved_at, notes, revert_source)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        insertVersion.run(
          versionId,
          unitId,
          newVersion,
          targetVersionRecord.data,
          now,
          revertNotes,
          targetVersion,
        );
      });

      revertTransaction();

      // Prune old versions if needed
      this.pruneVersions(unitId);

      return {
        success: true,
        data: { id: unitId, version: newVersion },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          message: `Failed to revert: ${message}`,
          errorCode: UnitErrorCode.DATABASE_ERROR,
        },
      };
    }
  }

  /**
   * Get the number of versions for a unit
   */
  getVersionCount(unitId: string): number {
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare(`
      SELECT COUNT(*) as count FROM unit_versions WHERE unit_id = ?
    `)
      .get(unitId) as { count: number };

    return result.count;
  }

  /**
   * Prune old versions beyond the configured limit
   */
  private pruneVersions(unitId: string): void {
    const db = getSQLiteService().getDatabase();
    const config = getSQLiteService().getConfig();
    const maxVersions = config.maxVersionHistory;

    const count = this.getVersionCount(unitId);
    if (count <= maxVersions) {
      return;
    }

    // Delete oldest versions beyond limit
    const deleteOld = db.prepare(`
      DELETE FROM unit_versions
      WHERE unit_id = ?
      AND version NOT IN (
        SELECT version FROM unit_versions
        WHERE unit_id = ?
        ORDER BY version DESC
        LIMIT ?
      )
    `);

    deleteOld.run(unitId, unitId, maxVersions);
  }

  /**
   * Convert database row to version record
   */
  private rowToRecord(row: VersionRow): IVersionRecord {
    return {
      id: row.id,
      unitId: row.unit_id,
      version: row.version,
      data: row.data,
      savedAt: row.saved_at,
      notes: row.notes,
      revertSource: row.revert_source,
    };
  }
}

// Singleton instance
let versionRepositoryInstance: VersionRepository | null = null;

/**
 * Get or create the version repository singleton
 */
export function getVersionRepository(): VersionRepository {
  if (!versionRepositoryInstance) {
    versionRepositoryInstance = new VersionRepository();
  }
  return versionRepositoryInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetVersionRepository(): void {
  versionRepositoryInstance = null;
}
