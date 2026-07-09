import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pipeFilteredOutput } from '../lib/known-validation-output.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const playwrightCli = path.join(
  repoRoot,
  'node_modules',
  '@playwright',
  'test',
  'cli.js',
);
const rawArgs = process.argv.slice(2);
// Prod-evidence capture (command-screens re-audit H2): `--prod-evidence` is
// OUR flag, stripped before forwarding to the Playwright CLI. It flips the
// webServer to a build+start chain against the standalone production server
// and stamps the evidence manifest buildMode accordingly (the capture spec
// reads MEKSTATION_COMMAND_SCREEN_BUILD_MODE from this process's env).
const prodEvidence = rawArgs.includes('--prod-evidence');
const playwrightArgs = rawArgs.filter((arg) => arg !== '--prod-evidence');
const prodEvidenceEnv = prodEvidence
  ? {
      MEKSTATION_E2E_SERVER_COMMAND:
        'npx kill-port 3600 --silent && npm run build && node .next/standalone/server.js',
      // A full `next build` runs inside the webServer command — allow 15 min.
      MEKSTATION_E2E_SERVER_TIMEOUT_MS: '900000',
      MEKSTATION_COMMAND_SCREEN_BUILD_MODE: 'production',
      // The standalone server reads PORT; the dev server defaults to 3600.
      PORT: '3600',
    }
  : {};
const isInteractive =
  playwrightArgs.includes('--ui') || playwrightArgs.includes('--debug');

const child = spawn(process.execPath, [playwrightCli, ...playwrightArgs], {
  cwd: repoRoot,
  env: {
    ...process.env,
    BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: 'true',
    BROWSERSLIST_IGNORE_OLD_DATA: 'true',
    ...prodEvidenceEnv,
  },
  stdio: isInteractive ? 'inherit' : ['inherit', 'pipe', 'pipe'],
});

if (!isInteractive) {
  pipeFilteredOutput(child.stdout, process.stdout);
  pipeFilteredOutput(child.stderr, process.stderr);
}

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
