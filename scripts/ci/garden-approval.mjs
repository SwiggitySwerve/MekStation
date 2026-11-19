// Approval policy only. G1 owns detection and validation of budget increases.
import { isReportOnlyBudgetId } from './budget-config.mjs';

export const BUDGET_RAISE_LABEL = 'ci-budget-raise';
// Owner rulings that approve owner-authored raises (PARITY-PLAN §186.2). The
// caller reads it at the PR's base commit, never its head, so a PR cannot
// approve itself by adding an entry: the entry must already be in the PR's
// base commit (main as of the PR's last push), not just on main's live tip.
export const BUDGET_RAISE_RECORD_PATH = 'config/ci/approved-budget-raises.json';
const RECORD_SCHEMA = 'mekstation/ci-budget-raise-approvals/v1';
const RULING_SECTION = /^PARITY-PLAN §\d+(\.\d+)?$/;

const sha = (value) =>
  typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
const login = (value) => typeof value === 'string' && value.length > 0;
const object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const keysAre = (value, keys) =>
  object(value) &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify(keys.sort());

/** null for a well-formed record, else the first problem found. */
export function validateApprovalRecord(record) {
  if (
    !keysAre(record, ['schema', 'approvals']) ||
    record.schema !== RECORD_SCHEMA
  )
    return `record must be exactly { schema: ${RECORD_SCHEMA}, approvals }`;
  if (!Array.isArray(record.approvals)) return 'approvals must be an array';
  const seen = new Set();
  for (const [index, entry] of record.approvals.entries()) {
    const where = `approvals[${index}]`;
    if (!keysAre(entry, ['pr', 'key', 'from', 'to', 'ruling']))
      return `${where} must have exactly pr, key, from, to, ruling`;
    if (!Number.isSafeInteger(entry.pr) || entry.pr < 1)
      return `${where}.pr must be a PR number`;
    if (!login(entry.key)) return `${where}.key must be a budget key`;
    if (!Number.isFinite(entry.from) || !Number.isFinite(entry.to))
      return `${where}.from and .to must be numbers`;
    if (
      !keysAre(entry.ruling, ['section', 'quote']) ||
      typeof entry.ruling.section !== 'string' ||
      !RULING_SECTION.test(entry.ruling.section) ||
      typeof entry.ruling.quote !== 'string' ||
      entry.ruling.quote.trim() === ''
    )
      return `${where}.ruling must cite a PARITY-PLAN §N section and quote the owner`;
    const id = `${entry.pr} ${entry.key}`;
    if (seen.has(id)) return `${where} repeats PR #${entry.pr} ${entry.key}`;
    seen.add(id);
  }
  return null;
}

// Every raise in the delta needs this PR's entry with the same key, from and to.
function evaluateRecord(raises, record, number, deny) {
  const problem = validateApprovalRecord(record);
  if (problem)
    return deny(
      'invalid-approval-record',
      `${BUDGET_RAISE_RECORD_PATH}: ${problem}`,
    );
  const sections = new Set();
  for (const raise of raises) {
    const entry = record.approvals.find(
      (candidate) => candidate.pr === number && candidate.key === raise.id,
    );
    if (!entry)
      return deny(
        'missing-approval-record',
        `No owner-ruling entry for PR #${number} ${raise.id} at the base.`,
      );
    if (entry.from !== raise.before || entry.to !== raise.after)
      return deny(
        'approval-record-mismatch',
        `${raise.id}: entry approves ${entry.from} -> ${entry.to}; PR raises ${raise.before} -> ${raise.after}.`,
      );
    sections.add(entry.ruling.section);
  }
  return {
    allowed: true,
    code: 'owner-ruling-record',
    message: `${[...sections].join(', ')} approve ${raises.map((r) => `${r.id} ${r.before}->${r.after}`).join(', ')}.`,
  };
}

export const isOwnerAuthored = (repositoryOwner, pullRequest) =>
  pullRequest.user.id === repositoryOwner.id ||
  pullRequest.user.login.toLowerCase() === repositoryOwner.login.toLowerCase();

// A removed reporting cap (after null) has no finite delta.
const delta = ({ before, after }) =>
  Number.isFinite(before) && Number.isFinite(after)
    ? `+${after - before}`
    : 'unbounded';
const countDeltas = (raises) =>
  raises.map((r) => `${r.id} ${r.before}->${r.after} (${delta(r)})`).join(', ');

/** Count raises are report-only (PARITY-PLAN §193.2); the rest keep approval. */
export function evaluateBudgetRaiseApproval(context) {
  const { raises } = context;
  if (!Array.isArray(raises))
    return {
      allowed: false,
      code: 'invalid-delta',
      message: 'Budget delta is missing or malformed.',
    };
  const counts = raises.filter((raise) => isReportOnlyBudgetId(raise?.id));
  const gated = raises.filter((raise) => !isReportOnlyBudgetId(raise?.id));
  if (counts.length && !gated.length)
    return {
      allowed: true,
      code: 'count-report-only',
      message: `Count budgets are report-only (PARITY-PLAN §193.2): ${countDeltas(counts)}.`,
    };
  const result = evaluateGatedRaises({ ...context, raises: gated });
  return result.allowed && counts.length
    ? {
        ...result,
        message: `${result.message} Report-only counts: ${countDeltas(counts)}.`,
      }
    : result;
}

function evaluateGatedRaises({
  raises,
  repositoryOwner,
  pullRequest,
  reviews,
  approvalRecord,
}) {
  const deny = (code, message) => ({ allowed: false, code, message });
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
  const labelled = pullRequest.labels.some(
    (label) => label?.name === BUDGET_RAISE_LABEL,
  );
  if (isOwnerAuthored(repositoryOwner, pullRequest)) {
    // The owner cannot review their own PR, so only a ruling recorded on the
    // base can approve it. No record at the base keeps the old refusal.
    if (approvalRecord === null || approvalRecord === undefined)
      return deny(
        'self-approval',
        `The PR author cannot approve their own budget increase; an owner ruling in ${BUDGET_RAISE_RECORD_PATH} on the base is required.`,
      );
    if (!labelled)
      return deny(
        'missing-label',
        `Budget increases require ${BUDGET_RAISE_LABEL}.`,
      );
    if (!Number.isSafeInteger(pullRequest.number))
      return deny('invalid-context', 'The PR number is required.');
    return evaluateRecord(raises, approvalRecord, pullRequest.number, deny);
  }
  if (!labelled) {
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
