/**
 * L1-SMOKE-B offline private-DB fixture: stores one active match as fog-on for the
 * built-server refusal rows. Runs only through the harness prepareOffline callback
 * after the owned production server stopped:
 *   node --import tsx scripts/release/l1-built-server-fog-fixtures.ts --db=<abs> --stopped-pid=<pid> flip --match=<id>
 * The single write is meta_json.config.fogOfWar false -> true on an unchanged active
 * match; the event journal is fingerprinted before and after and must not move.
 * Production offers no fog-on projection and no flip API, so this is the only way to
 * give a refused match real stored journal facts to withhold.
 */
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  openStoppedDb,
  readMatchMeta,
  type OfflineDb,
} from './l1-built-server-fixtures';

const sha = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Every stored event row of the match, fingerprinted without assuming its columns. */
const journal = (db: OfflineDb, matchId: string) => {
  const rows = db
    .prepare(
      'SELECT * FROM mp_match_events WHERE match_id = ? ORDER BY sequence',
    )
    .all(matchId);
  return { count: rows.length, sha256: sha(rows) };
};

export interface IFlipResult {
  op: string;
  matchId: string;
  fogOfWar: { before: boolean; after: boolean };
  metaSha256: { before: string; after: string };
  events: { count: number; sha256: string };
}

export function flipFog(
  dbPath: string,
  stoppedPid: number,
  matchId: string,
): IFlipResult {
  const guard = openStoppedDb(dbPath, stoppedPid);
  const before = readMatchMeta(guard, matchId);
  const eventsBefore = journal(guard, matchId);
  guard.close();
  if (before.status !== 'active' || before.config.fogOfWar !== false) {
    throw new Error(`fixture: match ${matchId} is not an active fog-off match`);
  }
  const db = new Database(dbPath, { fileMustExist: true });
  try {
    const after = { ...before, config: { ...before.config, fogOfWar: true } };
    const update = db.prepare(
      'UPDATE mp_matches SET meta_json = ? WHERE match_id = ?',
    );
    if (update.run(JSON.stringify(after), matchId).changes !== 1)
      throw new Error('fixture: flip did not update exactly one match');
    const stored = readMatchMeta(db, matchId);
    const eventsAfter = journal(db, matchId);
    if (
      sha({ ...stored, config: { ...stored.config, fogOfWar: false } }) !==
        sha(before) ||
      stored.config.fogOfWar !== true
    ) {
      throw new Error('fixture: flip changed more than config.fogOfWar');
    }
    if (eventsAfter.sha256 !== eventsBefore.sha256)
      throw new Error('fixture: flip touched the event journal');
    return {
      op: 'flip',
      matchId,
      fogOfWar: { before: false, after: true },
      metaSha256: { before: sha(before), after: sha(stored) },
      events: eventsAfter,
    };
  } finally {
    db.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const argv = process.argv.slice(2);
  const arg = (name: string) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (!argv.includes('flip')) throw new Error('fixture: unknown op');
  console.log(
    JSON.stringify(
      flipFog(arg('db') ?? '', Number(arg('stopped-pid')), arg('match') ?? ''),
    ),
  );
}
