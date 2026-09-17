# Lane A review: U17b

reviewedHead: ca0dbe3d1089ebee5e2738c885064c07bb3f50a2
baseline: f018e34cc150d9ede58e39a32929c5c9dec7d9b6
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

This is pass 2. Pass 1 reviewed fb2adc7e1e3dabcb4168285e0aa1642b8370a044 (the
head Linux CI failed six closure cases on); this review is from scratch on
the new head ca0dbe3d1089ebee5e2738c885064c07bb3f50a2, which fixes revision
1's pin by no longer reading the ambient checkout's own HEAD.

## Setup

- `git -C E:/Projects/MekStation fetch origin`, then `git worktree add
  --detach .sisyphus/roadmap-completion-20260912/worktrees/u17b-review
  ca0dbe3d1089ebee5e2738c885064c07bb3f50a2`.
- `node_modules` junctioned via `cmd /c mklink /J <worktree>\node_modules
  E:\Projects\MekStation\node_modules`.
- Node 22.22.0 on PATH for every node/npm/npx call; `npm_config_dry_run=true`
  set in every shell; `npm install`/`ci`/`prune` never run.
- No build, no Playwright, no commit, no edit to the root checkout. Verified
  clean before, during (repeatedly) and after every probe: `git -C
  E:/Projects/MekStation status --short` printed nothing at every check.
- All scratch probing lived under my own scratchpad
  (`independent-safety-probe.mjs`, `probe-fidelity.mjs`) plus temporary
  directories the probes created and removed themselves (`os.tmpdir()`, or
  `openspec/planning/<prefix>-*` inside the review worktree only, cleaned up
  in every probe and reconfirmed clean by `git status --short`).

## Files on the range (f018e34cc..ca0dbe3d1, `git diff --numstat`)

```
204  openspec/planning/2026-09-12-roadmap-completion/evidence/u17b-admission-20260917.json
325  openspec/planning/2026-09-12-roadmap-completion/evidence/u17b-local-20260917.json
199  openspec/planning/2026-09-12-roadmap-completion/evidence/u17b-red-20260917.json
2    package.json
802  scripts/__tests__/roadmap-loop-closure-proof.test.ts
276  scripts/qc/roadmap-main-proof.mjs
429  scripts/qc/roadmap-unit-closure.mjs
```

Nothing else changed in the range. Between revision 1 (fb2adc7e1) and
revision 2 (ca0dbe3d1) only three files changed (`git diff --stat
fb2adc7e1..ca0dbe3d1`): the pin (+118/-56 net) and the two u17b evidence
receipts. No product module differs between the two heads.

## Findings

1. **[Verified, no defect] Fidelity: receipt shapes match U17's real
   on-main receipts key-for-key and type-for-type.** I wrote an independent
   harness (not the shipped pin) that copies the real ledger, fabricates a
   unit, a merged-PR `gh`, a one-parent throwaway merge commit and a proof
   directory, runs `scripts/qc/roadmap-unit-closure.mjs` for real, and diffs
   the produced `review`/`merge`/`mainProof`/`tick` receipts' key lists and
   per-key `typeof` against the real
   `evidence/u17-{review,merge,mainproof,tick}-20260917.json` on main.
   `review`, `mainProof` and `tick` matched key-for-key, order-for-order,
   with no type mismatch on any shared key. `merge` carried one extra key,
   `blobEqualityCheck` — expected and by design: my harness had to pass
   `--skip-blob-check` (the fabricated PR head is not a real git object, so
   a real blob diff would fail for an unrelated reason), and the closure
   only adds that key when the flag is used; U17's real receipt never used
   the flag, which is exactly what `u17b-admission-20260917.json`'s own
   `conditionalKeys` note says. Not a fidelity gap.
2. **[Verified, no defect] `--skip-blob-check` is refused before any `gh`
   call, and before any write, against "the repository's own ledger."** I
   built a throwaway mirror whose own default ledger is a stub (same
   technique the shipped pin's F3 case uses, but authored independently),
   put it on a PATH with **no `gh` binary at all**, and ran the closure
   with `--skip-blob-check` and no `--ledger-dir`. Result: exit 1,
   `BLOB_CHECK_REQUIRED` (not `GH_FAILED`, which is what a late gate would
   have produced once it hit the first missing-`gh` call) — proving the
   gate fires before `gh` is ever invoked. `units.json` sha256 was
   identical before and after; the evidence directory stayed empty.
   (`scripts/qc/roadmap-unit-closure.mjs:156-160`.)
3. **[Verified, no defect] A review with no `reviewerModel:` header is
   refused.** Independent run: exit 1, stderr contains
   `REVIEW_MODEL_MISSING`, unit stays `local-verified`, no review receipt
   written.
4. **[Verified, no defect] A review naming a head other than the PR head is
   refused.** Independent run: exit 1, stderr contains
   `REVIEW_HEAD_MISMATCH`.
5. **[Verified, no defect] A failing runtime line yields verdict FAIL and a
   refusal, and the U13 log manifest is still written and still lists
   exactly the proof directory's own files on that FAIL path.** Independent
   run with a `"3 failed / 9 passed"` playwright line: exit 1, stderr
   `MAIN_PROOF_NOT_PASS`, `mainProof.verdict === 'FAIL'`, and
   `evidence/<unit>-logs-<date>.json` exists with `files` matching
   `fs.readdirSync(proofDir)` exactly. This directly verifies revision 2's
   "preserve before the verdict is acted on" placement independently of the
   shipped pin's own (also-passing) case for it.
6. **[Verified, no defect] `--expected-reds` with a count equal to the
   failures yields PASS and records the array verbatim.** Independent run
   with 2 named rows against a `"2 failed / 6 passed"` line: exit 0,
   verdict PASS, `mainProof.expectedReds` equals the array passed in.
7. **[Verified, no defect] `--reproof-commit` is honoured only when it
   equals the checkout's actual HEAD.** Three independent constructions:
   (a) checkout HEAD is one commit, the fabricated merge commit is a
   different (earlier) one, no `--reproof-commit` named → refused,
   `WRONG_CHECKOUT`; (b) same mismatch, `--reproof-commit` naming the
   checkout's *actual* HEAD → honoured, exit 0, `mainProof.reproofCommit`
   and `mainProof.mergeCommit` recorded distinctly and correctly; (c) same
   mismatch, `--reproof-commit` naming a *third*, unrelated sha (matching
   neither the checkout HEAD nor the merge commit) → still refused. All
   three matched expectations.
8. **[Verified, no defect] `roadmap-main-proof.mjs` refuses a dirty tree
   and a wrong HEAD; `--dry-run` executes nothing.** Independent
   constructions against a fresh one-commit throwaway repo: wrong `--merge`
   sha → exit 1, `WRONG_HEAD`; an uncommitted file present → exit 1,
   `TREE_DIRTY`. For `--dry-run`: `fs.readdirSync` on the throwaway repo
   root, taken before and after the dry run, was byte-identical (same
   sorted array), and no `.sisyphus` directory was created — the clean
   repository held only what it held before.
9. **[Verified, root cause and fix match the claim exactly] Revision 2's
   diff is the pin only; the root cause is real and reproduces live.**
   `git diff --stat fb2adc7e1..ca0dbe3d1` shows exactly the pin file plus
   two evidence receipts changed; both product modules are byte-identical
   between the two heads (confirmed by sha256:
   `roadmap-unit-closure.mjs` = `7b3ba7aa08be8bfff87607a4312324fb266c8dca924f41683c68d50f7c1f2e9d`,
   `roadmap-main-proof.mjs` = `82fd00ecd12e1fc202768d504ef777f20f5192db25c52129fb499aa04f591227`,
   both matching the staged copies at `.sisyphus/roadmap-completion-20260912/u17b-staging/`).
   I independently confirmed the mechanism live rather than trusting the
   evidence file's numbers: `git fetch origin refs/pull/1839/merge` then
   `git rev-list --parents -n 1 FETCH_HEAD` shows the PR's *current*
   merge-preview commit `90bb81c98e75477504adc5ea955c77691e54efe6` has
   **two** parents (`f018e34cc1..` and `ca0dbe3d10..`) — independent, live
   corroboration that a `pull_request`-triggered checkout leaves HEAD at a
   two-parent commit, which is exactly why a pin that fabricates its merge
   commit from the ambient checkout's own HEAD (revision 1's bug) would
   make the closure's correct single-parent guard (`merge.parentCount ===
   1`, required because the loop's merge method is a squash) refuse. The
   fix removes the platform-variable input entirely (the pin now builds its
   own throwaway three-commit repository and passes `--repo-root` to it),
   which is why it is a structural fix rather than an OS-specific patch —
   sound on both platforms by construction, not just by having been tested
   on both.
10. **[Verified, strongest available platform evidence] The fix is now
    confirmed green on the actual Linux CI runner, on the exact reviewed
    head.** `gh pr view 1839 --json headRefOid` returns
    `ca0dbe3d1089ebee5e2738c885064c07bb3f50a2` — the PR's live head is
    exactly the commit under review, not stale. `gh pr checks 1839` shows
    every required check passing, including **`Unit Tests (4/6)` — the
    exact ubuntu-latest job that failed six cases on revision 1**. This
    resolves `u17b-local-20260917.json`'s own recorded non-claim
    ("Revision 2 was not verified on a Linux CI runner... Whether CI is
    green is a claim only the next CI run can make"): that run has since
    happened and is green. Recommend the parent record this in the merge
    receipt rather than carry the stale non-claim forward.
11. **[Finding — Medium, newly identified, not a regression introduced by
    this unit] Two of the closure's own documented refusal conditions have
    no load-bearing test in any of the 18 pin cases.** The closure's doc
    comment (`scripts/qc/roadmap-unit-closure.mjs:20`) advertises refusing
    a proof "whose validator or `--git` line does not say PASSED." I
    mutated `roadmap-unit-closure.mjs:335-336` (`/PASSED/.test(validatorLine)
    && /PASSED/.test(gitCheckLine)` → `true && true`), re-ran the full pin,
    and all 18 cases stayed green — this mutant is **equivalent** under the
    current pin. Every `seedProofDir` fixture in the pin hardcodes a
    `PASSED` line for both `validator.log` and `git-check.log`, so no case
    ever exercises the FAILED path for either. I restored the file and
    confirmed sha256 `7b3ba7aa08be8bfff87607a4312324fb266c8dca924f41683c68d50f7c1f2e9d`
    matches the pre-mutant hash exactly, and re-ran the pin green (18/18)
    to confirm the restore. Separately, `PR_NOT_MERGED` and `PR_HAS_NO_FILES`
    are likewise never exercised — every fake-`gh` response in the pin
    reports `state: "MERGED"` with a non-empty `files` array. None of this
    is introduced by U17b (the fixtures are carried over from the
    originally-staged pin, and this unit's brief was narrowly to resolve
    F2/F3 and move the preserve call, not to add full mutation coverage),
    and it is the same shape of gap the local receipt already discloses
    elsewhere ("roadmap-main-proof.mjs's execution branch... still has NO
    test"). It is not, however, currently listed among `u17b-local`'s
    `nonClaims` or `findingsReportedNotFixed` (F8-F13), so it is new
    information for the ledger. Recommend the parent record it as a new
    finding (e.g. F14) for a follow-up unit rather than block this one on
    it — closing it here would need new cases beyond this unit's stated
    scope.
12. **[Informational, not a defect] The charter's "768 pin lines" figure is
    stale.** `wc -l scripts/__tests__/roadmap-loop-closure-proof.test.ts`
    on the reviewed head gives 802 lines, matching both `git diff
    --numstat` on the full range and `u17b-local-20260917.json`'s own
    `lineCounts.pin.total: 802`. 768 was revision 1's pin length
    (`u17b-local`'s `pin.revisionOne: 768`); the charter text carried the
    older number forward. Not a discrepancy in the diff itself.
13. **[Verified, no defect] Cap arithmetic and scope.** `wc -l` on the
    reviewed head: `roadmap-unit-closure.mjs` 429, `roadmap-main-proof.mjs`
    276, `package.json` diff +2 lines → 707 product lines against the
    500-line cap (207 over), matching `u17b-local`'s own figures exactly.
    The overage is fully traced there: 660 lines were already staged
    before this lane touched anything (382 + 276 + 2, the exact figure U17
    moved out of its own count), and this lane added 47 lines, every one
    attributable to F2 (reviewer-model parse + refusal), F3
    (`--skip-blob-check` gate + `sameDir` helper) or the preserve-before-
    verdict move. I did not find dead code: every name imported from
    `roadmap-ledger-lib.mjs` into the closure (`DATE8`,
    `DEFAULT_LEDGER_DIR`, `HEX40`, `REPO_ROOT`, `UNIT_ID`, `evidenceDirOf`,
    `findUnit`, `lastLine`, `loadUnits`, `nowIso`, `parseFlags`, `posix`,
    `printValidator`, `readJson`, `refuse`, `requireFlags`,
    `resolveLedgerDir`, `runCli`, `saveUnits`, `sha256`, `writeJson`) is
    used at least once beyond its own import line (checked by grep), and I
    saw no unreachable branch on inspection. `git diff --numstat` across
    the whole baseline..head range confirms the seven files listed above
    and nothing else — no path outside `scripts/qc`, `scripts/__tests__`,
    `package.json` and the three `u17b-*` receipts.
14. **[Verified, no defect] No AI attribution; no absolute machine paths;
    no staging references.** `git diff` over the full range, grepped for
    `co-authored-by|generated with|claude|anthropic|gpt|openai`
    case-insensitively, returns only receipt data
    (`implementerModel`/`reviewerModel` field values such as
    `"claude-opus (Agent lane)"`, and pin fixture literals such as
    `REVIEWER = 'gpt-5.6-luna (Agent model: luna)'`) — never a commit
    trailer or PR-attribution line; both commit messages
    (`fb2adc7e1`, `ca0dbe3d1`) carry none either. A separate grep for
    `E:[\\/]|C:[\\/]|wroll|AppData` over the four shipped
    product/pin/package files returns nothing. A grep for `u17b-staging`
    over the same four files returns nothing.
15. **[Verified, no defect] Regression: U17's and U13's pins stay green.**
    `npx jest scripts/__tests__/roadmap-loop-closure-proof.test.ts
    scripts/__tests__/roadmap-loop-scripts.test.ts
    scripts/__tests__/preserve-run-logs.test.ts` → `Tests: 47 passed, 47
    total` (18 + 13 + 16), exit 0.
16. **[Verified] Root checkout untouched throughout.** `git -C
    E:/Projects/MekStation status --short` printed nothing at every check
    across the whole review, including immediately after every mutant
    application/restoration and every probe run.

## Gates

| Gate | Last line | Exit |
|---|---|---|
| `npx jest scripts/__tests__/roadmap-loop-closure-proof.test.ts scripts/__tests__/roadmap-loop-scripts.test.ts scripts/__tests__/preserve-run-logs.test.ts` | `Tests: 47 passed, 47 total` | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxfmt --check scripts/qc/roadmap-unit-closure.mjs scripts/qc/roadmap-main-proof.mjs scripts/__tests__/roadmap-loop-closure-proof.test.ts package.json` | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` | 0 |
| `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |
| `gh pr checks 1839` (live, head confirmed = reviewedHead via `gh pr view 1839 --json headRefOid`) | all required checks `pass`, including `Unit Tests (4/6)` | n/a (all rows `pass`) |
| Mutant: `REVIEW_NOT_APPROVE` guard → `if (false)` (novel, not in the receipt's mutant list) | `Tests: 1 failed, 17 passed, 18 total` — killed by "refuses a review whose verdict is not a plain APPROVE"; restored sha256 matches | 1 (mutant), 0 (restore + re-run) |
| Mutant: `validator`/`git-check` PASSED conjuncts → `true && true` (novel) | `Tests: 18 passed, 18 total` — **equivalent, not killed**; restored sha256 matches | 0 (both mutant and restore, since nothing catches it) |
| 30-case independent safety probe (own harness, not the shipped pin) | `TOTAL: 30 passed, 0 failed` | 0 |
| Independent fidelity probe (own harness) | review/mainProof/tick key+type match exact; merge differs only by the documented conditional `blobEqualityCheck` key | 0 |

## Cap

707 product lines (429 + 276 + 2) against the 500-line cap: over by 207.
Fully disclosed and arithmetically traced in `u17b-local-20260917.json`
(`overageArithmetic`, `findingsReportedNotFixed` F9). The council-accepted
exception is that U17's generators were already split once at this cap and
a further split would separate the closure from the main proof, which the
loop runs as a pair. No assertion was dropped to shrink the count. 7 of 15
files — inside the file-count cap.

## Verdict rationale

Every gate the charter named passes, on the exact reviewed head, in a
detached read-only worktree. I independently reconstructed (not merely
re-ran) the fidelity check, all seven named safety checks, and the
platform root-cause claim, in every case getting the same answer the
lane's own evidence claims — plus two pieces of evidence the lane could not
have produced itself: a live two-parent measurement of the PR's *current*
merge-preview ref, and a live, green post-fix Linux CI run on the exact
reviewed head (resolving the lane's own "not verified on Linux" non-claim).
I also found one genuine, previously-undisclosed test-coverage gap
(finding 11): two of the closure's documented refusal conditions
(validator/git-check PASSED, PR_NOT_MERGED, PR_HAS_NO_FILES) have no
load-bearing case in the 18-case pin, demonstrated by an equivalent mutant.
This is real and should be logged, but it is a coverage gap inherited from
the originally-staged pin rather than a regression this unit introduced,
it does not contradict any claim the lane made, and it matches the shape
of non-claims the repository's own convention already accepts rather than
blocks on (e.g. the main-proof execution branch having no test). The cap
overage is large but fully disclosed, arithmetically reconciled, and
already council-accepted as this unit's known exception. No AI
attribution, no absolute machine paths, no staging references, and the
diff touches nothing outside its owned paths. Verdict: **APPROVE**, with
finding 11 recommended for a follow-up finding entry rather than a
required edit to this head.
