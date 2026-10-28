/**
 * L1-SMOKE-A2 falsifiers (node:test; no build, no Jest):
 *   node --import tsx --test scripts/release/l1-built-server-spectator.test.mjs
 * A bare stub image proves the composite enumeration through the real runHarness: an
 * omitted A1, matrix or co-op row, a row passed twice and an unexpected row all fail.
 * Pure checks reject missing or non-d6 captured rolls; the read-only event witness
 * runs through tsx on a synthetic private DB. The stubs are never product proof: the
 * production proof is the real built-server run.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { A1_REQUIRED_CASES } from './l1-built-server-socket-cases.mjs';
import {
  A2_FIXTURES,
  A2_OWN_CASES,
  A2_REQUIRED_CASES,
  capturedRolls,
  runA2Cases,
} from './l1-built-server-spectator-cases.mjs';
import { A2M_REQUIRED_CASES } from './l1-built-server-spectator-privacy-cases.mjs';
import { runHarness } from './run-l1-built-server-smoke.mjs';

const require = createRequire(import.meta.url);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'l1-a2-test-'));
const FAST = {
  readyMs: 5_000,
  stopMs: 10_000,
  casesMs: 30_000,
  commandMs: 30_000,
  waitMs: 2_000,
};
const passing = (ids) => async (ctx) => ids.forEach((id) => ctx.pass(id, {}));

function stubRepo() {
  const repo = path.join(scratch, `repo-${fs.readdirSync(scratch).length}`);
  const standalone = path.join(repo, '.next', 'standalone');
  fs.mkdirSync(path.join(standalone, '.next'), { recursive: true });
  fs.mkdirSync(path.join(standalone, 'src'));
  fs.writeFileSync(path.join(repo, '.gitignore'), '.next/\n');
  const git = (...args) =>
    spawnSync(
      'git',
      ['-c', 'user.email=t@t', '-c', 'user.name=t', '-C', repo, ...args],
      { encoding: 'utf8', windowsHide: true },
    );
  git('init', '-q');
  git('add', '.');
  git('commit', '-qm', 'stub');
  fs.writeFileSync(path.join(repo, '.next', 'BUILD_ID'), 'b1');
  fs.writeFileSync(path.join(standalone, '.next', 'BUILD_ID'), 'b1');
  fs.writeFileSync(path.join(standalone, 'server.next-config.json'), '{}');
  fs.writeFileSync(path.join(standalone, 'src', 'module.ts'), 'export {};\n');
  const ready =
    "console.log('MEKSTATION_LISTENER_READY ' + JSON.stringify({ schema: 'mekstation-packaged-listener-ready/v1', configuredHostname: '127.0.0.1', boundAddress: '127.0.0.1', family: 'IPv4', port }))";
  fs.writeFileSync(
    path.join(standalone, 'server.js'),
    `// server.on('upgrade' /api/multiplayer/socket bindMultiplayerSocketConnection MEKSTATION_LISTENER_READY\nconst port = Number(process.env.PORT);\nrequire('node:http').createServer((q, r) => { r.writeHead(404); r.end('{}'); }).listen(port, '127.0.0.1', () => { ${ready}; });\n`,
  );
  return {
    repo,
    sha: git('rev-parse', 'HEAD').stdout.trim(),
    output: path.join(scratch, `out-${fs.readdirSync(scratch).length}`),
  };
}
const run = (steps) => {
  const fixture = stubRepo();
  return runHarness(
    {
      repoRoot: fixture.repo,
      expectedSha: fixture.sha,
      output: fixture.output,
      requiredCases: A2_REQUIRED_CASES,
      limits: FAST,
    },
    (ctx) => runA2Cases(ctx, steps),
  );
};
const steps = (overrides = {}) => ({
  a1: passing(A1_REQUIRED_CASES),
  matrix: passing(A2M_REQUIRED_CASES),
  own: passing(A2_OWN_CASES),
  ...overrides,
});

test('the composite enumeration is A1 once, then A2M once, then the rows owned here, all unique', () => {
  assert.deepEqual(A2_REQUIRED_CASES, [
    ...A1_REQUIRED_CASES,
    ...A2M_REQUIRED_CASES,
    ...A2_OWN_CASES,
  ]);
  assert.equal(new Set(A2_REQUIRED_CASES).size, A2_REQUIRED_CASES.length);
  assert.deepEqual(A2_OWN_CASES, [
    'concurrent-first-sockets',
    'coop-mission-provisioned',
    'coop-restart-action-accepted',
    'coop-first-rolls-captured',
  ]);
});

test('runA2Cases runs the A1 baseline, the frozen matrix and the owned rows once each, in that order', async () => {
  const order = [];
  const record = (name) => async () => void order.push(name);
  await runA2Cases(
    {},
    { a1: record('a1'), matrix: record('matrix'), own: record('own') },
  );
  assert.deepEqual(order, ['a1', 'matrix', 'own']);
});

test('the real harness passes the complete composite and fails an omitted, doubled or unexpected row', async () => {
  const summary = await run(steps());
  assert.equal(summary.verdict, 'PASS');
  assert.deepEqual([...summary.passed].sort(), [...A2_REQUIRED_CASES].sort());
  await assert.rejects(
    run(steps({ a1: passing(A1_REQUIRED_CASES.slice(1)) })),
    new RegExp(`missing \\[${A1_REQUIRED_CASES[0]}\\]`),
  );
  await assert.rejects(
    run(steps({ matrix: passing(A2M_REQUIRED_CASES.slice(1)) })),
    new RegExp(`missing \\[${A2M_REQUIRED_CASES[0]}\\]`),
  );
  await assert.rejects(
    run(steps({ own: passing(A2_OWN_CASES.slice(0, -1)) })),
    /missing \[coop-first-rolls-captured\]/,
  );
  await assert.rejects(
    run(
      steps({ matrix: passing([...A2M_REQUIRED_CASES, A1_REQUIRED_CASES[0]]) }),
    ),
    /recorded twice/,
  );
  await assert.rejects(
    run(steps({ own: passing([...A2_OWN_CASES, 'extra-row']) })),
    /unexpected \[extra-row\]/,
  );
});

test('capturedRolls accepts nonempty d6 rolls only', () => {
  assert.deepEqual(capturedRolls({ payload: { rolls: [3, 4] } }), [3, 4]);
  for (const bad of [
    undefined,
    {},
    { payload: {} },
    { payload: { rolls: [] } },
    { payload: { rolls: [0] } },
    { payload: { rolls: [7] } },
    { payload: { rolls: [2.5] } },
    { payload: { rolls: 'x' } },
  ]) {
    assert.throws(() => capturedRolls(bad), /no captured d6 rolls/);
  }
});

test('the event witness returns one stored event and refuses a missing or doubled id and a live pid', () => {
  const Database = require('better-sqlite3');
  const db = path.join(scratch, 'event.sqlite');
  const h = new Database(db);
  h.exec(
    'CREATE TABLE mp_matches (match_id TEXT PRIMARY KEY, status TEXT NOT NULL, room_code TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, meta_json TEXT NOT NULL); CREATE TABLE mp_match_events (match_id TEXT NOT NULL, sequence INTEGER NOT NULL, event_json TEXT NOT NULL, PRIMARY KEY (match_id, sequence));',
  );
  h.prepare(
    "INSERT INTO mp_matches VALUES ('m1', 'active', NULL, 't', 't', ?)",
  ).run(
    JSON.stringify({
      matchId: 'm1',
      status: 'active',
      config: { fogOfWar: false },
    }),
  );
  const rows = [
    { id: 'e0', sequence: 0, type: 'game_started', payload: {} },
    {
      id: 'e1',
      sequence: 1,
      type: 'initiative_rolled',
      payload: { rolls: [2, 5], intentId: 'i-1' },
    },
    { id: 'e1', sequence: 2, type: 'phase_changed', payload: {} },
  ];
  rows.forEach((row) =>
    h
      .prepare("INSERT INTO mp_match_events VALUES ('m1', ?, ?)")
      .run(row.sequence, JSON.stringify(row)),
  );
  h.close();
  const witness = (id, pid = 999_999) =>
    spawnSync(
      process.execPath,
      [
        '--import',
        import.meta.resolve('tsx'),
        A2_FIXTURES,
        `--db=${db}`,
        `--stopped-pid=${pid}`,
        'event',
        '--match=m1',
        `--id=${id}`,
      ],
      { encoding: 'utf8', windowsHide: true },
    );
  const one = witness('e0');
  assert.equal(one.status, 0, one.stderr);
  assert.deepEqual(JSON.parse(one.stdout.trim()), {
    op: 'event',
    sequence: 0,
    type: 'game_started',
    rolls: null,
    intentId: null,
    eventCount: 3,
  });
  assert.match(witness('absent').stderr, /stored 0 times/);
  assert.match(witness('e1').stderr, /stored 2 times/);
  assert.match(witness('e0', process.pid).stderr, /not stopped/);
});

test('the co-op restart row reopens the GM campaign channel before the first post-restart action', () => {
  const source = fs.readFileSync(
    new URL('./l1-built-server-spectator-cases.mjs', import.meta.url),
    'utf8',
  );
  const restart = source.indexOf(
    'await ctx.restart();',
    source.indexOf('async function coopRestart'),
  );
  const reopen = source.indexOf('await coop.reopenGm();');
  const move = source.indexOf("kind: 'Move'", reopen);
  assert.ok(restart > 0 && restart < reopen && reopen < move);
});
