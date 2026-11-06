import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import cachedTests from '../jest/cached-tests.js';
import {
  METRICS_SCHEMA,
  budgetConfigHash,
  loadBudgets,
} from './budget-config.mjs';
import { dependencyCounts } from './budget-dependencies.mjs';
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
      return [scope, dependencyCounts(manifest, lock, scope)];
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

export {
  validateRepositoryMetrics,
  observedBudgetValues,
  packageContributors,
  validateObservationProducer,
  observationProducer,
} from './budget-observation.mjs';
