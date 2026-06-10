/**
 * Campaign Persistence Service
 *
 * Server-side store for `SerializedCampaign` envelopes. Per
 * `add-campaign-persistence` design D8 this persists through the shared
 * `mekstation.db` SQLite backend under a dedicated `campaigns` table
 * (its own keyspace) — no new database engine.
 *
 * Optimistic-concurrency stale-write guard (design D5): a `PUT` carries
 * the `baseVersion` the client last read. `saveCampaign` compares it to
 * the stored record's `version`; a mismatch returns a `conflict` result
 * carrying the current record rather than silently overwriting. A clean
 * write stores `version = baseVersion + 1`.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D5, D8)
 */

import type { ICampaignSummary } from '@/types/campaign/SerializedCampaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { toCampaignSummary } from '@/lib/campaign/persistence';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { logger } from '@/utils/logger';

// =============================================================================
// Result types
// =============================================================================

/**
 * Outcome of a `saveCampaign` call. A `conflict` carries the current
 * stored record so the API route can return it in the `409` body and the
 * client can offer keep-local / take-server.
 */
export type CampaignSaveResult =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | { readonly kind: 'conflict'; readonly current: SerializedCampaign };

/**
 * Read-side result discriminator, mirroring `MatchLogService`'s
 * `MatchLogReadResult` pattern (audit 2026-06-09 W5.2): a corrupt JSON
 * payload surfaces as an explicit tagged variant instead of an
 * unhandled `JSON.parse` throw that 500-crashed the API route.
 */
export type CampaignReadResult =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'corrupt'; readonly id: string };

// =============================================================================
// Row shape
// =============================================================================

interface ICampaignRow {
  readonly payload: string;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Read a stored campaign envelope by id. Returns a tagged union so the
 * API route can pick the right HTTP surface (404 for missing, explicit
 * 500 for a corrupt stored payload, 200 for ok) without exceptions
 * crossing the API boundary.
 */
export function readCampaign(id: string): CampaignReadResult {
  const db = getSQLiteService().getDatabase();
  const row = db
    .prepare('SELECT payload FROM campaigns WHERE id = ?')
    .get(id) as ICampaignRow | undefined;
  if (!row) {
    return { kind: 'not_found' };
  }
  try {
    return {
      kind: 'ok',
      record: JSON.parse(row.payload) as SerializedCampaign,
    };
  } catch {
    // Corrupt JSON in storage — explicit variant, never a throw.
    return { kind: 'corrupt', id };
  }
}

/**
 * Persist a campaign envelope with an optimistic-concurrency guard.
 *
 * `baseVersion` is the `version` the client last read. The stored
 * record's current `version` is the authority:
 *  - first write of a brand-new campaign: `baseVersion` MUST be `0`;
 *  - a clean update: `baseVersion` MUST equal the stored `version`;
 *  - any mismatch returns `kind: 'conflict'` with the current record.
 *
 * On a clean write the stored `version` becomes `baseVersion + 1` and the
 * returned record carries that incremented value (design D5). The
 * incoming envelope's own `version` field is ignored — the server is the
 * authority on the stored counter.
 */
export function saveCampaign(
  envelope: SerializedCampaign,
  baseVersion: number,
): CampaignSaveResult {
  const db = getSQLiteService().getDatabase();

  // The whole compare-and-set runs inside one transaction so a concurrent
  // writer cannot slip a write between the version check and the upsert.
  const tx = db.transaction((): CampaignSaveResult => {
    // The denormalized `version` COLUMN is the CAS authority — not the
    // JSON payload. This keeps a corrupt payload row repairable: the
    // client that knows the last version can overwrite it with a clean
    // envelope instead of being locked out by a parse failure.
    const row = db
      .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
      .get(envelope.campaignId) as
      | { version: number; payload: string }
      | undefined;
    const currentVersion = row ? row.version : 0;

    if (baseVersion !== currentVersion) {
      // Stale write — the client's baseVersion does not match the stored
      // record. Reject rather than overwrite (D5). For a brand-new
      // campaign `currentVersion` is 0, so a non-zero baseVersion that
      // has no record also conflicts. When the stored payload is missing
      // or corrupt, synthesize a record so the client can recover.
      let existing: SerializedCampaign | null = null;
      if (row) {
        try {
          existing = JSON.parse(row.payload) as SerializedCampaign;
        } catch {
          existing = null;
        }
      }
      const current: SerializedCampaign =
        existing ??
        ({
          ...envelope,
          version: currentVersion,
        } satisfies SerializedCampaign);
      return { kind: 'conflict', current };
    }

    const nextVersion = baseVersion + 1;
    const stored: SerializedCampaign = { ...envelope, version: nextVersion };

    // `campaign_date` (not `current_date`): the bare identifier
    // `current_date` parses as the SQLite CURRENT_DATE builtin and
    // shadows the column — renamed in migration v7 (audit W5.2).
    db.prepare(
      `INSERT OR REPLACE INTO campaigns
         (id, version, schema_version, name, faction_id, campaign_date,
          balance, saved_at, origin_device_id, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      stored.campaignId,
      stored.version,
      stored.schemaVersion,
      stored.body.name,
      stored.body.factionId,
      stored.body.currentDate,
      stored.body.finances.balance,
      stored.savedAt,
      stored.originDeviceId,
      JSON.stringify(stored),
    );

    return { kind: 'ok', record: stored };
  });

  return tx();
}

/**
 * Remove a stored campaign record. Idempotent — deleting a missing record
 * is a no-op. The local IndexedDB copy is a separate concern and is
 * unaffected.
 */
export function deleteCampaign(id: string): void {
  const db = getSQLiteService().getDatabase();
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
}

/**
 * List every stored campaign as a lightweight `ICampaignSummary` — no
 * full bodies (design D7). Ordered newest-saved first.
 *
 * Corrupt rows are skipped (with a warning) rather than thrown — one
 * bad payload must never kill the whole list endpoint (audit W5.2).
 */
export function listCampaignSummaries(): readonly ICampaignSummary[] {
  const db = getSQLiteService().getDatabase();
  const rows = db
    .prepare('SELECT id, payload FROM campaigns ORDER BY saved_at DESC')
    .all() as Array<{ id: string; payload: string }>;

  const summaries: ICampaignSummary[] = [];
  for (const row of rows) {
    let parsed: SerializedCampaign;
    try {
      parsed = JSON.parse(row.payload) as SerializedCampaign;
    } catch {
      logger.warn(
        '[CampaignPersistence] skipping corrupt campaign row in list',
        { id: row.id },
      );
      continue;
    }
    summaries.push(toCampaignSummary(parsed));
  }
  return summaries;
}
