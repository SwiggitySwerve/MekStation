import { createHash } from 'node:crypto';
import fs from 'node:fs';

export const BUDGET_SCHEMA = 'mekstation/ci-budgets/v1';
export const METRICS_SCHEMA = 'mekstation/ci-budget-metrics/v1';
export const PACKAGE_METRICS_SCHEMA = 'mekstation/ci-package-metrics/v1';
export const LIMIT_UNITS = Object.freeze({
  typicalPrJobs: 'jobs',
  unkeyableTests: 'files',
  repoWideKeys: 'files',
  standaloneStaticBytes: 'bytes',
  installerBytes: 'bytes',
  webZipBytes: 'bytes',
});

export function exactKeys(value, keys, context) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('|') !== [...keys].sort().join('|')
  )
    throw new Error(`${context}: missing or unknown fields`);
}

function integer(value, context, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum)
    throw new Error(`${context}: expected integer >= ${minimum}`);
}

export function validateBudgets(config) {
  exactKeys(
    config,
    ['schema', 'limits', 'dependencies', 'profiles', 'timeouts'],
    'budget',
  );
  if (config.schema !== BUDGET_SCHEMA) throw new Error('Unknown budget schema');
  exactKeys(config.limits, Object.keys(LIMIT_UNITS), 'limits');
  for (const [id, value] of Object.entries(config.limits)) integer(value, id);
  exactKeys(config.dependencies, ['root', 'desktop'], 'dependencies');
  for (const [scope, values] of Object.entries(config.dependencies)) {
    exactKeys(values, ['lockEntries', 'directDependencies'], scope);
    for (const [id, value] of Object.entries(values))
      integer(value, `${scope}.${id}`);
  }
  if (!Array.isArray(config.profiles) || config.profiles.length < 3)
    throw new Error('Representative path profiles missing');
  const names = new Set();
  for (const profile of config.profiles) {
    exactKeys(profile, ['id', 'paths', 'typical', 'reason'], 'profile');
    if (
      typeof profile.id !== 'string' ||
      !profile.id ||
      names.has(profile.id) ||
      typeof profile.typical !== 'boolean' ||
      typeof profile.reason !== 'string' ||
      !profile.reason ||
      !Array.isArray(profile.paths) ||
      !profile.paths.length ||
      profile.paths.some(
        (p) =>
          typeof p !== 'string' || !p || p.startsWith('/') || p.includes('..'),
      )
    )
      throw new Error('Invalid representative profile');
    names.add(profile.id);
  }
  if (!config.profiles.some((p) => p.typical))
    throw new Error('No typical PR profiles');
  if (!config.timeouts || !Object.keys(config.timeouts).length)
    throw new Error('Timeout budgets missing');
  for (const [id, timeout] of Object.entries(config.timeouts)) {
    exactKeys(
      timeout,
      ['minutes', 'medianSeconds', 'samples'],
      `timeout ${id}`,
    );
    integer(timeout.minutes, id, 1);
    if (!Number.isFinite(timeout.medianSeconds) || timeout.medianSeconds <= 0)
      throw new Error(`${id}: measured median missing`);
    if (!Array.isArray(timeout.samples) || !timeout.samples.length)
      throw new Error(`${id}: median samples missing`);
    for (const sample of timeout.samples) {
      exactKeys(sample, ['runId', 'job', 'seconds'], 'timeout sample');
      integer(sample.runId, 'runId', 1);
      integer(sample.seconds, 'seconds', 1);
      if (typeof sample.job !== 'string' || !sample.job)
        throw new Error('Sample job missing');
    }
    if (
      timeout.minutes !==
      Math.max(1, Math.ceil((2 * timeout.medianSeconds) / 60))
    )
      throw new Error(
        `${id}: timeout must be ceil(2 * recorded median / 60), minimum 1 minute`,
      );
  }
  return config;
}

export function loadBudgets(file = 'config/ci/budgets.json') {
  return validateBudgets(
    JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')),
  );
}

export function budgetConfigHash(file = 'config/ci/budgets.json') {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function budgetDescriptors(config) {
  return Object.entries(budgetValues(config)).map(([id, value]) => ({
    id,
    value,
    unit: id.startsWith('limits.')
      ? LIMIT_UNITS[id.slice(7)]
      : id.startsWith('timeouts.')
        ? 'minutes'
        : 'entries',
    ratchet: !id.startsWith('timeouts.'),
  }));
}

/** Canonical numeric IDs consumed by approval and ratchet adapters. */
export function budgetValues(config) {
  validateBudgets(config);
  return Object.fromEntries([
    ...Object.entries(config.limits).map(([id, value]) => [
      `limits.${id}`,
      value,
    ]),
    ...Object.entries(config.dependencies).flatMap(([scope, values]) =>
      Object.entries(values).map(([id, value]) => [
        `dependencies.${scope}.${id}`,
        value,
      ]),
    ),
    ...Object.entries(config.timeouts).map(([id, value]) => [
      `timeouts.${id}.minutes`,
      value.minutes,
    ]),
  ]);
}

/** Invalid additions/removals fail closed rather than disappearing from a delta. */
export function budgetRaises(base, head) {
  const before = budgetValues(base),
    after = budgetValues(head);
  const raises = [];
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!(id in after) || !(id in before) || after[id] > before[id])
      raises.push({ id, before: before[id] ?? null, after: after[id] ?? null });
  }
  // Dropping a typical profile is also a budget bypass requiring approval.
  for (const profile of base.profiles.filter((p) => p.typical)) {
    if (
      !head.profiles.some(
        (p) =>
          p.typical &&
          JSON.stringify(p.paths) === JSON.stringify(profile.paths),
      )
    )
      raises.push({ id: `profiles.${profile.id}`, before: 1, after: null });
  }
  return raises;
}

/** Lower only; timeout proposals carry their replacement measured samples. */
export function ratchetBudgets(config, proposals) {
  const values = budgetValues(config),
    next = structuredClone(config),
    seen = new Set();
  if (!Array.isArray(proposals)) throw new Error('Ratchet proposals missing');
  for (const proposal of proposals) {
    const timeout = proposal?.id?.startsWith('timeouts.');
    exactKeys(
      proposal,
      timeout ? ['id', 'value', 'medianSeconds', 'samples'] : ['id', 'value'],
      'ratchet',
    );
    const { id, value } = proposal;
    integer(value, id);
    if (!(id in values) || seen.has(id) || value > values[id])
      throw new Error(`Not a lowering: ${id}`);
    seen.add(id);
    const parts = id.split('.');
    let target = next;
    for (const part of parts.slice(0, -1)) target = target[part];
    target[parts.at(-1)] = value;
    if (timeout) {
      target.samples = proposal.samples;
      target.medianSeconds = proposal.medianSeconds;
    }
  }
  return validateBudgets(next);
}

export function serializeBudgets(config) {
  return `${JSON.stringify(validateBudgets(config), null, 2)}\n`;
}
