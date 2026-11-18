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
const targetsMain = (pr, owner, repo) =>
  pr.base?.ref === 'main' &&
  pr.base?.repo?.full_name?.toLowerCase() === `${owner}/${repo}`.toLowerCase();
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

/**
 * Read-only calls evaluate one PR. Real success statuses additionally require
 * every open associated PR into main at that SHA to pass the same policy.
 */
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
  // Every PR snapshot this evaluation reads, outer and nested, in order. All
  // evidence about a changed context comes from this one log (see
  // supersededHeadProof); nothing is carried from one result to the next.
  const reads = [];
  let phase = 'evaluation';
  const readPr = async (params, readPhase = phase) => {
    const response = await github.rest.pulls.get(params);
    const pr = response.data;
    reads.push({
      number: params.pull_number,
      phase: readPhase,
      head: pr.head.sha,
      base: pr.base.sha,
      labels: labelKey(pr),
    });
    return response;
  };
  const { data: initial } = await readPr(parameters);
  if (!targetsMain(initial, owner, repo))
    return {
      // Existing read-only aggregators also treat this as a successful no-op.
      allowed: true,
      code: 'not-main',
      eligible: false,
      message: `PR #${number}: not-main; target is outside ${owner}/${repo}:main; no policy evaluated or statuses written`,
      evaluatedHead: null,
      currentHead: initial.head.sha,
      supersededHead: false,
      reads,
    };
  // An unbound or superseded run evaluated nothing, so it writes nothing.
  if (!boundHead)
    return {
      allowed: false,
      code: 'unbound-run',
      message: `PR #${number}: this run names no valid head to evaluate; ${STALE_REF_REMEDY}`,
      unbound: true,
      supersededHead: false,
      evaluatedHead: null,
      currentHead: initial.head.sha,
      reads,
    };
  if (boundHead !== initial.head.sha)
    return {
      allowed: false,
      code: 'changed-context',
      message: `This run is for superseded head ${boundHead}; the PR is at ${initial.head.sha}`,
      // Proof: the one read shows another head; nothing was evaluated or written.
      supersededHead: true,
      evaluatedHead: boundHead,
      currentHead: initial.head.sha,
      reads,
    };
  // A run writes statuses only to the SHA it evaluated (initial.head.sha), never
  // to a SHA it did not evaluate. On a head change the refusal lands on the old
  // head; the new head carries no status from this run, so the required
  // `Lint and Test` context is absent there (blocked) until its own run reports.
  // On a label or base change with the same head, evaluated and current are the
  // same SHA, so a revoked label still fails that head.
  const changedContext = (current, message) =>
    current.head.sha !== initial.head.sha ||
    current.base.sha !== initial.base.sha ||
    labelKey(current) !== labelKey(initial)
      ? {
          allowed: false,
          code: 'changed-context',
          message,
          currentHead: current.head.sha,
        }
      : null;
  // Every part of one evaluation must be about initial.head.sha: the nested
  // approval check reads its own PR snapshot, so an X→Y→X sequence could
  // otherwise evaluate Y and publish to X. A nested result that names no head
  // is treated the same way (fail closed).
  const sink = {
    rest: {
      ...github.rest,
      pulls: { ...github.rest.pulls, get: readPr },
      repos: {
        ...github.rest.repos,
        createCommitStatus: async (data) => ({ data }),
      },
    },
    paginate: github.paginate,
  };
  const nested = [];
  const boundRaise = async () => {
    const raise = await checkRaise({
      github: sink,
      owner,
      repo,
      number,
      budgetPath: 'config/ci/budgets.json',
      budgetRaises,
    });
    nested.push({ code: raise.code, evaluatedHead: raise.evaluatedHead });
    return raise.evaluatedHead !== initial.head.sha
      ? {
          allowed: false,
          code: 'changed-context',
          message: 'Approval evaluated a different head than this run',
          currentHead: raise.evaluatedHead ?? null,
        }
      : raise;
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
  phase = 'after';
  const { data: fresh } = await readPr(parameters);
  result =
    changedContext(fresh, 'PR head/base/labels changed; rerun required') ??
    result;
  if (publish) {
    // Commit statuses are shared by all PRs at this SHA. Evaluate every open
    // associated PR into main, not only the event's PR, using the same policy.
    // Its reads still pass through this evaluation's recording client.
    async function associatedRefusal(readPhase) {
      try {
        const associated = await github.paginate(
          github.rest.repos.listPullRequestsAssociatedWithCommit,
          { owner, repo, commit_sha: initial.head.sha, per_page: 100 },
        );
        const numbers = [
          ...new Set(
            associated
              .filter(
                (pr) =>
                  pr.state === 'open' &&
                  pr.head?.sha === initial.head.sha &&
                  targetsMain(pr, owner, repo),
              )
              .map((pr) => pr.number),
          ),
        ];
        const recording = {
          ...sink,
          rest: {
            ...sink.rest,
            pulls: {
              ...sink.rest.pulls,
              get: (params) => readPr(params, readPhase),
            },
          },
        };
        for (const associatedNumber of numbers) {
          if (!Number.isSafeInteger(associatedNumber) || associatedNumber < 1)
            throw new Error('Invalid associated PR number');
          const checked = await checkBudgetPolicy({
            github: recording,
            owner,
            repo,
            number: associatedNumber,
            publish: false,
            expectedHead: initial.head.sha,
          });
          // The live read may show a retarget after the association snapshot.
          if (checked.code === 'not-main') continue;
          if (
            checked.allowed !== true ||
            checked.unbound === true ||
            checked.evaluatedHead !== initial.head.sha
          )
            return {
              allowed: false,
              code: 'associated-pr-refused',
              message: `PR #${associatedNumber} blocks approval for this head: ${checked.message}`,
            };
        }
        return null;
      } catch (error) {
        return {
          allowed: false,
          code: 'associated-pr-read-failed',
          message: `Associated PR approval unavailable: ${error.message}`,
        };
      }
    }
    const write = (context, state, description) =>
      github.rest.repos.createCommitStatus({
        owner,
        repo,
        sha: initial.head.sha,
        context,
        state,
        description: description.slice(0, 140),
      });
    async function emit(context, state, description) {
      const { data: current } = await readPr(parameters);
      const changed = changedContext(
        current,
        'PR context changed before status write',
      );
      if (changed) {
        result = changed;
        state = 'failure';
        description = result.message;
      }
      if (state === 'success') {
        const refusal = await associatedRefusal('after');
        if (refusal) {
          result = refusal;
          state = 'failure';
          description = result.message;
        }
      }
      await write(context, state, description);
      if (state === 'success') {
        // A concurrent publisher can write a revocation failure between our
        // pre-write read and success. Verify the live PR after the actual write
        // and correct this context on the evaluated head, never a newer head.
        let refusal;
        try {
          const { data: verified } = await readPr(parameters, 'verify');
          refusal =
            changedContext(
              verified,
              'PR context changed after successful status write',
            ) ?? (await associatedRefusal('verify'));
        } catch (error) {
          refusal = {
            allowed: false,
            code: 'verification-read-failed',
            message: `Post-success PR verification unavailable: ${error.message}`,
          };
        }
        if (refusal) {
          result = refusal;
          await write(context, 'failure', result.message);
        }
      }
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
  // Other PRs legitimately have different bases and labels. Their policy
  // refusals fail this job directly; the superseded-head proof concerns only
  // the triggering PR's snapshots, while the returned log retains every read.
  const evidence = observedChanges(
    initial,
    reads.filter((read) => read.number === number),
    nested,
  );
  return {
    ...result,
    ...evidence,
    supersededHead: supersededHeadProof(result, evidence),
    evaluatedHead: initial.head.sha,
    currentHead: result.currentHead ?? initial.head.sha,
    latestHead: reads.at(-1).head,
    reads,
  };
}

const labelKey = (pr) =>
  JSON.stringify(pr.labels.map((label) => label.name).sort());

/**
 * What the read log shows, relative to the run's first read. `reads` holds
 * every PR snapshot the evaluation read (outer and nested) in order;
 * `nested` holds each nested approval result's code and evaluated head.
 */
export function observedChanges(initial, reads, nested) {
  const labels = labelKey(initial);
  return {
    headChanged: reads.some((r) => r.head !== initial.head.sha),
    baseChanged: reads.some((r) => r.base !== initial.base.sha),
    labelsChanged: reads.some((r) => r.labels !== labels),
    // The evaluation itself saw another head, or a nested result was about one.
    snapshotMismatch:
      reads.some(
        (r) => r.phase === 'evaluation' && r.head !== initial.head.sha,
      ) || nested.some((n) => n.evaluatedHead !== initial.head.sha),
    nestedChanged: nested.some((n) => n.code === 'changed-context'),
    headMovedAfter: reads.some(
      (r) =>
        (r.phase === 'after' || r.phase === 'verify') &&
        r.head !== initial.head.sha,
    ),
    // A head move discovered after publishing success must fail the job, even
    // when every evaluation read was clean and no labels or base changed.
    headChangedAfterSuccess: reads.some(
      (r) => r.phase === 'verify' && r.head !== initial.head.sha,
    ),
    // Every other head seen, for the failure message only (no decision reads
    // it): heads from the reads in read order, then heads named by nested
    // results ('(none)' for a result that names no head), each listed once.
    otherHeads: [
      ...new Set([
        ...reads.map((r) => r.head),
        ...nested.map((n) => n.evaluatedHead ?? '(none)'),
      ]),
    ].filter((head) => head !== initial.head.sha),
  };
}

/**
 * The only exemption: positive proof that the run's evaluation was clean and
 * the head moved only afterwards. Every read (outer and nested) kept the base
 * and labels; every evaluation read and every nested result was about the
 * run's head; no nested check refused a changed context; and a read after the
 * evaluation shows a new head. Anything else, including anything this function
 * doesn't know about, is not proof.
 */
export function supersededHeadProof(result, evidence) {
  return (
    result.allowed === false &&
    result.code === 'changed-context' &&
    evidence.baseChanged === false &&
    evidence.labelsChanged === false &&
    evidence.snapshotMismatch === false &&
    evidence.nestedChanged === false &&
    evidence.headChangedAfterSuccess === false &&
    evidence.headMovedAfter === true
  );
}

/**
 * How a status-publishing job ends for one PR. A superseded head (the only
 * change was a new head) is not a failure of the job: the refusal is already
 * on the evaluated head, and the new head gets its own run. Every other
 * refusal fails the job. The log line names the PR and both heads.
 */
export function guardOutcome(number, result) {
  if (result.code === 'not-main') return { fail: false, line: result.message };
  const line =
    `PR #${number}: ${result.code} (evaluated ${result.evaluatedHead}, ` +
    `current ${result.currentHead}): ${result.message}`;
  if (result.allowed === true) return { fail: false, line };
  // The single exemption: checkBudgetPolicy proved a superseded head
  // (supersededHeadProof). Every other refusal fails the job.
  if (result.supersededHead === true)
    return {
      fail: false,
      line: `${line}; superseded head: refusal written to the evaluated head only, the new head gets its own run`,
    };
  // The one designed red case: the head moved while this run was still
  // evaluating. Say so in words, because this job is listed on main's tip.
  if (
    result.code === 'changed-context' &&
    result.headChanged === true &&
    result.baseChanged === false &&
    result.labelsChanged === false &&
    result.snapshotMismatch === true
  )
    return {
      fail: true,
      line:
        `PR #${number}: the PR head changed while this run was still ` +
        `evaluating (evaluated ${result.evaluatedHead}; also seen ` +
        `${(result.otherHeads ?? []).join(', ') || 'another head'}; now ` +
        `${result.latestHead}), so the run refused and fails by design. It ` +
        `wrote failure to ${result.evaluatedHead} only; the run for the PR's ` +
        `current head (${result.latestHead}) decides. This job concerns PR ` +
        `#${number}, not main. (${line})`,
    };
  return { fail: true, line };
}
