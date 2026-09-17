#!/usr/bin/env node
/**
 * Run a unit's main proof on the exact merge commit (U17 - R6.loop-harness).
 *
 * The repository copy of the u7/u11/u9b/u13 main-proof shell scripts, which
 * were four near-identical files each hardcoding an interpreter path, the
 * repository root, its own log directory and a 120x30s inline CIM polling loop.
 * The idle wait now goes through scripts/qc/machine-idle.mjs (U11) and the log
 * directory is derived from the unit and the date:
 *
 *   npm run roadmap:main-proof -- --merge <40-hex> --unit U18 --date 20260918 \
 *     --runtime-jest scripts/__tests__/roadmap-loop-scripts.test.ts
 *
 * Exactly one runtime proof is named: `--runtime-jest <pattern>` (a jest pin),
 * `--runtime-group <group>` (a gm-two-player ladder group) or
 * `--runtime-command "<cmd>"` (anything else, run through a shell). The ladder
 * refuses before doing anything when no runtime proof is named, when HEAD is
 * not the merge commit, or when the tree is dirty.
 *
 * `--dry-run` prints the exact command for every step and executes none of
 * them - it neither waits, nor builds, nor creates the log directory. That is
 * what the jest pin exercises; the real ladder is run by the parent from the
 * root checkout.
 *
 * `--repo-root` relocates the checkout the ladder runs in; the pin points it
 * at a temporary git repository.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  DATE8,
  HEX40,
  LEDGER_RELATIVE,
  REPO_ROOT,
  UNIT_ID,
  parseFlags,
  posix,
  refuse,
  requireFlags,
  runCli,
} from './roadmap-ledger-lib.mjs';

const STRINGS = [
  '--merge',
  '--unit',
  '--date',
  '--runtime-jest',
  '--runtime-group',
  '--runtime-command',
  '--repo-root',
];
const IDLE_TIMEOUT_MS = '3600000';
const win = process.platform === 'win32';
const npm = win ? 'npm.cmd' : 'npm';
const npx = win ? 'npx.cmd' : 'npx';

/** The runtime proof step, which is the only thing that differs between units. */
function runtimeStep(options) {
  const named = ['runtimeJest', 'runtimeGroup', 'runtimeCommand'].filter(
    (key) => options[key] !== undefined,
  );
  if (named.length !== 1)
    refuse(
      'RUNTIME_PROOF_REQUIRED',
      'name exactly one runtime proof: --runtime-jest, --runtime-group or --runtime-command',
    );
  if (options.runtimeJest)
    return { name: 'playwright', argv: [npx, 'jest', options.runtimeJest] };
  if (options.runtimeGroup)
    return {
      name: 'playwright',
      argv: [
        'node',
        'scripts/qc/run-gm-two-player-campaign.mjs',
        `--group=${options.runtimeGroup}`,
      ],
      env: { NODE_ENV: 'production' },
    };
  return { name: 'playwright', shell: options.runtimeCommand };
}

function ladder(options, logDirRelative) {
  const validator = `${LEDGER_RELATIVE}/validate-roadmap.mjs`;
  const idle = {
    argv: [
      'node',
      'scripts/qc/machine-idle.mjs',
      '--wait',
      '--timeout-ms',
      IDLE_TIMEOUT_MS,
    ],
  };
  return [
    { name: 'idle-before-build', ...idle },
    {
      name: 'build',
      argv: [npm, 'run', 'build'],
      env: { NEXT_PUBLIC_E2E_MODE: 'true', NEXT_PUBLIC_E2E_TEST: 'true' },
    },
    {
      name: 'e2e-marker',
      inProcess: 'scan .next/static/chunks/pages/_app-*.js for __E2E_MODE__',
    },
    { name: 'idle-before-runtime', ...idle },
    runtimeStep(options),
    { name: 'tsc', argv: [npx, 'tsc', '--noEmit'] },
    { name: 'validator', argv: ['node', validator] },
    { name: 'git-check', argv: ['node', validator, '--git'] },
    { name: 'next', argv: ['node', validator, '--next'] },
    {
      name: 'openspec-strict',
      argv: [npx, 'openspec', 'validate', '--all', '--strict'],
    },
    { name: 'qc-openspec-ci', argv: [npm, 'run', 'qc:openspec-ci:validate'] },
    {
      name: 'qc-pin',
      argv: [
        npx,
        'jest',
        'scripts/__tests__/gm-two-player-campaign-qc.test.ts',
        'src/__tests__/unit/evidence/gmTwoPlayerEvidence.test.ts',
      ],
    },
    {
      name: 'sha256',
      inProcess: `write sha256.txt over every log in ${logDirRelative}`,
    },
    {
      name: 'restore-next-env',
      argv: ['git', 'checkout', '--', 'next-env.d.ts'],
    },
    { name: 'dirty-check', inProcess: 'git status --short, counted' },
  ];
}

const printable = (step) => {
  const prefix = Object.entries(step.env ?? {})
    .map(([key, value]) => `${key}=${value} `)
    .join('');
  if (step.inProcess) return `${step.inProcess} (in-process)`;
  return prefix + (step.shell ?? step.argv.join(' '));
};

/** The e2e bundle marker check the shell ladders did with `grep -l`. */
function e2eMarker(repoRoot) {
  const dir = path.join(repoRoot, '.next/static/chunks/pages');
  const chunks = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((name) => /^_app-.*\.js$/.test(name))
    : [];
  const present = chunks.some((name) =>
    fs.readFileSync(path.join(dir, name), 'utf8').includes('__E2E_MODE__'),
  );
  return present ? '__E2E_MODE__ present in _app chunk' : 'E2E MARKER MISSING';
}

function execute(step, { repoRoot, logDir }) {
  const log = path.join(logDir, `${step.name}.log`);
  const options = {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...(step.env ?? {}) },
    maxBuffer: 64 * 1024 * 1024,
  };
  const result = step.shell
    ? spawnSync(step.shell, { shell: true, ...options })
    : spawnSync(
        step.argv[0] === 'node' ? process.execPath : step.argv[0],
        step.argv.slice(1),
        { shell: win && step.argv[0].endsWith('.cmd'), ...options },
      );
  const body = `${result.stdout ?? ''}${result.stderr ?? ''}\nexit ${result.status}\n`;
  fs.writeFileSync(log, body);
  const tail =
    body
      .split(/\r?\n/)
      .filter((line) => line.trim() && !/^exit \d+$/.test(line))
      .pop() ?? '';
  return { status: result.status, tail: tail.slice(0, 160) };
}

function main(argv) {
  const options = parseFlags(argv, {
    strings: STRINGS,
    booleans: ['--dry-run'],
  });
  requireFlags(options, ['merge', 'unit', 'date']);
  if (!HEX40.test(options.merge))
    refuse('INVALID_ARGUMENT', `--merge ${options.merge}`);
  if (!UNIT_ID.test(options.unit))
    refuse('INVALID_ARGUMENT', `--unit ${options.unit}`);
  if (!DATE8.test(options.date))
    refuse('INVALID_ARGUMENT', `--date ${options.date}`);

  const repoRoot = options.repoRoot
    ? path.resolve(options.repoRoot)
    : REPO_ROOT;
  const logDirRelative = `.sisyphus/roadmap-completion-20260912/${options.unit.toLowerCase()}-main-proof-${options.date}`;
  const logDir = path.join(repoRoot, logDirRelative);
  const steps = ladder(options, logDirRelative);

  const head = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (head.status !== 0)
    refuse('GIT_FAILED', `git rev-parse HEAD in ${posix(repoRoot)} failed`);
  if (head.stdout.trim() !== options.merge)
    refuse(
      'WRONG_HEAD',
      `HEAD is ${head.stdout.trim()}, not the merge commit ${options.merge}`,
    );
  const status = spawnSync('git', ['status', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const dirty = (status.stdout ?? '').trim();
  if (dirty)
    refuse(
      'TREE_DIRTY',
      `the tree is dirty: ${dirty.split(/\r?\n/).length} entries; the proof must run on the merge commit alone`,
    );

  console.log(
    `main proof ${options.unit} on ${options.merge.slice(0, 9)} -> ${logDirRelative}`,
  );
  if (options.dryRun) {
    for (const step of steps)
      console.log(`DRY-RUN ${step.name}: ${printable(step)}`);
    return;
  }

  fs.mkdirSync(logDir, { recursive: true });
  for (const step of steps) {
    if (step.name === 'e2e-marker') {
      const line = e2eMarker(repoRoot);
      fs.appendFileSync(path.join(logDir, 'build.log'), `${line}\n`);
      console.log(`e2e-marker: ${line}`);
      continue;
    }
    if (step.name === 'sha256') {
      const lines = fs
        .readdirSync(logDir)
        .filter((name) => name.endsWith('.log'))
        .sort()
        .map(
          (name) =>
            `${createHash('sha256')
              .update(fs.readFileSync(path.join(logDir, name)))
              .digest('hex')} *${name}`,
        );
      fs.writeFileSync(
        path.join(logDir, 'sha256.txt'),
        `${lines.join('\n')}\n`,
      );
      console.log(`sha256: ${lines.length} logs hashed`);
      continue;
    }
    if (step.name === 'dirty-check') {
      const after = spawnSync('git', ['status', '--short'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      console.log(
        `status: ${(after.stdout ?? '').trim().split(/\r?\n/).filter(Boolean).length} dirty lines`,
      );
      continue;
    }
    const outcome = execute(step, { repoRoot, logDir });
    console.log(`${step.name} exit ${outcome.status}: ${outcome.tail}`);
  }
}

runCli(main, 'MAIN_PROOF_ERROR');
