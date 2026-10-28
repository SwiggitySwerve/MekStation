/**
 * L1-SMOKE-B falsifiers (node:test; no build, no Jest):
 *   node --import tsx --test scripts/release/l1-built-server-fog.test.mjs
 * No production image is used. A bare stub image proves the combined enumeration
 * through the real runHarness; a stub WebSocket and HTTP server prove the refusal
 * contract checks reject a replayed frame, a wrong reason or close code, a leaked
 * sentinel or hidden key and a wrong status; the offline flip fixture runs through
 * tsx on a synthetic private DB. The stubs are never product proof: the production
 * proof is the real built-server run.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { WebSocketServer } from 'ws';

import {
  B_REQUIRED_CASES,
  FOG_FIXTURES,
  FOG_REFUSAL,
  checkMemberRefusal,
  checkStrangerRefusal,
  expectAnswers,
  headLive,
  refusedSocket,
  scanReceived,
} from './l1-built-server-fog-cases.mjs';
import { issueIdentity } from './l1-built-server-socket-cases.mjs';
import { A2_REQUIRED_CASES } from './l1-built-server-spectator-cases.mjs';
import {
  COMBINED_REQUIRED_CASES,
  runFogRefusal,
} from './run-l1-built-server-fog-refusal.mjs';
import { createRedactor } from './run-l1-built-server-smoke.mjs';

const require = createRequire(import.meta.url);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'l1-fog-test-'));
const MATCH = 'm-fog';
const close = (reason = FOG_REFUSAL) => ({
  kind: 'Close',
  matchId: MATCH,
  code: 'AUTH_REJECTED',
  reason,
});

function fakeCtx(port) {
  return {
    origin: `http://127.0.0.1:${port}`,
    wsOrigin: `ws://127.0.0.1:${port}`,
    limits: { waitMs: 2_000 },
    redactor: createRedactor(),
    evidence: { record() {} },
    check(ok, id, message, observed) {
      if (!ok)
        throw new Error(
          `[${id}] ${message}: ${JSON.stringify(observed ?? null).slice(0, 300)}`,
        );
    },
  };
}
/** A stub that answers every GET with a per-route status/body and every socket with a scripted refusal. */
function stubServer({ routes = {}, socket = 'good' } = {}) {
  const http = createServer((req, res) => {
    const [status, body] = routes[req.url] ?? [404, {}];
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  });
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: () => 'mekstation.v1',
  });
  http.on('upgrade', (req, sock, head) =>
    wss.handleUpgrade(req, sock, head, (ws) => {
      ws.send(
        JSON.stringify(
          close(socket === 'wrong-reason' ? 'other' : FOG_REFUSAL),
        ),
      );
      if (socket === 'replays')
        ws.once('message', () =>
          ws.send(JSON.stringify({ kind: 'ReplayStart', matchId: MATCH })),
        );
      setTimeout(
        () => ws.close(socket === 'wrong-code' ? 1011 : 1008, FOG_REFUSAL),
        socket === 'replays' ? 150 : 5,
      );
    }),
  );
  return new Promise((resolve) =>
    http.listen(0, '127.0.0.1', () =>
      resolve({
        port: http.address().port,
        stop: () => new Promise((done) => (wss.close(), http.close(done))),
      }),
    ),
  );
}
async function withStub(options, run) {
  const stub = await stubServer(options);
  try {
    return await run(fakeCtx(stub.port));
  } finally {
    await stub.stop();
  }
}

test('the combined enumeration is the A2 rows then the B rows, unique, with no overlap', () => {
  assert.equal(
    FOG_REFUSAL,
    'fog-projection-unavailable',
    'contract pinned by literal',
  );
  assert.deepEqual(COMBINED_REQUIRED_CASES, [
    ...A2_REQUIRED_CASES,
    ...B_REQUIRED_CASES,
  ]);
  assert.equal(
    new Set(COMBINED_REQUIRED_CASES).size,
    COMBINED_REQUIRED_CASES.length,
  );
  assert.ok(
    B_REQUIRED_CASES.length >= 8 &&
      B_REQUIRED_CASES.every((id) => /^fog-/.test(id)),
  );
});

test('checkMemberRefusal accepts only one fixed Close and the matching 1008', () => {
  const ok = { frames: [close()], closed: { code: 1008, reason: FOG_REFUSAL } };
  checkMemberRefusal(ok, MATCH);
  const bad = [
    { ...ok, frames: [close(), { kind: 'ReplayStart' }] },
    { ...ok, frames: [{ kind: 'ReplayStart' }, close()] },
    { ...ok, frames: [close('other')] },
    { ...ok, closed: { code: 1011, reason: FOG_REFUSAL } },
    { ...ok, closed: { code: 1008, reason: 'other' } },
    { ...ok, frames: [{ ...close(), code: 'INTERNAL_ERROR' }] },
    { ...ok, closed: null },
  ];
  for (const result of bad)
    assert.throws(
      () => checkMemberRefusal(result, MATCH),
      /member refusal broke it/,
    );
});

test('headLive accepts a digest or an unjournaled 404 and rejects a refusal or a bare 200', () => {
  const live = (status, json) => headLive({ status, json });
  assert.ok(live(200, { digest: 'd' }));
  assert.ok(live(404, { error: 'no head' }));
  assert.ok(!live(200, {}));
  assert.ok(!live(403, { error: FOG_REFUSAL }));
  assert.ok(!live(403, { error: 'Authorization refused' }));
  assert.ok(!live(404, { error: 'unknown match' }));
  assert.ok(!live(500, { error: FOG_REFUSAL }));
});

test('checkStrangerRefusal rejects any frame or reason that names fog', () => {
  const generic = {
    label: 'fog-stranger',
    frames: [
      {
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'admission refused: wrong-session',
      },
      { kind: 'Close', reason: 'not an active member of this match' },
    ],
    closed: { code: 1008, reason: 'not an active member of this match' },
  };
  checkStrangerRefusal(generic);
  assert.throws(
    () => checkStrangerRefusal({ ...generic, frames: [close()] }),
    /not generic/,
  );
  assert.throws(
    () =>
      checkStrangerRefusal({
        ...generic,
        frames: [{ kind: 'ReplayStart' }, ...generic.frames],
      }),
    /not generic/,
  );
  assert.throws(
    () =>
      checkStrangerRefusal({ ...generic, closed: { code: 1011, reason: 'x' } }),
    /not generic/,
  );
  assert.throws(
    () =>
      checkStrangerRefusal({
        ...generic,
        closed: { code: 1008, reason: 'fog-on' },
      }),
    /not generic/,
  );
});

test('scanReceived fails on one leaked sentinel and returns the scanned size otherwise', () => {
  assert.throws(() => scanReceived([], ['x']), /no sentinels/);
  assert.throws(() => scanReceived(['evt-1'], ['x']), /no sentinels/);
  assert.equal(
    scanReceived(['evt-1', 'deadbeef'], ['{"error":"x"}', 'ok']),
    'ok'.length + '{"error":"x"}'.length + 1,
  );
  assert.throws(
    () => scanReceived(['evt-1', 'deadbeef'], ['{"id":"evt-1"}']),
    /leaked 1 sentinels/,
  );
  assert.throws(
    () => scanReceived(['evt-1', 'deadbeef'], ['x', '{"digest":"deadbeef"}']),
    /leaked 1 sentinels/,
  );
});

test('refusedSocket captures a good refusal and the contract checks falsify a replay, reason or code', async () => {
  const outcomes = {
    good: null,
    replays: /member refusal broke it/,
    'wrong-reason': /member refusal broke it/,
    'wrong-code': /member refusal broke it/,
  };
  for (const [socket, expected] of Object.entries(outcomes)) {
    await withStub({ socket }, async (ctx) => {
      const identity = await issueIdentity(ctx, `f-${socket}`);
      const result = await refusedSocket(ctx, identity, MATCH, `f-${socket}`);
      if (expected === null) checkMemberRefusal(result, MATCH);
      else assert.throws(() => checkMemberRefusal(result, MATCH), expected);
    });
  }
});

test('expectAnswers rejects a wrong status, a different body, a hidden key and a refusal naming fog', async () => {
  const routes = {
    '/fixed': [403, { error: FOG_REFUSAL }],
    '/generic': [403, { error: 'Authorization refused' }],
    '/hidden': [403, { error: 'Authorization refused', digest: 'abc' }],
    '/names-fog': [404, { error: 'fog on' }],
    '/wrong-status': [500, { error: FOG_REFUSAL }],
    '/ok-timeline': [200, { timeline: [], lineage: { revision: 3 } }],
  };
  await withStub({ routes }, async (ctx) => {
    const who = [await issueIdentity(ctx, 'a')];
    const seen = [];
    await expectAnswers(ctx, seen, 'row', [
      ['/fixed', who, 403, { error: FOG_REFUSAL }],
      ['/generic', who, 403, { error: 'Authorization refused' }],
      ['/ok-timeline', who, 200],
      ['/missing', who, 404],
    ]);
    assert.equal(seen.length, 4);
    for (const row of [
      ['/hidden', who, 403, { error: 'Authorization refused' }],
      ['/hidden', who, 403],
      ['/names-fog', who, 404],
      ['/wrong-status', who, 403, { error: FOG_REFUSAL }],
      ['/generic', who, 403, { error: FOG_REFUSAL }],
    ]) {
      await assert.rejects(expectAnswers(ctx, [], 'row', [row]), /\[row\]/);
    }
  });
});

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
  return { repo, sha: git('rev-parse', 'HEAD').stdout.trim() };
}
const passing = (ids) => async (ctx) => ids.forEach((id) => ctx.pass(id, {}));
const FAST = {
  readyMs: 5_000,
  stopMs: 10_000,
  casesMs: 30_000,
  commandMs: 30_000,
  waitMs: 2_000,
};
const run = (fixture, steps, extra = []) =>
  runFogRefusal(
    [
      `--repo-root=${fixture.repo}`,
      `--output=${path.join(scratch, `out-${Math.random().toString(36).slice(2)}`)}`,
      ...extra,
    ],
    {
      steps,
      harness: (options, cases) =>
        import('./run-l1-built-server-smoke.mjs').then((m) =>
          m.runHarness(
            { ...options, limits: { ...options.limits, ...FAST } },
            cases,
          ),
        ),
    },
  );

test('runFogRefusal derives the argv-stable options from the checkout and names every combined row', async () => {
  const fixture = stubRepo();
  let seen = null;
  const result = await runFogRefusal(
    [`--repo-root=${fixture.repo}`, '--build'],
    {
      harness: async (options) => {
        seen = options;
        return {
          verdict: 'PASS',
          required: options.requiredCases,
          passed: options.requiredCases,
          manifest: { image: { buildId: 'b1' } },
        };
      },
    },
  );
  assert.equal(seen.build, true);
  assert.equal(seen.expectedSha, fixture.sha);
  assert.ok(path.isAbsolute(seen.output) && !fs.existsSync(seen.output));
  assert.ok(seen.limits.casesMs >= 1_800_000);
  assert.deepEqual(seen.requiredCases, COMBINED_REQUIRED_CASES);
  assert.equal(result.headSha, fixture.sha);
});

test('the real harness passes the complete combined enumeration', async () => {
  const summary = await run(stubRepo(), {
    a2: passing(A2_REQUIRED_CASES),
    fog: passing(B_REQUIRED_CASES),
  });
  assert.equal(summary.verdict, 'PASS');
  assert.equal(summary.required, COMBINED_REQUIRED_CASES.length);
});

test('an omitted predecessor row, an omitted refusal row or an unexpected row fails the run', async () => {
  const fixture = stubRepo();
  const [a2Id] = A2_REQUIRED_CASES;
  const [fogId] = B_REQUIRED_CASES;
  await assert.rejects(
    run(fixture, {
      a2: passing(A2_REQUIRED_CASES.slice(1)),
      fog: passing(B_REQUIRED_CASES),
    }),
    new RegExp(`missing \\[${a2Id}\\]`),
  );
  await assert.rejects(
    run(fixture, {
      a2: passing(A2_REQUIRED_CASES),
      fog: passing(B_REQUIRED_CASES.slice(1)),
    }),
    new RegExp(`missing \\[${fogId}\\]`),
  );
  await assert.rejects(
    run(fixture, {
      a2: passing(A2_REQUIRED_CASES),
      fog: passing([...B_REQUIRED_CASES, 'fog-extra']),
    }),
    /unexpected \[fog-extra\]/,
  );
});

test('the flip fixture changes only config.fogOfWar and refuses a live pid, a second flip and a missing DB', () => {
  const Database = require('better-sqlite3');
  const db = path.join(scratch, 'flip.sqlite');
  const meta = {
    matchId: 'm1',
    hostPlayerId: 'pid_h',
    playerIds: ['pid_h'],
    sideAssignments: [],
    status: 'active',
    config: { mapRadius: 4, turnLimit: 5, fogOfWar: false },
    seats: [],
  };
  const h = new Database(db);
  h.exec(
    'CREATE TABLE mp_matches (match_id TEXT PRIMARY KEY, status TEXT NOT NULL, room_code TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, meta_json TEXT NOT NULL); CREATE TABLE mp_match_events (match_id TEXT NOT NULL, sequence INTEGER NOT NULL, event_json TEXT NOT NULL, PRIMARY KEY (match_id, sequence));',
  );
  h.prepare(
    "INSERT INTO mp_matches VALUES ('m1', 'active', NULL, 't', 't', ?)",
  ).run(JSON.stringify(meta));
  h.prepare("INSERT INTO mp_match_events VALUES ('m1', 0, ?)").run(
    '{"id":"e0"}',
  );
  h.close();
  const flip = (file, pid) =>
    spawnSync(
      process.execPath,
      [
        '--import',
        import.meta.resolve('tsx'),
        FOG_FIXTURES,
        `--db=${file}`,
        `--stopped-pid=${pid}`,
        'flip',
        '--match=m1',
      ],
      { encoding: 'utf8', windowsHide: true },
    );
  const live = flip(db, process.pid);
  assert.notEqual(live.status, 0);
  assert.match(live.stderr, /not stopped/);
  assert.match(
    flip(path.join(scratch, 'absent.sqlite'), 999_999).stderr,
    /private DB missing/,
  );
  const done = flip(db, 999_999);
  assert.equal(done.status, 0, done.stderr);
  const result = JSON.parse(done.stdout.trim().split('\n').at(-1));
  assert.deepEqual(result.fogOfWar, { before: false, after: true });
  assert.equal(result.events.count, 1);
  const r = new Database(db, { readonly: true });
  const stored = JSON.parse(
    r.prepare('SELECT meta_json FROM mp_matches').pluck().get(),
  );
  r.close();
  assert.deepEqual(stored, {
    ...meta,
    config: { ...meta.config, fogOfWar: true },
  });
  assert.match(flip(db, 999_999).stderr, /not an active fog-off match/);
});

test('the flip fixture refuses a lobby match and a flip that would touch the journal', () => {
  const Database = require('better-sqlite3');
  const make = (name, status, trigger = '') => {
    const file = path.join(scratch, name);
    const db = new Database(file);
    db.exec(
      'CREATE TABLE mp_matches (match_id TEXT PRIMARY KEY, status TEXT NOT NULL, room_code TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, meta_json TEXT NOT NULL); CREATE TABLE mp_match_events (match_id TEXT NOT NULL, sequence INTEGER NOT NULL, event_json TEXT NOT NULL, PRIMARY KEY (match_id, sequence));',
    );
    const meta = {
      matchId: 'm1',
      status,
      config: { mapRadius: 4, turnLimit: 5, fogOfWar: false },
      seats: [],
    };
    db.prepare(
      "INSERT INTO mp_matches VALUES ('m1', ?, NULL, 't', 't', ?)",
    ).run(status, JSON.stringify(meta));
    db.prepare(
      'INSERT INTO mp_match_events VALUES (\'m1\', 0, \'{"id":"e0"}\')',
    ).run();
    if (trigger) db.exec(trigger);
    db.close();
    return file;
  };
  const flip = (file) =>
    spawnSync(
      process.execPath,
      [
        '--import',
        import.meta.resolve('tsx'),
        FOG_FIXTURES,
        `--db=${file}`,
        '--stopped-pid=999999',
        'flip',
        '--match=m1',
      ],
      { encoding: 'utf8', windowsHide: true },
    );
  assert.match(
    flip(make('lobby.sqlite', 'lobby')).stderr,
    /not an active fog-off match/,
  );
  const touching =
    'CREATE TRIGGER touch AFTER UPDATE ON mp_matches BEGIN UPDATE mp_match_events SET event_json = \'{"id":"changed"}\'; END;';
  assert.match(
    flip(make('touch.sqlite', 'active', touching)).stderr,
    /touched the event journal/,
  );
});
