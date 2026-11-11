import { checkBudgetPolicy, guardOutcome } from './budget-approval.mjs';

const REQUEST_FLOOR = 150;
// One triggering-PR verify GET, one current-status GET and one correction POST.
// Admission also reserves the entire observed evaluation request count for a
// fresh SHA-wide peer sweep (including pagination), rather than assuming one peer.
const VERIFY_CORRECTION_REQUESTS = 3;
const BATCH_SIZE = 5;
const SOFT_TIMEOUT_MS = 8 * 60 * 1000;

class RequestBudgetStop extends Error {}

/** Only immutable SHA blobs and repository metadata can be reused. */
function reconciliationClient(github, core, number, admitSuccess) {
  const cache = new Map();
  const once = (key, read) => {
    if (!cache.has(key))
      cache.set(
        key,
        Promise.resolve()
          .then(read)
          .catch((error) => {
            cache.delete(key);
            throw error;
          }),
      );
    return cache.get(key);
  };
  const repos = github.rest.repos;
  return {
    ...github,
    rest: {
      ...github.rest,
      repos: {
        ...repos,
        get: (args) =>
          once(`repo:${args.owner}/${args.repo}`, () => repos.get(args)),
        getContent: (args) =>
          /^[a-f0-9]{40}$/.test(args.ref)
            ? once(
                `blob:${args.owner}/${args.repo}/${args.path}@${args.ref}`,
                () => repos.getContent(args),
              )
            : repos.getContent(args),
        createCommitStatus: async (args) => {
          // Combined status contains the latest state of each context, rather
          // than every historical write. Paginate if there are >100 contexts.
          let current;
          for (let page = 1; ; page++) {
            const { data } = await repos.getCombinedStatusForRef({
              owner: args.owner,
              repo: args.repo,
              ref: args.sha,
              per_page: 100,
              page,
            });
            if (!Array.isArray(data.statuses))
              throw new Error('Current status census unavailable');
            current = data.statuses.find(
              (status) => status.context === args.context,
            );
            if (current || data.statuses.length < 100) break;
          }
          if (current?.state === args.state) {
            core.info(
              `PR #${number()}: ${args.context} (${args.sha}) ${args.state}: confirmed, no write`,
            );
            return { data: args };
          }
          if (
            args.state === 'success' &&
            !['failure', 'error'].includes(current?.state)
          ) {
            core.info(
              `PR #${number()}: ${args.context} (${args.sha}): policy passed; no stale red to clear, no write`,
            );
            return { data: args };
          }
          if (args.state === 'success') admitSuccess();
          const response = await repos.createCommitStatus(args);
          core.info(
            `PR #${number()}: ${args.context} (${args.sha}) ${current?.state ?? 'missing'} -> ${args.state}: ${args.description}`,
          );
          return response;
        },
      },
    },
  };
}

/** Reconcile PR-number buckets without coupling membership to list positions. */
export async function reconcileBudgetStatuses({
  github,
  owner,
  repo,
  runNumber,
  core,
  checkPolicy = checkBudgetPolicy,
  now = Date.now,
}) {
  if (!Number.isSafeInteger(runNumber) || runNumber < 1)
    throw new Error('Invalid reconciliation run number');
  const started = now();
  const { data } = await github.rest.rateLimit.get();
  let remaining = data.resources?.core?.remaining;
  if (!Number.isSafeInteger(remaining) || remaining < 0)
    throw new Error('REST request budget unavailable');
  let requests = 0,
    evaluationStart = 0;
  const requestHook = async (request, options) => {
    // Count requests and observe shared quota here. The floor gates admission,
    // never an admitted write's verify reads or failure correction.
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
      throw error;
    }
  };
  github.hook.wrap('request', requestHook);
  let currentNumber;
  const client = reconciliationClient(
    github,
    core,
    () => currentNumber,
    () => {
      const reserve = requests - evaluationStart + VERIFY_CORRECTION_REQUESTS;
      if (remaining < REQUEST_FLOOR + reserve + 1) {
        core.info(
          `PR #${currentNumber}: success not admitted; ${remaining} remaining requires floor ${REQUEST_FLOOR} + ${reserve} verify/correction requests + 1 success write; unreached.`,
        );
        throw new RequestBudgetStop('request budget');
      }
    },
  );
  const visited = [];
  let candidates = [],
    stopReason = null;
  try {
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
    if (!candidates.length) return { visited, unreached: [], stopReason };
    // A peer opening or closing cannot move this PR between buckets unless N
    // crosses a multiple of five. Rotate within each bucket on later sweeps so
    // budget/time truncation does not always favor its first members.
    const buckets = Math.ceil(candidates.length / BATCH_SIZE);
    const turn = runNumber - 1;
    const batch = candidates.filter(
      (pr) => pr.number % buckets === turn % buckets,
    );
    const offset = batch.length ? Math.floor(turn / buckets) % batch.length : 0;
    const ordered = [...batch.slice(offset), ...batch.slice(0, offset)];
    for (const candidate of ordered) {
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
      let head;
      try {
        if (!Number.isSafeInteger(number) || number < 1)
          throw new Error('Invalid PR number');
        const { data: live } = await client.rest.pulls.get({
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
          github: client,
          owner,
          repo,
          number,
          expectedHead: head,
          reconcile: true,
        });
        const outcome = guardOutcome(number, result);
        core.info(outcome.line);
        if (outcome.fail) core.setFailed(outcome.line);
        visited.push(number);
      } catch (error) {
        if (error instanceof RequestBudgetStop) {
          stopReason = 'request budget';
          break;
        }
        core.setFailed(
          `PR #${number}: reconciliation failed (bound ${head ?? 'unread'}): ${error.message}`,
        );
        visited.push(number);
      }
    }
  } catch (error) {
    if (!(error instanceof RequestBudgetStop)) throw error;
    stopReason = 'request budget';
    core.info(
      'Request budget stopped the census; additional unlisted PRs may remain.',
    );
  } finally {
    github.hook.remove('request', requestHook);
  }
  const unreached = candidates
    .filter((pr) => !visited.includes(pr.number))
    .map((pr) => pr.number);
  core.info(
    `Reconciliation: ${visited.length} visited; ${remaining} requests remaining; stopped: ${stopReason ?? 'batch complete'}.`,
  );
  core.info(
    `Unreached PRs: ${unreached.map((number) => `#${number}`).join(', ') || '(none)'}`,
  );
  return { visited, unreached, stopReason };
}
