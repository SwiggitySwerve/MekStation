import { spawnSync } from 'node:child_process';
import net from 'node:net';
import * as path from 'node:path';
const repoRoot = path.resolve(__dirname, '../..');
const runner = path.join(repoRoot, 'scripts/qc/run-gm-two-player-campaign.mjs');
const core = require('../qc/gm-two-player-campaign-core.cjs');
const groups =
  'fixture-smoke,membership-smoke,evidence-smoke,fault-smoke,smoke,authority,visibility,combat,campaign,failure,performance,all,traceability,quality,manual-setup,scope'.split(
    ',',
  );
const run = (...args: string[]) =>
  spawnSync(process.execPath, [runner, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
describe('GM and two-player campaign QC runner', () => {
  it('registers the approved catalog and deterministic fixture plan', () => {
    expect(Object.keys(core.REGISTERED_GROUPS)).toEqual(groups);
    const plan = core.buildRunPlan({
      group: groups[0],
      runId: 'task-26-fixture-smoke',
      repoRoot,
    });
    expect(plan.args).toEqual([
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      'e2e/gm-two-player-fixture.smoke.spec.ts',
      '--workers=1',
    ]);
    expect(plan.environment.MEKSTATION_E2E_REUSE_EXISTING_SERVER).toBe('false');
  });

  it('types unknown and future groups before browser startup', () => {
    const unknown = run(
      '--group=not-a-group',
      '--run-id=task-26-fixture-smoke',
    );
    expect([unknown.status, unknown.stderr.trim()]).toEqual([
      2,
      '[qc:gm-two-player-campaign] UNKNOWN_GROUP group=not-a-group',
    ]);
    for (const group of groups.slice(1)) {
      const result = run(`--group=${group}`, '--run-id=task-26-fixture-smoke');
      expect([result.status, result.stderr.trim()]).toEqual([
        3,
        `[qc:gm-two-player-campaign] NOT_IMPLEMENTED group=${group} owner=${core.REGISTERED_GROUPS[group]}`,
      ]);
    }
  });

  it.each(['../foreign', 'nested/run', 'contains spaces'])(
    'rejects unsafe run ID %j',
    (runId) => {
      const result = run('--group=fixture-smoke', `--run-id=${runId}`);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('INVALID_RUN_ID');
    },
  );

  it('refuses foreign database paths', () => {
    const root = path.join(repoRoot, '.sisyphus/e2e-runtime');
    const owned = path.join(root, 'task-26-fixture-smoke', 'mekstation.db');
    expect(core.assertRunOwnedPath(owned, 'task-26-fixture-smoke', root)).toBe(
      path.resolve(owned),
    );
    expect(() =>
      core.assertRunOwnedPath(
        path.join(root, 'foreign', 'mekstation.db'),
        'task-26-fixture-smoke',
        root,
      ),
    ).toThrow(/FOREIGN_PATH/);
  });
  it('refuses and preserves a ready foreign server on the fixture port', async () => {
    const runId = 'task-26-foreign-listener';
    const port = core.deriveFixturePort(runId);
    const server = net.createServer();
    await new Promise<void>((resolve, reject) =>
      server.once('error', reject).listen(port, resolve),
    );
    try {
      const result = run('--group=fixture-smoke', `--run-id=${runId}`);
      expect([result.status, server.listening]).toEqual([4, true]);
      expect(result.stderr).toContain(`PORT_IN_USE port=${port}`);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
