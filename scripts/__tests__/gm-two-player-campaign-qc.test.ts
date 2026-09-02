import { spawnSync } from 'node:child_process';
import net from 'node:net';
import * as path from 'node:path';
const repoRoot = path.resolve(__dirname, '../..');
const runner = path.join(repoRoot, 'scripts/qc/run-gm-two-player-campaign.mjs');
const core = require('../qc/gm-two-player-campaign-core.cjs');
const groups =
  'fixture-smoke,membership-smoke,evidence-smoke,fault-smoke,smoke,authority-pack1,exactly-once-pack,fault-pack,token-pack,restart-pack,resilience-pack,privacy-pack,authority,visibility,combat,campaign,failure,performance,all,traceability,quality,manual-setup,scope'.split(
    ',',
  );
/** The server command a non-respawning implemented group is planned with. */
const faultSmokeServerCommand = (
  core: {
    buildRunPlan: (input: unknown) => { environment: Record<string, string> };
  },
  repoRoot: string,
): string =>
  core.buildRunPlan({
    group: 'fault-pack',
    runId: 'task-21-fault-pack-server',
    repoRoot,
  }).environment.MEKSTATION_E2E_SERVER_COMMAND;
const run = (...args: string[]) =>
  spawnSync(process.execPath, [runner, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
describe('GM and two-player campaign QC runner', () => {
  it('registers the approved catalog and deterministic implemented plans', () => {
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

    const membershipPlan = core.buildRunPlan({
      group: 'membership-smoke',
      runId: 'task-26-membership-smoke',
      repoRoot,
    });
    expect(membershipPlan.args).toEqual([
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      'e2e/gm-two-player-membership.smoke.spec.ts',
      '--workers=1',
    ]);
    expect(membershipPlan.environment).toEqual({
      ...plan.environment,
      PLAYWRIGHT_E2E_RUN_ID: 'task-26-membership-smoke',
      MEKSTATION_E2E_PORT: String(
        core.deriveFixturePort('task-26-membership-smoke'),
      ),
      PORT: String(core.deriveFixturePort('task-26-membership-smoke')),
    });

    // The evolving smoke subset is BOTH landed specs in one plan.
    // Falsification: drop either spec from the smoke list and this reds.
    const smokePlan = core.buildRunPlan({
      group: 'smoke',
      runId: 'task-26-smoke',
      repoRoot,
    });
    expect(smokePlan.args).toEqual([
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      'e2e/gm-two-player-fixture.smoke.spec.ts',
      'e2e/gm-two-player-membership.smoke.spec.ts',
      '--workers=1',
    ]);

    const authorityPackPlan = core.buildRunPlan({
      group: 'authority-pack1',
      runId: 'task-21-authority-pack1',
      repoRoot,
    });
    expect(authorityPackPlan.args).toEqual([
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      'e2e/gm-two-player-authority.pack1.spec.ts',
      '--workers=1',
    ]);

    const restartPlan = core.buildRunPlan({
      group: 'restart-pack',
      runId: 'task-21-restart-pack',
      repoRoot,
    });
    expect(restartPlan.args).toEqual([
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      'e2e/gm-two-player-restart.pack.spec.ts',
      '--workers=1',
    ]);
    // The restart pack runs behind the relaunching wrapper - the scenarios
    // kill the server and the readiness gate waits it back.
    expect(restartPlan.environment.MEKSTATION_E2E_SERVER_COMMAND).toBe(
      'node scripts/e2e/relaunching-server.mjs',
    );

    const resiliencePlan = core.buildRunPlan({
      group: 'resilience-pack',
      runId: 'task-21-resilience-pack',
      repoRoot,
    });
    expect(resiliencePlan.args).toEqual([
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      'e2e/gm-two-player-resilience.pack.spec.ts',
      '--workers=1',
    ]);
    // E2E-15 kills the server too, so this group also needs the wrapper. A
    // group that respawns without it hangs on the readiness gate instead of
    // failing loudly, which is why the wiring is pinned per group rather
    // than left to the spec.
    expect(resiliencePlan.environment.MEKSTATION_E2E_SERVER_COMMAND).toBe(
      'node scripts/e2e/relaunching-server.mjs',
    );
    // Every other group keeps the plain server - the wrapper is the
    // exception, never the default.
    expect(faultSmokeServerCommand(core, repoRoot)).toBe('node server.js');

    const faultPlan = core.buildRunPlan({
      group: 'fault-pack',
      runId: 'task-21-fault-pack',
      repoRoot,
    });
    expect(faultPlan.args).toEqual([
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      'e2e/gm-two-player-fault.pack.spec.ts',
      '--workers=1',
    ]);

    const exactlyOncePlan = core.buildRunPlan({
      group: 'exactly-once-pack',
      runId: 'task-21-exactly-once-pack',
      repoRoot,
    });
    expect(exactlyOncePlan.args).toEqual([
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      'e2e/gm-two-player-exactly-once.pack.spec.ts',
      '--workers=1',
    ]);

    const tokenPlan = core.buildRunPlan({
      group: 'token-pack',
      runId: 'task-21-token-pack',
      repoRoot,
    });
    expect(tokenPlan.args).toEqual([
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      'e2e/gm-two-player-token.pack.spec.ts',
      '--workers=1',
    ]);

    // The privacy pack is the tactical-channel subset of E2E-19..30.
    // Falsification: point the group at another spec and this reds.
    const privacyPlan = core.buildRunPlan({
      group: 'privacy-pack',
      runId: 'task-30-privacy-pack',
      repoRoot,
    });
    expect(privacyPlan.args).toEqual([
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      'e2e/gm-two-player-privacy.pack.spec.ts',
      '--workers=1',
    ]);
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
    const implemented = [
      'fixture-smoke',
      'membership-smoke',
      'smoke',
      'authority-pack1',
      'exactly-once-pack',
      'fault-pack',
      'token-pack',
      'restart-pack',
      'resilience-pack',
      'privacy-pack',
    ];
    for (const group of groups.filter(
      (group) => !implemented.includes(group),
    )) {
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
