import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { renderRuntimeSummary } from './parity-runtime-summary.mjs';

const report = () => ({
  measure: 'reopen',
  runSha: 'b'.repeat(40),
  exitCode: 1,
  population: { overlap: 4263 },
  regressions: [
    {
      unit: 'mek/Atlas',
      fact: 'reopenLoad',
      source: 'baseline',
      why: 'true -> false',
    },
  ],
  failClosed: [],
  unprotectedGains: [{ unit: 'mek/Locust', fact: 'reopenJava' }],
  unbaselined: ['mek/New'],
  removed: [],
  lastGreen: { status: 'applied', detail: 'tightened' },
});
const summary = () => ({
  reopenLoad: { equal: 42 },
  noLossConfirmation: { before: 30, after: 99 },
  ignored: { secret: 7 },
  gates: {
    'reopenLoad.equal': { gated: true, direction: 'higher-is-better' },
    'noLossConfirmation.before': { gated: true, direction: 'lower-is-better' },
    'noLossConfirmation.after': { gated: false },
    'ignored.secret': { gated: false, direction: 'unknown' },
    'missing.ignored': { gated: false },
  },
  headline: 'do not copy noLossConfirmation.after or ignored.secret',
});

test('summary names unit/fact regressions, gains, populations and informational SHA range', () => {
  const text = renderRuntimeSummary(report(), summary(), {
    sha: 'a'.repeat(40),
  });
  for (const value of [
    '4263 gated units',
    '1 unbaselined',
    'mek/Atlas',
    'reopenLoad',
    'mek/Locust',
    'reopenJava',
    '0 removed',
    `\`${'a'.repeat(40)}\` → \`${'b'.repeat(40)}\``,
    'informational only',
    'reopenLoad.equal',
    '42',
    'noLossConfirmation.before',
    '30',
  ])
    assert.ok(text.includes(value), value);
  assert.doesNotMatch(text, /\.after|ignored\.secret|missing\.ignored/);
});

test('summary reports every fail-closed reason and removed id, and why last green is absent/stale', () => {
  const gate = report();
  gate.failClosed = [
    { reason: 'POPULATION_UNIT_REMOVED', message: 'missing unit' },
    { reason: 'FACTS_DERIVER_CHANGED', message: 'changed' },
  ];
  gate.removed = ['mek/Removed'];
  gate.lastGreen = { status: 'missing', detail: 'missing' };
  const text = renderRuntimeSummary(gate, summary(), {
    status: 'none',
    reason: 'within retention (30 days)',
    sha: null,
  });
  for (const value of [
    'POPULATION_UNIT_REMOVED',
    'FACTS_DERIVER_CHANGED',
    'mek/Removed',
    'last green: none within retention (30 days)',
    'Previous-nightly range (informational only): none within retention (30 days)',
  ])
    assert.ok(text.includes(value), value);
  // A failed lookup (API error, rate limit, download or identity mismatch) is
  // reported as failed, never as "none".
  const failed = renderRuntimeSummary(gate, summary(), {
    status: 'failed',
    reason: 'API rate limit exceeded',
    sha: null,
  });
  assert.ok(
    failed.includes('last green: lookup failed (API rate limit exceeded)'),
  );
  assert.doesNotMatch(failed, /last green: none/);
  // No retrieval record at all (the lookup step died before writing it).
  assert.match(
    renderRuntimeSummary(gate, summary(), { reason: 'retrieval unavailable' }),
    /last green: lookup failed \(retrieval unavailable\)/,
  );
  gate.lastGreen = { status: 'stale', detail: 'different baseline' };
  assert.match(
    renderRuntimeSummary(gate, summary(), { sha: 'a'.repeat(40) }),
    /last green: none \(different baseline\)/,
  );
  gate.lastGreen = {
    status: 'malformed',
    detail: 'malformed: units.mek/Atlas.bvDistance',
  };
  assert.match(
    renderRuntimeSummary(gate, summary(), {
      sha: 'a'.repeat(40),
      reason: 'retrieval unavailable',
    }),
    /last green: none \(malformed: units.mek\/Atlas.bvDistance\)/,
  );
});

test('summary rejects unknown/missing directions and unresolved/non-numeric gated paths', () => {
  for (const direction of [undefined, 'up']) {
    const data = summary();
    data.gates['reopenLoad.equal'].direction = direction;
    assert.throws(() => renderRuntimeSummary(report(), data), /direction/);
  }
  for (const value of [undefined, null, '42', NaN]) {
    const data = summary();
    data.reopenLoad.equal = value;
    assert.throws(() => renderRuntimeSummary(report(), data), /number|numeric/);
  }
  const data = summary();
  data.gates['missing.path'] = { gated: true, direction: 'higher-is-better' };
  assert.throws(() => renderRuntimeSummary(report(), data), /missing.path/);
});

test('regression list is capped at 50 with the full count', () => {
  const gate = report();
  gate.regressions = Array.from({ length: 53 }, (_, i) => ({
    unit: `mek/unit-${i}`,
    fact: 'validity',
    why: 'worse',
    source: 'baseline',
  }));
  const text = renderRuntimeSummary(gate, summary());
  assert.match(text, /53 regression/);
  assert.match(text, /mek\/unit-49/);
  assert.doesNotMatch(text, /mek\/unit-50/);
  assert.match(text, /3 more/);
});

test('early gate errors retain their fail-closed reason without inventing population counts', () => {
  const gate = {
    schemaVersion: 1,
    measure: 'load',
    exitCode: 2,
    regressions: [],
    failClosed: [
      { reason: 'FACTS_MALFORMED', message: 'facts are unreadable' },
    ],
    headline: 'FAIL CLOSED: FACTS_MALFORMED',
  };
  const text = renderRuntimeSummary(gate, summary(), {
    reason: 'no main nightly yet',
  });
  assert.match(text, /FACTS_MALFORMED/);
  assert.match(text, /facts are unreadable/);
  assert.match(text, /unknown gated units/);
  assert.match(text, /Gate exit: 2/);
});

test('CLI appends summary on gate failure and exits nonzero on wiring errors', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-summary-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'gate'));
  fs.writeFileSync(
    path.join(root, 'gate/gate-report.json'),
    JSON.stringify(report()),
  );
  fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(summary()));
  const dest = path.join(root, 'step-summary.md');
  fs.writeFileSync(dest, 'prior step\n');
  const run = () =>
    spawnSync(
      process.execPath,
      ['scripts/ci/parity-runtime-summary.mjs', '--run-dir', root],
      { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: dest } },
    );
  assert.equal(run().status, 0);
  assert.match(fs.readFileSync(dest, 'utf8'), /^prior step\n[\s\S]*mek\/Atlas/);
  const bad = summary();
  bad.gates['reopenLoad.equal'].direction = 'unknown';
  fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(bad));
  assert.equal(run().status, 1);
});
