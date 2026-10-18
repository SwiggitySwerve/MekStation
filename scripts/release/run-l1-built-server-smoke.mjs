#!/usr/bin/env node
/**
 * L1-SMOKE-A1 built-server socket smoke harness; frozen interface that A2/B import read-only.
 *   node scripts/release/run-l1-built-server-smoke.mjs --build --expected-sha=<sha> --output=<abs-new-dir> [--repo-root=<abs>]
 * runHarness(options, runCases): SHA check, normal production build, hydrated image identity, owned production
 * server on 127.0.0.1, then runCases(ctx) with check/pass, stop, restart (same image/port/DB), reconnect and
 * prepareOffline (stopped server only). Each required case passes exactly once; any retained credential fails.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { A1_REQUIRED_CASES, openSocket, runA1Cases } from './l1-built-server-socket-cases.mjs';

const READY = 'MEKSTATION_LISTENER_READY ';
const SCRUB = /^(E2E|PLAYWRIGHT|NEXT_PUBLIC_E2E|CAMP0|MEKSTATION_|MULTIPLAYER_|JEST|__NEXT|NODE_OPTIONS$|HOSTNAME$|PORT$|DATABASE_PATH$|NODE_ENV$)/i;
const WIN = process.platform === 'win32';
export const FIXTURES_SCRIPT = fileURLToPath(new URL('./l1-built-server-fixtures.ts', import.meta.url));
export const LIMITS = Object.freeze({ buildMs: 1_200_000, readyMs: 120_000, stopMs: 15_000, casesMs: 600_000, commandMs: 90_000, waitMs: 15_000 });
/** Secret registry: each value is redacted from retained output in raw and base64url form. */
export function createRedactor() {
  const secrets = [];
  const add = (label, value) => {
    if (typeof value !== 'string' || value.length < 16) throw new Error(`redactor: refusing weak secret ${label}`);
    for (const form of new Set([value, value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')])) secrets.push([form, `[REDACTED:${label}]`]);
  };
  const sanitize = (text) => secrets.reduce((out, [secret, mark]) => out.split(secret).join(mark), String(text));
  return { add, sanitize, leaks: (text) => [...new Set(secrets.filter(([secret]) => String(text).includes(secret)).map(([, mark]) => mark))] };
}
/** The single listener record must name the requested IPv4 loopback port exactly. */
export function parseReadyRecord(line, port) {
  let r = null;
  try { r = JSON.parse(line.slice(READY.length)); } catch { /* rejected below */ }
  const exact = line.startsWith(READY) && r && JSON.stringify(r) === line.slice(READY.length) && Object.keys(r).join() === 'schema,configuredHostname,boundAddress,family,port';
  const loopback = exact && r.schema === 'mekstation-packaged-listener-ready/v1' && r.configuredHostname === '127.0.0.1' && r.boundAddress === '127.0.0.1';
  if (!loopback || r.family !== 'IPv4' || r.port !== port) throw new Error(`wrong listener: ${line.slice(0, 300)}`);
  return r;
}
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const treeSha = (dir) => sha256(walk(dir).sort().map((f) => `${path.relative(dir, f)}:${sha256(fs.readFileSync(f))}`).join('\n'));
const env = (extra) => ({ ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !SCRUB.test(k))), NEXT_TELEMETRY_DISABLED: '1', ...extra });
const portFree = (port) => new Promise((ok) => { const s = net.createServer().once('error', () => ok(false)); s.listen(port, '127.0.0.1', () => s.close(() => ok(true))); });
const withTimeout = (promise, ms, what) => {
  let timer;
  return Promise.race([promise, new Promise((_, no) => { timer = setTimeout(() => no(new Error(`timeout: ${what} after ${ms}ms`)), ms); })]).finally(() => clearTimeout(timer));
};
/** Kill only the given owned child and its own tree; never a name-based kill. */
function killOwned(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (WIN) spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
  else child.kill('SIGKILL');
}
/** Hydrated standalone image identity; any mismatch is a wrong build. */
export function imageIdentity(repoRoot, standaloneDir) {
  const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').trim();
  const [buildId, standaloneBuildId, server] = [read(repoRoot, '.next', 'BUILD_ID'), read(standaloneDir, '.next', 'BUILD_ID'), read(standaloneDir, 'server.js')];
  if (buildId !== standaloneBuildId) throw new Error(`wrong build: standalone BUILD_ID ${standaloneBuildId} != ${buildId}`);
  const lacks = ["server.on('upgrade'", '/api/multiplayer/socket', 'bindMultiplayerSocketConnection', READY.trim()].find((m) => !server.includes(m));
  if (lacks) throw new Error(`wrong build: standalone server.js lacks ${lacks}`);
  const config = read(standaloneDir, 'server.next-config.json');
  return { buildId, serverSha256: sha256(server), configSha256: sha256(config), sourceTreeSha256: treeSha(path.join(standaloneDir, 'src')) };
}
function gitSource(repoRoot, expectedSha) {
  const git = (...args) => spawnSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8', windowsHide: true });
  const [head, status] = [git('rev-parse', 'HEAD'), git('status', '--porcelain', '--untracked-files=no')];
  if (head.status !== 0 || status.status !== 0) throw new Error(`git failed in ${repoRoot}`);
  if (head.stdout.trim() !== expectedSha) throw new Error(`wrong build source: HEAD ${head.stdout.trim()} != expected ${expectedSha}`);
  if (status.stdout.trim()) throw new Error('wrong build source: tracked changes present');
  return { head: expectedSha, clean: true };
}
/** One verified run; runCases(ctx) must ctx.pass() each options.requiredCases id exactly once. */
export async function runHarness(options, runCases) {
  const { expectedSha, output, requiredCases: required = [] } = options;
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  if (!/^[0-9a-f]{40}$/.test(expectedSha ?? '')) throw new Error('options.expectedSha must be a full 40-hex SHA');
  if (typeof output !== 'string' || !path.isAbsolute(output)) throw new Error('options.output must be an absolute path');
  if (!Array.isArray(required) || !required.length || new Set(required).size !== required.length) throw new Error('options.requiredCases must list unique ids');
  if (!process.version.startsWith('v22.')) throw new Error(`Node 22 required, got ${process.version}`);
  fs.mkdirSync(output);
  fs.mkdirSync(path.join(output, 'db'));
  const limits = { ...LIMITS, ...options.limits };
  const standaloneDir = path.resolve(options.standaloneDir ?? path.join(repoRoot, '.next', 'standalone'));
  const dbPath = path.join(output, 'db', 'smoke.sqlite');
  const redactor = createRedactor();
  const save = (name, value) => fs.writeFileSync(path.join(output, name), `${redactor.sanitize(JSON.stringify(value, null, 2))}\n`);
  const record = (kind, data) => fs.appendFileSync(path.join(output, 'evidence.jsonl'), `${redactor.sanitize(JSON.stringify({ at: new Date().toISOString(), kind, ...data }))}\n`);
  const manifest = { node: process.version, platform: process.platform, repoRoot, standaloneDir, dbPath, required, built: Boolean(options.build) };
  const [processes, passed, failures] = [[], new Map(), []];
  let current = null;
  /** Owned command with bounded time; a non-zero exit rejects with its sanitized tail. */
  async function command(label, file, args, timeoutMs = limits.commandMs) {
    const started = Date.now();
    const child = spawn(file, args, { cwd: repoRoot, env: env({}), windowsHide: true, shell: WIN && /\.cmd$/i.test(file), stdio: ['ignore', 'pipe', 'pipe'] });
    let [stdout, tail] = ['', ''];
    child.stdout.on('data', (chunk) => { stdout += chunk; tail = (tail + chunk).slice(-4000); });
    child.stderr.on('data', (chunk) => { tail = (tail + chunk).slice(-4000); });
    const code = await withTimeout(new Promise((ok, no) => child.once('error', no).once('exit', ok)), timeoutMs, label).finally(() => killOwned(child));
    record('command', { label, file: path.basename(file), args, exitCode: code, ms: Date.now() - started });
    if (code !== 0) throw new Error(`command ${label} exited ${code}: ${redactor.sanitize(tail)}`);
    return stdout;
  }
  async function startServer(port) {
    const n = processes.length + 1;
    const serverEnv = env({ NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), MULTIPLAYER_STORE: 'durable', DATABASE_PATH: dbPath, MULTIPLAYER_DB_PATH: dbPath });
    const child = spawn(process.execPath, [path.join(standaloneDir, 'server.js')], { cwd: standaloneDir, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const proc = (current = { n, pid: child.pid, port, child, ready: [], log: '', exit: null, expectedExit: false });
    processes.push(proc);
    let pending = '';
    const take = (stdout) => (chunk) => {
      const text = chunk.toString();
      for (const mark of redactor.leaks(text)) failures.push(`server-${n} output leaked ${mark}`);
      proc.log += redactor.sanitize(text);
      fs.appendFileSync(path.join(output, `server-${n}.log`), redactor.sanitize(text));
      for (pending += stdout ? text : ''; pending.includes('\n'); pending = pending.slice(pending.indexOf('\n') + 1)) {
        const line = pending.slice(0, pending.indexOf('\n')).replace(/\r$/, '');
        if (line.includes(READY.trim())) proc.ready.push(line);
      }
    };
    child.stdout.on('data', take(true));
    child.stderr.on('data', take(false));
    proc.exited = new Promise((resolve) => child.once('exit', (code, signal) => {
      proc.exit = { code, signal };
      if (!proc.expectedExit) failures.push(`server-${n} (pid ${proc.pid}) exited early ${code ?? signal}`);
      resolve();
    }));
    for (const end = Date.now() + limits.readyMs; !proc.ready.length && !proc.exit && Date.now() < end; ) await delay(50);
    if (!proc.ready.length) throw new Error(`server-${n} produced no readiness record (exit ${JSON.stringify(proc.exit)})`);
    const ready = parseReadyRecord(proc.ready[0], port);
    const probe = await fetch(`http://127.0.0.1:${port}/api/multiplayer/invites/ZZZZZZ`, { signal: AbortSignal.timeout(15_000) });
    if (probe.status !== 404 || proc.ready.length !== 1) throw new Error(`wrong listener: probe ${probe.status}, ${proc.ready.length} readiness records`);
    record('process', { event: 'ready', n, pid: proc.pid, port, ready, probeStatus: probe.status });
    return proc;
  }
  async function stop() {
    const proc = current;
    if (!proc) throw new Error('stop: no owned server is running');
    killOwned(Object.assign(proc, { expectedExit: true }).child);
    await withTimeout(proc.exited, limits.stopMs, `server-${proc.n} stop`);
    let released = false;
    for (let i = 0; i < 50 && !(released = await portFree(proc.port)); i += 1) await delay(100);
    if (!released || proc.ready.length !== 1) throw new Error(`stop: port ${proc.port} released=${released}, ${proc.ready.length} readiness records`);
    current = null;
    record('process', { event: 'stopped', n: proc.n, pid: proc.pid, exit: proc.exit, portReleased: true });
  }
  const ctx = {
    limits, redactor, stop, evidence: { dir: output, record },
    get pid() { return current?.pid ?? null; },
    serverOutput: () => current?.log ?? '',
    check(ok, id, message, observed) {
      if (!ok) throw new Error(`[${id}] ${message}: ${JSON.stringify(observed ?? null).slice(0, 1200)}`);
    },
    pass(id, observation) {
      if (passed.has(id)) throw new Error(`case ${id} recorded twice`);
      passed.set(id, observation);
      record('case', { id, verdict: 'pass', observation });
    },
    async restart() {
      const { port } = processes.at(-1);
      if (current) await stop();
      if (JSON.stringify(imageIdentity(repoRoot, standaloneDir)) !== JSON.stringify(manifest.image)) throw new Error('changed image on restart');
      const proc = await startServer(port);
      record('process', { event: 'restarted', n: proc.n, pid: proc.pid, port, image: manifest.image });
    },
    async reconnect(conn, joinOptions) {
      conn.close();
      const next = await openSocket(ctx, conn.identity, conn.matchId, { label: `${conn.label}+r${processes.length}` });
      const replay = await next.join(joinOptions);
      record('reconnect', { from: conn.label, to: next.label, pid: current?.pid, replayFrames: replay.length });
      return { conn: next, replay };
    },
    async prepareOffline(script = FIXTURES_SCRIPT, args = []) {
      if (current) throw new Error('offline fixtures require the owned server to be stopped');
      const digest = () => sha256(['', '-wal'].map((s) => (fs.existsSync(dbPath + s) ? sha256(fs.readFileSync(dbPath + s)) : '-')).join());
      const before = digest();
      const argv = ['--import', import.meta.resolve('tsx'), script, `--db=${dbPath}`, `--stopped-pid=${processes.at(-1)?.pid ?? 0}`, ...args];
      const result = JSON.parse((await command('offline-fixture', process.execPath, argv)).trim().split('\n').at(-1));
      record('offline-fixture', { script: path.relative(repoRoot, script), args, dbBefore: before, dbAfter: digest(), result });
      return result;
    },
  };
  let failure = null;
  try {
    manifest.source = gitSource(repoRoot, expectedSha);
    const buildIdFile = path.join(repoRoot, '.next', 'BUILD_ID');
    const priorBuildId = fs.existsSync(buildIdFile) ? fs.readFileSync(buildIdFile, 'utf8').trim() : null;
    const [file, ...args] = options.buildCommand ?? [WIN ? 'npm.cmd' : 'npm', 'run', 'build'];
    if (options.build) await command('build', file, args, limits.buildMs);
    manifest.image = imageIdentity(repoRoot, standaloneDir);
    if (options.build && manifest.image.buildId === priorBuildId) throw new Error('wrong build: BUILD_ID unchanged by the build');
    if (fs.existsSync(dbPath)) throw new Error('private DB already exists');
    const probe = net.createServer();
    const port = await new Promise((ok) => probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(() => ok(p)); }));
    Object.assign(ctx, { port, origin: `http://127.0.0.1:${port}`, wsOrigin: `ws://127.0.0.1:${port}`, identity: manifest.image });
    save('manifest.json', manifest);
    await startServer(port);
    await withTimeout(runCases(ctx), limits.casesMs, 'runCases');
    const [missing, unexpected] = [required.filter((id) => !passed.has(id)), [...passed.keys()].filter((id) => !required.includes(id))];
    if (missing.length || unexpected.length) throw new Error(`case enumeration mismatch: missing [${missing}] unexpected [${unexpected}]`);
  } catch (error) {
    failure = error;
  } finally {
    for (const proc of processes) killOwned(Object.assign(proc, { expectedExit: true }).child);
    await Promise.all(processes.map((proc) => withTimeout(proc.exited, limits.stopMs, 'final stop').catch(() => {})));
    if (processes.length && !(await portFree(processes.at(-1).port))) failures.push(`port ${processes.at(-1).port} still bound after cleanup`);
  }
  const retained = walk(output).flatMap((file) => redactor.leaks(fs.readFileSync(file, 'latin1')).map((mark) => `${path.relative(output, file)}:${mark}`));
  const errors = [failure?.message, ...failures, retained.length && `retained credential: ${retained}`].filter(Boolean).map(redactor.sanitize);
  const processRows = processes.map(({ n, pid, port, exit, ready }) => ({ n, pid, port, exit, readyRecords: ready.length }));
  const summary = { verdict: errors.length ? 'FAIL' : 'PASS', required, passed: [...passed.keys()], errors, processes: processRows, manifest };
  save('summary.json', summary);
  if (errors.length) throw Object.assign(new Error(`L1 built-server smoke FAIL: ${errors.join(' | ')}`), { summary });
  return summary;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const options = { build: process.argv.includes('--build'), expectedSha: arg('expected-sha'), output: arg('output'), repoRoot: arg('repo-root'), requiredCases: A1_REQUIRED_CASES };
  runHarness(options, runA1Cases).then(
    (summary) => console.log(JSON.stringify({ verdict: summary.verdict, passed: summary.passed, output: options.output })),
    (error) => { console.error(error.message); process.exitCode = 1; },
  );
}
