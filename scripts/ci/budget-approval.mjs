import { readFileSync } from 'node:fs';

import { budgetRaises, validateBudgets } from './budget-config.mjs';
import {
  dependencyCounts,
  dependencyViolations,
} from './budget-dependencies.mjs';
import {
  checkBudgetRaise,
  APPROVAL_CONTEXT,
} from './garden-approval-github.mjs';
import { AGGREGATOR } from './lint-and-test-guard.mjs';

const SHA = /^[0-9a-f]{40}$/;
export const STALE_REF_REMEDY =
  'merge origin/main into the PR branch and push, so the run uses the current workflow';

/**
 * The head this run is for. Every caller is bound: an explicit `expectedHead`
 * must be a full SHA; a caller that passes none (a pull_request run whose merge
 * ref predates the binding still carries a pr-checks.yml without it, while it
 * loads this validator from main) is bound to the head of its own triggering
 * pull_request event. Anything else is unbound and refused, never exempted.
 */
export function runHead(expectedHead, number, eventPath) {
  if (expectedHead !== undefined)
    return typeof expectedHead === 'string' && SHA.test(expectedHead)
      ? expectedHead
      : null;
  try {
    const event = JSON.parse(readFileSync(eventPath, 'utf8'));
    const head =
      event?.pull_request?.number === number
        ? event.pull_request.head?.sha
        : undefined;
    return typeof head === 'string' && SHA.test(head) ? head : null;
  } catch {
    return null;
  }
}

/** G3 owns approval; G1 adds its one dependency label rule to the same decision. */
export async function checkBudgetPolicy({
  github,
  owner,
  repo,
  number,
  publish = true,
  expectedHead,
  eventPath = process.env.GITHUB_EVENT_PATH,
  checkRaise = checkBudgetRaise,
}) {
  const parameters = { owner, repo, pull_number: number };
  const boundHead = runHead(expectedHead, number, eventPath);
  const { data: initial } = await github.rest.pulls.get(parameters);
  // An unbound or superseded run evaluated nothing, so it writes nothing.
  if (!boundHead)
    return {
      allowed: false,
      code: 'unbound-run',
      message: `PR #${number}: this run names no valid head to evaluate; ${STALE_REF_REMEDY}`,
      unbound: true,
      evaluatedHead: null,
      currentHead: initial.head.sha,
    };
  if (boundHead !== initial.head.sha)
    return {
      allowed: false,
      code: 'changed-context',
      message: `This run is for superseded head ${boundHead}; the PR is at ${initial.head.sha}`,
      headChanged: true,
      baseChanged: false,
      labelsChanged: false,
      evaluatedHead: boundHead,
      currentHead: initial.head.sha,
    };
  // Evidence that disqualifies the superseded-head exemption is sticky: a later
  // read never erases a base/label change or an evaluation bound to another head.
  const seen = {
    headChanged: false,
    baseChanged: false,
    labelsChanged: false,
    snapshotMismatch: false,
  };
  const note = (refusal) => {
    if (refusal) for (const key in seen) if (refusal[key]) seen[key] = true;
    return refusal;
  };
  // A run writes statuses only to the SHA it evaluated (initial.head.sha), never
  // to a SHA it did not evaluate. On a head change the refusal lands on the old
  // head; the new head carries no status from this run, so the required
  // `Lint and Test` context is absent there (blocked) until its own run reports.
  // On a label or base change with the same head, evaluated and current are the
  // same SHA, so a revoked label still fails that head.
  const changedContext = (current, message) => {
    const headChanged = current.head.sha !== initial.head.sha;
    const baseChanged = current.base.sha !== initial.base.sha;
    const labelsChanged =
      JSON.stringify(current.labels.map((l) => l.name).sort()) !==
      JSON.stringify(initial.labels.map((l) => l.name).sort());
    if (!headChanged && !baseChanged && !labelsChanged) return null;
    return note({
      allowed: false,
      code: 'changed-context',
      message,
      headChanged,
      baseChanged,
      labelsChanged,
      evaluatedHead: initial.head.sha,
      currentHead: current.head.sha,
    });
  };
  // Every part of one evaluation must be about initial.head.sha: the nested
  // approval check reads its own PR snapshot, so an X→Y→X sequence could
  // otherwise evaluate Y and publish to X. A nested result that names no head
  // is treated the same way (fail closed).
  const mismatched = (evaluated, message) =>
    evaluated !== initial.head.sha
      ? note({
          allowed: false,
          code: 'changed-context',
          message,
          headChanged: true,
          baseChanged: false,
          labelsChanged: false,
          snapshotMismatch: true,
          evaluatedHead: initial.head.sha,
          currentHead: evaluated ?? null,
        })
      : null;
  const sink = {
    rest: {
      ...github.rest,
      repos: {
        ...github.rest.repos,
        createCommitStatus: async (data) => ({ data }),
      },
    },
    paginate: github.paginate,
  };
  const evaluateRaise = () =>
    checkRaise({
      github: sink,
      owner,
      repo,
      number,
      budgetPath: 'config/ci/budgets.json',
      budgetRaises,
    });
  const boundRaise = async () => {
    const raise = await evaluateRaise();
    return (
      mismatched(
        raise.evaluatedHead,
        'Approval evaluated a different head than this run',
      ) ?? raise
    );
  };
  let result = await boundRaise();
  if (result.allowed) {
    try {
      const read = async (file) => {
        const { data } = await github.rest.repos.getContent({
          owner,
          repo,
          path: file,
          ref: initial.head.sha,
        });
        if (data.encoding !== 'base64' || typeof data.content !== 'string')
          throw new Error('Expected ordinary JSON blob');
        return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
      };
      const config = validateBudgets(await read('config/ci/budgets.json'));
      const counts = {};
      for (const scope of ['root', 'desktop']) {
        const prefix = scope === 'root' ? '' : 'desktop/';
        counts[scope] = dependencyCounts(
          await read(`${prefix}package.json`),
          await read(`${prefix}package-lock.json`),
          scope,
        );
      }
      const violations = dependencyViolations(
        config,
        counts,
        initial.labels.map((label) => label.name),
      );
      if (violations.length)
        result = {
          allowed: false,
          code: 'dependency-growth',
          message: violations.map((v) => v.message).join('; '),
        };
      else result = await boundRaise(); // refresh live reviews after dependency reads
    } catch (error) {
      result = {
        allowed: false,
        code: 'invalid-dependencies',
        message: error.message,
      };
    }
  }
  const { data: fresh } = await github.rest.pulls.get(parameters);
  result =
    changedContext(fresh, 'PR head/base/labels changed; rerun required') ??
    result;
  if (publish) {
    async function emit(context, state, description) {
      const { data: current } = await github.rest.pulls.get(parameters);
      const changed = changedContext(
        current,
        'PR context changed before status write',
      );
      if (changed) {
        result = changed;
        state = 'failure';
        description = result.message;
      }
      await github.rest.repos.createCommitStatus({
        owner,
        repo,
        sha: initial.head.sha,
        context,
        state,
        description: description.slice(0, 140),
      });
    }
    // Hold the existing required context until BOTH policy and actual primary
    // checks pass. Label/review revocation then blocks the same required name.
    await emit(
      AGGREGATOR,
      result.allowed ? 'pending' : 'failure',
      'Verifying live budget approval and primary checks',
    );
    await emit(
      APPROVAL_CONTEXT,
      result.allowed ? 'success' : 'failure',
      `${result.code}: ${result.message}`,
    );
    if (result.allowed) {
      const { data: runs } = await github.rest.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: 'pr-checks.yml',
        head_sha: initial.head.sha,
        event: 'pull_request',
        per_page: 1,
      });
      const source = runs.workflow_runs?.[0];
      const validSource =
        source &&
        source.head_sha === initial.head.sha &&
        source.event === 'pull_request' &&
        [source.id, source.check_suite_id, source.run_attempt].every(
          (value) => Number.isSafeInteger(value) && value > 0,
        );
      const { data } = await github.rest.checks.listForRef({
        owner,
        repo,
        ref: initial.head.sha,
        check_name: AGGREGATOR,
        filter: 'latest',
        per_page: 100,
      });
      if (!Array.isArray(data.check_runs))
        throw new Error('Primary check census unavailable');
      const checks = data.check_runs.filter(
        (check) =>
          check.name === AGGREGATOR &&
          check.app?.slug === 'github-actions' &&
          check.check_suite?.id === source?.check_suite_id,
      );
      const valid = checks.every(
        (check) => Number.isSafeInteger(check.id) && check.id > 0,
      );
      const latest = valid ? checks.sort((a, b) => b.id - a.id)[0] : null;
      const freshCheck =
        latest &&
        Number.isFinite(Date.parse(latest.started_at)) &&
        Date.parse(latest.started_at) >= Date.parse(source?.run_started_at);
      const state =
        !validSource || source.status !== 'completed'
          ? 'pending'
          : source.conclusion !== 'success'
            ? 'failure'
            : freshCheck && latest.status === 'completed'
              ? latest.conclusion === 'success'
                ? 'success'
                : 'failure'
              : 'pending';
      await emit(
        AGGREGATOR,
        state,
        `Budget policy passed; primary check ${state}`,
      );
    }
  }
  return {
    ...result,
    ...(result.allowed ? {} : seen),
    evaluatedHead: initial.head.sha,
    currentHead: result.currentHead ?? initial.head.sha,
  };
}

/**
 * How a status-publishing job ends for one PR. A superseded head (the only
 * change was a new head) is not a failure of the job: the refusal is already
 * on the evaluated head, and the new head gets its own run. Every other
 * refusal fails the job. The log line names the PR and both heads.
 */
export function guardOutcome(number, result) {
  const line =
    `PR #${number}: ${result.code} (evaluated ${result.evaluatedHead}, ` +
    `current ${result.currentHead}): ${result.message}`;
  if (result.allowed) return { fail: false, line };
  // Exempt only a pure head change: a label or base change in the same window,
  // or an evaluation bound to another head, is a refusal and fails the job.
  if (
    result.code === 'changed-context' &&
    result.headChanged &&
    !result.baseChanged &&
    !result.labelsChanged &&
    !result.snapshotMismatch
  )
    return {
      fail: false,
      line: `${line}; superseded head: refusal written to the evaluated head only, the new head gets its own run`,
    };
  return { fail: true, line };
}
