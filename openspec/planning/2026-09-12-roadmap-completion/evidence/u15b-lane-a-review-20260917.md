# Lane A review: U15b
reviewedHead: 30c81495c9a55603ff7918f8fa94590d803fe0ac
baseline: 4bcd6f8d5fa752270d40ed331423b37f89c15f8a
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — completed silently, no errors.
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u15b-review 30c81495c9a55603ff7918f8fa94590d803fe0ac` — succeeded: `HEAD is now at 30c81495c chore(qc): ladder forwards the combat-journal e2e arm next to the campaign arm`.
- `node_modules` junctioned via PowerShell `cmd /c mklink /J ...` (the Bash-tool `cmd /c` form silently produced no junction — verified with a follow-up `ls`; the PowerShell tool call succeeded: `Junction created for ...\u15b-review\node_modules <<===>> ...\node_modules`).
- Node 22 confirmed: `node --version` → `v22.22.0`; `npm --version` → `11.6.2`.
- `npm_config_dry_run=true` exported before every npm/npx invocation this session.
- No `npm install`/`ci`/`prune`, no build, no Playwright, no ladder runner, no commit, no edit to the root checkout — the root checkout (`E:/Projects/MekStation`) stayed on `main` at `4bcd6f8d5` throughout, confirmed clean via `git status --short` and `git worktree list` at the end of the session.
- Cleanup performed at the end of the session (junction removed via `[System.IO.Directory]::Delete`, then `git worktree remove --force`); confirmed the worktree directory is gone and `git worktree list` no longer shows it.

## Pre-check: identical-product-diff proof (pass 1 → pass 2)

`git diff e1f5629e3 30c81495c9a55603ff7918f8fa94590d803fe0ac -- playwright.config.ts scripts/qc/gm-two-player-campaign-core.cjs scripts/__tests__/gm-two-player-campaign-qc.test.ts` produced **zero lines of output** (piped through `wc -l` → `0`). The product+test diff on this head is byte-identical to the head pass 1 approved (`e1f5629e311f2492600fb4d30818cbaf1a8d5f9d`). Only the baseline and the receipt/commit-message prose describing the rebase changed. Pass 1's approval of the diff content itself is confirmed still valid; this pass re-verifies from scratch per the charter rather than trusting that inference alone.

## Files on the range (`git diff 4bcd6f8d5..30c81495c --numstat`)

| +/- | file |
|---|---|
| 11 / 0 | `playwright.config.ts` |
| 73 / 0 | `scripts/__tests__/gm-two-player-campaign-qc.test.ts` |
| 14 / 3 | `scripts/qc/gm-two-player-campaign-core.cjs` |

No receipt JSON files appear in this diff range — `evidence/u15b-admission-20260917.json`, `-red-`, `-local-` were already committed to `main` in the prior fold PR (#1821, commit `4bcd6f8d5`), which is this PR's baseline. Confirmed via `git log --oneline -- <each path>`, each showing only the `4bcd6f8d5` fold commit. I read all three from the worktree as context; they are unchanged by this PR and correctly excluded from its diff.

`git merge-base 30c81495c9a55603ff7918f8fa94590d803fe0ac origin/main` → `4bcd6f8d5fa752270d40ed331423b37f89c15f8a`, matching the charter's stated baseline exactly. `gh pr view 1822 --json headRefOid,baseRefName,headRefName,state` confirms the live PR head is `30c81495c9a55603ff7918f8fa94590d803fe0ac`, base `main`, branch `codex/roadmap-u15b-forward-combat-journal-arm-2-20260917`, state `OPEN` — matches the charter.

## Findings

1. **[Pass] Key name and values match U15a's resolver exactly.** `git show 46de0b2f137d5c6f32f4637caad4c49c0aeaa276 -- src/lib/multiplayer/server/combatJournalAuthorityEnabled.ts` (the U15a head) shows `COMBAT_JOURNAL_AUTHORITY_E2E_ENV = 'MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE'`, `ARMABLE_MODES = ['shadow', 'enabled']`, and `e2eCombatJournalAuthorityMode()` requiring `process.env.NEXT_PUBLIC_E2E_MODE === 'true'` AND the key naming exactly one of those two modes. U15b's ladder (`scripts/qc/gm-two-player-campaign-core.cjs:234-238`, diff hunk) sets `MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE: 'enabled'` — identical key name, one of the two accepted values. No mismatch.

2. **[Pass] Both keys always co-occur, and only on the arming plans.** Ran `buildRunPlan` from the worktree for every entry in `GROUP_CATALOG` (34 groups total, 8 throw `NOT_IMPLEMENTED` for reserved names, matching pre-existing behavior unrelated to this unit). Probe: `node -e "const core=require('./scripts/qc/gm-two-player-campaign-core.cjs'); for (const group of GROUP_CATALOG) { ... }"`. Output: only `authority-recovery`, `authority`, and `all` carry `campaign=true combat=true`; every other implemented group carries `campaign=false combat=false`; zero groups showed a mismatch (`campaign !== combat`). Direct spot values for the five groups named in the charter:
   ```
   authority-recovery => campaign: "1" combat: "enabled"
   authority          => campaign: "1" combat: "enabled"
   all                => campaign: "1" combat: "enabled"
   token-pack         => campaign: undefined combat: undefined
   smoke              => campaign: undefined combat: undefined
   ```
   Traced why: `armsJournalAuthorityFixture = expandedMembers.includes('authority-recovery')` (`scripts/qc/gm-two-player-campaign-core.cjs:205-206`); `expandedMembers` is `ALL_GROUP_MEMBERS` for `all`, `AUTHORITY_GROUP_MEMBERS` for `authority` (which lists `authority-recovery` at line 163), and `[group]` otherwise. `AUTHORITY_GROUP_MEMBERS` and `ALL_GROUP_MEMBERS` are read directly from source (lines 156-183). Both new keys sit inside the same single conditional spread on this one boolean (lines 234-238 in the diff), so they cannot structurally diverge from each other, only from the pre-existing campaign-key gate — which the charter's "must always appear together" question is really asking about, and which the code makes true by construction, not by two independently-maintained conditions.

3. **[Pass] Playwright config: guard shape matches, forwards only when present, nothing else changed.** Full diff of `playwright.config.ts` in this range is exactly one 11-line hunk (`git diff 4bcd6f8d5..30c81495c -- playwright.config.ts`, confirmed no other hunks via the numstat above and the full diff text). The added block:
   ```ts
   ...(process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE
     ? {
         MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE:
           process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE,
       }
     : {}),
   ```
   is byte-for-shape identical to the pre-existing campaign-key guard immediately above it (`...(process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY ? { MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY: process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY } : {})`) — same `...(process.env.<KEY> ? { <KEY>: process.env.<KEY> } : {})` structure, same indentation convention, no unconditional forward and no default value. On the text-pin adequacy question: a text pin over config source is an *adequate pin for this unit's claim* (that the source declares the same guarded shape and key name) but it is **not** adequate proof that Playwright's `webServer` actually receives the key in its spawned child's environment — a regex match on source text cannot observe runtime env propagation, config transpilation, or Playwright's own env-merging behavior (e.g., whether Playwright merges `webServer.env` over or under `process.env`, which is unverified here since I did not run Playwright per the charter's prohibition). A stronger pin would need either (a) a live Playwright `webServer` run asserting the child process's actual environment (which the charter explicitly forbids in this review), or (b) refactoring the config to export a plain, jest-importable env-builder function so the exact object (not its serialized text) could be asserted — the u15b-local receipt's own `nonClaims` section already states this limitation honestly, and I independently confirm it holds.

4. **[Pass, independently reproduced] My own mutant.** I chose a mutant distinct from the four recorded in `u15b-local-20260917.json` (M1/M2/M3/M3b): changed the arming predicate at `scripts/qc/gm-two-player-campaign-core.cjs:206` from `expandedMembers.includes('authority-recovery')` to `planMembers.includes('authority-recovery')`. Because `planMembers` for the `authority` group is `['authority']` (not its expanded leaf list), this mutant selectively de-arms the `authority` composite while leaving `authority-recovery` and `all` armed (since `all`'s `planMembers === ALL_GROUP_MEMBERS`, which does include `authority-recovery`).
   - Applied via a Python string-replace verified to match exactly once (`count == 1` assertion), confirmed with `grep -n` before/after.
   - Ran `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts`: **1 failed, 13 passed, 14 total**. The failure: `registers the approved catalog and deterministic implemented plans`, `expect(received).toBe(expected)` at `scripts/__tests__/gm-two-player-campaign-qc.test.ts:423`, `Expected: "1"`, `Received: undefined` — the `authority` group's `MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY` assertion (added by this unit in the same diff hunk as the combat-key assertion two lines below it).
   - Restored via `git checkout HEAD -- scripts/qc/gm-two-player-campaign-core.cjs` (after a first restore attempt through Python text-mode read/write left the file byte-different — see note below — so I switched to a git-native restore for a guaranteed byte-exact result).
   - `sha256sum scripts/qc/gm-two-player-campaign-core.cjs` after restore: `8cc3b1dbd7305ad8d53fe05b1b5991ff54df1e763945ecc88a2de65f4e020cc2`, exactly matching the `preMutantSha256` value recorded in `u15b-local-20260917.json` for this file. `git status --short` and `git diff --stat` both empty after restore.
   - **Methodology note, not a code defect:** this repo has `core.autocrlf=true` and the working-tree copy of `.cjs`/`.ts` files is CRLF while the git blob is LF-normalized. My first restore pass, done via Python's text-mode file I/O, silently converted the file to LF, which is byte-identical in content but not in raw bytes, producing a sha256 mismatch against the CRLF-based receipt hash even though `git diff HEAD` on that first attempt showed zero content difference. Re-doing the restore via `git checkout HEAD -- <path>` sidesteps this entirely and is what produced the exact hash match above. Flagging this so a future lane on this host does its own restore via `git checkout` rather than a text-mode script, to avoid a spurious "hash mismatch" scare that isn't actually a restoration failure.

5. **[Pass] Scope, cap, and hygiene checks.**
   - `git diff --numstat` (above): 25 product lines added / 3 removed across `playwright.config.ts` (11/0) + `scripts/qc/gm-two-player-campaign-core.cjs` (14/3), and 73 test lines added in `scripts/__tests__/gm-two-player-campaign-qc.test.ts` — matches the receipt's claimed `productTotal {added:25, removed:3}` and `testTotal {added:73, removed:0}` exactly.
   - 3 files touched, 98 total changed lines, both well under the unit's cap (`maxFiles: 15`, `maxNonGeneratedLines: 500`).
   - `RESPAWNING_GROUPS` (`scripts/qc/gm-two-player-campaign-core.cjs:16-21`) is untouched by the diff — confirmed by inspecting the full diff hunks, neither of which touches that block.
   - No new `SPEC_BY_GROUP` entry or `GROUP_CATALOG` change — confirmed the same way; only comments and the `armsJournalAuthorityFixture` conditional's payload changed.
   - `grep -iE "E:[\\/]|C:[\\/]|/e/Projects|/c/Users|wroll"` over the diff text: no matches — no absolute machine paths in the product or test files.
   - `grep -iE "claude|anthropic|co-authored|generated with|ai-generated"` over the commit message (`git show -s --format='%B' 30c81495c`): no matches — no AI attribution.
   - The commit message and the `u15b-local-20260917.json`/`u15b-admission-20260917.json` receipts both explicitly and correctly state that U15a (`46de0b2f1`) is not an ancestor of this baseline (confirmed independently: `git merge-base --is-ancestor 46de0b2f137d5c6f32f4637caad4c49c0aeaa276 30c81495c9a55603ff7918f8fa94590d803fe0ac` — not re-run by me since the receipt's own `git merge-base --is-ancestor ... -> NO` probe plus my own `git log`/`git branch -r --contains` checks against `origin/main` are sufficient corroboration that `46de0b2f1` lives only on the U15a branch), and that the forwarded key is inert on the server until U15a merges. This matches what I read at `src/lib/multiplayer/server/matchJournalAuthority.ts` context in the U15a diff (production constant literal `'off'`) and is an honest, not overstated, description of the diff's effect.

## Gates

| Gate | Command | Last line | Exit |
|---|---|---|---|
| Pin | `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` | `Tests: 14 passed, 14 total` | 0 |
| Typecheck | `npx tsc --noEmit` | (no output) | 0 |
| Lint (config) | `npx oxlint playwright.config.ts` | `Found 0 warnings and 0 errors.` | 0 |
| Format | `npx oxfmt --check playwright.config.ts scripts/qc/gm-two-player-campaign-core.cjs scripts/__tests__/gm-two-player-campaign-qc.test.ts` | `All matched files use the correct format.` | 0 |
| Lint units | `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |
| Mutant (mine) | `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` (mutated) | `Tests: 1 failed, 13 passed, 14 total` | 1 (expected — mutant caught) |

All required gates pass at exit 0 with unchanged ceilings (`lint:units` still `100/100`; roadmap validator still `75 nodes, 13 packages, 376 tasks, 40 triage rows`, matching the counts already recorded in the u15b-local receipt from the implementer's own run). I did not run `qc:openspec-ci:validate` myself (not in the charter's required-gates list for this pass, question 4 lists a slightly different set than the admission receipt's `acceptanceCommands`) — the receipt records it green (`errors=0`) and nothing in this diff touches OpenSpec change wiring, so I did not consider it necessary to re-run; flagging as **unverified by me directly** rather than silently relying on the receipt.

## Cap

3 files touched (`playwright.config.ts`, `scripts/qc/gm-two-player-campaign-core.cjs`, `scripts/__tests__/gm-two-player-campaign-qc.test.ts`) of 15 allowed. 98 non-generated changed lines (25 product added + 3 product removed + 73 test added + 0 test removed) of 500 allowed. Ownership paths in the diff (`scripts/qc`, `scripts/__tests__`, `playwright.config.ts`) match the unit's declared `ownershipPaths` in `units.json` exactly. No file outside the three named product/test files and no receipt file is part of this diff (receipts already landed on `main` in the prior fold PR, as noted above).

## Verdict rationale

APPROVE. The pre-check proves this head's product+test diff is byte-identical to the head (`e1f5629e3`) pass 1 already approved, so no new product behavior needs re-litigating — only the rebase and the receipt/commit prose differ. Independently, from scratch on this exact head: the key name and accepted values match U15a's resolver contract precisely; an exhaustive probe across every implemented ladder group confirms the two journal keys are structurally inseparable (one conditional gates both) and fire only on `authority-recovery`/`authority`/`all`; the Playwright config change is a minimal, same-shaped, presence-guarded forward with no other config drift; my own independently-chosen mutant (distinct from the four already recorded) was caught by the existing pin and I restored the file to a verified byte-exact sha256 match; every required gate passes at exit 0 with ceilings unchanged from the implementer's own receipt; the diff stays well inside the file/line caps and inside the unit's declared ownership paths; and the commit/receipts are honest about the key's current inertness pending U15a's merge, with no AI attribution and no absolute machine paths introduced. The unit's own `reviewClasses` is `["routine"]` only (no Lane B / owner ruling required for U15b itself), consistent with what I read in `units.json`. No blocking finding.
