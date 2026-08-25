/**
 * The startup refusal, proven against the REAL server entrypoint
 * (umbrella task 20.2; plan todo 28 "production config fails startup").
 *
 * The pure guard is unit-tested next door. This asserts the thing that
 * actually protects a deploy: `server.js` refuses to come up. A guard
 * that exists in a module nothing calls protects nothing, and `server.js`
 * is CommonJS so it cannot import the TS module — the mirror can drift,
 * and only spawning the real process notices.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../../..');
const serverEntry = path.join(repoRoot, 'server.js');

/** Boots server.js just far enough to hit the startup guards. */
function boot(env: Record<string, string>): {
  status: number | null;
  stderr: string;
} {
  const result = spawnSync(process.execPath, [serverEntry], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 20_000,
    env: {
      ...process.env,
      // A port nothing will bind; the guards run before listen, and a
      // rejected boot must not depend on the port being free.
      PORT: '0',
      HOSTNAME: '127.0.0.1',
      ...env,
    },
  });
  return { status: result.status, stderr: result.stderr ?? '' };
}

describe('server startup rejects fault configuration', () => {
  it('refuses to boot production with fault controls configured', () => {
    const result = boot({
      NODE_ENV: 'production',
      MEKSTATION_FAULT_CONTROLS: 'store.commit',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('FAULT_CONTROLS_IN_PRODUCTION');
  });

  it('refuses a development boot too, not only production', () => {
    const result = boot({
      NODE_ENV: 'development',
      MEKSTATION_FAULT_CONTROLS: 'outbox.insert',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('FAULT_CONTROLS_IN_PRODUCTION');
  });

  it('does not refuse a boot carrying no fault configuration', () => {
    // The control. Without it every row above would pass against a
    // server that fails to start for some entirely unrelated reason -
    // which, on a machine with no build, it otherwise would.
    const result = boot({ NODE_ENV: 'production' });

    expect(result.stderr).not.toContain('FAULT_CONTROLS_IN_PRODUCTION');
  });
});
