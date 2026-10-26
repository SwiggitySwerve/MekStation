/**
 * L1-SMOKE-A2FP falsifiers (node:test; no build, no Jest):
 *   node --test scripts/release/l1-built-server-spectator-reachability.test.mjs
 * Real production code builds each throwaway private DB (DurableMatchStore plus
 * the InteractiveSession engine through tsx), so the witness is falsified
 * against genuine history: structural CLI input, live PID, foreign, redirected
 * and missing DB, unexpected metadata, bootstrap, seats, phase, lock, intent
 * and history state, missing positive controls and a changed DB. Context
 * callbacks are falsified with scripted sockets. The built-server run is the
 * production proof; nothing here is.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomInt } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BOOTSTRAP,
  COMMANDS,
  accepted,
  commandFor,
} from './l1-built-server-spectator-context.mjs';
import { FP_REQUIRED_CASES } from './run-l1-built-server-spectator-fixture-proof.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = spawnSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: here,
  encoding: 'utf8',
}).stdout.trim();
const WITNESS = path.join(here, 'l1-built-server-spectator-reachability.ts');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'l1-fp-test-'));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const pid = () =>
  `pid_${Array.from({ length: 27 }, () => B58[randomInt(B58.length)]).join('')}`;
const deadPid = spawnSync(process.execPath, ['-e', '0']).pid;
const sha = (file) =>
  fs.existsSync(file) && fs.statSync(file).size > 0
    ? createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    : '-';

/** Builds a private DB with the production store and engine; prints the real active/other units. */
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
const seat = (slotId, side, kind, id) => ({ slotId, side, seatNumber: 1, kind, ready: true, occupant: { playerId: id, displayName: id } });
const meta = { matchId: spec.matchId, hostPlayerId: spec.ids.host, playerIds: [spec.ids.host, spec.ids.guest], sideAssignments: [{ playerId: spec.ids.host, side: 'player' }, { playerId: spec.ids.guest, side: 'opponent' }], status: spec.status ?? 'active', ...(spec.coop ? { coopCampaign: { campaignId: 'c1' } } : {}), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), config: { mapRadius: 8, turnLimit: 5, fogOfWar: spec.fog === true }, layout: '1v1', seats: [seat('alpha-1', 'Alpha', 'human', spec.ids.host), seat('bravo-1', 'Bravo', 'human', spec.ids.guest), seat('spectator-1', 'spectator', 'spectator', spec.ids.watcher)], unitBootstrap: spec.bootstrap };
const adapted = spec.bootstrap.map((e) => ({ ...adaptUnitFromData(getNodeCanonicalUnitService().getByIdSync(e.unitRef), { side: e.side }), id: e.unitId }));
const games = adapted.map((a, i) => ({ id: a.id, name: a.id, side: a.side, unitRef: spec.bootstrap[i].unitRef, pilotRef: a.id + '-pilot', gunnery: 4, piloting: 5, heatSinks: a.heatSinks, heatSinkType: a.heatSinkType, movementMode: a.movementMode, gyroType: a.gyroType, tonnage: a.tonnage }));
const s = new InteractiveSession(8, 5, new SeededRandom(7), createMinimalGrid(8), adapted.filter((a) => a.side === 'player'), adapted.filter((a) => a.side === 'opponent'), games, {});
const state = () => s.getSession().currentState;
const active = () => { const id = getActivePhaseUnitId(s.getSession()); return [id, Object.keys(state().units).find((u) => u !== id)]; };
const move = (id, other) => { const [u, o] = [state().units[id], state().units[other]]; s.applyMovement(id, { q: u.position.q, r: u.position.r + Math.sign(o.position.r - u.position.r) }, u.facing, MovementType.Walk); };
s.advancePhase();
if (spec.advance >= 2) { s.advancePhase(); }
let acted = null;
if (spec.act === 'move' || spec.act === 'both') { const [a, o] = active(); move(a, o); acted = a; if (spec.act === 'both') move(o, a); }
if (spec.pastReveal) s.advancePhase();
const stamp = (e) => (/_declared$/.test(e.type) ? { ...e, payload: { ...e.payload, intentId: 'intent-' + e.sequence } } : e);
const events = s.getSession().events.map(stamp);
await new DurableMatchStore({ path: file }).createMatch(meta, events);
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
  const full = { ids, matchId, bootstrap: BOOTSTRAP, advance: 1, ...spec };
  const out = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      BUILDER,
      file,
      JSON.stringify(full),
    ],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(out.status, 0, out.stderr);
  return {
    file,
    ids,
    matchId,
    ...JSON.parse(out.stdout.trim().split('\n').at(-1)),
  };
}
const request = (db, command, over = {}) => ({
  matchId: db.matchId,
  expectedDb: db.file,
  hostId: db.ids.host,
  guestId: db.ids.guest,
  watcherId: db.ids.watcher,
  unitBootstrap: BOOTSTRAP,
  command,
  ...over,
});
const MOVE = { kind: 'Move', phase: 'movement', type: 'movement_declared' };
function witness(
  db,
  op,
  req,
  { dbArg = db?.file, stoppedPid = deadPid, argv } = {},
) {
  const args = argv ?? [
    `--db=${dbArg}`,
    `--stopped-pid=${stoppedPid}`,
    op,
    `--request=${JSON.stringify(req)}`,
  ];
  return spawnSync(process.execPath, ['--import', 'tsx', WITNESS, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}
const refuses = (result, pattern) => {
  assert.notEqual(result.status, 0, `expected refusal, got ${result.stdout}`);
  assert.match(result.stderr, pattern);
};
const ok = (result) => {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split('\n').at(-1));
};

test('ready witness reports the activation-aware active unit, owner, weapon and unchanged DB bytes', () => {
  const db = build();
  const before = [sha(db.file), sha(`${db.file}-wal`)];
  const facts = ok(witness(db, 'ready', request(db, MOVE)));
  assert.equal(facts.active.unitId, db.active);
  assert.notEqual(facts.active.unitId, facts.other.unitId);
  assert.ok([db.ids.host, db.ids.guest].includes(facts.active.playerId));
  assert.equal(facts.distance, 10);
  assert.equal(facts.active.lockState, 'pending');
  assert.deepEqual([sha(db.file), sha(`${db.file}-wal`)], before);
});

test('ready witness at weapon_attack names a canonical weapon that is legal at the actual range', () => {
  const db = build({ advance: 2 });
  const facts = ok(
    witness(
      db,
      'ready',
      request(db, {
        kind: 'Attack',
        phase: 'weapon_attack',
        type: 'attack_declared',
      }),
    ),
  );
  assert.match(facts.weaponId, /lrm-20/);
});

test('ready witness refuses a fog-on match, a co-op match and a match that is not active', () => {
  for (const spec of [{ fog: true }, { coop: true }, { status: 'completed' }]) {
    const db = build(spec);
    refuses(
      witness(db, 'ready', request(db, MOVE)),
      /ordinary active fog-off match required/,
    );
  }
});

test('ready witness lets a trusted command through the co-op guard and keeps the other guards', () => {
  const db = build({ coop: true });
  const facts = ok(
    witness(db, 'ready', request(db, { ...MOVE, trusted: true })),
  );
  assert.equal(facts.active.unitId, db.active);
  for (const spec of [
    { coop: true, fog: true },
    { coop: true, status: 'completed' },
  ]) {
    const bad = build(spec);
    refuses(
      witness(bad, 'ready', request(bad, { ...MOVE, trusted: true })),
      /ordinary active fog-off match required/,
    );
  }
});

test('ready witness names the opponent unit when the opponent moves first', () => {
  let db;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    db = build();
    if (db.active !== BOOTSTRAP[0].unitId) break;
  }
  assert.notEqual(
    db.active,
    BOOTSTRAP[0].unitId,
    'initiative gave the player the first move in 12 builds',
  );
  const facts = ok(witness(db, 'ready', request(db, MOVE)));
  assert.equal(facts.active.unitId, db.active);
  assert.equal(facts.active.side, 'opponent');
});
test('declared witness proves the accepted intent, active actor, pending second actor and no reveal', () => {
  const db = build({ act: 'move' });
  const facts = ok(
    witness(
      db,
      'declared',
      request(db, { ...MOVE, intentId: db.intentId, ready: db.ready }),
    ),
  );
  assert.equal(facts.revealed, false);
  assert.equal(facts.declaration.actorId, db.active);
  assert.equal(facts.other.lockState, 'pending');
});

for (const [name, argv, pattern] of [
  [
    'non-JSON request',
    ['--db=x', '--stopped-pid=1', 'ready', '--request=not-json'],
    /JSON|Unexpected/i,
  ],
  [
    'unknown op',
    ['--db=x', '--stopped-pid=1', 'mutate', '--request={}'],
    /unknown op/,
  ],
  [
    'missing request',
    ['--db=x', '--stopped-pid=1', 'ready'],
    /JSON|Unexpected|undefined/i,
  ],
]) {
  test(`CLI refuses ${name}`, () =>
    refuses(witness(null, null, null, { argv }), pattern));
}

test('CLI refuses structurally invalid requests', () => {
  const db = build();
  const good = request(db, MOVE);
  for (const bad of [
    { ...good, extra: 1 },
    { ...good, hostId: 'pid_short' },
    { ...good, matchId: 'not-a-uuid' },
    { ...good, command: { ...MOVE, kind: 'Concede' } },
    { ...good, command: { ...MOVE, phase: 'nonsense' } },
    { ...good, unitBootstrap: [BOOTSTRAP[0]] },
    { ...good, command: { ...MOVE, ready: { count: 0, sha256: 'x' } } },
  ]) {
    refuses(
      witness(db, 'ready', bad),
      /invalid|expected|Too small|Unrecognized|Invalid/i,
    );
  }
});

test('witness refuses a live owning PID, a foreign DB, a redirected DB and a missing DB', () => {
  const db = build();
  refuses(
    witness(db, 'ready', request(db, MOVE), { stoppedPid: process.pid }),
    /not stopped/,
  );
  const other = build();
  refuses(
    witness(db, 'ready', request(other, MOVE, { expectedDb: other.file })),
    /foreign DB path/,
  );
  const link = path.join(scratch, `link-${counter}`);
  fs.symlinkSync(path.dirname(db.file), link, 'junction');
  const through = path.join(link, path.basename(db.file));
  refuses(
    witness(db, 'ready', request(db, MOVE, { expectedDb: through }), {
      dbArg: through,
    }),
    /redirected DB path/,
  );
  const gone = path.join(scratch, 'missing.sqlite');
  refuses(
    witness(db, 'ready', request(db, MOVE, { expectedDb: gone }), {
      dbArg: gone,
    }),
    /missing/,
  );
});

test('ready witness refuses unexpected phase, host, bootstrap and seats', () => {
  const db = build();
  refuses(
    witness(db, 'ready', request(db, { ...MOVE, phase: 'weapon_attack' })),
    /phase movement is not weapon_attack/,
  );
  refuses(
    witness(db, 'ready', request(db, MOVE, { hostId: pid() })),
    /unexpected host/,
  );
  refuses(
    witness(
      db,
      'ready',
      request(db, MOVE, {
        unitBootstrap: [
          BOOTSTRAP[0],
          { ...BOOTSTRAP[1], unitRef: 'marauder-mad-3r' },
        ],
      }),
    ),
    /canonical bootstrap/,
  );
  refuses(
    witness(db, 'ready', request(db, MOVE, { watcherId: pid() })),
    /unexpected seats/,
  );
});

test('ready witness refuses a unit that already acted and a declared witness without its intent', () => {
  const done = build({ act: 'move' });
  refuses(
    witness(done, 'ready', request(done, MOVE)),
    /already acted|already present/,
  );
  refuses(
    witness(
      done,
      'declared',
      request(done, { ...MOVE, intentId: 'no-such-intent', ready: done.ready }),
    ),
    /no single durable declaration/,
  );
  refuses(
    witness(
      done,
      'declared',
      request(done, {
        ...MOVE,
        intentId: done.intentId,
        ready: { ...done.ready, sha256: '0'.repeat(64) },
      }),
    ),
    /history before the command changed/,
  );
});

test('declared witness refuses an accepted intent whose second actor can no longer withhold reveal', () => {
  const both = build({ act: 'both' });
  refuses(
    witness(
      both,
      'declared',
      request(both, { ...MOVE, intentId: both.intentId, ready: both.ready }),
    ),
    /cannot withhold reveal/,
  );
});

test('declared witness refuses a phase that moved on (the declaration is no longer pending)', () => {
  const db = build({ act: 'move', pastReveal: true });
  refuses(
    witness(
      db,
      'declared',
      request(db, { ...MOVE, intentId: db.intentId, ready: db.ready }),
    ),
    /phase weapon_attack is not movement/,
  );
});

test('context callbacks: frozen enumeration and activation-aware, correlated acceptance', async () => {
  assert.deepEqual(
    [...FP_REQUIRED_CASES],
    COMMANDS.map((command) => `accepted-${command.kind}`),
  );
  assert.ok(
    Object.isFrozen(COMMANDS) &&
      Object.isFrozen(FP_REQUIRED_CASES) &&
      Object.isFrozen(BOOTSTRAP),
  );
  const checks = [];
  const ctx = {
    check: (ok, id, message) => {
      if (!ok) throw new Error(`${id}: ${message}`);
      checks.push(id);
    },
  };
  const used = [];
  const conn = (role, reply) => ({
    intent: async (intent) => {
      used.push(role);
      return { intentId: `${role}-1`, reply: reply(`${role}-1`, intent) };
    },
  });
  const event = (type, actorId) => (intentId) => ({
    kind: 'Event',
    event: { type, actorId, payload: { intentId } },
  });
  const state = (reply) => ({
    label: 'x',
    identities: { host: { playerId: 'h' }, guest: { playerId: 'g' } },
    conns: { host: conn('host', reply), guest: conn('guest', reply) },
  });
  const ready = (playerId) => ({ active: { playerId, unitId: 'u1' } });
  await accepted(
    ctx,
    state(event('movement_declared', 'u1')),
    ready('g'),
    { kind: 'Move' },
    'movement_declared',
  );
  assert.deepEqual(used, ['guest']);
  for (const reply of [
    event('movement_invalid', 'u1'),
    event('movement_declared', 'other'),
    () => ({ kind: 'Error', code: 'INVALID_INTENT' }),
    (id) => ({
      kind: 'Event',
      event: {
        type: 'movement_declared',
        actorId: 'u1',
        payload: { intentId: `${id}-stale` },
      },
    }),
  ]) {
    await assert.rejects(
      accepted(
        ctx,
        state(reply),
        ready('h'),
        { kind: 'Move' },
        'movement_declared',
      ),
      /not accepted/,
    );
  }
  const active = { unitId: 'a', position: { q: -2, r: 5 }, facing: 0 };
  const other = { unitId: 'b', position: { q: -2, r: -5 }, facing: 3 };
  assert.deepEqual(commandFor(COMMANDS[0], { active, other }).to, {
    q: -2,
    r: 4,
  });
  assert.deepEqual(
    commandFor(COMMANDS[1], { active, other, weaponId: 'w1' }).weaponIds,
    ['w1'],
  );
  assert.equal(commandFor(COMMANDS[2], { active, other }).attackType, 'punch');
  assert.throws(
    () =>
      commandFor(COMMANDS[0], {
        active,
        other: { ...other, position: { q: 3, r: -5 } },
      }),
    /share a column/,
  );
});
