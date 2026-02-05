/**
 * Encounter Repository
 *
 * Data access layer for encounters stored in SQLite.
 * Handles CRUD operations for encounter configurations.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import {
  IEncounter,
  ICreateEncounterInput,
  IUpdateEncounterInput,
  IMapConfiguration,
  IVictoryCondition,
  IOpForConfig,
  IForceReference,
  EncounterStatus,
  TerrainPreset,
  SCENARIO_TEMPLATES,
  ScenarioTemplateType,
} from '@/types/encounter';

import { getSQLiteService } from '../persistence/SQLiteService';

// =============================================================================
// Database Row Types
// =============================================================================

interface EncounterRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  template: string | null;
  player_force_json: string | null;
  opponent_force_json: string | null;
  opfor_config_json: string | null;
  map_config_json: string;
  victory_conditions_json: string;
  optional_rules_json: string;
  game_session_id: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Result Types
// =============================================================================

export enum EncounterErrorCode {
  NotFound = 'NOT_FOUND',
  DuplicateName = 'DUPLICATE_NAME',
  ValidationError = 'VALIDATION_ERROR',
  DatabaseError = 'DATABASE_ERROR',
  InvalidStatus = 'INVALID_STATUS',
}

export interface IEncounterOperationResult {
  readonly success: boolean;
  readonly id?: string;
  readonly error?: string;
  readonly errorCode?: EncounterErrorCode;
}

// =============================================================================
// Repository Interface
// =============================================================================

export interface IEncounterRepository {
  initialize(): void;
  createEncounter(input: ICreateEncounterInput): IEncounterOperationResult;
  getEncounterById(id: string): IEncounter | null;
  getAllEncounters(): readonly IEncounter[];
  getEncountersByStatus(status: EncounterStatus): readonly IEncounter[];
  updateEncounter(
    id: string,
    input: IUpdateEncounterInput,
  ): IEncounterOperationResult;
  deleteEncounter(id: string): IEncounterOperationResult;
  setEncounterStatus(
    id: string,
    status: EncounterStatus,
  ): IEncounterOperationResult;
  linkGameSession(
    encounterId: string,
    gameSessionId: string,
  ): IEncounterOperationResult;
}

// =============================================================================
// Default Map Configuration
// =============================================================================

const DEFAULT_MAP_CONFIG: IMapConfiguration = {
  radius: 6,
  terrain: TerrainPreset.Clear,
  playerDeploymentZone: 'south',
  opponentDeploymentZone: 'north',
};

// =============================================================================
// Repository Implementation
// =============================================================================

export class EncounterRepository implements IEncounterRepository {
  private initialized = false;

  /**
   * Initialize database tables for encounters.
   */
  initialize(): void {
    if (this.initialized) return;

    const db = getSQLiteService().getDatabase();

    // Create encounters table
    db.exec(`
      CREATE TABLE IF NOT EXISTS encounters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        template TEXT,
        player_force_json TEXT,
        opponent_force_json TEXT,
        opfor_config_json TEXT,
        map_config_json TEXT NOT NULL,
        victory_conditions_json TEXT NOT NULL,
        optional_rules_json TEXT NOT NULL DEFAULT '[]',
        game_session_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create indexes
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status)`,
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_encounters_game_session ON encounters(game_session_id)`,
    );

    this.initialized = true;
  }

  // ===========================================================================
  // Encounter CRUD Operations
  // ===========================================================================

  /**
   * Create a new encounter.
   */
  createEncounter(input: ICreateEncounterInput): IEncounterOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const id = `encounter-${uuidv4()}`;
    const now = new Date().toISOString();

    try {
      // Get template defaults if specified
      let mapConfig = DEFAULT_MAP_CONFIG;
      let victoryConditions: readonly IVictoryCondition[] = [];

      if (input.template) {
        const template = SCENARIO_TEMPLATES.find(
          (t) => t.type === input.template,
        );
        if (template) {
          mapConfig = template.defaultMapConfig;
          victoryConditions = template.defaultVictoryConditions;
        }
      }

      const insertEncounter = db.prepare(`
        INSERT INTO encounters (
          id, name, description, status, template,
          player_force_json, opponent_force_json, opfor_config_json,
          map_config_json, victory_conditions_json, optional_rules_json,
          game_session_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertEncounter.run(
        id,
        input.name,
        input.description ?? null,
        EncounterStatus.Draft,
        input.template ?? null,
        null, // player_force_json
        null, // opponent_force_json
        null, // opfor_config_json
        JSON.stringify(mapConfig),
        JSON.stringify(victoryConditions),
        JSON.stringify([]),
        null, // game_session_id
        now,
        now,
      );

      return { success: true, id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        errorCode: EncounterErrorCode.DatabaseError,
      };
    }
  }

  /**
   * Get an encounter by ID.
   */
  getEncounterById(id: string): IEncounter | null {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const row = db.prepare('SELECT * FROM encounters WHERE id = ?').get(id) as
      | EncounterRow
      | undefined;

    if (!row) {
      return null;
    }

    return this.rowToEncounter(row);
  }

  /**
   * Get all encounters.
   */
  getAllEncounters(): readonly IEncounter[] {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM encounters ORDER BY updated_at DESC')
      .all() as EncounterRow[];

    return rows.map((row) => this.rowToEncounter(row));
  }

  /**
   * Get encounters by status.
   */
  getEncountersByStatus(status: EncounterStatus): readonly IEncounter[] {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare(
        'SELECT * FROM encounters WHERE status = ? ORDER BY updated_at DESC',
      )
      .all(status) as EncounterRow[];

    return rows.map((row) => this.rowToEncounter(row));
  }

  /**
   * Update an encounter.
   */
  updateEncounter(
    id: string,
    input: IUpdateEncounterInput,
  ): IEncounterOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    // Check encounter exists
    const existing = this.getEncounterById(id);
    if (!existing) {
      return {
        success: false,
        error: 'Encounter not found',
        errorCode: EncounterErrorCode.NotFound,
      };
    }

    // Cannot update launched or completed encounters
    if (
      existing.status === EncounterStatus.Launched ||
      existing.status === EncounterStatus.Completed
    ) {
      return {
        success: false,
        error: `Cannot update encounter in ${existing.status} status`,
        errorCode: EncounterErrorCode.InvalidStatus,
      };
    }

    try {
      const updates: string[] = ['updated_at = ?'];
      const params: (string | null)[] = [now];

      if (input.name !== undefined) {
        updates.push('name = ?');
        params.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push('description = ?');
        params.push(input.description ?? null);
      }
      if (input.playerForceId !== undefined) {
        // In a real implementation, we'd look up the force and build the reference
        // For now, we store just the ID and let the service layer hydrate it
        const forceRef: IForceReference | null = input.playerForceId
          ? {
              forceId: input.playerForceId,
              forceName: '', // Will be hydrated by service
              totalBV: 0,
              unitCount: 0,
            }
          : null;
        updates.push('player_force_json = ?');
        params.push(forceRef ? JSON.stringify(forceRef) : null);
      }
      if (input.opponentForceId !== undefined) {
        const forceRef: IForceReference | null = input.opponentForceId
          ? {
              forceId: input.opponentForceId,
              forceName: '',
              totalBV: 0,
              unitCount: 0,
            }
          : null;
        updates.push('opponent_force_json = ?');
        params.push(forceRef ? JSON.stringify(forceRef) : null);
      }
      if (input.opForConfig !== undefined) {
        updates.push('opfor_config_json = ?');
        params.push(
          input.opForConfig ? JSON.stringify(input.opForConfig) : null,
        );
      }
      if (input.mapConfig !== undefined) {
        // Merge with existing map config
        const newMapConfig = { ...existing.mapConfig, ...input.mapConfig };
        updates.push('map_config_json = ?');
        params.push(JSON.stringify(newMapConfig));
      }
      if (input.victoryConditions !== undefined) {
        updates.push('victory_conditions_json = ?');
        params.push(JSON.stringify(input.victoryConditions));
      }
      if (input.optionalRules !== undefined) {
        updates.push('optional_rules_json = ?');
        params.push(JSON.stringify(input.optionalRules));
      }

      params.push(id);

      db.prepare(
        `UPDATE encounters SET ${updates.join(', ')} WHERE id = ?`,
      ).run(...params);

      // Recalculate status
      this.recalculateStatus(id);

      return { success: true, id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        errorCode: EncounterErrorCode.DatabaseError,
      };
    }
  }

  /**
   * Delete an encounter.
   */
  deleteEncounter(id: string): IEncounterOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();

    // Check encounter exists
    const existing = this.getEncounterById(id);
    if (!existing) {
      return {
        success: false,
        error: 'Encounter not found',
        errorCode: EncounterErrorCode.NotFound,
      };
    }

    // Cannot delete launched encounters
    if (existing.status === EncounterStatus.Launched) {
      return {
        success: false,
        error: 'Cannot delete a launched encounter',
        errorCode: EncounterErrorCode.InvalidStatus,
      };
    }

    try {
      db.prepare('DELETE FROM encounters WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        errorCode: EncounterErrorCode.DatabaseError,
      };
    }
  }

  /**
   * Set encounter status.
   */
  setEncounterStatus(
    id: string,
    status: EncounterStatus,
  ): IEncounterOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    try {
      db.prepare(
        'UPDATE encounters SET status = ?, updated_at = ? WHERE id = ?',
      ).run(status, now, id);
      return { success: true, id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        errorCode: EncounterErrorCode.DatabaseError,
      };
    }
  }

  /**
   * Link a game session to an encounter.
   */
  linkGameSession(
    encounterId: string,
    gameSessionId: string,
  ): IEncounterOperationResult {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    try {
      db.prepare(
        'UPDATE encounters SET game_session_id = ?, status = ?, updated_at = ? WHERE id = ?',
      ).run(gameSessionId, EncounterStatus.Launched, now, encounterId);
      return { success: true, id: encounterId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
        errorCode: EncounterErrorCode.DatabaseError,
      };
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Recalculate encounter status based on configuration completeness.
   */
  private recalculateStatus(id: string): void {
    const encounter = this.getEncounterById(id);
    if (!encounter) return;

    // If already launched or completed, don't change
    if (
      encounter.status === EncounterStatus.Launched ||
      encounter.status === EncounterStatus.Completed
    ) {
      return;
    }

    // Check if ready: has player force, opponent (force or config), and victory conditions
    const hasPlayerForce = !!encounter.playerForce;
    const hasOpponent = !!encounter.opponentForce || !!encounter.opForConfig;
    const hasVictoryConditions =
      encounter.victoryConditions && encounter.victoryConditions.length > 0;

    const isReady = hasPlayerForce && hasOpponent && hasVictoryConditions;

    const newStatus = isReady ? EncounterStatus.Ready : EncounterStatus.Draft;

    if (newStatus !== encounter.status) {
      const db = getSQLiteService().getDatabase();
      const now = new Date().toISOString();
      db.prepare(
        'UPDATE encounters SET status = ?, updated_at = ? WHERE id = ?',
      ).run(newStatus, now, id);
    }
  }

  /**
   * Convert database row to encounter.
   */
  private rowToEncounter(row: EncounterRow): IEncounter {
    const playerForce = row.player_force_json
      ? (JSON.parse(row.player_force_json) as IForceReference)
      : undefined;
    const opponentForce = row.opponent_force_json
      ? (JSON.parse(row.opponent_force_json) as IForceReference)
      : undefined;
    const opForConfig = row.opfor_config_json
      ? (JSON.parse(row.opfor_config_json) as IOpForConfig)
      : undefined;
    const mapConfig = JSON.parse(row.map_config_json) as IMapConfiguration;
    const victoryConditions = JSON.parse(
      row.victory_conditions_json,
    ) as IVictoryCondition[];
    const optionalRules = JSON.parse(row.optional_rules_json) as string[];

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      status: row.status as EncounterStatus,
      template: row.template as ScenarioTemplateType | undefined,
      playerForce,
      opponentForce,
      opForConfig,
      mapConfig,
      victoryConditions,
      optionalRules,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      gameSessionId: row.game_session_id ?? undefined,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let repository: EncounterRepository | null = null;

export function getEncounterRepository(): EncounterRepository {
  if (!repository) {
    repository = new EncounterRepository();
  }
  return repository;
}
