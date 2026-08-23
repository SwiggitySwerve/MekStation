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
 * D2 command gate: mutations run only when the stored (or incoming
 * create) authority is `source`. Replica rows are refused with the same
 * `kind: 'refused'` vocabulary as the replica store. Unknown roles fail
 * closed. This function is the write chokepoint every PUT uses.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D5, D8)
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 */

import type { ICampaignSummary } from '@/types/campaign/SerializedCampaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import {
  evaluateSourceMutationGate,
  REPLICA_NOT_SOURCE_REFUSAL_REASON,
  sourceCampaignAuthority,
  UNKNOWN_AUTHORITY_ROLE_REASON,
} from '@/lib/campaign/authority/campaignAuthority';
import { hydrateCampaignRecord } from '@/lib/campaign/authority/campaignAuthorityHydrate';
import { getOrCreateHostInstanceId } from '@/lib/campaign/authority/campaignHostInstance';
import { toCampaignSummary } from '@/lib/campaign/persistence';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { logger } from '@/utils/logger';

export type CampaignSaveResult =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | { readonly kind: 'conflict'; readonly current: SerializedCampaign }
  | {
      readonly kind: 'refused';
      readonly reason: typeof REPLICA_NOT_SOURCE_REFUSAL_REASON;
    }
  | {
      readonly kind: 'failed';
      readonly reason: typeof UNKNOWN_AUTHORITY_ROLE_REASON;
    };

export type CampaignReadResult =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'corrupt'; readonly id: string }
  | {
      readonly kind: 'invalid_authority';
      readonly id: string;
      readonly reason: typeof UNKNOWN_AUTHORITY_ROLE_REASON;
    };

export type CampaignDeleteResult =
  | { readonly kind: 'ok' }
  | {
      readonly kind: 'refused';
      readonly reason: typeof REPLICA_NOT_SOURCE_REFUSAL_REASON;
    }
  | {
      readonly kind: 'failed';
      readonly reason: typeof UNKNOWN_AUTHORITY_ROLE_REASON;
    };

interface ICampaignRow {
  readonly payload: string;
}

/**
 * Read a stored campaign envelope by id. Migrates pre-D2 rows and
 * fails closed on an unknown authority role so GET never presents a
 * corrupt role as source.
 */
export function readCampaign(id: string): CampaignReadResult {
  const db = getSQLiteService().getDatabase();
  const row = db
    .prepare('SELECT payload FROM campaigns WHERE id = ?')
    .get(id) as ICampaignRow | undefined;
  if (!row) {
    return { kind: 'not_found' };
  }
  return parseStoredCampaignRow(id, row.payload);
}

/**
 * Persist a campaign envelope with optimistic concurrency and the D2
 * source-only write gate. Replica stored records are refused without
 * writing. Unknown roles fail closed. instanceId is the host singleton
 * on create and the stored value on update — never reminted per write.
 */
export function saveCampaign(
  envelope: SerializedCampaign,
  baseVersion: number,
): CampaignSaveResult {
  const db = getSQLiteService().getDatabase();
  const hostInstanceId = getOrCreateHostInstanceId(db);

  const tx = db.transaction((): CampaignSaveResult => {
    const row = db
      .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
      .get(envelope.campaignId) as
      | { version: number; payload: string }
      | undefined;
    const currentVersion = row ? row.version : 0;

    const prepared = prepareCampaignWrite({
      envelope,
      hostInstanceId,
      row,
    });
    if (prepared.kind !== 'ok') {
      return prepared;
    }

    if (baseVersion !== currentVersion) {
      return conflictFromStoredRow(row, prepared.record, hostInstanceId);
    }

    const nextVersion = baseVersion + 1;
    const stored: SerializedCampaign = {
      ...prepared.record,
      version: nextVersion,
    };

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
 * Remove a stored campaign record. Idempotent for missing rows. Replica
 * and unknown-authority rows are not deleted — those are mutations.
 */
export function deleteCampaign(id: string): CampaignDeleteResult {
  const db = getSQLiteService().getDatabase();
  const row = db
    .prepare('SELECT payload FROM campaigns WHERE id = ?')
    .get(id) as ICampaignRow | undefined;
  if (!row) {
    return { kind: 'ok' };
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(row.payload);
  } catch {
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    return { kind: 'ok' };
  }
  const hostInstanceId = getOrCreateHostInstanceId(db);
  const hydrated = hydrateCampaignRecord(parsedJson, hostInstanceId);
  if (hydrated.kind === 'failed') {
    return hydrated;
  }
  const gate = evaluateSourceMutationGate(hydrated.record.authority);
  if (gate.kind !== 'ok') {
    return gate;
  }
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
  return { kind: 'ok' };
}

/**
 * List every stored campaign as a lightweight `ICampaignSummary`.
 * Corrupt JSON and unknown-authority rows are skipped so one bad
 * payload cannot kill the list or appear as a source.
 */
export function listCampaignSummaries(): readonly ICampaignSummary[] {
  const db = getSQLiteService().getDatabase();
  const hostInstanceId = getOrCreateHostInstanceId(db);
  const rows = db
    .prepare('SELECT id, payload FROM campaigns ORDER BY saved_at DESC')
    .all() as Array<{ id: string; payload: string }>;

  const summaries: ICampaignSummary[] = [];
  for (const row of rows) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.payload);
    } catch {
      logger.warn(
        '[CampaignPersistence] skipping corrupt campaign row in list',
        { id: row.id },
      );
      continue;
    }
    const hydrated = hydrateCampaignRecord(parsed, hostInstanceId);
    if (hydrated.kind === 'failed') {
      logger.warn(
        '[CampaignPersistence] skipping unknown-authority campaign row in list',
        { id: row.id },
      );
      continue;
    }
    summaries.push(toCampaignSummary(hydrated.record));
  }
  return summaries;
}

/**
 * Parse one stored payload: JSON, migrate, authority. Used by GET.
 */
function parseStoredCampaignRow(
  id: string,
  payload: string,
): CampaignReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { kind: 'corrupt', id };
  }
  const hostInstanceId = getOrCreateHostInstanceId();
  const hydrated = hydrateCampaignRecord(parsed, hostInstanceId);
  if (hydrated.kind === 'failed') {
    return {
      kind: 'invalid_authority',
      id,
      reason: hydrated.reason,
    };
  }
  return { kind: 'ok', record: hydrated.record };
}

type PreparedWrite =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | {
      readonly kind: 'refused';
      readonly reason: typeof REPLICA_NOT_SOURCE_REFUSAL_REASON;
    }
  | {
      readonly kind: 'failed';
      readonly reason: typeof UNKNOWN_AUTHORITY_ROLE_REASON;
    };

/**
 * Hydrate incoming and stored envelopes, refuse replica mutation, and
 * pin instanceId/authority. Extracted so saveCampaign stays the CAS
 * writer rather than mixing identity rules with SQL.
 */
function prepareCampaignWrite(args: {
  readonly envelope: SerializedCampaign;
  readonly hostInstanceId: string;
  readonly row: { version: number; payload: string } | undefined;
}): PreparedWrite {
  const incoming = hydrateCampaignRecord(args.envelope, args.hostInstanceId);
  if (incoming.kind === 'failed') {
    return incoming;
  }
  const incomingGate = evaluateSourceMutationGate(incoming.record.authority);
  if (incomingGate.kind !== 'ok') {
    return incomingGate;
  }

  if (!args.row) {
    return {
      kind: 'ok',
      record: {
        ...incoming.record,
        instanceId: args.hostInstanceId,
        authority: sourceCampaignAuthority(),
      },
    };
  }

  let storedJson: unknown;
  try {
    storedJson = JSON.parse(args.row.payload);
  } catch {
    return {
      kind: 'ok',
      record: {
        ...incoming.record,
        instanceId: args.hostInstanceId,
        authority: sourceCampaignAuthority(),
      },
    };
  }

  const stored = hydrateCampaignRecord(storedJson, args.hostInstanceId);
  if (stored.kind === 'failed') {
    return stored;
  }
  const storedGate = evaluateSourceMutationGate(stored.record.authority);
  if (storedGate.kind !== 'ok') {
    return storedGate;
  }
  return {
    kind: 'ok',
    record: {
      ...incoming.record,
      instanceId: stored.record.instanceId,
      authority: stored.record.authority,
    },
  };
}

/**
 * Build a conflict result from the stored row. The current record is
 * the stored envelope, not the incoming write.
 */
function conflictFromStoredRow(
  row: { version: number; payload: string } | undefined,
  fallback: SerializedCampaign,
  hostInstanceId: string,
): CampaignSaveResult {
  if (!row) {
    return { kind: 'conflict', current: fallback };
  }
  let storedJson: unknown;
  try {
    storedJson = JSON.parse(row.payload);
  } catch {
    return { kind: 'conflict', current: { ...fallback, version: row.version } };
  }
  const stored = hydrateCampaignRecord(storedJson, hostInstanceId);
  if (stored.kind === 'failed') {
    return stored;
  }
  return { kind: 'conflict', current: stored.record };
}
