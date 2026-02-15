import { v4 as uuidv4 } from 'uuid';

import {
  ICreateForceRequest,
  IUpdateForceRequest,
  IUpdateAssignmentRequest,
  ForceStatus,
  ForcePosition,
  getDefaultSlotCount,
} from '@/types/force';

import { getSQLiteService } from '../persistence/SQLiteService';
import { ForceErrorCode, type IForceOperationResult } from './ForceRepository';
import {
  wouldCreateCycle,
  type AssignmentRow,
} from './ForceRepository.helpers';

export function createForceOperation(
  request: ICreateForceRequest,
): IForceOperationResult {
  const db = getSQLiteService().getDatabase();
  const id = `force-${uuidv4()}`;
  const now = new Date().toISOString();

  try {
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

    const slotCount = getDefaultSlotCount(request.forceType);
    const insertAssignment = db.prepare(`
      INSERT INTO force_assignments (id, force_id, pilot_id, unit_id, position, slot, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (let slot = 1; slot <= slotCount; slot++) {
      const assignmentId = `assign-${uuidv4()}`;
      const position = slot === 1 ? ForcePosition.Lead : ForcePosition.Member;
      insertAssignment.run(assignmentId, id, null, null, position, slot, null);
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

export function updateForceOperation(
  id: string,
  request: IUpdateForceRequest,
): IForceOperationResult {
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
      if (request.parentId !== null && wouldCreateCycle(id, request.parentId)) {
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

export function updateAssignmentOperation(
  assignmentId: string,
  request: IUpdateAssignmentRequest,
): IForceOperationResult {
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

export function swapAssignmentsOperation(
  assignmentId1: string,
  assignmentId2: string,
): IForceOperationResult {
  const db = getSQLiteService().getDatabase();

  try {
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
