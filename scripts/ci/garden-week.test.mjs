import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildGarden, DAY_MS } from './garden-week.mjs';

const digest = 'd'.repeat(64);
const now = '2026-11-05T12:00:00Z';
const end = Date.parse('2026-11-05T00:00:00Z');

function sample(day, run, value = 50) {
  const identity = {
    repository: 'owner/repo',
    workflowId: 1,
    runId: day * 10 + run,
    attempt: 1,
    headSha: 'a'.repeat(40),
    event: 'push',
    branch: 'main',
    conclusion: 'success',
    createdAt: new Date(end - (8 - day) * DAY_MS + run * 1000).toISOString(),
  };
  return {
    schemaVersion: 1,
    observation: {
      identity,
      comparableKey: 'same-regime',
      complete: true,
      metrics: { jobMinutes: 2 },
      jobs: [],
    },
    budgetConfigHash: digest,
    budgetValues: { 'limits.example': value },
    tests: null,
    repositoryMetrics: null,
    cache: { availability: 'available', attempts: 2, hits: 1 },
    attribution: null,
  };
}

// G2 is an injected public boundary. These fixtures contain constant populations,
// so their known median is their sole distinct value; no alternate statistic is implemented.
const api = {
  validateObservation: (input) => {
    if (input.invalid) throw new Error('G2 rejected fixture');
    return input;
  },
  median: (values) => {
    assert.equal(new Set(values).size, 1);
    return values[0];
  },
  mainMedians: (samples) => ({
    included: samples.filter((s) => s.complete).map((s) => s.identity),
    excluded: [],
  }),
  compareTestFiles: () => ({ files: [], missing: [] }),
};
const population = () =>
  Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 3 }, (_, run) => sample(day + 1, run + 1)),
  ).flat();
const input = () => ({
  envelopes: population(),
  descriptors: [{ id: 'limits.example', value: 100, ratchet: true }],
  budgetConfigHash: digest,
  now,
  api,
});

test('seven complete UTC days with three distinct runs each authorize a lowering with retained headroom', () => {
  const report = buildGarden(input());
  assert.deepEqual(report.proposals, [{ id: 'limits.example', value: 59 }]);
  assert.equal(report.observations, 21);
  assert.equal(report.ratchet[0].days.length, 7);
  assert.equal(report.metrics.jobMinutes.median, 2);
  assert.equal(report.cache.hitRate, 0.5);
});

test('six days, two runs per day, missing values/hash, malformed telemetry and duplicate attempts cannot lower', () => {
  for (const mode of [
    'six-days',
    'two-runs',
    'value',
    'hash',
    'invalid',
    'diagnostic',
    'duplicate',
  ]) {
    const args = input();
    if (mode === 'six-days') args.envelopes = args.envelopes.slice(3);
    if (mode === 'two-runs')
      args.envelopes = args.envelopes.filter((_, index) => index % 3 !== 2);
    if (mode === 'value') args.envelopes[0].budgetValues = null;
    if (mode === 'hash') args.envelopes[0].budgetConfigHash = 'c'.repeat(64);
    if (mode === 'invalid') args.envelopes[0].invalid = true;
    if (mode === 'diagnostic') args.diagnostics = ['Artifact download failed'];
    if (mode === 'duplicate')
      args.envelopes.push(structuredClone(args.envelopes[0]));
    assert.deepEqual(buildGarden(args).proposals, [], mode);
  }
});

test('the strict 15% boundary and integer rounding never turn a near-limit observation into a lowering', () => {
  for (const value of [85, 99, 100, 110]) {
    const args = input();
    args.envelopes.forEach((e) => {
      e.budgetValues['limits.example'] = value;
    });
    assert.deepEqual(buildGarden(args).proposals, [], String(value));
  }
});

test('retries count once, the newest attempt wins, and today does not fill a missing full day', () => {
  const args = input();
  const extra = structuredClone(args.envelopes[0]);
  extra.observation.identity.attempt = 2;
  args.envelopes.push(extra);
  assert.equal(buildGarden(args).observations, 21);
  args.envelopes = args.envelopes.slice(3, 21);
  args.envelopes.push(...[1, 2, 3].map((run) => sample(8, run)));
  assert.deepEqual(buildGarden(args).proposals, []);
});

test('G2 exclusion controls comparability; no complete selected population means no proposal', () => {
  const args = input();
  args.api = {
    ...api,
    mainMedians: () => ({
      included: [],
      excluded: [{ reason: 'incompatible' }],
    }),
  };
  const report = buildGarden(args);
  assert.deepEqual(report.proposals, []);
  assert.equal(report.excluded[0].reason, 'incompatible');
});

test('absent telemetry remains unknown and timeout changes require measured replacement samples', () => {
  const args = input();
  args.envelopes = [];
  args.descriptors.push({
    id: 'timeouts.job.minutes',
    value: 5,
    ratchet: false,
  });
  const report = buildGarden(args);
  assert.deepEqual(report.proposals, []);
  assert.equal(report.cache.hitRate, null);
  assert.deepEqual(report.slowest, []);
  assert.match(report.ratchet.at(-1).reason, /replacement timeout samples/);
});

test('top ten durations and growth use G2 comparison, associations remain separate evidence', () => {
  const args = input();
  for (const envelope of args.envelopes) {
    envelope.tests = {
      comparableKey: 'same-regime/jest',
      complete: true,
      identity: envelope.observation.identity,
      files: Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [`file-${i}.test.ts`, 100 + i]),
      ),
    };
    envelope.attribution = {
      pullRequests: [
        { number: 7, url: 'https://github.com/owner/repo/pull/7' },
      ],
    };
  }
  args.api = {
    ...api,
    compareTestFiles: (current) => ({
      files: Object.entries(current.files).map(([file, durationMs]) => ({
        file,
        durationMs,
        baselineMs: 50,
        status: 'growth',
      })),
      missing: [],
    }),
  };
  const report = buildGarden(args);
  assert.equal(report.slowest.length, 10);
  assert.equal(report.slowest[0].file, 'file-11.test.ts');
  assert.equal(report.growth[0].growth, 1.22);
  assert.equal(report.associations.length, 1);
});
