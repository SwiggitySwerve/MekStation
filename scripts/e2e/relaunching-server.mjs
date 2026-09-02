/**
 * Relaunching e2e server wrapper (umbrella 21.x restart harness).
 *
 * The restart acceptance scenarios (E2E-05/06/15) kill the server
 * mid-test through the process-exit fault kinds; Playwright's webServer
 * cannot restart a dead child, so this wrapper owns the lifecycle: it
 * spawns `node server.js`, and when the child exits it respawns after a
 * short backoff. The readiness-URL gate the specs already use is what
 * sequences "wait until it is back".
 *
 * The wrapper itself dying (Playwright tearing the webServer down)
 * takes the child with it - no orphaned servers between runs.
 */

import { spawn } from 'node:child_process';

const RESPAWN_DELAY_MS = 750;
let child = null;
let shuttingDown = false;

function launch() {
  child = spawn(process.execPath, ['server.js'], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => {
    if (shuttingDown) return;
    // A death here is either a scenario's armed process-exit fault or a
    // real crash; both respawn - the specs assert recovery semantics,
    // and a crash-looping server fails the readiness gate loudly.
    // eslint-disable-next-line no-console
    console.log(`[e2e-relaunch] server exited code=${code}; respawning`);
    setTimeout(launch, RESPAWN_DELAY_MS);
  });
}

function shutdown() {
  shuttingDown = true;
  if (child && child.exitCode === null) child.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => {
  if (child && child.exitCode === null) child.kill();
});

launch();
