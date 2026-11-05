// Owns suite isolation and the bounded, longest-first execution queue.
import path from 'node:path';

import { CI_SUITES } from './ci-e2e-plan.mjs';

export function suiteRuntime(root, suite, shard, run, attempt) {
  for (const value of [run, attempt]) {
    if (!/^[a-zA-Z0-9_-]+$/.test(String(value)))
      throw new Error('Invalid CI E2E execution identity');
  }
  const index = CI_SUITES.findIndex(({ name }) => name === suite);
  if (index < 0 || ![1, 2].includes(shard) || !path.isAbsolute(root))
    throw new Error('Invalid CI E2E suite runtime');
  const runId = `ci-${run}-${attempt}-${shard}-${suite}`;
  const directory = path
    .join(root, '.sisyphus/e2e-runtime', runId)
    .replaceAll('\\', '/');
  const database = `${directory}/mekstation.db`;
  const multiplayerDatabase = `${directory}/multiplayer-matches.db`;
  const port = 3700 + index;
  return {
    suite,
    port,
    runId,
    database,
    multiplayerDatabase,
    environment: {
      MEKSTATION_E2E_PORT: String(port),
      PLAYWRIGHT_E2E_RUN_ID: runId,
      MEKSTATION_E2E_REUSE_EXISTING_SERVER: 'false',
      DATABASE_PATH: database,
      MULTIPLAYER_DB_PATH: multiplayerDatabase,
    },
  };
}

export function assertRuntime(report, runtime) {
  const server = report.config?.webServer;
  const env = server?.env;
  const ready = new URL(server?.url ?? 'http://invalid');
  if (
    server?.command !== 'node .next/standalone/server.js' ||
    env?.PORT !== String(runtime.port) ||
    env?.PLAYWRIGHT_E2E_RUN_ID !== runtime.runId ||
    env?.DATABASE_PATH !== runtime.database ||
    env?.MULTIPLAYER_DB_PATH !== runtime.multiplayerDatabase ||
    ready.port !== String(runtime.port) ||
    ready.searchParams.get('runId') !== runtime.runId ||
    server?.reuseExistingServer !== false
  )
    throw new Error(
      `${runtime.suite} did not use its isolated standalone runtime`,
    );
}

/** All suites settle for evidence; any failure remains a failure of the job. */
export async function settleSuites(tasks, limit, run, stopped = () => false) {
  if (![1, 2].includes(limit)) throw new Error('At most two concurrent suites');
  const queue = [...tasks].sort(
    (a, b) => b.milliseconds - a.milliseconds || a.suite.localeCompare(b.suite),
  );
  const errors = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < queue.length && !stopped()) {
        const task = queue[next++];
        try {
          await run(task);
        } catch (error) {
          errors.push(error);
        }
      }
    }),
  );
  return errors;
}
