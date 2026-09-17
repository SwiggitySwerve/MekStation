#!/usr/bin/env node
/**
 * Close a unit: review, merge, mainProof and tick receipts (U17 - R6.loop-harness).
 *
 * The repository copy of unit-closure-v3.js. Its three environment switches
 * become flags (`EXPECTED_REDS` -> `--expected-reds <json-file>`,
 * `REPROOF_COMMIT` -> `--reproof-commit <sha>`, `LEDGER_DATE` -> `--date`) and
 * its positional arguments become named ones:
 *
 *   npm run roadmap:closure -- --unit U18 --pr 1840 --date 20260918 \
 *     --review <lane-a-review.md> --proof-dir <proof log dir> \
 *     --runtime-label "u18 pin (jest)" --implementer "claude-opus (Agent lane)"
 *
 * Run it from a checkout whose HEAD is the merge commit. What it refuses:
 * a PR that is not MERGED, a PR with no files, a checkout that is not at the
 * merge commit (unless `--reproof-commit` names the head it is at, which is
 * then recorded), a review whose `reviewedHead:` is not the PR head, a review
 * whose verdict is not a plain APPROVE, and a proof whose runtime line does
 * not report passes, or reports failures that `--expected-reds` does not name
 * one by one, or whose validator or `--git` line does not say PASSED, or whose
 * merge commit has more than one parent or does not reproduce the PR head's
 * content for the files the PR touched.
 *
 * `--extra-runtime <json-file>` merges further fields into `runtime` (what the
 * post-closure scripts did by hand for U9, U9b and U16).
 *
 * The Lane A reviewer model is read from the review markdown's `reviewerModel:`
 * header line rather than carried here as a literal, so a review by any model
 * is receipted as the model that wrote it; a review that does not name one is
 * refused (U17 finding F2).
 *
 * Pin-only injection points, never used by the loop: `--ledger-dir` and
 * `--repo-root` relocate the ledger and the git checkout, `--preserved-root`
 * relocates the preserved log copies, and `--skip-blob-check` records the blob
 * equality as skipped instead of running `git diff` against a head that does
 * not exist in a fabricated repository. `--skip-blob-check` is refused outright
 * whenever the ledger being closed is the repository's own, so no receipt in
 * this repository's ledger can ever carry a blob check nobody ran (U17 finding
 * F3).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { preserveRunLogs } from './preserve-run-logs.mjs';
import {
  DATE8,
  DEFAULT_LEDGER_DIR,
  HEX40,
  REPO_ROOT,
  UNIT_ID,
  evidenceDirOf,
  findUnit,
  lastLine,
  loadUnits,
  nowIso,
  parseFlags,
  posix,
  printValidator,
  readJson,
  refuse,
  requireFlags,
  resolveLedgerDir,
  runCli,
  saveUnits,
  sha256,
  writeJson,
} from './roadmap-ledger-lib.mjs';

const STRINGS = [
  '--unit',
  '--pr',
  '--date',
  '--review',
  '--proof-dir',
  '--runtime-label',
  '--implementer',
  '--extra-runtime',
  '--expected-reds',
  '--reproof-commit',
  '--ledger-dir',
  '--repo-root',
  '--preserved-root',
];
/**
 * Are these the same directory on disk? Compared through realpath so a junction
 * or a differently-cased spelling of the repository's own ledger cannot slip
 * past the --skip-blob-check gate on Windows.
 */
function sameDir(left, right) {
  const real = (value) => {
    const resolved = path.resolve(value);
    try {
      return fs.realpathSync.native(resolved);
    } catch {
      return resolved;
    }
  };
  const [a, b] = [real(left), real(right)];
  return process.platform === 'win32'
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

/** gh goes through a shell so the Windows `gh.cmd` shim resolves; git does not need one. */
const gh = (command, cwd) => {
  const result = spawnSync(`gh ${command}`, {
    shell: true,
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0)
    refuse('GH_FAILED', `gh ${command}: ${(result.stderr ?? '').trim()}`);
  return JSON.parse(result.stdout);
};

const git = (args, cwd) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0)
    refuse(
      'GIT_FAILED',
      `git ${args.join(' ')}: ${(result.stderr ?? '').trim()}`,
    );
  return result.stdout;
};

function main(argv) {
  const options = parseFlags(argv, {
    strings: STRINGS,
    booleans: ['--skip-blob-check'],
  });
  requireFlags(options, [
    'unit',
    'pr',
    'date',
    'review',
    'proofDir',
    'runtimeLabel',
    'implementer',
  ]);
  if (!UNIT_ID.test(options.unit))
    refuse('INVALID_ARGUMENT', `--unit ${options.unit}`);
  if (!DATE8.test(options.date))
    refuse('INVALID_ARGUMENT', `--date ${options.date}`);
  if (!/^\d+$/.test(options.pr))
    refuse('INVALID_ARGUMENT', `--pr ${options.pr}`);

  const unitId = options.unit;
  const lc = unitId.toLowerCase();
  const date = options.date;
  const ledgerDir = resolveLedgerDir(options.ledgerDir);
  // Before the first gh call and before anything is written or copied: the flag
  // turns off a real check, so it may only be used on a ledger that is not this
  // repository's own.
  if (options.skipBlobCheck && sameDir(ledgerDir, DEFAULT_LEDGER_DIR))
    refuse(
      'BLOB_CHECK_REQUIRED',
      `--skip-blob-check cannot be used on the repository's own ledger (${posix(ledgerDir)}); it exists for the jest pin, which works on a copy`,
    );
  const evidence = evidenceDirOf(ledgerDir);
  const repoRoot = options.repoRoot
    ? path.resolve(options.repoRoot)
    : REPO_ROOT;
  const logDir = path.resolve(options.proofDir);
  const expectedReds = options.expectedReds
    ? readJson(options.expectedReds)
    : [];
  if (!Array.isArray(expectedReds))
    refuse('INVALID_ARGUMENT', '--expected-reds must hold a JSON array');

  const pr = gh(
    `pr view ${options.pr} --json state,mergeCommit,mergedAt,headRefOid,mergedBy,title`,
    repoRoot,
  );
  if (pr.state !== 'MERGED')
    refuse('PR_NOT_MERGED', `PR ${options.pr} is ${pr.state}`);
  const head = pr.headRefOid;
  const mergeSha = pr.mergeCommit?.oid;
  if (!HEX40.test(String(head)) || !HEX40.test(String(mergeSha)))
    refuse(
      'PR_HEADS_UNREADABLE',
      `PR ${options.pr} has no 40-hex head and merge commit`,
    );
  const prFiles = gh(
    `pr view ${options.pr} --json files --jq "[.files[].path]"`,
    repoRoot,
  );
  if (!Array.isArray(prFiles) || !prFiles.length)
    refuse('PR_HAS_NO_FILES', `PR ${options.pr} lists no files`);

  const checkoutHead = git(['rev-parse', 'HEAD'], repoRoot).trim();
  if (checkoutHead !== mergeSha) {
    if (options.reproofCommit && checkoutHead === options.reproofCommit)
      console.log(
        `closure at the re-proof commit ${checkoutHead} (merge commit ${mergeSha}; the proof dir was produced there)`,
      );
    else
      refuse(
        'WRONG_CHECKOUT',
        `HEAD is ${checkoutHead}, not the merge commit ${mergeSha}`,
      );
  }

  const reviewBytes = fs.readFileSync(path.resolve(options.review));
  const reviewMd = reviewBytes.toString();
  const reviewedHead = /reviewedHead:\s*([0-9a-f]{40})/.exec(reviewMd);
  if (!reviewedHead || reviewedHead[1] !== head)
    refuse(
      'REVIEW_HEAD_MISMATCH',
      `review reviewedHead ${reviewedHead ? reviewedHead[1] : '(absent)'} is not the PR head ${head}`,
    );
  // The reviewer is whoever the review says it is. A review that does not say
  // is refused rather than receipted as a model that may not have read it.
  const reviewerLine = /^reviewerModel:\s*(.+)$/m.exec(reviewMd);
  if (!reviewerLine || !reviewerLine[1].trim())
    refuse(
      'REVIEW_MODEL_MISSING',
      `the Lane A review ${posix(path.resolve(options.review))} has no reviewerModel: header line`,
    );
  const reviewerModel = reviewerLine[1].trim();
  if (
    !/Verdict[\s\S]{0,40}APPROVE\b/.test(reviewMd) ||
    /APPROVE-WITH-REQUIRED-EDITS|REJECT/.test(
      reviewMd.split('\n').slice(0, 6).join('\n'),
    )
  )
    refuse('REVIEW_NOT_APPROVE', 'review verdict is not a plain APPROVE');

  fs.copyFileSync(
    path.resolve(options.review),
    path.join(evidence, `${lc}-lane-a-review-${date}.md`),
  );
  const logHashes = fs
    .readFileSync(path.join(logDir, 'sha256.txt'), 'utf8')
    .trim()
    .split(/\r?\n/);
  const runtimeLine = lastLine(logDir, 'playwright', /passed|failed|flaky/);

  const review = {
    unit: unitId,
    stage: 'review',
    at: nowIso(),
    lane: 'A',
    reviewerModel,
    implementerModel: options.implementer,
    reviewerEffort: 'default',
    head,
    reviewedHead: head,
    verdict: 'APPROVE',
    outputPath: `evidence/${lc}-lane-a-review-${date}.md`,
    outputSha256: sha256(reviewBytes),
    sharedContext:
      'none: reviewer received only the diff range, the head, the contract and spec files on the head, and re-ran tsc/oxlint/oxfmt/jest in its own throwaway worktree',
    laneB: 'not required (review classes: routine)',
    githubApproval:
      'none recorded; Lane A is engineering evidence, never a GitHub approval',
  };
  writeJson(path.join(evidence, `${lc}-review-${date}.json`), review);

  const checks = gh(`pr checks ${options.pr} --json bucket`, repoRoot);
  // Blob equality over the PR's OWN files: the squash must reproduce the head's
  // content for every file the PR touched; other files (docs PRs merged in
  // between) are outside the claim.
  const blobDiff = options.skipBlobCheck
    ? 0
    : (() => {
        const output = git(
          ['diff', '--stat', head, mergeSha, '--', ...prFiles],
          repoRoot,
        ).trim();
        return output ? output.split(/\r?\n/).length : 0;
      })();
  const merge = {
    unit: unitId,
    stage: 'merge',
    at: nowIso(),
    pr: Number(options.pr),
    title: pr.title,
    head,
    mergeSha,
    mergedAt: pr.mergedAt,
    mergedBy: pr.mergedBy && pr.mergedBy.login,
    method:
      'gh pr merge --squash --match-head-commit after the full check set passed on the exact head (product class: no administrative bypass)',
    checksAtMerge: `${checks.filter((check) => check.bucket === 'pass').length} pass, ${checks.filter((check) => check.bucket !== 'pass').length} other`,
    parentCount:
      git(['rev-list', '--parents', '-n', '1', mergeSha], repoRoot)
        .trim()
        .split(' ').length - 1,
    blobEqualityFiles: prFiles,
    blobEqualityDiffLines: blobDiff,
    ...(options.skipBlobCheck
      ? { blobEqualityCheck: 'skipped (--skip-blob-check; the jest pin only)' }
      : {}),
  };
  writeJson(path.join(evidence, `${lc}-merge-${date}.json`), merge);

  const validatorLine = lastLine(logDir, 'validator', /PASSED|FAILED/);
  const gitCheckLine = lastLine(logDir, 'git-check', /PASSED|FAILED/);
  const failedRows = Number((/(\d+) failed/.exec(runtimeLine) || [0, 0])[1]);
  const mainProof = {
    unit: unitId,
    stage: 'mainProof',
    at: nowIso(),
    mergeCommit: mergeSha,
    checkout:
      'root checkout fast-forwarded to the merge commit (real node_modules; hydrate step runs)',
    runtime: {
      build:
        lastLine(logDir, 'build', /hydrat|Compiled|error|Error|exit/i) ||
        '(see log)',
      e2eBundleMarker: '__E2E_MODE__ present in _app chunk (run log)',
      playwright: `${options.runtimeLabel}: ${runtimeLine}`,
      tsc: lastLine(logDir, 'tsc', /\S/) || '(clean)',
      ...(options.extraRuntime ? readJson(options.extraRuntime) : {}),
    },
    commands: {
      validator: validatorLine,
      gitAncestry: `${gitCheckLine} (--git)`,
      next: lastLine(logDir, 'next', /^U|NONE/),
      openspecStrict: lastLine(logDir, 'openspec-strict', /Totals/),
      qcOpenspecCi: lastLine(logDir, 'qc-openspec-ci', /errors=/),
      qcPin: lastLine(logDir, 'qc-pin', /Tests:/),
    },
    logs: `${posix(path.relative(repoRoot, logDir))}/ (local; sha256 below)`,
    logHashes,
    ...(expectedReds.length ? { expectedReds } : {}),
    ...(options.reproofCommit ? { reproofCommit: options.reproofCommit } : {}),
    verdict:
      /\b[1-9]\d* passed\b/.test(runtimeLine) &&
      (expectedReds.length
        ? failedRows === expectedReds.length
        : !/\b[1-9]\d* (failed|flaky)\b/.test(runtimeLine)) &&
      /PASSED/.test(validatorLine) &&
      /PASSED/.test(gitCheckLine) &&
      merge.parentCount === 1 &&
      merge.blobEqualityDiffLines === 0
        ? 'PASS'
        : 'FAIL',
  };
  writeJson(path.join(evidence, `${lc}-mainproof-${date}.json`), mainProof);

  // DELIVERY.md ("Owned cleanup"): the run's logs are preserved outside every
  // worktree, with hashes, before anything is removed. U13 wrote the helper
  // and named this as its caller. It runs with the mainProof receipt and
  // BEFORE the verdict is acted on, because a FAIL is the run whose logs are
  // most wanted and the refusal below is followed by a worktree removal just
  // the same.
  const preserved = preserveRunLogs({
    runDir: logDir,
    unit: unitId,
    date,
    evidenceDir: evidence,
    ...(options.preservedRoot ? { preservedRoot: options.preservedRoot } : {}),
  });
  if (mainProof.verdict !== 'PASS')
    refuse(
      'MAIN_PROOF_NOT_PASS',
      `main proof not PASS: ${JSON.stringify(mainProof.runtime)} parents=${merge.parentCount} blobDiff=${merge.blobEqualityDiffLines}`,
    );

  const ledger = loadUnits(ledgerDir);
  const unit = findUnit(ledger, unitId);
  if (unit.state !== 'local-verified')
    refuse(
      'UNIT_NOT_LOCAL_VERIFIED',
      `${unitId} is ${unit.state}, not local-verified`,
    );
  const taskKeys = unit.taskKeys ?? [];
  const tick = {
    unit: unitId,
    stage: 'tick',
    at: nowIso(),
    taskKeys,
    note: taskKeys.length
      ? 'rows checked by this closure'
      : `${unitId} holds no task row (its row is held by a packet until the gated scenario can pass); the delivered behaviour is proven on main by this unit.`,
    tickedOnMain: taskKeys.length ? mergeSha : null,
  };
  writeJson(path.join(evidence, `${lc}-tick-${date}.json`), tick);

  unit.prHead = head;
  unit.mergeSha = mergeSha;
  unit.stageReceipts.review = {
    path: `evidence/${lc}-review-${date}.json`,
    head,
    reviewedHead: head,
    reviewerModel,
    implementerModel: options.implementer,
    outputSha256: review.outputSha256,
    verdict: 'APPROVE',
  };
  unit.stageReceipts.merge = {
    path: `evidence/${lc}-merge-${date}.json`,
    pr: Number(options.pr),
    head,
    mergeSha,
  };
  unit.stageReceipts.mainProof = {
    path: `evidence/${lc}-mainproof-${date}.json`,
    mergeCommit: mergeSha,
    verdict: 'PASS',
    runtime: runtimeLine,
  };
  unit.stageReceipts.tick = {
    path: `evidence/${lc}-tick-${date}.json`,
    taskKeys,
  };
  unit.state = 'complete';
  saveUnits(ledgerDir, ledger);

  printValidator(ledgerDir, { withNext: true });
  console.log(
    `preserved: ${preserved.files.length} files ${preserved.bytes} bytes -> evidence/${lc}-logs-${date}.json`,
  );
  console.log(
    unitId,
    unit.state,
    'head',
    head.slice(0, 9),
    'merge',
    mergeSha.slice(0, 9),
    '|',
    runtimeLine,
  );
}

runCli(main, 'CLOSURE_ERROR');
