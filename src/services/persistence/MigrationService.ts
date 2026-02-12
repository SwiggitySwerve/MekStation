/**
 * Migration Service
 *
 * Utility for migrating custom units from IndexedDB to SQLite.
 * This is a one-time migration tool for transitioning existing data.
 *
 * @spec openspec/specs/persistence-services/spec.md
 */

import { logger } from '@/utils/logger';

import { IFullUnit } from '../units/CanonicalUnitService';
import { getUnitRepository } from '../units/UnitRepository';
import { indexedDBService, STORES } from './IndexedDBService';
import { getSQLiteService } from './SQLiteService';

/**
 * Migration result
 */
export interface IMigrationResult {
  readonly success: boolean;
  readonly totalUnits: number;
  readonly migratedUnits: number;
  readonly failedUnits: number;
  readonly errors: readonly IMigrationError[];
}

/**
 * Migration error entry
 */
export interface IMigrationError {
  readonly unitId: string;
  readonly unitName: string;
  readonly error: string;
}

/**
 * Migration progress callback
 */
export type MigrationProgressCallback = (progress: {
  current: number;
  total: number;
  currentUnit: string;
}) => void;

/**
 * Migration Service interface
 */
export interface IMigrationService {
  hasIndexedDBData(): Promise<boolean>;
  migrateToSQLite(
    onProgress?: MigrationProgressCallback,
  ): Promise<IMigrationResult>;
  clearIndexedDB(): Promise<void>;
}

/**
 * Migration Service implementation
 */
export class MigrationService implements IMigrationService {
  /**
   * Check if there is data in IndexedDB to migrate
   */
  async hasIndexedDBData(): Promise<boolean> {
    try {
      await indexedDBService.initialize();
      const units = await indexedDBService.getAll<IFullUnit>(
        STORES.CUSTOM_UNITS,
      );
      return units.length > 0;
    } catch {
      // IndexedDB not available or empty
      return false;
    }
  }

  /**
   * Migrate all custom units from IndexedDB to SQLite
   */
  async migrateToSQLite(
    onProgress?: MigrationProgressCallback,
  ): Promise<IMigrationResult> {
    const errors: IMigrationError[] = [];
    let migratedCount = 0;

    try {
      // Initialize both databases
      await indexedDBService.initialize();
      getSQLiteService().initialize();

      // Get all units from IndexedDB
      const units = await indexedDBService.getAll<IFullUnit>(
        STORES.CUSTOM_UNITS,
      );
      const totalUnits = units.length;

      if (totalUnits === 0) {
        return {
          success: true,
          totalUnits: 0,
          migratedUnits: 0,
          failedUnits: 0,
          errors: [],
        };
      }

      const unitRepository = getUnitRepository();

      // Migrate each unit
      for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        const unitName = `${unit.chassis || 'Unknown'} ${unit.variant || 'Unknown'}`;

        // Report progress
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: totalUnits,
            currentUnit: unitName,
          });
        }

        try {
          // Skip if unit already exists in SQLite (by name)
          const existing = unitRepository.findByName(
            unit.chassis || '',
            unit.variant || '',
          );

          if (existing) {
            logger.debug(`Skipping "${unitName}" - already exists in SQLite`);
            continue;
          }

          // Create unit in SQLite
          // IFullUnit has [key: string]: unknown, which is compatible with Record<string, unknown>
          const result = unitRepository.create({
            chassis: unit.chassis || 'Unknown',
            variant: unit.variant || 'Unknown',
            data: unit,
            notes: 'Migrated from IndexedDB',
          });

          if (result.success) {
            migratedCount++;
          } else {
            errors.push({
              unitId: unit.id || 'unknown',
              unitName,
              error: result.error.message || 'Unknown error',
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          errors.push({
            unitId: unit.id || 'unknown',
            unitName,
            error: message,
          });
        }
      }

      return {
        success: errors.length === 0,
        totalUnits,
        migratedUnits: migratedCount,
        failedUnits: errors.length,
        errors,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Migration failed';
      return {
        success: false,
        totalUnits: 0,
        migratedUnits: migratedCount,
        failedUnits: 1,
        errors: [
          {
            unitId: 'migration',
            unitName: 'Migration Process',
            error: message,
          },
        ],
      };
    }
  }

  /**
   * Clear all data from IndexedDB (after successful migration)
   */
  async clearIndexedDB(): Promise<void> {
    await indexedDBService.initialize();
    await indexedDBService.clear(STORES.CUSTOM_UNITS);
    await indexedDBService.clear(STORES.UNIT_METADATA);
  }
}

// Singleton instance
export const migrationService = new MigrationService();
