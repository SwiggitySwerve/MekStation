/**
 * L1-SMOKE-A2FP read-only private-DB witness for phase, unit and declaration
 * reachability. It runs only through the harness prepareOffline callback,
 * after the owned server stopped:
 *   node --import tsx scripts/release/l1-built-server-spectator-reachability.ts \
 *     --db=<abs> --stopped-pid=<pid> <ready|declared> --request=<json>
 * The A1 stopped-DB guard opens the file read-only. This module validates the
 * request structurally, refuses a foreign, redirected or live DB and any
 * unexpected metadata, unit, position, phase, weapon, lock or intent state,
 * and proves the DB bytes unchanged. It grants no trusted mutation.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

import type { IGameEvent } from '@/types/gameplay';

import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { createMatchWireSealedChoiceAudienceContext } from '@/lib/multiplayer/server/projection/MatchWireSealedChoices';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { GameEventType, GamePhase, LockState } from '@/types/gameplay';
import { IntentPayloadSchema } from '@/types/multiplayer/Protocol';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { getActivePhaseUnitId } from '@/utils/gameplay/gameSessionActivation';
import { hexDistance } from '@/utils/gameplay/hexMath';

import {
  openStoppedDb,
  readMatchMeta,
  type OfflineDb,
} from './l1-built-server-fixtures';

const pid = z.string().regex(/^pid_[1-9A-HJ-NP-Za-km-z]{20,}$/);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const unit = z.strictObject({
  unitId: z.string().min(1),
  unitRef: z.string().min(1),
  side: z.enum(['player', 'opponent']),
});
export const WitnessRequest = z.strictObject({
  matchId: z.string().uuid(),
  expectedDb: z.string().min(1),
  hostId: pid,
  guestId: pid,
  watcherId: pid,
  unitBootstrap: z.array(unit).length(2),
  command: z.strictObject({
    kind: z.enum(['Move', 'Attack', 'Physical']),
    phase: z.nativeEnum(GamePhase),
    type: z.nativeEnum(GameEventType),
    intent: IntentPayloadSchema.optional(),
    intentId: z.string().min(1).optional(),
    ready: z
      .strictObject({ count: z.number().int().positive(), sha256: digest })
      .optional(),
    trusted: z.boolean().optional(),
  }),
});
type Request = z.infer<typeof WitnessRequest>;

export const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function need(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`witness: ${message}`);
}
/** Digest of the DB and WAL bytes; a read-only open may create an empty WAL, which is not a change. */
export const lineage = (db: string) =>
  hash(
    [db, `${db}-wal`].map((f) =>
      fs.existsSync(f) && fs.statSync(f).size > 0
        ? createHash('sha256').update(fs.readFileSync(f)).digest('hex')
        : '-',
    ),
  );

export function openWitnessDb(
  dbPath: string,
  stoppedPid: number,
  expected: string,
): OfflineDb {
  need(fs.existsSync(dbPath), 'private DB missing');
  need(
    path.isAbsolute(expected) &&
      path.relative(path.resolve(dbPath), path.resolve(expected)) === '',
    'foreign DB path',
  );
  need(
    path.relative(fs.realpathSync(dbPath), path.resolve(expected)) === '',
    'redirected DB path',
  );
  return openStoppedDb(dbPath, stoppedPid);
}

export function witness(db: OfflineDb, op: 'ready' | 'declared', req: Request) {
  const { command } = req;
  const meta = readMatchMeta(db, req.matchId);
  need(
    meta.status === 'active' &&
      meta.config.fogOfWar === false &&
      (command.trusted || !meta.coopCampaign),
    'ordinary active fog-off match required',
  );
  need(meta.hostPlayerId === req.hostId, 'unexpected host');
  need(
    hash(
      meta.unitBootstrap?.map(({ unitId, unitRef, side }) => ({
        unitId,
        unitRef,
        side,
      })),
    ) === hash(req.unitBootstrap),
    'unexpected canonical bootstrap',
  );
  const seats = meta.seats ?? [];
  const kinds = [req.hostId, req.guestId, req.watcherId].map((id) =>
    seats
      .filter((s) => s.occupant?.playerId === id)
      .map((s) => s.kind)
      .join(),
  );
  need(kinds.join('|') === 'human|human|spectator', 'unexpected seats');
  const history = (
    db
      .prepare(
        'SELECT event_json FROM mp_match_events WHERE match_id = ? ORDER BY sequence',
      )
      .pluck()
      .all(req.matchId) as string[]
  ).map((row) => JSON.parse(row) as IGameEvent);
  need(
    history.every((event, index) => event.sequence === index),
    'non-contiguous history',
  );
  const upTo = (count: number) =>
    hydrateGameSessionFromEvents(req.matchId, history.slice(0, count));
  const session = upTo(history.length);
  const { phase, turn, units } = session.currentState;
  need(phase === command.phase, `phase ${phase} is not ${command.phase}`);
  const [first, second] = req.unitBootstrap.map((entry) => units[entry.unitId]);
  need(
    first &&
      second &&
      first.side === req.unitBootstrap[0].side &&
      second.side === req.unitBootstrap[1].side,
    'canonical units missing',
  );
  const before = op === 'ready' ? session : upTo(command.ready?.count ?? 0);
  if (op === 'declared')
    need(
      hash(history.slice(0, command.ready?.count)) === command.ready?.sha256,
      'history before the command changed',
    );
  const activeId = getActivePhaseUnitId(before);
  const active = units[activeId ?? ''];
  need(active, 'no active unit');
  const other = active === first ? second : first;
  const owner = (side: string) =>
    [req.hostId, req.guestId].find((id) =>
      meta.sideAssignments.some((a) => a.playerId === id && a.side === side),
    );
  need(
    [req.hostId, req.guestId].includes(owner(active.side) ?? ''),
    'active unit has no seated principal',
  );
  const distance = hexDistance(active.position, other.position);
  const entry = req.unitBootstrap.find((u) => u.unitId === active.id);
  const canonical =
    entry && getNodeCanonicalUnitService().getByIdSync(entry.unitRef);
  need(canonical, 'canonical unit unavailable');
  const weapon = adaptUnitFromData(canonical, {
    side: active.side,
  }).weapons.find((w) => w.minRange < distance && distance <= w.longRange);
  const view = (u: typeof first) => ({
    unitId: u.id,
    side: u.side,
    playerId: owner(u.side),
    position: u.position,
    facing: u.facing,
    lockState: u.lockState,
  });
  const facts = {
    op,
    matchId: req.matchId,
    phase,
    turn,
    eventCount: history.length,
    eventsSha256: hash(history),
    distance,
    weaponId: weapon?.id ?? null,
    active: view(active),
    other: view(other),
  };
  if (op === 'ready') {
    need(
      [active, other].every((u) => u.lockState === LockState.Pending),
      'a unit already acted or locked',
    );
    need(
      !history.some(
        (e) => e.phase === phase && e.turn === turn && e.type === command.type,
      ),
      'declaration already present',
    );
    return facts;
  }
  const declarations = history.filter(
    (e) => e.type === command.type && e.payload.intentId === command.intentId,
  );
  need(
    declarations.length === 1,
    'accepted intent has no single durable declaration',
  );
  const [declaration] = declarations;
  need(
    declaration.phase === phase &&
      declaration.turn === turn &&
      declaration.actorId === active.id,
    'declaration not by the active unit in this phase',
  );
  const target = JSON.stringify(declaration.payload);
  need(
    command.kind === 'Move' || target.includes(other.id),
    'declaration lacks the canonical target',
  );
  need(
    command.kind !== 'Attack' || (weapon && target.includes(weapon.id)),
    'declaration lacks a legal canonical weapon',
  );
  need(
    other.lockState === LockState.Pending ||
      other.lockState === LockState.Planning,
    'second actor cannot withhold reveal',
  );
  const audience = createMatchWireSealedChoiceAudienceContext(
    history,
    { ...session.currentState, sideAssignments: meta.sideAssignments },
    history.length,
    seats,
  );
  need(
    !audience.isSealedChoiceRevealed(declaration),
    'declaration already revealed',
  );
  return {
    ...facts,
    declaration: {
      id: declaration.id,
      sequence: declaration.sequence,
      type: declaration.type,
      actorId: declaration.actorId,
    },
    revealed: false,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const argv = process.argv.slice(2);
  const arg = (name: string) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const op = argv.find((a) => !a.startsWith('--'));
  need(op === 'ready' || op === 'declared', `unknown op ${op}`);
  const request = WitnessRequest.parse(JSON.parse(arg('request') ?? ''));
  const dbPath = arg('db') ?? '';
  const before = lineage(dbPath);
  const db = openWitnessDb(
    dbPath,
    Number(arg('stopped-pid')),
    request.expectedDb,
  );
  try {
    db.pragma('query_only = ON');
    const result = witness(db, op, request);
    db.close();
    need(lineage(dbPath) === before, 'DB lineage changed');
    console.log(JSON.stringify({ ...result, lineage: before }));
  } finally {
    if (db.open) db.close();
  }
}
