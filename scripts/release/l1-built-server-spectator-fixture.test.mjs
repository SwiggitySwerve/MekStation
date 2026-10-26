/**
 * L1-SMOKE-A2F falsifiers (node:test; no build, no Jest):
 *   node --test scripts/release/l1-built-server-spectator-fixture.test.mjs
 * Real production code builds each throwaway private DB (DurableMatchStore, the
 * InteractiveSession engine and the production participant-table migration
 * through tsx), so the trusted fixture is falsified against genuine history:
 * brand and stale preconditions, refusal of a moved history, a live PID, a
 * foreign DB, a missing participant table, a second branding and the wrong
 * principal, an ineffective stale ordering, and the frozen enumeration. The
 * built-server run is the production proof; nothing here is.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomInt } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { BOOTSTRAP } from './l1-built-server-spectator-context.mjs';
import { FP_REQUIRED_CASES } from './run-l1-built-server-spectator-fixture-proof.mjs';
import {
  AUDIENCES,
  F_REQUIRED_CASES,
  established,
} from './run-l1-built-server-spectator-trusted-proof.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = spawnSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: here,
  encoding: 'utf8',
}).stdout.trim();
const TRUSTED = path.join(
  here,
  'l1-built-server-spectator-trusted-fixtures.ts',
);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'l1-f-test-'));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const pid = () =>
  `pid_${Array.from({ length: 27 }, () => B58[randomInt(B58.length)]).join('')}`;
const deadPid = spawnSync(process.execPath, ['-e', '0']).pid;
const sha = (file) =>
  fs.existsSync(file) && fs.statSync(file).size > 0
    ? createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    : '-';
const audience = (id) => AUDIENCES.find((a) => a.id === id);

/** Private DB from the production store, engine and participant migration (a copy of the A2FP builder plus the table). */
const BUILDER = `
const [file, spec] = [process.argv[1], JSON.parse(process.argv[2])];
const load = async (p) => { const ns = await import(p); return ns.default ?? ns; };
const { DurableMatchStore } = await load('@/lib/multiplayer/server/DurableMatchStore');
const { adaptUnitFromData } = await load('@/engine/adapters/CompendiumAdapter');
const { createMinimalGrid } = await load('@/engine/GameEngine.helpers');
const { getNodeCanonicalUnitService } = await load('@/services/units/NodeCanonicalUnitService');
const { SeededRandom } = await load('@/simulation/core');
const { InteractiveSession } = await load('@/engine/InteractiveSession');
const { getActivePhaseUnitId } = await load('@/utils/gameplay/gameSessionActivation');
const { MovementType } = await load('@/types/gameplay/HexGridInterfaces');
const Database = await load('better-sqlite3');
const { CAMPAIGN_SESSION_PARTICIPANTS_MIGRATION } = await load('@/services/persistence/SQLiteService.sessionParticipants.migration');
const seat = (slotId, side, kind, id) => ({ slotId, side, seatNumber: 1, kind, ready: true, occupant: { playerId: id, displayName: id } });
const meta = { matchId: spec.matchId, hostPlayerId: spec.ids.host, playerIds: [spec.ids.host, spec.ids.guest], sideAssignments: [{ playerId: spec.ids.host, side: 'player' }, { playerId: spec.ids.guest, side: 'opponent' }], status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), config: { mapRadius: 8, turnLimit: 5, fogOfWar: false }, layout: '1v1', seats: [seat('alpha-1', 'Alpha', 'human', spec.ids.host), seat('bravo-1', 'Bravo', 'human', spec.ids.guest), seat('spectator-1', 'spectator', 'spectator', spec.ids.watcher)], unitBootstrap: spec.bootstrap };
const adapted = spec.bootstrap.map((e) => ({ ...adaptUnitFromData(getNodeCanonicalUnitService().getByIdSync(e.unitRef), { side: e.side }), id: e.unitId }));
const games = adapted.map((a, i) => ({ id: a.id, name: a.id, side: a.side, unitRef: spec.bootstrap[i].unitRef, pilotRef: a.id + '-pilot', gunnery: 4, piloting: 5, heatSinks: a.heatSinks, heatSinkType: a.heatSinkType, movementMode: a.movementMode, gyroType: a.gyroType, tonnage: a.tonnage }));
const s = new InteractiveSession(8, 5, new SeededRandom(7), createMinimalGrid(8), adapted.filter((a) => a.side === 'player'), adapted.filter((a) => a.side === 'opponent'), games, {});
const state = () => s.getSession().currentState;
const active = () => { const id = getActivePhaseUnitId(s.getSession()); return [id, Object.keys(state().units).find((u) => u !== id)]; };
s.advancePhase();
let acted = null;
if (spec.act) { const [a, o] = active(); const [u, t] = [state().units[a], state().units[o]]; s.applyMovement(a, { q: u.position.q, r: u.position.r + Math.sign(t.position.r - u.position.r) }, u.facing, MovementType.Walk); acted = a; }
const stamp = (e) => (/_declared$/.test(e.type) ? { ...e, payload: { ...e.payload, intentId: 'intent-' + e.sequence } } : e);
const events = s.getSession().events.map(stamp);
await new DurableMatchStore({ path: file }).createMatch(meta, events);
if (!spec.noTable) { const raw = new Database(file); raw.exec(CAMPAIGN_SESSION_PARTICIPANTS_MIGRATION.up); raw.close(); }
const [a, o] = spec.act ? [acted, Object.keys(state().units).find((u) => u !== acted)] : active();
const first = events.findIndex((e) => /_declared$/.test(e.type));
const ready = first < 0 ? null : { count: first, sha256: (await import('node:crypto')).createHash('sha256').update(JSON.stringify(events.slice(0, first))).digest('hex') };
console.log(JSON.stringify({ active: a, other: o, ready, intentId: events.find((e) => /_declared$/.test(e.type))?.payload.intentId ?? null }));
`;
let counter = 0;
function build(spec = {}) {
  const ids = { host: pid(), guest: pid(), watcher: pid() };
  const matchId = crypto.randomUUID();
  const file = path.join(scratch, `private-${(counter += 1)}.sqlite`);
  const out = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      BUILDER,
      file,
      JSON.stringify({ ids, matchId, bootstrap: BOOTSTRAP, ...spec }),
    ],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(out.status, 0, out.stderr);
  const made = JSON.parse(out.stdout.trim().split('\n').at(-1));
  const principal = (unitId) =>
    BOOTSTRAP.find((u) => u.unitId === unitId).side === 'player'
      ? ids.host
      : ids.guest;
  return {
    file,
    ids,
    matchId,
    ...made,
    activePid: principal(made.active),
    otherPid: principal(made.other),
  };
}
const MOVE = { kind: 'Move', phase: 'movement', type: 'movement_declared' };
const op = (
  db,
  name,
  req,
  { dbArg = db.file, stoppedPid = deadPid, expectedDb = db.file } = {},
) =>
  spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      TRUSTED,
      `--db=${dbArg}`,
      `--stopped-pid=${stoppedPid}`,
      name,
      `--request=${JSON.stringify({ ...req, expectedDb })}`,
    ],
    { cwd: root, encoding: 'utf8' },
  );
const ok = (result) => {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split('\n').at(-1));
};
const refuses = (result, pattern) => {
  assert.notEqual(result.status, 0, `expected refusal, got ${result.stdout}`);
  assert.match(result.stderr, pattern);
};
const base = (db, command = MOVE) => ({
  matchId: db.matchId,
  hostId: db.ids.host,
  guestId: db.ids.guest,
  watcherId: db.ids.watcher,
  unitBootstrap: BOOTSTRAP,
  command,
});
/** A trusted request anchored on the real ready facts of an ordinary DB. */
function request(db, id, over = {}) {
  const probe = ok(
    op(db, 'ready', {
      ...base(db),
      audience: audience(id),
      subjectId: db.ids.watcher,
      activeSide: 'player',
    }),
  );
  const side = probe.facts.active.side;
  const want = audience(id);
  return {
    ...base(db, {
      ...MOVE,
      ready: {
        count: probe.facts.eventCount,
        sha256: probe.facts.eventsSha256,
      },
    }),
    audience: want,
    subjectId: want.participant ? db.otherPid : db.ids.watcher,
    activeSide: side,
    ...over,
  };
}
test('ready on an ordinary DB reports the unbranded watcher and leaves the DB bytes alone', () => {
  const db = build();
  const before = [sha(db.file), sha(`${db.file}-wal`)];
  const out = ok(
    op(db, 'ready', {
      ...base(db),
      audience: audience('gm-unassigned'),
      subjectId: db.ids.watcher,
      activeSide: 'player',
    }),
  );
  assert.deepEqual(
    [out.brand, out.marker, out.rows, out.seatKinds, out.assignments],
    ['player', null, 0, ['spectator'], 0],
  );
  assert.deepEqual([sha(db.file), sha(`${db.file}-wal`)], before);
});

for (const id of ['player-stale', 'gm-stale', 'gm-unassigned']) {
  test(`prepare ${id}: establishes exactly the audience, with the combat history byte-identical`, () => {
    const db = build();
    const want = audience(id);
    const out = ok(op(db, 'prepare', request(db, id)));
    assert.equal(out.eventsUnchanged, true);
    assert.equal(out.after.brand, want.brand);
    assert.equal(out.after.staleEffective, want.stale);
    assert.equal(out.after.marker !== null, want.brand === 'gm');
    assert.equal(out.after.rows, want.brand === 'gm' ? 1 : 0);
    assert.equal(out.after.facts.eventsSha256, out.before.facts.eventsSha256);
    const again = ok(op(db, 'ready', request(db, id)));
    assert.deepEqual(
      [again.brand, again.staleEffective],
      [want.brand, want.stale],
    );
    assert.equal(
      again.facts.active.playerId,
      db.activePid,
      'a stale-first assignment must not move the principal',
    );
    assert.ok(
      [db.ids.host, db.ids.guest].includes(again.facts.active.playerId),
    );
  });
}

test('prepare gm-participant brands the idle participant, never the acting one or the watcher', () => {
  const db = build();
  const out = ok(op(db, 'prepare', request(db, 'gm-participant')));
  assert.deepEqual([out.after.brand, out.after.seatKinds], ['gm', ['human']]);
  assert.equal(out.after.facts.other.playerId, db.otherPid);
  const fresh = build();
  refuses(
    op(
      fresh,
      'prepare',
      request(fresh, 'gm-participant', { subjectId: fresh.activePid }),
    ),
    /idle participant/,
  );
  const spectator = build();
  refuses(
    op(
      spectator,
      'prepare',
      request(spectator, 'gm-participant', {
        subjectId: spectator.ids.watcher,
      }),
    ),
    /seat kind/,
  );
});

test('prepare after the declaration brands the same principal without touching the sealed history', () => {
  const db = build({ act: 'move' });
  const activeSide = BOOTSTRAP.find((u) => u.unitId === db.active).side;
  const command = { ...MOVE, ready: db.ready, intentId: db.intentId };
  const out = ok(
    op(db, 'prepare', {
      ...base(db, command),
      audience: audience('gm-participant'),
      subjectId: db.otherPid,
      activeSide,
    }),
  );
  assert.deepEqual([out.after.brand, out.after.facts.revealed], ['gm', false]);
  assert.equal(out.after.facts.eventsSha256, out.before.facts.eventsSha256);
});

test('prepare after the declaration puts the stale watcher first without moving the principal or the sealed history', () => {
  const db = build({ act: 'move' });
  const activeSide = BOOTSTRAP.find((u) => u.unitId === db.active).side;
  const command = { ...MOVE, ready: db.ready, intentId: db.intentId };
  const out = ok(
    op(db, 'prepare', {
      ...base(db, command),
      audience: audience('player-stale'),
      subjectId: db.ids.watcher,
      activeSide,
    }),
  );
  assert.deepEqual(
    [out.after.brand, out.after.staleEffective, out.after.facts.revealed],
    ['player', true, false],
  );
  assert.equal(out.after.facts.active.playerId, db.activePid);
  assert.equal(out.after.facts.eventsSha256, out.before.facts.eventsSha256);
});

test('prepare refuses a moved history, a second branding, a live PID, a foreign DB and a missing participant table', () => {
  const db = build();
  const good = request(db, 'gm-unassigned');
  refuses(
    op(db, 'prepare', {
      ...good,
      command: {
        ...good.command,
        ready: { ...good.command.ready, sha256: '0'.repeat(64) },
      },
    }),
    /history moved/,
  );
  ok(op(db, 'prepare', good));
  refuses(op(db, 'prepare', good), /ordinary active fog-off match required/);
  const stale = build();
  const again = request(stale, 'player-stale');
  ok(op(stale, 'prepare', again));
  refuses(op(stale, 'prepare', again), /unassigned watcher|history moved/);
  const live = build();
  refuses(
    op(live, 'prepare', request(live, 'gm-unassigned'), {
      stoppedPid: process.pid,
    }),
    /not stopped/,
  );
  const foreign = build();
  refuses(
    op(foreign, 'prepare', request(foreign, 'gm-unassigned'), {
      expectedDb: db.file,
    }),
    /foreign DB path/,
  );
  const bare = build({ noTable: true });
  // The table guard runs before the anchor check, so a probe request is enough (the ready probe needs the table too).
  const probe = {
    ...base(bare, { ...MOVE, ready: { count: 1, sha256: '0'.repeat(64) } }),
    audience: audience('gm-unassigned'),
    subjectId: bare.ids.watcher,
    activeSide: 'player',
  };
  refuses(op(bare, 'prepare', probe), /participant table missing/);
});

test('an appended stale assignment is not the product owner: the witness exposes the ineffective ordering', () => {
  const db = build();
  const req = request(db, 'player-stale');
  assert.equal(ok(op(db, 'prepare', req)).after.staleEffective, true);
  const Database = createRequire(path.join(root, 'package.json'))(
    'better-sqlite3',
  );
  const raw = new Database(db.file);
  const row = JSON.parse(
    raw
      .prepare('SELECT meta_json FROM mp_matches WHERE match_id = ?')
      .pluck()
      .get(db.matchId),
  );
  row.sideAssignments = [
    ...row.sideAssignments.filter((a) => a.playerId !== db.ids.watcher),
    { playerId: db.ids.watcher, side: req.activeSide },
  ];
  raw
    .prepare('UPDATE mp_matches SET meta_json = ? WHERE match_id = ?')
    .run(JSON.stringify(row), db.matchId);
  raw.close();
  assert.equal(ok(op(db, 'ready', req)).staleEffective, false);
});

test('the CLI refuses structurally invalid trusted requests', () => {
  const db = build();
  const good = request(db, 'gm-unassigned');
  for (const bad of [
    { ...good, extra: 1 },
    { ...good, audience: { ...good.audience, brand: 'admin' } },
    { ...good, audience: { ...good.audience, extra: true } },
    { ...good, activeSide: 'sideways' },
    { ...good, subjectId: '' },
  ])
    refuses(op(db, 'prepare', bad), /invalid|Unrecognized|expected|Too small/i);
  refuses(op(db, 'mutate', good), /unknown op/);
});

test('the enumeration is frozen, unique and re-uses every A2FP row without re-registering it', () => {
  assert.ok(Object.isFrozen(F_REQUIRED_CASES) && Object.isFrozen(AUDIENCES));
  assert.equal(new Set(F_REQUIRED_CASES).size, F_REQUIRED_CASES.length);
  assert.deepEqual(F_REQUIRED_CASES.slice(0, FP_REQUIRED_CASES.length), [
    ...FP_REQUIRED_CASES,
  ]);
  assert.deepEqual(F_REQUIRED_CASES.slice(FP_REQUIRED_CASES.length), [
    ...AUDIENCES.map((a) => `trusted-${a.id}`),
    'gm-brand-recovered',
  ]);
  assert.deepEqual(
    AUDIENCES.map((a) => [a.brand, a.stale, a.participant]),
    [
      ['player', true, false],
      ['gm', true, false],
      ['gm', false, false],
      ['gm', false, true],
    ],
  );
});

test('established rejects a vacuous fixture: wrong brand, ineffective stale, missing marker or the wrong seat', () => {
  const ctx = {
    check: (cond, id, message) => {
      if (!cond) throw new Error(`${id}: ${message}`);
    },
  };
  const gmStale = audience('gm-stale');
  const good = {
    brand: 'gm',
    staleEffective: true,
    marker: 'c',
    seatKinds: ['spectator'],
    facts: {},
  };
  established(ctx, 'x', gmStale, good);
  for (const bad of [
    { brand: 'player' },
    { staleEffective: false },
    { marker: null },
    { seatKinds: ['human'] },
    { facts: { revealed: true } },
  ])
    assert.throws(
      () => established(ctx, 'x', gmStale, { ...good, ...bad }),
      /not established/,
    );
});

test('prepare refuses a stray active gm row even without a co-op marker', () => {
  const db = build();
  const Database = createRequire(path.join(root, 'package.json'))(
    'better-sqlite3',
  );
  const raw = new Database(db.file);
  raw
    .prepare(
      "INSERT INTO campaign_session_participant (campaign_id, session_id, participant_id, seat, bound_at, revoked_at) VALUES ('stray', ?, ?, 'gm', ?, NULL)",
    )
    .run(db.matchId, db.ids.host, new Date().toISOString());
  raw.close();
  refuses(
    op(db, 'prepare', request(db, 'gm-unassigned')),
    /trusted state already present/,
  );
});
