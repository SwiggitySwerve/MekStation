#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export class MachineSnapshotError extends Error {
  constructor(cause) {
    super('Process enumeration unavailable or unparseable', { cause });
    this.name = 'MachineSnapshotError';
    this.code = 'SNAPSHOT_UNAVAILABLE';
  }
}

export class MachineBusyError extends Error {
  constructor(busy) {
    super(`MACHINE_BUSY ${busy.length}`);
    this.name = 'MachineBusyError';
    this.code = 'MACHINE_BUSY';
    this.busy = busy;
  }
}

function validatedRows(snapshot) {
  const rows = Array.isArray(snapshot)
    ? snapshot.filter(
        (row) =>
          row &&
          Number.isInteger(row.ProcessId) &&
          row.ProcessId >= 0 &&
          Number.isInteger(row.ParentProcessId) &&
          row.ParentProcessId >= 0 &&
          typeof row.Name === 'string' &&
          row.Name.trim() &&
          (row.CommandLine == null || typeof row.CommandLine === 'string'),
      )
    : [];
  if (!rows.length) throw new MachineSnapshotError();
  return rows;
}

const normalized = (value) => value.replaceAll('\\', '/').toLowerCase();
const basename = (value) =>
  normalized(value)
    .split('/')
    .at(-1)
    .replace(/\.exe$/, '');
const repoRoot = normalized(fileURLToPath(new URL('../../', import.meta.url)));
function tokens(command) {
  return [...command.matchAll(/"([^"]*)"|'([^']*)'|([^\s]+)/g)].map(
    (match) => match[1] ?? match[2] ?? match[3],
  );
}

function processShape(row) {
  const command = row.CommandLine ?? '';
  const image = basename(row.Name);
  if (image === 'grok') return {};
  const argv = tokens(command);
  if (/^next-server(?:\s|$)/.test(image)) return { busy: true };
  let script = image;
  let args = argv.slice(1);
  if (image === 'node' || image === 'nodejs') {
    while (args[0]?.startsWith('-')) {
      const option = args.shift();
      if (
        ['-e', '--eval', '-p', '--print'].includes(option) ||
        /^(--eval|--print)=/.test(option)
      )
        return {};
      if (
        [
          '-r',
          '--require',
          '--import',
          '--loader',
          '--experimental-loader',
        ].includes(option)
      )
        args.shift();
      if (option === '--') break;
    }
    script = normalized(args.shift() ?? '');
    const directories = script.split('/').slice(0, -1);
    if (
      ['codex.js', 'codex.mjs', 'codex-cli'].includes(basename(script)) ||
      directories.includes('codex-cli') ||
      directories.some(
        (segment, index) =>
          (segment === 'cursor-agent' &&
            directories[index + 1] === 'versions') ||
          (segment === '@openai' && directories[index + 1] === 'codex'),
      )
    )
      return {};
  } else if (!['next', 'playwright'].includes(image)) {
    return {
      browser:
        /^(chrome|chromium|chromium-browser|chrome-headless|chrome-headless-shell|headless_shell)$/.test(
          image,
        ),
      argv,
    };
  }
  const entry = basename(script);
  const playwright =
    entry === 'playwright' ||
    entry === 'run-playwright.mjs' ||
    /(?:^|\/)node_modules\/(?:@playwright\/test|playwright(?:-core)?)\/cli\.[cm]?js$/.test(
      script,
    );
  const next =
    (entry === 'next' && ['build', 'start'].includes(args[0])) ||
    /^next-server(?:\s|$)/.test(entry);
  // Neither CIM nor ps reports cwd. Bare server.js is conservatively busy.
  const server =
    entry === 'server.js' &&
    (/^(?:\.\/)?server\.js$/.test(script) ||
      /(?:^|\/)standalone\/server\.js$/.test(script) ||
      script.startsWith(repoRoot) ||
      /(?:^|\/)mekstation(?:[-_][^/]+)?\//.test(script));
  return {
    busy: next || server || entry === 'relaunching-server.mjs' || playwright,
    playwright,
  };
}

/** CIM-shaped rows on both platforms; ownPids excludes only explicitly supplied PIDs. */
export function listBuildProcesses(snapshot, { ownPids = [] } = {}) {
  const rows = validatedRows(snapshot);
  const byPid = new Map(rows.map((row) => [row.ProcessId, row]));
  const shapes = new Map(rows.map((row) => [row.ProcessId, processShape(row)]));
  const owned = new Set(ownPids);
  return rows.filter((row) => {
    if (owned.has(row.ProcessId)) return false;
    const shape = shapes.get(row.ProcessId);
    if (shape.busy) return true;
    if (!shape.browser) return false;
    const argv = shape.argv.map(normalized);
    if (
      argv[0]?.includes('/ms-playwright/') ||
      (argv.includes('--remote-debugging-pipe') &&
        argv.some((arg) => /^--user-data-dir=.*playwright/.test(arg)))
    )
      return true;
    const seen = new Set([row.ProcessId]);
    let parent = row.ParentProcessId;
    while (byPid.has(parent) && !seen.has(parent)) {
      if (shapes.get(parent).playwright) return true;
      seen.add(parent);
      parent = byPid.get(parent).ParentProcessId;
    }
    return false;
  });
}

export function takeSnapshot() {
  try {
    const windows = process.platform === 'win32';
    const output = execFileSync(
      windows ? 'powershell.exe' : 'ps',
      windows
        ? [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            '$ErrorActionPreference = "Stop"; [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CommandLine | ConvertTo-Json -Compress',
          ]
        : ['-eo', 'pid,ppid,comm,args'],
      {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 16 * 1024 * 1024,
      },
    ).replace(/^\uFEFF/, '');
    if (windows) {
      const parsed = JSON.parse(output);
      return validatedRows(Array.isArray(parsed) ? parsed : [parsed]);
    }
    return validatedRows(
      output.split(/\r?\n/).flatMap((line) => {
        const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
        return match
          ? [
              {
                ProcessId: Number(match[1]),
                ParentProcessId: Number(match[2]),
                Name: match[3],
                CommandLine: match[4],
              },
            ]
          : [];
      }),
    );
  } catch (error) {
    throw error instanceof MachineSnapshotError
      ? error
      : new MachineSnapshotError(error);
  }
}

/**
 * The PID listening on a local TCP port. takeSnapshot's rows carry no
 * ports, so this reads the OS listener table instead: Get-NetTCPConnection
 * through powershell.exe on Windows, `lsof -t -sTCP:LISTEN` elsewhere.
 * Anything but exactly one distinct positive PID - a missing tool (ENOENT),
 * a failed or unparseable run, no listener, two owners - throws
 * MachineSnapshotError; a port that is not an integer in 1-65535 throws
 * RangeError before any tool runs.
 */
export function listeningPortOwner(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new RangeError('INVALID_ARGUMENT: port');
  try {
    const windows = process.platform === 'win32';
    const output = execFileSync(
      windows ? 'powershell.exe' : 'lsof',
      windows
        ? [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            `$ErrorActionPreference = "Stop"; ConvertTo-Json -Compress -InputObject @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)`,
          ]
        : ['-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN'],
      { encoding: 'utf8', windowsHide: true, timeout: 15000 },
    );
    const pids = new Set(
      windows ? JSON.parse(output) : output.split(/\s+/).filter(Boolean),
    );
    const pid = Number([...pids][0]);
    if (pids.size !== 1 || !Number.isInteger(pid) || pid <= 0)
      throw new Error(`port ${port} listeners: ${[...pids].join(',')}`);
    return pid;
  } catch (error) {
    throw new MachineSnapshotError(error);
  }
}

export async function waitForIdle({
  pollMs = 1000,
  timeoutMs = 60000,
  ownPids = [],
  log = () => {},
} = {}) {
  if (
    !Number.isFinite(pollMs) ||
    pollMs <= 0 ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs < 0
  )
    throw new RangeError('INVALID_ARGUMENT: polling times');
  const started = performance.now();
  while (true) {
    const busy = listBuildProcesses(takeSnapshot(), { ownPids });
    if (!busy.length) return [];
    log(busy);
    const remaining = timeoutMs - (performance.now() - started);
    if (remaining <= 0) throw new MachineBusyError(busy);
    await sleep(Math.min(pollMs, remaining));
  }
}

function printStatus(busy) {
  console.log(busy.length ? `MACHINE_BUSY ${busy.length}` : 'MACHINE_IDLE');
  for (const row of busy) console.log(JSON.stringify(row));
  process.exitCode = busy.length ? 1 : 0;
}

async function main(args) {
  try {
    const options = { ownPids: [] };
    let wait = false;
    for (let i = 0; i < args.length; i++) {
      const flag = args[i];
      if (flag === '--wait') {
        wait = true;
        continue;
      }
      if (
        !['--timeout-ms', '--own-pid'].includes(flag) ||
        !/^\d+$/.test(args[i + 1] ?? '')
      )
        throw new Error(`INVALID_ARGUMENT: ${flag}`);
      const value = Number(args[++i]);
      if (!Number.isSafeInteger(value) || (flag === '--own-pid' && value === 0))
        throw new Error(`INVALID_ARGUMENT: ${flag}`);
      if (flag === '--own-pid') options.ownPids.push(value);
      else options.timeoutMs = value;
    }
    printStatus(
      wait
        ? await waitForIdle(options)
        : listBuildProcesses(takeSnapshot(), options),
    );
  } catch (error) {
    if (error instanceof MachineBusyError) printStatus(error.busy);
    else {
      console.error(`${error.code ?? 'MACHINE_IDLE_ERROR'}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main(process.argv.slice(2));
