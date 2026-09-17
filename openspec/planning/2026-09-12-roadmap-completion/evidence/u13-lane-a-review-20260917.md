# Lane A review: U13
reviewedHead: 33a3f714abc4941bcebd0ff9401fdabd2d3eb6f3
baseline: 7c6cf4fbe309435a1faef97393d64ace705a0133 (rebuilt on ea72613884f940f40c6467dfecd61af69ec779f5)
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — ran, no new refs (already current).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u13-review 33a3f714abc4941bcebd0ff9401fdabd2d3eb6f3` — created; `git rev-parse HEAD` in the worktree returned `33a3f714a...` (confirmed by the checkout message "HEAD is now at 33a3f714a").
- `node_modules` junctioned into the worktree via `cmd /c mklink /J <worktree>\node_modules E:\Projects\MekStation\node_modules` (had to run through the PowerShell tool; the first attempt via the Bash tool's `cmd /c` silently no-op'd — recorded as a tool gotcha, not a repo issue).
- Node 22.22.0 selected via `$env:PATH` prefix; `node --version` printed `v22.22.0` throughout.
- `npm_config_dry_run=true` exported in every shell that ran npm/npx.
- No `npm install`/`ci`/`prune`, no build, no Playwright, no commit, and every git/npm/node command below ran with an explicit path or `cd` into the review worktree — never the root checkout. One command (`git -C E:/Projects/MekStation status --porcelain -- .sisyphus/.../u14-main-proof-20260917`) explicitly targeted the root checkout read-only, with `-C`, to prove the proof directory was untouched; nothing was written there.

## Files on the range

`git diff c7da338676021c3d37d400c4082916565aceac5e 33a3f714abc4941bcebd0ff9401fdabd2d3eb6f3 -- scripts` → **empty output, exit 0**. The product and test files are byte-identical to the previously-approved pass-3 head, as the charter claimed.

`git diff 33a3f714abc4941bcebd0ff9401fdabd2d3eb6f3~1 33a3f714abc4941bcebd0ff9401fdabd2d3eb6f3 --stat` (one commit, confirmed by `git log --oneline` on the range showing exactly `33a3f714a` and its parent `ea7261388`):

```
 .../evidence/u13-local-20260917.json               | 223 ++++++--
 .../evidence/u13-red-20260917.json                 |  82 ++-
 scripts/__tests__/preserve-run-logs.test.ts        | 588 +++++++++++++++++++++
 scripts/qc/preserve-run-logs.mjs                   | 440 +++++++++++++++
 4 files changed, 1280 insertions(+), 53 deletions(-)
```

`--name-only` confirms exactly these four paths, all inside `scripts/qc`, `scripts/__tests__`, or the receipts directory. `package.json` is not in the list (confirmed separately: `git diff <baseline> <head> --stat -- package.json` is empty). Commit author/committer is Wes Rollings; `git log -1 --format=%B` on the single reviewed commit contains no AI attribution trailer (a hit for "claude-opus" in a wider range grep came from the unrelated prior commit `ea7261388`, a docs-fold commit outside this PR's diff, not from the reviewed commit itself).

Note: the charter's framing text says "three u13 receipts" changed; the actual single commit touches exactly two receipt files (`u13-local-20260917.json`, `u13-red-20260917.json`). The third (`u13-admission-20260917.json`) exists in the tree but is untouched by this commit — consistent with it being the unit's earlier admission-stage receipt. Not a defect, just a correction to the framing.

## Findings

1. **[NONE — verified safe] Removal-half preconditions hold under seven independently constructed attacks.** `scripts/qc/preserve-run-logs.mjs:286-371` (`removeWorktreeAfterPreservation`). I wrote a standalone Node script (outside the jest pin) that built real temporary git repositories with real `git worktree add` and called the module directly:
   - Clean, matching worktree with a `node_modules` junction → **succeeded**, junction target's `pkg/index.js` intact afterward, worktree gone, `git worktree list --porcelain` count 2→1.
   - Dirty worktree (uncommitted file) → refused `WORKTREE_DIRTY`, worktree still present.
   - Wrong `expectedHead` (last hex digit flipped) → refused `HEAD_MISMATCH`, worktree still present.
   - Preserved copy tampered (`a.log` appended) → refused `PRESERVED_HASH_MISMATCH`, worktree still present.
   - `worktreePath` itself pointed at a junction (reparse point) → refused `WORKTREE_REPARSE`; the real target directory and the real worktree were both untouched.
   - Manifest file missing → refused `MANIFEST_MISSING`, worktree still present.
   - Injected empty `git worktree list --porcelain` output (git-runner injection) → refused `WORKTREE_NOT_LISTED`, worktree still present.
   All seven destructive constructions were refused with nothing deleted; only the legitimate case removed anything, and it removed only the junction (not its target) and the worktree. Full output captured in this pass's transcript.

2. **[NONE — verified safe] Preservation-half refuses before writing in all six probed cases.** `scripts/qc/preserve-run-logs.mjs:139-228` (`preserveRunLogs`). A second standalone script confirmed, against the real module:
   - `repoRoot` pointed at the preserved directory itself (forces `PRESERVED_DIR_OUTSIDE_ROOT`, the same-path shape the pin uses) → refused, and the preserved directory **does not exist** afterward (`fs.existsSync` false) — this is the pass-1 required edit (order the expressibility checks before the copy loop); independently confirmed still in place.
   - Run directory reached through a junction → refused `RUN_DIR_REPARSE`.
   - Empty run directory → refused `EMPTY_RUN_DIR`.
   - Copy hook corrupts the destination file → refused `COPY_HASH_MISMATCH`, and the manifest file does not exist afterward.
   - Normal two-file run → manifest's `runDir` and `preservedDir` are both relative (`path.isAbsolute` false for both), never absolute.
   - `repoRoot` pointed at `preservedRoot/UNIT-DATE` (F3-style outside-root case) → refused `PRESERVED_DIR_OUTSIDE_ROOT`, nothing written.

3. **[NONE — confirmed load-bearing] Pass-2 required edit (EVIDENCE_DIR_OUTSIDE_ROOT pin coverage) is real, not decorative.** `scripts/qc/preserve-run-logs.mjs:191-195` and `scripts/__tests__/preserve-run-logs.test.ts:389-409`. Recorded baseline `sha256sum scripts/qc/preserve-run-logs.mjs` = `1f37243e6ab570592c9a698ec6fd0fc58e067a32a5476f0949fc604f5a79eca8` (matches the receipt's claimed hash). Deleted the 5-line `relativeToRoot(repoRoot, path.resolve(evidenceDir), 'EVIDENCE_DIR_OUTSIDE_ROOT');` statement, ran `npx jest scripts/__tests__/preserve-run-logs.test.ts`: **exactly 1 of 16 failed** — `preserveRunLogs › refuses an evidence directory the manifest path cannot express, before copying anything`, `Expected: "EVIDENCE_DIR_OUTSIDE_ROOT", Received: undefined` at test.ts:402. Restored the file; `sha256sum` returned the identical hash above. This matches the receipt's M6 claim exactly and confirms the pass-2 required edit landed and is enforced by the pin, unlike at revision 2 where the same deletion left all tests green.

4. **[NONE — independently reproduced] Mutant M3 (recursive junction delete) is load-bearing.** `scripts/qc/preserve-run-logs.mjs:362`. Replaced `if (junctionRemoved) removeReparsePoint(modules);` with `if (junctionRemoved) fs.rmSync(fs.realpathSync.native(modules), { recursive: true, force: true });` (resolving the junction before a recursive delete — the exact defect class the module's JSDoc warns against). Ran the pin: **exactly 1 of 16 failed** — `removeWorktreeAfterPreservation › removes a clean matching worktree and deletes only the reparse point`, with `ENOENT: no such file or directory, open '...\real-node-modules\pkg\index.js'` — the mutant destroyed the junction's real target, exactly as the receipt's M3 entry describes. Restored the file; sha256 identical to the pre-mutant hash.

5. **[NONE — verified] Real CLI run against the U14 proof directory reproduces the claimed hashes.** Ran `node scripts/qc/preserve-run-logs.mjs --run-dir E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/u14-main-proof-20260917 --unit U14 --date 20260917 --preserved-root .sisyphus/u13-review-cli-probe/preserved --evidence-dir .sisyphus/u13-review-cli-probe/evidence` from inside the review worktree. Output: `RUN_LOGS_PRESERVED .sisyphus/u13-review-cli-probe/evidence/u14-logs-20260917.json 11 files 2625399 bytes`, exit 0 — matches the receipt's claimed run exactly. Programmatic comparison of the resulting manifest's 11 file hashes against the U14 directory's own `sha256.txt` (read directly from the root checkout, read-only): **10/10 matched** (the eleventh manifest entry is `sha256.txt` itself, which — as the receipt notes — is not self-covered by its own list). Root checkout proof directory verified unaffected afterward: still 11 entries, `sha256.txt` still hashes to `5a5938b82a5a86303340b815f6114ce9f11edc13429dc7646f86b2137704edc9` (matches the receipt), `git -C E:/Projects/MekStation status --porcelain` against that path is empty. Scratch output directory (`.sisyphus/u13-review-cli-probe`) deleted from inside the review worktree afterward.

6. **[LOW — evidence staleness, not a product defect] `u13-local-20260917.json`'s carried-forward finding F1 quotes a stale line count.** `openspec/planning/2026-09-12-roadmap-completion/evidence/u13-local-20260917.json`, `findingsReportedNotFixed[0]`: "The product file is 410 lines..." This was true at revision 1; the same document's own `lineCounts.product` section (and independently, `wc -l scripts/qc/preserve-run-logs.mjs` = 440) shows the file is now 440 lines. The receipt is internally inconsistent between its measured `lineCounts` section (correct, 440) and its narrative F1 text (stale, 410). Same issue for the "fourteen" typed-refusal count in the same sentence: I independently enumerated the distinct string codes thrown by `PreserveRunLogsError`/`WorktreeRemovalError` in the current 440-line file and count more than fourteen (exact count depends on whether `INVALID_ARGUMENT`'s three call sites and `GIT_FAILED` are counted as one "kind" or several), which is consistent with codes having been added since revision 1 (e.g. `EVIDENCE_DIR_OUTSIDE_ROOT` at revision 2) without F1's text being refreshed. This does not affect the verdict — the code itself is unaffected and every refusal I sampled (findings 1-4 above) is demonstrably load-bearing — but the receipt should not be read as re-verified per-revision on this specific sentence.

7. **[NONE — reconfirmed] The `--force` / no-branch-deletion deviation from DELIVERY.md is real and disclosed, not hidden.** `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md` ("Owned cleanup"): "Use Git's non-force worktree removal and compare-guarded branch deletion." `scripts/qc/preserve-run-logs.mjs:363` calls `git(['worktree', 'remove', '--force', target], ...)` and the module performs no branch deletion at all. The receipt's `nonClaims` array states this plainly as "LITERAL DEVIATION FROM DELIVERY.md, disclosed rather than resolved (Lane A pass-1 review finding 2)" with reasoning (the HEAD/clean/listed checks already gate the removal; `--force` is needed because a legitimately-clean proof worktree can still carry gitignored artefacts that `git worktree remove` without `--force` would refuse on). This matches what pass-1 asked for (frame it as a literal deviation, not resolve it) and is unchanged at this head.

8. **[NONE — reconfirmed by scratch probe] Platform reasoning about the fixture's ignore-pattern fix holds up on this machine, with the POSIX symlink case still unverifiable here (as the receipt itself discloses).** Ran a scratch git repository (`git version 2.54.0.windows.1`, matching the receipt) with `.gitignore` containing `slashed/` and `bare`: a plain file named `slashed` was **not** ignored (`git check-ignore` exit 1, `git status --porcelain` showed `?? slashed`) while a plain file named `bare` **was** ignored (exit 0). Separately, with a real Windows junction planted and ignored by either `node_modules/` or bare `node_modules`, both spellings produced empty `git status --porcelain` and `check-ignore` exit 0 — a junction is a directory to git, so the Windows fixture cannot distinguish the two spellings, which is exactly the CI-caught bug (pass-1) the revision-2 fix (bare spelling, neutral on both platforms) addresses. I did not attempt to create a raw POSIX symlink on this machine; the receipt independently discloses the same limitation (EPERM on `fs.symlinkSync` without the junction type).

## Gates

| Gate | Command | Last line | Exit |
|---|---|---|---|
| jest pin | `npx jest scripts/__tests__/preserve-run-logs.test.ts` | `Tests: 16 passed, 16 total` | 0 |
| tsc | `npx tsc --noEmit` | (no output) | 0 |
| oxfmt | `npx oxfmt --check scripts/qc/preserve-run-logs.mjs scripts/__tests__/preserve-run-logs.test.ts` | `All matched files use the correct format.` / `Finished in 14ms on 2 files using 16 threads.` | 0 |
| lint:units | `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All five gates the charter named ran green in the review worktree.

## Cap

`wc -l scripts/qc/preserve-run-logs.mjs scripts/__tests__/preserve-run-logs.test.ts` → **440 + 588 = 1028 total**, matching the current receipt's `lineCounts` section (`product.total: 440`, `test.total: 588`) exactly, and matching `sha256` `1f37243e6ab570592c9a698ec6fd0fc58e067a32a5476f0949fc604f5a79eca8` for the product file recorded both in the receipt and reproduced by me before and after two independent mutations. The charter's own quoted figures ("410 product lines and a 492-line pin") are **stale — revision-1 numbers**, not this head's; they do not match `wc -l` on this head. Under the unit's cap definition (non-generated product lines only, matching how U11/U14 counted), 440 of 500 is used and the unit is under cap; under the stricter product-plus-pin reading flagged as F5 in the receipt (not resolved here, an owner-level question), 1028 would exceed 500 — this is disclosed, not hidden, and unchanged from the prior passes.

I read all 440 product lines and did not find dead code or padding: every exported/local function (`PreserveRunLogsError`, `WorktreeRemovalError`, `posix`, `hashFile`, `linkStat`, `relativeToRoot`, `walkFiles`, `manifestPathFor`, `preserveRunLogs`, `defaultGit`, `canonical`, `removeReparsePoint`, `removeWorktreeAfterPreservation`, `parseArguments`, `printable`, `main`) is referenced and exercised by the pin. Every one of the typed refusals I sampled (findings 1-4 above, 13 distinct refusal constructions across two independent scratch scripts plus two independent mutant reproductions) proved load-bearing — deleting or weakening the corresponding check turned a specific, predictable pin case red.

Scope confirmed: exactly the four files named by the charter changed (`scripts/qc/preserve-run-logs.mjs`, `scripts/__tests__/preserve-run-logs.test.ts`, `evidence/u13-local-20260917.json`, `evidence/u13-red-20260917.json`); `package.json` untouched; no AI attribution in the reviewed commit; no absolute machine paths (drive-letter patterns) in either shipped source file (grepped for `[A-Za-z]:[\\/]`, no match).

## Verdict rationale

The product and test files are byte-identical to the pass-3-approved head (empty `git diff -- scripts`), so this pass is a from-scratch re-verification of that same code on a rebuilt branch, not a re-review of new logic. Independent reconstruction (outside the jest pin, in fresh temporary git repositories) confirmed every safety precondition on both the preservation half and the removal half, including the pass-1 and pass-2 required edits landing and being load-bearing. I independently reproduced one of the receipt's five claimed mutants (M3, the highest-consequence one — a recursive delete through the junction that would destroy a real `node_modules`) and got the exact same single-case failure and error text the receipt claims, then restored to the identical sha256. The real CLI run against the U14 proof directory reproduced 10/10 matching hashes against that directory's own `sha256.txt`, read-only, with the source directory unchanged afterward. All five named gates are green. The only issues found are two LOW/cosmetic staleness items in the receipt's prose (a carried-forward line-count and refusal-count from revision 1 that were not refreshed when the file grew in revision 2) — they do not reflect any defect in the shipped code and do not change the safety properties I independently verified. Verdict: **APPROVE**.
