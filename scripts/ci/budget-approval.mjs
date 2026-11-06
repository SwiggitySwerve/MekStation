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

/** G3 owns approval; G1 adds its one dependency label rule to the same decision. */
export async function checkBudgetPolicy({
  github,
  owner,
  repo,
  number,
  publish = true,
}) {
  const parameters = { owner, repo, pull_number: number };
  const { data: initial } = await github.rest.pulls.get(parameters);
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
    checkBudgetRaise({
      github: sink,
      owner,
      repo,
      number,
      budgetPath: 'config/ci/budgets.json',
      budgetRaises,
    });
  let result = await evaluateRaise();
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
      else result = await evaluateRaise(); // refresh live reviews after dependency reads
    } catch (error) {
      result = {
        allowed: false,
        code: 'invalid-dependencies',
        message: error.message,
      };
    }
  }
  const { data: fresh } = await github.rest.pulls.get(parameters);
  if (
    fresh.head.sha !== initial.head.sha ||
    fresh.base.sha !== initial.base.sha ||
    JSON.stringify(fresh.labels.map((l) => l.name).sort()) !==
      JSON.stringify(initial.labels.map((l) => l.name).sort())
  )
    result = {
      allowed: false,
      code: 'changed-context',
      message: 'PR head/base/labels changed; rerun required',
    };
  if (publish) {
    async function emit(context, state, description) {
      const { data: current } = await github.rest.pulls.get(parameters);
      if (
        current.head.sha !== initial.head.sha ||
        current.base.sha !== initial.base.sha ||
        JSON.stringify(current.labels.map((l) => l.name).sort()) !==
          JSON.stringify(initial.labels.map((l) => l.name).sort())
      ) {
        result = {
          allowed: false,
          code: 'changed-context',
          message: 'PR context changed before status write',
        };
        state = 'failure';
        description = result.message;
      }
      await github.rest.repos.createCommitStatus({
        owner,
        repo,
        sha: current.head.sha,
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
  return result;
}
