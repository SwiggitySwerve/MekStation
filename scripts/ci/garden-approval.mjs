// Approval policy only. G1 owns detection and validation of budget increases.
export const BUDGET_RAISE_LABEL = 'ci-budget-raise';

const sha = (value) =>
  typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
const login = (value) => typeof value === 'string' && value.length > 0;

export function evaluateBudgetRaiseApproval({
  raises,
  repositoryOwner,
  pullRequest,
  reviews,
}) {
  const deny = (code, message) => ({ allowed: false, code, message });
  if (!Array.isArray(raises)) {
    return deny('invalid-delta', 'Budget delta is missing or malformed.');
  }
  if (raises.length === 0) {
    return { allowed: true, code: 'no-raise', message: 'No budget increases.' };
  }
  if (
    !login(repositoryOwner?.login) ||
    repositoryOwner.type !== 'User' ||
    !Number.isSafeInteger(repositoryOwner.id) ||
    !sha(pullRequest?.head?.sha) ||
    !login(pullRequest?.user?.login) ||
    !Number.isSafeInteger(pullRequest?.user?.id) ||
    !Array.isArray(pullRequest.labels) ||
    !Array.isArray(reviews)
  ) {
    return deny(
      'invalid-context',
      'A live human repository owner and complete PR review context are required.',
    );
  }
  if (
    pullRequest.user.id === repositoryOwner.id ||
    pullRequest.user.login.toLowerCase() === repositoryOwner.login.toLowerCase()
  ) {
    return deny(
      'self-approval',
      'The PR author cannot approve their own budget increase.',
    );
  }
  if (!pullRequest.labels.some((label) => label?.name === BUDGET_RAISE_LABEL)) {
    return deny(
      'missing-label',
      `Budget increases require ${BUDGET_RAISE_LABEL}.`,
    );
  }

  const ownerReviews = reviews.filter(
    (review) => review?.user?.id === repositoryOwner.id,
  );
  // Review IDs order events, including multiple submissions in one second.
  // A later comment/dismissal/change request invalidates an earlier approval.
  if (
    ownerReviews.some(
      (review) =>
        !Number.isSafeInteger(review.id) ||
        !Number.isFinite(Date.parse(review.submitted_at)) ||
        review.user.type !== 'User' ||
        review.user.login?.toLowerCase() !==
          repositoryOwner.login.toLowerCase() ||
        !sha(review.commit_id),
    )
  ) {
    return deny(
      'invalid-review',
      'Owner review metadata is incomplete or inconsistent.',
    );
  }
  const latest = ownerReviews.toSorted(
    (a, b) =>
      Date.parse(b.submitted_at) - Date.parse(a.submitted_at) || b.id - a.id,
  )[0];
  if (!latest || latest.state !== 'APPROVED') {
    return deny(
      'owner-approval-required',
      'The latest owner review must explicitly approve this budget increase.',
    );
  }
  if (latest.commit_id !== pullRequest.head.sha) {
    return deny(
      'stale-approval',
      'Owner approval must match the current PR head exactly.',
    );
  }
  return {
    allowed: true,
    code: 'owner-approved',
    message: `Owner review ${latest.id} approves head ${pullRequest.head.sha}.`,
  };
}
