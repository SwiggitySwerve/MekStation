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
} from './budget-config.mjs';

const config = loadBudgets();
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
      c.profiles = [];
    },
  ]) {
    const next = structuredClone(config);
    mutate(next);
    assert.throws(() => validateBudgets(next));
  }
});

test('canonical raises cover every cap/dependency/timeout and profile removal', () => {
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
});

test('ratchets lower canonical IDs and cannot add/raise/duplicate silently', () => {
  const result = ratchetBudgets(config, [
    { id: 'limits.repoWideKeys', value: 79 },
  ]);
  assert.equal(result.limits.repoWideKeys, 79);
  assert.equal(config.limits.repoWideKeys, 80);
  for (const proposals of [
    null,
    [{ id: 'unknown', value: 1 }],
    [{ id: 'limits.unkeyableTests', value: 56 }],
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
