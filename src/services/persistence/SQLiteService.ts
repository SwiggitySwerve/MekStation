/**
 * SQLite Database Service
 * 
 * Provides SQLite database initialization and connection management.
 * Supports both Electron desktop and self-hosted web deployments.
 * 
 * @spec openspec/specs/persistence-services/spec.md
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Database configuration
 */
export interface IDatabaseConfig {
  readonly path: string;
  readonly maxVersionHistory: number;
}

/**
 * Migration definition
 */
export interface IMigration {
  readonly version: number;
  readonly name: string;
  readonly up: string;
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
  path: process.env.DATABASE_PATH || './data/battletech.db',
  maxVersionHistory: parseInt(process.env.MAX_VERSION_HISTORY || '50', 10),
};

/**
 * Database migrations - run in order
 */
const MIGRATIONS: readonly IMigration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      -- Custom units table (current version)
      CREATE TABLE IF NOT EXISTS custom_units (
        id TEXT PRIMARY KEY,
        chassis TEXT NOT NULL,
        variant TEXT NOT NULL,
        tonnage INTEGER NOT NULL,
        tech_base TEXT NOT NULL,
        era TEXT NOT NULL,
        rules_level TEXT NOT NULL,
        unit_type TEXT NOT NULL DEFAULT 'BattleMech',
        data TEXT NOT NULL,
        current_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(chassis, variant)
      );

      -- Version history table
      CREATE TABLE IF NOT EXISTS unit_versions (
        id TEXT PRIMARY KEY,
        unit_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        saved_at TEXT NOT NULL,
        notes TEXT,
        revert_source INTEGER,
        UNIQUE(unit_id, version),
        FOREIGN KEY (unit_id) REFERENCES custom_units(id) ON DELETE CASCADE
      );

      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_custom_units_chassis ON custom_units(chassis);
      CREATE INDEX IF NOT EXISTS idx_custom_units_tech_base ON custom_units(tech_base);
      CREATE INDEX IF NOT EXISTS idx_custom_units_era ON custom_units(era);
      CREATE INDEX IF NOT EXISTS idx_unit_versions_unit_id ON unit_versions(unit_id);
      CREATE INDEX IF NOT EXISTS idx_unit_versions_version ON unit_versions(unit_id, version);

      -- Migrations tracking table
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `,
  },
];

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
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='migrations'
      `).get();

      if (!tableExists) {
        return 0;
      }

      // Get max version
      const result = this.db.prepare(`
        SELECT MAX(version) as version FROM migrations
      `).get() as { version: number | null } | undefined;

      return result?.version ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Run a single migration
   */
  private runMigration(migration: IMigration): void {
    if (!this.db) return;

    console.log(`Running migration ${migration.version}: ${migration.name}`);

    // Execute migration SQL
    this.db.exec(migration.up);

    // Record migration after tables are created
    try {
      // Check if this migration is already recorded
      const existing = this.db.prepare(`
        SELECT 1 FROM migrations WHERE version = ?
      `).get(migration.version);

      if (!existing) {
        this.db.prepare(`
          INSERT INTO migrations (version, name, applied_at)
          VALUES (?, ?, ?)
        `).run(migration.version, migration.name, new Date().toISOString());
      }
    } catch (err) {
      console.warn(`Could not record migration ${migration.version}:`, err);
    }

    console.log(`Migration ${migration.version} complete`);
  }
}

// Singleton instance
let sqliteServiceInstance: SQLiteService | null = null;

/**
 * Get or create the SQLite service singleton
 */
export function getSQLiteService(config?: Partial<IDatabaseConfig>): SQLiteService {
  if (!sqliteServiceInstance) {
    sqliteServiceInstance = new SQLiteService(config);
  }
  return sqliteServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetSQLiteService(): void {
  if (sqliteServiceInstance) {
    sqliteServiceInstance.close();
    sqliteServiceInstance = null;
  }
}

export { DEFAULT_CONFIG as DATABASE_CONFIG };

