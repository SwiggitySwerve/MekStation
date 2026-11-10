import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CI_SUITES,
  assertSameTests,
  collectTests,
  planShards,
  parseInvocation,
  recordDurations,
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
  for (const { key } of slow) timing.milliseconds[key] = 100_000;
  const plan = planShards(tests, timing);
  assert.equal(plan.shards[0].milliseconds, 200_000);
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
