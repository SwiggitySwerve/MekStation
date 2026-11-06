import { parse } from '@babel/parser';
import { chromium } from '@playwright/test';
// NEVER MERGE: opt-in G6-042 observations, not a product or retry change.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CI_SUITES,
  planShards,
  collectTests,
  assertSameTests,
} from './ci-e2e-plan.mjs';

const bytes = (text, key) => {
  const value = new RegExp(`^${key}:\\s+(\\d+) kB$`, 'm').exec(text)?.[1];
  return value === undefined ? null : Number(value) * 1024;
};
export const BROWSER_MAIN_MAXRSS_MEANING =
  'Browser main process maxrss; it does not bound descendant renderer VmHWM or simultaneous process-tree RSS.';
let sequence = 0;
export function record(kind, data = {}, identity = {}) {
  if (process.env.MEKSTATION_G6_042 !== '1') return;
  const root = process.env.MEKSTATION_G6_042_ROOT;
  assert.ok(
    root && path.isAbsolute(root),
    'Absolute diagnostic output required',
  );
  fs.mkdirSync(root, { recursive: true });
  const row = {
    schema: 'g6-042-causal-state/v1',
    kind,
    data,
    ...identity,
    at: new Date().toISOString(),
    monotonicNs: process.hrtime.bigint().toString(),
    sequence: ++sequence,
    run: process.env.GITHUB_RUN_ID,
    attempt: process.env.GITHUB_RUN_ATTEMPT,
    job: process.env.GITHUB_JOB,
    head: process.env.GITHUB_SHA,
    actorPid: process.pid,
    observation: processSnapshot(),
  };
  fs.appendFileSync(
    path.join(root, `events-${process.pid}.jsonl`),
    JSON.stringify(row) + '\n',
  );
}

export function verifyCausalEvents(rows, testId) {
  const focus = rows.filter((row) => row.testId === testId);
  for (const kind of [
    'body-api-end',
    'pre-teardown',
    'context-close-begin',
    'context-close-end',
    'context-close',
    'browser-disconnected',
    'page-target',
  ])
    assert.ok(
      focus.some((row) => row.kind === kind),
      `Missing ${kind}`,
    );
  const valid = (p) =>
    p.role === 'renderer' &&
    p.rssBytes > 0 &&
    p.highWaterRssBytes >= p.rssBytes;
  const body = new Set(
    focus
      .filter((r) => r.kind === 'body-api-end')
      .flatMap((r) => r.observation.processes.filter(valid).map((p) => p.pid)),
  );
  assert.ok(
    focus
      .filter((r) => r.kind === 'pre-teardown')
      .some((r) =>
        r.observation.processes.some((p) => valid(p) && body.has(p.pid)),
      ),
    'Actual renderer body/preclose observations missing',
  );
  const targets = focus.filter(
    (r) =>
      r.kind === 'page-target' && r.data.targetId && r.data.browserContextId,
  );
  assert.ok(targets.length, 'Actual CDP page/context identities missing');
  assert.ok(
    !focus.some((r) => r.kind === 'unknown'),
    'Unknown capability/state observations retained; diagnostic incomplete',
  );
  return {
    status: 'OBSERVABLE',
    targets: targets.map((r) => r.data),
    bodyRendererPids: [...body],
    targetToPidMapping: 'UNKNOWN',
    faultingThread: 'UNKNOWN',
    rendererTeardownPeakBytes: null,
    stabilityClearance: false,
  };
}

export function rosterAst(source) {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] });
  function clean(value) {
    if (Array.isArray(value)) return value.map(clean);
    if (!value || typeof value !== 'object') return value;
    const copy = Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            ![
              'start',
              'end',
              'loc',
              'extra',
              'comments',
              'leadingComments',
              'trailingComments',
              'innerComments',
            ].includes(key),
        )
        .map(([key, item]) => [key, clean(item)]),
    );
    if (
      copy.type === 'ImportDeclaration' &&
      ['./fixtures/g6-042-causal-state', '@playwright/test'].includes(
        copy.source.value,
      )
    )
      copy.source.value = '@playwright/test';
    return copy;
  }
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(clean(ast)))
    .digest('hex');
}

export function listingRows(suite) {
  return suite.allTests().map((t) => ({
    id: t.id,
    file: path.basename(t.location.file),
    titles: t.titlePath(),
    workerHash: t._workerHash,
    poolDigest: t._poolDigest,
  }));
}
export function sameListing(base, diagnostic) {
  assert.ok(
    base.length && base.every((t) => t.workerHash && t.poolDigest),
    'Pinned Playwright worker identity unavailable',
  );
  assert.deepEqual(
    diagnostic,
    base,
    'Native order, IDs or worker fixture pool changed',
  );
}

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const baseSHA = '33ab2b6122dc0e39cbfad222ca56bc7d02025ddb';
const rootConfig = path.join(repo, 'playwright.config.ts');
const diagnosticConfig = path.join(repo, 'playwright.g6-042.config.js');
const cli = path.join(repo, 'node_modules/@playwright/test/cli.js');
function outputRoot() {
  const root = process.env.MEKSTATION_G6_042_ROOT;
  assert.ok(
    root && path.isAbsolute(root),
    'Absolute capture directory required',
  );
  fs.mkdirSync(root, { recursive: true });
  return root;
}
function writeJSON(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}
function list(root, name, args, enabled) {
  const identity = path.join(root, `${name}-identity.json`);
  const child = spawnSync(
    process.execPath,
    [
      cli,
      'test',
      ...args,
      '--project=chromium',
      '--list',
      '--reporter=json,./scripts/playwright/g6-042-reporter.mjs',
    ],
    {
      cwd: repo,
      env: {
        ...process.env,
        CI: 'true',
        MEKSTATION_G6_042: enabled ? '1' : '0',
        MEKSTATION_G6_042_LISTING: identity,
        PLAYWRIGHT_JSON_OUTPUT_FILE: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  fs.writeFileSync(path.join(root, `${name}.json`), child.stdout ?? '');
  fs.writeFileSync(path.join(root, `${name}.err`), child.stderr ?? '');
  assert.equal(child.status, 0, child.stderr);
  return {
    tests: collectTests(JSON.parse(child.stdout)),
    identity: JSON.parse(fs.readFileSync(identity)),
  };
}
export function contract() {
  const root = outputRoot();
  const source = spawnSync(
    'git',
    ['show', `${baseSHA}:e2e/seam-roster-materialization-handoff.spec.ts`],
    {
      cwd: repo,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 10000,
    },
  );
  assert.equal(source.status, 0);
  const baselineAst = rosterAst(source.stdout);
  assert.equal(
    rosterAst(
      fs.readFileSync(
        path.join(repo, 'e2e/seam-roster-materialization-handoff.spec.ts'),
        'utf8',
      ),
    ),
    baselineAst,
    'Roster body/assertion AST changed',
  );
  const files = CI_SUITES.flatMap((s) => s.files.map((f) => `e2e/${f}`));
  const base = list(
    root,
    'base-census',
    [...files, '--config', rootConfig],
    false,
  );
  const diagnostic = list(
    root,
    'diagnostic-census',
    [...files, '--config', diagnosticConfig],
    true,
  );
  assertSameTests(base.tests, diagnostic.tests);
  sameListing(base.identity, diagnostic.identity);
  const timing = JSON.parse(
    fs.readFileSync(path.join(repo, 'config/playwright/ci-durations.json')),
  );
  const plan = planShards(base.tests, timing);
  const shard = plan.shards.find((s) =>
    s.tasks.some(
      (t) =>
        t.suite === 'gates' &&
        t.tests.some(
          (x) => x.file === 'seam-roster-materialization-handoff.spec.ts',
        ),
    ),
  );
  assert.ok(shard, 'Roster crash shard missing');
  const task = shard.tasks.find((t) => t.suite === 'gates');
  const testList = path.join(root, 'selected.txt');
  fs.writeFileSync(testList, task.tests.map((t) => t.key).join('\n') + '\n');
  const gates = CI_SUITES.find((s) => s.name === 'gates');
  const args = [
    ...gates.files.map((f) => `e2e/${f}`),
    `--test-list=${testList}`,
    '--workers=1',
    ...gates.options,
  ];
  const selectedBase = list(
    root,
    'base-selected',
    [...args, '--config', rootConfig],
    false,
  );
  const selected = list(
    root,
    'diagnostic-selected',
    [...args, '--config', diagnosticConfig],
    true,
  );
  assertSameTests(task.tests, selected.tests);
  sameListing(selectedBase.identity, selected.identity);
  const focus = selected.identity.find(
    (t) => t.file === 'seam-roster-materialization-handoff.spec.ts',
  );
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(head.status, 0);
  const result = {
    base: baseSHA,
    sourceHead: head.stdout.trim(),
    rosterAstSHA256: baselineAst,
    plan,
    shard: shard.shard,
    selected: selected.identity,
    preceding: selected.identity.slice(0, selected.identity.indexOf(focus)),
    focusId: focus.id,
    args,
    workers: 1,
    retries: 0,
    orderAndWorkerFixtureIdentity: 'MATCH',
    targetToPidMapping: 'UNKNOWN',
    hostedExecution: false,
  };
  writeJSON(path.join(root, 'contract.json'), result);
  return result;
}

export async function drainNativeChild(
  child,
  log,
  kill,
  { timeoutMs = 600000, output = process.stdout } = {},
) {
  for (const pipe of [child.stdout, child.stderr])
    pipe.on('data', (chunk) => {
      fs.writeSync(log, chunk);
      output.write(chunk);
    });
  const timer = setTimeout(kill, timeoutMs);
  const interrupted = () => kill();
  process.once('SIGTERM', interrupted);
  process.once('SIGINT', interrupted);
  try {
    return await new Promise((resolve, reject) => {
      let exit, failure;
      child.once('exit', (code, signal) => {
        exit = { code, signal };
      });
      child.once('error', (error) => {
        failure = error;
      });
      // close follows stdio drainage; exit alone can precede final crash bytes.
      child.once('close', (code, signal) => {
        if (failure) reject(failure);
        else
          resolve({
            code: exit ? exit.code : code,
            signal: exit?.signal ?? signal,
          });
      });
    });
  } finally {
    clearTimeout(timer);
    process.removeListener('SIGTERM', interrupted);
    process.removeListener('SIGINT', interrupted);
    fs.closeSync(log);
  }
}

async function capture() {
  const root = outputRoot(),
    proof = JSON.parse(fs.readFileSync(path.join(root, 'contract.json')));
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(head.status, 0);
  assert.equal(
    proof.sourceHead,
    head.stdout.trim(),
    'Source changed after contract proof',
  );
  assert.equal(
    rosterAst(
      fs.readFileSync(
        path.join(repo, 'e2e/seam-roster-materialization-handoff.spec.ts'),
        'utf8',
      ),
    ),
    proof.rosterAstSHA256,
  );
  const args = [
    path.join(repo, 'scripts/playwright/run-playwright.mjs'),
    'test',
    '--config',
    diagnosticConfig,
    ...proof.args,
    '--project=chromium',
    '--output=' + path.join(root, 'test-results'),
  ];
  const log = fs.openSync(path.join(root, 'native.log'), 'w');
  const child = spawn(process.execPath, args, {
    cwd: repo,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      MEKSTATION_G6_042: '1',
      MEKSTATION_G6_042_SUITE: 'gates',
      MEKSTATION_G6_042_LISTING: path.join(root, 'runtime-identity.json'),
      PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(root, 'native.json'),
      PLAYWRIGHT_HTML_OUTPUT_DIR: path.join(root, 'html'),
    },
  });
  const kill = () => {
    if (process.platform === 'win32')
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']);
    else {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
  };
  const nativeExit = await drainNativeChild(child, log, kill);
  writeJSON(path.join(root, 'native-exit.json'), nativeExit);
  const kernels = fs.readdirSync(path.join(root, 'kernel')).map((file) => {
    assert.match(file, /^gates-\d+\.jsonl$/, 'Unknown kernel receipt identity');
    try {
      return {
        file,
        receipt: parseKernelReceipt(
          fs.readFileSync(path.join(root, 'kernel', file), 'utf8'),
        ),
      };
    } catch (error) {
      error.evidence = { ...error.evidence, file };
      throw error;
    }
  });
  assertCleanKernelReceipts(kernels);
  assert.equal(nativeExit.code, 0, 'Native test runner failed');
  const tests = collectTests(
    JSON.parse(fs.readFileSync(path.join(root, 'native.json'))),
  );
  const expected = proof.plan.shards[proof.shard - 1].tasks.find(
    (t) => t.suite === 'gates',
  ).tests;
  assertSameTests(expected, tests);
  assert.ok(
    tests.every(
      (t) =>
        t.results.length === 1 &&
        t.results[0].retry === 0 &&
        t.results[0].status === 'passed',
    ),
    'Missing/failed/retried gate case',
  );
  sameListing(
    proof.selected,
    JSON.parse(fs.readFileSync(path.join(root, 'runtime-identity.json'))),
  );
  const events = fs
    .readdirSync(root)
    .filter((f) => /^events-\d+\.jsonl$/.test(f))
    .flatMap((file) =>
      fs
        .readFileSync(path.join(root, file), 'utf8')
        .trim()
        .split('\n')
        .map(JSON.parse),
    );
  assert.ok(
    events.every(
      (e) =>
        e.run === process.env.GITHUB_RUN_ID &&
        e.attempt === process.env.GITHUB_RUN_ATTEMPT &&
        e.head === process.env.GITHUB_SHA,
    ),
    'Event identity mismatch',
  );
  writeJSON(path.join(root, 'verification.json'), {
    status: 'OBSERVABLE',
    nativeExit,
    kernels,
    coverage: verifyCausalEvents(events, proof.focusId),
    stabilityClearance: false,
  });
}

async function main() {
  try {
    if (process.argv[2] === 'contract') contract();
    else if (process.argv[2] === 'prepare')
      prepareInstalledBrowser(outputRoot());
    else if (process.argv[2] === 'capture') await capture();
    else throw new Error('Expected contract, prepare or capture');
  } catch (error) {
    writeJSON(path.join(outputRoot(), 'verification.json'), {
      status:
        error.code === 'BROWSER_CRASH' ||
        error.evidence?.signals?.some((n) => n > 0 && n <= 64)
          ? 'CRASH_OBSERVED'
          : 'UNKNOWN_OR_FAILED',
      error: error.message,
      evidence: error.evidence ?? null,
      stabilityClearance: false,
    });
    console.error(error);
    process.exitCode = 1;
  }
}

// Reused from sealed diagnostic03212; historical files and seals stay unchanged.
export function processSnapshot({
  procRoot = '/proc',
  rootPid = process.pid,
  cgroupRoot = '/sys/fs/cgroup',
} = {}) {
  const unavailable = [];
  const read = (file) => {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch (error) {
      unavailable.push({ file, code: error.code });
      return null;
    }
  };
  let entries;
  try {
    entries = fs.readdirSync(procRoot).filter((x) => /^\d+$/.test(x));
  } catch (error) {
    return {
      processes: [],
      unavailable: [{ file: procRoot, code: error.code }],
    };
  }
  const records = new Map(),
    children = new Map();
  for (const id of entries) {
    const status = read(path.join(procRoot, id, 'status'));
    if (status === null) continue;
    const parent = /^PPid:\s+(\d+)/m.exec(status)?.[1];
    if (parent === undefined) {
      unavailable.push({
        file: `${procRoot}/${id}/status`,
        code: 'PPID_MISSING',
      });
      continue;
    }
    const pid = Number(id),
      ppid = Number(parent);
    records.set(pid, {
      pid,
      ppid,
      name: /^Name:\s+(.+)$/m.exec(status)?.[1] ?? null,
      rssBytes: bytes(status, 'VmRSS'),
      highWaterRssBytes: bytes(status, 'VmHWM'),
    });
    children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  }
  const pending = [rootPid],
    included = new Set();
  while (pending.length) {
    const pid = pending.pop();
    if (included.has(pid)) continue;
    included.add(pid);
    pending.push(...(children.get(pid) ?? []));
  }
  const processes = [...included]
    .filter((pid) => records.has(pid))
    .sort((a, b) => a - b)
    .map((pid) => {
      const rawCommand = read(path.join(procRoot, String(pid), 'cmdline'));
      const executable = path.basename(rawCommand?.split('\0')[0] ?? '');
      const command = rawCommand?.replaceAll('\0', ' ').trim() ?? null;
      const role = /(?:^| )--type=renderer(?: |$)/.test(command ?? '')
        ? 'renderer'
        : executable === 'time'
          ? 'wrapper'
          : /chrome-headless-shell/.test(executable)
            ? /--type=zygote/.test(command ?? '')
              ? 'zygote'
              : 'browser'
            : /node \.next\/standalone\/server\.js/.test(command ?? '')
              ? 'server'
              : 'runner';
      return { ...records.get(pid), command, role };
    });
  if (!records.has(rootPid))
    unavailable.push({
      file: `${procRoot}/${rootPid}/status`,
      code: 'ROOT_NOT_OBSERVED',
    });
  const meminfo = read(path.join(procRoot, 'meminfo'));
  const memory =
    meminfo === null
      ? null
      : {
          totalBytes: bytes(meminfo, 'MemTotal'),
          availableBytes: bytes(meminfo, 'MemAvailable'),
        };
  const membership = read(path.join(procRoot, 'self/cgroup'));
  const relative = /^0::(.*)$/m.exec(membership ?? '')?.[1];
  let cgroup = null,
    shm = null;
  if (relative !== undefined) {
    const root = path.resolve(cgroupRoot),
      directory = path.resolve(root, `.${relative}`);
    if (directory === root || directory.startsWith(root + path.sep))
      cgroup = {
        directory,
        values: Object.fromEntries(
          ['memory.current', 'memory.peak', 'memory.max', 'memory.events'].map(
            (name) => [name, read(path.join(directory, name))],
          ),
        ),
      };
    else
      unavailable.push({ file: membership, code: 'CGROUP_PATH_OUTSIDE_ROOT' });
  }
  try {
    const stat = fs.statfsSync('/dev/shm');
    shm = {
      totalBytes: stat.bsize * stat.blocks,
      availableBytes: stat.bsize * stat.bavail,
    };
  } catch (error) {
    unavailable.push({ file: '/dev/shm', code: error.code });
  }
  return { rootPid, processes, memory, cgroup, shm, unavailable };
}

export function parseKernelReceipt(text) {
  const lines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((line) => ({
      line,
      signal: /^Command terminated by signal (\d+)(?: \(core dumped\))?$/.exec(
        line,
      ),
      nonzero: /^Command exited with non-zero status (\d+)$/.exec(line),
    }));
  const evidence = {
    rawText: text,
    signals: lines.filter((x) => x.signal).map((x) => Number(x.signal[1])),
    nonzeroStatuses: lines
      .filter((x) => x.nonzero)
      .map((x) => Number(x.nonzero[1])),
    rows: [],
  };
  const invalid = (message) => {
    throw Object.assign(new Error(message), {
      code: 'INVALID_KERNEL_RECEIPT',
      evidence,
    });
  };
  for (const { line, signal, nonzero } of lines) {
    if (signal || nonzero) continue;
    if (line.startsWith('{')) {
      try {
        evidence.rows.push(JSON.parse(line));
      } catch {
        invalid('Malformed kernel receipt JSON');
      }
    } else invalid('Unknown kernel receipt evidence');
  }
  const row = evidence.rows[0];
  if (
    evidence.rows.length !== 1 ||
    row?.schema !== 'mekstation-browser-rusage/v1' ||
    !Number.isSafeInteger(row.maxRssKiB) ||
    row.maxRssKiB <= 0 ||
    !Number.isSafeInteger(row.maxRssKiB * 1024) ||
    !Number.isInteger(row.exitStatus) ||
    row.exitStatus < 0 ||
    row.exitStatus > 255 ||
    evidence.signals.length > 1 ||
    evidence.signals.some((n) => !Number.isInteger(n) || n < 1 || n > 64) ||
    evidence.nonzeroStatuses.length > 1 ||
    evidence.nonzeroStatuses.some((n) => n < 1 || n !== row.exitStatus) ||
    (evidence.signals.length > 0 && evidence.nonzeroStatuses.length > 0)
  )
    invalid('Kernel browser evidence missing, invalid or contradictory');
  return {
    ...row,
    rawText: text,
    signal: evidence.signals[0] ?? null,
    outcome: evidence.signals.length
      ? 'CRASH'
      : row.exitStatus === 0
        ? 'CLEAN_EXIT'
        : 'NONZERO_EXIT',
    browserMainMaxRssBytes: row.maxRssKiB * 1024,
    scope: 'browser-main-process',
    meaning: BROWSER_MAIN_MAXRSS_MEANING,
  };
}

export function assertCleanKernelReceipts(kernels) {
  if (!kernels.length)
    throw Object.assign(new Error('Kernel termination evidence missing'), {
      code: 'INVALID_KERNEL_RECEIPT',
      evidence: { kernels },
    });
  const failed = kernels.filter((k) => k.receipt.outcome !== 'CLEAN_EXIT');
  if (failed.length)
    throw Object.assign(
      new Error('Browser termination evidence is not clean'),
      {
        code: failed.some((k) => k.receipt.outcome === 'CRASH')
          ? 'BROWSER_CRASH'
          : failed.some((k) => k.receipt.outcome === 'NONZERO_EXIT')
            ? 'BROWSER_EXIT_FAILURE'
            : 'INVALID_KERNEL_RECEIPT',
        evidence: { kernels, failed },
      },
    );
}

const quote = (text) => "'" + text.replaceAll("'", "'\\''") + "'";

export function writeBrowserWrapper({
  root,
  binary,
  timeExecutable = '/usr/bin/time',
}) {
  if (
    !root ||
    !binary ||
    !path.isAbsolute(root) ||
    !path.isAbsolute(binary) ||
    !path.isAbsolute(timeExecutable)
  )
    throw new Error(
      'Diagnostic output, browser and GNU time must use absolute paths',
    );
  fs.mkdirSync(path.join(root, 'kernel'), { recursive: true });
  const wrapper = path.join(root, 'browser-wrapper.sh');
  const format =
    '{"schema":"mekstation-browser-rusage/v1","maxRssKiB":%M,"exitStatus":%x,"wallSeconds":"%e"}';
  const script = [
    '#!/bin/sh',
    'case "$MEKSTATION_G6_042_SUITE" in gates|library|smoke|probe) ;; *) exit 64 ;; esac',
    `exec ${quote(timeExecutable)} -f ${quote(format)} -o ${quote(path.join(root, 'kernel'))}/"$MEKSTATION_G6_042_SUITE-$$.jsonl" ${quote(binary)} "$@"`,
    '',
  ].join('\n');
  fs.writeFileSync(wrapper, script, { mode: 0o755 });
  return wrapper;
}

export function prepareInstalledBrowser(root) {
  if (process.platform !== 'linux' || process.arch !== 'x64')
    throw new Error('This diagnostic is Linux x64 only');
  const require = createRequire(import.meta.url);
  const metadata = JSON.parse(
    fs.readFileSync(
      path.join(
        path.dirname(require.resolve('playwright-core/package.json')),
        'browsers.json',
      ),
      'utf8',
    ),
  );
  const browser = metadata.browsers.find(
    (b) => b.name === 'chromium-headless-shell',
  );
  if (!browser || !/^\d+$/.test(browser.revision) || browser.revisionOverrides)
    throw new Error('Unknown headless-shell build layout');
  const cache = path.dirname(
    path.dirname(path.dirname(chromium.executablePath())),
  );
  const binary = fs.realpathSync(
    path.join(
      cache,
      `chromium_headless_shell-${browser.revision}`,
      'chrome-headless-shell-linux64/chrome-headless-shell',
    ),
  );
  fs.accessSync(binary, fs.constants.X_OK);
  fs.accessSync('/usr/bin/time', fs.constants.X_OK);
  const wrapper = writeBrowserWrapper({ root, binary });
  fs.writeFileSync(
    path.join(root, 'browser-manifest.json'),
    JSON.stringify(
      {
        browser,
        binary,
        wrapper,
        binarySHA256: crypto
          .createHash('sha256')
          .update(fs.readFileSync(binary))
          .digest('hex'),
        kernelPeakMeaning: BROWSER_MAIN_MAXRSS_MEANING,
      },
      null,
      2,
    ),
  );
  return wrapper;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  void main();
