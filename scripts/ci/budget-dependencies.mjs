// One dependency census rule shared by filesystem and live JSON checks.
import { exactKeys } from './budget-config.mjs';

export function dependencyCounts(manifest, lock, scope) {
  if (lock.lockfileVersion !== 3 || !lock.packages?.[''])
    throw new Error(`${scope}: unknown lockfile shape`);
  const sections = [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ];
  for (const key of sections)
    if (
      JSON.stringify(manifest[key] ?? {}) !==
      JSON.stringify(lock.packages[''][key] ?? {})
    )
      throw new Error(`${scope}: manifest and lockfile disagree (${key})`);
  return {
    lockEntries: Object.keys(lock.packages).length - 1,
    directDependencies: new Set(
      sections.flatMap((key) => Object.keys(manifest[key] ?? {})),
    ).size,
  };
}

/** Counts over their configured values; report-only (PARITY-PLAN §193.2). */
export function dependencyOverBudget(config, dependencies) {
  const over = [];
  for (const scope of ['root', 'desktop']) {
    exactKeys(
      dependencies[scope],
      ['lockEntries', 'directDependencies'],
      `dependencies ${scope}`,
    );
    for (const id of ['lockEntries', 'directDependencies']) {
      const value = dependencies[scope][id];
      if (!Number.isSafeInteger(value) || value < 0)
        throw new Error(`Unknown dependency count: ${scope}.${id}`);
      const limit = config.dependencies[scope][id];
      if (value > limit)
        over.push({
          code: 'dependencyGrowth',
          key: `dependencies.${scope}.${id}`,
          value,
          limit,
          delta: value - limit,
          message: `${value} > ${limit}`,
        });
    }
  }
  return over;
}
