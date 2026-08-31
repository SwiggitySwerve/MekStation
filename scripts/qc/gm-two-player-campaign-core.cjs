const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');
const GROUP_CATALOG =
  'fixture-smoke:26,membership-smoke:15,evidence-smoke:27,fault-smoke:28,smoke:15,authority-pack1:21,exactly-once-pack:21,authority:29,visibility:30,combat:31,campaign:32,failure:32,performance:33,all:34,traceability:34,quality:34,manual-setup:34,scope:34';
const REGISTERED_GROUPS = Object.freeze(
  Object.fromEntries(
    GROUP_CATALOG.split(',').map((entry) => {
      const [group, owner] = entry.split(':');
      return [group, Number(owner)];
    }),
  ),
);
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
  };
  const specs = SPEC_BY_GROUP[group];
  if (!specs) {
    throw typedError('NOT_IMPLEMENTED', `group=${group} owner=${owner}`);
  }
  const port = String(deriveFixturePort(runId));
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
      MEKSTATION_E2E_SERVER_COMMAND: 'node server.js',
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
