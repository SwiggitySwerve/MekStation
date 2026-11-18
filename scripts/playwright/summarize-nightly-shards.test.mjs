import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { censusHash, collectTests } from './ci-e2e-plan.mjs';
import { main } from './summarize-nightly-shards.mjs';

const FILES = ['a.spec.ts', 'b.spec.ts', 'c.spec.ts'];

/** Playwright JSON-reporter shape: per test [file, case, ...attempt statuses]. */
function report(rows) {
  return {
    suites: FILES.filter((file) => rows.some((row) => row[0] === file)).map(
      (file) => ({
        title: file,
        file,
        specs: [],
        suites: [
          {
            title: 'group',
            specs: rows
              .filter((row) => row[0] === file)
              .map(([, title, ...statuses]) => ({
                title,
                file,
                tests: [
                  {
                    projectName: 'chromium',
                    expectedStatus: 'passed',
                    results: statuses.map((status, retry) => ({
                      status,
                      retry,
                      duration: 1000,
                    })),
                  },
                ],
              })),
            suites: [],
          },
        ],
      }),
    ),
    errors: [],
  };
}

const CENSUS = FILES.flatMap((file) => [
  [file, 'case 1'],
  [file, 'case 2'],
]);
const HASH = censusHash(collectTests(report(CENSUS)));

/**
 * Shard i executes FILES[i-1] unless `shards` overrides its rows; `hashes`
 * overrides a shard's planned census hash; a null shard uploads nothing.
 */
function run(t, { result = 'success', shards = {}, hashes = {}, census } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-nightly-summary-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (let shard = 1; shard <= 3; shard++) {
    const rows =
      shard in shards
        ? shards[shard]
        : CENSUS.filter(([file]) => file === FILES[shard - 1]).map((row) => [
            ...row,
            'passed',
          ]);
    if (rows === null) continue;
    const folder = path.join(dir, `nightly-e2e-timings-${shard}`);
    fs.mkdirSync(folder);
    fs.writeFileSync(
      path.join(folder, 'nightly.json'),
      JSON.stringify(report(rows)),
    );
    fs.writeFileSync(
      path.join(folder, 'plan-nightly.json'),
      JSON.stringify({ censusHash: hashes[shard] ?? HASH }),
    );
  }
  const out = [];
  const err = [];
  const code = main(['3', dir], {
    env: { NIGHTLY_SHARD_RESULT: result },
    listCensus: census ?? (() => report(CENSUS)),
    log: (line) => out.push(line),
    error: (line) => err.push(line),
  });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

test('an exact union of successful shards passes', (t) => {
  const { code, out, err } = run(t);
  assert.equal(code, 0, err);
  assert.match(out, /union check: shard executions equal the census exactly/);
  assert.match(out, /first-attempt results: 6; retry-only passes: 0/);
  assert.equal(err, '');
});

for (const result of ['cancelled', 'skipped', 'failure', '']) {
  test(`a ${result || 'missing'} shard matrix result fails even with an exact union`, (t) => {
    const { code, out, err } = run(t, { result });
    assert.equal(code, 1);
    assert.match(out, /union check: shard executions equal the census exactly/);
    assert.match(
      err,
      new RegExp(`shard matrix result is ${result || 'missing'}`),
    );
  });
}

test('a dropped test fails the union check', (t) => {
  const { code, err } = run(t, {
    shards: { 2: [['b.spec.ts', 'case 1', 'passed']] },
  });
  assert.equal(code, 1);
  assert.match(err, /union check: Executed E2E census differs/);
});

test('a test executed by two shards fails the union check', (t) => {
  const { code, err } = run(t, {
    shards: {
      3: [
        ['c.spec.ts', 'case 1', 'passed'],
        ['c.spec.ts', 'case 2', 'passed'],
        ['a.spec.ts', 'case 1', 'passed'],
      ],
    },
  });
  assert.equal(code, 1);
  assert.match(
    err,
    /union check: E2E test planned twice: .*a\.spec\.ts › group › case 1/,
  );
});

test('a shard that uploaded nothing fails', (t) => {
  const { code, err } = run(t, { shards: { 3: null } });
  assert.equal(code, 1);
  assert.match(err, /shard 3: no plan uploaded/);
  assert.match(err, /shard 3: no executed-test report/);
  assert.match(err, /union check: incomplete/);
});

test('a shard that planned a different census fails', (t) => {
  const { code, out, err } = run(t, { hashes: { 2: 'f'.repeat(64) } });
  assert.equal(code, 1);
  assert.match(out, /union check: shard executions equal the census exactly/);
  assert.match(err, /shard 2: planned a different census/);
});

test('a retry-only pass is named as an observation and does not fail', (t) => {
  const { code, out, err } = run(t, {
    shards: {
      1: [
        ['a.spec.ts', 'case 1', 'failed', 'passed'],
        ['a.spec.ts', 'case 2', 'passed'],
      ],
    },
  });
  assert.equal(code, 0, err);
  assert.match(out, /first-attempt results: 5; retry-only passes: 1/);
  assert.match(
    out,
    /::warning::OBSERVATION retry-only pass \(2 attempts\): \[chromium\] › a\.spec\.ts › group › case 1/,
  );
});

test('a test failing every attempt fails', (t) => {
  const { code, err } = run(t, {
    shards: {
      1: [
        ['a.spec.ts', 'case 1', 'failed', 'failed', 'failed'],
        ['a.spec.ts', 'case 2', 'passed'],
      ],
    },
  });
  assert.equal(code, 1);
  assert.match(err, /1 tests failed every attempt/);
});

test('a census that cannot be listed still prints the errors collected before it', (t) => {
  const { code, err } = run(t, {
    result: 'cancelled',
    census: () => {
      throw new Error('Cannot collect E2E census: boom');
    },
  });
  assert.equal(code, 1);
  assert.match(
    err,
    /shard matrix result is cancelled[\s\S]*Cannot collect E2E census: boom/,
  );
});
