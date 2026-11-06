// One dependency census/label rule shared by filesystem and live JSON checks.
import { exactKeys } from './budget-config.mjs';
export const DEPENDENCY_GROWTH_LABEL = 'ci-dependency-growth';

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

export function dependencyViolations(config, dependencies, labels) {
  if (
    !Array.isArray(labels) ||
    labels.some((label) => typeof label !== 'string')
  )
    throw new Error('PR labels missing/unknown');
  const violations = [];
  for (const scope of ['root', 'desktop']) {
    exactKeys(
      dependencies[scope],
      ['lockEntries', 'directDependencies'],
      `dependencies ${scope}`,
    );
    for (const id of ['lockEntries', 'directDependencies']) {
      const actual = dependencies[scope][id];
      if (!Number.isSafeInteger(actual) || actual < 0)
        throw new Error(`Unknown dependency count: ${scope}.${id}`);
      if (
        actual > config.dependencies[scope][id] &&
        !labels.includes(DEPENDENCY_GROWTH_LABEL)
      )
        violations.push({
          code: 'dependencyGrowth',
          message: `${scope}.${id}: ${actual} > ${config.dependencies[scope][id]}; requires ${DEPENDENCY_GROWTH_LABEL}`,
        });
    }
  }
  return violations;
}
