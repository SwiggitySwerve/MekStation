/**
 * Force Repository
 *
 * Data access layer for forces stored in SQLite.
 * Handles CRUD operations for forces and assignments.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import type {
  IForce as ForceEntity,
  ICreateForceRequest,
  IUpdateForceRequest,
  IUpdateAssignmentRequest,
} from '@/types/force';

import {
  createSingleton as createRepositorySingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import { getSQLiteService } from '../persistence/SQLiteService';
import { invokeEncounterCascadeHook } from './ForceRepository.cascade';
import { hydrateForce, type ForceRow } from './ForceRepository.helpers';
import {
  createForceOperation,
  updateForceOperation,
  updateAssignmentOperation,
  swapAssignmentsOperation,
} from './ForceRepository.operations';
import {
  ForceErrorCode,
  type IForceOperationResult,
} from './ForceRepository.types';

// =============================================================================
// Result Types
// =============================================================================

// Re-exported from ForceRepository.types so existing consumers that import
// these from `@/services/forces/ForceRepository` keep working unchanged.
export { ForceErrorCode };
export type { IForceOperationResult };

// =============================================================================
// Repository Interface
// =============================================================================

export interface IForceRepository {
  initialize(): void;
  createForce(request: ICreateForceRequest): IForceOperationResult;
  updateForce(id: string, request: IUpdateForceRequest): IForceOperationResult;
  deleteForce(id: string): IForceOperationResult;
  getForceById(id: string): ForceEntity | null;
  getAllForces(): readonly ForceEntity[];
  getRootForces(): readonly ForceEntity[];
  getChildForces(parentId: string): readonly ForceEntity[];
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
  initialize = (): void => {
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
  };

  // ===========================================================================
  // Force CRUD Operations
  // ===========================================================================

  createForce = (request: ICreateForceRequest): IForceOperationResult => {
    this.initialize();
    return createForceOperation(request);
  };

  /**
   * Get a force by ID.
   */
  getForceById = (id: string): ForceEntity | null => {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const row = db.prepare('SELECT * FROM forces WHERE id = ?').get(id) as
      | ForceRow
      | undefined;

    if (!row) {
      return null;
    }

    return hydrateForce(row);
  };

  getAllForces = (): readonly ForceEntity[] => {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM forces ORDER BY created_at DESC')
      .all() as ForceRow[];

    return rows.map((row) => hydrateForce(row));
  };

  getRootForces = (): readonly ForceEntity[] => {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM forces WHERE parent_id IS NULL ORDER BY name')
      .all() as ForceRow[];

    return rows.map((row) => hydrateForce(row));
  };

  getChildForces = (parentId: string): readonly ForceEntity[] => {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM forces WHERE parent_id = ? ORDER BY name')
      .all(parentId) as ForceRow[];

    return rows.map((row) => hydrateForce(row));
  };

  updateForce = (
    id: string,
    request: IUpdateForceRequest,
  ): IForceOperationResult => {
    this.initialize();
    return updateForceOperation(id, request);
  };

  /**
   * Delete a force and its assignments.
   *
   * Cascade contract (PR 2 of repair-broken-encounter-drafts):
   *   The whole sequence — encounter cascade + parent-id un-link + assignments
   *   delete + force delete — runs inside ONE SQLite transaction so a thrown
   *   UPDATE in the encounter cascade rolls every step back atomically. The
   *   force row remains present after a rollback, so callers see the force
   *   delete as having "not happened" rather than a half-applied state.
   *
   *   The cascade hook is invoked BEFORE the force-row DELETE so the
   *   referential pattern is "clear references first, then drop the target" —
   *   if we deleted the force first, the json_extract WHERE clauses in the
   *   cascade would still match (the IDs are stored in JSON columns, not
   *   FK-linked), but ordering matters for crash-mid-transaction recovery
   *   semantics.
   */
  deleteForce = (id: string): IForceOperationResult => {
    this.initialize();

    const db = getSQLiteService().getDatabase();

    try {
      const txn = db.transaction((forceId: string) => {
        // Step 1: Cascade-clear any encounters that reference this force.
        // Hook is registered by EncounterRepository's singleton factory at
        // module-init time; if it throws, the whole transaction rolls back.
        // No-op when the encounter module is not yet loaded (e.g. cold-start
        // standalone Force-only flow).
        invokeEncounterCascadeHook(forceId);

        // Step 2: Un-link any child forces (FK ON DELETE SET NULL would do
        // this for us, but explicit is clearer + survives schema changes).
        db.prepare(
          'UPDATE forces SET parent_id = NULL WHERE parent_id = ?',
        ).run(forceId);

        // Step 3: Delete assignments (cascade should handle this, but be explicit).
        db.prepare('DELETE FROM force_assignments WHERE force_id = ?').run(
          forceId,
        );

        // Step 4: Delete the force row itself.
        db.prepare('DELETE FROM forces WHERE id = ?').run(forceId);
      });

      txn(id);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        errorCode: ForceErrorCode.DatabaseError,
      };
    }
  };

  // ===========================================================================
  // Assignment Operations
  // ===========================================================================

  updateAssignment = (
    assignmentId: string,
    request: IUpdateAssignmentRequest,
  ): IForceOperationResult => {
    this.initialize();
    return updateAssignmentOperation(assignmentId, request);
  };

  swapAssignments = (
    assignmentId1: string,
    assignmentId2: string,
  ): IForceOperationResult => {
    this.initialize();
    return swapAssignmentsOperation(assignmentId1, assignmentId2);
  };

  /**
   * Clear an assignment (remove pilot and unit).
   */
  clearAssignment = (assignmentId: string): IForceOperationResult => {
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
  };

  // ===========================================================================
  // Helper Methods
  // ===========================================================================
}

// =============================================================================
// Singleton Instance
// =============================================================================

const forceRepositoryFactory: SingletonFactory<ForceRepository> =
  createRepositorySingleton((): ForceRepository => new ForceRepository());

export function getForceRepository(): ForceRepository {
  return forceRepositoryFactory.get();
}

export function resetForceRepository(): void {
  forceRepositoryFactory.reset();
}
