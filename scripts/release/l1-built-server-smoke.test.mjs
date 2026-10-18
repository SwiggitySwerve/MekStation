/**
 * L1-SMOKE-A1 harness falsifiers (node:test; no build, no Jest):
 *   node --test scripts/release/l1-built-server-smoke.test.mjs
 *
 * A test-only stub standalone image (real TCP/WebSocket, durable SQLite file,
 * real wire shapes) is booted through the real runHarness so every harness
 * guarantee is falsified end to end: wrong build/listener/readiness,
 * credential leakage on success and failure, missing public or
 * participant-action controls, premature socket close, failed command
 * propagation, owned-child cleanup, and (CF-SMOKE-1) the frozen
 * stop / offline-fixture / restart / reconnect callbacks. The stub is never
 * product proof; the production proof is the real built-server run.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { A1_REQUIRED_CASES, issueIdentity, openSocket, runA1Cases, runBaseline } from './l1-built-server-socket-cases.mjs';
import { FIXTURES_SCRIPT, createRedactor, parseReadyRecord, runHarness } from './run-l1-built-server-smoke.mjs';

const require = createRequire(import.meta.url);
const BASELINE_CASES = A1_REQUIRED_CASES.filter((id) => id !== 'callbacks-exercised');
const FAST = { readyMs: 5_000, stopMs: 10_000, casesMs: 60_000, commandMs: 30_000, waitMs: 2_000 };
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'l1-smoke-test-'));
const git = (cwd, ...args) => {
  const result = spawnSync('git', ['-c', 'user.email=smoke@test', '-c', 'user.name=smoke', ...args], { cwd, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const portFree = (port) => new Promise((resolve) => { const s = net.createServer().once('error', () => resolve(false)); s.listen(port, '127.0.0.1', () => s.close(() => resolve(true))); });

let counter = 0;
/** A committed throwaway repo carrying a hydrated-looking stub standalone image. */
function stubRepo(mode = 'normal', { buildId = 'stub-build-1', standaloneBuildId = buildId, server = stubSource() } = {}) {
  const repo = path.join(scratch, `repo-${(counter += 1)}`);
  const standalone = path.join(repo, '.next', 'standalone');
  fs.mkdirSync(path.join(standalone, '.next'), { recursive: true });
  fs.mkdirSync(path.join(standalone, 'src'));
  fs.writeFileSync(path.join(repo, '.gitignore'), '.next/\n');
  fs.writeFileSync(path.join(repo, 'README.md'), 'stub\n');
  git(repo, 'init', '-q');
  git(repo, 'add', '.');
  git(repo, 'commit', '-qm', 'stub');
  fs.writeFileSync(path.join(repo, '.next', 'BUILD_ID'), buildId);
  fs.writeFileSync(path.join(standalone, '.next', 'BUILD_ID'), standaloneBuildId);
  fs.writeFileSync(path.join(standalone, 'server.next-config.json'), '{}');
  fs.writeFileSync(path.join(standalone, 'src', 'module.ts'), 'export {};\n');
  fs.writeFileSync(path.join(standalone, 'server.js'), server);
  setMode(repo, mode);
  return { repo, sha: git(repo, 'rev-parse', 'HEAD'), output: path.join(scratch, `run-${counter}`) };
}
function setMode(repo, mode) {
  const config = { mode, ws: require.resolve('ws'), sqlite: require.resolve('better-sqlite3') };
  fs.writeFileSync(path.join(repo, '.next', 'standalone', 'stub-config.json'), JSON.stringify(config));
}
function harness(fixture, runCases, overrides = {}) {
  return runHarness({ repoRoot: fixture.repo, expectedSha: fixture.sha, output: fixture.output, requiredCases: A1_REQUIRED_CASES, limits: FAST, ...overrides }, runCases);
}
function summaryOf(fixture) {
  return JSON.parse(fs.readFileSync(path.join(fixture.output, 'summary.json'), 'utf8'));
}
async function assertCleaned(fixture) {
  const summary = summaryOf(fixture);
  for (const proc of summary.processes) {
    assert.equal(alive(proc.pid), false, `owned pid ${proc.pid} survived`);
    assert.equal(await portFree(proc.port), true, `port ${proc.port} still bound`);
  }
  return summary;
}
/** Every retained file must be free of the raw credentials a run issued. */
function assertNoRetained(fixture, secrets) {
  const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of files(fixture.output)) {
    const text = fs.readFileSync(file, 'latin1');
    for (const secret of secrets) assert.equal(text.includes(secret), false, `${path.basename(file)} retained a credential`);
  }
}
/** Wrap a runCases callback to capture the raw credentials it issues. */
function capturing(runCases) {
  const secrets = [];
  const wrapped = async (ctx) => {
    const add = ctx.redactor.add.bind(ctx.redactor);
    ctx.redactor.add = (label, value) => { secrets.push(value); add(label, value); };
    await runCases(ctx);
  };
  return { secrets, wrapped };
}

test('redactor replaces raw and base64url forms and refuses weak secrets', () => {
  const r = createRedactor();
  r.add('t', 'ab+/cd+/efghijklmnop==');
  assert.equal(r.sanitize('x ab+/cd+/efghijklmnop== y ab-_cd-_efghijklmnop z'), 'x [REDACTED:t] y [REDACTED:t] z');
  assert.deepEqual(r.leaks('ab-_cd-_efghijklmnop'), ['[REDACTED:t]']);
  assert.deepEqual(r.leaks('unrelated'), []);
  assert.throws(() => r.add('short', 'abc'), /weak secret/);
});

test('readiness parser rejects every wrong listener shape', () => {
  const ok = { schema: 'mekstation-packaged-listener-ready/v1', configuredHostname: '127.0.0.1', boundAddress: '127.0.0.1', family: 'IPv4', port: 43700 };
  const line = (record) => `MEKSTATION_LISTENER_READY ${JSON.stringify(record)}`;
  assert.deepEqual(parseReadyRecord(line(ok), 43700), ok);
  for (const bad of [{ ...ok, port: 43701 }, { ...ok, boundAddress: '0.0.0.0' }, { ...ok, family: 'IPv6' }, { ...ok, configuredHostname: 'localhost' }, { ...ok, extra: 1 }, { ...ok, schema: 'v0' }]) {
    assert.throws(() => parseReadyRecord(line(bad), 43700), /wrong listener/);
  }
  assert.throws(() => parseReadyRecord('MEKSTATION_LISTENER_READY not-json', 43700), /wrong listener/);
});

test('happy path: all A1 cases pass, callbacks run, nothing retained, owned children cleaned', async () => {
  const fixture = stubRepo('normal');
  const { secrets, wrapped } = capturing(runA1Cases);
  const summary = await harness(fixture, wrapped);
  assert.equal(summary.verdict, 'PASS');
  assert.deepEqual([...summary.passed].sort(), [...A1_REQUIRED_CASES].sort());
  assert.equal(summary.processes.length, 2, 'stop + restart produced a second owned process');
  assert.equal(secrets.length, 6);
  assertNoRetained(fixture, secrets);
  await assertCleaned(fixture);
  const evidence = fs.readFileSync(path.join(fixture.output, 'evidence.jsonl'), 'utf8');
  assert.match(evidence, /\[REDACTED:host-token\]/);
  assert.match(evidence, /"kind":"offline-fixture"/);
  const offline = evidence.split('\n').filter(Boolean).map((line) => JSON.parse(line)).find((row) => row.kind === 'offline-fixture');
  assert.equal(offline.dbAfter, offline.dbBefore, 'read-only lineage must not change the private DB');
});

test('M13: a raw credential written into the run directory by extension code fails the run', async () => {
  const fixture = stubRepo('normal');
  const { secrets, wrapped } = capturing(async (ctx) => {
    await runA1Cases(ctx);
    fs.writeFileSync(path.join(ctx.evidence.dir, 'extension.txt'), secrets[0]);
  });
  const failure = await harness(fixture, wrapped).then(() => null, (error) => error);
  assert.match(failure?.message ?? '', /retained credential: extension\.txt:\[REDACTED:host-token\]/);
  assert.equal(failure.message.includes(secrets[0]), false);
  await assertCleaned(fixture);
});

test('R10: a private DB that pre-exists before boot fails the run', async () => {
  const fixture = stubRepo('normal');
  const standalone = path.join(fixture.repo, '.next', 'standalone');
  const script = `const fs = require('fs'); for (const f of ${JSON.stringify([path.join(fixture.repo, '.next', 'BUILD_ID'), path.join(standalone, '.next', 'BUILD_ID')])}) fs.writeFileSync(f, 'stub-build-2'); fs.writeFileSync(${JSON.stringify(path.join(fixture.output, 'db', 'smoke.sqlite'))}, 'x');`;
  await assert.rejects(harness(fixture, runA1Cases, { build: true, buildCommand: [process.execPath, '-e', script] }), /private DB already exists/);
  assert.equal(summaryOf(fixture).processes.length, 0);
});

test('CF-SMOKE-1: stop, offline fixture, restart and reconnect callbacks are guarded and observable', async () => {
  const fixture = stubRepo('normal');
  const seen = {};
  const summary = await harness(fixture, async (ctx) => {
    const base = await runBaseline(ctx);
    await assert.rejects(ctx.prepareOffline(undefined, ['lineage']), /must be stopped|require the owned server to be stopped/);
    const firstPid = ctx.pid;
    await ctx.stop();
    assert.equal(alive(firstPid), false);
    assert.equal(await portFree(ctx.port), true);
    await assert.rejects(ctx.stop(), /no owned server/);
    const lineage = await ctx.prepareOffline(FIXTURES_SCRIPT, ['lineage', '--match=m1']);
    seen.lineage = lineage.matches[0];
    const live = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)'], { windowsHide: true });
    const refused = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), FIXTURES_SCRIPT, `--db=${path.join(fixture.output, 'db', 'smoke.sqlite')}`, `--stopped-pid=${live.pid}`, 'lineage'], { encoding: 'utf8', windowsHide: true });
    live.kill();
    seen.refusedStatus = refused.status;
    await ctx.restart();
    seen.restartPid = ctx.pid;
    const { conn, replay } = await ctx.reconnect(base.conns.spectator);
    seen.replayIds = replay.filter((m) => m.kind === 'ReplayChunk').flatMap((m) => m.events.map((e) => e.id));
    seen.baseIds = base.replayed.map((r) => r.event.id);
    conn.close();
    ctx.pass('cf-smoke-1', seen);
  }, { requiredCases: [...BASELINE_CASES, 'cf-smoke-1'] });
  assert.equal(summary.verdict, 'PASS');
  assert.equal(seen.lineage.status, 'active');
  assert.ok(seen.lineage.seats.some((s) => s.kind === 'spectator'));
  assert.notEqual(seen.refusedStatus, 0, 'fixture must refuse while the owning pid is alive');
  assert.ok(seen.restartPid > 0);
  assert.ok(seen.baseIds.every((id) => seen.replayIds.includes(id)), 'reconnect after restart replays persisted public facts');
  await assertCleaned(fixture);
});

test('CF-SMOKE-1: restart refuses a changed image', async () => {
  const fixture = stubRepo('normal');
  await assert.rejects(harness(fixture, async (ctx) => {
    await ctx.stop();
    fs.appendFileSync(path.join(fixture.repo, '.next', 'standalone', 'server.js'), '\n// changed\n');
    await ctx.restart();
  }, { requiredCases: ['restart'] }), /changed image on restart/);
  await assertCleaned(fixture);
});

test('wrong build: SHA mismatch, dirty or untracked source, standalone BUILD_ID mismatch, missing markers, stale build', async () => {
  const sha = stubRepo('normal');
  await assert.rejects(harness({ ...sha, sha: 'f'.repeat(40) }, runA1Cases), /wrong build source: HEAD/);
  const dirty = stubRepo('normal');
  fs.writeFileSync(path.join(dirty.repo, 'README.md'), 'changed\n');
  await assert.rejects(harness(dirty, runA1Cases), /tracked changes/);
  const untracked = stubRepo('normal');
  fs.writeFileSync(path.join(untracked.repo, 'untracked.ts'), 'export {};\n');
  await assert.rejects(harness(untracked, runA1Cases), /uncommitted or untracked changes/);
  await assert.rejects(harness(stubRepo('normal', { standaloneBuildId: 'other' }), runA1Cases), /standalone BUILD_ID/);
  await assert.rejects(harness(stubRepo('normal', { server: 'console.log(1)' }), runA1Cases), /lacks/);
  const stale = stubRepo('normal');
  await assert.rejects(harness(stale, runA1Cases, { build: true, buildCommand: [process.execPath, '-e', 'process.exit(0)'] }), /BUILD_ID unchanged/);
  assert.equal(summaryOf(stale).processes.length, 0, 'no server started on a wrong build');
});

test('wrong listener or readiness fails before any case runs', async () => {
  for (const [mode, pattern] of [['wrong-port', /wrong listener/], ['wrong-address', /wrong listener/], ['two-ready', /readiness records/], ['no-ready', /no readiness record/]]) {
    const fixture = stubRepo(mode);
    let ran = false;
    await assert.rejects(harness(fixture, async () => { ran = true; }, { requiredCases: ['never'] }), pattern, mode);
    assert.equal(ran, false, mode);
    await assertCleaned(fixture);
  }
});

test('early server exit fails the run even when cases pass', async () => {
  const fixture = stubRepo('exit-after-ready');
  await assert.rejects(harness(fixture, async (ctx) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    ctx.pass('slept', {});
  }, { requiredCases: ['slept'] }), /exited early/);
  await assertCleaned(fixture);
});

test('failed commands propagate: build exit code and runCases errors', async () => {
  const build = stubRepo('normal');
  await assert.rejects(harness(build, runA1Cases, { build: true, buildCommand: [process.execPath, '-e', 'process.exit(3)'] }), /command build exited 3/);
  assert.equal(summaryOf(build).processes.length, 0);
  const cases = stubRepo('normal');
  await assert.rejects(harness(cases, async () => { throw new Error('case boom'); }), /case boom/);
  assert.equal(summaryOf(cases).verdict, 'FAIL');
  await assertCleaned(cases);
});

test('case enumeration: missing, unexpected and duplicate rows fail', async () => {
  await assert.rejects(harness(stubRepo('normal'), async (ctx) => ctx.pass(A1_REQUIRED_CASES[0], {})), /missing \[/);
  await assert.rejects(harness(stubRepo('normal'), async (ctx) => { for (const id of [...A1_REQUIRED_CASES, 'extra']) ctx.pass(id, {}); }), /unexpected \[extra\]/);
  await assert.rejects(harness(stubRepo('normal'), async (ctx) => { ctx.pass('x', {}); ctx.pass('x', {}); }), /recorded twice/);
});

test('credential leakage fails on server output and frames; failure output stays redacted', async () => {
  for (const [mode, pattern] of [['log-token', /output leaked \[REDACTED:host-token\]/], ['echo-token', /credential echoed in a server frame/]]) {
    const fixture = stubRepo(mode);
    const { secrets, wrapped } = capturing(runA1Cases);
    const failure = await harness(fixture, wrapped).then(() => null, (error) => error);
    assert.match(failure?.message ?? '', pattern, mode);
    for (const secret of secrets) assert.equal(failure.message.includes(secret), false, 'error message carries a credential');
    assertNoRetained(fixture, secrets);
    await assertCleaned(fixture);
  }
});

test('missing controls cannot pass: public replay/live, actions, refusals, seat kind, HTTP echo, stalled or gapped delivery', async () => {
  for (const [mode, pattern] of [['no-public', /\[spectator-replay-public\]/], ['reject-actions', /\[participant-action-accepted\]/], ['spectator-acts', /\[spectator-cannot-act\]/], ['drop-live', /timeout waiting for live public fact/],
    ['accept-malformed', /\[credential-malformed-refused\]/], ['accept-url-token', /\[credential-url-refused\]/], ['accept-foreign', /\[credential-foreign-refused\]/],
    ['seat-human', /\[spectator-seat-witnessed\]/], ['http-echo-token', /\[credential-redaction\]/], ['stall-after-refusal', /\[spectator-cannot-act\]/],
    ['live-gap', /\[spectator-live-public\]/]]) {
    const fixture = stubRepo(mode);
    await assert.rejects(harness(fixture, runA1Cases), pattern, mode);
    assert.equal(summaryOf(fixture).verdict, 'FAIL');
    await assertCleaned(fixture);
  }
});

test('premature socket close fails the pending wait', async () => {
  const fixture = stubRepo('close-on-join');
  await assert.rejects(harness(fixture, runA1Cases), /premature close/);
  await assertCleaned(fixture);
});

test('refused upgrades and identities use the subprotocol, never the URL', async () => {
  const fixture = stubRepo('normal');
  await harness(fixture, async (ctx) => {
    const id = await issueIdentity(ctx, 'probe');
    const conn = await openSocket(ctx, id, 'm1');
    assert.equal(conn.ws.url.includes(id.wire), false);
    assert.deepEqual([...new URL(conn.ws.url).searchParams.keys()], ['matchId']);
    assert.equal(conn.ws.protocol, 'mekstation.v1');
    conn.close();
    await assert.rejects(openSocket(ctx, id, 'm1', { label: 'bad', protocols: ['mekstation.v1', 'mekstation.token.bm90'] }), (error) => error.status === 401);
    ctx.pass('subprotocol', {});
  }, { requiredCases: ['subprotocol'] });
  await assertCleaned(fixture);
});

test('never kills a process it did not start', async () => {
  const bystander = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { windowsHide: true });
  try {
    const fixture = stubRepo('normal');
    await assert.rejects(harness(fixture, async () => { throw new Error('fail fast'); }), /fail fast/);
    await assertCleaned(fixture);
    assert.equal(alive(bystander.pid), true);
  } finally {
    bystander.kill();
  }
});

test.after(() => fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 5 }));

/** Test-only stub standalone server.js (CommonJS), written into each throwaway repo. */
function stubSource() {
  return String.raw`'use strict';
// Harness falsifier stub standalone server (test-only). It speaks the real
// wire shapes over real TCP/WebSocket so runHarness and the cases module are
// exercised end to end; it is never used as product proof.
// markers: server.on('upgrade' /api/multiplayer/socket bindMultiplayerSocketConnection MEKSTATION_LISTENER_READY
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'stub-config.json'), 'utf8'));
const { WebSocketServer } = require(cfg.ws);
const Database = require(cfg.sqlite);
const mode = cfg.mode;
const port = Number(process.env.PORT);
const db = new Database(process.env.MULTIPLAYER_DB_PATH);
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS mp_matches (match_id TEXT PRIMARY KEY, status TEXT NOT NULL, room_code TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, meta_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS mp_match_events (match_id TEXT NOT NULL, sequence INTEGER NOT NULL, event_json TEXT NOT NULL, PRIMARY KEY (match_id, sequence));');
const now = () => new Date().toISOString();
const load = (id) => { const row = db.prepare('SELECT meta_json FROM mp_matches WHERE match_id = ?').get(id); return row ? JSON.parse(row.meta_json) : null; };
const save = (meta) => db.prepare('INSERT INTO mp_matches VALUES (?, ?, NULL, ?, ?, ?) ON CONFLICT(match_id) DO UPDATE SET status = excluded.status, meta_json = excluded.meta_json').run(meta.matchId, meta.status, now(), now(), JSON.stringify(meta));
const eventsOf = (id) => db.prepare('SELECT event_json FROM mp_match_events WHERE match_id = ? ORDER BY sequence').all(id).map((r) => JSON.parse(r.event_json));
const append = (id, type, payload) => { const seq = eventsOf(id).length; const event = { id: 'evt-' + id + '-' + seq, type, payload }; db.prepare('INSERT INTO mp_match_events VALUES (?, ?, ?)').run(id, seq, JSON.stringify(event)); return event; };
const decode = (b64) => { try { const t = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')); return typeof t.playerId === 'string' && t.signature ? t : null; } catch { return null; } };
const bearer = (req) => decode(String(req.headers.authorization || '').replace(/^Bearer /, ''));
const sockets = new Set();
const spectatorIds = new Set();
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const server = http.createServer((req, res) => {
  const who = bearer(req);
  if (req.method === 'POST' && req.url === '/api/multiplayer/matches' && who) {
    const meta = { matchId: 'm1', hostPlayerId: who.playerId, status: 'lobby', config: { mapRadius: 4, turnLimit: 5, fogOfWar: false }, playerIds: [who.playerId], sideAssignments: [], seats: [{ slotId: 'alpha-1', kind: 'human', occupant: { playerId: who.playerId }, ready: false }, { slotId: 'bravo-1', kind: 'human', occupant: null, ready: false }] };
    save(meta);
    append('m1', 'game_started', { firstSide: 'player' });
    const echo = mode === 'http-echo-token' ? { echo: String(req.headers.authorization).slice(7) } : {};
    return json(res, 201, { matchId: 'm1', wsUrl: 'ws://127.0.0.1:' + port + '/api/multiplayer/socket?matchId=m1', meta, ...echo });
  }
  if (req.method === 'POST' && req.url === '/api/multiplayer/matches/m1/spectate' && who) {
    const meta = load('m1');
    meta.seats.push({ slotId: 'spectator-1', kind: mode === 'seat-human' ? 'human' : 'spectator', occupant: { playerId: who.playerId }, ready: true });
    spectatorIds.add(who.playerId);
    save(meta);
    return json(res, 201, { slotId: 'spectator-1', matchId: 'm1' });
  }
  json(res, 404, { error: 'not found' });
});
const wss = new WebSocketServer({ noServer: true, handleProtocols: () => 'mekstation.v1' });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x');
  const entry = String(req.headers['sec-websocket-protocol'] || '').split(',').map((s) => s.trim()).find((s) => s.startsWith('mekstation.token.'));
  if (mode === 'log-token') console.log('[stub] upgrade protocol ' + req.headers['sec-websocket-protocol']);
  const reject = (status) => { socket.write('HTTP/1.1 ' + status + '\r\nContent-Length: 0\r\n\r\n'); socket.destroy(); };
  if (url.searchParams.has('token') && mode !== 'accept-url-token') return reject('400 Bad Request');
  const wire = entry ? Buffer.from(entry.slice(17).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('base64') : '';
  const token = entry ? decode(wire) : null;
  if (!token && !(mode === 'accept-malformed' && entry)) return reject('401 Unauthorized');
  wss.handleUpgrade(req, socket, head, (ws) => { ws.verified = token ? token.playerId : 'pid_malformed'; ws.wire = wire; ws.delivery = 0; sockets.add(ws); ws.on('close', () => sockets.delete(ws)); ws.on('message', (raw) => onMessage(ws, JSON.parse(String(raw)))); });
});
const send = (ws, message) => ws.send(JSON.stringify({ matchId: 'm1', ts: now(), ...message }));
const lobby = (intentId) => { const meta = load('m1'); return { kind: 'LobbyUpdated', ...(intentId ? { intentId } : {}), seats: meta.seats, status: meta.status, hostPlayerId: meta.hostPlayerId }; };
const nextDelivery = (ws) => {
  if (ws.spectator && mode === 'live-gap' && !ws.gapped) ws.delivery += (ws.gapped = 1);
  return ws.spectator && ws.stalled ? ws.delivery - 1 : ws.delivery++;
};
const broadcastEvent = (event) => { for (const ws of sockets) if (ws.joined && !(mode === 'drop-live' && ws.spectator)) send(ws, { kind: 'Event', event, deliverySequence: nextDelivery(ws) }); };
function onMessage(ws, m) {
  if (m.kind === 'SessionJoin') {
    const foreign = m.playerId !== ws.verified;
    if (foreign && mode !== 'accept-foreign') { send(ws, { kind: 'Error', code: 'AUTH_REJECTED', reason: 'player-mismatch' }); send(ws, { kind: 'Close', code: 'AUTH_REJECTED', reason: 'player-mismatch' }); return ws.close(1008, 'player-mismatch'); }
    if (mode === 'close-on-join') return ws.terminate();
    const meta = load('m1');
    ws.spectator = spectatorIds.has(ws.verified) || meta.seats.some((s) => s.kind === 'spectator' && s.occupant && s.occupant.playerId === ws.verified);
    const events = mode === 'no-public' && ws.spectator ? [] : eventsOf('m1');
    send(ws, { kind: 'ReplayStart', totalEvents: events.length, fromDeliverySequence: 0 });
    if (events.length) send(ws, { kind: 'ReplayChunk', events, deliverySequences: events.map((_, i) => i) });
    ws.delivery = events.length;
    send(ws, { kind: 'ReplayEnd', toDeliverySequence: Math.max(0, events.length - 1), ...(mode === 'echo-token' ? { note: ws.wire } : {}) });
    ws.joined = true;
    send(ws, lobby());
    if (foreign) { send(ws, { kind: 'Close', code: 'AUTH_REJECTED', reason: 'player-mismatch' }); return ws.close(1008, 'player-mismatch'); }
    return console.log('[mp-socket] session joined matchId=m1 playerId=' + ws.verified);
  }
  if (m.kind !== 'Intent') return;
  const meta = load('m1');
  const intent = m.intent;
  const reply = (message) => { for (const peer of sockets) if (peer.joined) send(peer, message); };
  if (intent.kind === 'AdvancePhase') {
    if (ws.spectator && mode === 'stall-after-refusal') ws.stalled = true;
    if (ws.spectator && mode !== 'spectator-acts') return reply({ kind: 'Error', code: 'INVALID_INTENT', reason: 'spectator-cannot-act', intentId: m.intentId });
    if (mode === 'reject-actions') return reply({ kind: 'Error', code: 'INVALID_INTENT', reason: 'out-of-phase', intentId: m.intentId });
    return broadcastEvent(append('m1', 'phase_changed', { intentId: m.intentId }));
  }
  const seat = meta.seats.find((s) => s.slotId === intent.slotId);
  if (intent.kind === 'OccupySeat') seat.occupant = { playerId: ws.verified };
  if (intent.kind === 'SetReady') seat.ready = intent.ready;
  if (intent.kind === 'LaunchMatch') meta.status = 'active';
  save(meta);
  reply(lobby(m.intentId));
}
server.listen(port, '127.0.0.1', () => {
  const record = { schema: 'mekstation-packaged-listener-ready/v1', configuredHostname: '127.0.0.1', boundAddress: mode === 'wrong-address' ? '0.0.0.0' : '127.0.0.1', family: 'IPv4', port: mode === 'wrong-port' ? port + 1 : port };
  const line = 'MEKSTATION_LISTENER_READY ' + JSON.stringify(record) + '\n';
  if (mode !== 'no-ready') process.stdout.write(mode === 'two-ready' ? line + line : line);
  if (mode === 'exit-after-ready') setTimeout(() => process.exit(3), 200);
});
`;
}
