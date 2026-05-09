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
  IForceReference,
  EncounterStatus,
  TerrainPreset,
  SCENARIO_TEMPLATES,
} from '@/types/encounter';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import { setEncounterCascadeHook } from '../forces/ForceRepository.cascade';
import { getSQLiteService } from '../persistence/SQLiteService';
import {
  extractRawForceIds,
  rowToEncounter,
} from './EncounterRepository.helpers';

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

/**
 * Encounter paired with the raw force-id strings stored in the row.
 *
 * The raw ids are needed by callers that distinguish between "no force ever
 * stored" (rawForceId is null) and "force was stored but the referenced row
 * is gone" (rawForceId is non-null but the hydrated `playerForce` resolves
 * to undefined / null). The cleanup-broken-encounters script and the
 * encounter list page broken-pill UI both consume this shape.
 */
export interface IEncounterWithRawForceIds {
  readonly encounter: IEncounter;
  readonly rawForceIds: {
    readonly playerForceId: string | null;
    readonly opponentForceId: string | null;
  };
}

// =============================================================================
// Repository Interface
// =============================================================================

export interface IEncounterRepository {
  initialize(): void;
  createEncounter(input: ICreateEncounterInput): IEncounterOperationResult;
  getEncounterById(id: string): IEncounter | null;
  getEncounterWithRawIds(id: string): IEncounterWithRawForceIds | null;
  getAllEncounters(): readonly IEncounter[];
  getAllEncountersWithRawIds(): readonly IEncounterWithRawForceIds[];
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
  clearForceReference(forceId: string): {
    affectedEncounterIds: readonly string[];
  };
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

    return rowToEncounter(row);
  }

  /**
   * Get an encounter by ID paired with its raw stored force-id strings.
   *
   * Singular sibling of `getAllEncountersWithRawIds`. Used by the detail-page
   * API route (and the encounter detail UI) to detect "the row stores a
   * forceId but the force is gone" without a second round-trip to the DB.
   *
   * Returns null when no row matches `id`.
   */
  getEncounterWithRawIds(id: string): IEncounterWithRawForceIds | null {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const row = db.prepare('SELECT * FROM encounters WHERE id = ?').get(id) as
      | EncounterRow
      | undefined;

    if (!row) {
      return null;
    }

    return extractRawForceIds(row);
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

    return rows.map((row) => rowToEncounter(row));
  }

  /**
   * Get every encounter alongside its raw stored force-id strings.
   *
   * The hydrated `IEncounter.playerForce` only contains a forceId when the
   * referenced force exists; if it was deleted the hydrated value is empty
   * (today: zero-name ref; after hydration repair: null/undefined). To detect
   * "the row stores a forceId but the force is gone" the caller needs the
   * raw stored ids — that's what this method exposes.
   *
   * Used by:
   *   - scripts/cleanup-broken-encounters.ts (classify orphaned-force-reference)
   *   - the encounter list page (broken-pill rendering)
   */
  getAllEncountersWithRawIds(): readonly IEncounterWithRawForceIds[] {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT * FROM encounters ORDER BY updated_at DESC')
      .all() as EncounterRow[];

    return rows.map((row) => extractRawForceIds(row));
  }

  getEncountersByStatus(status: EncounterStatus): readonly IEncounter[] {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare(
        'SELECT * FROM encounters WHERE status = ? ORDER BY updated_at DESC',
      )
      .all(status) as EncounterRow[];

    return rows.map((row) => rowToEncounter(row));
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
  // Force-Deletion Cascade
  // ===========================================================================

  /**
   * NULL the dangling force reference on every encounter that points to
   * `forceId`, then recompute each affected encounter's status. Wraps both
   * UPDATE statements (player + opponent slot) AND the per-row recompute in
   * one SQLite transaction so partial failures roll back atomically.
   *
   * Called by ForceRepository.deleteForce via the cascade hook BEFORE the
   * `DELETE FROM forces` statement. The whole sequence — cascade + force
   * delete — runs inside the outer transaction the cascade hook wraps so
   * a thrown UPDATE rolls the force-row delete back too.
   *
   * @param forceId — the force being deleted
   * @returns the encounter ids that had at least one slot cleared
   *
   * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
   *       (Requirement: Force-Deletion Cascade to Encounter References)
   */
  clearForceReference(forceId: string): {
    affectedEncounterIds: readonly string[];
  } {
    this.initialize();

    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    // Collect affected encounter ids BEFORE the UPDATE so we know which rows
    // to recompute status on. The two queries are cheap (indexed on id, scan
    // on json_extract is fine for the encounter table size).
    const playerSlotMatches = db
      .prepare(
        `SELECT id FROM encounters
         WHERE json_extract(player_force_json, '$.forceId') = ?`,
      )
      .all(forceId) as { id: string }[];
    const opponentSlotMatches = db
      .prepare(
        `SELECT id FROM encounters
         WHERE json_extract(opponent_force_json, '$.forceId') = ?`,
      )
      .all(forceId) as { id: string }[];

    const affectedSet = new Set<string>();
    for (const row of playerSlotMatches) affectedSet.add(row.id);
    for (const row of opponentSlotMatches) affectedSet.add(row.id);

    if (affectedSet.size === 0) {
      // No-op cascade — still return cleanly so the outer transaction commits.
      return { affectedEncounterIds: [] };
    }

    // Convert to a stable array — Set iteration order is insertion-order in
    // V8 but explicit array avoids the downlevelIteration TS flag dance.
    const affectedIds: readonly string[] = Array.from(affectedSet);

    // Both UPDATEs + the recompute pass run in one transaction. The caller
    // (ForceRepository.deleteForce) wraps THIS call PLUS the force-row delete
    // in its own outer transaction; better-sqlite3 treats nested
    // `db.transaction(...)` as savepoints so the inner failure rolls the
    // outer back via re-throw.
    const txn = db.transaction((fid: string) => {
      db.prepare(
        `UPDATE encounters
         SET player_force_json = NULL, updated_at = ?
         WHERE json_extract(player_force_json, '$.forceId') = ?`,
      ).run(now, fid);
      db.prepare(
        `UPDATE encounters
         SET opponent_force_json = NULL, updated_at = ?
         WHERE json_extract(opponent_force_json, '$.forceId') = ?`,
      ).run(now, fid);

      for (const id of affectedIds) {
        this.recalculateStatus(id);
      }
    });

    txn(forceId);

    return { affectedEncounterIds: affectedIds };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Recalculate encounter status based on configuration completeness.
   *
   * NOTE — Launched/Completed widening: prior to PR 2 (repair-broken-encounter-
   * drafts) this method short-circuited unconditionally for Launched and
   * Completed encounters. The cascade now needs to drop a Launched encounter
   * back to Draft when a force-delete just cleared its only player force —
   * otherwise a Launched encounter would point at a NULL playerForce and
   * launch attempts (or detail-page loads) would render an inconsistent
   * state. The widening is narrow:
   *
   *   - Launched + playerForce === null + opponentForce === null  →  Draft
   *   - Completed                                                 →  unchanged (history)
   *   - All other Launched cases                                  →  unchanged
   *
   * Completed never gets demoted: the encounter ran, history matters more
   * than current force state.
   */
  private recalculateStatus(id: string): void {
    const encounter = this.getEncounterById(id);
    if (!encounter) return;

    // Completed encounters NEVER get their status modified — history is fixed.
    if (encounter.status === EncounterStatus.Completed) {
      return;
    }

    // Launched encounter whose only player force was cleared by a cascade
    // drops back to Draft. Spec scenario: "Single encounter affected" — the
    // Launched encounter pointing at the deleted force ends up Draft.
    if (encounter.status === EncounterStatus.Launched) {
      const bothForcesCleared =
        !encounter.playerForce && !encounter.opponentForce;
      if (bothForcesCleared) {
        const db = getSQLiteService().getDatabase();
        const now = new Date().toISOString();
        db.prepare(
          'UPDATE encounters SET status = ?, updated_at = ? WHERE id = ?',
        ).run(EncounterStatus.Draft, now, id);
      }
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
}

// =============================================================================
// Singleton Instance
// =============================================================================

const encounterRepositoryFactory: SingletonFactory<EncounterRepository> =
  createSingleton((): EncounterRepository => {
    const repo = new EncounterRepository();
    // Wire the force-delete cascade hook so ForceRepository.deleteForce
    // NULLs every encounter slot pointing at the deleted force BEFORE the
    // force row is deleted. The hook registration is idempotent — if a
    // previous repo instance was disposed, this overwrites the dangling
    // reference cleanly.
    setEncounterCascadeHook((forceId: string) => {
      repo.clearForceReference(forceId);
    });
    return repo;
  });

export function getEncounterRepository(): EncounterRepository {
  return encounterRepositoryFactory.get();
}

export function resetEncounterRepository(): void {
  encounterRepositoryFactory.reset();
}
