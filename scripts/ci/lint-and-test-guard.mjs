#!/usr/bin/env node
// A completed PR Checks run can miss its required aggregator (41817202190).
// Report absence as a commit status: Guard check-runs are copied into later
// Actions attempts (42672743745), retaining stale failures. PR success statuses
// belong to the trusted budget publisher. Push runs may clear their own failure.
// Usage: --repo <owner/name> --run <id> --attempt <number> --sha <sha>
//        --conclusion <conclusion> [--event <event>] [--dry-run]
// Needs GH_TOKEN with actions:read, checks:read and statuses:write (unless dry).

import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export const AGGREGATOR = 'Lint and Test';
const RETRY_DELAYS = [0, 20000, 40000];
const DEADLINE_MS = 90000;

/** Legacy API checks also appear as zero-step entries in Actions jobs lists. */
export function isLegacyGuardCheck(check) {
  return (
    check.app?.slug === 'github-actions' &&
    check.external_id === '' &&
    check.output?.title === `${AGGREGATOR} never ran` &&
    /^PR Checks run [1-9]\d* finished without a Lint and Test job, so nothing proved its fan-out checks passed\. Re-run PR Checks\.$/.test(
      check.output?.summary ?? '',
    )
  );
}

function isAggregator(job) {
  return job.name === AGGREGATOR && !isLegacyGuardCheck(job);
}

/** Inputs come from the jobs API, with check metadata to exclude legacy copies. */
export function aggregatorMissing(jobs) {
  return !jobs.some(isAggregator);
}

/** Only successful/failed runs with no real aggregator need a failure status. */
export function shouldReportMissing({
  conclusion,
  attempt,
  jobs,
  allAttemptJobs = [],
}) {
  return (
    ['success', 'failure'].includes(conclusion) &&
    aggregatorMissing(jobs) &&
    !allAttemptJobs.some(
      (job) =>
        isAggregator(job) &&
        job.status === 'completed' &&
        job.run_attempt >= attempt,
    )
  );
}

function runUrl(repo, run, attempt) {
  return `https://github.com/${repo}/actions/runs/${run}/attempts/${attempt}`;
}

function failureDescription(run, attempt) {
  return `Guard: PR Checks run ${run} attempt ${attempt} missing ${AGGREGATOR}; clears when a real aggregator passes.`;
}

function isGuardFailure(status, repo) {
  const identity = /^Guard: PR Checks run ([1-9]\d*) attempt ([1-9]\d*) /.exec(
    status?.description ?? '',
  );
  return Boolean(
    identity &&
    status.context === AGGREGATOR &&
    status.state === 'failure' &&
    status.creator?.login === 'github-actions[bot]' &&
    status.description === failureDescription(identity[1], identity[2]) &&
    status.target_url === runUrl(repo, identity[1], identity[2]),
  );
}

function ghRequest(endpoint, { method = 'GET', fields, timeoutMs }) {
  const args = ['api', endpoint, '--method', method];
  if (fields) args.push('--input', '-');
  return JSON.parse(
    execFileSync('gh', args, {
      encoding: 'utf8',
      timeout: timeoutMs,
      ...(fields ? { input: JSON.stringify(fields) } : {}),
    }),
  );
}

/** Thin I/O runner; tests inject the transport, sleeper, clock and output. */
export async function runGuard(
  { repo, run, attempt, sha, conclusion, event, dryRun = false },
  {
    request = ghRequest,
    sleep: pause = sleep,
    now = Date.now,
    log = console.log,
    warn = console.warn,
  } = {},
) {
  if (!['success', 'failure'].includes(conclusion)) {
    log(`Run ${run} concluded ${conclusion}: no failure; no gate to report.`);
    return;
  }
  const deadline = now() + DEADLINE_MS;
  function remaining() {
    const ms = deadline - now();
    if (ms <= 0)
      throw new Error('Guard deadline exceeded; absence was not established');
    return ms;
  }
  async function api(endpoint, options = {}) {
    const result = await request(endpoint, {
      ...options,
      timeoutMs: remaining(),
    });
    remaining();
    return result;
  }
  async function paginate(endpoint, field) {
    const entries = [];
    for (let page = 1; ; page++) {
      const response = await api(`${endpoint}&page=${page}`);
      const batch = field ? response[field] : response;
      if (!Array.isArray(batch))
        throw new Error(`Invalid GitHub listing: ${endpoint}`);
      entries.push(...batch);
      if (batch.length < 100) return entries;
    }
  }
  async function readJobs(endpoint) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const jobs = await paginate(`${endpoint}${separator}per_page=100`, 'jobs');
    for (let index = 0; index < jobs.length; index++) {
      const job = jobs[index];
      if (job.name === AGGREGATOR) {
        const checkEndpoint = job.check_run_url
          ? new URL(job.check_run_url).pathname.slice(1)
          : `repos/${repo}/check-runs/${job.id}`;
        const check = await api(checkEndpoint);
        if (
          check.name !== AGGREGATOR ||
          typeof check.external_id !== 'string'
        ) {
          throw new Error(
            `Invalid aggregator check metadata for job ${job.id}`,
          );
        }
        jobs[index] = { ...job, ...check };
      }
    }
    return jobs;
  }
  async function post(state, description) {
    log(
      `${dryRun ? 'Would post status' : 'Posting status'} ${state}: ${description}`,
    );
    if (!dryRun)
      await api(`repos/${repo}/statuses/${sha}`, {
        method: 'POST',
        fields: {
          context: AGGREGATOR,
          state,
          description,
          target_url: runUrl(repo, run, attempt),
        },
      });
  }
  try {
    let jobs = [];
    for (const delay of RETRY_DELAYS) {
      if (delay) {
        if (remaining() <= delay)
          throw new Error('Guard deadline leaves no time for another query');
        await pause(delay);
        remaining();
      }
      jobs = await readJobs(
        `repos/${repo}/actions/runs/${run}/attempts/${attempt}/jobs`,
      );
      if (!aggregatorMissing(jobs)) break;
    }
    if (aggregatorMissing(jobs)) {
      const allAttemptJobs = await readJobs(
        `repos/${repo}/actions/runs/${run}/jobs?filter=all`,
      );
      if (shouldReportMissing({ conclusion, attempt, jobs, allAttemptJobs })) {
        await post('failure', failureDescription(run, attempt));
        return;
      }
    }
    log(
      `Run ${run} attempt ${attempt}: no failure; real ${AGGREGATOR} reported.`,
    );
    if (
      event === 'push' &&
      conclusion === 'success' &&
      jobs.some(
        (job) =>
          isAggregator(job) &&
          job.status === 'completed' &&
          job.conclusion === 'success',
      )
    ) {
      const statuses = await paginate(
        `repos/${repo}/commits/${sha}/statuses?per_page=100`,
      );
      // Never overwrite a newer budget decision or another writer's status.
      if (
        isGuardFailure(
          statuses.find((status) => status.context === AGGREGATOR),
          repo,
        )
      ) {
        await post(
          'success',
          `Guard: real ${AGGREGATOR} passed in PR Checks run ${run} attempt ${attempt}; cleared prior guard failure.`,
        );
      }
    }
  } catch (error) {
    // Exit normally: an unavailable API proves nothing missing, and the trusted
    // budget publisher's implicit success() must still reach that later step.
    warn(
      `::warning::${String(error.message).replace(/[\r\n]/g, ' ')}; no missing-aggregator failure established.`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  function arg(name) {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? undefined : process.argv[index + 1];
  }
  const repo = arg('repo'),
    run = arg('run'),
    attempt = arg('attempt');
  const sha = arg('sha'),
    conclusion = arg('conclusion');
  if (
    !repo ||
    !run ||
    !sha ||
    !conclusion ||
    !/^[1-9]\d*$/.test(attempt ?? '')
  ) {
    console.error(
      'usage: --repo <owner/name> --run <id> --attempt <number> --sha <sha> --conclusion <conclusion> [--event <event>] [--dry-run]',
    );
    process.exit(2);
  }
  await runGuard({
    repo,
    run,
    attempt: Number(attempt),
    sha,
    conclusion,
    event: arg('event'),
    dryRun: process.argv.includes('--dry-run'),
  });
}
