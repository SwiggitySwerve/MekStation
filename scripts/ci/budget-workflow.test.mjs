import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse, parseDocument } from 'yaml';

import { assertJobResults } from './budget-aggregate.mjs';
import {
  checkRepositoryMetrics,
  exitCodeFor,
  run as runBudgetCheck,
} from './budget-check.mjs';
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
import { AGGREGATOR } from './lint-and-test-guard.mjs';

const root = process.cwd(),
  config = loadBudgets(),
  workflow = readWorkflow(root);

test('typical event census retains omitted, synchronize, ready and mixed types; labels stay visible elsewhere', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-event-types-'));
  const directory = path.join(fixture, '.github/workflows');
  fs.mkdirSync(directory, { recursive: true });
  try {
    for (const event of ['pull_request', 'pull_request_target']) {
      for (const types of [
        undefined,
        ['opened'],
        ['synchronize'],
        ['reopened'],
        ['ready_for_review'],
        ['labeled', 'synchronize'],
        ['labeled', 'unlabeled'],
      ]) {
        const labelOnly = types?.join(',') === 'labeled,unlabeled';
        fs.writeFileSync(
          path.join(directory, 'events.yml'),
          `name: Event census\non:\n  ${event}:\n    branches: [main]\n${types ? `    types: [${types.join(', ')}]\n` : ''}jobs:\n  publisher:\n    runs-on: ubuntu-latest\n    steps: [{run: true}]\n`,
        );
        const census = inducedWorkflowCensus(fixture, ['src/a.ts']);
        const label = `${event}: ${JSON.stringify(types)}`;
        assert.equal(census.jobs.length, labelOnly ? 0 : 1, label);
        assert.deepEqual(census.files, labelOnly ? [] : ['events.yml'], label);
        assert.deepEqual(
          census.otherEvents,
          labelOnly
            ? [
                {
                  file: 'events.yml',
                  name: 'Event census',
                  events: [event],
                  types: { [event]: types },
                },
              ]
            : [],
          label,
        );
      }
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('event-aware census preserves the deployed main profile counts and included files', () => {
  const expected = {
    docs: 10,
    source: 11,
    data: 11,
    browser: 10,
    desktop: 13,
    ci: 13,
    budgets: 12,
    bootstrap: 14,
    dependency: 14,
  };
  for (const profile of workflowMetrics(root, config).profiles) {
    assert.equal(profile.active, expected[profile.id], profile.id);
    assert.deepEqual(
      profile.workflowFiles,
      [
        ...(['budgets', 'bootstrap', 'dependency'].includes(profile.id)
          ? ['ci-budget-approval.yml']
          : []),
        'lint-and-test-guard.yml',
        'pr-checks.yml',
      ],
      profile.id,
    );
  }
});

test('label and base edit events stay visible in otherEvents without adding counted jobs', () => {
  for (const profile of workflowMetrics(root, config).profiles) {
    const entry = profile.otherEvents.find(
      (workflow) => workflow.file === 'ci-budget-label-approval.yml',
    );
    assert.deepEqual(
      entry,
      {
        file: 'ci-budget-label-approval.yml',
        name: 'CI Budget Label and Base Approval',
        events: ['pull_request_target'],
        types: { pull_request_target: ['labeled', 'unlabeled', 'edited'] },
      },
      profile.id,
    );
    assert.ok(!profile.workflowFiles.includes(entry.file), profile.id);
    assert.ok(
      !profile.census.some((job) => job.file === entry.file),
      profile.id,
    );
  }
});

test('hourly reconciliation is visible in every otherEvents census without charging typical PRs', () => {
  for (const profile of workflowMetrics(root, config).profiles) {
    assert.deepEqual(
      profile.otherEvents.find(
        (entry) => entry.file === 'ci-budget-reconcile.yml',
      ),
      {
        file: 'ci-budget-reconcile.yml',
        name: 'CI Budget Reconciliation',
        events: ['schedule', 'workflow_dispatch'],
        types: { schedule: null, workflow_dispatch: null },
      },
      profile.id,
    );
    assert.ok(
      !profile.workflowFiles.includes('ci-budget-reconcile.yml'),
      profile.id,
    );
    assert.ok(
      !profile.census.some((job) => job.file === 'ci-budget-reconcile.yml'),
      profile.id,
    );
  }
});

test('the PR Checks budget command rejects a re-added byte cap before collecting metrics', () => {
  const fixture = fs.mkdtempSync(
    path.join(os.tmpdir(), 'budget-tree-command-'),
  );
  try {
    const directory = path.join(fixture, 'config', 'ci');
    fs.mkdirSync(directory, { recursive: true });
    for (const id of [
      'standaloneStaticBytes',
      'webZipBytes',
      'installerBytes',
      'fooBytes',
    ]) {
      const next = structuredClone(config);
      next.limits[id] = 1;
      fs.writeFileSync(
        path.join(directory, 'budgets.json'),
        JSON.stringify(next),
      );
      assert.throws(
        () => runBudgetCheck([], fixture),
        /Byte limits are forbidden|limits: missing or unknown fields/,
      );
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('PR and release workflows retain complete advisory web and installer census contracts', () => {
  for (const file of ['pr-checks.yml', 'release.yml']) {
    const source = fs.readFileSync(
      path.join(root, '.github/workflows', file),
      'utf8',
    );
    const document = parseDocument(source, { uniqueKeys: true });
    assert.deepEqual(document.errors, []);
    const parsed = document.toJS();
    assert.ok(Object.keys(parsed.jobs).length > 0);
    for (const [id, job] of Object.entries(parsed.jobs))
      assert.ok(expandJob(id, job).length > 0);
    const steps = Object.values(parsed.jobs).flatMap((job) => job.steps ?? []);
    for (const kind of ['web', 'installers']) {
      const census = steps.find((step) =>
        step.run?.includes(`budget-artifacts.mjs --kind ${kind}`),
      );
      assert.ok(census, `${file}: ${kind}`);
      assert.match(census.name, /Census/);
      assert.match(census.name, /advisory/);
      assert.equal(census['continue-on-error'], undefined);
      assert.ok(
        steps.some((step) =>
          step.with?.path?.includes(
            `budget-output/${kind === 'web' ? 'web' : 'installers'}.json`,
          ),
        ) ||
          (file === 'release.yml' && kind === 'web'),
      );
    }
  }
});

test('oversized advisory garden input is diagnosed without running the publisher', async () => {
  const source = parse(
    fs.readFileSync(path.join(root, '.github/workflows/ci-garden.yml'), 'utf8'),
  );
  const step = Object.values(source.jobs)
    .flatMap((job) => job.steps ?? [])
    .find((entry) => entry.name?.startsWith('Publish one garden issue'));
  const messages = [];
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const run = new AsyncFunction('require', 'process', 'core', step.with.script);
  await run(
    () => ({
      lstatSync: () => ({
        isFile: () => true,
        isSymbolicLink: () => false,
        size: 9 * 1024 * 1024,
      }),
      readFileSync: () => assert.fail('Oversized input must not be read'),
    }),
    { env: { RUNNER_TEMP: '/temp' } },
    { info: (value) => messages.push(value) },
  );
  assert.match(messages.join(), /Advisory garden publication unavailable/);
});
const repository = () => ({
  schema: 'mekstation/ci-budget-metrics/v1',
  budgetConfigHash: 'a'.repeat(64),
  workflow: workflowMetrics(root, config),
  dependencies: structuredClone(config.dependencies),
  cache: { files: ['one.test.ts'], unkeyable: [], repoWide: [] },
});

test('draft and ready PR pushes run the same checks without a duplicate ready transition', () => {
  const workflow = readWorkflow(root);
  assert.deepEqual(workflow.on.pull_request.types, [
    'opened',
    'synchronize',
    'reopened',
  ]);
  assert.deepEqual(workflow.on.pull_request.branches, ['main']);
  for (const [id, job] of Object.entries(workflow.jobs)) {
    assert.doesNotMatch(job.if ?? '', /draft|ready_for_review/, id);
    for (const step of job.steps ?? [])
      assert.doesNotMatch(
        step.if ?? '',
        /draft|ready_for_review/,
        `${id}/${step.name}`,
      );
  }
  assert.equal(workflow.jobs['lint-and-test'].name, AGGREGATOR);
  assert.equal(workflow.jobs['lint-and-test'].if, 'always()');
});

test('completed source runs still drive head-bound Guard, approval and budget publishing', () => {
  const guard = parse(
    fs.readFileSync(
      path.join(root, '.github/workflows/lint-and-test-guard.yml'),
      'utf8',
    ),
  );
  assert.deepEqual(guard.on, {
    workflow_run: { workflows: ['PR Checks'], types: ['completed'] },
  });
  const steps = guard.jobs.guard.steps;
  assert.equal(
    steps.find((step) => step.run?.includes('lint-and-test-guard.mjs')).env
      .HEAD_SHA,
    '${{ github.event.workflow_run.head_sha }}',
  );
  assert.ok(
    steps.some((step) => step.with?.script?.includes('checkBudgetPolicy')),
  );
  assert.ok(
    steps.some((step) => step.run === 'node scripts/ci/budget-report.mjs'),
  );
  for (const step of steps)
    assert.doesNotMatch(step.if ?? '', /draft|ready_for_review/);
});

test('only the separate budget approval safety reevaluation retains the ready listener', () => {
  const listeners = fs
    .readdirSync(path.join(root, '.github/workflows'))
    .filter((file) => /\.ya?ml$/.test(file))
    .filter((file) => {
      const workflow = parse(
        fs.readFileSync(path.join(root, '.github/workflows', file), 'utf8'),
      );
      return Object.values(workflow.on ?? {}).some((trigger) =>
        trigger?.types?.includes('ready_for_review'),
      );
    });
  assert.deepEqual(listeners, ['ci-budget-approval.yml']);
});

test('pre-install Guard tests run without the repository dependency installation', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-preinstall-'));
  try {
    for (const file of [
      'lint-and-test-guard.mjs',
      'lint-and-test-guard.test.mjs',
    ]) {
      fs.copyFileSync(
        path.join(root, 'scripts/ci', file),
        path.join(fixture, file),
      );
    }
    const env = { ...process.env, NODE_PATH: '' };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(
      process.execPath,
      ['--test', '--test-reporter=tap', 'lint-and-test-guard.test.mjs'],
      {
        cwd: fixture,
        encoding: 'utf8',
        timeout: 30000,
        env,
      },
    );
    assert.equal(
      result.status,
      0,
      `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`,
    );
    assert.match(
      result.stdout,
      /ok \d+ - a run without the aggregator job is reported as failed/,
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
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
  assert.equal(source.active, 11); // 10 PR Checks + the automatically induced guard
  assert.equal(source.expanded, 13); // also exposes the 2 gated packaging legs
  assert.equal(
    source.census.filter((j) => j.file === 'lint-and-test-guard.yml').length,
    1,
  );
  // PARITY-PLAN §193.2: the typical job count is reported, never blocking.
  const overJobs = checkRepositoryMetrics(
    { ...config, limits: { ...config.limits, typicalPrJobs: 9 } },
    repository(),
    [],
  );
  assert.deepEqual(overJobs.violations, []);
  const jobs = overJobs.overBudget.filter((v) => v.code === 'typicalPrJobs');
  assert.ok(jobs.length);
  assert.ok(
    jobs.every(
      (v) =>
        v.key === 'limits.typicalPrJobs' &&
        v.limit === 9 &&
        v.delta === v.value - 9,
    ),
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
      w.jobs['lint-and-test'].steps.find((s) =>
        s.run?.includes('budget-aggregate.mjs'),
      ).run = 'echo pass';
    },
    (w) => {
      w.jobs['lint-and-test'].steps.find((s) =>
        s.run?.includes('budget-aggregate.mjs'),
      )['continue-on-error'] = true;
    },
    (w) => {
      w.jobs['lint-and-test'].steps.find((s) =>
        s.run?.includes('budget-aggregate.mjs'),
      ).env.GATES_JSON = '{}';
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
    (w) => {
      w.jobs['simulation-checks']['continue-on-error'] = true;
    },
    (w) => {
      w.jobs['simulation-checks'].steps.find((s) =>
        s.run?.includes('--kind installers'),
      )['continue-on-error'] = true;
    },
    (w) => {
      w.jobs['simulation-checks'].steps.find((s) =>
        s.run?.includes('--kind installers'),
      ).run += ' || true';
    },
    (w) => {
      w.jobs['simulation-checks'].steps.find((s) =>
        s.run?.includes('--kind installers'),
      ).if =
        "${{ !cancelled() && needs.detect-changes.outputs.packaging == 'false' }}";
    },
    (w) => {
      w.jobs['simulation-checks'].steps.find((s) =>
        s.run?.includes('--kind installers'),
      ).if = '${{ !cancelled() }}';
    },
  ]) {
    const next = structuredClone(workflow);
    mutate(next);
    assert.throws(() => workflowMetrics(root, config, next));
  }
});

/** Fails unless the advisory reports run in Sim + Pack after its build, tolerated, and Static has none. */
function assertAdvisoryReports(jobs) {
  const sim = jobs['simulation-checks'],
    staticJob = jobs['static-checks'];
  const advisory = [
    [
      'Prepare source-head graphs and prove advisory reporting read-only',
      'node scripts/ci/budget-github.mjs',
    ],
    ['Install isolated pinned tsrs (advisory)', 'tsrs@'],
    [
      'Compare TS7 and verified tsrs diagnostics (advisory)',
      'node scripts/qc/tsrs-side-check.mjs',
    ],
  ];
  const at = (name) => sim.steps.findIndex((s) => s.name === name);
  const build = at('Build Next.js application');
  assert.ok(build >= 0);
  for (const [name, command] of advisory) {
    const step = sim.steps[at(name)];
    assert.ok(step?.run.includes(command), name);
    assert.ok(at(name) > build, `${name} runs after the Next build`);
    assert.equal(step['continue-on-error'], true, name);
    assert.equal(step.if, '${{ !cancelled() }}', name);
  }
  // The side-check's compilers read the generated route types.
  assert.ok(
    at('Generate Next.js route types') <
      at('Compare TS7 and verified tsrs diagnostics (advisory)'),
  );
  for (const [name, artifact] of [
    ['Upload canonical reporter inputs', 'ci-budget-inputs'],
    ['Upload in-Actions reporter dry-run proof', 'ci-budget-report-proof'],
  ]) {
    const step = sim.steps[at(name)];
    assert.equal(step?.with.name, artifact, name);
    assert.equal(step.if, '${{ always() }}', name);
    assert.equal(step.with['if-no-files-found'], 'warn', name);
  }
  // Static Checks no longer carries them.
  for (const step of staticJob.steps) {
    assert.ok(!advisory.some(([name]) => name === step.name), step.name);
    assert.ok(!/budget-github|tsrs/.test(step.run ?? ''), step.name);
    assert.ok(!/ci-budget-(inputs|report-proof)/.test(step.with?.name ?? ''));
  }
}

test('advisory reports run late in Simulation Checks and Linux Pack, every advisory step tolerated, none in Static', () => {
  assertAdvisoryReports(workflow.jobs);
  // No new job: the aggregator still needs every job.
  assert.deepEqual(
    [...workflow.jobs['lint-and-test'].needs].sort(),
    Object.keys(workflow.jobs)
      .filter((id) => id !== 'lint-and-test')
      .sort(),
  );
  // Mutants: an advisory step that can fail its job, one back in Static
  // Checks, and one moved before the build are refused.
  const tolerated = structuredClone(workflow.jobs);
  delete tolerated['simulation-checks'].steps.find(
    (s) => s.name === 'Compare TS7 and verified tsrs diagnostics (advisory)',
  )['continue-on-error'];
  assert.throws(() => assertAdvisoryReports(tolerated));
  const back = structuredClone(workflow.jobs);
  back['static-checks'].steps.push(
    back['simulation-checks'].steps.find(
      (s) => s.run === 'node scripts/ci/budget-github.mjs',
    ),
  );
  assert.throws(() => assertAdvisoryReports(back));
  const early = structuredClone(workflow.jobs);
  const steps = early['simulation-checks'].steps;
  const reporter = steps.findIndex(
    (s) => s.run === 'node scripts/ci/budget-github.mjs',
  );
  steps.unshift(...steps.splice(reporter, 1));
  assert.throws(() => assertAdvisoryReports(early), /after the Next build/);
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

test('cache and dependency counts are report-only; timeout drift is red', () => {
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
  metrics.dependencies.desktop.directDependencies += 2;
  // PARITY-PLAN §193.2: counts over their limits pass with a report line.
  const counts = checkRepositoryMetrics(config, metrics, []);
  assert.deepEqual(counts.violations, []);
  assert.deepEqual(
    counts.overBudget.map(({ key, value, limit, delta }) => [
      key,
      value,
      limit,
      delta,
    ]),
    [
      [
        'limits.unkeyableTests',
        config.limits.unkeyableTests + 1,
        config.limits.unkeyableTests,
        1,
      ],
      [
        'limits.repoWideKeys',
        config.limits.repoWideKeys + 1,
        config.limits.repoWideKeys,
        1,
      ],
      [
        'dependencies.root.lockEntries',
        config.dependencies.root.lockEntries + 1,
        config.dependencies.root.lockEntries,
        1,
      ],
      [
        'dependencies.desktop.directDependencies',
        config.dependencies.desktop.directDependencies + 2,
        config.dependencies.desktop.directDependencies,
        2,
      ],
    ],
  );
  // No label silences or changes the report.
  assert.deepEqual(
    checkRepositoryMetrics(config, metrics, ['ci-dependency-growth']),
    counts,
  );
  // A timeout is not a count: drift still blocks.
  metrics.workflow.timeouts.e2e++;
  const drifted = checkRepositoryMetrics(config, metrics, []);
  assert.deepEqual(
    drifted.violations.map((v) => v.code),
    ['timeout'],
  );
  assert.equal(drifted.overBudget.length, counts.overBudget.length);
  metrics.cache.files = [];
  assert.throws(() => checkRepositoryMetrics(config, metrics, []));
  assert.throws(() => checkRepositoryMetrics(config, repository(), null));
});

test('the CLI exits 0 when only counts are over and 1 on any violation', () => {
  const metrics = repository();
  metrics.dependencies.root.lockEntries++;
  const counts = checkRepositoryMetrics(config, metrics, []);
  assert.equal(counts.overBudget.length, 1);
  assert.equal(exitCodeFor(counts), 0);
  metrics.workflow.timeouts.e2e++;
  const drifted = checkRepositoryMetrics(config, metrics, []);
  assert.equal(drifted.overBudget.length, 1);
  assert.equal(exitCodeFor(drifted), 1);
});

test('the CLI fails closed on a malformed budgets.json before any census', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-cli-'));
  try {
    fs.mkdirSync(path.join(dir, 'config/ci'), { recursive: true });
    for (const content of ['{', '{}']) {
      fs.writeFileSync(path.join(dir, 'config/ci/budgets.json'), content);
      const run = spawnSync(
        process.execPath,
        [path.join(root, 'scripts/ci/budget-check.mjs')],
        { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      assert.equal(run.status, 1, content);
      assert.match(run.stderr, /^Budget inputs rejected: /, content);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('repository gate rejects omitted/unknown timeouts and omitted/reclassified profiles', () => {
  for (const mutate of [
    (metrics) => {
      delete metrics.workflow.timeouts.e2e;
    },
    (metrics) => {
      metrics.workflow.timeouts.unknown = 1;
    },
    (metrics) => {
      metrics.workflow.profiles.pop();
    },
    (metrics) => {
      metrics.workflow.profiles.push(metrics.workflow.profiles[0]);
    },
    (metrics) => {
      metrics.workflow.profiles.find((p) => p.typical).typical = false;
    },
  ]) {
    const metrics = repository();
    mutate(metrics);
    assert.throws(() => checkRepositoryMetrics(config, metrics, []));
  }
});

test('observation projections never turn absent package evidence into zero/cap values', () => {
  const metrics = repository(),
    projection = observedBudgetValues(config, metrics);
  assert.equal(projection.complete, true);
  assert.equal(projection.missing.length, 0);
  const reporting = observedBudgetValues(
    { ...config, reporting: { jobMinutes: 60.125, criticalPathMs: 650000.5 } },
    metrics,
  );
  assert.deepEqual(reporting.missing, projection.missing);
  assert.deepEqual(reporting.values, projection.values);
  assert.equal(projection.values['limits.installerBytes'], undefined);
  assert.equal(packageContributors(null).availability, 'unavailable');
  assert.throws(() => packageContributors({ schema: 'unknown', files: [] }));
});
