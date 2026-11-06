import { budgetRaises, validateBudgets } from './budget-config.mjs';
import {
  dependencyCounts,
  dependencyViolations,
} from './budget-dependencies.mjs';
import {
  checkBudgetRaise,
  APPROVAL_CONTEXT,
} from './garden-approval-github.mjs';

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
  if (publish)
    await github.rest.repos.createCommitStatus({
      owner,
      repo,
      sha: fresh.head.sha,
      context: APPROVAL_CONTEXT,
      state: result.allowed ? 'success' : 'failure',
      description: `${result.code}: ${result.message}`.slice(0, 140),
    });
  return result;
}
