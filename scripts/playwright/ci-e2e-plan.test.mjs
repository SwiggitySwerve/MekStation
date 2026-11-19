import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CI_SUITES,
  NIGHTLY_DURATIONS,
  NIGHTLY_GREP_INVERT,
  assertSameTests,
  assertShardNotEmpty,
  assertShardsCoverCensus,
  collectTests,
  nightlyCensusArgs,
  nightlySuites,
  nightlyTaskArgs,
  planShards,
  planSuiteShards,
  parseInvocation,
  parseNightlyInvocation,
  prCensusArgs,
  prTaskArgs,
  recordDurations,
  shardTestLists,
  suitesForDataSpecs,
  testDescription,
} from './ci-e2e-plan.mjs';
import { checkSharedFlows } from './shared-flows.mjs';

function census() {
  return CI_SUITES.flatMap(({ files }) =>
    files.flatMap((file) =>
      [0, 1].map((i) => {
        const row = {
          file,
          titles: ['group', `case ${i}`],
          project: 'chromium',
        };
        return { ...row, key: testDescription(row) };
      }),
    ),
  );
}
const seed = (tests) => ({
  version: 1,
  milliseconds: Object.fromEntries(
    tests.map(({ key }, i) => [key, (i + 1) * 1000]),
  ),
});
const selected = (plan) =>
  plan.shards.flatMap(({ tasks }) => tasks.flatMap(({ tests }) => tests));

// Keep these guards in the file already executed by PR Checks, without changing
// its browser selection or workflow command.
test('the shared-flow map accounts for every live E2E spec and tracked path', () => {
  checkSharedFlows(fileURLToPath(new URL('../../', import.meta.url)));
});

function sharedFlowFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-shared-flows-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, value = '') => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), value);
  };
  const map = {
    flows: [
      {
        id: 'save',
        owner: 'C3',
        paths: ['src/shared/**'],
        specs: ['e2e/save.spec.ts'],
        tier: 'pr',
        notes: 'Shared save dialog.',
      },
    ],
    'nightly-only-by-design': [
      { spec: 'e2e/layout.spec.ts', reason: 'Layout-only sweep.' },
    ],
  };
  const save = () =>
    write('config/playwright/shared-flows.json', JSON.stringify(map));
  write('src/shared/dialog.ts');
  write('e2e/save.spec.ts');
  write('e2e/layout.spec.ts');
  execFileSync('git', ['-C', root, 'init', '--quiet']);
  execFileSync('git', ['-C', root, 'add', '--all']);
  save();
  return { root, map, save, write };
}

test('shared-flow fixture passes before mutation', (t) => {
  checkSharedFlows(sharedFlowFixture(t).root);
});

for (const [name, mutate, expected] of [
  [
    'unmatched path glob',
    ({ map, write }) => {
      write('src/renamed/untracked.ts');
      map.flows[0].paths.push('src/renamed/**');
    },
    /matches no tracked file/,
  ],
  [
    'new unlisted spec file',
    ({ write }) => write('e2e/nested/new.spec.ts'),
    /Unclassified E2E spec/,
  ],
  [
    'empty by-design reason',
    ({ map }) => {
      map['nightly-only-by-design'][0].reason = ' ';
    },
    /non-empty reason/,
  ],
  [
    'missing spec path',
    ({ map }) => map.flows[0].specs.push('e2e/missing.spec.ts'),
    /Missing spec/,
  ],
  [
    'mapped and by-design overlap',
    ({ map }) => map.flows[0].specs.push('e2e/layout.spec.ts'),
    /both mapped and by-design/,
  ],
  [
    'unknown owner',
    ({ map }) => {
      map.flows[0].owner = 'C5';
    },
    /owner must be C1-C4/,
  ],
]) {
  test(`shared-flow mutant rejected: ${name}`, (t) => {
    const fixture = sharedFlowFixture(t);
    mutate(fixture);
    fixture.save();
    assert.throws(() => checkSharedFlows(fixture.root), expected);
  });
}

test('a pending-only flow passes until its spec lands, then requires promotion', (t) => {
  const { root, map, save, write } = sharedFlowFixture(t);
  const pending = {
    spec: 'e2e/pending.spec.ts',
    owner: 'C4',
    reason: 'C4 campaign save-loss PR 1/2.',
  };
  map.flows.push({
    id: 'persistence',
    owner: 'C4',
    paths: ['src/shared/**'],
    specs: [],
    pendingSpecs: [pending],
    tier: 'pr',
    notes: 'Pending persistence proof.',
  });
  save();
  checkSharedFlows(root);
  write(pending.spec);
  assert.throws(() => checkSharedFlows(root), /Pending spec now exists/);
  map.flows[1].pendingSpecs = [];
  map.flows[1].specs.push(pending.spec);
  save();
  checkSharedFlows(root);
});

for (const field of ['owner', 'reason']) {
  test(`pending spec requires a valid ${field}`, (t) => {
    const { root, map, save } = sharedFlowFixture(t);
    map.flows[0].pendingSpecs = [
      {
        spec: 'e2e/pending.spec.ts',
        owner: 'C4',
        reason: 'Not yet on main.',
        [field]: '',
      },
    ];
    save();
    assert.throws(
      () => checkSharedFlows(root),
      /owner must be C1-C4|non-empty reason/,
    );
  });
}

test('an empty flow requires a pending spec', (t) => {
  const { root, map, save } = sharedFlowFixture(t);
  map.flows[0].specs = [];
  save();
  assert.throws(() => checkSharedFlows(root), /needs specs or pendingSpecs/);
});

test('the GM ledger runs exactly once in the one-worker, zero-retry PR gates', () => {
  const file = 'gm-campaign-ledger-control-plane.spec.ts';
  const gates = CI_SUITES.find(({ name }) => name === 'gates');
  assert.ok(gates.files.includes(file));
  assert.equal(gates.workers, 1);
  assert.ok(gates.options.includes('--retries=0'));
  const tests = census();
  const plan = planShards(tests, seed(tests));
  const ledgerTests = selected(plan).filter((row) => row.file === file);
  assert.equal(ledgerTests.length, 2);
  assertSameTests(
    tests.filter((row) => row.file === file),
    ledgerTests,
  );
  assert.equal(
    plan.shards.filter(({ tasks }) =>
      tasks.some(({ tests }) => tests.some((row) => row.file === file)),
    ).length,
    1,
  );
});

test('every live test appears exactly once, including a test absent from timings', () => {
  const tests = census();
  const timing = seed(tests);
  const added = { ...tests[0], titles: ['new case'] };
  added.key = testDescription(added);
  tests.push(added);
  const plan = planShards(tests, timing);
  assertSameTests(tests, selected(plan));
  assert.equal(plan.unknown, 1);
  assert.equal(plan.count, tests.length);
});

test('duration allocation is deterministic and keeps serial gate/smoke files intact', () => {
  const tests = census();
  const plan = planShards(tests, seed(tests));
  assert.deepEqual(plan, planShards([...tests].reverse(), seed(tests)));
  for (const file of CI_SUITES.filter(({ name }) => name !== 'library').flatMap(
    ({ files }) => files,
  )) {
    const owners = plan.shards.filter(({ tasks }) =>
      tasks.some(({ tests }) => tests.some((t) => t.file === file)),
    );
    assert.equal(owners.length, 1, file);
  }
});

test('the slowest file is allocated first across suite boundaries', () => {
  const tests = census();
  const timing = seed(tests);
  const slow = tests.filter(
    ({ file }) => file === 'active-session-recovery.spec.ts',
  );
  // Far above the summed seed of every other file, so no other group can
  // spill onto shard 1 however many PR specs the suites list.
  for (const { key } of slow) timing.milliseconds[key] = 1_000_000;
  const plan = planShards(tests, timing);
  assert.equal(plan.shards[0].milliseconds, 2_000_000);
  assert.equal(plan.shards[0].tasks.length, 1);
  assert.equal(plan.shards[0].tasks[0].suite, 'gates');
});

test('missing specs, duplicate tests, foreign projects and corrupt timing fail closed', () => {
  const tests = census();
  for (const bad of [
    [],
    tests.slice(2),
    [...tests, tests[0]],
    [{ ...tests[0], project: 'firefox' }, ...tests.slice(1)],
  ])
    assert.throws(() => planShards(bad, seed(tests)));
  for (const milliseconds of [{}, { bad: -1 }, { bad: NaN }])
    assert.throws(() => planShards(tests, { version: 1, milliseconds }));
});

test('a missing, extra or duplicated selected test cannot pass the census check', () => {
  const tests = census();
  assert.throws(() => assertSameTests(tests, tests.slice(1)));
  assert.throws(() => assertSameTests(tests, [...tests, tests[0]]));
  assertSameTests(tests, [...tests].reverse());
});

function report(duration, retry = 0, status = 'passed') {
  return {
    suites: [
      {
        title: 'active-session-recovery.spec.ts',
        specs: [],
        suites: [
          {
            title: 'group',
            specs: [
              {
                title: 'case',
                file: 'active-session-recovery.spec.ts',
                tests: [
                  {
                    projectName: 'chromium',
                    expectedStatus: 'passed',
                    results: [{ duration, retry, status }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    errors: [],
  };
}

test('recorded durations use first-attempt passes and median observations', () => {
  const timing = recordDurations(
    [report(100), report(300), report(900, 1), report(800, 0, 'failed')],
    ['123'],
  );
  assert.deepEqual(Object.values(timing.milliseconds), [200]);
  assert.deepEqual(timing.sourceRunIds, ['123']);
  assert.equal(
    collectTests(report(1))[0].key,
    '[chromium] › active-session-recovery.spec.ts › group › case',
  );
  assert.throws(() => recordDurations([report(0, 0, 'skipped')], ['123']));
});

test('malformed or ambiguous reporter identities never silently change selection', () => {
  assert.throws(() =>
    collectTests({ errors: [{ message: 'load error' }], suites: [] }),
  );
  const duplicated = report(1);
  duplicated.suites.push(duplicated.suites[0]);
  assert.throws(() => collectTests(duplicated));
  assert.throws(() =>
    testDescription({
      file: 'x.spec.ts',
      project: 'chromium',
      titles: ['bad\ncase'],
    }),
  );
});

test('retry and trace contracts are unchanged', () => {
  assert.deepEqual(CI_SUITES.find(({ name }) => name === 'gates').options, [
    '--retries=0',
    '--trace=retain-on-failure',
  ]);
  assert.deepEqual(
    CI_SUITES.find(({ name }) => name === 'library').options,
    [],
  );
  assert.deepEqual(CI_SUITES.find(({ name }) => name === 'smoke').options, []);
});

test('the workflow command cannot drop a spec, shard, retry contract or worker limit', () => {
  for (const suite of CI_SUITES) {
    const args = [
      'test',
      ...suite.files.map((f) => `e2e/${f}`),
      '--project=chromium',
      ...suite.options,
      `--workers=${suite.workers}`,
      '--shard=2/2',
      `--output=test-results/${suite.name}`,
    ];
    assert.equal(parseInvocation(args).shardIndex, 2);
    assert.equal(parseInvocation(args).shardCount, 2);
    assert.equal(parseInvocation(args).suite.name, suite.name);
    assert.throws(() =>
      parseInvocation(args.filter((arg) => !arg.startsWith('e2e/'))),
    );
    assert.throws(() =>
      parseInvocation(
        args.map((arg) => (arg === '--shard=2/2' ? '--shard=1/1' : arg)),
      ),
    );
    assert.throws(() => parseInvocation([...args, '--retries=10']));
    assert.throws(() => parseInvocation([...args, '--grep=one-test']));
  }
});

test('PR invocations name their shard count explicitly, from 2 to 6', () => {
  const gates = CI_SUITES.find(({ name }) => name === 'gates');
  const args = (shard) => [
    'test',
    ...gates.files.map((f) => `e2e/${f}`),
    '--project=chromium',
    ...gates.options,
    `--workers=${gates.workers}`,
    shard,
    '--output=test-results/gates',
  ];
  const parsed = parseInvocation(args('--shard=3/4'));
  assert.equal(parsed.suite.name, 'gates');
  assert.equal(parsed.shardIndex, 3);
  assert.equal(parsed.shardCount, 4);
  assert.equal(parseInvocation(args('--shard=6/6')).shardCount, 6);
  for (const bad of [
    '--shard=1',
    '--shard=5/4',
    '--shard=0/4',
    '--shard=1/1',
    '--shard=1/7',
    '--shard=01/4',
    '--shard=1/4x',
  ])
    assert.throws(() => parseInvocation(args(bad)), undefined, bad);
});

// The committed duration seed is the PR census the planner balances; a PR
// suite file the seed has not recorded yet joins at the fallback weight.
function seededPrCensus() {
  const timing = JSON.parse(
    fs.readFileSync(
      new URL('../../config/playwright/ci-durations.json', import.meta.url),
      'utf8',
    ),
  );
  const files = new Set(CI_SUITES.flatMap((suite) => suite.files));
  const tests = Object.keys(timing.milliseconds)
    .map((key) => {
      const [project, file, ...titles] = key.split(' › ');
      const row = { file, titles, project: project.slice(1, -1) };
      return { ...row, key: testDescription(row) };
    })
    .filter(({ file }) => files.has(file));
  for (const file of files)
    if (!tests.some((row) => row.file === file)) tests.push(...rows([file], 1));
  return { tests, timing };
}

test('four PR shards partition the census, keep files whole and balance', () => {
  for (const { tests, timing } of [
    seededPrCensus(),
    { tests: census(), timing: seed(census()) },
  ]) {
    const plan = planShards(tests, timing, 4);
    assert.equal(plan.shards.length, 4);
    assertShardsCoverCensus(shardTestLists(plan), tests);
    for (const list of shardTestLists(plan)) assertShardNotEmpty(list, 'pr');
    for (const file of CI_SUITES.filter(
      ({ split }) => split !== 'test',
    ).flatMap(({ files }) => files))
      assert.equal(
        shardTestLists(plan).filter((list) => list.some((t) => t.file === file))
          .length,
        1,
        file,
      );
    const ms = plan.shards.map(({ milliseconds }) => milliseconds);
    const mean = ms.reduce((a, b) => a + b) / ms.length;
    assert.ok(Math.max(...ms) <= 1.25 * mean, JSON.stringify(ms));
  }
});

// ---- Suite sets: one planner for the PR suites and the Nightly suite ----

function rows(files, count = 2) {
  return files.flatMap((file) =>
    Array.from({ length: count }, (_, i) => {
      const row = { file, titles: ['group', `case ${i}`], project: 'chromium' };
      return { ...row, key: testDescription(row) };
    }),
  );
}

test('suite fields pin library per-test splitting and data per-file weights', () => {
  const library = CI_SUITES.find(({ name }) => name === 'library');
  assert.equal(library.split, 'test');
  const data = suitesForDataSpecs(['e2e/zz-data.spec.ts']).find(
    ({ name }) => name === 'data',
  );
  assert.equal(data.fileWeights, true);
  for (const suite of CI_SUITES.filter(({ name }) => name !== 'library'))
    assert.equal(suite.split ?? 'file', 'file', suite.name);

  // Behaviour, not just the fields: two equally heavy library tests land on
  // different shards, and a data file weighs its measured file duration.
  const tests = [...census(), ...rows(['zz-data.spec.ts'])];
  const timing = seed(tests);
  for (const row of tests) {
    timing.milliseconds[row.key] =
      row.file === library.files[0] ? 1_000_000 : 1;
  }
  timing.fileMilliseconds = { 'zz-data.spec.ts': 60_000 };
  const plan = planShards(tests, timing, 2, ['e2e/zz-data.spec.ts']);
  const libraryShards = plan.shards.filter(({ tasks }) =>
    tasks.some(({ suite }) => suite === 'library'),
  );
  assert.equal(libraryShards.length, 2);
  const dataTask = plan.shards
    .flatMap(({ tasks }) => tasks)
    .find(({ suite }) => suite === 'data');
  assert.equal(dataTask.milliseconds, 60_000);
});

test('PR invocations keep their exact Playwright argv and planner input', () => {
  const suites = suitesForDataSpecs(['e2e/zz-data.spec.ts']);
  // The expressions run-ci-e2e.mjs used inline before the suite-set planner.
  const legacyCensus = suites.flatMap(({ files }) =>
    files.map((f) => `e2e/${f}`),
  );
  const legacyTask = (suite, list) => [
    ...suite.files.map((f) => `e2e/${f}`),
    `--test-list=${list}`,
    '--project=chromium',
    `--workers=${suite.workers}`,
    ...suite.options,
    `--output=test-results/${suite.name}`,
  ];
  assert.deepEqual(prCensusArgs(suites), legacyCensus);
  for (const suite of suites)
    assert.deepEqual(
      prTaskArgs(suite, 'x/y.txt'),
      legacyTask(suite, 'x/y.txt'),
    );
  assert.deepEqual(
    prTaskArgs(
      suites.find(({ name }) => name === 'library'),
      'l.txt',
    ),
    [
      'e2e/customizer-library-open.spec.ts',
      '--test-list=l.txt',
      '--project=chromium',
      '--workers=1',
      '--output=test-results/library',
    ],
  );
  assert.deepEqual(
    prTaskArgs(
      suites.find(({ name }) => name === 'data'),
      'd.txt',
    ),
    [
      'e2e/zz-data.spec.ts',
      '--test-list=d.txt',
      '--project=chromium',
      '--workers=1',
      '--output=test-results/data',
    ],
  );

  // The thin wrapper hands the planner the same suites it always built.
  const tests = [
    ...census(),
    ...rows(['zz-data-a.spec.ts', 'zz-data-b.spec.ts'], 3),
  ];
  const timing = {
    ...seed(tests),
    fileMilliseconds: { 'zz-data-a.spec.ts': 90_000 },
  };
  const data = ['e2e/zz-data-a.spec.ts', 'e2e/zz-data-b.spec.ts'];
  const plans = [];
  for (const count of [2, 3, 4]) {
    for (const specs of [[], data]) {
      const subset = specs.length ? tests : census();
      const wrapped = planShards(subset, timing, count, specs);
      assert.deepEqual(
        wrapped,
        planSuiteShards(subset, timing, count, suitesForDataSpecs(specs)),
      );
      plans.push(wrapped);
    }
  }
  // Pinned from the planner as it stood on origin/main before this refactor.
  assert.equal(
    crypto.createHash('sha256').update(JSON.stringify(plans)).digest('hex'),
    '14e9b2fe892e94edd9bc7882a9d027623a2a838d867c5fc467772a51134c6cbe',
  );
});

test('the Nightly suite lists each census file once, sorted, on one worker', () => {
  const tests = rows(['b.spec.ts', 'a.spec.ts', 'nested/c.spec.ts']);
  assert.deepEqual(nightlySuites([...tests, ...tests.slice(0, 1)]), [
    {
      name: 'nightly',
      workers: 1,
      options: [],
      split: 'file',
      files: ['a.spec.ts', 'b.spec.ts', 'nested/c.spec.ts'],
    },
  ]);
  assert.deepEqual(nightlyCensusArgs(), [
    '--ignore-snapshots',
    '--grep-invert',
    '@E2E-19|@E2E-25',
  ]);
  assert.equal(NIGHTLY_GREP_INVERT, '@E2E-19|@E2E-25');
  assert.deepEqual(nightlyTaskArgs(nightlySuites(tests)[0], 'n.txt'), [
    '--test-list=n.txt',
    '--project=chromium',
    '--workers=1',
    '--ignore-snapshots',
    '--grep-invert',
    '@E2E-19|@E2E-25',
    '--output=test-results/nightly',
  ]);
});

test('Nightly invocations are exactly --suite-set nightly --shard=<i>/<n>', () => {
  const parse = (...argv) => parseNightlyInvocation(argv);
  assert.deepEqual(parse('--suite-set', 'nightly', '--shard=2/3'), {
    suite: { name: 'nightly' },
    shardIndex: 2,
    shardCount: 3,
  });
  assert.equal(parse('--suite-set', 'nightly', '--shard=7/9').shardCount, 9);
  for (const bad of [
    ['--suite-set', 'nightly'],
    // The shard count is always explicit, so a workflow typo cannot change it.
    ['--suite-set', 'nightly', '--shard=1'],
    ['--suite-set', 'pr', '--shard=1/3'],
    ['--suite-set', 'nightly', '--shard=0/3'],
    ['--suite-set', 'nightly', '--shard=4/3'],
    ['--suite-set', 'nightly', '--shard=1/0'],
    ['--suite-set', 'nightly', '--shard=1/3', '--retries=3'],
    ['--shard=1/3', '--suite-set', 'nightly'],
  ])
    assert.throws(() => parse(...bad), undefined, bad.join(' '));
  // The PR parser stays PR-only.
  assert.throws(() =>
    parseInvocation(['--suite-set', 'nightly', '--shard=1/2']),
  );
  assert.equal(NIGHTLY_DURATIONS, 'config/playwright/nightly-durations.json');
});

function nightlyFixture(shardCount, files) {
  const tests = rows(files, 3);
  const suites = nightlySuites(tests);
  const timing = seed(tests);
  return {
    tests,
    suites,
    plan: planSuiteShards(tests, timing, shardCount, suites),
  };
}
const nightlyFiles = Array.from({ length: 8 }, (_, i) => `n${i}.spec.ts`);

test('Nightly shards partition the census deterministically and keep files whole', () => {
  const { tests, suites, plan } = nightlyFixture(3, nightlyFiles);
  assert.equal(plan.shards.length, 3);
  assert.deepEqual(
    plan,
    planSuiteShards([...tests].reverse(), seed(tests), 3, suites),
  );
  assertShardsCoverCensus(shardTestLists(plan), tests);
  for (const file of nightlyFiles)
    assert.equal(
      shardTestLists(plan).filter((list) => list.some((t) => t.file === file))
        .length,
      1,
      file,
    );
  for (const list of shardTestLists(plan)) assertShardNotEmpty(list, 'ok');
});

test('a missing or duplicated planned test fails the union check; a zero-test shard fails', () => {
  const { tests, plan } = nightlyFixture(3, nightlyFiles);
  const lists = shardTestLists(plan);
  assert.throws(
    () =>
      assertShardsCoverCensus(
        lists.map((list, i) => (i === 0 ? list.slice(1) : list)),
        tests,
      ),
    /differs/,
  );
  assert.throws(
    () =>
      assertShardsCoverCensus(
        lists.map((list, i) => (i === 2 ? [...list, lists[0][0]] : list)),
        tests,
      ),
    /planned twice/,
  );
  assert.throws(
    () => assertShardsCoverCensus(lists, tests.slice(1)),
    /differs/,
  );
  // More shards than spec files leaves a shard with nothing to run.
  const small = nightlyFixture(3, ['a.spec.ts', 'b.spec.ts']);
  const empty = shardTestLists(small.plan);
  assertShardsCoverCensus(empty, small.tests);
  assert.throws(
    () => empty.forEach((list, i) => assertShardNotEmpty(list, `${i + 1}/3`)),
    /shard 3\/3 has zero tests/,
  );
});

function nightlyReport(file, duration, retry = 0, status = 'passed') {
  return {
    suites: [
      {
        title: file,
        specs: [
          {
            title: 'case',
            file,
            tests: [
              {
                projectName: 'chromium',
                expectedStatus: 'passed',
                results: [{ duration, retry, status }],
              },
            ],
          },
        ],
        suites: [],
      },
    ],
    errors: [],
  };
}

test('Nightly durations come from recordDurations over the Nightly suite set', () => {
  const reports = [
    nightlyReport('a.spec.ts', 100),
    nightlyReport('nested/b.spec.ts', 300),
    nightlyReport('a.spec.ts', 300),
    nightlyReport('a.spec.ts', 900, 1),
  ];
  const timing = recordDurations(
    reports,
    ['7', '8'],
    nightlySuites(reports.flatMap(collectTests)),
  );
  assert.deepEqual(timing, {
    version: 1,
    sourceRunIds: ['7', '8'],
    milliseconds: {
      '[chromium] › a.spec.ts › case': 200,
      '[chromium] › nested/b.spec.ts › case': 300,
    },
  });
  // The PR suite set still rejects a spec outside it.
  assert.throws(() => recordDurations(reports, ['7']), /Unexpected PR test/);
  // A seed recorded this way plans without unknown tests.
  const tests = reports.slice(0, 2).flatMap(collectTests);
  const plan = planSuiteShards(tests, timing, 2, nightlySuites(tests));
  assert.equal(plan.unknown, 0);
});

test('only the recorder writes nightly-durations.json', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-nightly-durations-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'report.json');
  fs.writeFileSync(file, JSON.stringify(nightlyReport('a.spec.ts', 250)));
  const recorder = fileURLToPath(
    new URL('./record-ci-e2e-durations.mjs', import.meta.url),
  );
  const stdout = execFileSync(
    process.execPath,
    [recorder, '--suite-set', 'nightly', '42', file],
    { cwd: dir, encoding: 'utf8' },
  );
  // The recorder prints the seed for the operator to review; it writes nothing.
  assert.deepEqual(JSON.parse(stdout), {
    version: 1,
    sourceRunIds: ['42'],
    milliseconds: { '[chromium] › a.spec.ts › case': 250 },
  });
  assert.deepEqual(fs.readdirSync(dir), ['report.json']);
  // No other planner script writes that path.
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const name of fs.readdirSync(here)) {
    if (!name.endsWith('.mjs') || name.endsWith('.test.mjs')) continue;
    const source = fs.readFileSync(path.join(here, name), 'utf8');
    for (const part of source.split(/write\w*\(/).slice(1))
      assert.doesNotMatch(
        part.slice(0, 160),
        /NIGHTLY_DURATIONS|nightly-durations/,
        name,
      );
  }
});
