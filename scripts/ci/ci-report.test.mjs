import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { loadBudgets } from './budget-config.mjs';
import { workflowMetrics } from './budget-workflow.mjs';
import { observationEnvelope } from './ci-observation.mjs';
import { renderReport } from './ci-report-evaluate.mjs';
import { buildReport, main } from './ci-report.mjs';
import { extractTestObservation, testObservation } from './ci-test-metrics.mjs';

function apiFixture() {
  const run = (id, attempt = 1) => ({
    id,
    run_attempt: attempt,
    workflow_id: 10,
    head_sha: 'a'.repeat(40),
    status: 'completed',
    conclusion: attempt === 1 ? 'failure' : 'success',
    event: id === 100 ? 'pull_request' : 'push',
    head_branch: id === 100 ? 'feature' : 'main',
    created_at: `2026-11-0${id === 100 ? '2' : '1'}T00:00:00Z`,
    run_started_at: `2026-11-0${id === 100 ? '2' : '1'}T00:00:00Z`,
    pull_requests: [],
  });
  return async (_method, route) => {
    if (route.includes('/workflows/10/runs?'))
      return { workflow_runs: [run(99, 2)] };
    const match = route.match(/runs\/(\d+)\/attempts\/(\d+)(\/jobs)?/);
    assert.ok(match, route);
    const value = run(Number(match[1]), Number(match[2]));
    if (!match[3]) return value;
    return {
      jobs: [
        {
          id: value.id,
          name: 'tests',
          run_id: value.id,
          run_attempt: value.run_attempt,
          head_sha: value.head_sha,
          status: 'completed',
          conclusion: value.conclusion,
          labels: ['ubuntu-latest'],
          runner_id: 1,
          started_at: value.created_at,
          completed_at: value.created_at.replace('00:00:00', '00:01:00'),
        },
      ],
    };
  };
}

test('budget report renders hourly reconciliation from the actual otherEvents census', async () => {
  const args = {
    api: apiFixture(),
    repository: 'owner/repo',
    runId: 100,
    attempt: 2,
    jobGraph: { tests: [] },
  };
  const initial = await buildReport(args);
  const profiles = workflowMetrics(process.cwd(), loadBudgets()).profiles;
  const producer = observationEnvelope(initial.source.observation, {
    repositoryMetrics: { workflow: { profiles } },
  });
  const result = await buildReport({ ...args, producer });
  const markdown = renderReport(result.report);
  for (const profile of profiles) {
    for (const event of ['schedule', 'workflow_dispatch']) {
      assert.ok(
        markdown.includes(
          `| ${profile.id} | CI Budget Reconciliation | ci-budget-reconcile.yml | ${event} | all |`,
        ),
      );
    }
  }
  assert.equal(result.report.breach, initial.report.breach);
  assert.equal(result.report.labelComplete, initial.report.labelComplete);
});

test('budget report carries excluded workflow names and event types from the producer census', async () => {
  const args = {
    api: apiFixture(),
    repository: 'owner/repo',
    runId: 100,
    attempt: 2,
    jobGraph: { tests: [] },
  };
  const initial = await buildReport(args);
  const workflowProfiles = [
    {
      id: 'source',
      otherEvents: [
        {
          file: 'labels.yml',
          name: 'Label approval',
          events: ['pull_request_target'],
          types: { pull_request_target: ['labeled', 'unlabeled'] },
        },
      ],
    },
  ];
  const producer = observationEnvelope(initial.source.observation, {
    repositoryMetrics: { workflow: { profiles: workflowProfiles } },
  });
  const result = await buildReport({ ...args, producer });
  assert.deepEqual(result.report.workflowProfiles, workflowProfiles);
  const markdown = renderReport(result.report);
  assert.match(
    markdown,
    /source.*Label approval.*labels.yml.*pull_request_target.*labeled, unlabeled/,
  );
  assert.equal(result.report.breach, initial.report.breach);
  assert.equal(result.report.labelComplete, initial.report.labelComplete);
});

test('package bytes and signed main deltas are advisory and use proven baselines', async () => {
  const args = {
    api: apiFixture(),
    repository: 'owner/repo',
    runId: 100,
    attempt: 2,
    jobGraph: { tests: [] },
  };
  const initial = await buildReport(args);
  const packages = (standaloneStaticBytes, webZipBytes, installerBytes) => ({
    web: {
      metrics: {
        schema: 'mekstation/ci-package-metrics/v1',
        unit: 'bytes',
        standaloneStaticBytes,
        webZipBytes,
      },
    },
    installers: {
      metrics: {
        schema: 'mekstation/ci-package-metrics/v1',
        unit: 'bytes',
        kind: 'installers',
        installerBytes,
      },
    },
  });
  const source = observationEnvelope(initial.source.observation, {
    packages: packages(400_148_000, 100_000_000, 200_000_000),
  });
  const base = observationEnvelope(initial.baselines[1].observation, {
    packages: packages(400_000_000, 105_300_000, 200_000_000),
  });
  const result = await buildReport({
    ...args,
    producer: source,
    baselineProducers: [base],
  });
  assert.equal(result.report.status, initial.report.status);
  assert.equal(result.report.breach, initial.report.breach);
  assert.equal(result.report.labelComplete, initial.report.labelComplete);
  const markdown = renderReport(result.report);
  assert.match(markdown, /400148000 B.*400000000 B.*\+148000 B/);
  assert.match(markdown, /100000000 B.*105300000 B.*-5300000 B/);
  assert.match(markdown, /200000000 B.*200000000 B.*\+0 B/);
  assert.match(markdown, /99\/2/);
  const stale = structuredClone(base);
  stale.observation.identity.headSha = 'b'.repeat(40);
  const rejected = await buildReport({
    ...args,
    producer: source,
    baselineProducers: [stale],
  });
  assert.ok(
    rejected.report.packages.every(
      (row) => row.mainMedian === null && row.deltaBytes === null,
    ),
  );
});

test('collector retains failed rerun attempts while medians use successful comparable main', async () => {
  const result = await buildReport({
    api: apiFixture(),
    repository: 'owner/repo',
    runId: 100,
    attempt: 2,
    jobGraph: { tests: [] },
  });
  assert.equal(result.attempts.length, 2);
  assert.equal(result.baselines.length, 2);
  assert.equal(result.report.main.included.length, 1);
  assert.equal(
    result.report.main.excluded[0].reason,
    'not successful main push',
  );
  assert.equal(result.envelope.tests, null);
});

test('baseline API failure remains diagnostic; current timings are preserved', async () => {
  const api = apiFixture();
  const result = await buildReport({
    api: (method, route) => {
      if (route.includes('/workflows/')) throw new Error('HTTP 503');
      return api(method, route);
    },
    repository: 'owner/repo',
    runId: 100,
    attempt: 2,
    jobGraph: { tests: [] },
  });
  assert.equal(result.report.observation.complete, true);
  assert.equal(result.report.complete, false);
  assert.match(result.diagnostics.join(), /503/);
});

test('test timing artifacts require fresh API provenance for source and baselines', async () => {
  const args = {
    api: apiFixture(),
    repository: 'owner/repo',
    runId: 100,
    attempt: 2,
    jobGraph: { tests: [] },
  };
  const initial = await buildReport(args);
  const source = initial.envelope;
  source.tests = testObservation({
    observation: source.observation,
    framework: 'jest',
    complete: true,
    files: { file: 100 },
  });
  const observed = initial.baselines[1].observation;
  const base = observationEnvelope(observed, {
    tests: testObservation({
      observation: observed,
      framework: 'jest',
      complete: true,
      files: { file: 100 },
    }),
  });
  assert.equal(
    (
      await buildReport({
        ...args,
        producer: source,
        baselineProducers: [base],
      })
    ).report.tests.complete,
    true,
  );
  const stale = structuredClone(base);
  stale.observation.identity.headSha = 'b'.repeat(40);
  stale.tests.identity.headSha = 'b'.repeat(40);
  const rejected = await buildReport({
    ...args,
    producer: source,
    baselineProducers: [stale],
  });
  assert.equal(rejected.report.tests.complete, false);
  assert.match(rejected.diagnostics.join(), /fresh API run\/head\/attempt/);
  const wrongSource = structuredClone(source);
  wrongSource.observation.identity.headSha = 'b'.repeat(40);
  wrongSource.tests.identity.headSha = 'b'.repeat(40);
  await assert.rejects(
    buildReport({ ...args, producer: wrongSource }),
    /fresh API run\/head\/attempt/,
  );
});

test('Jest producer extracts real timing and requires planned file census for complete', async () => {
  const result = await buildReport({
    api: apiFixture(),
    repository: 'owner/repo',
    runId: 100,
    attempt: 2,
    jobGraph: { tests: [] },
  });
  const root = path.resolve('fixture');
  const args = {
    observation: result.source.observation,
    root,
    framework: 'jest',
    expectedFiles: ['a.test.ts'],
    reports: [
      {
        testResults: [
          {
            name: path.join(root, 'a.test.ts'),
            startTime: 0,
            endTime: 20100,
            status: 'failed',
          },
        ],
      },
    ],
  };
  const measured = extractTestObservation(args);
  assert.equal(measured.complete, true);
  assert.equal(measured.files['a.test.ts'], 20100);
  assert.equal(
    extractTestObservation({
      ...args,
      expectedFiles: ['a.test.ts', 'cached.test.ts'],
    }).complete,
    false,
  );
});

test('CLI dry run writes stamped artifact and raw attempts; transient source failure exits successfully', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-report-test-'));
  try {
    const graph = path.join(dir, 'graph.json');
    fs.writeFileSync(graph, '{"tests":[]}');
    const result = await main(
      [
        '--repo',
        'owner/repo',
        '--run',
        '100',
        '--attempt',
        '2',
        '--workflow-id',
        '10',
        '--graph',
        graph,
        '--out',
        dir,
        '--dry-run',
      ],
      apiFixture(),
    );
    assert.equal(result.status, 'missing');
    const envelope = JSON.parse(
      fs.readFileSync(path.join(dir, 'ci-observation-100-2.json')),
    );
    assert.equal(envelope.observation.identity.attempt, 2);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(dir, 'source-attempts.json')))
        .length,
      2,
    );
    const failure = await main(
      [
        '--repo',
        'owner/repo',
        '--run',
        '100',
        '--attempt',
        '2',
        '--workflow-id',
        '10',
        '--graph',
        graph,
      ],
      () => {
        throw new Error('HTTP 503');
      },
    );
    assert.equal(failure.status, 'error');
    assert.match(failure.diagnostic, /503/);
    // The actual command-line process also exits zero on unavailable reporting input.
    execFileSync(process.execPath, ['scripts/ci/ci-report.mjs'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
