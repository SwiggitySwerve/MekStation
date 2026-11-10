import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { exactKeys, loadBudgetTree, METRICS_SCHEMA } from './budget-config.mjs';
import { dependencyViolations } from './budget-dependencies.mjs';
import {
  collectRepositoryMetrics,
  validateRepositoryMetrics,
} from './budget-metrics.mjs';

export function checkRepositoryMetrics(config, metrics, labels) {
  validateRepositoryMetrics(metrics);
  exactKeys(
    metrics.workflow.timeouts,
    Object.keys(config.timeouts),
    'timeout census',
  );
  const profiles = new Map(
    metrics.workflow.profiles.map((profile) => [profile.id, profile]),
  );
  if (
    profiles.size !== metrics.workflow.profiles.length ||
    profiles.size !== config.profiles.length ||
    config.profiles.some(
      (profile) => profiles.get(profile.id)?.typical !== profile.typical,
    )
  )
    throw new Error('Representative profile census missing or reclassified');
  if (!Array.isArray(labels) || labels.some((l) => typeof l !== 'string'))
    throw new Error('PR labels missing/unknown');
  const violations = [];
  const fail = (code, message) => violations.push({ code, message });
  for (const profile of metrics.workflow.profiles) {
    if (profile.typical && profile.active > config.limits.typicalPrJobs)
      fail(
        'typicalPrJobs',
        `${profile.id}: ${profile.active} active / ${profile.expanded} expanded jobs > ${config.limits.typicalPrJobs}`,
      );
  }
  for (const [id, observed] of Object.entries(metrics.workflow.timeouts)) {
    if (observed !== config.timeouts[id]?.minutes)
      fail(
        'timeout',
        `${id}: configured ${observed}, budget ${config.timeouts[id]?.minutes}`,
      );
  }
  for (const [id, census] of [
    ['unkeyableTests', metrics.cache.unkeyable],
    ['repoWideKeys', metrics.cache.repoWide],
  ]) {
    if (!Array.isArray(census) || !metrics.cache.files.length)
      throw new Error(`${id}: missing actual census`);
    if (census.length > config.limits[id])
      fail(id, `${census.length} > ${config.limits[id]}`);
  }
  violations.push(
    ...dependencyViolations(config, metrics.dependencies, labels),
  );
  return { schema: METRICS_SCHEMA, metrics, violations };
}

export function run(argv, root = process.cwd()) {
  const { values } = parseArgs({
    args: argv,
    options: {
      report: { type: 'string' },
      labels: { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });
  const config = loadBudgetTree(path.join(root, 'config/ci/budgets.json'));
  const labels = JSON.parse(
    values.labels ??
      (process.env.GITHUB_EVENT_NAME === 'pull_request'
        ? (process.env.PR_LABELS_JSON ?? 'null')
        : '[]'),
  );
  const metrics = collectRepositoryMetrics(root, config);
  const result = checkRepositoryMetrics(config, metrics, labels);
  if (values.report) {
    const destination = path.resolve(root, values.report);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `${JSON.stringify(result, null, 2)}\n`);
  }
  for (const p of metrics.workflow.profiles)
    console.log(
      `${p.id}: ${p.active} active / ${p.expanded} expanded jobs (${p.typical ? 'typical' : 'exceptional'})`,
    );
  console.log(
    `Cache: ${metrics.cache.files.length} files, ${metrics.cache.unkeyable.length} unkeyable, ${metrics.cache.repoWide.length} repo-wide`,
  );
  for (const violation of result.violations)
    console.error(`${violation.code}: ${violation.message}`);
  return result.violations.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (error) {
    console.error(`Budget inputs rejected: ${error.message}`);
    process.exitCode = 1;
  }
}
