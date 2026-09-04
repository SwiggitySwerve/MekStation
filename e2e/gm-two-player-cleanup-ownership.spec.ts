/**
 * Ownership-scoped cleanup (20.5 and E2E-79 / umbrella 22.3).
 *
 * Task 20.5: teardown must preserve ambient tabs, Chrome, unrelated
 * servers, databases, and user artifacts. Seeding called `setActive`,
 * which deactivates every vault identity; the fixture now restores the
 * prior active id. These first two rows hold that.
 *
 * E2E-79: after FINISHED and ABORTED runs, sockets, the server that
 * run started, DB connections (temp files removable), and per-run
 * artifacts stay owned. Playwright's webServer outlives the row and is
 * ambient, so leftover nouns are proven on a child the harness
 * releases — the row never calls cleanup.
 *
 * @tags @gm-two-player @sandbox @E2E-79
 */

import { expect, test, type APIRequestContext } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

import { createGmTwoPlayerCampaignFixture } from './fixtures/gmTwoPlayerCampaign';
import { openEvidenceBundle } from './fixtures/gmTwoPlayerEvidence';
import {
  openSqliteEvidenceReader,
  type ISqliteEvidenceReader,
} from './fixtures/sqliteEvidenceReader';

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';
const guards = require('../scripts/qc/gm-two-player-campaign-core.cjs') as {
  assertRunOwnedPath: (
    target: string,
    runId: string,
    runtimeRoot: string,
  ) => string;
  deriveFixturePort: (runId: string) => number;
};

/** Child body: hold a server, sockets, and a temp DB until finish or kill. */
const OWNED_CHILD_SOURCE = `const net=require('node:net');const fs=require('node:fs');const path=require('node:path');const Database=require('better-sqlite3');const runRoot=process.argv[2];const port=Number(process.argv[3]);const db=new Database(path.join(runRoot,'owned.db'));db.exec('CREATE TABLE owned (id INTEGER PRIMARY KEY)');db.prepare('INSERT INTO owned (id) VALUES (1)').run();fs.writeFileSync(path.join(runRoot,'owned.artifact.txt'),'owned-run-artifact\\n');const sockets=new Set();const server=net.createServer((socket)=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});function harnessShutdown(){for (const socket of sockets) socket.destroy();server.close();db.close();process.exit(0);}process.on('SIGTERM',harnessShutdown);process.on('SIGINT',harnessShutdown);process.stdin.on('data',(chunk)=>{if(String(chunk).includes('finish'))harnessShutdown();});server.listen(port,'127.0.0.1',()=>{process.stdout.write('READY\\n');});`;

interface IOwnedRunHandle {
  readonly runId: string;
  readonly pid: number;
  readonly runtimeRoot: string;
  readonly evidenceRoot: string;
  readonly dbPath: string;
  readonly artifactPath: string;
  readonly evidenceFile: string;
  readonly socket: net.Socket;
  readonly child: ChildProcess;
  reader: ISqliteEvidenceReader | null;
}

/** An identity this spec owns, which the fixture must never touch. */
async function seedAmbientIdentity(
  request: APIRequestContext,
  runId: string,
): Promise<{ id: string; displayName: string; password: string }> {
  const displayName = `Ambient Bystander ${runId.slice(0, 8)}`;
  const password = `Ambient-${runId.slice(0, 12)}!`;
  const response = await request.post('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId },
    data: { displayName, password, runId },
  });
  expect(response.status(), await response.text()).toBe(201);
  const seeded = (await response.json()) as { id: string };
  return { id: seeded.id, displayName, password };
}

/**
 * Which identity the machine currently treats as active.
 *
 * This is the state the sandbox displaces, so it is the state teardown
 * has to hand back. Read through the same e2e route the harness uses
 * rather than the database, so the row proves the contract callers see.
 */
async function activeIdentityId(
  request: APIRequestContext,
  runId: string,
): Promise<string | null> {
  const response = await request.get('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId },
  });
  expect(response.status(), await response.text()).toBe(200);
  return ((await response.json()) as { activeId: string | null }).activeId;
}

/** True when the OS still has this pid. WHY: "server gone" is a live check. */
function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Wait until the child exits. WHY: leftover checks are meaningless earlier. */
function waitForChildExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`owned child pid=${child.pid ?? 0} did not exit`));
    }, 15_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** Wait for READY on stdout. WHY: connect only after listen succeeds. */
function waitForReady(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('owned child never became ready'));
    }, 15_000);
    let buffer = '';
    child.stdout?.on('data', (chunk: Buffer | string) => {
      buffer += String(chunk);
      if (buffer.includes('READY')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      reject(
        new Error(
          `owned child exited before ready code=${String(code)} signal=${String(signal)}`,
        ),
      );
    });
  });
}

/** Open one client socket to the child. WHY: E2E-79 names sockets the run opened. */
function connectOwnedSocket(port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ port, host: '127.0.0.1' }, () =>
      resolve(socket),
    );
    socket.once('error', reject);
  });
}

/** Whether `target` sits under `root`. WHY: artifacts must not escape the run. */
function isInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
}

/** Unlink a temp DB after handles drop. WHY: Windows keeps the file locked briefly. */
async function unlinkWhenClosed(filePath: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      fs.unlinkSync(filePath);
      return;
    } catch (error) {
      lastError = error;
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError;
}

/**
 * Start one owned child run with a server, socket, temp DB, and artifacts.
 * WHY: leftover nouns cannot be proven on Playwright's shared webServer.
 */
async function startOwnedRun(
  label: 'finish' | 'abort' | 'crash',
): Promise<IOwnedRunHandle> {
  const runId = `e2e79-${label}-${process.pid}`;
  const runtimeParent = path.resolve('.sisyphus/e2e-runtime');
  const runtimeRoot = path.join(runtimeParent, runId);
  const evidenceParent = path.resolve('test-results/gm-two-player');
  fs.mkdirSync(runtimeRoot, { recursive: true });
  const scriptPath = path.join(runtimeRoot, 'owned-child.cjs');
  fs.writeFileSync(scriptPath, OWNED_CHILD_SOURCE, 'utf8');
  const port = guards.deriveFixturePort(runId);
  const child = spawn(
    process.execPath,
    [scriptPath, runtimeRoot, String(port)],
    {
      cwd: path.resolve('.'),
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    },
  );
  if (child.pid === undefined)
    throw new Error('owned child spawned without a pid');
  await waitForReady(child);
  const socket = await connectOwnedSocket(port);
  const dbPath = path.join(runtimeRoot, 'owned.db');
  const artifactPath = path.join(runtimeRoot, 'owned.artifact.txt');
  const bundle = openEvidenceBundle(runId, evidenceParent);
  const written = bundle.write(
    'cleanup-log',
    'harness',
    'owned.json',
    JSON.stringify({ runId, label }),
  );
  return {
    runId,
    pid: child.pid,
    runtimeRoot,
    evidenceRoot: bundle.root,
    dbPath,
    artifactPath,
    evidenceFile: path.join(bundle.root, written.file),
    socket,
    child,
    reader: openSqliteEvidenceReader(dbPath),
  };
}

/**
 * Release harness-owned leftovers. WHY: E2E-79 requires the harness,
 * not the row, to close sockets, the child server, and DB connections.
 */
async function releaseOwnedRun(handle: IOwnedRunHandle): Promise<void> {
  if (handle.reader !== null) {
    try {
      handle.reader.close();
    } catch {
      // Already closed by a prior release; a second pass must stay quiet.
    }
    handle.reader = null;
  }
  if (!handle.socket.destroyed) {
    handle.socket.destroy();
  }
  if (handle.child.exitCode === null && handle.child.signalCode === null) {
    handle.child.kill();
  }
  await waitForChildExit(handle.child);
}

/**
 * Drive finish or abort, then let the harness release, then assert leftovers.
 * WHY: the Playwright row only chooses the terminal; it never cleans up.
 */
async function assertAfterOwnedRun(
  mode: 'finish' | 'abort' | 'crash',
): Promise<void> {
  const handle = await startOwnedRun(mode);
  expect(handle.socket.destroyed).toBe(false);
  expect(isPidAlive(handle.pid)).toBe(true);
  expect(handle.reader?.tables() ?? []).toContain('owned');
  let driveError: unknown;
  try {
    if (mode === 'finish') {
      handle.child.stdin?.write('finish\n');
    } else if (mode === 'abort') {
      // Abort mid-scenario: kill while the child still holds the server,
      // socket, and DB; no finish byte, no row-level cleanup.
      handle.child.kill();
    } else {
      // The row dies before it ever tells the child anything: only the
      // harness release in the finally can bring the run down.
      throw new Error('drive-crash');
    }
    await waitForChildExit(handle.child);
  } catch (error) {
    driveError = error;
  } finally {
    await releaseOwnedRun(handle);
  }
  expect(isPidAlive(handle.pid)).toBe(false);
  expect(handle.socket.destroyed).toBe(true);
  await unlinkWhenClosed(handle.dbPath);
  expect(fs.existsSync(handle.artifactPath)).toBe(true);
  expect(isInsideRoot(handle.runtimeRoot, handle.artifactPath)).toBe(true);
  expect(isInsideRoot(handle.evidenceRoot, handle.evidenceFile)).toBe(true);
  expect(handle.evidenceRoot).toContain(handle.runId);
  expect(() =>
    guards.assertRunOwnedPath(
      path.join(path.dirname(handle.runtimeRoot), 'foreign', 'leak.db'),
      handle.runId,
      path.dirname(handle.runtimeRoot),
    ),
  ).toThrow(/FOREIGN_PATH/);
  expect(() =>
    guards.assertRunOwnedPath(
      path.join(path.dirname(handle.evidenceRoot), 'foreign', 'leak.txt'),
      handle.runId,
      path.dirname(handle.evidenceRoot),
    ),
  ).toThrow(/FOREIGN_PATH/);
  if (driveError !== undefined) {
    throw driveError;
  }
}

test.describe('gm-two-player sandbox cleanup is ownership-scoped', () => {
  test('preserves an ambient context and an unrelated identity @E2E-79', async ({
    browser,
    request,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const runId = process.env.PLAYWRIGHT_E2E_RUN_ID;
    test.skip(!runId, 'sandbox fixture requires PLAYWRIGHT_E2E_RUN_ID');
    if (!runId || !baseURL) return;

    // A bystander: a context and an identity that belong to no fixture.
    // This is the developer's own tab and their own saved data.
    const ambientContext = await browser.newContext();
    const ambientPage = await ambientContext.newPage();
    await ambientPage.goto(`${baseURL}/`);
    const ambientIdentity = await seedAmbientIdentity(request, runId);
    // Seeding made it active - that is the state a developer would have
    // arrived with, and the state the sandbox is about to displace.
    expect(await activeIdentityId(request, runId)).toBe(ambientIdentity.id);

    const contextsBefore = browser.contexts().length;

    try {
      const fixture = await createGmTwoPlayerCampaignFixture({
        browser,
        request,
        baseURL,
      });
      // The fixture really did add its own contexts, or the assertions
      // below would pass against a fixture that created nothing.
      expect(browser.contexts().length).toBeGreaterThan(contextsBefore);
      expect(fixture.clients).toHaveLength(3);

      await fixture.cleanup();

      // Its three contexts are gone and the bystander's is not.
      expect(browser.contexts()).toContain(ambientContext);
      expect(browser.contexts().length).toBe(contextsBefore);
      for (const client of fixture.clients) {
        expect(browser.contexts()).not.toContain(client.context);
      }

      // The ambient page is still usable, not merely still listed - a
      // context object can survive while its pages are destroyed.
      await ambientPage.goto(`${baseURL}/`);
      expect(ambientPage.isClosed()).toBe(false);

      // And the machine is back on the identity it started with. Before
      // the fixture restored it, this read null and multiplayer auth
      // answered 404 - the developer was logged out by a test.
      expect(await activeIdentityId(request, runId)).toBe(ambientIdentity.id);
    } finally {
      await request.delete('/api/e2e/vault-identity', {
        headers: { [RUN_ID_HEADER]: runId },
        data: { ids: [ambientIdentity.id], runId },
      });
      await ambientContext.close();
    }
  });

  test('is idempotent, so a second teardown destroys nothing further @E2E-79', async ({
    browser,
    request,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const runId = process.env.PLAYWRIGHT_E2E_RUN_ID;
    test.skip(!runId, 'sandbox fixture requires PLAYWRIGHT_E2E_RUN_ID');
    if (!runId || !baseURL) return;

    // A spec that cleans up in a `finally` AND on an error path calls
    // this twice. A second pass that re-issued the delete would start
    // reaching for ids it no longer owns.
    const ambientContext = await browser.newContext();
    const ambientIdentity = await seedAmbientIdentity(request, runId);
    const contextsBefore = browser.contexts().length;

    try {
      const fixture = await createGmTwoPlayerCampaignFixture({
        browser,
        request,
        baseURL,
      });
      await fixture.cleanup();
      await fixture.cleanup();

      expect(browser.contexts().length).toBe(contextsBefore);
      expect(browser.contexts()).toContain(ambientContext);
      expect(await activeIdentityId(request, runId)).toBe(ambientIdentity.id);
    } finally {
      await request.delete('/api/e2e/vault-identity', {
        headers: { [RUN_ID_HEADER]: runId },
        data: { ids: [ambientIdentity.id], runId },
      });
      await ambientContext.close();
    }
  });

  test('after a finished run leftover sockets server db and artifacts are gone @E2E-79', async () => {
    test.setTimeout(60_000);
    await assertAfterOwnedRun('finish');
  });

  test('after an aborted run leftover sockets server db and artifacts are gone @E2E-79', async () => {
    test.setTimeout(60_000);
    await assertAfterOwnedRun('abort');
  });

  test('after a run that dies mid-drive the harness still releases everything @E2E-79', async () => {
    // The drive error must surface (the row is not silently green) AND the
    // post-release assertions inside must have passed before it rethrew.
    await expect(assertAfterOwnedRun('crash')).rejects.toThrow('drive-crash');
  });
});
