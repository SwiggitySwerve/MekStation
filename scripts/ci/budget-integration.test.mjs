import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';

import cachedTests from '../jest/cached-tests.js';
import { loadBudgets } from './budget-config.mjs';
import { prepareWorkflowInputs } from './budget-github.mjs';
import { producerEnvelope } from './budget-report.mjs';
import { normalizeRun } from './ci-metrics.mjs';

test('read-only graph preparation binds immutable source heads and rejects missing source', async () => {
  const calls = [],
    head = 'a'.repeat(40),
    source = fs.readFileSync('.github/workflows/pr-checks.yml', 'utf8');
  const api = async (method, route) => {
    calls.push({ method, route });
    if (route.includes('/attempts/'))
      return {
        id: 1,
        workflow_id: 2,
        head_sha: head,
        path: '.github/workflows/pr-checks.yml',
      };
    if (route.includes('/contents/'))
      return {
        encoding: 'base64',
        content: Buffer.from(source).toString('base64'),
      };
    return { workflow_runs: [] };
  };
  const input = await prepareWorkflowInputs(api, {
    repository: 'o/r',
    runId: 1,
    attempt: 1,
  });
  assert.ok(input.graphs.graphs[head].jobGraph['Lint and Test']);
  assert.ok(calls.every((c) => c.method === 'GET'));
  assert.ok(calls.some((c) => c.route.endsWith(`?ref=${head}`)));
  await assert.rejects(
    () =>
      prepareWorkflowInputs(
        async (method, route) =>
          route.includes('/contents/')
            ? { encoding: 'unknown' }
            : api(method, route),
        { repository: 'o/r', runId: 1, attempt: 1 },
      ),
    /Current source-head/,
  );
});

test('canonical count projection is independent of packages and rejects forged identity/hash/cache inputs', () => {
  const observation = normalizeRun({
    repository: 'o/r',
    run: {
      id: 1,
      run_attempt: 1,
      workflow_id: 2,
      head_sha: 'a'.repeat(40),
      event: 'push',
      head_branch: 'main',
      status: 'completed',
      conclusion: 'success',
      created_at: '2026-11-01T00:00:00Z',
      run_started_at: '2026-11-01T00:00:00Z',
    },
    jobs: [
      {
        id: 3,
        run_id: 1,
        run_attempt: 1,
        head_sha: 'a'.repeat(40),
        name: 'Test',
        status: 'completed',
        conclusion: 'success',
        runner_id: 5,
        labels: ['ubuntu-latest'],
        started_at: '2026-11-01T00:00:00Z',
        completed_at: '2026-11-01T00:00:01Z',
      },
    ],
    jobGraph: { Test: [] },
  });
  const config = loadBudgets(),
    configText = JSON.stringify(config),
    inputs = {
      schema: 'mekstation/ci-producer-inputs/v1',
      source: {
        repository: 'o/r',
        runId: 1,
        attempt: 1,
        headSha: 'a'.repeat(40),
        workflowId: 2,
      },
      configText,
    };
  const metrics = {
    schema: 'mekstation/ci-budget-metrics/v1',
    budgetConfigHash: createHash('sha256').update(configText).digest('hex'),
    workflow: {
      profiles: [
        { typical: true, active: 1, expanded: 1, census: [{ active: true }] },
      ],
      timeouts: {},
    },
    dependencies: config.dependencies,
    cache: { files: ['src/x.test.ts'], unkeyable: [], repoWide: [] },
  };
  const artifacts = {
    repository: { metrics },
    jest: [
      {
        files: 1,
        hits: 0,
        testFiles: ['src/x.test.ts'],
        timingFiles: { 'src/x.test.ts': 4 },
      },
    ],
  };
  const envelope = producerEnvelope(observation, inputs, artifacts);
  assert.equal(envelope.budgetValues['limits.unkeyableTests'], 0);
  assert.equal(envelope.budgetValues['limits.installerBytes'], undefined);
  assert.equal(envelope.tests.complete, true);
  assert.equal(envelope.cache.attempts, 1);
  assert.throws(
    () =>
      producerEnvelope(
        observation,
        { ...inputs, source: { ...inputs.source, headSha: 'b'.repeat(40) } },
        artifacts,
      ),
    /identity/,
  );
  assert.throws(
    () =>
      producerEnvelope(
        observation,
        { ...inputs, configText: configText + '\n' },
        artifacts,
      ),
    /hash/,
  );
  assert.throws(
    () =>
      producerEnvelope(observation, inputs, {
        ...artifacts,
        jest: [{ ...artifacts.jest[0], hits: 2 }],
      }),
    /Invalid Jest/,
  );
});

test('Jest advisory observer cannot change recorded results even when it throws', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-jest-'));
  try {
    const execute = cachedTests.createJestExecutor({
      root,
      baseArgs: [],
      spawn: (executable, args) => {
        const output = args
          .find((a) => a.startsWith('--outputFile='))
          .slice('--outputFile='.length);
        fs.writeFileSync(
          output,
          JSON.stringify({
            testResults: [
              { name: path.join(root, 'x.test.ts'), status: 'passed' },
            ],
          }),
        );
        return { status: 0 };
      },
      onReport: () => {
        throw new Error('Reporter unavailable');
      },
    });
    const result = await execute(['x.test.ts']);
    assert.equal(result.exitCode, 0);
    assert.equal(result.results.get('x.test.ts'), 'passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('trusted writers use default code without dependency installs and labels cannot recurse PR Checks', () => {
  const workflow = (name) =>
    parse(fs.readFileSync(`.github/workflows/${name}.yml`, 'utf8'));
  const guard = workflow('lint-and-test-guard'),
    approval = workflow('ci-budget-approval'),
    weekly = workflow('ci-garden');
  for (const job of [
    guard.jobs.guard,
    approval.jobs.approval,
    weekly.jobs.publish,
  ]) {
    assert.ok(
      job.steps.some(
        (step) =>
          step.uses === 'actions/checkout@v6' &&
          (step.with?.ref === '${{ github.event.repository.default_branch }}' ||
            (job === guard.jobs.guard &&
              step.with?.ref === '${{ github.sha }}')),
      ),
    );
    assert.ok(
      !job.steps.some((step) => /npm (ci|install)|npx/.test(step.run ?? '')),
    );
  }
  assert.equal(weekly.jobs.collect.permissions.contents, 'read');
  assert.equal(weekly.jobs.collect.permissions.actions, 'read');
  assert.ok(!workflow('pr-checks').on.pull_request.types.includes('labeled'));
  assert.equal(
    approval.on.pull_request_target.paths[0],
    'config/ci/budgets.json',
  );
});

test('budget workflow outputs stay under runner temp instead of polluting workspace checks or cache keys', () => {
  for (const name of [
    'pr-checks',
    'release',
    'ci-garden',
    'lint-and-test-guard',
  ]) {
    const workflow = parse(
      fs.readFileSync(`.github/workflows/${name}.yml`, 'utf8'),
    );
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps ?? []) {
        if (
          /node scripts\/ci\/budget-(?:check|artifacts)\.mjs/.test(
            step.run ?? '',
          )
        ) {
          assert.match(
            step.run,
            /--report "\$RUNNER_TEMP\/budget-output\/[\w-]+\.json"/,
          );
          assert.doesNotMatch(step.run, /--report (?:budget-output|\.?\/)/);
        }
        if (step.with?.path?.includes('budget-output/')) {
          assert.ok(
            step.with.path.startsWith('${{ runner.temp }}/budget-output/'),
          );
        }
      }
    }
  }
});

test('trusted reporter imports from its sparse contract with no node_modules', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-trusted-'));
  try {
    for (const directory of ['scripts/ci', 'scripts/lib']) {
      fs.mkdirSync(path.join(fixture, directory), { recursive: true });
      for (const file of fs
        .readdirSync(directory)
        .filter((name) => /\.(mjs|py)$/.test(name)))
        fs.copyFileSync(
          path.join(directory, file),
          path.join(fixture, directory, file),
        );
    }
    for (const file of [
      'scripts/jest/test-file-durations.mjs',
      'scripts/playwright/ci-e2e-plan.mjs',
      'config/jest/shard-planner.js',
    ]) {
      const destination = path.join(fixture, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(file, destination);
    }
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "await import('./scripts/ci/budget-report.mjs')",
      ],
      {
        cwd: fixture,
        encoding: 'utf8',
        timeout: 30000,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('weekly publisher imports from its sparse contract with no node_modules', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-weekly-'));
  try {
    const workflow = parse(
      fs.readFileSync('.github/workflows/ci-garden.yml', 'utf8'),
    );
    const checkout = workflow.jobs.publish.steps.find(
      (step) => step.uses === 'actions/checkout@v6',
    );
    for (const directory of checkout.with['sparse-checkout']
      .trim()
      .split(/\s+/)) {
      fs.cpSync(directory, path.join(fixture, directory), { recursive: true });
    }
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "await import('./scripts/ci/garden-publish.mjs'); await import('./scripts/ci/budget-config.mjs')",
      ],
      {
        cwd: fixture,
        encoding: 'utf8',
        timeout: 30000,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
