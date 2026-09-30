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
 *     --runtime-label "u18 pin (jest)" --implementer "claude-opus (Agent lane)" \
 *     --review-context "isolated diff" --reviewer-effort "high" \
 *     --checkout "exact merge checkout" --merge-method "squash queue"
 *
 * Run it from a checkout whose HEAD is the merge commit. A failed post-write
 * validation exits non-zero without rollback: the ledger and receipts remain
 * written on disk and must not be published. What it refuses:
 * a PR that is not MERGED, a PR with no files, a checkout that is not at the
 * merge commit (unless `--reproof-commit` names the head it is at, which is
 * then recorded), a review whose `reviewedHead:` is not the PR head, a review
 * whose verdict is not a plain APPROVE, and a proof whose runtime line does
 * not report passes, or reports failures that `--expected-reds` does not name
 * one by one, or whose validator or `--git` line does not say PASSED, or whose
 * merge commit does not have exactly one parent or its whole tree differs
 * from Git's conflict-free integration of that parent and the reviewed head.
 *
 * `--extra-runtime <json-file>` merges further fields into `runtime` (what the
 * post-closure scripts did by hand for U9, U9b and U16).
 *
 * Review context, reviewer effort, checkout and merge method are supplied by
 * their matching flags; omitted values are recorded as not stated by the
 * closer rather than replaced with a fixed claim.
 *
 * The Lane A reviewer model is read from the review markdown's `reviewerModel:`
 * header line rather than carried here as a literal, so a review by any model
 * is receipted as the model that wrote it; a review that does not name one is
 * refused (U17 finding F2).
 *
 * Pin-only injection points, never used by the loop: `--ledger-dir` and
 * `--repo-root` relocate the ledger and the git checkout, `--preserved-root`
 * relocates the preserved log copies, and `--skip-blob-check` records the blob
 * attestation as skipped instead of running Git against a head that does
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
  archiveReviewIdentity,
  reviewIdentityMode,
  validateReviewIdentity,
  validateReviewReceipt,
  identityPath,
  runValidator,
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
  '--review-context',
  '--reviewer-effort',
  '--checkout',
  '--merge-method',
  '--extra-runtime',
  '--expected-reds',
  '--reproof-commit',
  '--ledger-dir',
  '--repo-root',
  '--preserved-root',
  '--review-identity',
  '--engine-records-dir',
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
      `git ${args.join(' ')} (exit ${result.status}): ${(result.stderr ?? '').trim()} ${(result.stdout ?? '').trim()}`,
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

  if (Boolean(options.reviewIdentity) !== Boolean(options.engineRecordsDir))
    refuse(
      'REVIEW_IDENTITY_INVALID',
      '--review-identity requires --engine-records-dir and conversely',
    );
  const modern = Boolean(options.reviewIdentity);
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
  const ledger = loadUnits(ledgerDir);
  const unit = findUnit(ledger, unitId);
  validateReviewReceipt(ledgerDir, unit);
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

  const reviewClasses = Array.isArray(unit.reviewClasses)
    ? unit.reviewClasses
    : [];
  const rulingPacket = (ledger.packets ?? []).find(
    (packet) =>
      (packet.blocks ?? []).includes(unitId) &&
      packet.decision?.option &&
      packet.ruling?.ruledHead === head,
  );
  const needsOwnerRuling = reviewClasses.some(
    (reviewClass) => reviewClass !== 'routine',
  );
  if (needsOwnerRuling && !rulingPacket)
    refuse(
      'OWNER_RULING_MISSING',
      `${unitId} has no owner ruling bound to PR head ${head}`,
    );
  const laneB = needsOwnerRuling
    ? (() => {
        const ruling = rulingPacket.ruling;
        const details = [
          ruling.pr === undefined ? null : `PR #${ruling.pr}`,
          ruling.commentId === undefined ? null : `comment ${ruling.commentId}`,
          ruling.label === undefined ? null : `label ${ruling.label}`,
        ].filter(Boolean);
        return `owner ruling ${rulingPacket.id}: ${rulingPacket.decision.option} on ${ruling.ruledHead}${details.length ? ` (${details.join(', ')})` : ''}`;
      })()
    : 'not required (review classes: routine)';

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

  if (
    !modern &&
    (reviewIdentityMode(unit.stageReceipts.local) ||
      /^reviewContractVersion:/m.test(reviewMd))
  )
    refuse(
      'REVIEW_IDENTITY_INVALID',
      'modern local/prolog requires both identity flags',
    );
  if (!modern)
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
    reviewerEffort: options.reviewerEffort ?? 'not stated by the closer',
    head,
    reviewedHead: head,
    verdict: 'APPROVE',
    outputPath: `evidence/${lc}-lane-a-review-${date}.md`,
    outputSha256: sha256(reviewBytes),
    sharedContext: options.reviewContext ?? 'not stated by the closer',
    laneB,
    githubApproval:
      'none recorded; Lane A is engineering evidence, never a GitHub approval',
  };
  const verifiedIdentity = modern
    ? validateReviewIdentity({
        ledgerDir,
        unit,
        review: { ...review, reviewContractVersion: 2 },
        manifestFile: options.reviewIdentity,
        engineRecordsDir: options.engineRecordsDir,
        reviewBytes,
      })
    : null;
  if (!modern)
    writeJson(path.join(evidence, `${lc}-review-${date}.json`), review);

  const checks = gh(`pr checks ${options.pr} --json bucket`, repoRoot);
  const parents = git(['rev-list', '--parents', '-n', '1', mergeSha], repoRoot)
    .trim()
    .split(' ')
    .slice(1);
  if (parents.length !== 1)
    refuse('MERGE_PARENT_COUNT', `${mergeSha} has ${parents.length} parents`);
  // Native merge semantics retain intervening parent edits, including edits
  // in reviewed files. Whole-tree equality also detects drift outside them.
  const treeIntegration = options.skipBlobCheck
    ? null
    : (() => {
        if (git(['rev-parse', `${head}^{commit}`], repoRoot).trim() !== head)
          refuse('MERGE_ANCESTRY_INVALID', `${head} is not a commit identity`);
        const parent = parents[0];
        const mergeBases = git(['merge-base', '--all', parent, head], repoRoot)
          .trim()
          .split(/\r?\n/);
        if (
          mergeBases.includes(head) ||
          git(['merge-base', mergeSha, head], repoRoot).trim() === mergeSha
        )
          refuse(
            'MERGE_ANCESTRY_INVALID',
            `${head} is already in ${parent} or includes reported merge ${mergeSha}`,
          );
        // A conflicted merge-tree may print a tree; git() must accept exit 0
        // before that output can become an attestation.
        const expectedTree = git(
          ['merge-tree', '--write-tree', '--no-messages', parent, head],
          repoRoot,
        ).trim();
        if (!HEX40.test(expectedTree))
          refuse(
            'GIT_FAILED',
            `merge-tree returned no single tree: ${expectedTree}`,
          );
        const actualTree = git(
          ['rev-parse', `${mergeSha}^{tree}`],
          repoRoot,
        ).trim();
        return {
          parent,
          mergeBases,
          expectedTree,
          actualTree,
          matches: expectedTree === actualTree,
        };
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
    method: options.mergeMethod ?? 'not stated by the closer',
    checksAtMerge: `${checks.filter((check) => check.bucket === 'pass').length} pass, ${checks.filter((check) => check.bucket !== 'pass').length} other`,
    parentCount: parents.length,
    ...(options.skipBlobCheck
      ? { blobEqualityCheck: 'skipped (--skip-blob-check; the jest pin only)' }
      : { treeIntegration }),
  };
  if (!modern)
    writeJson(path.join(evidence, `${lc}-merge-${date}.json`), merge);

  const validatorLine = lastLine(logDir, 'validator', /PASSED|FAILED/);
  const gitCheckLine = lastLine(logDir, 'git-check', /PASSED|FAILED/);
  const failedRows = Number((/(\d+) failed/.exec(runtimeLine) || [0, 0])[1]);
  const mainProof = {
    unit: unitId,
    stage: 'mainProof',
    at: nowIso(),
    mergeCommit: mergeSha,
    checkout: options.checkout ?? 'not stated by the closer',
    runtime: {
      build:
        lastLine(logDir, 'build', /hydrat|Compiled|error|Error|exit/i) ||
        '(see log)',
      e2eBundleMarker: 'not stated by the closer',
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
      (options.skipBlobCheck || treeIntegration.matches)
        ? 'PASS'
        : 'FAIL',
  };
  if (!modern)
    writeJson(path.join(evidence, `${lc}-mainproof-${date}.json`), mainProof);

  // DELIVERY.md ("Owned cleanup"): the run's logs are preserved outside every
  // worktree, with hashes, before anything is removed. U13 wrote the helper
  // and named this as its caller. It runs with the mainProof receipt and
  // BEFORE the verdict is acted on, because a FAIL is the run whose logs are
  // most wanted and the refusal below is followed by a worktree removal just
  // the same.
  const preservation = {
    runDir: logDir,
    unit: unitId,
    date,
    evidenceDir: evidence,
    ...(options.preservedRoot ? { preservedRoot: options.preservedRoot } : {}),
  };
  let preserved = modern ? null : preserveRunLogs(preservation);
  if (mainProof.verdict !== 'PASS')
    refuse(
      'MAIN_PROOF_NOT_PASS',
      `main proof not PASS: ${JSON.stringify(mainProof.runtime)} parents=${merge.parentCount} integration=${JSON.stringify(treeIntegration)}`,
    );

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
      : `${unitId} holds no task row; the delivered behaviour is proven on main by this unit.`,
    tickedOnMain: taskKeys.length ? mergeSha : null,
  };
  if (!modern) writeJson(path.join(evidence, `${lc}-tick-${date}.json`), tick);

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
  if (modern) {
    // Validate the complete prospective ledger in an owned scratch copy. No modern
    // success artifacts/state are published when any existing gate refuses it.
    const staging = fs.mkdtempSync(
      path.join(path.dirname(ledgerDir), 'temp-pri-'),
    );
    const receipts = { review, merge, mainproof: mainProof, tick };
    const outputName = `${lc}-lane-a-review-${date}.md`;
    const materialize = (dir) => {
      const destination = evidenceDirOf(dir);
      fs.writeFileSync(path.join(destination, outputName), reviewBytes);
      for (const [stage, receipt] of Object.entries(receipts))
        writeJson(
          path.join(destination, `${lc}-${stage}-${date}.json`),
          receipt,
        );
    };
    try {
      fs.cpSync(ledgerDir, staging, { recursive: true });
      review.reviewContractVersion = 2;
      unit.stageReceipts.review.reviewContractVersion = 2;
      review.identityEvidence = archiveReviewIdentity(
        staging,
        verifiedIdentity,
      );
      unit.stageReceipts.review.identityEvidence = review.identityEvidence;
      for (const name of [
        outputName,
        ...Object.keys(receipts).map((s) => `${lc}-${s}-${date}.json`),
      ]) {
        if (fs.existsSync(path.join(evidence, name)))
          identityPath(evidence, name);
      }
      materialize(staging);
      saveUnits(staging, ledger);
      const candidate = runValidator(ledgerDir, [
        '--roadmap',
        path.join(staging, 'roadmap.json'),
      ]);
      if (candidate.status !== 0)
        refuse(
          'REVIEW_IDENTITY_INVALID',
          `prospective ledger refused before write: ${candidate.line}`,
        );
      archiveReviewIdentity(ledgerDir, verifiedIdentity);
      materialize(ledgerDir);
      preserved = preserveRunLogs(preservation);
    } finally {
      fs.rmSync(staging, { recursive: true });
    }
  }
  saveUnits(ledgerDir, ledger);

  const validation = printValidator(ledgerDir, { withNext: true });
  if (
    validation.main.status !== 0 ||
    !validation.main.line.includes('ROADMAP VALIDATION PASSED')
  )
    refuse(
      'LEDGER_INVALID_AFTER_WRITE',
      `the ledger on disk was written and now fails validation (${validation.main.line}); it must not be published`,
    );
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
