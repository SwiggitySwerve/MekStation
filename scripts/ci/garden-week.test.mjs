import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderGarden } from './garden-render.mjs';
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
  selectMainObservations: (samples) => ({
    included: samples.filter((s) => s.complete),
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

test('oversized garden output is clipped for publication without failing measurement', () => {
  const report = buildGarden(input());
  report.rejected = ['large diagnostic '.repeat(6000)];
  const markdown = renderGarden(report);
  assert.ok(markdown.length < 60000);
  assert.match(markdown, /Full evidence remains/);
  assert.equal(report.rejected[0].length, 102000);
});

test('seven complete UTC days with three distinct runs each authorize a lowering with retained headroom', () => {
  const report = buildGarden(input());
  assert.deepEqual(report.proposals, [{ id: 'limits.example', value: 59 }]);
  assert.equal(report.observations, 21);
  assert.equal(report.ratchet[0].days.length, 7);
  assert.equal(report.metrics.jobMinutes.median, 2);
  assert.equal(report.cache.hitRate, 0.5);
  assert.equal(report.budgetMedians['limits.example'], 50);
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
    if (mode === 'duplicate') {
      args.envelopes.push(structuredClone(args.envelopes[0]));
      args.api = {
        ...api,
        selectMainObservations: (samples) => ({
          included: samples.slice(0, 21),
          excluded: [
            { identity: samples.at(-1).identity, reason: 'duplicate attempt' },
          ],
        }),
      };
    }
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
    selectMainObservations: () => ({
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
  assert.equal(report.budgetMedians['limits.example'], null);
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
        baselineP75Ms: 50,
        baselineSamples: 5,
        growthRatio: (durationMs - 50) / 50,
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

test('fractional advisory caps stay visible without automatic timing ratchets', () => {
  const args = input();
  args.descriptors = [
    { id: 'reporting.jobMinutes', value: 60.125, ratchet: false },
  ];
  const report = buildGarden(args);
  assert.deepEqual(report.proposals, []);
  assert.match(report.ratchet[0].reason, /Automatic timing ratchet disabled/);
  assert.doesNotMatch(report.ratchet[0].reason, /timeout/);
});

test('upward main timing within budget is an investigation, not a causal regression claim', () => {
  const args = input();
  const prior = [1, 2, 3].map((run) => sample(0, run));
  for (const envelope of args.envelopes)
    envelope.observation.jobs = [
      { name: 'Simulation Checks and Linux Pack', durationMs: 634000 },
    ];
  for (const envelope of prior)
    envelope.observation.jobs = [
      { name: 'Simulation Checks and Linux Pack', durationMs: 403000 },
    ];
  args.envelopes.push(...prior);
  args.timingLimits = {
    jobsMs: { 'Simulation Checks and Linux Pack': 840000 },
  };
  const report = buildGarden(args);
  assert.equal(report.investigations.length, 1);
  assert.equal(report.investigations[0].withinBudget, true);
  assert.equal(report.investigations[0].status, 'investigate');
  const markdown = renderGarden(report);
  assert.match(markdown, /634 \| 403 \| 840 \| within budget/);
  assert.match(markdown, /do not establish regression or cause/);
  for (const envelope of args.envelopes)
    envelope.observation.jobs[0].durationMs = 403000;
  assert.deepEqual(buildGarden(args).investigations, []);
});
