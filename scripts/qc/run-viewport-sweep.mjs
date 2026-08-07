import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WAVE_CONTRACTS } from './camp01-authority-receipt.contract.mjs';
import { resolveVerifiedLogicalCommand } from './camp01-proof-environment.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

export class Camp01ViewportSweepError extends Error {
  constructor(message, options = {}) {
    super(`CAMP01_VIEWPORT_SWEEP_FAILED: ${message}`, options);
    this.name = 'Camp01ViewportSweepError';
  }
}

export const VIEWPORT_SWEEP_LOGICAL_COMMANDS = Object.freeze(
  WAVE_CONTRACTS['camp-01h'].commandSequence.slice(-3),
);

// prettier-ignore
export function expandedViewportSweepCommands() {
  return VIEWPORT_SWEEP_LOGICAL_COMMANDS.map((argv)=>Object.freeze(resolveVerifiedLogicalCommand(argv)));
}

export async function runViewportSweep({
  listOnly = false,
  runCommand = spawnCommand,
} = {}) {
  for (const [executable, ...baseArgs] of expandedViewportSweepCommands()) {
    const args = listOnly ? [...baseArgs, '--list'] : baseArgs;
    let result;
    try {
      result = await runCommand(executable, args, {
        cwd: repoRoot,
        shell: false,
        stdio: 'inherit',
      });
    } catch (error) {
      if (error instanceof Camp01ViewportSweepError) throw error;
      throw new Camp01ViewportSweepError('process spawn failed', {
        cause: error,
      });
    }
    if (result?.signal) return 1;
    if (!Number.isInteger(result?.code) || result.code < 0 || result.code > 255)
      throw new Camp01ViewportSweepError('invalid process exit');
    if (result.code !== 0) return result.code;
  }
  return 0;
}

function spawnCommand(executable, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, options);
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

function listMode(argv) {
  if (argv.length === 0) return false;
  if (argv.length === 1 && argv[0] === '--list') return true;
  throw new Camp01ViewportSweepError('invalid argument');
}

async function main() {
  process.exitCode = await runViewportSweep({
    listOnly: listMode(process.argv.slice(2)),
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
