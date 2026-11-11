import { createHash } from 'node:crypto';

import { checkBudgetPolicy, policyOutcomeLine } from './budget-approval.mjs';
import { reconciliationPublisher } from './budget-reconcile-publisher.mjs';
import { writeReconciliationSummary } from './budget-reconcile-summary.mjs';

const REQUEST_FLOOR = 150;
// Trigger verify GET, current-status GET, correction POST and readback GET, plus the full
// observed request prefix for a fresh SHA-wide sweep and its pagination.
const VERIFY_CORRECTION_REQUESTS = 4;
const BATCH_SIZE = 5;
const SOFT_TIMEOUT_MS = 8 * 60 * 1000;
class RequestBudgetStop extends Error {}

function orderBucketBySweep(prs, sweep) {
  return prs
    .map((pr) => ({
      pr,
      priority: createHash('sha256').update(`${sweep}:${pr.number}`).digest(),
    }))
    .sort(
      (a, b) =>
        Buffer.compare(a.priority, b.priority) || a.pr.number - b.pr.number,
    )
    .map(({ pr }) => pr);
}

const isTransient = (error) =>
  error instanceof RequestBudgetStop ||
  error.status === 429 ||
  error.status >= 500 ||
  /rate.?limit|ECONN|ENET|ETIMEDOUT/i.test(error.message);
const reason = (error) =>
  error instanceof RequestBudgetStop
    ? 'request budget'
    : `${error.status ? `API ${error.status}: ` : ''}${error.message}`;

/** Policy findings are normal outcomes; only unresolved writes make this red. */
export async function reconcileBudgetStatuses({
  github,
  owner,
  repo,
  runNumber,
  core,
  checkPolicy = checkBudgetPolicy,
  now = Date.now,
}) {
  const started = now(),
    visited = [],
    evaluated = [],
    reasons = new Map();
  let candidates = [],
    selected = new Set(),
    stopReason = null,
    censusIncomplete = true;
  let requests = 0,
    evaluationStart = 0,
    remaining = null,
    currentNumber,
    readError,
    publisher,
    hooked = false;
  const requestHook = async (request, options) => {
    requests++;
    remaining--;
    try {
      const response = await request(options);
      const header = response.headers?.['x-ratelimit-remaining'];
      if (header !== undefined && Number.isSafeInteger(Number(header)))
        remaining = Math.min(remaining, Number(header));
      return response;
    } catch (error) {
      const header = error.response?.headers?.['x-ratelimit-remaining'];
      if (header !== undefined && Number.isSafeInteger(Number(header)))
        remaining = Math.min(remaining, Number(header));
      if (!/^(POST|createCommitStatus)$/i.test(options.method ?? 'GET'))
        readError ??= error;
      throw error;
    }
  };
  const settleWrites = async () => {
    const problems = await publisher.finish();
    if (problems.length)
      core.setFailed(
        `PR #${currentNumber}: unverified or uncorrected write: ${problems.map((problem) => `${problem.context} (${problem.sha}): ${problem.reason}`).join('; ')}`,
      );
  };
  try {
    if (!Number.isSafeInteger(runNumber) || runNumber < 1)
      throw new Error('Invalid reconciliation run number');
    requests++;
    const { data } = await github.rest.rateLimit.get();
    remaining = data.resources?.core?.remaining;
    if (!Number.isSafeInteger(remaining) || remaining < 0)
      throw new Error('REST request budget unavailable');
    github.hook.wrap('request', requestHook);
    hooked = true;
    publisher = reconciliationPublisher({
      github,
      core,
      readFailure: () => readError,
      admitSuccess: () => {
        if (readError) throw readError;
        const reserve = requests - evaluationStart + VERIFY_CORRECTION_REQUESTS;
        if (remaining < REQUEST_FLOOR + reserve + 1) {
          core.info(
            `PR #${currentNumber}: success not admitted; ${remaining} remaining requires floor ${REQUEST_FLOOR} + ${reserve} verify/correction requests + 1 success write; unreached.`,
          );
          throw new RequestBudgetStop('request budget');
        }
      },
    });
    candidates = (
      await github.paginate(github.rest.pulls.list, {
        owner,
        repo,
        state: 'open',
        base: 'main',
        per_page: 100,
      })
    )
      .filter((pr) => !pr.draft)
      .sort((a, b) => a.number - b.number);
    censusIncomplete = false;
    if (!candidates.length) stopReason = 'no eligible PRs';
    const buckets = Math.max(1, Math.ceil(candidates.length / BATCH_SIZE)),
      turn = runNumber - 1;
    const batch = candidates.filter(
      (pr) => pr.number % buckets === turn % buckets,
    );
    selected = new Set(batch.map((pr) => pr.number));
    for (const candidate of orderBucketBySweep(
      batch,
      Math.floor(turn / buckets),
    )) {
      if (remaining <= REQUEST_FLOOR) {
        stopReason = 'request budget';
        break;
      }
      if (now() - started >= SOFT_TIMEOUT_MS) {
        stopReason = 'time budget';
        break;
      }
      const number = candidate.number;
      currentNumber = number;
      evaluationStart = requests;
      readError = undefined;
      publisher.begin(number);
      let head, evaluationError;
      try {
        if (!Number.isSafeInteger(number) || number < 1)
          throw new Error('Invalid PR number');
        const { data: live } = await publisher.client.rest.pulls.get({
          owner,
          repo,
          pull_number: number,
        });
        if (live.state !== 'open' || live.draft || live.base.ref !== 'main') {
          visited.push(number);
          continue;
        }
        head = live.head.sha;
        const result = await checkPolicy({
          github: publisher.client,
          owner,
          repo,
          number,
          expectedHead: head,
          reconcile: true,
          onPublication: publisher.verify,
        });
        core.info(policyOutcomeLine(number, result));
        evaluated.push({
          number,
          head,
          outcome: result.checksInProgress
            ? 'skipped: checks in progress'
            : `${result.code}: ${result.message}`,
        });
      } catch (error) {
        evaluationError = error;
      }
      await settleWrites();
      evaluationError ??= readError;
      if (evaluationError) {
        reasons.set(number, reason(evaluationError));
        core.info(
          `PR #${number}: unreached (bound ${head ?? 'unread'}): ${reason(evaluationError)}`,
        );
        if (isTransient(evaluationError)) {
          stopReason = reason(evaluationError);
          break;
        }
      } else visited.push(number);
    }
  } catch (error) {
    stopReason = reason(error);
    core.info(`Reconciliation stopped cleanly: ${stopReason}`);
  } finally {
    if (hooked) github.hook.remove('request', requestHook);
  }
  const unreached = candidates
    .filter((pr) => !visited.includes(pr.number))
    .map((pr) => pr.number);
  const unreachedReasons = unreached.map((number) => ({
    number,
    reason:
      reasons.get(number) ??
      (selected.has(number)
        ? (stopReason ?? 'evaluation incomplete')
        : "not selected in this run's bucket"),
  }));
  const report = {
    visited,
    evaluated,
    unreached,
    unreachedReasons,
    writes: publisher?.writes ?? [],
    requestsUsed: requests,
    remaining,
    stopReason,
    censusIncomplete,
  };
  core.info(
    `Reconciliation: ${visited.length} visited; ${remaining ?? 'unknown'} requests remaining; stopped: ${stopReason ?? 'bucket complete'}.`,
  );
  core.info(
    `Unreached PRs: ${unreached.map((number) => `#${number}`).join(', ') || '(none)'}`,
  );
  await writeReconciliationSummary(core, report);
  return report;
}
