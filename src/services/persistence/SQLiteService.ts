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
  path: process.env.DATABASE_PATH || './data/mekstation.db',
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
  {
    version: 2,
    name: 'pilots_schema',
    up: `
      -- Pilots table
      CREATE TABLE IF NOT EXISTS pilots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        callsign TEXT,
        affiliation TEXT,
        portrait TEXT,
        background TEXT,
        type TEXT NOT NULL DEFAULT 'persistent',
        status TEXT NOT NULL DEFAULT 'active',
        gunnery INTEGER NOT NULL DEFAULT 4,
        piloting INTEGER NOT NULL DEFAULT 5,
        wounds INTEGER NOT NULL DEFAULT 0,
        missions_completed INTEGER NOT NULL DEFAULT 0,
        victories INTEGER NOT NULL DEFAULT 0,
        defeats INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0,
        total_kills INTEGER NOT NULL DEFAULT 0,
        xp INTEGER NOT NULL DEFAULT 0,
        total_xp_earned INTEGER NOT NULL DEFAULT 0,
        rank TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Pilot abilities junction table
      CREATE TABLE IF NOT EXISTS pilot_abilities (
        id TEXT PRIMARY KEY,
        pilot_id TEXT NOT NULL,
        ability_id TEXT NOT NULL,
        acquired_date TEXT NOT NULL,
        acquired_game_id TEXT,
        UNIQUE(pilot_id, ability_id),
        FOREIGN KEY (pilot_id) REFERENCES pilots(id) ON DELETE CASCADE
      );

      -- Pilot kill records
      CREATE TABLE IF NOT EXISTS pilot_kills (
        id TEXT PRIMARY KEY,
        pilot_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_name TEXT NOT NULL,
        weapon_used TEXT NOT NULL,
        kill_date TEXT NOT NULL,
        game_id TEXT NOT NULL,
        FOREIGN KEY (pilot_id) REFERENCES pilots(id) ON DELETE CASCADE
      );

      -- Pilot mission history
      CREATE TABLE IF NOT EXISTS pilot_missions (
        id TEXT PRIMARY KEY,
        pilot_id TEXT NOT NULL,
        game_id TEXT NOT NULL,
        mission_name TEXT NOT NULL,
        mission_date TEXT NOT NULL,
        outcome TEXT NOT NULL,
        xp_earned INTEGER NOT NULL DEFAULT 0,
        kills INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (pilot_id) REFERENCES pilots(id) ON DELETE CASCADE
      );

      -- Indexes for pilot queries
      CREATE INDEX IF NOT EXISTS idx_pilots_status ON pilots(status);
      CREATE INDEX IF NOT EXISTS idx_pilots_affiliation ON pilots(affiliation);
      CREATE INDEX IF NOT EXISTS idx_pilot_abilities_pilot_id ON pilot_abilities(pilot_id);
      CREATE INDEX IF NOT EXISTS idx_pilot_kills_pilot_id ON pilot_kills(pilot_id);
      CREATE INDEX IF NOT EXISTS idx_pilot_missions_pilot_id ON pilot_missions(pilot_id);
    `,
  },
  {
    version: 3,
    name: 'campaign_instances_schema',
    up: `
      -- Campaign unit instances table
      -- Tracks deployed units within campaigns with damage state
      CREATE TABLE IF NOT EXISTS campaign_unit_instances (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        vault_unit_id TEXT NOT NULL,
        vault_unit_version INTEGER NOT NULL,
        unit_name TEXT NOT NULL,
        unit_chassis TEXT NOT NULL,
        unit_variant TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'operational',
        damage_state TEXT NOT NULL,
        assigned_pilot_instance_id TEXT,
        force_id TEXT,
        force_slot INTEGER,
        total_kills INTEGER NOT NULL DEFAULT 0,
        missions_participated INTEGER NOT NULL DEFAULT 0,
        estimated_repair_cost INTEGER NOT NULL DEFAULT 0,
        estimated_repair_time INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (assigned_pilot_instance_id) REFERENCES campaign_pilot_instances(id) ON DELETE SET NULL
      );

      -- Campaign pilot instances table
      -- Tracks deployed pilots within campaigns with XP/wounds
      CREATE TABLE IF NOT EXISTS campaign_pilot_instances (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        vault_pilot_id TEXT,
        statblock_data TEXT,
        pilot_name TEXT NOT NULL,
        pilot_callsign TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        gunnery INTEGER NOT NULL DEFAULT 4,
        piloting INTEGER NOT NULL DEFAULT 5,
        wounds INTEGER NOT NULL DEFAULT 0,
        current_xp INTEGER NOT NULL DEFAULT 0,
        campaign_xp_earned INTEGER NOT NULL DEFAULT 0,
        kill_count INTEGER NOT NULL DEFAULT 0,
        missions_participated INTEGER NOT NULL DEFAULT 0,
        assigned_unit_instance_id TEXT,
        recovery_time INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (vault_pilot_id) REFERENCES pilots(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_unit_instance_id) REFERENCES campaign_unit_instances(id) ON DELETE SET NULL,
        -- Ensure XOR: either vault_pilot_id or statblock_data, not both or neither
        CHECK ((vault_pilot_id IS NOT NULL AND statblock_data IS NULL) OR (vault_pilot_id IS NULL AND statblock_data IS NOT NULL))
      );

      -- Indexes for campaign instance queries
      CREATE INDEX IF NOT EXISTS idx_unit_instances_campaign ON campaign_unit_instances(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_unit_instances_vault_unit ON campaign_unit_instances(vault_unit_id);
      CREATE INDEX IF NOT EXISTS idx_unit_instances_status ON campaign_unit_instances(status);
      CREATE INDEX IF NOT EXISTS idx_unit_instances_force ON campaign_unit_instances(force_id);
      CREATE INDEX IF NOT EXISTS idx_pilot_instances_campaign ON campaign_pilot_instances(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_pilot_instances_vault_pilot ON campaign_pilot_instances(vault_pilot_id);
      CREATE INDEX IF NOT EXISTS idx_pilot_instances_status ON campaign_pilot_instances(status);
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
      const tableExists = this.db
        .prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='migrations'
      `)
        .get();

      if (!tableExists) {
        return 0;
      }

      // Get max version
      const result = this.db
        .prepare(`
        SELECT MAX(version) as version FROM migrations
      `)
        .get() as { version: number | null } | undefined;

      return result?.version ?? 0;
    } catch (error) {
      console.error(
        '[SQLiteService] Failed to get current migration version:',
        error,
      );
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
      const existing = this.db
        .prepare(`
        SELECT 1 FROM migrations WHERE version = ?
      `)
        .get(migration.version);

      if (!existing) {
        this.db
          .prepare(`
          INSERT INTO migrations (version, name, applied_at)
          VALUES (?, ?, ?)
        `)
          .run(migration.version, migration.name, new Date().toISOString());
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
export function getSQLiteService(
  config?: Partial<IDatabaseConfig>,
): SQLiteService {
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
