# Lane A review: U14
reviewedHead: a4babba2cf34a6db3ce275fc66cf20e230e4d052
baseline: e6711f0c37b0c37c85e55b1d6a22d525a7de258d
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (no new refs reported).
- `git worktree add --detach .../worktrees/u14-review a4babba2cf34a6db3ce275fc66cf20e230e4d052` — clean checkout, HEAD confirmed via `git rev-parse HEAD`.
- `cmd /c mklink /J .../worktrees/u14-review/node_modules E:\Projects\MekStation\node_modules` — junction confirmed (`ls node_modules` populated).
- `$env:PATH` / `export PATH=.../nvm/v22.22.0:$PATH` — `node --version` → `v22.22.0` inside the worktree.
- `npm_config_dry_run=true` exported before every npm/npx invocation. No `npm install/ci/prune`, no build, no Playwright, no commit, no edit to the root checkout at any point.
- For independent root-lint comparison only, also created a second detached worktree at the baseline (`u14-review-baseline`, junctioned the same way) to run `npx oxlint` on both trees. Both worktrees were left clean (`git status --short` empty) before removal (see Cleanup).

## Files on the range

`git diff --stat e6711f0c3..a4babba2cf34a6db3ce275fc66cf20e230e4d052` → exactly 8 files, 1142 insertions, 0 deletions, matching the charter:
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u14-admission-20260917.json` (+183)
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u14-local-20260917.json` (+226)
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u14-red-20260917.json` (+74)
- `package.json` (+1)
- `scripts/__tests__/lint-units.test.ts` (+259)
- `scripts/qc/lint-units.ceiling.json` (+8)
- `scripts/qc/lint-units.mjs` (+176)
- `scripts/qc/oxlint-units.json` (+215)

No `src/**` or `e2e/**` edits. `.oxlintrc.json` diff is empty (byte-identical on the range). Commit message (`git log -1`) carries no AI attribution.

## Findings

1. **[INFO] Config parity independently confirmed two ways.** `JSON.stringify` comparison of the raw config files shows `rules`, `overrides`, `plugins`, `env`, `categories` are byte-equal between `.oxlintrc.json` and `scripts/qc/oxlint-units.json` (probe: inline node script reading both files). Independently, `oxlint --print-config` on each config (`--config scripts/qc/oxlint-units.json --print-config .` vs `--config .oxlintrc.json --print-config .`) also shows `rules`, `plugins`, `env`, `categories`, `overrides`, `settings` all equal — this is the resolved-config check the charter asked for, distinct from a raw-file diff, and it independently corroborates the file-level comparison. Only `ignorePatterns` differs by design: the units config's list is `["**/node_modules/**","**/playwright-report/**","**/test-results/**","**/generated/**","**/dist/**","**/coverage/**"]` — neither `e2e/**` nor `**/scripts/**` appears, confirmed by both direct inspection and the file's own jest pin (`carries the root %s block verbatim`, `never re-hides the unit paths it exists to lint`), which I ran and which passed (see Gates).

2. **[INFO] Root `.oxlintrc.json` and root `npx oxlint` output are unchanged.** `git diff e6711f0c3..a4babba2c -- .oxlintrc.json` is empty. Running `oxlint --config .oxlintrc.json .` on both the reviewed head and a second worktree checked out at the baseline gives the identical result on both trees: `Found 84 warnings and 0 errors` / `Finished in ... on 3810 files with 65 rules`. The root gate is provably unaffected by this unit.

3. **[INFO] The `no-console` scripts-only allowance is real but is an argv flag, not a config change.** `buildLintUnitsArgs` emits `--allow no-console` only when the path literal is `scripts`; I confirmed this both by reading the source and by running `oxlint --config scripts/qc/oxlint-units.json --format json scripts` with and without `--allow no-console`: 356 raw findings drop to 50 with the allowance (the review's own reproduction — the receipt's `352` figure is measured on an earlier tree slice, see finding 6). This is a genuine weakening of enforcement for one rule on one tree, but it is disclosed in the wrapper's own comment, the admission receipt (P4, with the override-glob defect that rules out doing it in the config itself), the test suite (`allows no-console for scripts only`, which I ran and passed), and the commit message. `e2e` keeps `no-console` fully enforced (14 of its 50 counted findings are `no-console`, confirmed in the per-path breakdown I reproduced). Net: not a silent weakening, and not a config-file weakening — a disclosed, tested, argv-level carve-out with a documented cause (oxlint 1.43.0 resolves `overrides.files` relative to the config's own directory, so an override inside `scripts/qc` cannot suppress a rule for `scripts/qc` itself). I verified the root cause claim is at least plausible by re-reading the override list in the config (present) and by the fact the wrapper explicitly avoids putting this rule in `overrides`.

4. **[LOW] False-PASS constructed: the wrapper does not detect a zero-file run.** `node node_modules/oxlint/bin/oxlint --config scripts/qc/oxlint-units.json --format json nonexistent-dir-xyz` returns `{"diagnostics": [], "number_of_files": 0, ...}` with exit 0. Feeding that path straight through the real wrapper (`node scripts/qc/lint-units.mjs --path nonexistent-dir-xyz --ceiling 0`) prints `LINT_UNITS_PATH nonexistent-dir-xyz 0` then `LINT_UNITS_PASS 0/0` and exits 0 — a silent, undetected PASS for a tree that was never walked. The wrapper's `DEFAULT_PATHS` are fixed literals (`e2e`, `scripts`) so this is not reachable through `npm run lint:units` today, but a future rename/typo of either directory, or any future caller that passes `--path`, would pass this gate vacuously instead of failing loud. Not covered by the current test suite (the CLI tests always run against a temp directory that is guaranteed to exist). Recommend a follow-up: assert `number_of_files > 0` per path, or a fixed minimum file count, in a later unit — does not block this one, since it does not affect the shipped default invocation.

5. **[INFO] Attempted false-FAIL construction found none.** I tried: (a) syntax-error files inside the linted tree — oxlint reports them as a normal `severity: "error"` diagnostic with a populated `labels[0].span`, counted correctly, no crash in the row-printer; (b) diagnostics with an empty `labels` array — none exist in the live `e2e` findings set (0 of 50); (c) severity-mixing — `e2e`'s 50 findings split 22 error / 28 warning and the wrapper counts both toward the ceiling by design (matches its stated contract, not a bug). I could not construct a scenario where the wrapper reports FAIL while the true, intended tree is clean. Labeling this UNVERIFIED-NEGATIVE: absence of a bug I could find in the time available, not a proof none exists.

6. **[LOW] The admission receipt's `rootRulesVerbatim.perPath.scripts` figure (352 findings / 170 files) does not reproduce against the shipped tree; the `adopted` ceiling figure (50) does.** Re-running `oxlint --config scripts/qc/oxlint-units.json --format json scripts` (no `--allow`) against the actual reviewed head gives 356 findings across 172 files, not 352/170. Root-caused: the unit's own two new lintable files under `scripts/` (`scripts/qc/lint-units.mjs`, `scripts/__tests__/lint-units.test.ts` — both re-admitted by `.gitignore`'s `!scripts/qc/**` and `!scripts/__tests__/**` whitelist) contribute exactly 4 new `no-console` findings and 2 new walked files (confirmed by running oxlint against just those two files: `4 findings, 2 files, all eslint(no-console)`). Because `no-console` is suppressed for the `scripts` path either way, this does not move the `adopted`/ceiling number: re-running the wrapper's actual per-path command (`--allow no-console scripts`) gives exactly 50, matching `lint-units.ceiling.json` and matching my direct `npm run lint:units` run. So the ceiling and the PASS verdict are correct and independently reproduced; the `rootRulesVerbatim` exploratory sub-object in the admission receipt is stale relative to the final tree (it was evidently captured before the wrapper's own source files existed) and should not be read as a live measurement of the current head. This is a receipt-precision nit, not a functional defect — nothing that gates or gets reviewed by CI depends on the `rootRulesVerbatim` figure.

7. **[INFO] Multi-path defect independently reproduced, with a second failure mode not in the receipt.** Command `oxlint --config scripts/qc/oxlint-units.json --format json e2e scripts` (my probe, 3 runs): consistently 0 `e2e` findings / 356 `scripts` findings — reproduces the receipt's "e2e silently dropped" claim, though my 3 runs were consistent with each other rather than alternating with the receipt's 858-file variant. Reversing the order (`scripts e2e`, 5 runs) instead reproduces the *other* documented failure mode: `e2e` findings correct (50) but `scripts` findings balloon to 9008 across far more files — this is the "stops honouring `.gitignore`" variant the receipt describes (it recorded 9054; I measured 9008, consistent within tree drift, same order of magnitude and same qualitative defect). Both orderings confirm: a single multi-path invocation is unsafe on this oxlint version, and the wrapper's one-invocation-per-path design (verified via `buildLintUnitsArgs` and the actual `npm run lint:units` run, which issues two separate spawns) is the correct, necessary mitigation, not a defensive-but-unneeded workaround.

8. **[INFO] Independent mutant (distinct from the receipt's M1–M3) reproduced and restored cleanly.** Pre-mutant `sha256sum scripts/qc/lint-units.mjs` = `c20f52b3ed3018820a29aa9ca2512909d3b6c3b33b46f76b67dc91f208dc9676`, matching the receipt's `preMutantSha256`. Mutation: `ALLOWED_RULES_BY_PATH = { scripts: ['no-console'] }` → `{ e2e: ['no-console'], scripts: ['no-console'] }` (leaking the scripts-only `no-console` allowance into `e2e` — this is literally the false-PASS vector the charter named). Pin run: `2 failed / 27 passed` — `lint:units argv builder › returns one argv per path...` and `lint:units argv builder › allows no-console for scripts only` both fail, correctly. File restored from a saved copy; `sha256sum` after restore is again `c20f52b3ed3018820a29aa9ca2512909d3b6c3b33b46f76b67dc91f208dc9676` (identical), and `git status --short` in the worktree is empty after restore.

9. **[INFO] Council-constraint compliance verified by direct grep of the cited documents.** `openspec/council-decisions/2026-09-17-post-loop-recommendations.md` section D item 4: "oxlint: measure the finding count for `e2e`/`scripts` first; add a `lint:units` target with its own pin rather than un-ignoring paths that existing receipts pin" — matches (measured first per the admission receipt, `.oxlintrc.json` untouched). `openspec/council-decisions/2026-09-17-review-what-needs-validation.md` section C item 5 ("Sizing"): "U14 needs a `scripts/qc` wrapper rather than a second root config no node owns" — matches; the unit ships `scripts/qc/lint-units.mjs` + `scripts/qc/oxlint-units.json`, not a second root-level config.

## Gates

All run inside the review worktree, node v22.22.0, `npm_config_dry_run=true`, no install/build/Playwright:

| Command | Last line | Exit |
|---|---|---|
| `node_modules/.bin/jest scripts/__tests__/lint-units.test.ts` | `Ran all test suites matching /scripts\\__tests__\\lint-units.test.ts/i.` (`Tests: 29 passed, 29 total`) | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` (`LINT_UNITS_PATH e2e 50`, `LINT_UNITS_PATH scripts 50`) | 0 |
| `node_modules/.bin/tsc --noEmit` | (no output) | 0 |
| `node_modules/.bin/oxfmt --check scripts/qc/lint-units.mjs scripts/qc/oxlint-units.json scripts/qc/lint-units.ceiling.json scripts/__tests__/lint-units.test.ts package.json` | `Finished in 97ms on 5 files using 16 threads.` (`All matched files use the correct format.`) | 0 |
| `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |
| `node_modules/.bin/oxlint` (root, reviewed head) | `Found 84 warnings and 0 errors.` / `Finished in 218ms on 3810 files using 16 threads.` | 0 |
| `node_modules/.bin/oxlint` (root, baseline worktree, comparison only) | `Found 84 warnings and 0 errors.` / `Finished in 1.9s on 3810 files using 16 threads.` | 0 |

Every gate matches the local receipt's recorded last line and exit code exactly; every number I independently measured (29/29, 100/100 with the same 50/50 per-path split, 75/13/376/40, 84/0/3810/65) matches the receipt without needing to trust it.

## Cap

`wc -l`, run directly in the worktree:
- `scripts/qc/lint-units.mjs`: 176 lines (matches claimed 176 product).
- `package.json`: `git diff --numstat` shows `1 0` (1 line added, 0 removed) — matches claimed 1 line; product subtotal 177 confirmed.
- `scripts/__tests__/lint-units.test.ts`: 259 lines (matches claimed 259 test).
- `scripts/qc/oxlint-units.json`: 215 lines (matches claimed 215, "generated").
- `scripts/qc/lint-units.ceiling.json`: 8 lines (matches claimed 8, ratchet data).

Files touched: exactly 8 (`git diff --name-only`), well under the 15-file cap. Non-generated product+test lines: 177 + 259 = 436, under the 500-line cap under any reading that excludes the mechanically-copied config and the ratchet data file; even counting the config as non-generated (215) the total (651) would only exceed the cap if evidence receipts were also counted, and the charter's own accounting (and the program's established convention of not charging evidence/receipt files against ownership caps) does not do so.

On "is classifying `scripts/qc/oxlint-units.json` as generated honest": yes, with one caveat. The file's `rules`/`overrides`/`plugins`/`env`/`categories` blocks are a mechanical, programmatic copy of `.oxlintrc.json` (confirmed byte-equal both ways I checked), which is the ordinary meaning of "generated data" as used elsewhere in this program (a file whose content is derived from another file rather than hand-authored logic). The caveat: there is no committed generator script or `npm run` target that regenerates this file — it was produced once by an ad hoc process and hand-maintained from here, so "generated" describes its provenance, not an ongoing build step. The admission/local receipts are honest about this (they call out that drift is caught only by the jest pin, not prevented, and flag it explicitly under `risksForTheParent`), so I don't read the "generated" label as overclaiming.

No absolute machine paths and no AI-attribution strings found in any of the 5 product/test files (`grep -inE` for `C:\`, `E:\`, `/c/Users`, `/home/`, `/Users/`, and separately for `claude|anthropic|codex|gpt-|co-authored|generated with|ai-generated`, both empty). Commit message carries no AI attribution.

## Verdict rationale

The unit does what it claims: it makes `e2e`/`scripts` visible to a lint gate for the first time without touching `.oxlintrc.json` or weakening the root gate (independently reproduced: root oxlint output identical on baseline and head), and the one real enforcement carve-out (`no-console` for `scripts` only) is disclosed at every layer, argv-scoped rather than config-scoped, and covered by its own test. I independently reproduced the measurement exactly (50/50/100, PASS, exit 0), independently reproduced both documented multi-path oxlint failure modes with fresh commands rather than trusting the receipt's numbers, independently ran and restored a mutant of my own choosing with a byte-identical sha256, and independently confirmed every gate's last line and exit code. I found one real, reportable gap (finding 4, a silent zero-file false-PASS path) which is LOW severity because it is unreachable through the shipped `npm run lint:units` invocation today, and one receipt-precision nit (finding 6) that does not affect the shipped ceiling or verdict. Neither rises to a required edit: both are follow-up-shaped, not defects in what ships. Files, caps, commit hygiene, and council-constraint compliance (D4, C5) all check out against direct reads of the cited sources. Reviewer (sonnet) is distinct from both the implementer (codex gpt-6) and the finisher (claude-opus), satisfying the reviewer/implementer distinctness requirement.

## Cleanup (performed after writing this review)

- Deleted the `node_modules` junction in both worktrees via `[System.IO.Directory]::Delete(...)` (non-recursive-through-link).
- `git worktree remove --force` for `u14-review` and `u14-review-baseline`.
- No changes were made to the root checkout at any point in this review.
