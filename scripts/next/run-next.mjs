import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pipeFilteredOutput } from '../lib/known-validation-output.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const nextCli = path.join(
  repoRoot,
  'node_modules',
  'next',
  'dist',
  'bin',
  'next',
);
const nextArgs = process.argv.slice(2);
const defaultNextBuildOldSpaceMb = '8192';

function hasExplicitOldSpaceLimit(nodeOptions) {
  return /(?:^|\s)--max-old-space-size(?:=|\s)\S*/.test(nodeOptions ?? '');
}

function resolveNodeOptions(env, args) {
  const nodeOptions = env.NODE_OPTIONS ?? '';
  if (args[0] !== 'build' || hasExplicitOldSpaceLimit(nodeOptions)) {
    return nodeOptions;
  }

  const oldSpaceMb =
    env.MEKSTATION_NEXT_BUILD_OLD_SPACE_MB ?? defaultNextBuildOldSpaceMb;
  return [nodeOptions.trim(), `--max-old-space-size=${oldSpaceMb}`]
    .filter(Boolean)
    .join(' ');
}

const child = spawn(process.execPath, [nextCli, ...nextArgs], {
  cwd: repoRoot,
  env: {
    ...process.env,
    BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: 'true',
    BROWSERSLIST_IGNORE_OLD_DATA: 'true',
    NODE_OPTIONS: resolveNodeOptions(process.env, nextArgs),
  },
  stdio: ['inherit', 'pipe', 'pipe'],
});

pipeFilteredOutput(child.stdout, process.stdout);
pipeFilteredOutput(child.stderr, process.stderr);

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
