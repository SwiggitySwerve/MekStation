import { evaluateBudgetRaiseApproval } from './garden-approval.mjs';

export const APPROVAL_CONTEXT = 'CI Budget Raise Approval';

// github is an authenticated Octokit client, injected by trusted github-script.
// Only JSON blobs are read from a PR. Its scripts are never executed.
export async function checkBudgetRaise({
  github,
  owner,
  repo,
  number,
  budgetPath,
  budgetRaises,
}) {
  const repository = { owner, repo };
  const [{ data: metadata }, { data: pr }] = await Promise.all([
    github.rest.repos.get(repository),
    github.rest.pulls.get({ ...repository, pull_number: number }),
  ]);
  const readBudget = async (ref, allowMissing) => {
    try {
      const { data } = await github.rest.repos.getContent({
        ...repository,
        path: budgetPath,
        ref,
      });
      if (data.encoding !== 'base64' || typeof data.content !== 'string') {
        throw new Error('Budget file must be an ordinary base64 JSON blob.');
      }
      return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    } catch (error) {
      if (allowMissing && error.status === 404) return null;
      throw error;
    }
  };
  let result;
  let raises;
  try {
    const [base, head, reviews] = await Promise.all([
      readBudget(pr.base.sha, true),
      readBudget(pr.head.sha, true),
      github.paginate(github.rest.pulls.listReviews, {
        ...repository,
        pull_number: number,
        per_page: 100,
      }),
    ]);
    // The trusted G1 owner validates both schemas and detects every relaxation.
    raises = budgetRaises(base, head);
    result = evaluateBudgetRaiseApproval({
      raises,
      repositoryOwner: metadata.owner,
      pullRequest: pr,
      reviews,
    });
  } catch (error) {
    result = { allowed: false, code: 'invalid-budget', message: error.message };
  }

  // A synchronize/label/review event may race this read. Never bless a new head
  // using an old approval, and do not leave a successful status after label loss.
  const { data: fresh } = await github.rest.pulls.get({
    ...repository,
    pull_number: number,
  });
  const headChanged = fresh.head.sha !== pr.head.sha;
  const baseChanged = fresh.base.sha !== pr.base.sha;
  const labelsChanged =
    JSON.stringify(fresh.labels.map((label) => label.name).sort()) !==
    JSON.stringify(pr.labels.map((label) => label.name).sort());
  if (headChanged || baseChanged || labelsChanged) {
    // The flags travel with the refusal, so a caller can keep the evidence.
    result = {
      allowed: false,
      code: 'changed-context',
      message:
        'PR head, base or labels changed during approval evaluation; rerun required.',
      headChanged,
      baseChanged,
      labelsChanged,
    };
  } else if (result.allowed && raises?.length) {
    try {
      const reviews = await github.paginate(github.rest.pulls.listReviews, {
        ...repository,
        pull_number: number,
        per_page: 100,
      });
      result = evaluateBudgetRaiseApproval({
        raises,
        repositoryOwner: metadata.owner,
        pullRequest: fresh,
        reviews,
      });
    } catch (error) {
      result = {
        allowed: false,
        code: 'review-refresh-failed',
        message: error.message,
      };
    }
  }
  // Only the head this run evaluated gets a status (never a newer head).
  await github.rest.repos.createCommitStatus({
    ...repository,
    sha: pr.head.sha,
    state: result.allowed ? 'success' : 'failure',
    context: APPROVAL_CONTEXT,
    description: `${result.code}: ${result.message}`.slice(0, 140),
  });
  // The caller checks this against the head it is publishing for.
  return { ...result, evaluatedHead: pr.head.sha };
}
