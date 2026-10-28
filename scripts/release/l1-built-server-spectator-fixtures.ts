/**
 * L1-SMOKE-A2 read-only private-DB witnesses for the co-op restart row. Run only
 * through the harness prepareOffline callback after the owned server stopped:
 *   node --import tsx scripts/release/l1-built-server-spectator-fixtures.ts --db=<abs> --stopped-pid=<pid> active --match=<id>
 *   node --import tsx scripts/release/l1-built-server-spectator-fixtures.ts --db=<abs> --stopped-pid=<pid> event --match=<id> --id=<eventId>
 * `active` reads the product's own activation order and names the player-owned
 * active unit with one legal step; `event` returns one stored event's captured
 * rolls and intent id. Neither writes.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { IGameEvent } from '@/types/gameplay';

import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { getActivePhaseUnitId } from '@/utils/gameplay/gameSessionActivation';
import { hexDistance } from '@/utils/gameplay/hexMath';

import {
  openStoppedDb,
  readMatchMeta,
  type OfflineDb,
} from './l1-built-server-fixtures';

const STEPS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];
function history(db: OfflineDb, matchId: string): IGameEvent[] {
  const rows = db
    .prepare(
      'SELECT event_json FROM mp_match_events WHERE match_id = ? ORDER BY sequence',
    )
    .pluck()
    .all(matchId) as string[];
  return rows.map((row) => JSON.parse(row) as IGameEvent);
}

export function active(
  db: OfflineDb,
  matchId: string,
): Record<string, unknown> {
  const meta = readMatchMeta(db, matchId);
  const session = hydrateGameSessionFromEvents(matchId, history(db, matchId));
  const { phase, units } = session.currentState;
  const unit = units[getActivePhaseUnitId(session) ?? ''];
  const owner = meta.unitBootstrap?.find(
    (entry) => entry.unitId === unit?.id,
  )?.ownerPlayerId;
  if (!unit || !owner || phase !== 'movement')
    throw new Error(
      `witness: no player-owned active unit in movement (${phase})`,
    );
  const foes = Object.values(units).filter((other) => other.side !== unit.side);
  const near = (q: number, r: number) =>
    Math.min(...foes.map((foe) => hexDistance({ q, r }, foe.position)));
  const [dq, dr] = STEPS.reduce((best, step) =>
    near(unit.position.q + step[0], unit.position.r + step[1]) <
    near(unit.position.q + best[0], unit.position.r + best[1])
      ? step
      : best,
  );
  return {
    op: 'active',
    unitId: unit.id,
    ownerPlayerId: owner,
    phase,
    facing: unit.facing,
    to: { q: unit.position.q + dq, r: unit.position.r + dr },
  };
}

export function event(
  db: OfflineDb,
  matchId: string,
  id: string,
): Record<string, unknown> {
  const events = history(db, matchId);
  const found = events.filter((e) => e.id === id);
  if (found.length !== 1)
    throw new Error(`witness: event ${id} stored ${found.length} times`);
  const payload = found[0].payload as { rolls?: number[]; intentId?: string };
  return {
    op: 'event',
    sequence: found[0].sequence,
    type: found[0].type,
    rolls: payload.rolls ?? null,
    intentId: payload.intentId ?? null,
    eventCount: events.length,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const argv = process.argv.slice(2);
  const arg = (name: string) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
  const db = openStoppedDb(arg('db'), Number(arg('stopped-pid')));
  try {
    db.pragma('query_only = ON');
    const op = argv.find((a) => !a.startsWith('--'));
    if (op !== 'active' && op !== 'event')
      throw new Error(`witness: unknown op ${op}`);
    console.log(
      JSON.stringify(
        op === 'active'
          ? active(db, arg('match'))
          : event(db, arg('match'), arg('id')),
      ),
    );
  } finally {
    db.close();
  }
}
