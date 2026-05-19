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
 * Read a stored campaign envelope by id. Returns `null` if no record
 * exists.
 */
export function readCampaign(id: string): SerializedCampaign | null {
  const db = getSQLiteService().getDatabase();
  const row = db
    .prepare('SELECT payload FROM campaigns WHERE id = ?')
    .get(id) as ICampaignRow | undefined;
  if (!row) {
    return null;
  }
  return JSON.parse(row.payload) as SerializedCampaign;
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
    const existing = readCampaign(envelope.campaignId);
    const currentVersion = existing ? existing.version : 0;

    if (baseVersion !== currentVersion) {
      // Stale write — the client's baseVersion does not match the stored
      // record. Reject rather than overwrite (D5). For a brand-new
      // campaign `currentVersion` is 0, so a non-zero baseVersion that
      // has no record also conflicts (synthesizes a record so the client
      // can recover).
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

    db.prepare(
      `INSERT OR REPLACE INTO campaigns
         (id, version, schema_version, name, faction_id, current_date,
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
 */
export function listCampaignSummaries(): readonly ICampaignSummary[] {
  const db = getSQLiteService().getDatabase();
  const rows = db
    .prepare('SELECT payload FROM campaigns ORDER BY saved_at DESC')
    .all() as ICampaignRow[];
  return rows.map((row) =>
    toCampaignSummary(JSON.parse(row.payload) as SerializedCampaign),
  );
}
