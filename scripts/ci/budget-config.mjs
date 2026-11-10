import { createHash } from 'node:crypto';
import fs from 'node:fs';

import { median } from '../lib/statistics.mjs';

export const BUDGET_SCHEMA = 'mekstation/ci-budgets/v1';
export const METRICS_SCHEMA = 'mekstation/ci-budget-metrics/v1';
export const PACKAGE_METRICS_SCHEMA = 'mekstation/ci-package-metrics/v1';
export const WORKFLOW_INPUT_SCHEMA = 'mekstation/ci-producer-inputs/v1';
export const LIMIT_UNITS = Object.freeze({
  typicalPrJobs: 'jobs',
  unkeyableTests: 'files',
  repoWideKeys: 'files',
});
export const PACKAGE_METRIC_IDS = Object.freeze({
  web: ['standaloneStaticBytes', 'webZipBytes'],
  installers: ['installerBytes'],
});

/** Measurement validity only; package magnitude never controls acceptance. */
export function packageMetricValues(metrics) {
  if (metrics?.schema !== PACKAGE_METRICS_SCHEMA || metrics.unit !== 'bytes')
    throw new Error('Unknown package projection');
  const ids = PACKAGE_METRIC_IDS[metrics.kind ?? 'web'];
  if (!ids) throw new Error('Unknown package kind');
  return Object.fromEntries(
    ids.map((id) => {
      integer(metrics[id], `package ${id}`, 1);
      return [id, metrics[id]];
    }),
  );
}
export const REPORTING_UNITS = Object.freeze({
  jobMinutes: 'minutes',
  criticalPathMs: 'ms',
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

function positive(value, context) {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${context}: expected finite positive value`);
}

export function validateBudgets(config) {
  exactKeys(
    config,
    [
      'schema',
      'limits',
      'targets',
      'dependencies',
      'profiles',
      'timeouts',
      ...(Object.hasOwn(config ?? {}, 'reporting') ? ['reporting'] : []),
    ],
    'budget',
  );
  if (config.schema !== BUDGET_SCHEMA) throw new Error('Unknown budget schema');
  if (Object.hasOwn(config, 'reporting')) {
    exactKeys(config.reporting, Object.keys(REPORTING_UNITS), 'reporting');
    for (const [id, value] of Object.entries(config.reporting))
      positive(value, `reporting.${id}`);
  }
  exactKeys(config.limits, Object.keys(LIMIT_UNITS), 'limits');
  for (const [id, value] of Object.entries(config.limits)) integer(value, id);
  exactKeys(
    config.targets,
    ['typicalPrJobs', 'unkeyableTests', 'repoWideKeys'],
    'targets',
  );
  for (const [id, value] of Object.entries(config.targets)) {
    integer(value, `target ${id}`);
  }
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
      timeout.medianSeconds !==
      median(timeout.samples.map((sample) => sample.seconds))
    )
      throw new Error(`${id}: declared median differs from measured samples`);
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
      : id.startsWith('reporting.')
        ? REPORTING_UNITS[id.slice(10)]
        : id.startsWith('timeouts.')
          ? 'minutes'
          : 'entries',
    ratchet: !id.startsWith('timeouts.') && !id.startsWith('reporting.'),
  }));
}

/** Optional advisory display caps; never a default or a hard runtime gate. */
export function reportingLimits(config) {
  validateBudgets(config);
  return { ...(config.reporting ?? {}) };
}

/** Policy gaps remain visible even when observed telemetry is unavailable. */
export function budgetTargetGaps(config, observedValues = null) {
  validateBudgets(config);
  if (
    observedValues !== null &&
    (typeof observedValues !== 'object' || Array.isArray(observedValues))
  )
    throw new Error('Observed budget values must be an object or null');
  return Object.entries(config.targets).map(([key, target]) => {
    const id = `limits.${key}`,
      observed = observedValues?.[id] ?? null;
    if (observed !== null && (!Number.isFinite(observed) || observed < 0))
      throw new Error(`Invalid observed budget value: ${id}`);
    return {
      id,
      unit: LIMIT_UNITS[key],
      enforced: config.limits[key],
      target,
      observed,
      gapToTarget: observed === null ? null : Math.max(0, observed - target),
      configuredGap: config.limits[key] - target,
    };
  });
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
    ...Object.entries(config.reporting ?? {}).map(([id, value]) => [
      `reporting.${id}`,
      value,
    ]),
  ]);
}

/** Invalid additions/removals fail closed rather than disappearing from a delta. */
export function budgetRaises(base, head) {
  if (base === null) {
    if (head !== null) validateBudgets(head);
    return []; // Initial baseline: no previously enforced cap exists.
  }
  // Read old main configurations during the migration. Head remains strict:
  // removed byte caps cannot be reintroduced as unused configuration.
  const normalizedBase = structuredClone(base);
  const legacyIds = Object.values(PACKAGE_METRIC_IDS).flat();
  const present = legacyIds.filter((id) =>
    Object.hasOwn(normalizedBase.limits ?? {}, id),
  );
  if (present.length && present.length !== legacyIds.length)
    throw new Error('Incomplete legacy byte limits');
  for (const id of present) {
    integer(normalizedBase.limits[id], `legacy ${id}`);
    delete normalizedBase.limits[id];
  }
  const before = budgetValues(normalizedBase),
    after = budgetValues(head);
  const raises = [];
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    // A first finite reporting cap constrains a previously unconstrained metric.
    if (id.startsWith('reporting.') && !(id in before) && id in after) continue;
    if (!(id in after) || !(id in before) || after[id] > before[id])
      raises.push({ id, before: before[id] ?? null, after: after[id] ?? null });
  }
  for (const [id, value] of Object.entries(head.targets)) {
    if (value > base.targets[id])
      raises.push({
        id: `targets.${id}`,
        before: base.targets[id],
        after: value,
      });
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
    if (id.startsWith('reporting.')) {
      positive(value, id);
    } else integer(value, id);
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
