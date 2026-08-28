/**
 * Hosting-server instance identity (design D2).
 *
 * `instanceId` names this process's durable host, not a campaign and
 * not a browser tab. It lives in a single-row SQLite table so it
 * survives restart and is not reminted on each campaign write.
 *
 * Why SQLite, not env or memory: the same `mekstation.db` already
 * owns campaign rows; a singleton row there stays aligned with the
 * store across process death. An in-memory uuid would change on
 * restart and break replica grants that pin `sourceInstanceId`.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 */

import type Database from 'better-sqlite3';

import { randomBytes } from 'node:crypto';

import { getSQLiteService } from '@/services/persistence/SQLiteService';

const HOST_ROW_ID = 1;

/**
 * Return this host's stable instance id, minting and persisting one
 * on first use. Subsequent calls, including after a simulated restart
 * against the same database file, return the same value.
 */
export function getOrCreateHostInstanceId(
  db: Database.Database = getSQLiteService().getDatabase(),
): string {
  const existing = readHostInstanceId(db);
  if (existing) {
    return existing;
  }
  const minted = mintHostInstanceId();
  db.prepare(
    `INSERT OR IGNORE INTO campaign_host_instance (id, instance_id)
     VALUES (?, ?)`,
  ).run(HOST_ROW_ID, minted);
  const stored = readHostInstanceId(db);
  if (!stored) {
    throw new Error('campaign host instance row missing after insert');
  }
  return stored;
}

/**
 * Read the singleton host instance id, or null when the row does not
 * exist yet (first boot before mint).
 */
function readHostInstanceId(db: Database.Database): string | null {
  const row = db
    .prepare(
      'SELECT instance_id AS instanceId FROM campaign_host_instance WHERE id = ?',
    )
    .get(HOST_ROW_ID) as { readonly instanceId: string } | undefined;
  return row?.instanceId ?? null;
}

/**
 * Mint a 32-hex host id from CSPRNG bytes. No clock is used so a
 * restart cannot correlate identity with boot time.
 */
function mintHostInstanceId(): string {
  return randomBytes(16).toString('hex');
}
