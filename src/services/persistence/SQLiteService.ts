/**
 * SQLite Database Service
 *
 * Provides SQLite database initialization and connection management.
 * Supports both Electron desktop and self-hosted web deployments.
 *
 * @spec openspec/specs/persistence-services/spec.md
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

import { logger } from '@/utils/logger';

import { createSingleton } from '../core/createSingleton';
import { MIGRATIONS, type IMigration } from './SQLiteService.migrations';

export type { IMigration } from './SQLiteService.migrations';

/**
 * Database configuration
 */
export interface IDatabaseConfig {
  readonly path: string;
  readonly maxVersionHistory: number;
}

/**
 * SQLite Service interface
 */
export interface ISQLiteService {
  initialize(): void;
  getDatabase(): Database.Database;
  close(): void;
  isInitialized(): boolean;
}

/**
 * Default database configuration
 */
const DEFAULT_CONFIG: IDatabaseConfig = {
  path: process.env.DATABASE_PATH || './data/mekstation.db',
  maxVersionHistory: parseInt(process.env.MAX_VERSION_HISTORY || '50', 10),
};

/**
 * SQLite Service implementation
 */
export class SQLiteService implements ISQLiteService {
  private db: Database.Database | null = null;
  private config: IDatabaseConfig;

  constructor(config: Partial<IDatabaseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the database
   */
  initialize(): void {
    if (this.db) {
      return; // Already initialized
    }

    // Ensure directory exists
    const dbDir = path.dirname(this.config.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.config.path);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Run migrations
    this.runMigrations();
  }

  /**
   * Get the database instance
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      // Checkpoint WAL before closing
      this.db.pragma('wal_checkpoint(TRUNCATE)');
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get database configuration
   */
  getConfig(): IDatabaseConfig {
    return this.config;
  }

  /**
   * Run pending migrations
   */
  private runMigrations(): void {
    if (!this.db) return;

    // Get current migration version
    const currentVersion = this.getCurrentMigrationVersion();

    // Run pending migrations
    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion) {
        this.runMigration(migration);
      }
    }
  }

  /**
   * Get current migration version
   */
  private getCurrentMigrationVersion(): number {
    if (!this.db) return 0;

    try {
      // Check if migrations table exists
      const tableExists = this.db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='migrations'
      `,
        )
        .get();

      if (!tableExists) {
        return 0;
      }

      // Get max version
      const result = this.db
        .prepare(
          `
        SELECT MAX(version) as version FROM migrations
      `,
        )
        .get() as { version: number | null } | undefined;

      return result?.version ?? 0;
    } catch (error) {
      logger.error(
        '[SQLiteService] Failed to get current migration version:',
        error,
      );
      return 0;
    }
  }

  /**
   * Run a single migration. The schema change AND its migrations-table
   * record commit atomically in one transaction (audit 2026-06-09 W5.2):
   * the old runner exec'd outside any transaction and swallowed
   * record-write failures, so a crash or failed INSERT left the schema
   * applied but unrecorded — the next startup re-ran the migration and
   * (for non-idempotent ALTERs) crash-looped. Any failure here now
   * rolls back the whole migration and propagates to the caller.
   */
  private runMigration(migration: IMigration): void {
    if (!this.db) return;
    const db = this.db;

    logger.debug(`Running migration ${migration.version}: ${migration.name}`);

    const apply = db.transaction((): void => {
      // Execute the migration body — raw SQL script or schema-aware
      // function (used by idempotent-ALTER migrations like v4 / v7).
      if (typeof migration.up === 'string') {
        db.exec(migration.up);
      } else {
        migration.up(db);
      }

      // Record the migration in the same transaction. A failure here
      // (e.g. corrupted migrations table) rolls the schema change back
      // and throws — never swallow it: a silently-unrecorded migration
      // re-runs on every startup forever.
      db.prepare(
        `
          INSERT INTO migrations (version, name, applied_at)
          VALUES (?, ?, ?)
        `,
      ).run(migration.version, migration.name, new Date().toISOString());
    });

    apply();

    logger.debug(`Migration ${migration.version} complete`);
  }
}

let _sqliteConfig: Partial<IDatabaseConfig> | undefined;

const sqliteServiceFactory = createSingleton(
  (): SQLiteService => new SQLiteService(_sqliteConfig),
  (instance) => instance.close(),
);

/**
 * Get or create the SQLite service singleton
 */
export function getSQLiteService(
  config?: Partial<IDatabaseConfig>,
): SQLiteService {
  if (config) {
    _sqliteConfig = config;
  }
  return sqliteServiceFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetSQLiteService(): void {
  sqliteServiceFactory.reset();
}

export { DEFAULT_CONFIG as DATABASE_CONFIG };
