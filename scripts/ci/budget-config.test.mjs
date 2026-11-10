import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  loadBudgets,
  validateBudgets,
  budgetRaises,
  ratchetBudgets,
  budgetConfigHash,
  budgetDescriptors,
  budgetTargetGaps,
} from './budget-config.mjs';

const config = loadBudgets();
test('byte limits are absent and legacy base removal never creates a raise or ratchet', () => {
  const head = structuredClone(config);
  const legacy = structuredClone(config);
  for (const [id, value] of Object.entries({
    standaloneStaticBytes: 290_000_000,
    webZipBytes: 92_000_000,
    installerBytes: 170_000_000,
  })) {
    delete head.limits[id];
    legacy.limits[id] = value;
  }
  assert.equal(validateBudgets(head), head);
  assert.deepEqual(budgetRaises(legacy, head), []);
  assert.ok(budgetDescriptors(head).every((d) => d.unit !== 'bytes'));
  assert.throws(() => validateBudgets(legacy));
  assert.throws(() =>
    ratchetBudgets(head, [{ id: 'limits.installerBytes', value: 1 }]),
  );
  const relaxed = structuredClone(head);
  relaxed.limits.unkeyableTests++;
  assert.equal(budgetRaises(legacy, relaxed)[0].id, 'limits.unkeyableTests');
});

test('schema rejects missing/unknown inputs, nonintegers and timeout bypasses', () => {
  for (const mutate of [
    (c) => {
      delete c.limits.repoWideKeys;
    },
    (c) => {
      c.limits.secretExemption = 1;
    },
    (c) => {
      c.schema = 'v0';
    },
    (c) => {
      c.limits.typicalPrJobs = NaN;
    },
    (c) => {
      c.timeouts.e2e.minutes += 1;
    },
    (c) => {
      c.timeouts.e2e.samples = [];
    },
    (c) => {
      c.timeouts.e2e.medianSeconds += 1;
    },
    (c) => {
      c.profiles = [];
    },
  ]) {
    const next = structuredClone(config);
    mutate(next);
    assert.throws(() => validateBudgets(next));
  }
});

test('canonical raises cover every cap/dependency/timeout and profile removal', () => {
  assert.deepEqual(budgetRaises(null, config), []);
  assert.deepEqual(budgetRaises(null, null), []);
  assert.throws(() => budgetRaises(config, null));
  for (const key of Object.keys(config.limits)) {
    const next = structuredClone(config);
    next.limits[key]++;
    assert.equal(budgetRaises(config, next)[0].id, `limits.${key}`);
  }
  for (const scope of ['root', 'desktop']) {
    const next = structuredClone(config);
    next.dependencies[scope].lockEntries++;
    assert.equal(
      budgetRaises(config, next)[0].id,
      `dependencies.${scope}.lockEntries`,
    );
  }
  const next = structuredClone(config);
  next.timeouts.e2e.minutes++;
  next.timeouts.e2e.medianSeconds = next.timeouts.e2e.minutes * 30;
  next.timeouts.e2e.samples = [
    { runId: 1, job: 'E2E (1/2)', seconds: next.timeouts.e2e.medianSeconds },
  ];
  assert.equal(budgetRaises(config, next)[0].id, 'timeouts.e2e.minutes');
  const dropped = structuredClone(config);
  dropped.profiles[0].typical = false;
  assert.equal(
    budgetRaises(config, dropped)[0].id,
    `profiles.${config.profiles[0].id}`,
  );
  const unknown = structuredClone(config);
  delete unknown.limits.repoWideKeys;
  assert.throws(() => budgetRaises(config, unknown));
  const relaxed = structuredClone(config);
  relaxed.targets.unkeyableTests++;
  assert.equal(budgetRaises(config, relaxed)[0].id, 'targets.unkeyableTests');
});

test('targets report configured gaps with unavailable or fractional observations', () => {
  const unknown = budgetTargetGaps(config);
  assert.deepEqual(
    unknown.map((row) => row.configuredGap),
    [1, 2, 13],
  );
  assert.ok(
    unknown.every((row) => row.observed === null && row.gapToTarget === null),
  );
  const measured = budgetTargetGaps(config, { 'limits.unkeyableTests': 56.5 });
  assert.equal(
    measured.find((row) => row.id === 'limits.unkeyableTests').gapToTarget,
    1.5,
  );
  for (const value of [-1, NaN, Infinity, '57'])
    assert.throws(() =>
      budgetTargetGaps(config, { 'limits.unkeyableTests': value }),
    );
  assert.equal(
    budgetDescriptors(config).find((row) => row.id === 'limits.unkeyableTests')
      .value,
    57,
  );
});

test('ratchets lower canonical IDs and cannot add/raise/duplicate silently', () => {
  const result = ratchetBudgets(config, [
    { id: 'limits.repoWideKeys', value: 79 },
  ]);
  assert.equal(result.limits.repoWideKeys, 79);
  assert.equal(config.limits.repoWideKeys, 93);
  for (const proposals of [
    null,
    [{ id: 'unknown', value: 1 }],
    [{ id: 'limits.unkeyableTests', value: config.limits.unkeyableTests + 1 }],
    [
      { id: 'limits.repoWideKeys', value: 79 },
      { id: 'limits.repoWideKeys', value: 78 },
    ],
  ])
    assert.throws(() => ratchetBudgets(config, proposals));
  assert.ok(
    budgetDescriptors(config)
      .filter((d) => d.id.startsWith('timeouts.'))
      .every((d) => !d.ratchet),
  );
});

test('config digest hashes exact bytes, including newline changes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-hash-'));
  try {
    const file = path.join(dir, 'budget.json');
    fs.writeFileSync(file, '{}');
    const before = budgetConfigHash(file);
    fs.appendFileSync(file, '\n');
    assert.notEqual(budgetConfigHash(file), before);
    assert.throws(() => budgetConfigHash(path.join(dir, 'missing')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
