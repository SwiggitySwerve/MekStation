/**
 * L1-SMOKE-A2M falsifiers (node:test; no build, no Jest):
 *   node --test scripts/release/l1-built-server-spectator-privacy.test.mjs
 * The matrix callbacks are falsified against scripted connections: a leaked
 * declaration id, intent id or payload, a placeholder declaration, a delivery
 * cursor gap, an exposed player-projection authority sequence, a GM control
 * that lost its declaration, an omitted or duplicated row, and a nested A1.
 * The built-server run is the production proof; nothing here is.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { A1_REQUIRED_CASES } from './l1-built-server-socket-cases.mjs';
import { COMMANDS } from './l1-built-server-spectator-context.mjs';
import {
  A2M_REQUIRED_CASES,
  ROWS,
  events,
  leaks,
  observe,
  runMatrixCases,
} from './l1-built-server-spectator-privacy-cases.mjs';
import { A2M_DIRECT_CASES } from './run-l1-built-server-spectator-privacy.mjs';
import {
  AUDIENCES,
  lockedFor,
} from './run-l1-built-server-spectator-trusted-proof.mjs';

const evt = (n, type, extra = {}) => ({
  id: `e${n}`,
  type,
  payload: {},
  ...extra,
});
const live = (event, n) => ({ kind: 'Event', event, deliverySequence: n });
const chunk = (list) => ({
  kind: 'ReplayChunk',
  events: list,
  deliverySequences: list.map((_, i) => i),
});
const conn = (...messages) => ({
  frames: messages.map((parsed) => ({ raw: JSON.stringify(parsed), parsed })),
});
const secret = {
  id: 'sealed-id',
  type: 'movement_declared',
  phase: 'movement',
  turn: 1,
  needles: ['sealed-id', 'intent-9', '{"to":{"q":1,"r":2}}'],
};
const ctx = {
  check: (ok, id, message) => {
    if (!ok) throw new Error(`${id}: ${message}`);
  },
};
const clean = () =>
  conn(
    chunk([evt(0, 'game_started'), evt(1, 'phase_changed')]),
    live(evt(2, 'movement_locked', { payload: { unitId: 'u1' } }), 2),
  );
const row = (kind, audience) =>
  ROWS.find((r) => r.id === `matrix-${kind}-${audience}`);

test('the enumeration is nine withheld rows plus three GM controls, frozen, unique and in matrix order', () => {
  assert.ok(Object.isFrozen(ROWS) && Object.isFrozen(A2M_REQUIRED_CASES));
  assert.equal(new Set(A2M_REQUIRED_CASES).size, 12);
  assert.deepEqual(
    A2M_REQUIRED_CASES,
    COMMANDS.flatMap((c) => AUDIENCES.map((a) => `matrix-${c.kind}-${a.id}`)),
  );
  assert.equal(ROWS.filter((r) => !r.audience.participant).length, 9);
  assert.equal(ROWS.filter((r) => r.audience.participant).length, 3);
});

test('the direct runner composes A1 once plus the matrix, and the matrix runs no nested A1', () => {
  assert.deepEqual(A2M_DIRECT_CASES, [
    ...A1_REQUIRED_CASES,
    ...A2M_REQUIRED_CASES,
  ]);
  assert.equal(new Set(A2M_DIRECT_CASES).size, A2M_DIRECT_CASES.length);
  assert.doesNotMatch(String(runMatrixCases), /runA1Cases|A1_REQUIRED/);
});

test('a clean window with public facts, the actor lock and a contiguous cursor has no leaks', () => {
  for (const brand of ['player', 'gm'])
    assert.deepEqual(leaks(clean(), 0, secret, brand), []);
});

test('each leaked sentinel, placeholder, cursor gap and player-projection sequence is flagged', () => {
  const leaked = (extra) =>
    conn(chunk([evt(0, 'game_started')]), live(extra, 1));
  assert.deepEqual(
    leaks(leaked(evt(1, 'x', { id: 'sealed-id' })), 0, secret, 'player'),
    ['sealed sentinel'],
  );
  assert.deepEqual(
    leaks(
      leaked(evt(1, 'x', { payload: { intentId: 'intent-9' } })),
      0,
      secret,
      'player',
    ),
    ['sealed sentinel'],
  );
  assert.deepEqual(
    leaks(
      leaked(evt(1, 'x', { payload: { to: { q: 1, r: 2 } } })),
      0,
      secret,
      'player',
    ),
    ['sealed sentinel'],
  );
  const sameTurn = { phase: 'movement', turn: 1 };
  assert.deepEqual(
    leaks(leaked(evt(1, 'attack_declared', sameTurn)), 0, secret, 'gm'),
    ['declaration or placeholder event'],
  );
  assert.deepEqual(
    leaks(conn(chunk([evt(0, 'a')]), live(evt(3, 'b'), 3)), 0, secret, 'gm'),
    ['delivery cursor gap'],
  );
  assert.deepEqual(
    leaks(leaked(evt(1, 'b', { sequence: 7 })), 0, secret, 'player'),
    ['authority sequence'],
  );
  assert.deepEqual(
    leaks(leaked(evt(1, 'b', { sequence: 7 })), 0, secret, 'gm'),
    [],
  );
});

test('a leak after the reconnect cut is still found, and one before it is not mis-attributed', () => {
  const both = conn(
    live(evt(0, 'a'), 0),
    live(evt(1, 'b', { id: 'sealed-id' }), 1),
  );
  assert.deepEqual(leaks(both, 1, secret, 'player'), ['sealed sentinel']);
  assert.deepEqual(leaks(both, 2, secret, 'player'), []);
});

test('observe fails a leaking spectator and a GM control that lost the declaration', () => {
  const leaking = conn(
    chunk([evt(0, 'game_started')]),
    live(evt(1, 'x', { id: 'sealed-id' }), 1),
  );
  assert.throws(
    () => observe(ctx, row('Move', 'gm-stale'), 'live', leaking, 0, secret),
    /spectator holds withheld material/,
  );
  observe(ctx, row('Move', 'player-stale'), 'live', clean(), 0, secret);
  const gm = row('Attack', 'gm-participant');
  assert.throws(
    () => observe(ctx, gm, 'restart', clean(), 0, secret),
    /non-spectating GM lost the declaration/,
  );
  observe(
    ctx,
    gm,
    'restart',
    conn(live(evt(1, 'movement_declared', { id: 'sealed-id' }), 1)),
    0,
    secret,
  );
});

test('the barrier matches only the actor lock and events() reads live and replayed deliveries', () => {
  const lock = (unitId) => ({
    kind: 'Event',
    event: evt(1, 'attack_locked', { payload: { unitId } }),
  });
  assert.ok(lockedFor('u1')(lock('u1')));
  assert.ok(!lockedFor('u1')(lock('u2')));
  assert.ok(
    !lockedFor('u1')({
      kind: 'Event',
      event: evt(1, 'movement_declared', { payload: { unitId: 'u1' } }),
    }),
  );
  assert.deepEqual(
    events(clean()).map((e) => e.delivery),
    [0, 1, 2],
  );
  assert.deepEqual(events(conn({ kind: 'LobbyUpdated' })), []);
});

test('a declaration revealed in an earlier phase is public history, not a placeholder', () => {
  const attackRow = {
    ...secret,
    type: 'attack_declared',
    phase: 'weapon_attack',
  };
  const earlier = evt(1, 'movement_declared', { phase: 'movement', turn: 1 });
  const body = conn(chunk([evt(0, 'game_started')]), live(earlier, 1));
  assert.deepEqual(leaks(body, 0, attackRow, 'gm'), []);
  const same = evt(1, 'movement_declared', { phase: 'movement', turn: 1 });
  assert.deepEqual(
    leaks(
      conn(chunk([evt(0, 'game_started')]), live(same, 1)),
      0,
      secret,
      'gm',
    ),
    ['declaration or placeholder event'],
  );
});

test('live stale-first: the audience is prepared and established before the actor is accepted', () => {
  const source = readFileSync(
    new URL('./l1-built-server-spectator-privacy-cases.mjs', import.meta.url),
    'utf8',
  );
  const body = source.slice(source.indexOf('async function runRow'));
  const order = [
    'await prepareAudience(',
    'established(ctx, id, audience, prepared.after)',
    'await accepted(',
  ].map((needle) => body.indexOf(needle));
  assert.ok(order[0] > 0 && order[0] < order[1] && order[1] < order[2]);
});
