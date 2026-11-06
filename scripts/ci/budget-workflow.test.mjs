import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { assertJobResults } from './budget-aggregate.mjs';
import { checkRepositoryMetrics } from './budget-check.mjs';
import { loadBudgets } from './budget-config.mjs';
import {
  observedBudgetValues,
  packageContributors,
} from './budget-metrics.mjs';
import {
  expandJob,
  expandedJobGraph,
  inducedWorkflowCensus,
  readWorkflow,
  workflowMetrics,
  workflowGraphContract,
  projectTimingLimits,
  workflowGraphFromSource,
} from './budget-workflow.mjs';

const root = process.cwd(),
  config = loadBudgets(),
  workflow = readWorkflow(root);
const repository = () => ({
  schema: 'mekstation/ci-budget-metrics/v1',
  budgetConfigHash: 'a'.repeat(64),
  workflow: workflowMetrics(root, config),
  dependencies: structuredClone(config.dependencies),
  cache: { files: ['one.test.ts'], unkeyable: [], repoWide: [] },
});

test('source graph reuses the unique-key parser and canonical expansion', () => {
  const source = fs.readFileSync(
    path.join(root, '.github/workflows/pr-checks.yml'),
    'utf8',
  );
  assert.deepEqual(
    workflowGraphFromSource(source),
    workflowGraphContract(workflow),
  );
  for (const invalid of [
    null,
    undefined,
    Buffer.from(source),
    '',
    'jobs: [',
    'jobs:\n  same: {}\n  same: {}\n',
    'jobs:\n  a:\n    needs: absent\n    steps: []\n',
  ]) {
    assert.throws(() => workflowGraphFromSource(invalid));
  }
});

test('short-form unknown triggers cannot hide additional workflow jobs', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-workflow-'));
  try {
    fs.mkdirSync(path.join(fixture, '.github/workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(fixture, '.github/workflows/hidden.yml'),
      'name: Hidden\non: [pull_request]\njobs:\n  hidden:\n    runs-on: ubuntu-latest\n    steps: [{run: true}]\n',
    );
    assert.throws(
      () => inducedWorkflowCensus(fixture, ['src/a.ts']),
      /Unknown workflow shape/,
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('matrix template metadata and soft timing projection share expanded names', () => {
  const graph = workflowGraphContract(workflow);
  assert.deepEqual(graph.matrixGroups['Build Test / ${{ matrix.platform }}'], [
    'Build Test / win',
    'Build Test / mac',
  ]);
  assert.equal(
    projectTimingLimits(config, workflow).jobsMs['E2E (1/2)'],
    config.timeouts.e2e.minutes * 60000,
  );
});

test('expanded count includes matrix legs, detector, aggregator and induced trusted guard', () => {
  const metrics = workflowMetrics(root, config);
  const source = metrics.profiles.find((p) => p.id === 'source');
  assert.equal(source.active, 10); // 9 PR Checks + the automatically induced guard
  assert.equal(source.expanded, 12); // also exposes the 2 gated packaging legs
  assert.equal(
    source.census.filter((j) => j.file === 'lint-and-test-guard.yml').length,
    1,
  );
  assert.ok(
    checkRepositoryMetrics(
      { ...config, limits: { ...config.limits, typicalPrJobs: 9 } },
      repository(),
      [],
    ).violations.some((v) => v.code === 'typicalPrJobs'),
  );
  const graph = expandedJobGraph(workflow);
  assert.ok(graph['Lint and Test'].includes('E2E (2/2)'));
  assert.ok(graph['Lint and Test'].includes('Build Test / win'));
  assert.ok(
    inducedWorkflowCensus(root, ['src/utils/uuid.ts']).files.includes(
      'lint-and-test-guard.yml',
    ),
  );
});

test('new reporting job is counted and every job must reach aggregator', () => {
  const next = structuredClone(workflow);
  next.jobs.report = {
    name: 'Report',
    'runs-on': 'ubuntu-latest',
    steps: [{ run: 'true' }],
  };
  assert.throws(() => workflowMetrics(root, config, next), /accounted/);
  next.jobs['lint-and-test'].needs.push('report');
  assert.throws(() => workflowMetrics(root, config, next), /static timeout/);
});

test('dynamic/unknown matrices, conditions and aggregator bypasses fail closed', () => {
  assert.throws(() =>
    expandJob('x', { strategy: { matrix: '${{ fromJSON(inputs.matrix) }}' } }),
  );
  for (const mutate of [
    (w) => {
      w.jobs.e2e.if = 'false';
    },
    (w) => {
      w.jobs['lint-and-test'].if = 'success()';
    },
    (w) => {
      w.jobs['lint-and-test'].steps.at(-1).run = 'echo pass';
    },
    (w) => {
      w.jobs['lint-and-test'].steps.at(-1)['continue-on-error'] = true;
    },
    (w) => {
      w.jobs['lint-and-test'].steps.at(-1).env.GATES_JSON = '{}';
    },
    (w) => {
      w.jobs['static-checks'].steps.find((s) =>
        s.run?.includes('budget-check.mjs'),
      )['continue-on-error'] = true;
    },
    (w) => {
      w.jobs['simulation-checks'].steps.find((s) =>
        s.run?.includes('budget-artifacts.mjs'),
      ).run += ' || true';
    },
  ]) {
    const next = structuredClone(workflow);
    mutate(next);
    assert.throws(() => workflowMetrics(root, config, next));
  }
});

test('actual aggregator boundary rejects failures, unexpected skips, unknown/missing results and forged gates', () => {
  const expected = Object.keys(workflow.jobs).filter(
    (id) => id !== 'lint-and-test',
  );
  const gates = { 'simulation-checks': 'code', 'build-test': 'pr-desktop' };
  const needs = Object.fromEntries(
    expected.map((id) => [id, { result: 'success' }]),
  );
  needs['detect-changes'].outputs = { code: 'false', 'pr-desktop': 'false' };
  needs['simulation-checks'].result = 'skipped';
  needs['build-test'].result = 'skipped';
  assert.doesNotThrow(() => assertJobResults(expected, gates, needs));
  for (const bad of [
    {},
    { ...needs, ghost: { result: 'success' } },
    { ...needs, e2e: { result: 'skipped' } },
    { ...needs, e2e: { result: 'failure' } },
    { ...needs, e2e: { result: 'cancelled' } },
    {
      ...needs,
      'detect-changes': { result: 'success', outputs: { code: 'unknown' } },
    },
  ])
    assert.throws(() => assertJobResults(expected, gates, bad));
  const run = spawnSync(process.execPath, ['scripts/ci/budget-aggregate.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      NEEDS_JSON: '{}',
      GATES_JSON: JSON.stringify(gates),
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Missing or unknown/);
});

test('cache caps use exact censuses; dependency growth needs explicit label; timeout drift is red', () => {
  const metrics = repository();
  metrics.cache.files = Array.from(
    { length: config.limits.repoWideKeys + 1 },
    (_, i) => `${i}.test.ts`,
  );
  metrics.cache.unkeyable = metrics.cache.files
    .slice(0, config.limits.unkeyableTests + 1)
    .map((file) => ({ file, reason: 'whole env' }));
  metrics.cache.repoWide = metrics.cache.files.map((file) => ({
    file,
    reasons: ['child process'],
  }));
  metrics.dependencies.root.lockEntries++;
  metrics.workflow.timeouts.e2e++;
  const result = checkRepositoryMetrics(config, metrics, []);
  for (const code of [
    'unkeyableTests',
    'repoWideKeys',
    'dependencyGrowth',
    'timeout',
  ])
    assert.ok(
      result.violations.some((v) => v.code === code),
      code,
    );
  assert.ok(
    !checkRepositoryMetrics(config, metrics, [
      'ci-dependency-growth',
    ]).violations.some((v) => v.code === 'dependencyGrowth'),
  );
  metrics.cache.files = [];
  assert.throws(() => checkRepositoryMetrics(config, metrics, []));
  assert.throws(() => checkRepositoryMetrics(config, repository(), null));
});

test('observation projections never turn absent package evidence into zero/cap values', () => {
  const metrics = repository(),
    projection = observedBudgetValues(config, metrics);
  assert.equal(projection.complete, false);
  assert.equal(projection.missing.length, 3);
  assert.equal(projection.values['limits.installerBytes'], undefined);
  assert.equal(packageContributors(null).availability, 'unavailable');
  assert.throws(() => packageContributors({ schema: 'unknown', files: [] }));
});
