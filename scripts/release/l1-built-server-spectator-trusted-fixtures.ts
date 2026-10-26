/**
 * L1-SMOKE-A2F trusted-state fixture for the built-server spectator proofs;
 * frozen, M and A2 import it read-only. It runs only through the harness
 * prepareOffline callback, after the owned server stopped:
 *   node --import tsx scripts/release/l1-built-server-spectator-trusted-fixtures.ts \
 *     --db=<abs> --stopped-pid=<pid> <ready|declared|prepare> --request=<json>
 * `ready` and `declared` are the A2FP witness plus the trusted state, read-only.
 * `prepare` rewrites only what no ordinary action reaches: one stale side
 * assignment, the co-op marker and one durable campaign-session gm row. The
 * ordinary state is proven first, the combat history must be byte-identical
 * afterwards, and no sealed declaration is ever written.
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';

import { readMatchMeta } from './l1-built-server-fixtures';
import {
  lineage,
  need,
  openWitnessDb,
  witness,
  WitnessRequest,
} from './l1-built-server-spectator-reachability';

export const TrustedRequest = WitnessRequest.extend({
  subjectId: z.string().min(1),
  activeSide: z.enum(['player', 'opponent']),
  audience: z.strictObject({
    id: z.string().min(1),
    brand: z.enum(['player', 'gm']),
    stale: z.boolean(),
    participant: z.boolean(),
  }),
});
type Request = z.infer<typeof TrustedRequest>;
type Op = 'ready' | 'declared';

/** Trusted state of the branded principal over the A2FP witness facts; read-only. */
export function inspect(
  db: Database.Database,
  req: Request,
  op: Op,
  trusted: boolean,
) {
  const facts = witness(db, op, {
    ...req,
    command: { ...req.command, trusted },
  });
  const meta = readMatchMeta(db, req.matchId);
  need(
    db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'campaign_session_participant'",
      )
      .get(),
    'participant table missing: the capability DB was never initialized',
  );
  const rows = db
    .prepare(
      'SELECT campaign_id AS campaignId, participant_id AS participantId, seat FROM campaign_session_participant WHERE session_id = ? AND revoked_at IS NULL',
    )
    .all(req.matchId) as {
    campaignId: string;
    participantId: string;
    seat: string;
  }[];
  const marker = meta.coopCampaign?.campaignId ?? null;
  // The product role rule: gm only for the durable gm row of the marked campaign.
  const gm = rows.some(
    (row) =>
      row.seat === 'gm' &&
      row.campaignId === marker &&
      row.participantId === req.subjectId,
  );
  return {
    facts,
    marker,
    rows: rows.length,
    brand: gm ? 'gm' : 'player',
    seatKinds: (meta.seats ?? [])
      .filter((seat) => seat.occupant?.playerId === req.subjectId)
      .map((seat) => seat.kind),
    assignments: meta.sideAssignments.filter(
      (a) => a.playerId === req.subjectId,
    ).length,
    // The product reads the FIRST assignment of a side as that side's owner.
    staleEffective:
      meta.sideAssignments.find((a) => a.side === req.activeSide)?.playerId ===
      req.subjectId,
  };
}

const EMPTY_STATE = {
  day: 0,
  balance: 0,
  rosterUnits: {},
  pilots: {},
  contracts: {},
  factionStanding: {},
  salvagePool: 0,
};

/** One transaction: ordinary state in, trusted state out, combat history unchanged. */
export function prepare(db: Database.Database, req: Request) {
  const { audience: want, subjectId, matchId } = req;
  return db.transaction(() => {
    const op: Op = req.command.intentId ? 'declared' : 'ready';
    const before = inspect(db, req, op, false);
    const anchor = req.command.ready;
    need(
      op === 'declared' ||
        (anchor?.count === before.facts.eventCount &&
          anchor.sha256 === before.facts.eventsSha256),
      'history moved since the ready witness',
    );
    need(
      before.brand === 'player' && before.marker === null && before.rows === 0,
      'trusted state already present',
    );
    need(
      before.seatKinds.join() === (want.participant ? 'human' : 'spectator'),
      'subject seat kind does not match the audience',
    );
    need(
      want.participant
        ? subjectId !== before.facts.active.playerId
        : subjectId === req.watcherId && before.assignments === 0,
      'subject is not the idle participant or the unassigned watcher',
    );
    const meta = readMatchMeta(db, matchId);
    const campaignId = `fixture-brand-${matchId}`;
    const next: IMatchMeta = {
      ...meta,
      sideAssignments: want.stale
        ? [
            { playerId: subjectId, side: req.activeSide },
            ...meta.sideAssignments,
          ]
        : meta.sideAssignments,
      ...(want.brand === 'gm'
        ? {
            coopCampaign: { campaignId, state: { campaignId, ...EMPTY_STATE } },
          }
        : {}),
    };
    db.prepare('UPDATE mp_matches SET meta_json = ? WHERE match_id = ?').run(
      JSON.stringify(next),
      matchId,
    );
    if (want.brand === 'gm') {
      db.prepare(
        "INSERT INTO campaign_session_participant (campaign_id, session_id, participant_id, seat, bound_at, revoked_at) VALUES (?, ?, ?, 'gm', ?, NULL)",
      ).run(campaignId, matchId, subjectId, new Date().toISOString());
    }
    const after = inspect(db, req, op, true);
    need(
      after.facts.eventsSha256 === before.facts.eventsSha256,
      'combat history changed',
    );
    need(after.brand === want.brand, 'brand not established by a gm row');
    need(
      after.staleEffective === want.stale,
      'stale assignment would not be the product owner of the active side',
    );
    return { before, after, eventsUnchanged: true };
  })();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const argv = process.argv.slice(2);
  const arg = (name: string) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const op = argv.find((a) => !a.startsWith('--'));
  need(
    op === 'ready' || op === 'declared' || op === 'prepare',
    `unknown op ${op}`,
  );
  const req = TrustedRequest.parse(JSON.parse(arg('request') ?? ''));
  const dbPath = arg('db') ?? '';
  const before = lineage(dbPath);
  openWitnessDb(dbPath, Number(arg('stopped-pid')), req.expectedDb).close();
  const db = new Database(dbPath, {
    fileMustExist: true,
    readonly: op !== 'prepare',
  });
  try {
    if (op !== 'prepare') db.pragma('query_only = ON');
    const result =
      op === 'prepare' ? prepare(db, req) : inspect(db, req, op, true);
    db.close();
    need(op === 'prepare' || lineage(dbPath) === before, 'DB lineage changed');
    console.log(JSON.stringify({ op, ...result, lineage: before }));
  } finally {
    if (db.open) db.close();
  }
}
