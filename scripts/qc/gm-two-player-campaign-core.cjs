const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');
const GROUP_CATALOG =
  'fixture-smoke:26,membership-smoke:15,evidence-smoke:27,fault-smoke:28,smoke:15,authority-pack1:21,exactly-once-pack:21,fault-pack:21,token-pack:21,restart-pack:21,resilience-pack:21,authority-order:21,privacy-pack:30,proposal-pack:30,three-context-pack:30,two-device-pack:30,authority:29,visibility:30,combat:31,campaign:32,failure:32,performance:33,all:34,traceability:34,quality:34,manual-setup:34,scope:34';
const REGISTERED_GROUPS = Object.freeze(
  Object.fromEntries(
    GROUP_CATALOG.split(',').map((entry) => {
      const [group, owner] = entry.split(':');
      return [group, Number(owner)];
    }),
  ),
);
// Groups whose specs terminate the server process mid-scenario.
const RESPAWNING_GROUPS = new Set(['restart-pack', 'resilience-pack']);
const SAFE_RUN_ID = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/i;
function typedError(code, detail) {
  return Object.assign(new Error(`${code} ${detail}`), { code, detail });
}

function validateRunId(runId) {
  if (typeof runId !== 'string' || !SAFE_RUN_ID.test(runId)) {
    throw typedError('INVALID_RUN_ID', `runId=${String(runId)}`);
  }
  return runId;
}
function deriveFixturePort(runId) {
  const bytes = crypto
    .createHash('sha256')
    .update(validateRunId(runId))
    .digest();
  return 37000 + (bytes.readUInt32BE(0) % 10000);
}
function buildRunPlan({ group, runId, repoRoot }) {
  const owner = REGISTERED_GROUPS[group];
  if (!owner) throw typedError('UNKNOWN_GROUP', `group=${String(group)}`);
  validateRunId(runId);
  // The evolving `smoke` subset (umbrella 24.4) is exactly the staged
  // groups that exist so far, run as one plan. It grows here, one line
  // per landed group, so "run the smoke subset" never silently narrows
  // to a stale list held somewhere else.
  const SPEC_BY_GROUP = {
    'fixture-smoke': ['e2e/gm-two-player-fixture.smoke.spec.ts'],
    'membership-smoke': ['e2e/gm-two-player-membership.smoke.spec.ts'],
    smoke: [
      'e2e/gm-two-player-fixture.smoke.spec.ts',
      'e2e/gm-two-player-membership.smoke.spec.ts',
    ],
    // `authority` remains reserved for the complete E2E-01..18 pack.
    'authority-pack1': ['e2e/gm-two-player-authority.pack1.spec.ts'],
    'exactly-once-pack': ['e2e/gm-two-player-exactly-once.pack.spec.ts'],
    'fault-pack': ['e2e/gm-two-player-fault.pack.spec.ts'],
    'token-pack': ['e2e/gm-two-player-token.pack.spec.ts'],
    'restart-pack': ['e2e/gm-two-player-restart.pack.spec.ts'],
    'resilience-pack': ['e2e/gm-two-player-resilience.pack.spec.ts'],
    // E2E-04/07 (umbrella 21.1). Deliberately NOT in RESPAWNING_GROUPS:
    // neither row kills the server, and the relaunching wrapper is the
    // exception, never the default (see the lookup on
    // MEKSTATION_E2E_SERVER_COMMAND). `authority` stays reserved for
    // the complete E2E-01..18 pack and still answers NOT_IMPLEMENTED.
    'authority-order': ['e2e/gm-two-player-authority-order.pack.spec.ts'],
    // `visibility` remains reserved for the complete E2E-19..30 pack.
    // `privacy-pack` is the tactical-channel subset (E2E-20/21/22/23/
    // 24/26/27); `proposal-pack` is the campaign-channel arbitration
    // subset (E2E-30). E2E-19/25/28/29 stay deferred on absent
    // surfaces - each named, with its evidence, in its spec's header.
    'privacy-pack': ['e2e/gm-two-player-privacy.pack.spec.ts'],
    'proposal-pack': ['e2e/gm-two-player-proposals.pack.spec.ts'],
    // `performance` is the controlled loopback latency/catch-up/memory
    // pack (E2E-71/72/73, umbrella 23.2). It is registered as its own
    // selector rather than folded into `smoke` because its budgets gate
    // only the recorded controlled class - running it on an arbitrary
    // machine alongside other work reports that machine, not the
    // product. The strict backing is unchanged: the group runs the real
    // three-context spec under the same one-worker plan as every other
    // pack.
    performance: ['e2e/gm-two-player-performance.pack.spec.ts'],
    // The three-context privacy journey belongs to
    // `add-authority-audit-and-privacy-proof` PR 10, not to this
    // umbrella, but this runner is where CI gating lives - and the
    // share-roster leak it caught (finding #21) went unnoticed precisely
    // because no gated group ran it.
    'three-context-pack': ['e2e/authority-privacy-three-context.spec.ts'],
    // The two-device drive belongs to `design-campaign-authority-and-sync`
    // task 4.5. It is gated here for the same reason the three-context
    // journey is: this runner is where CI gating lives, and this spec
    // sitting in no group is how a merged change broke the share story
    // without anything going red (finding #33).
    'two-device-pack': ['e2e/campaign-two-device-drive.spec.ts'],
    // 22.2's failure catalog (E2E-61..70). Deliberately NOT in
    // RESPAWNING_GROUPS: no row here kills the server, and the
    // relaunching wrapper is the exception, never the default. The qc
    // suite pins this group's server command to `node server.js` so a
    // future respawning row has to say so out loud.
    failure: ['e2e/gm-two-player-failure.pack.spec.ts'],
  };
  // `all` expands to every group that already has a SPEC_BY_GROUP
  // entry. Reserved catalog names that still throw stay out
  // (`authority` until 21.4; `campaign` until a live E2E-46..60 row
  // exists; visibility, combat, evidence-smoke, fault-smoke, and the
  // other 34-owned placeholders). Specs are de-duplicated so the
  // `smoke` umbrella does not run fixture-smoke and membership-smoke
  // twice. The composite respawns if ANY member is in
  // RESPAWNING_GROUPS (today restart-pack and resilience-pack),
  // because a row that kills the server cannot recover behind the
  // plain `node server.js` child Playwright owns.
  const ALL_GROUP_MEMBERS = Object.freeze(
    Object.keys(SPEC_BY_GROUP).filter((name) => name !== 'all'),
  );
  SPEC_BY_GROUP.all = [
    ...new Set(ALL_GROUP_MEMBERS.flatMap((name) => SPEC_BY_GROUP[name])),
  ];
  const specs = SPEC_BY_GROUP[group];
  if (!specs) {
    throw typedError('NOT_IMPLEMENTED', `group=${group} owner=${owner}`);
  }
  const port = String(deriveFixturePort(runId));
  const planMembers = group === 'all' ? ALL_GROUP_MEMBERS : [group];
  const needsRespawn = planMembers.some((name) => RESPAWNING_GROUPS.has(name));
  return {
    command: process.execPath,
    args: [
      path.join(repoRoot, 'scripts/playwright/run-playwright.mjs'),
      'test',
      '--project=chromium',
      ...specs,
      '--workers=1',
    ],
    environment: {
      PLAYWRIGHT_E2E_RUN_ID: runId,
      MEKSTATION_E2E_PORT: port,
      MEKSTATION_E2E_REUSE_EXISTING_SERVER: 'false',
      PORT: port,
      // Groups whose scenarios kill the server run behind the relaunching
      // wrapper - Playwright cannot restart a webServer child it did not
      // kill, so the wrapper owns the respawn and the readiness gate waits
      // it back. `all` uses the same rule via its members.
      MEKSTATION_E2E_SERVER_COMMAND: needsRespawn
        ? 'node scripts/e2e/relaunching-server.mjs'
        : 'node server.js',
    },
  };
}
function assertRunOwnedPath(targetPath, runId, runtimeRoot) {
  const ownedRoot = path.join(path.resolve(runtimeRoot), validateRunId(runId));
  const resolved = path.resolve(targetPath ?? '');
  const relative = path.relative(ownedRoot, resolved);
  if (
    !targetPath ||
    !relative ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    throw typedError('FOREIGN_PATH', `target=${resolved}`);
  }
  return resolved;
}

async function runCli(args, repoRoot) {
  try {
    const options = parseArguments(args);
    const plan = buildRunPlan({ ...options, repoRoot });
    const port = Number(plan.environment.MEKSTATION_E2E_PORT);
    if (!(await isPortAvailable(port))) {
      throw typedError('PORT_IN_USE', `port=${port}`);
    }
    return await runPlan(plan, repoRoot);
  } catch (error) {
    const code = String(error?.code ?? 'RUNNER_FAILURE');
    process.stderr.write(
      `[qc:gm-two-player-campaign] ${code} ${String(error?.detail ?? error?.message ?? error)}\n`,
    );
    if (code === 'PORT_IN_USE') return 4;
    if (code === 'NOT_IMPLEMENTED') return 3;
    return ['UNKNOWN_GROUP', 'INVALID_RUN_ID', 'INVALID_ARGUMENT'].includes(
      code,
    )
      ? 2
      : 1;
  }
}

function parseArguments(args) {
  const options = { group: undefined, runId: undefined };
  for (const argument of args) {
    const [name, value] = argument.split('=', 2);
    if (name === '--group' && value && !options.group) options.group = value;
    else if (name === '--run-id' && value && !options.runId)
      options.runId = value;
    else throw typedError('INVALID_ARGUMENT', `unsupported=${argument}`);
  }
  if (!options.group)
    throw typedError('INVALID_ARGUMENT', '--group is required');
  // The focused browser packs are directly runnable by group name. A caller
  // that needs parallel isolation may still supply its own validated run id.
  options.runId ??= `qc-${options.group}`;
  return options;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer().unref();
    server.once('error', () => resolve(false));
    server.listen({ port, exclusive: true }, () =>
      server.close(() => resolve(true)),
    );
  });
}

function runPlan(plan, repoRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(plan.command, plan.args, {
      cwd: repoRoot,
      env: { ...process.env, ...plan.environment },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      signal
        ? reject(new Error(`Playwright exited with signal ${signal}`))
        : resolve(code ?? 1),
    );
  });
}

module.exports = {
  REGISTERED_GROUPS,
  assertRunOwnedPath,
  buildRunPlan,
  deriveFixturePort,
  runCli,
};
