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

const child = spawn(process.execPath, [nextCli, ...nextArgs], {
  cwd: repoRoot,
  env: {
    ...process.env,
    BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: 'true',
    BROWSERSLIST_IGNORE_OLD_DATA: 'true',
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
