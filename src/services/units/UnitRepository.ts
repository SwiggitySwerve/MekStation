/**
 * Unit Repository
 *
 * Data access layer for custom units stored in SQLite.
 * Handles CRUD operations and name uniqueness.
 *
 * @spec openspec/specs/persistence-services/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import { Era } from '@/types/enums/Era';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { getWeightClass } from '@/types/enums/WeightClass';
import {
  ICustomUnitRecord,
  ICustomUnitIndexEntry,
  ICreateUnitRequest,
  IUpdateUnitRequest,
  IUnitOperationResult,
  UnitErrorCode,
  ICloneNameSuggestion,
} from '@/types/persistence/UnitPersistence';

import { getSQLiteService } from '../persistence/SQLiteService';

/**
 * Database row type for custom_units table
 */
interface CustomUnitRow {
  id: string;
  chassis: string;
  variant: string;
  tonnage: number;
  tech_base: string;
  era: string;
  rules_level: string;
  unit_type: string;
  data: string;
  current_version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Unit Repository interface
 */
export interface IUnitRepository {
  create(request: ICreateUnitRequest): IUnitOperationResult;
  update(id: string, request: IUpdateUnitRequest): IUnitOperationResult;
  delete(id: string): IUnitOperationResult;
  getById(id: string): ICustomUnitRecord | null;
  findByName(chassis: string, variant: string): ICustomUnitRecord | null;
  list(): readonly ICustomUnitIndexEntry[];
  exists(id: string): boolean;
  nameExists(chassis: string, variant: string): boolean;
  suggestCloneName(chassis: string, variant: string): ICloneNameSuggestion;
}

/**
 * Unit Repository implementation
 */
export class UnitRepository implements IUnitRepository {
  /**
   * Create a new custom unit
   */
  create(request: ICreateUnitRequest): IUnitOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();
    const id = `custom-${uuidv4()}`;

    // Check for duplicate name
    if (this.nameExists(request.chassis, request.variant)) {
      const suggestion = this.suggestCloneName(
        request.chassis,
        request.variant,
      );
      return {
        success: false,
        error: {
          message: `Unit "${request.chassis} ${request.variant}" already exists. Suggested name: "${suggestion.chassis} ${suggestion.suggestedVariant}"`,
          errorCode: UnitErrorCode.DUPLICATE_NAME,
        },
      };
    }

    // Extract metadata from unit data
    const unitData = request.data;
    const tonnage = (unitData.tonnage as number) || 0;
    const techBase = (unitData.techBase as string) || TechBase.INNER_SPHERE;
    const era = (unitData.era as string) || Era.LATE_SUCCESSION_WARS;
    const rulesLevel = (unitData.rulesLevel as string) || RulesLevel.STANDARD;
    const unitType = (unitData.unitType as string) || 'BattleMech';

    try {
      // Insert unit
      const insertUnit = db.prepare(`
        INSERT INTO custom_units (
          id, chassis, variant, tonnage, tech_base, era, rules_level, unit_type,
          data, current_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);

      insertUnit.run(
        id,
        request.chassis,
        request.variant,
        tonnage,
        techBase,
        era,
        rulesLevel,
        unitType,
        JSON.stringify(unitData),
        now,
        now,
      );

      // Create initial version entry
      const versionId = uuidv4();
      const insertVersion = db.prepare(`
        INSERT INTO unit_versions (id, unit_id, version, data, saved_at, notes)
        VALUES (?, ?, 1, ?, ?, ?)
      `);

      insertVersion.run(
        versionId,
        id,
        JSON.stringify(unitData),
        now,
        request.notes || null,
      );

      return {
        success: true,
        data: { id, version: 1 },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          message: `Failed to create unit: ${message}`,
          errorCode: UnitErrorCode.DATABASE_ERROR,
        },
      };
    }
  }

  /**
   * Update an existing custom unit (increments version)
   */
  update(id: string, request: IUpdateUnitRequest): IUnitOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    // Get current unit
    const currentUnit = this.getById(id);
    if (!currentUnit) {
      return {
        success: false,
        error: {
          message: `Unit "${id}" not found`,
          errorCode: UnitErrorCode.NOT_FOUND,
        },
      };
    }

    const newVersion = currentUnit.currentVersion + 1;
    const unitData = request.data;
    const tonnage = (unitData.tonnage as number) || currentUnit.tonnage;
    const techBase = (unitData.techBase as string) || currentUnit.techBase;
    const era = (unitData.era as string) || currentUnit.era;
    const rulesLevel =
      (unitData.rulesLevel as string) || currentUnit.rulesLevel;
    const unitType = (unitData.unitType as string) || currentUnit.unitType;

    try {
      // Update unit record
      const updateUnit = db.prepare(`
        UPDATE custom_units
        SET data = ?, tonnage = ?, tech_base = ?, era = ?, rules_level = ?, unit_type = ?,
            current_version = ?, updated_at = ?
        WHERE id = ?
      `);

      updateUnit.run(
        JSON.stringify(unitData),
        tonnage,
        techBase,
        era,
        rulesLevel,
        unitType,
        newVersion,
        now,
        id,
      );

      // Create new version entry
      const versionId = uuidv4();
      const insertVersion = db.prepare(`
        INSERT INTO unit_versions (id, unit_id, version, data, saved_at, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insertVersion.run(
        versionId,
        id,
        newVersion,
        JSON.stringify(unitData),
        now,
        request.notes || null,
      );

      // Prune old versions if needed
      this.pruneVersions(id);

      return {
        success: true,
        data: { id, version: newVersion },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          message: `Failed to update unit: ${message}`,
          errorCode: UnitErrorCode.DATABASE_ERROR,
        },
      };
    }
  }

  /**
   * Delete a custom unit and all its versions
   */
  delete(id: string): IUnitOperationResult {
    const db = getSQLiteService().getDatabase();

    try {
      // Foreign key cascade will delete versions
      const deleteUnit = db.prepare('DELETE FROM custom_units WHERE id = ?');
      deleteUnit.run(id);

      return { success: true, data: { id } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          message: `Failed to delete unit: ${message}`,
          errorCode: UnitErrorCode.DATABASE_ERROR,
        },
      };
    }
  }

  /**
   * Get a custom unit by ID
   */
  getById(id: string): ICustomUnitRecord | null {
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(`
      SELECT * FROM custom_units WHERE id = ?
    `)
      .get(id) as CustomUnitRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToRecord(row);
  }

  /**
   * Find a custom unit by chassis and variant
   */
  findByName(chassis: string, variant: string): ICustomUnitRecord | null {
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(`
      SELECT * FROM custom_units 
      WHERE LOWER(chassis) = LOWER(?) AND LOWER(variant) = LOWER(?)
    `)
      .get(chassis, variant) as CustomUnitRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToRecord(row);
  }

  /**
   * List all custom units as index entries
   */
  list(): readonly ICustomUnitIndexEntry[] {
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(`
      SELECT id, chassis, variant, tonnage, tech_base, era, rules_level, 
             unit_type, current_version, created_at, updated_at
      FROM custom_units
      ORDER BY chassis, variant
    `)
      .all() as CustomUnitRow[];

    return rows.map((row) => this.rowToIndexEntry(row));
  }

  /**
   * Check if a unit exists by ID
   */
  exists(id: string): boolean {
    const db = getSQLiteService().getDatabase();
    const result = db
      .prepare('SELECT 1 FROM custom_units WHERE id = ?')
      .get(id);
    return result !== undefined;
  }

  /**
   * Check if a name is already taken
   */
  nameExists(chassis: string, variant: string): boolean {
    const db = getSQLiteService().getDatabase();
    const result = db
      .prepare(`
      SELECT 1 FROM custom_units 
      WHERE LOWER(chassis) = LOWER(?) AND LOWER(variant) = LOWER(?)
    `)
      .get(chassis, variant);
    return result !== undefined;
  }

  /**
   * Suggest a unique clone name
   */
  suggestCloneName(chassis: string, baseVariant: string): ICloneNameSuggestion {
    // Strip any existing -Custom-N suffix
    const cleanVariant = baseVariant.replace(/-Custom-\d+$/, '');

    let counter = 1;
    let suggestedVariant = `${cleanVariant}-Custom-${counter}`;

    while (this.nameExists(chassis, suggestedVariant)) {
      counter++;
      suggestedVariant = `${cleanVariant}-Custom-${counter}`;
    }

    return {
      chassis,
      variant: baseVariant,
      suggestedVariant,
    };
  }

  /**
   * Prune old versions beyond the configured limit
   */
  private pruneVersions(unitId: string): void {
    const db = getSQLiteService().getDatabase();
    const config = getSQLiteService().getConfig();
    const maxVersions = config.maxVersionHistory;

    // Get version count
    const countResult = db
      .prepare(`
      SELECT COUNT(*) as count FROM unit_versions WHERE unit_id = ?
    `)
      .get(unitId) as { count: number };

    if (countResult.count <= maxVersions) {
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
   * Convert database row to unit record
   */
  private rowToRecord(row: CustomUnitRow): ICustomUnitRecord {
    return {
      id: row.id,
      chassis: row.chassis,
      variant: row.variant,
      tonnage: row.tonnage,
      techBase: row.tech_base as TechBase,
      era: row.era as Era,
      rulesLevel: row.rules_level as RulesLevel,
      unitType: row.unit_type,
      data: row.data,
      currentVersion: row.current_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert database row to index entry
   */
  private rowToIndexEntry(row: CustomUnitRow): ICustomUnitIndexEntry {
    return {
      id: row.id,
      chassis: row.chassis,
      variant: row.variant,
      tonnage: row.tonnage,
      techBase: row.tech_base as TechBase,
      era: row.era as Era,
      rulesLevel: row.rules_level as RulesLevel,
      unitType: row.unit_type,
      weightClass: getWeightClass(row.tonnage),
      currentVersion: row.current_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton instance
let unitRepositoryInstance: UnitRepository | null = null;

/**
 * Get or create the unit repository singleton
 */
export function getUnitRepository(): UnitRepository {
  if (!unitRepositoryInstance) {
    unitRepositoryInstance = new UnitRepository();
  }
  return unitRepositoryInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetUnitRepository(): void {
  unitRepositoryInstance = null;
}
