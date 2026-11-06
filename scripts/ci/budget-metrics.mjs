import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import cachedTests from '../jest/cached-tests.js';
import {
  METRICS_SCHEMA,
  PACKAGE_METRICS_SCHEMA,
  budgetConfigHash,
  loadBudgets,
  exactKeys,
  budgetDescriptors,
} from './budget-config.mjs';
import { workflowMetrics } from './budget-workflow.mjs';

export function dependencyMetrics(root) {
  return Object.fromEntries(
    ['root', 'desktop'].map((scope) => {
      const prefix = scope === 'root' ? root : path.join(root, scope);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(prefix, 'package.json'), 'utf8'),
      );
      const lock = JSON.parse(
        fs.readFileSync(path.join(prefix, 'package-lock.json'), 'utf8'),
      );
      if (lock.lockfileVersion !== 3 || !lock.packages?.[''])
        throw new Error(`${scope}: unknown lockfile shape`);
      const sections = [
        'dependencies',
        'devDependencies',
        'optionalDependencies',
        'peerDependencies',
      ];
      for (const key of sections) {
        if (
          JSON.stringify(manifest[key] ?? {}) !==
          JSON.stringify(lock.packages[''][key] ?? {})
        )
          throw new Error(`${scope}: manifest and lockfile disagree (${key})`);
      }
      return [
        scope,
        {
          lockEntries: Object.keys(lock.packages).length - 1,
          directDependencies: new Set(
            sections.flatMap((key) => Object.keys(manifest[key] ?? {})),
          ).size,
        },
      ];
    }),
  );
}

/** Actual Jest selection and actual cache keyer; no regex approximation of keys. */
export function cacheMetrics(root) {
  const env = {
    ...process.env,
    JEST_SPLIT_CORPUS: 'true',
    JEST_EXCLUDE_PERF_SENSITIVE: 'true',
  };
  const stdout = execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/jest/bin/jest.js'),
      '--listTests',
      '--json',
      '--selectProjects',
      'unit',
      'corpus',
      '--maxWorkers=2',
    ],
    {
      cwd: root,
      env,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 120000,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  const line = stdout
    .split('\n')
    .reverse()
    .find((l) => l.startsWith('['));
  const absoluteFiles = JSON.parse(line);
  if (!Array.isArray(absoluteFiles) || !absoluteFiles.length)
    throw new Error('Empty Jest census');
  const files = [
    ...new Set(
      absoluteFiles.map((file) => {
        const relative = path.relative(root, file).split(path.sep).join('/');
        if (
          relative.startsWith('../') ||
          path.isAbsolute(relative) ||
          !fs.statSync(file).isFile()
        )
          throw new Error(`Invalid Jest path ${file}`);
        return relative;
      }),
    ),
  ].sort();
  const index = cachedTests.buildFileIndex(root);
  const keyer = cachedTests.createKeyer({ root, index, env });
  const unkeyable = [],
    repoWide = [];
  for (const file of files) {
    const result = keyer.keyFor(file);
    if (result.unkeyable) unkeyable.push({ file, reason: result.unkeyable });
    else if (!result.key || typeof result.repoWide !== 'boolean')
      throw new Error(`Unknown keyer result: ${file}`);
    else if (result.repoWide) repoWide.push({ file, reasons: result.why });
  }
  return { files, unkeyable, repoWide };
}

export function collectRepositoryMetrics(
  root,
  config = loadBudgets(path.join(root, 'config/ci/budgets.json')),
) {
  return {
    schema: METRICS_SCHEMA,
    budgetConfigHash: budgetConfigHash(
      path.join(root, 'config/ci/budgets.json'),
    ),
    workflow: workflowMetrics(root, config),
    dependencies: dependencyMetrics(root),
    cache: cacheMetrics(root),
  };
}

export function validateRepositoryMetrics(metrics) {
  exactKeys(
    metrics,
    ['schema', 'budgetConfigHash', 'workflow', 'dependencies', 'cache'],
    'repository metrics',
  );
  if (
    metrics.schema !== METRICS_SCHEMA ||
    !/^[a-f0-9]{64}$/.test(metrics.budgetConfigHash)
  )
    throw new Error('Repository metric identity missing');
  if (
    !Array.isArray(metrics.workflow?.profiles) ||
    !metrics.workflow.profiles.length ||
    !metrics.workflow.timeouts
  )
    throw new Error('Workflow census missing');
  for (const p of metrics.workflow.profiles) {
    if (
      typeof p.typical !== 'boolean' ||
      !Number.isSafeInteger(p.active) ||
      p.active < 0 ||
      !Array.isArray(p.census) ||
      p.expanded !== p.census.length ||
      p.active !== p.census.filter((j) => j.active === true).length
    )
      throw new Error('Invalid expanded job census');
  }
  const files = metrics.cache?.files;
  if (
    !Array.isArray(files) ||
    !files.length ||
    new Set(files).size !== files.length
  )
    throw new Error('Missing/duplicate Jest census');
  for (const key of ['unkeyable', 'repoWide']) {
    if (
      !Array.isArray(metrics.cache[key]) ||
      new Set(metrics.cache[key].map((e) => e.file)).size !==
        metrics.cache[key].length ||
      metrics.cache[key].some((e) => !files.includes(e.file))
    )
      throw new Error(`Invalid ${key} census`);
  }
  for (const scope of ['root', 'desktop']) {
    exactKeys(
      metrics.dependencies[scope],
      ['lockEntries', 'directDependencies'],
      scope,
    );
    if (
      Object.values(metrics.dependencies[scope]).some(
        (n) => !Number.isSafeInteger(n) || n < 0,
      )
    )
      throw new Error('Invalid dependency census');
  }
  return metrics;
}

/** Projection is observations only. Callers publish null until complete. */
export function observedBudgetValues(config, repository, packages = {}) {
  validateRepositoryMetrics(repository);
  const values = {
    'limits.typicalPrJobs': Math.max(
      ...repository.workflow.profiles
        .filter((p) => p.typical)
        .map((p) => p.active),
    ),
    'limits.unkeyableTests': repository.cache.unkeyable.length,
    'limits.repoWideKeys': repository.cache.repoWide.length,
    ...Object.fromEntries(
      Object.entries(repository.dependencies).flatMap(([scope, counts]) =>
        Object.entries(counts).map(([id, value]) => [
          `dependencies.${scope}.${id}`,
          value,
        ]),
      ),
    ),
  };
  for (const [kind, ids] of [
    ['web', ['standaloneStaticBytes', 'webZipBytes']],
    ['installers', ['installerBytes']],
  ]) {
    const metrics = packages[kind]?.metrics ?? packages[kind];
    if (metrics) {
      if (metrics.schema !== PACKAGE_METRICS_SCHEMA || metrics.unit !== 'bytes')
        throw new Error('Unknown package projection');
      for (const id of ids) {
        if (!Number.isSafeInteger(metrics[id]) || metrics[id] <= 0)
          throw new Error(`Missing package observation ${id}`);
        values[`limits.${id}`] = metrics[id];
      }
    }
  }
  const missing = budgetDescriptors(config)
    .filter((d) => d.ratchet && !Object.hasOwn(values, d.id))
    .map((d) => d.id);
  return { values, complete: missing.length === 0, missing };
}

export function packageContributors(artifact) {
  const metrics = artifact?.metrics ?? artifact;
  if (!metrics)
    return { availability: 'unavailable', unit: 'bytes', files: null };
  if (
    metrics.schema !== PACKAGE_METRICS_SCHEMA ||
    metrics.unit !== 'bytes' ||
    !Array.isArray(metrics.files) ||
    !metrics.files.length ||
    metrics.files.some(
      (f) =>
        typeof f.path !== 'string' ||
        !Number.isSafeInteger(f.bytes) ||
        f.bytes < 0,
    )
  )
    throw new Error('Unknown package contributors');
  return {
    availability: 'available',
    unit: 'bytes',
    files: metrics.files.map(({ path: file, bytes }) => ({
      path: file,
      bytes,
    })),
  };
}
