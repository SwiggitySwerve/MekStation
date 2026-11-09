import { spawn } from 'node:child_process';
import { constants } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listeningPortOwner } from '../qc/machine-idle.mjs';
import devPort from './dev-port.cjs';

const { resolveDevPort, assertDevPortAvailable, devServerArguments } = devPort;
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

async function runChild(args, env) {
  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });
  const interrupt = () => child.kill('SIGINT');
  const terminate = () => child.kill('SIGTERM');
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  try {
    return await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) =>
        resolve(signal ? 128 + (constants.signals[signal] ?? 0) : (code ?? 1)),
      );
    });
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
  }
}

async function main(args) {
  if (
    args.length > 1 ||
    args.some((arg) => !['--next', '--check-port'].includes(arg))
  )
    throw new Error(
      'Usage: node scripts/next/run-dev.mjs [--next | --check-port]',
    );
  const port = resolveDevPort(process.env.PORT);
  await assertDevPortAvailable(port, { findOwner: listeningPortOwner });
  if (args.includes('--check-port')) return 0;

  const env = { ...process.env, PORT: String(port) };
  const syncCode = await runChild(
    [path.join(repoRoot, 'scripts', 'mm-data', 'sync-browser-config.mjs')],
    env,
  );
  if (syncCode !== 0) return syncCode;
  return runChild(
    devServerArguments(args.includes('--next'), port, repoRoot),
    env,
  );
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(`[dev] ${error.message}`);
  process.exitCode = 1;
}
