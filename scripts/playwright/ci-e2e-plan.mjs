// Owns the PR browser-test inventory, retry policies and duration allocation.
// A timing miss changes a weight only: selection always comes from live tests.
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

export function parseInvocation(argv) {
  const shard = argv.find((arg) => arg.startsWith('--shard='));
  if (!/^--shard=[12]\/2$/.test(shard ?? ''))
    throw new Error('Expected --shard=<1|2>/2');
  const suite = CI_SUITES.find(({ files }) =>
    files.every((file) => argv.includes(`e2e/${file}`)),
  );
  if (!suite) throw new Error('Unknown PR E2E suite');
  const expected = [
    'test',
    ...suite.files.map((file) => `e2e/${file}`),
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

function suiteFor(test) {
  const suite = CI_SUITES.find(({ files }) => files.includes(test.file));
  if (!suite || test.project !== 'chromium')
    throw new Error(`Unexpected PR test: ${test.key}`);
  return suite;
}

export function recordDurations(reports, sourceRunIds) {
  const observations = new Map();
  for (const report of reports) {
    for (const test of collectTests(report)) {
      suiteFor(test);
      const passed = test.results.filter(
        ({ status, retry, duration }) =>
          status === 'passed' && retry === 0 && duration > 0,
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

export function planShards(tests, timing, shardCount = 2) {
  if (!Number.isInteger(shardCount) || shardCount < 1)
    throw new Error('Invalid E2E shard count');
  if (timing.version !== 1 || !timing.milliseconds)
    throw new Error('Unsupported E2E duration seed');
  if (
    !tests.length ||
    new Set(tests.map(({ key }) => key)).size !== tests.length
  )
    throw new Error('Empty or duplicated E2E census');
  for (const suite of CI_SUITES) {
    for (const file of suite.files) {
      if (!tests.some((test) => test.file === file))
        throw new Error(`Missing PR spec: ${file}`);
    }
  }
  const observed = Object.values(timing.milliseconds);
  if (!observed.length || observed.some((n) => !Number.isFinite(n) || n <= 0))
    throw new Error('Invalid E2E durations');
  const fallback = Math.max(...observed);
  const groups = new Map();
  let unknown = 0;
  for (const test of tests) {
    const suite = suiteFor(test);
    // Keep gate files and the smoke spec intact, including its serial describe.
    // The library is already split at test boundaries by native sharding; its
    // independent tests remain single-worker within each server invocation.
    const groupKey = suite.name === 'library' ? test.key : test.file;
    const group = groups.get(groupKey) ?? {
      key: groupKey,
      suite: suite.name,
      tests: [],
      milliseconds: 0,
    };
    const duration = timing.milliseconds[test.key];
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
