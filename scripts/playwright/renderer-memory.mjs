// Diagnostic observations only. No process-name filter, timers or sampling loop.
import fs from 'node:fs';
import path from 'node:path';

export const BROWSER_MAIN_MAXRSS_MEANING =
  'Browser main process maxrss; it does not bound descendant renderer VmHWM or simultaneous process-tree RSS.';

const bytes = (text, key) => {
  const value = new RegExp(`^${key}:\\s+(\\d+) kB$`, 'm').exec(text)?.[1];
  return value === undefined ? null : Number(value) * 1024;
};

export function diagnosticInvocation(env, repoRoot) {
  const output = env.MEKSTATION_E2E_MEMORY_ROOT;
  const count = env.MEKSTATION_E2E_MEMORY_SHARDS;
  if (!output && !count) return { shards: 2, configArgs: [] };
  if (!output || !path.isAbsolute(output) || !['2', '3'].includes(count))
    throw new Error('Explicit diagnostic output and 2/3 shards required');
  return {
    shards: Number(count),
    configArgs: [
      '--config',
      path.join(repoRoot, 'playwright.renderer-memory.config.js'),
    ],
  };
}

export function diagnosticSuiteEnvironment(env, suite, shard) {
  if (!env.MEKSTATION_E2E_MEMORY_ROOT) return {};
  const index = ['gates', 'library', 'smoke'].indexOf(suite);
  if (
    index < 0 ||
    !/^\d+$/.test(env.GITHUB_RUN_ID ?? '') ||
    !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT ?? '')
  )
    throw new Error('Diagnostic suite/run/attempt identity missing');
  return {
    MEKSTATION_E2E_MEMORY_SUITE: suite,
    MEKSTATION_E2E_PORT: String(3700 + index),
    PLAYWRIGHT_E2E_RUN_ID: `memory-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}-${env.MEKSTATION_E2E_MEMORY_SHARDS}-${shard}-${suite}`,
  };
}

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
      const command =
        read(path.join(procRoot, String(pid), 'cmdline'))
          ?.replaceAll('\0', ' ')
          .trim() ?? null;
      const role = /(?:^| )--type=renderer(?: |$)/.test(command ?? '')
        ? 'renderer'
        : /chrome-headless-shell/.test(command ?? '')
          ? 'browser'
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

export function observationPhase(test, step, edge) {
  if (
    !test.location.file
      .replaceAll('\\', '/')
      .endsWith('/seam-roster-materialization-handoff.spec.ts')
  )
    return null;
  if (edge === 'begin' && step.title === 'After Hooks') return 'pre-teardown';
  if (/close context/i.test(step.title ?? '')) return `context-close-${edge}`;
  for (let parent = step.parent; parent; parent = parent.parent) {
    if (
      parent.category === 'fixture' ||
      parent.title === 'Before Hooks' ||
      parent.title === 'After Hooks'
    )
      return null;
  }
  return edge === 'end' && step.category === 'pw:api' ? 'body-api-end' : null;
}

export function parseKernelReceipt(text) {
  const rows = text
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line));
  const row = rows.find((x) => x.schema === 'mekstation-browser-rusage/v1');
  if (
    !row ||
    !Number.isSafeInteger(row.maxRssKiB) ||
    row.maxRssKiB <= 0 ||
    !Number.isInteger(row.exitStatus) ||
    row.exitStatus < 0
  )
    throw new Error('Kernel browser exit RSS/exit status missing or invalid');
  return {
    ...row,
    browserMainMaxRssBytes: row.maxRssKiB * 1024,
    scope: 'browser-main-process',
    meaning: BROWSER_MAIN_MAXRSS_MEANING,
  };
}

export function verifyRendererCoverage(rows, kernels) {
  const valid = (p) =>
    p.role === 'renderer' &&
    Number.isFinite(p.rssBytes) &&
    p.rssBytes > 0 &&
    Number.isFinite(p.highWaterRssBytes) &&
    p.highWaterRssBytes >= p.rssBytes;
  const body = rows.filter((r) => r.phase === 'body-api-end');
  const beforeClose = rows.filter((r) =>
    ['pre-teardown', 'context-close-begin'].includes(r.phase),
  );
  const bodyPids = new Set(
    body.flatMap((r) =>
      r.observation.processes.filter(valid).map((p) => p.pid),
    ),
  );
  const observations = beforeClose.flatMap((row) =>
    row.observation.processes
      .filter((p) => valid(p) && bodyPids.has(p.pid))
      .map((renderer) => ({ row, renderer })),
  );
  if (!observations.length)
    throw new Error(
      'Actual renderer body and pre-close RSS/VmHWM observations missing',
    );
  if (
    !rows.some((r) => r.phase === 'context-close-begin') ||
    !rows.some((r) => r.phase === 'context-close-end')
  )
    throw new Error('Context-close event bracket missing');
  const rendererObservations = [];
  for (const { row, renderer } of observations) {
    const byPid = new Map(row.observation.processes.map((p) => [p.pid, p]));
    const visited = new Set();
    let parent = byPid.get(renderer.ppid);
    while (parent && !visited.has(parent.pid)) {
      visited.add(parent.pid);
      if (
        parent.role === 'browser' &&
        /--remote-debugging-pipe/.test(parent.command ?? '')
      ) {
        const kernel = kernels.find(
          (k) =>
            k.wrapperPid === parent.ppid &&
            Number.isSafeInteger(k.receipt.browserMainMaxRssBytes) &&
            k.receipt.browserMainMaxRssBytes > 0,
        );
        if (kernel)
          rendererObservations.push({
            rendererPid: renderer.pid,
            browserPid: parent.pid,
            wrapperPid: parent.ppid,
            observedRendererRssBytes: renderer.rssBytes,
            observedRendererVmHwmBytes: renderer.highWaterRssBytes,
            browserMainProcess: kernel.receipt,
          });
        break;
      }
      parent = byPid.get(parent.ppid);
    }
  }
  if (!rendererObservations.length)
    throw new Error('Correlated browser main process maxrss receipt missing');
  return {
    status: 'OBSERVABLE',
    primaryRendererEvidence: 'procfs-per-renderer-vmrss-vmhwm',
    bodyRendererPids: [...bodyPids],
    rendererObservations,
    rendererTeardownPeakBytes: null,
    stabilityClearance: false,
    limitation:
      'Procfs renderer VmRSS/VmHWM samples are primary. Browser main process maxrss is separate; renderer peaks after the last sample remain unknown. Observability is not stability clearance.',
  };
}
