import { v4 as uuidv4 } from 'uuid';

import type {
  ICreateEncounterInput,
  IEncounter,
  IUpdateEncounterInput,
} from '@/types/encounter';

import { EncounterStatus } from '@/types/encounter';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import { setEncounterCascadeHook } from '../forces/ForceRepository.cascade';
import { getSQLiteService } from '../persistence/SQLiteService';
import { encounterTransitionError } from './EncounterLifecycle';
import {
  buildEncounterUpdateParts,
  clearEncounterForceReferenceRows,
  extractRawForceIds,
  insertEncounterRow,
  recalculateEncounterStatus,
  rowToEncounter,
} from './EncounterRepository.helpers';
import {
  EncounterErrorCode,
  type IEncounterOperationResult,
  type IEncounterRepository,
  type IEncounterWithRawForceIds,
} from './EncounterRepository.types';

export { EncounterErrorCode };
export type {
  IEncounterOperationResult,
  IEncounterRepository,
  IEncounterWithRawForceIds,
} from './EncounterRepository.types';

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

export class EncounterRepository implements IEncounterRepository {
  private initialized = false;

  initialize = (): void => {
    if (this.initialized) return;
    const db = getSQLiteService().getDatabase();
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
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status)`,
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_encounters_game_session ON encounters(game_session_id)`,
    );
    this.initialized = true;
  };

  createEncounter = (
    input: ICreateEncounterInput,
  ): IEncounterOperationResult => {
    this.initialize();
    const id = `encounter-${uuidv4()}`;
    const now = new Date().toISOString();

    try {
      insertEncounterRow(input, id, now);
      return { success: true, id };
    } catch (error) {
      return this.databaseError(error);
    }
  };

  getEncounterById = (id: string): IEncounter | null => {
    const row = this.getRowById(id);
    return row ? rowToEncounter(row) : null;
  };

  getEncounterWithRawIds = (id: string): IEncounterWithRawForceIds | null => {
    const row = this.getRowById(id);
    return row ? extractRawForceIds(row) : null;
  };

  getAllEncounters = (): readonly IEncounter[] => {
    return this.getOrderedRows().map((row) => rowToEncounter(row));
  };

  getAllEncountersWithRawIds = (): readonly IEncounterWithRawForceIds[] => {
    return this.getOrderedRows().map((row) => extractRawForceIds(row));
  };

  getEncountersByStatus = (status: EncounterStatus): readonly IEncounter[] => {
    this.initialize();
    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare(
        'SELECT * FROM encounters WHERE status = ? ORDER BY updated_at DESC',
      )
      .all(status) as EncounterRow[];
    return rows.map((row) => rowToEncounter(row));
  };

  updateEncounter = (
    id: string,
    input: IUpdateEncounterInput,
  ): IEncounterOperationResult => {
    this.initialize();
    const existing = this.getEncounterById(id);
    if (!existing) {
      return this.notFound();
    }
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
      const now = new Date().toISOString();
      const { updates, params } = buildEncounterUpdateParts(
        existing,
        input,
        now,
      );
      params.push(id);
      const db = getSQLiteService().getDatabase();
      db.transaction(() => {
        db.prepare(
          `UPDATE encounters SET ${updates.join(', ')} WHERE id = ?`,
        ).run(...params);
        this.recalculateStatus(id);
      })();
      return { success: true, id };
    } catch (error) {
      return this.databaseError(error);
    }
  };

  deleteEncounter = (id: string): IEncounterOperationResult => {
    this.initialize();
    const existing = this.getEncounterById(id);
    if (!existing) return this.notFound();
    if (existing.status === EncounterStatus.Launched) {
      return {
        success: false,
        error: 'Cannot delete a launched encounter',
        errorCode: EncounterErrorCode.InvalidStatus,
      };
    }

    try {
      getSQLiteService()
        .getDatabase()
        .prepare('DELETE FROM encounters WHERE id = ?')
        .run(id);
      return { success: true };
    } catch (error) {
      return this.databaseError(error);
    }
  };

  setEncounterStatus = (
    id: string,
    status: EncounterStatus,
  ): IEncounterOperationResult => {
    if (
      status === EncounterStatus.Launched ||
      status === EncounterStatus.Completed
    ) {
      return this.invalidStatus(
        'Use session linking or completion for game status',
      );
    }
    return this.transitionStatus(id, status);
  };

  linkGameSession = (
    encounterId: string,
    gameSessionId: string,
  ): IEncounterOperationResult => {
    if (!gameSessionId.trim())
      return this.invalidStatus('Game session ID is required');
    return this.transitionStatus(
      encounterId,
      EncounterStatus.Launched,
      gameSessionId,
    );
  };

  completeEncounter = (
    encounterId: string,
    gameSessionId: string,
  ): IEncounterOperationResult => {
    if (!gameSessionId.trim())
      return this.invalidStatus('Game session ID is required');
    return this.transitionStatus(
      encounterId,
      EncounterStatus.Completed,
      gameSessionId,
    );
  };

  private transitionStatus(
    id: string,
    status: EncounterStatus,
    gameSessionId?: string,
    forceDeletion = false,
  ): IEncounterOperationResult {
    this.initialize();
    const db = getSQLiteService().getDatabase();
    try {
      return db.transaction((): IEncounterOperationResult => {
        const existing = this.getEncounterById(id);
        if (!existing) return this.notFound();
        const nextSessionId = gameSessionId ?? existing.gameSessionId;
        const error = encounterTransitionError(
          existing,
          status,
          nextSessionId,
          forceDeletion,
        );
        if (error) return this.invalidStatus(error);
        if (existing.status === status) return { success: true, id };
        const demoted =
          existing.status === EncounterStatus.Launched &&
          status === EncounterStatus.Draft;
        db.prepare(
          'UPDATE encounters SET status = ?, game_session_id = ?, updated_at = ? WHERE id = ?',
        ).run(
          status,
          demoted ? null : (nextSessionId ?? null),
          new Date().toISOString(),
          id,
        );
        return { success: true, id };
      })();
    } catch (error) {
      return this.databaseError(error);
    }
  }

  private invalidStatus(error: string): IEncounterOperationResult {
    return {
      success: false,
      error,
      errorCode: EncounterErrorCode.InvalidStatus,
    };
  }

  clearForceReference = (
    forceId: string,
  ): {
    affectedEncounterIds: readonly string[];
  } => {
    this.initialize();
    return clearEncounterForceReferenceRows(forceId, (id) =>
      this.recalculateStatus(id),
    );
  };

  private getRowById(id: string): EncounterRow | null {
    this.initialize();
    const row = getSQLiteService()
      .getDatabase()
      .prepare('SELECT * FROM encounters WHERE id = ?')
      .get(id) as EncounterRow | undefined;
    return row ?? null;
  }

  private getOrderedRows(): EncounterRow[] {
    this.initialize();
    return getSQLiteService()
      .getDatabase()
      .prepare('SELECT * FROM encounters ORDER BY updated_at DESC')
      .all() as EncounterRow[];
  }

  private recalculateStatus(id: string): void {
    recalculateEncounterStatus(
      id,
      (encounterId) => this.getEncounterById(encounterId),
      (encounterId, status) => {
        const result = this.transitionStatus(
          encounterId,
          status,
          undefined,
          true,
        );
        if (!result.success) throw new Error(result.error);
      },
    );
  }

  private notFound(): IEncounterOperationResult {
    return {
      success: false,
      error: 'Encounter not found',
      errorCode: EncounterErrorCode.NotFound,
    };
  }

  private databaseError(error: unknown): IEncounterOperationResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: EncounterErrorCode.DatabaseError,
    };
  }
}

const encounterRepositoryFactory: SingletonFactory<EncounterRepository> =
  createSingleton((): EncounterRepository => {
    const repo = new EncounterRepository();
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
