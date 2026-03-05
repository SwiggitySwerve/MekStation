/**
 * Force Repository
 *
 * Data access layer for forces stored in SQLite.
 * Handles CRUD operations for forces and assignments.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import {
  IForce,
  ICreateForceRequest,
  IUpdateForceRequest,
  IUpdateAssignmentRequest,
} from '@/types/force';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import { getSQLiteService } from '../persistence/SQLiteService';
import { hydrateForce, type ForceRow } from './ForceRepository.helpers';
import {
  createForceOperation,
  updateForceOperation,
  updateAssignmentOperation,
  swapAssignmentsOperation,
} from './ForceRepository.operations';

// =============================================================================
// Result Types
// =============================================================================

export enum ForceErrorCode {
  NotFound = 'NOT_FOUND',
  DuplicateName = 'DUPLICATE_NAME',
  ValidationError = 'VALIDATION_ERROR',
  DatabaseError = 'DATABASE_ERROR',
  CircularHierarchy = 'CIRCULAR_HIERARCHY',
}

export interface IForceOperationResult {
  readonly success: boolean;
  readonly id?: string;
  readonly error?: string;
  readonly errorCode?: ForceErrorCode;
}

// =============================================================================
// Repository Interface
// =============================================================================

export interface IForceRepository {
  initialize(): void;
  createForce(request: ICreateForceRequest): IForceOperationResult;
  updateForce(id: string, request: IUpdateForceRequest): IForceOperationResult;
  deleteForce(id: string): IForceOperationResult;
  getForceById(id: string): IForce | null;
  getAllForces(): readonly IForce[];
  getRootForces(): readonly IForce[];
  getChildForces(parentId: string): readonly IForce[];
  updateAssignment(
    assignmentId: string,
    request: IUpdateAssignmentRequest,
  ): IForceOperationResult;
  swapAssignments(
    assignmentId1: string,
    assignmentId2: string,
  ): IForceOperationResult;
  clearAssignment(assignmentId: string): IForceOperationResult;
}

// =============================================================================
// Repository Implementation
// =============================================================================

export class ForceRepository implements IForceRepository {
  private initialized = false;

  /**
   * Initialize database tables for forces.
   */
  initialize(): void {
    if (this.initialized) return;

    const db = getSQLiteService().getDatabase();

    // Create forces table
    db.exec(`
      CREATE TABLE IF NOT EXISTS forces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        force_type TEXT NOT NULL DEFAULT 'lance',
        status TEXT NOT NULL DEFAULT 'active',
        affiliation TEXT,
        parent_id TEXT,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES forces(id) ON DELETE SET NULL
      )
    `);

    // Create force_assignments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS force_assignments (
        id TEXT PRIMARY KEY,
        force_id TEXT NOT NULL,
        pilot_id TEXT,
        unit_id TEXT,
        position TEXT NOT NULL DEFAULT 'member',
        slot INTEGER NOT NULL,
        notes TEXT,
        FOREIGN KEY (force_id) REFERENCES forces(id) ON DELETE CASCADE,
        FOREIGN KEY (pilot_id) REFERENCES pilots(id) ON DELETE SET NULL
      )
    `);

    // Create indexes
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_forces_parent ON forces(parent_id)`,
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_assignments_force ON force_assignments(force_id)`,
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_assignments_pilot ON force_assignments(pilot_id)`,
    );

    this.initialized = true;
  }

  // ===========================================================================
  // Force CRUD Operations
  // ===========================================================================

  createForce(request: ICreateForceRequest): IForceOperationResult {
    this.initialize();
    return createForceOperation(request);
  }

  /**
   * Get a force by ID.
   */
  getForceById(id: string): IForce | null {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const row = db.prepare('SELECT * FROM forces WHERE id = ?').get(id) as
      | ForceRow
      | undefined;

    if (!row) {
      return null;
    }

    return hydrateForce(row);
  }

  getAllForces(): readonly IForce[] {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM forces ORDER BY created_at DESC')
      .all() as ForceRow[];

    return rows.map((row) => hydrateForce(row));
  }

  getRootForces(): readonly IForce[] {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM forces WHERE parent_id IS NULL ORDER BY name')
      .all() as ForceRow[];

    return rows.map((row) => hydrateForce(row));
  }

  getChildForces(parentId: string): readonly IForce[] {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM forces WHERE parent_id = ? ORDER BY name')
      .all(parentId) as ForceRow[];

    return rows.map((row) => hydrateForce(row));
  }

  updateForce(id: string, request: IUpdateForceRequest): IForceOperationResult {
    this.initialize();
    return updateForceOperation(id, request);
  }

  /**
   * Delete a force and its assignments.
   */
  deleteForce(id: string): IForceOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();

    try {
      // Set children's parent to null
      db.prepare('UPDATE forces SET parent_id = NULL WHERE parent_id = ?').run(
        id,
      );

      // Delete assignments (cascade should handle this, but be explicit)
      db.prepare('DELETE FROM force_assignments WHERE force_id = ?').run(id);

      // Delete force
      db.prepare('DELETE FROM forces WHERE id = ?').run(id);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        errorCode: ForceErrorCode.DatabaseError,
      };
    }
  }

  // ===========================================================================
  // Assignment Operations
  // ===========================================================================

  updateAssignment(
    assignmentId: string,
    request: IUpdateAssignmentRequest,
  ): IForceOperationResult {
    this.initialize();
    return updateAssignmentOperation(assignmentId, request);
  }

  swapAssignments(
    assignmentId1: string,
    assignmentId2: string,
  ): IForceOperationResult {
    this.initialize();
    return swapAssignmentsOperation(assignmentId1, assignmentId2);
  }

  /**
   * Clear an assignment (remove pilot and unit).
   */
  clearAssignment(assignmentId: string): IForceOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();

    try {
      db.prepare(
        'UPDATE force_assignments SET pilot_id = NULL, unit_id = NULL WHERE id = ?',
      ).run(assignmentId);

      return { success: true, id: assignmentId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        errorCode: ForceErrorCode.DatabaseError,
      };
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================
}

// =============================================================================
// Singleton Instance
// =============================================================================

const forceRepositoryFactory: SingletonFactory<ForceRepository> =
  createSingleton((): ForceRepository => new ForceRepository());

export function getForceRepository(): ForceRepository {
  return forceRepositoryFactory.get();
}

export function resetForceRepository(): void {
  forceRepositoryFactory.reset();
}
