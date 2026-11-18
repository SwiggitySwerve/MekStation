// Owns the PR and Nightly browser-test inventories, retry policies and duration
// allocation. A timing miss changes a weight only: selection always comes from
// live tests. A suite may set `split: 'test'` (allocate per test instead of per
// file) and `fileWeights: true` (weigh by timing.fileMilliseconds).
import crypto from 'node:crypto';

import { median } from '../lib/statistics.mjs';

export const CI_SUITES = [
  {
    name: 'gates',
    workers: 1,
    options: ['--retries=0', '--trace=retain-on-failure'],
    files: [
      'active-session-recovery.spec.ts',
      'seam-roster-materialization-handoff.spec.ts',
      'seam-fresh-construction-no-instant-defeat.spec.ts',
      'customizer-equipment-catalog.spec.ts',
      'customizer-record-sheet-rendering.spec.ts',
      'customizer-edit-recovery.spec.ts',
      // Saves canonical tripod/QuadVee units through the customizer; it ran
      // only in the nightly and missed #3338's save confirmation (42795664179).
      'customizer-mech-crew-roster.spec.ts',
      'gm-campaign-ledger-control-plane.spec.ts',
    ],
  },
  {
    name: 'library',
    workers: 1,
    options: [],
    split: 'test',
    files: ['customizer-library-open.spec.ts'],
  },
  {
    name: 'smoke',
    workers: 4,
    options: [],
    files: ['tactical-map-visual-smoke.spec.ts'],
  },
];

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function suitesForDataSpecs(dataSpecs = []) {
  if (
    !Array.isArray(dataSpecs) ||
    dataSpecs.some(
      (file) =>
        typeof file !== 'string' ||
        !/^e2e\/[\w./-]+\.spec\.ts$/.test(file) ||
        file.includes('..'),
    )
  )
    throw new Error('Invalid data-keyed E2E spec list');
  const fixed = new Set(CI_SUITES.flatMap(({ files }) => files));
  const files = [...new Set(dataSpecs.map((file) => file.slice(4)))]
    .filter((file) => !fixed.has(file))
    .sort(compare);
  return files.length
    ? [
        ...CI_SUITES,
        { name: 'data', workers: 1, options: [], fileWeights: true, files },
      ]
    : CI_SUITES;
}

// The Nightly suite set: one single-worker suite over every spec file the live
// census contains. The census is the Chromium listing with these rows excluded
// (they run armed in their own step); the runner passes both below to Playwright.
export const NIGHTLY_SUITE_NAME = 'nightly';
export const NIGHTLY_GREP_INVERT = '@E2E-19|@E2E-25';
export const NIGHTLY_DURATIONS = 'config/playwright/nightly-durations.json';

export function nightlySuites(tests) {
  return [
    {
      name: NIGHTLY_SUITE_NAME,
      workers: 1,
      options: [],
      split: 'file',
      files: [...new Set(tests.map(({ file }) => file))].sort(compare),
    },
  ];
}

// Playwright arguments, owned here so a runner change cannot drift from the
// invocation the contract tests pin. PR selection names its spec files; Nightly
// selects by the generated --test-list inside the grep-filtered census.
export const prCensusArgs = (suites) =>
  suites.flatMap(({ files }) => files.map((f) => `e2e/${f}`));

export const prTaskArgs = (suite, list) => [
  ...suite.files.map((f) => `e2e/${f}`),
  `--test-list=${list}`,
  '--project=chromium',
  `--workers=${suite.workers}`,
  ...suite.options,
  `--output=test-results/${suite.name}`,
];

export const nightlyCensusArgs = () => [
  '--ignore-snapshots',
  '--grep-invert',
  NIGHTLY_GREP_INVERT,
];

export const nightlyTaskArgs = (suite, list) => [
  `--test-list=${list}`,
  '--project=chromium',
  `--workers=${suite.workers}`,
  ...suite.options,
  ...nightlyCensusArgs(),
  `--output=test-results/${suite.name}`,
];

/**
 * Nightly mode: `--suite-set nightly --shard=<i>/<n>` and nothing else. The
 * shard count is always explicit, so a workflow typo cannot change it.
 */
export function parseNightlyInvocation(argv) {
  const [flag, name, shard, ...rest] = argv;
  const match = /^--shard=(\d+)\/(\d+)$/.exec(shard ?? '');
  if (flag !== '--suite-set' || name !== 'nightly' || !match || rest.length)
    throw new Error('Expected --suite-set nightly --shard=<i>/<n>');
  const shardIndex = Number(match[1]);
  const shardCount = Number(match[2]);
  if (!(shardCount >= 1 && shardIndex >= 1 && shardIndex <= shardCount))
    throw new Error(`Invalid Nightly shard ${shardIndex}/${shardCount}`);
  // The full suite needs the census, so the runner builds it after listing.
  return { suite: { name: NIGHTLY_SUITE_NAME }, shardIndex, shardCount };
}

export function parseInvocation(argv, dataSpecs = []) {
  const shard = argv.find((arg) => arg.startsWith('--shard='));
  if (!/^--shard=[12]\/2$/.test(shard ?? ''))
    throw new Error('Expected --shard=<1|2>/2');
  const suite = argv.includes('--data-specs')
    ? suitesForDataSpecs(dataSpecs).find(({ name }) => name === 'data')
    : CI_SUITES.find(({ files }) =>
        files.every((file) => argv.includes(`e2e/${file}`)),
      );
  if (!suite) throw new Error('Unknown PR E2E suite');
  const expected = [
    'test',
    ...(suite.name === 'data'
      ? ['--data-specs']
      : suite.files.map((file) => `e2e/${file}`)),
    '--project=chromium',
    ...suite.options,
    `--workers=${suite.workers}`,
    shard,
    `--output=test-results/${suite.name}`,
  ];
  if (JSON.stringify(argv) !== JSON.stringify(expected))
    throw new Error(
      'PR E2E invocation changed its files, workers or retry policy',
    );
  return { suite, shardIndex: Number(shard.at(8)) };
}
export function testDescription({ file, titles, project }) {
  // Playwright's native --test-list format uses this separator. Refuse an
  // ambiguous identity rather than silently selecting a different test.
  for (const part of [file, project, ...titles]) {
    if (!part || /[\r\n›]/u.test(part))
      throw new Error(`Unrepresentable test identity: ${JSON.stringify(part)}`);
  }
  return [`[${project}]`, file, ...titles].join(' › ');
}

/** Read the public JSON reporter format, from either --list or a real run. */
export function collectTests(report) {
  if (!Array.isArray(report.suites) || report.errors?.length)
    throw new Error('Playwright collection failed or its census is missing');
  const tests = [];
  function visit(suite, titles, isFile) {
    const parents = isFile ? [] : [...titles, suite.title];
    for (const spec of suite.specs ?? []) {
      for (const result of spec.tests ?? []) {
        const row = {
          file: spec.file.replaceAll('\\', '/'),
          titles: [...parents, spec.title],
          project: result.projectName,
          results: result.results ?? [],
          expectedStatus: result.expectedStatus,
        };
        row.key = testDescription(row);
        tests.push(row);
      }
    }
    for (const child of suite.suites ?? []) visit(child, parents, false);
  }
  for (const suite of report.suites) visit(suite, [], true);
  const keys = new Set(tests.map(({ key }) => key));
  if (keys.size !== tests.length) throw new Error('Duplicate test identities');
  return tests;
}

export function censusHash(tests) {
  return crypto
    .createHash('sha256')
    .update(
      tests
        .map(({ key }) => key)
        .sort(compare)
        .join('\n'),
    )
    .digest('hex');
}

function suiteFor(test, suites = CI_SUITES) {
  const suite = suites.find(({ files }) => files.includes(test.file));
  if (!suite || test.project !== 'chromium')
    throw new Error(`Unexpected PR test: ${test.key}`);
  return suite;
}

export function recordDurations(reports, sourceRunIds, suites = CI_SUITES) {
  const observations = new Map();
  for (const report of reports) {
    for (const test of collectTests(report)) {
      suiteFor(test, suites);
      // A test.fail() row that fails as expected ran in full: its time is a
      // real weight, or the planner would give it the largest one.
      const passed = test.results.filter(
        ({ status, retry, duration }) =>
          (status === 'passed' ||
            (status === 'failed' && test.expectedStatus === 'failed')) &&
          retry === 0 &&
          duration > 0,
      );
      if (!passed.length) continue;
      const values = observations.get(test.key) ?? [];
      values.push(...passed.map(({ duration }) => duration));
      observations.set(test.key, values);
    }
  }
  if (!observations.size) throw new Error('No first-attempt passing durations');
  return {
    version: 1,
    sourceRunIds,
    // A seed schedules work, never caches results or decides which tests run.
    milliseconds: Object.fromEntries(
      [...observations]
        .sort(([a], [b]) => compare(a, b))
        .map(([key, values]) => [key, Math.round(median(values))]),
    ),
  };
}

export function planShards(tests, timing, shardCount = 2, dataSpecs = []) {
  return planSuiteShards(
    tests,
    timing,
    shardCount,
    suitesForDataSpecs(dataSpecs),
  );
}

export function planSuiteShards(tests, timing, shardCount, suites) {
  if (!Number.isInteger(shardCount) || shardCount < 1)
    throw new Error('Invalid E2E shard count');
  if (timing.version !== 1 || !timing.milliseconds)
    throw new Error('Unsupported E2E duration seed');
  if (
    !tests.length ||
    new Set(tests.map(({ key }) => key)).size !== tests.length
  )
    throw new Error('Empty or duplicated E2E census');
  for (const suite of suites) {
    for (const file of suite.files) {
      if (!tests.some((test) => test.file === file))
        throw new Error(`Missing PR spec: ${file}`);
    }
  }
  const observed = Object.values(timing.milliseconds);
  if (!observed.length || observed.some((n) => !Number.isFinite(n) || n <= 0))
    throw new Error('Invalid E2E durations');
  const fallback = Math.max(...observed);
  const fileCounts = new Map();
  for (const test of tests)
    fileCounts.set(test.file, (fileCounts.get(test.file) ?? 0) + 1);
  const groups = new Map();
  let unknown = 0;
  for (const test of tests) {
    const suite = suiteFor(test, suites);
    // Keep gate files and the smoke spec intact, including its serial describe.
    // The library is already split at test boundaries by native sharding; its
    // independent tests remain single-worker within each server invocation.
    const groupKey = suite.split === 'test' ? test.key : test.file;
    const group = groups.get(groupKey) ?? {
      key: groupKey,
      suite: suite.name,
      tests: [],
      milliseconds: 0,
    };
    const fileWeight = suite.fileWeights
      ? timing.fileMilliseconds?.[test.file]
      : undefined;
    if (
      fileWeight !== undefined &&
      (!Number.isFinite(fileWeight) || fileWeight <= 0)
    )
      throw new Error('Invalid E2E file duration');
    let duration =
      fileWeight === undefined
        ? timing.milliseconds[test.key]
        : fileWeight / fileCounts.get(test.file);
    // The census lists test.skip/test.fixme rows as skipped. They never run,
    // so they weigh nothing instead of the largest recorded weight.
    if (duration === undefined && test.expectedStatus === 'skipped')
      duration = 0;
    if (duration === undefined) unknown++;
    group.tests.push(test);
    group.milliseconds += duration ?? fallback;
    groups.set(groupKey, group);
  }
  const shards = Array.from({ length: shardCount }, (_, index) => ({
    shard: index + 1,
    milliseconds: 0,
    tasks: [],
  }));
  for (const group of [...groups.values()].sort(
    (a, b) => b.milliseconds - a.milliseconds || compare(a.key, b.key),
  )) {
    const shard = [...shards].sort(
      (a, b) => a.milliseconds - b.milliseconds || a.shard - b.shard,
    )[0];
    let task = shard.tasks.find(({ suite }) => suite === group.suite);
    if (!task) {
      task = { suite: group.suite, milliseconds: 0, tests: [] };
      shard.tasks.push(task);
    }
    task.tests.push(...group.tests);
    task.milliseconds += group.milliseconds;
    shard.milliseconds += group.milliseconds;
  }
  for (const shard of shards) {
    shard.tasks.sort((a, b) => compare(a.suite, b.suite));
    for (const task of shard.tasks)
      task.tests.sort((a, b) => compare(a.key, b.key));
  }
  return {
    version: 1,
    censusHash: censusHash(tests),
    count: tests.length,
    unknown,
    shards,
  };
}

export function assertSameTests(expected, observed) {
  const wanted = expected.map(({ key }) => key).sort(compare);
  const actual = observed.map(({ key }) => key).sort(compare);
  if (JSON.stringify(wanted) !== JSON.stringify(actual))
    throw new Error('Executed E2E census differs from the planned test set');
}

/** One test list per shard, from a full plan. */
export const shardTestLists = (plan) =>
  plan.shards.map(({ tasks }) => tasks.flatMap(({ tests }) => tests));

/** A shard that runs nothing would pass vacuously: fail it instead. */
export function assertShardNotEmpty(tests, label) {
  if (!tests.length) throw new Error(`E2E shard ${label} has zero tests`);
}

/** The N shard test lists partition the census: none missing, none duplicated. */
export function assertShardsCoverCensus(shardLists, census) {
  const all = shardLists.flat();
  const seen = new Set();
  for (const { key } of all) {
    if (seen.has(key)) throw new Error(`E2E test planned twice: ${key}`);
    seen.add(key);
  }
  assertSameTests(census, all);
}

/**
 * Retry accounting over executed tests (merged across shards). A test is a
 * first-attempt result when its first attempt had the expected status
 * (test.fail() rows expect 'failed'), retry-only when only a retry did, and
 * failed when no attempt did. Retry-only passes are named, never folded in.
 */
export function retryAccounting(tests) {
  const firstAttempt = [];
  const retryOnly = [];
  const failed = [];
  const skipped = [];
  for (const test of [...tests].sort((a, b) => compare(a.key, b.key))) {
    const attempts = [...test.results].sort((a, b) => a.retry - b.retry);
    const expected = test.expectedStatus ?? 'passed';
    if (attempts.at(-1)?.status === 'skipped') skipped.push(test.key);
    else if (attempts[0]?.status === expected) firstAttempt.push(test.key);
    else if (attempts.at(-1)?.status === expected)
      retryOnly.push({ key: test.key, attempts: attempts.length });
    else failed.push(test.key);
  }
  return { firstAttempt, retryOnly, failed, skipped };
}
