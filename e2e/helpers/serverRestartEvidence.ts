/**
 * Proof that a server-killing scenario really restarted the server.
 *
 * WHY: the server-killing specs (E2E-01/02, E2E-05/06, E2E-15) wait for
 * the relaunch by polling an HTTP route for a 200. That poll passes at once
 * when nothing died, and their other assertions are also satisfied by a
 * normal commit, so a death that never fired (a fault seam missing on a
 * commit path, a fault that was not armed) left them green. Under the
 * combat-journal arm, E2E-01/02's host death never fired, and they passed
 * "survives restart" without a restart.
 *
 * HOW: `/api/health` reports `timestamp` and `uptime`, where `uptime`
 * counts from that route module's load in the serving process. Their
 * difference is when the serving process started, which moves forward only
 * when a new process answers. Read it before arming the death; after the
 * relaunch it must have moved forward. No product or relauncher change.
 */

import { expect, type APIRequestContext } from '@playwright/test';

/** When the process answering `/api/health` started (ms since epoch). */
export async function readServerStartMs(
  request: APIRequestContext,
): Promise<number> {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    timestamp: string;
    uptime: number;
  };
  return Date.parse(body.timestamp) - body.uptime * 1000;
}

/**
 * Assert the server process was replaced since `startedBefore` was read.
 * `uptime` is whole seconds, so without a restart two readings agree within
 * a second; a restart moves the start time forward by the death-to-relaunch
 * interval, several seconds in practice.
 */
export async function expectServerRestarted(
  request: APIRequestContext,
  startedBefore: number,
): Promise<void> {
  await expect
    .poll(async () => (await readServerStartMs(request)) - startedBefore, {
      message: 'the scenario must kill and restart the server process',
      timeout: 30_000,
    })
    .toBeGreaterThan(1500);
}
