/**
 * Two-process journal-authority harness (R2.authority-cutover CO3).
 *
 * Three things this file owns, and why each one is here rather than
 * inlined in the spec:
 *
 * 1. **Finding the database the e2e server is actually using.** The
 *    Playwright webServer's `DATABASE_PATH` is a RELATIVE path baked
 *    into `playwright.config.ts`, and `server.js` does
 *    `process.chdir(__dirname)` when it is running the standalone
 *    layout - so the same env value resolves under `.next/standalone/`
 *    for a packaged run and under the repo root for a dev run. Guessing
 *    one of those would silently open an EMPTY database and every
 *    assertion built on it would pass for the wrong reason, which is the
 *    failure mode `sqliteEvidenceReader`'s `fileMustExist` exists to
 *    stop. So the path is RESOLVED, not assumed: the candidate that
 *    actually holds the campaign the drive just created THROUGH the
 *    server is the server's database, and anything but exactly one
 *    qualifying candidate is a loud failure.
 *
 * 2. **Reading the flags, the marker and the journal out of process.**
 *    Playwright transpiles e2e files with babel, which refuses the
 *    TypeScript `declare` class fields in `JournalCampaignEventStore.ts`
 *    - so a spec cannot import the resolver, the marker store or the
 *    journal reads at all. `scripts/e2e/campaign-journal-authority.ts`
 *    runs them under `npx tsx` (the runner this repo already uses for
 *    its TypeScript CLIs) and answers one line of JSON. The production
 *    code path is therefore exercised by a real Node process, not
 *    re-implemented here in raw SQL - which would have proven nothing
 *    about the code production runs.
 *
 * 3. **The source process lifecycle.** The spawn/respawn/backoff/
 *    readiness shape is `scripts/e2e/relaunching-server.mjs`, and the
 *    spawn options are `campaign-two-device-drive.spec.ts`'s second
 *    server - with ONE deliberate inversion: that spec gives its second
 *    process its OWN `DATABASE_PATH` because separate files are what it
 *    is proving. Here the two processes share one file, because shared
 *    durable state is what THIS slice is proving.
 */

import { expect, type APIRequestContext } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The second process's port. Reuses the two-device drive's own env var
 * and fixed default rather than deriving one from the primary port -
 * the harness already owns this number, and minting a second convention
 * for it would leave two places to keep in step.
 */
export const SOURCE_PORT = Number(
  process.env.MEKSTATION_E2E_SECOND_PORT ?? 3617,
);

export interface ISourceServer {
  readonly origin: string;
  readonly pid: number;
  readonly process: ChildProcess;
}

/** What the authority CLI answers. Narrow: only what the spec asserts. */
export interface IAuthorityCliResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly read?: string;
  readonly marker?: {
    readonly state: string;
    readonly firstJournalAuthorityCommandId: string | null;
  } | null;
  readonly stateDigest?: string;
  readonly path?: string;
  readonly highestSequence?: number;
  readonly cutoverFlag?: boolean;
  readonly effective?: boolean;
}

/** The per-run Playwright token the webServer's paths are keyed by. */
function runId(): string {
  const value = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!value) throw new Error('PLAYWRIGHT_E2E_RUN_ID missing');
  return value;
}

/**
 * Resolve the database file the Playwright webServer is really writing.
 *
 * The campaign id must already have been created THROUGH that server,
 * so the row is the proof. A candidate that does not exist, or exists
 * without the row, is not the server's database - and if none qualify
 * the harness fails loudly rather than letting a later step open a
 * fresh file and report an empty world as evidence.
 */
export function resolveServerDatabase(campaignId: string): string {
  const relative = path.join(
    '.sisyphus',
    'e2e-runtime',
    runId(),
    'mekstation.db',
  );
  // Repo root first (dev server, cwd unchanged), then the standalone
  // layout (server.js chdir's to `.next/standalone` when it is running
  // the packaged build).
  const candidates = [
    path.resolve(process.cwd(), relative),
    path.resolve(process.cwd(), '.next', 'standalone', relative),
  ];
  const found = candidates.filter(
    (candidate) =>
      fs.existsSync(candidate) && holdsCampaign(candidate, campaignId),
  );
  if (found.length !== 1) {
    throw new Error(
      `cannot identify the e2e server database for ${campaignId}: ` +
        `${found.length} of ${candidates.length} candidates hold it ` +
        `(${candidates.join(', ')})`,
    );
  }
  return found[0];
}

/** Read-only probe: does this file hold the campaign row? */
function holdsCampaign(databasePath: string, campaignId: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as typeof import('better-sqlite3');
  let db: import('better-sqlite3').Database | null = null;
  try {
    db = new Database(databasePath, { readonly: true, fileMustExist: true });
    const row = db
      .prepare('SELECT 1 AS present FROM campaigns WHERE id = ?')
      .get(campaignId) as { present: number } | undefined;
    return row !== undefined;
  } catch {
    // A file without the campaigns table, or one mid-creation, is simply
    // not the database being looked for.
    return false;
  } finally {
    db?.close();
  }
}

/**
 * Run the authority CLI and parse its single JSON line.
 *
 * `tsx`'s own entry module is invoked through `process.execPath` rather
 * than through `npx`, so the child is a plain Node process with no shell
 * between it and this one - the same reason the two-device drive spawns
 * `node server.js` instead of an npm script.
 */
export function runAuthorityCli(
  command: 'cutover' | 'marker' | 'flags' | 'stream',
  options: { databasePath?: string; campaignId?: string } = {},
): IAuthorityCliResult {
  const args = [
    path.join('node_modules', 'tsx', 'dist', 'cli.mjs'),
    path.join('scripts', 'e2e', 'campaign-journal-authority.ts'),
    '--command',
    command,
  ];
  if (options.databasePath) args.push('--database', options.databasePath);
  if (options.campaignId) args.push('--campaign', options.campaignId);
  const run = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    env: process.env,
  });
  const line = run.stdout
    .split('\n')
    .map((value) => value.trim())
    .filter((value) => value.startsWith('{'))
    .pop();
  if (!line) {
    throw new Error(
      `authority CLI produced no result: ${run.stdout}\n${run.stderr}`,
    );
  }
  return JSON.parse(line) as IAuthorityCliResult;
}

/** The journal's highest campaign sequence, or -1 for an empty stream. */
export function readHighestSequence(
  databasePath: string,
  campaignId: string,
): number {
  const result = runAuthorityCli('stream', { databasePath, campaignId });
  if (!result.ok) throw new Error(`stream read failed: ${result.error}`);
  return result.highestSequence ?? -1;
}

/** The durable cutover marker, or null when the campaign has no row. */
export function readMarker(
  databasePath: string,
  campaignId: string,
): IAuthorityCliResult['marker'] {
  const result = runAuthorityCli('marker', { databasePath, campaignId });
  if (!result.ok) throw new Error(`marker read failed: ${result.error}`);
  return result.marker ?? null;
}

/**
 * The env the source process runs under: this process's env with the
 * source's port, the shared campaign database, its own multiplayer
 * database, the loopback hostname server.js requires, and production
 * mode.
 */
export function sourceServerEnv(
  databasePath: string,
  multiplayerDbPath: string,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(SOURCE_PORT),
    // Absolute, so the standalone server's chdir cannot move it.
    DATABASE_PATH: databasePath,
    // Deliberately NOT shared: the multiplayer match store is a
    // different database, and sharing it would widen what this proof
    // claims beyond the campaign journal it is about.
    MULTIPLAYER_STORE: 'durable',
    MULTIPLAYER_DB_PATH: multiplayerDbPath,
    // server.js refuses any hostname but localhost/127.0.0.1.
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
  };
  return env;
}

/**
 * Boot the source process on its own port against the shared database.
 *
 * `.next/standalone/server.js` rather than the repo-root `server.js`:
 * the two processes must be the SAME production binary, or "two
 * processes converged" would quietly also mean "two different builds
 * happened to agree".
 */
export async function startSourceServer(
  request: APIRequestContext,
  env: NodeJS.ProcessEnv,
): Promise<ISourceServer> {
  const origin = `http://127.0.0.1:${SOURCE_PORT}`;
  await refuseOccupiedPort(request, origin);
  const child = spawn(
    process.execPath,
    [path.join('.next', 'standalone', 'server.js')],
    { env, stdio: 'pipe' },
  );
  // Drained, not forwarded: an unread pipe eventually blocks the child.
  child.stdout?.on('data', () => undefined);
  child.stderr?.on('data', () => undefined);
  if (child.pid === undefined) throw new Error('source server did not spawn');
  await waitForServer(request, origin);
  return { origin, pid: child.pid, process: child };
}

/**
 * Refuse to adopt a server this harness did not start.
 *
 * Copied from the two-device drive for the reason its comment records:
 * a leftover process answers instantly, so the drive "passes" in under a
 * second against a stale database without ever having started a second
 * process.
 */
async function refuseOccupiedPort(
  request: APIRequestContext,
  origin: string,
): Promise<void> {
  let occupied = false;
  try {
    const probe = await request.get(`${origin}/api/campaigns`, {
      timeout: 3_000,
    });
    occupied = probe.ok();
  } catch {
    occupied = false;
  }
  if (occupied) {
    throw new Error(
      `port ${SOURCE_PORT} is already serving; stop it before running this drive`,
    );
  }
}

/** Polls until the process answers, then gives up loudly. */
export async function waitForServer(
  request: APIRequestContext,
  origin: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no attempt made';
  while (Date.now() < deadline) {
    try {
      const response = await request.get(`${origin}/api/campaigns`, {
        timeout: 5_000,
      });
      if (response.ok()) return;
      lastError = `status ${response.status()}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`source server never became ready: ${lastError}`);
}

/**
 * Stop the process and WAIT for it to be gone.
 *
 * The wait is load-bearing on Windows: SQLite holds the WAL open until
 * the process really exits, so a respawn racing the old process would
 * be two writers on one file rather than a restart.
 */
export async function stopSourceServer(server: ISourceServer): Promise<void> {
  if (server.process.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => {
    server.process.once('exit', () => resolve());
    setTimeout(resolve, 15_000);
  });
  server.process.kill();
  await exited;
}

/**
 * An OS-level restart: kill, wait for the exit, back off, respawn on the
 * same port against the same file. The backoff is
 * `relaunching-server.mjs`'s, and exists for the same reason - a
 * respawn that races the listener teardown fails to bind.
 */
export async function restartSourceServer(
  request: APIRequestContext,
  server: ISourceServer,
  env: NodeJS.ProcessEnv,
): Promise<ISourceServer> {
  await stopSourceServer(server);
  await new Promise((resolve) => setTimeout(resolve, 750));
  const restarted = await startSourceServer(request, env);
  // A restart that reused the process would prove nothing about durable
  // survival, so the identity change is asserted here rather than left
  // to the caller to remember.
  expect(restarted.pid).not.toBe(server.pid);
  return restarted;
}
