import { execFileSync } from 'node:child_process';
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

const ATTRIBUTION_LIMIT = 10;
const CENSUS_WORDS = {
  unkeyableTests: 'unkeyable',
  repoWideKeys: 'repo-wide',
};

/** Say which PR and which changed tests caused a cache-census breach. */
function breachAttribution(census, word, { prNumber, changedFiles } = {}) {
  if (!prNumber) return '';
  const pr = ` (PR #${prNumber})`;
  if (!Array.isArray(changedFiles)) return pr;
  const changed = new Set(changedFiles);
  const hits = census.filter((entry) => changed.has(entry.file));
  if (!hits.length)
    return `${pr}: no changed test is itself ${word}; a shared input changed, see the census artifact ci-budget-repository.`;
  const named = hits.slice(0, ATTRIBUTION_LIMIT).map((entry) => {
    const why = [].concat(entry.reasons ?? entry.reason ?? []);
    return `${entry.file} (${why.slice(0, 3).join('; ')}${why.length > 3 ? `; +${why.length - 3} more` : ''})`;
  });
  const more = hits.length - named.length;
  return `${pr}. Changed in this PR and ${word === 'repo-wide' ? 'keyed repo-wide' : word}: ${named.join(', ')}${more > 0 ? `, +${more} more` : ''}.`;
}

export function checkRepositoryMetrics(config, metrics, labels, context) {
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
      fail(
        id,
        `${census.length} > ${config.limits[id]}${breachAttribution(census, CENSUS_WORDS[id], context)}`,
      );
  }
  violations.push(
    ...dependencyViolations(config, metrics.dependencies, labels),
  );
  return { schema: METRICS_SCHEMA, metrics, violations };
}

/** Files the PR changed against its base; undefined when that cannot be known. */
export function changedFilesSince(baseSha, root = process.cwd()) {
  if (!/^[0-9a-f]{7,64}$/i.test(baseSha ?? '')) return undefined;
  try {
    return execFileSync('git', ['diff', '--name-only', `${baseSha}...HEAD`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    return undefined;
  }
}

const annotationData = (text) =>
  text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

/** Print each violation; on GitHub Actions also surface it as an annotation. */
export function reportViolations(
  violations,
  env = process.env,
  log = console.error,
) {
  for (const { code, message } of violations) {
    const line = `${code}: ${message}`;
    log(line);
    if (env.GITHUB_ACTIONS === 'true')
      log(`::error title=CI budget::${annotationData(line)}`);
  }
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
  const prNumber =
    process.env.GITHUB_EVENT_NAME === 'pull_request'
      ? process.env.PR_NUMBER
      : undefined;
  const result = checkRepositoryMetrics(config, metrics, labels, {
    prNumber,
    changedFiles: prNumber
      ? changedFilesSince(process.env.BUDGET_BASE_SHA, root)
      : undefined,
  });
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
  reportViolations(result.violations);
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
