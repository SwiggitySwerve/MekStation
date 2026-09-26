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
 * `--runtime-command "<program> <args...>"` (anything else). The ladder
 * refuses before doing anything when no runtime proof is named, when HEAD is
 * not the merge commit, or when the tree is dirty.
 *
 * No step goes through a shell (U39). Every spawn is spawnStep's, which runs
 * `node` as process.execPath and `npm` / `npx` as process.execPath plus npm's
 * own npm-cli.js / npx-cli.js, so nothing launches a .cmd file and cmd.exe
 * never parses an argument: a --runtime-jest regex holding | ( ) or & reaches
 * jest.js verbatim. --runtime-command is therefore an argv written as one
 * string, split on whitespace; a quote or shell operator in it is refused,
 * since no shell would ever read it. After the runtime proof, the
 * exact-main-ladder step reruns the highest registered E2E-80 rung on the
 * merge commit into its own log.
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
import { fileURLToPath } from 'node:url';

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
const JEST = 'node_modules/jest/bin/jest.js';
/** Characters a shell would have read; without one they would reach the program literally. */
const SHELL_SYNTAX = /["'`|&;<>]/;

/**
 * npm's own JavaScript entry point (npm-cli.js or npx-cli.js) for the node
 * that is running: beside node.exe on Windows, under ../lib on POSIX. Returns
 * the first candidate that exists, else the first one, whose spawn then logs
 * node's "Cannot find module" and a non-zero exit.
 */
function npmEntry(file) {
  const bin = path.dirname(process.execPath);
  const candidates = [
    path.join(bin, 'node_modules/npm/bin', file),
    path.join(bin, '../lib/node_modules/npm/bin', file),
  ];
  return (
    candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]
  );
}

/**
 * The program actually launched for a step argv: `node` becomes
 * process.execPath, `npm` and `npx` become process.execPath plus npm-cli.js
 * or npx-cli.js, and anything else is returned unchanged. Every other element
 * is passed through untouched.
 */
export function resolveArgv([program, ...rest]) {
  if (program === 'node') return [process.execPath, ...rest];
  if (program === 'npm' || program === 'npx')
    return [process.execPath, npmEntry(`${program}-cli.js`), ...rest];
  return [program, ...rest];
}

/**
 * The one spawn seam every argv step goes through. spawnSync is never given
 * a shell option (so it defaults to none) and resolveArgv never yields a
 * .cmd file, so on Windows each argv element reaches the program as one
 * argument, byte for byte, without cmd.exe parsing it.
 */
export function spawnStep(argv, { cwd, env }) {
  const [command, ...args] = resolveArgv(argv);
  return spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * The runtime proof step, which is the only thing that differs between units.
 * --runtime-command is split on whitespace into an argv; a value with a quote
 * or a shell operator in it, or with no program, is refused.
 */
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
    return { name: 'playwright', argv: ['node', JEST, options.runtimeJest] };
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
  const command = String(options.runtimeCommand ?? '').trim();
  if (!command || SHELL_SYNTAX.test(command))
    refuse(
      'RUNTIME_COMMAND_NOT_ARGV',
      `--runtime-command is an argv split on whitespace and never reaches a shell; quotes and shell operators are refused: ${options.runtimeCommand}`,
    );
  return { name: 'playwright', argv: command.split(/\s+/) };
}

/**
 * The step table, in run order. The exact-main-ladder step reruns the
 * contract's highest registered rung on the merge commit, with the
 * NODE_ENV the ladder runner is always given, after the runtime proof and
 * before sha256 so its log is hashed with the rest.
 */
export function ladder(options, logDirRelative) {
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
      argv: ['npm', 'run', 'build'],
      env: { NEXT_PUBLIC_E2E_MODE: 'true', NEXT_PUBLIC_E2E_TEST: 'true' },
    },
    {
      name: 'e2e-marker',
      inProcess: 'scan .next/static/chunks/pages/_app-*.js for __E2E_MODE__',
    },
    { name: 'idle-before-runtime', ...idle },
    runtimeStep(options),
    {
      name: 'exact-main-ladder',
      argv: [
        'node',
        'scripts/qc/validate-exact-main-regression-ladder.mjs',
        '--sha',
        options.merge,
        '--rerun',
      ],
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'tsc',
      argv: ['node', 'node_modules/typescript/bin/tsc', '--noEmit'],
    },
    { name: 'validator', argv: ['node', validator] },
    { name: 'git-check', argv: ['node', validator, '--git'] },
    { name: 'next', argv: ['node', validator, '--next'] },
    {
      name: 'openspec-strict',
      argv: ['npx', 'openspec', 'validate', '--all', '--strict'],
    },
    { name: 'qc-openspec-ci', argv: ['npm', 'run', 'qc:openspec-ci:validate'] },
    {
      name: 'qc-pin',
      argv: [
        'node',
        JEST,
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

/** A step as --dry-run prints it: an in-process step's description, else its env assignments then its argv joined by spaces. */
const printable = (step) => {
  const prefix = Object.entries(step.env ?? {})
    .map(([key, value]) => `${key}=${value} `)
    .join('');
  if (step.inProcess) return `${step.inProcess} (in-process)`;
  return prefix + step.argv.join(' ');
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

/**
 * Run one argv step through spawnStep and write <name>.log: its stdout, its
 * stderr, the spawn error when it could not start, then `exit <status>`.
 * Returns the status and the log's last non-exit line.
 */
function execute(step, { repoRoot, logDir }) {
  const log = path.join(logDir, `${step.name}.log`);
  const result = spawnStep(step.argv, {
    cwd: repoRoot,
    env: { ...process.env, ...(step.env ?? {}) },
  });
  const spawnError = result.error
    ? `spawn error: ${result.error.message}\n`
    : '';
  const body = `${result.stdout ?? ''}${result.stderr ?? ''}${spawnError}\nexit ${result.status}\n`;
  fs.writeFileSync(log, body);
  const tail =
    body
      .split(/\r?\n/)
      .filter((line) => line.trim() && !/^exit \d+$/.test(line))
      .pop() ?? '';
  return { status: result.status, tail: tail.slice(0, 160) };
}

/**
 * The CLI: validates the flags, builds the step table (refusing a missing or
 * shell-shaped runtime proof), refuses a HEAD that is not --merge or a dirty
 * tree, then either prints every step (--dry-run) or hands them to runLadder.
 */
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
  runLadder({ steps, repoRoot, logDir });
}

/**
 * The execution branch: creates logDir, then runs the steps in order. The
 * three in-process steps append the marker line to build.log, write
 * sha256.txt over every .log present at that moment, and print the count of
 * `git status --short` lines; every other step goes through execute(), and
 * each prints one `<name> exit <status>: <tail>` line. A failing step does
 * not stop the ones after it.
 */
export function runLadder({ steps, repoRoot, logDir }) {
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
      const after = spawnStep(['git', 'status', '--short'], {
        cwd: repoRoot,
        env: process.env,
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

// The CLI runs only when this file is the entry script, so the pin can import
// ladder, runLadder and the spawn seam without starting a proof.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  runCli(main, 'MAIN_PROOF_ERROR');
