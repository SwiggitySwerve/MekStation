#!/usr/bin/env node
// Run a CI check in the background of its job and report it later, as its
// own step, with its own log and exit code (CI-SPEED round 2, lever 4).
//
//   node scripts/ci/background-step.mjs start <name> [--after <name>] -- <command>
//   node scripts/ci/background-step.mjs wait <name> [--timeout-seconds N]
//
// `start` launches `bash -c <command>` detached, so it survives its step, and
// returns at once. With --after, the command waits for that check to finish
// first (both run, whatever the first one's result). `wait` blocks until the
// check has finished, prints its output and exits with its exit code. A check
// that was never started, or does not finish in time, fails its wait.
// State lives in $BACKGROUND_STEP_DIR (default $RUNNER_TEMP/background-steps).

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = /^[a-z0-9][a-z0-9-]*$/;

export function stateDir(env = process.env) {
  return (
    env.BACKGROUND_STEP_DIR ??
    path.join(env.RUNNER_TEMP ?? os.tmpdir(), 'background-steps')
  );
}

function files(dir, name) {
  if (!NAME.test(name))
    throw new Error(`Invalid background step name: ${name}`);
  return {
    log: path.join(dir, `${name}.log`),
    rc: path.join(dir, `${name}.rc`),
    started: path.join(dir, `${name}.started`),
  };
}

const quote = (value) => `'${value.replaceAll("'", `'\\''`)}'`;

/** Launch `command` in the background; returns the child pid. */
export function start(name, command, { after, dir = stateDir() } = {}) {
  if (!command) throw new Error('Missing command');
  fs.mkdirSync(dir, { recursive: true });
  const own = files(dir, name);
  if (fs.existsSync(own.started))
    throw new Error(`Background step already started: ${name}`);
  const waitFor = after
    ? `while [ ! -f ${quote(files(dir, after).rc)} ]; do sleep 1; done; `
    : '';
  // The rc file is written last, after the log is complete.
  const script =
    `${waitFor}( ${command} ) > ${quote(own.log)} 2>&1; ` +
    `rc=$?; echo "$rc" > ${quote(own.rc + '.tmp')}; mv ${quote(own.rc + '.tmp')} ${quote(own.rc)}`;
  fs.writeFileSync(own.started, `${new Date().toISOString()}\n${command}\n`);
  const child = spawn('bash', ['-c', script], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return child.pid;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait for `name`, print its log, and return its exit code. */
export async function wait(
  name,
  {
    timeoutSeconds = 900,
    dir = stateDir(),
    out = process.stdout,
    pollMs = 500,
  } = {},
) {
  const own = files(dir, name);
  if (!fs.existsSync(own.started)) {
    out.write(`Background step ${name} was never started.\n`);
    return 1;
  }
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (!fs.existsSync(own.rc)) {
    if (Date.now() > deadline) {
      out.write(
        `Background step ${name} did not finish in ${timeoutSeconds} s.\n`,
      );
      if (fs.existsSync(own.log)) out.write(fs.readFileSync(own.log, 'utf8'));
      return 1;
    }
    await sleep(pollMs);
  }
  if (fs.existsSync(own.log)) out.write(fs.readFileSync(own.log, 'utf8'));
  const code = Number.parseInt(fs.readFileSync(own.rc, 'utf8').trim(), 10);
  return Number.isInteger(code) ? code : 1;
}

async function main(argv) {
  const [verb, name, ...rest] = argv;
  if (verb === 'start') {
    const dash = rest.indexOf('--');
    if (dash === -1)
      throw new Error('usage: start <name> [--after <name>] -- <command>');
    const flags = rest.slice(0, dash);
    const afterIndex = flags.indexOf('--after');
    const after = afterIndex === -1 ? undefined : flags[afterIndex + 1];
    start(name, rest.slice(dash + 1).join(' '), { after });
    console.log(
      `Started ${name} in the background${after ? ` after ${after}` : ''}.`,
    );
    return 0;
  }
  if (verb === 'wait') {
    const index = rest.indexOf('--timeout-seconds');
    const timeoutSeconds = index === -1 ? undefined : Number(rest[index + 1]);
    return wait(name, timeoutSeconds ? { timeoutSeconds } : {});
  }
  throw new Error('usage: background-step.mjs start|wait <name> ...');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error.message);
      process.exit(2);
    },
  );
}
