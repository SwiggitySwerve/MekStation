/**
 * Pilot Repository
 *
 * Data access layer for pilots stored in SQLite.
 * Handles CRUD operations for persistent pilots.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import { v4 as uuidv4 } from 'uuid';
import { getSQLiteService } from '../persistence/SQLiteService';
import {
  IPilot,
  IPilotCareer,
  IPilotAbilityRef,
  IKillRecord,
  IMissionRecord,
  ICreatePilotOptions,
  PilotType,
  PilotStatus,
  DEFAULT_PILOT_SKILLS,
} from '@/types/pilot';

// =============================================================================
// Database Row Types
// =============================================================================

interface PilotRow {
  id: string;
  name: string;
  callsign: string | null;
  affiliation: string | null;
  portrait: string | null;
  background: string | null;
  type: string;
  status: string;
  gunnery: number;
  piloting: number;
  wounds: number;
  missions_completed: number;
  victories: number;
  defeats: number;
  draws: number;
  total_kills: number;
  xp: number;
  total_xp_earned: number;
  rank: string | null;
  created_at: string;
  updated_at: string;
}

interface PilotAbilityRow {
  id: string;
  pilot_id: string;
  ability_id: string;
  acquired_date: string;
  acquired_game_id: string | null;
}

interface PilotKillRow {
  id: string;
  pilot_id: string;
  target_id: string;
  target_name: string;
  weapon_used: string;
  kill_date: string;
  game_id: string;
}

interface PilotMissionRow {
  id: string;
  pilot_id: string;
  game_id: string;
  mission_name: string;
  mission_date: string;
  outcome: string;
  xp_earned: number;
  kills: number;
}

// =============================================================================
// Result Types
// =============================================================================

export enum PilotErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INSUFFICIENT_XP = 'INSUFFICIENT_XP',
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
  addAbility(pilotId: string, abilityId: string, gameId?: string): IPilotOperationResult;
  removeAbility(pilotId: string, abilityId: string): IPilotOperationResult;
  recordKill(pilotId: string, kill: Omit<IKillRecord, 'date'>): IPilotOperationResult;
  recordMission(pilotId: string, mission: Omit<IMissionRecord, 'date'>): IPilotOperationResult;
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
        now
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
        errorCode: PilotErrorCode.DATABASE_ERROR,
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
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }

    try {
      // Build dynamic update query
      const fields: string[] = [];
      const values: unknown[] = [];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.callsign !== undefined) {
        fields.push('callsign = ?');
        values.push(updates.callsign || null);
      }
      if (updates.affiliation !== undefined) {
        fields.push('affiliation = ?');
        values.push(updates.affiliation || null);
      }
      if (updates.portrait !== undefined) {
        fields.push('portrait = ?');
        values.push(updates.portrait || null);
      }
      if (updates.background !== undefined) {
        fields.push('background = ?');
        values.push(updates.background || null);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.skills !== undefined) {
        fields.push('gunnery = ?', 'piloting = ?');
        values.push(updates.skills.gunnery, updates.skills.piloting);
      }
      if (updates.wounds !== undefined) {
        fields.push('wounds = ?');
        values.push(updates.wounds);
      }

      if (fields.length === 0) {
        return { success: true, id };
      }

      fields.push('updated_at = ?');
      values.push(now);
      values.push(id);

      const sql = `UPDATE pilots SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(sql).run(...values);

      return { success: true, id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to update pilot: ${message}`,
        errorCode: PilotErrorCode.DATABASE_ERROR,
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
        errorCode: PilotErrorCode.NOT_FOUND,
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
        errorCode: PilotErrorCode.DATABASE_ERROR,
      };
    }
  }

  /**
   * Get a pilot by ID
   */
  getById(id: string): IPilot | null {
    const db = getSQLiteService().getDatabase();

    const row = db.prepare('SELECT * FROM pilots WHERE id = ?').get(id) as PilotRow | undefined;
    if (!row) return null;

    return this.rowToPilot(row);
  }

  /**
   * List all pilots
   */
  list(): readonly IPilot[] {
    const db = getSQLiteService().getDatabase();

    const rows = db.prepare('SELECT * FROM pilots ORDER BY name').all() as PilotRow[];
    return rows.map((row) => this.rowToPilot(row));
  }

  /**
   * List pilots by status
   */
  listByStatus(status: PilotStatus): readonly IPilot[] {
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM pilots WHERE status = ? ORDER BY name')
      .all(status) as PilotRow[];
    return rows.map((row) => this.rowToPilot(row));
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
   * Add an ability to a pilot
   */
  addAbility(pilotId: string, abilityId: string, gameId?: string): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    if (!this.exists(pilotId)) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }

    try {
      db.prepare(`
        INSERT INTO pilot_abilities (id, pilot_id, ability_id, acquired_date, acquired_game_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), pilotId, abilityId, now, gameId || null);

      return { success: true, id: pilotId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to add ability: ${message}`,
        errorCode: PilotErrorCode.DATABASE_ERROR,
      };
    }
  }

  /**
   * Remove an ability from a pilot
   */
  removeAbility(pilotId: string, abilityId: string): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();

    try {
      db.prepare('DELETE FROM pilot_abilities WHERE pilot_id = ? AND ability_id = ?').run(
        pilotId,
        abilityId
      );
      return { success: true, id: pilotId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to remove ability: ${message}`,
        errorCode: PilotErrorCode.DATABASE_ERROR,
      };
    }
  }

  /**
   * Record a kill for a pilot
   */
  recordKill(pilotId: string, kill: Omit<IKillRecord, 'date'>): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    if (!this.exists(pilotId)) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }

    try {
      // Insert kill record
      db.prepare(`
        INSERT INTO pilot_kills (id, pilot_id, target_id, target_name, weapon_used, kill_date, game_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), pilotId, kill.targetId, kill.targetName, kill.weaponUsed, now, kill.gameId);

      // Update total kills
      db.prepare(`
        UPDATE pilots SET total_kills = total_kills + 1, updated_at = ? WHERE id = ?
      `).run(now, pilotId);

      return { success: true, id: pilotId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to record kill: ${message}`,
        errorCode: PilotErrorCode.DATABASE_ERROR,
      };
    }
  }

  /**
   * Record a mission for a pilot
   */
  recordMission(
    pilotId: string,
    mission: Omit<IMissionRecord, 'date'>
  ): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    if (!this.exists(pilotId)) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }

    try {
      // Insert mission record
      db.prepare(`
        INSERT INTO pilot_missions (id, pilot_id, game_id, mission_name, mission_date, outcome, xp_earned, kills)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        pilotId,
        mission.gameId,
        mission.missionName,
        now,
        mission.outcome,
        mission.xpEarned,
        mission.kills
      );

      // Update career stats
      const outcomeField =
        mission.outcome === 'victory'
          ? 'victories'
          : mission.outcome === 'defeat'
            ? 'defeats'
            : 'draws';

      db.prepare(`
        UPDATE pilots SET 
          missions_completed = missions_completed + 1,
          ${outcomeField} = ${outcomeField} + 1,
          xp = xp + ?,
          total_xp_earned = total_xp_earned + ?,
          updated_at = ?
        WHERE id = ?
      `).run(mission.xpEarned, mission.xpEarned, now, pilotId);

      return { success: true, id: pilotId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to record mission: ${message}`,
        errorCode: PilotErrorCode.DATABASE_ERROR,
      };
    }
  }

  /**
   * Add XP to a pilot
   */
  addXp(pilotId: string, amount: number): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    if (!this.exists(pilotId)) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }

    try {
      db.prepare(`
        UPDATE pilots SET 
          xp = xp + ?,
          total_xp_earned = total_xp_earned + ?,
          updated_at = ?
        WHERE id = ?
      `).run(amount, amount, now, pilotId);

      return { success: true, id: pilotId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to add XP: ${message}`,
        errorCode: PilotErrorCode.DATABASE_ERROR,
      };
    }
  }

  /**
   * Spend XP from a pilot's pool
   */
  spendXp(pilotId: string, amount: number): IPilotOperationResult {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const pilot = this.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }

    if (!pilot.career || pilot.career.xp < amount) {
      return {
        success: false,
        error: `Insufficient XP. Have ${pilot.career?.xp || 0}, need ${amount}`,
        errorCode: PilotErrorCode.INSUFFICIENT_XP,
      };
    }

    try {
      db.prepare(`
        UPDATE pilots SET xp = xp - ?, updated_at = ? WHERE id = ?
      `).run(amount, now, pilotId);

      return { success: true, id: pilotId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to spend XP: ${message}`,
        errorCode: PilotErrorCode.DATABASE_ERROR,
      };
    }
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================

  /**
   * Convert a database row to an IPilot object
   */
  private rowToPilot(row: PilotRow): IPilot {
    const db = getSQLiteService().getDatabase();

    // Load abilities
    const abilityRows = db
      .prepare('SELECT * FROM pilot_abilities WHERE pilot_id = ?')
      .all(row.id) as PilotAbilityRow[];

    const abilities: IPilotAbilityRef[] = abilityRows.map((a) => ({
      abilityId: a.ability_id,
      acquiredDate: a.acquired_date,
      acquiredGameId: a.acquired_game_id || undefined,
    }));

    // Load career data for persistent pilots
    let career: IPilotCareer | undefined;
    if (row.type === PilotType.Persistent) {
      const killRows = db
        .prepare('SELECT * FROM pilot_kills WHERE pilot_id = ? ORDER BY kill_date DESC')
        .all(row.id) as PilotKillRow[];

      const missionRows = db
        .prepare('SELECT * FROM pilot_missions WHERE pilot_id = ? ORDER BY mission_date DESC')
        .all(row.id) as PilotMissionRow[];

      career = {
        missionsCompleted: row.missions_completed,
        victories: row.victories,
        defeats: row.defeats,
        draws: row.draws,
        totalKills: row.total_kills,
        killRecords: killRows.map((k) => ({
          targetId: k.target_id,
          targetName: k.target_name,
          weaponUsed: k.weapon_used,
          date: k.kill_date,
          gameId: k.game_id,
        })),
        missionHistory: missionRows.map((m) => ({
          gameId: m.game_id,
          missionName: m.mission_name,
          date: m.mission_date,
          outcome: m.outcome as 'victory' | 'defeat' | 'draw',
          xpEarned: m.xp_earned,
          kills: m.kills,
        })),
        xp: row.xp,
        totalXpEarned: row.total_xp_earned,
        rank: row.rank || 'MechWarrior',
      };
    }

    return {
      id: row.id,
      name: row.name,
      callsign: row.callsign || undefined,
      affiliation: row.affiliation || undefined,
      portrait: row.portrait || undefined,
      background: row.background || undefined,
      type: row.type as PilotType,
      status: row.status as PilotStatus,
      skills: {
        gunnery: row.gunnery,
        piloting: row.piloting,
      },
      wounds: row.wounds,
      career,
      abilities,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton instance
let pilotRepositoryInstance: PilotRepository | null = null;

/**
 * Get or create the PilotRepository singleton
 */
export function getPilotRepository(): PilotRepository {
  if (!pilotRepositoryInstance) {
    pilotRepositoryInstance = new PilotRepository();
  }
  return pilotRepositoryInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetPilotRepository(): void {
  pilotRepositoryInstance = null;
}
