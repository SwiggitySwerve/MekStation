/**
 * L1-SMOKE-A1 offline private-DB fixture tool; frozen, A2/B import read-only. Runs only through the
 * harness prepareOffline callback after the owned production server stopped:
 *   node --import tsx scripts/release/l1-built-server-fixtures.ts --db=<abs> --stopped-pid=<pid> lineage [--match=<id>]
 * Standalone SQL over the production mp_matches/mp_match_events schema with production types only.
 */
import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type OfflineDb = Database.Database;
const alive = (pid: number) => { try { return process.kill(pid, 0); } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; } };
/** Open the private DB only when it exists and the server PID that owned it is gone. */
export function openStoppedDb(dbPath: string, stoppedPid: number): OfflineDb {
  if (!path.isAbsolute(dbPath) || !fs.existsSync(dbPath)) throw new Error(`fixture: private DB missing: ${dbPath}`);
  if (!(stoppedPid > 0) || alive(stoppedPid)) throw new Error(`fixture: owning server pid ${stoppedPid} is not stopped`);
  return new Database(dbPath, { fileMustExist: true, readonly: true });
}
export function readMatchMeta(db: OfflineDb, matchId: string): IMatchMeta {
  const row = db.prepare('SELECT meta_json FROM mp_matches WHERE match_id = ?').get(matchId) as { meta_json: string } | undefined;
  if (!row) throw new Error(`fixture: match ${matchId} not in private DB`);
  return JSON.parse(row.meta_json) as IMatchMeta;
}
/** Read-only lineage: schema tables, then per match its trusted seats, assignments and event counts. */
export function lineage(db: OfflineDb, matchId?: string): { journalMode: unknown; tables: string[]; matches: object[] } {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").pluck().all() as string[];
  const ids = (db.prepare('SELECT match_id FROM mp_matches ORDER BY created_at').pluck().all() as string[]).filter((id) => !matchId || id === matchId);
  const count = db.prepare('SELECT COUNT(*) AS eventCount, MAX(sequence) AS maxSequence FROM mp_match_events WHERE match_id = ?');
  const matches = ids.map((id) => {
    const { status, config, playerIds, sideAssignments, seats = [] } = readMatchMeta(db, id);
    const seatRows = seats.map((seat) => ({ slotId: seat.slotId, kind: seat.kind, occupant: seat.occupant?.playerId ?? null }));
    return { matchId: id, status, fogOfWar: config.fogOfWar, playerIds, sideAssignments, seats: seatRows, ...(count.get(id) as object) };
  });
  return { journalMode: db.pragma('journal_mode', { simple: true }), tables, matches };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const arg = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const op = argv.find((a) => !a.startsWith('--'));
  if (op !== 'lineage') throw new Error(`fixture: unknown op ${op}`);
  const db = openStoppedDb(arg('db') ?? '', Number(arg('stopped-pid')));
  try { db.pragma('query_only = ON'); console.log(JSON.stringify({ op, ...lineage(db, arg('match')) })); } finally { db.close(); }
}