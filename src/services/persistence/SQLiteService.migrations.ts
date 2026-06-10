/**
 * SQLite migration catalog.
 *
 * Extracted from `SQLiteService.ts` so the service module stays under
 * the per-file line limit (mirrors the `SyncEngine.conflictResolution.ts`
 * split pattern). The runner in `SQLiteService.runMigration` applies each
 * entry inside a single transaction together with its migrations-table
 * record (audit 2026-06-09 W5.2).
 *
 * @spec openspec/specs/persistence-services/spec.md
 */

import Database from 'better-sqlite3';

/**
 * Migration definition. `up` is either a raw SQL script or a function —
 * functions are used by migrations that must inspect live schema state
 * (e.g. `pragma table_info` guards that make ALTERs idempotent, so a
 * half-applied migration can be re-run safely after a crash).
 */
export interface IMigration {
  readonly version: number;
  readonly name: string;
  readonly up: string | ((db: Database.Database) => void);
}

/**
 * Add a column only when it does not already exist. SQLite's
 * `ALTER TABLE ... ADD COLUMN` has no `IF NOT EXISTS` form, and a bare
 * re-run throws "duplicate column name" — which is exactly how a
 * half-applied migration (columns added, record write lost) used to
 * brick startup in a crash-loop (audit 2026-06-09 W5.2).
 */
function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  ddl: string,
): void {
  const cols = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
  if (cols.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

/**
 * Database migrations - run in order
 */
export const MIGRATIONS: readonly IMigration[] = [
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
  {
    version: 4,
    name: 'pilot_abilities_spa_designation',
    // SPA designation + xp accounting columns on pilot_abilities.
    // Phase 5 Wave 2a (add-pilot-spa-editor-integration). Wave 2b later
    // replaces designation_value with a typed payload — keep these
    // columns nullable so the upgrade can land without a data migration.
    // Each ALTER is guarded on table_info so a half-applied state
    // (columns exist, migrations record missing) re-runs cleanly instead
    // of crash-looping on "duplicate column name".
    up: (db: Database.Database): void => {
      addColumnIfMissing(
        db,
        'pilot_abilities',
        'designation_kind',
        'designation_kind TEXT',
      );
      addColumnIfMissing(
        db,
        'pilot_abilities',
        'designation_value',
        'designation_value TEXT',
      );
      // xp_spent stores the XP cost paid at acquisition so the panel can
      // refund the exact amount during the creation flow. Nullable for
      // pre-Wave-2a rows (no historical record of cost).
      addColumnIfMissing(db, 'pilot_abilities', 'xp_spent', 'xp_spent INTEGER');
    },
  },
  {
    version: 5,
    name: 'match_logs',
    up: `
      -- Per add-victory-and-post-battle-summary design D10: match log
      -- persistence. Stores the full IPostBattleReport JSON blob
      -- keyed by match id. Narrow column set — only fields we filter /
      -- order on get real types; the JSON payload is the source of
      -- truth for read.
      --
      -- Version field is denormalized as a column (cheap server-side
      -- filter) AND embedded in the JSON payload (read-time
      -- authority, re-validated on GET).
      CREATE TABLE IF NOT EXISTS match_logs (
        id          TEXT    PRIMARY KEY,        -- IPostBattleReport.matchId == IGameSession.id
        version     INTEGER NOT NULL,           -- POST_BATTLE_REPORT_VERSION literal (currently 1)
        winner      TEXT    NOT NULL,           -- 'player' | 'opponent' | 'draw'
        reason      TEXT    NOT NULL,           -- 'destruction' | 'concede' | 'turn_limit'
        turn_count  INTEGER NOT NULL,           -- IPostBattleReport.turnCount
        payload     TEXT    NOT NULL,           -- JSON-stringified IPostBattleReport
        created_at  INTEGER NOT NULL            -- Date.now() at insert (epoch ms)
      );

      -- created_at: match-history list view sorts by recency.
      -- version: operators upgrading across a future schema bump can
      --   query stale rows (SELECT id FROM match_logs WHERE version < ?)
      --   before running a migration.
      CREATE INDEX IF NOT EXISTS idx_match_logs_created_at ON match_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_match_logs_version    ON match_logs(version);
    `,
  },
  {
    version: 6,
    name: 'campaigns_schema',
    up: `
      -- Server-side campaign persistence per add-campaign-persistence
      -- design D8. Stores the full SerializedCampaign envelope JSON keyed
      -- by campaign id under a dedicated keyspace (its own table). The
      -- envelope's metadata fields are denormalized as columns for cheap
      -- server-side filtering and for the list endpoint's summary
      -- projection (D7) — the JSON payload remains the read authority.
      CREATE TABLE IF NOT EXISTS campaigns (
        id           TEXT    PRIMARY KEY,    -- SerializedCampaign.campaignId
        version      INTEGER NOT NULL,       -- monotonic write counter (D5)
        schema_version INTEGER NOT NULL,     -- SerializedCampaign.schemaVersion
        name         TEXT    NOT NULL,       -- body.name
        faction_id   TEXT    NOT NULL,       -- body.factionId
        current_date TEXT    NOT NULL,       -- body.currentDate (ISO 8601)
        balance      REAL    NOT NULL,       -- body.finances.balance (C-bills)
        saved_at     TEXT    NOT NULL,       -- SerializedCampaign.savedAt (ISO 8601)
        origin_device_id TEXT NOT NULL,      -- SerializedCampaign.originDeviceId
        payload      TEXT    NOT NULL        -- JSON-stringified SerializedCampaign
      );

      -- saved_at: campaign-list view sorts by recency.
      CREATE INDEX IF NOT EXISTS idx_campaigns_saved_at ON campaigns(saved_at);
    `,
  },
  {
    version: 7,
    name: 'campaigns_current_date_rename',
    // `current_date` is a SQLite builtin (CURRENT_DATE): a bare-column
    // reference parses as the keyword and returns TODAY, never the
    // stored value — silently shadowing the v6 column (audit 2026-06-09
    // W5.2; verified against better-sqlite3 / SQLite 3.51.1). Rename to
    // `campaign_date`. Guarded on table_info so the rename is
    // idempotent: fresh DBs that ran v6 get renamed, re-runs after a
    // lost migration record no-op.
    up: (db: Database.Database): void => {
      const cols = db.pragma('table_info(campaigns)') as Array<{
        name: string;
      }>;
      const hasOld = cols.some((c) => c.name === 'current_date');
      const hasNew = cols.some((c) => c.name === 'campaign_date');
      if (hasOld && !hasNew) {
        // Quote the old name — bare `current_date` would parse as the
        // builtin even inside ALTER ... RENAME COLUMN.
        db.exec(
          'ALTER TABLE campaigns RENAME COLUMN "current_date" TO campaign_date;',
        );
      }
    },
  },
];
