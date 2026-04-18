/**
 * Pilot Repository
 *
 * Data access layer for pilots stored in SQLite.
 * Handles CRUD operations for persistent pilots.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import {
  IPilot,
  IKillRecord,
  IMissionRecord,
  IPilotAbilityDesignation,
  ICreatePilotOptions,
  PilotStatus,
  DEFAULT_PILOT_SKILLS,
} from '@/types/pilot';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import { getSQLiteService } from '../persistence/SQLiteService';
import * as careerOps from './PilotRepository.career';
import { rowToPilot, type PilotRow } from './PilotRepository.helpers';
import { buildUpdateQuery } from './PilotRepository.queries';

// =============================================================================
// Result Types
// =============================================================================

export enum PilotErrorCode {
  NotFound = 'NOT_FOUND',
  DuplicateName = 'DUPLICATE_NAME',
  ValidationError = 'VALIDATION_ERROR',
  DatabaseError = 'DATABASE_ERROR',
  InsufficientXp = 'INSUFFICIENT_XP',
}

export interface IPilotOperationResult {
  readonly success: boolean;
  readonly id?: string;
  readonly error?: string;
  readonly errorCode?: PilotErrorCode;
}

// =============================================================================
// Repository Interface
// =============================================================================

export interface IPilotRepository {
  create(options: ICreatePilotOptions): IPilotOperationResult;
  update(id: string, updates: Partial<IPilot>): IPilotOperationResult;
  delete(id: string): IPilotOperationResult;
  getById(id: string): IPilot | null;
  list(): readonly IPilot[];
  listByStatus(status: PilotStatus): readonly IPilot[];
  exists(id: string): boolean;
  addAbility(
    pilotId: string,
    abilityId: string,
    gameId?: string,
    designation?: IPilotAbilityDesignation,
    xpSpent?: number,
  ): IPilotOperationResult;
  removeAbility(pilotId: string, abilityId: string): IPilotOperationResult;
  /**
   * Refund XP without inflating totalXpEarned. Used by the SPA editor
   * removal flow during pilot creation — the pilot earned the XP once,
   * and an undone purchase should not inflate the lifetime counter.
   */
  refundXp(pilotId: string, amount: number): IPilotOperationResult;
  recordKill(
    pilotId: string,
    kill: Omit<IKillRecord, 'date'>,
  ): IPilotOperationResult;
  recordMission(
    pilotId: string,
    mission: Omit<IMissionRecord, 'date'>,
  ): IPilotOperationResult;
  addXp(pilotId: string, amount: number): IPilotOperationResult;
  spendXp(pilotId: string, amount: number): IPilotOperationResult;
}

// =============================================================================
// Repository Implementation
// =============================================================================

export class PilotRepository implements IPilotRepository {
  /**
   * Create a new pilot
   */
  create(options: ICreatePilotOptions): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();
    const id = `pilot-${uuidv4()}`;

    const skills = options.skills || DEFAULT_PILOT_SKILLS;

    try {
      const insertPilot = db.prepare(`
        INSERT INTO pilots (
          id, name, callsign, affiliation, portrait, background,
          type, status, gunnery, piloting, wounds,
          missions_completed, victories, defeats, draws, total_kills,
          xp, total_xp_earned, rank, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertPilot.run(
        id,
        options.identity.name,
        options.identity.callsign || null,
        options.identity.affiliation || null,
        options.identity.portrait || null,
        options.identity.background || null,
        options.type,
        PilotStatus.Active,
        skills.gunnery,
        skills.piloting,
        0, // wounds
        0, // missions_completed
        0, // victories
        0, // defeats
        0, // draws
        0, // total_kills
        options.startingXp || 0,
        options.startingXp || 0,
        options.rank || null,
        now,
        now,
      );

      // Add initial abilities if provided
      if (options.abilityIds && options.abilityIds.length > 0) {
        const insertAbility = db.prepare(`
          INSERT INTO pilot_abilities (id, pilot_id, ability_id, acquired_date, acquired_game_id)
          VALUES (?, ?, ?, ?, NULL)
        `);

        for (const abilityId of options.abilityIds) {
          insertAbility.run(uuidv4(), id, abilityId, now);
        }
      }

      return { success: true, id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to create pilot: ${message}`,
        errorCode: PilotErrorCode.DatabaseError,
      };
    }
  }

  /**
   * Update an existing pilot
   */
  update(id: string, updates: Partial<IPilot>): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    if (!this.exists(id)) {
      return {
        success: false,
        error: `Pilot ${id} not found`,
        errorCode: PilotErrorCode.NotFound,
      };
    }

    try {
      const { fields, values } = buildUpdateQuery(updates, now);

      if (fields.length === 0) {
        return { success: true, id };
      }

      values.push(id);

      const sql = `UPDATE pilots SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(sql).run(...values);

      return { success: true, id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to update pilot: ${message}`,
        errorCode: PilotErrorCode.DatabaseError,
      };
    }
  }

  /**
   * Delete a pilot
   */
  delete(id: string): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();

    if (!this.exists(id)) {
      return {
        success: false,
        error: `Pilot ${id} not found`,
        errorCode: PilotErrorCode.NotFound,
      };
    }

    try {
      db.prepare('DELETE FROM pilots WHERE id = ?').run(id);
      return { success: true, id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to delete pilot: ${message}`,
        errorCode: PilotErrorCode.DatabaseError,
      };
    }
  }

  /**
   * Get a pilot by ID
   */
  getById(id: string): IPilot | null {
    const db = getSQLiteService().getDatabase();

    const row = db.prepare('SELECT * FROM pilots WHERE id = ?').get(id) as
      | PilotRow
      | undefined;
    if (!row) return null;

    return rowToPilot(row);
  }

  /**
   * List all pilots
   */
  list(): readonly IPilot[] {
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM pilots ORDER BY name')
      .all() as PilotRow[];
    return rows.map((row) => rowToPilot(row));
  }

  listByStatus(status: PilotStatus): readonly IPilot[] {
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM pilots WHERE status = ? ORDER BY name')
      .all(status) as PilotRow[];
    return rows.map((row) => rowToPilot(row));
  }

  /**
   * Check if a pilot exists
   */
  exists(id: string): boolean {
    const db = getSQLiteService().getDatabase();
    const result = db.prepare('SELECT 1 FROM pilots WHERE id = ?').get(id);
    return result !== undefined;
  }

  /**
   * Add an ability to a pilot. Phase 5 Wave 2a accepts an optional
   * designation payload + xpSpent so the editor can record the exact cost
   * paid (for refunds) and the option chosen (for record sheet display).
   */
  addAbility(
    pilotId: string,
    abilityId: string,
    gameId?: string,
    designation?: IPilotAbilityDesignation,
    xpSpent?: number,
  ): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    if (!this.exists(pilotId)) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NotFound,
      };
    }

    try {
      db.prepare(
        `
        INSERT INTO pilot_abilities (
          id, pilot_id, ability_id, acquired_date, acquired_game_id,
          designation_kind, designation_value, xp_spent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        uuidv4(),
        pilotId,
        abilityId,
        now,
        gameId || null,
        designation?.kind ?? null,
        designation?.value ?? null,
        xpSpent ?? null,
      );

      return { success: true, id: pilotId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to add ability: ${message}`,
        errorCode: PilotErrorCode.DatabaseError,
      };
    }
  }

  /**
   * Refund XP without inflating `total_xp_earned`. Mirror of `addXp` but
   * only touches the spendable pool — used by SPA removal during creation
   * so the pilot's lifetime XP counter stays honest.
   */
  refundXp(pilotId: string, amount: number): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    if (!this.exists(pilotId)) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NotFound,
      };
    }

    try {
      db.prepare(
        'UPDATE pilots SET xp = xp + ?, updated_at = ? WHERE id = ?',
      ).run(amount, now, pilotId);
      return { success: true, id: pilotId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to refund XP: ${message}`,
        errorCode: PilotErrorCode.DatabaseError,
      };
    }
  }

  /**
   * Remove an ability from a pilot
   */
  removeAbility(pilotId: string, abilityId: string): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();

    try {
      db.prepare(
        'DELETE FROM pilot_abilities WHERE pilot_id = ? AND ability_id = ?',
      ).run(pilotId, abilityId);
      return { success: true, id: pilotId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to remove ability: ${message}`,
        errorCode: PilotErrorCode.DatabaseError,
      };
    }
  }

  recordKill(
    pilotId: string,
    kill: Omit<IKillRecord, 'date'>,
  ): IPilotOperationResult {
    return careerOps.recordKill(pilotId, kill, this.exists.bind(this));
  }

  recordMission(
    pilotId: string,
    mission: Omit<IMissionRecord, 'date'>,
  ): IPilotOperationResult {
    return careerOps.recordMission(pilotId, mission, this.exists.bind(this));
  }

  addXp(pilotId: string, amount: number): IPilotOperationResult {
    return careerOps.addXp(pilotId, amount, this.exists.bind(this));
  }

  spendXp(pilotId: string, amount: number): IPilotOperationResult {
    return careerOps.spendXp(pilotId, amount, this.getById.bind(this));
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================
}

// Singleton instance
const pilotRepositoryFactory: SingletonFactory<PilotRepository> =
  createSingleton((): PilotRepository => new PilotRepository());

/**
 * Get or create the PilotRepository singleton
 */
export function getPilotRepository(): PilotRepository {
  return pilotRepositoryFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetPilotRepository(): void {
  pilotRepositoryFactory.reset();
}
