/**
 * Force Repository
 *
 * Data access layer for forces stored in SQLite.
 * Handles CRUD operations for forces and assignments.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import { v4 as uuidv4 } from 'uuid';

import {
  IForce,
  IAssignment,
  IForceStats,
  ICreateForceRequest,
  IUpdateForceRequest,
  IUpdateAssignmentRequest,
  ForceType,
  ForceStatus,
  ForcePosition,
  getDefaultSlotCount,
} from '@/types/force';

import { getSQLiteService } from '../persistence/SQLiteService';

// =============================================================================
// Database Row Types
// =============================================================================

interface ForceRow {
  id: string;
  name: string;
  force_type: string;
  status: string;
  affiliation: string | null;
  parent_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface AssignmentRow {
  id: string;
  force_id: string;
  pilot_id: string | null;
  unit_id: string | null;
  position: string;
  slot: number;
  notes: string | null;
}

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

  /**
   * Create a new force.
   */
  createForce(request: ICreateForceRequest): IForceOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const id = `force-${uuidv4()}`;
    const now = new Date().toISOString();

    try {
      // Insert force
      const insertForce = db.prepare(`
        INSERT INTO forces (id, name, force_type, status, affiliation, parent_id, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertForce.run(
        id,
        request.name,
        request.forceType,
        ForceStatus.Active,
        request.affiliation ?? null,
        request.parentId ?? null,
        request.description ?? null,
        now,
        now,
      );

      // Create empty assignments for the force type
      const slotCount = getDefaultSlotCount(request.forceType);
      const insertAssignment = db.prepare(`
        INSERT INTO force_assignments (id, force_id, pilot_id, unit_id, position, slot, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (let slot = 1; slot <= slotCount; slot++) {
        const assignmentId = `assign-${uuidv4()}`;
        const position = slot === 1 ? ForcePosition.Lead : ForcePosition.Member;
        insertAssignment.run(
          assignmentId,
          id,
          null,
          null,
          position,
          slot,
          null,
        );
      }

      return { success: true, id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        errorCode: ForceErrorCode.DatabaseError,
      };
    }
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

    return this.hydrateForce(row);
  }

  /**
   * Get all forces.
   */
  getAllForces(): readonly IForce[] {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM forces ORDER BY created_at DESC')
      .all() as ForceRow[];

    return rows.map((row) => this.hydrateForce(row));
  }

  /**
   * Get root forces (no parent).
   */
  getRootForces(): readonly IForce[] {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM forces WHERE parent_id IS NULL ORDER BY name')
      .all() as ForceRow[];

    return rows.map((row) => this.hydrateForce(row));
  }

  /**
   * Get child forces of a parent.
   */
  getChildForces(parentId: string): readonly IForce[] {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM forces WHERE parent_id = ? ORDER BY name')
      .all(parentId) as ForceRow[];

    return rows.map((row) => this.hydrateForce(row));
  }

  /**
   * Update a force.
   */
  updateForce(id: string, request: IUpdateForceRequest): IForceOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    try {
      const updates: string[] = ['updated_at = ?'];
      const params: (string | null)[] = [now];

      if (request.name !== undefined) {
        updates.push('name = ?');
        params.push(request.name);
      }
      if (request.forceType !== undefined) {
        updates.push('force_type = ?');
        params.push(request.forceType);
      }
      if (request.status !== undefined) {
        updates.push('status = ?');
        params.push(request.status);
      }
      if (request.affiliation !== undefined) {
        updates.push('affiliation = ?');
        params.push(request.affiliation ?? null);
      }
      if (request.parentId !== undefined) {
        // Check for circular hierarchy
        if (
          request.parentId !== null &&
          this.wouldCreateCycle(id, request.parentId)
        ) {
          return {
            success: false,
            error: 'Cannot set parent: would create circular hierarchy',
            errorCode: ForceErrorCode.CircularHierarchy,
          };
        }
        updates.push('parent_id = ?');
        params.push(request.parentId ?? null);
      }
      if (request.description !== undefined) {
        updates.push('description = ?');
        params.push(request.description ?? null);
      }

      params.push(id);

      db.prepare(`UPDATE forces SET ${updates.join(', ')} WHERE id = ?`).run(
        ...params,
      );

      return { success: true, id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        errorCode: ForceErrorCode.DatabaseError,
      };
    }
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

  /**
   * Get assignments for a force.
   */
  private getAssignments(forceId: string): IAssignment[] {
    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare(
        'SELECT * FROM force_assignments WHERE force_id = ? ORDER BY slot',
      )
      .all(forceId) as AssignmentRow[];

    return rows.map(this.rowToAssignment);
  }

  /**
   * Update an assignment.
   */
  updateAssignment(
    assignmentId: string,
    request: IUpdateAssignmentRequest,
  ): IForceOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();

    try {
      const updates: string[] = [];
      const params: (string | null)[] = [];

      if (request.pilotId !== undefined) {
        updates.push('pilot_id = ?');
        params.push(request.pilotId);
      }
      if (request.unitId !== undefined) {
        updates.push('unit_id = ?');
        params.push(request.unitId);
      }
      if (request.position !== undefined) {
        updates.push('position = ?');
        params.push(request.position);
      }
      if (request.notes !== undefined) {
        updates.push('notes = ?');
        params.push(request.notes ?? null);
      }

      if (updates.length === 0) {
        return {
          success: false,
          error: 'No updates provided',
          errorCode: ForceErrorCode.ValidationError,
        };
      }

      params.push(assignmentId);

      db.prepare(
        `UPDATE force_assignments SET ${updates.join(', ')} WHERE id = ?`,
      ).run(...params);

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

  /**
   * Swap two assignments within a force.
   */
  swapAssignments(
    assignmentId1: string,
    assignmentId2: string,
  ): IForceOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();

    try {
      // Get both assignments
      const a1 = db
        .prepare('SELECT * FROM force_assignments WHERE id = ?')
        .get(assignmentId1) as AssignmentRow | undefined;
      const a2 = db
        .prepare('SELECT * FROM force_assignments WHERE id = ?')
        .get(assignmentId2) as AssignmentRow | undefined;

      if (!a1 || !a2) {
        return {
          success: false,
          error: 'Both assignments must exist',
          errorCode: ForceErrorCode.NotFound,
        };
      }

      // Swap pilot and unit IDs
      const update = db.prepare(
        'UPDATE force_assignments SET pilot_id = ?, unit_id = ? WHERE id = ?',
      );
      update.run(a2.pilot_id, a2.unit_id, a1.id);
      update.run(a1.pilot_id, a1.unit_id, a2.id);

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

  /**
   * Check if setting a parent would create a cycle.
   */
  private wouldCreateCycle(forceId: string, newParentId: string): boolean {
    const db = getSQLiteService().getDatabase();
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === forceId) {
        return true;
      }
      const parent = db
        .prepare('SELECT parent_id FROM forces WHERE id = ?')
        .get(currentId) as { parent_id: string | null } | undefined;
      currentId = parent?.parent_id ?? null;
    }

    return false;
  }

  /**
   * Hydrate a force from database row.
   */
  private hydrateForce(row: ForceRow): IForce {
    const db = getSQLiteService().getDatabase();

    const assignments = this.getAssignments(row.id);
    const childRows = db
      .prepare('SELECT id FROM forces WHERE parent_id = ?')
      .all(row.id) as Array<{ id: string }>;
    const childIds = childRows.map((r) => r.id);
    const stats = this.calculateStats(assignments);

    return {
      id: row.id,
      name: row.name,
      forceType: row.force_type as ForceType,
      status: row.status as ForceStatus,
      affiliation: row.affiliation ?? undefined,
      parentId: row.parent_id ?? undefined,
      childIds,
      assignments,
      stats,
      description: row.description ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Calculate force statistics.
   */
  private calculateStats(assignments: IAssignment[]): IForceStats {
    // TODO: Integrate with actual unit and pilot data for BV/tonnage calculations

    const assignedPilots = assignments.filter((a) => a.pilotId !== null).length;
    const assignedUnits = assignments.filter((a) => a.unitId !== null).length;
    const emptySlots = assignments.filter(
      (a) => a.pilotId === null && a.unitId === null,
    ).length;

    return {
      totalBV: 0,
      totalTonnage: 0,
      assignedPilots,
      assignedUnits,
      emptySlots,
      averageSkill: null,
    };
  }

  /**
   * Convert database row to assignment.
   */
  private rowToAssignment(row: AssignmentRow): IAssignment {
    return {
      id: row.id,
      pilotId: row.pilot_id,
      unitId: row.unit_id,
      position: row.position as ForcePosition,
      slot: row.slot,
      notes: row.notes ?? undefined,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let repository: ForceRepository | null = null;

export function getForceRepository(): ForceRepository {
  if (!repository) {
    repository = new ForceRepository();
  }
  return repository;
}
