# Task 57 residual registration — independent delta review, round 2 (PR #2136)

- PR: https://github.com/SwiggitySwerve/MekStation/pull/2136 (OPEN, MERGEABLE; GitHub headRefOid = `11c4561fcf69faf8943341356422e04751455b64`)
- New head: `11c4561fcf69faf8943341356422e04751455b64` (`11c4561fc fix(roadmap): harden Task 57 residual registration`)
- Prior reviewed head: `63b8b02410dfc3d1b24fc87e397dc30b5774f516`
- Base: `ba8007f2dfea7786a3823145eb999e308c97f3fa` (equals the fetched `origin/main`)
- Prior review: `docs/audits/2026-10-16-task57-residual-registration-opus-review.md` (round 1, APPROVE-WITH-NOTES)
- Contract: `.omo/plans/mekstation-whole-roadmap-reconciliation-20261002.md` task 57 (lines 1784-1795) and task 66 (lines 1901-1912)
- Round-2 evidence read: `.omo/ulw-execute/mekstation-whole-roadmap-execution-20261002-01a0febd/task-57-20261016/round2-qa.md` only. I did not enumerate `.omo/ulw-execute`.
- Reviewer: Claude Opus 5.5, read-only. I modified no branch, packet, ledger or product file. All mutation probes ran on a full temp copy of the planning directory via `--roadmap`. Authority hashes were captured before the probes and checked after (`sha256sum -c`: all four OK). Worktree `git status` was clean before and after.
- I judged the diff, not CI.

## Verdict: APPROVE-WITH-NOTES

No blockers.

- F1 is fixed to the plan letter.
- F2 is disclosed in the ledger.
- F3 now fails closed for every case I raised in round 1.
- The prefix allow-list widened by exactly two literal prefixes, and committed tests pin both the accepted and the refused cases.
- The census matches the claim exactly.
- Two new notes, both non-blocking:
  - R2-1: one term of the U105 selector is dead, and the disclosure sits only in local evidence.
  - R2-2: the PR body is stale.

Fix R2-2 before merge. It is Root-owned, and fixing it needs no code change.

## Q1 — F1: U105 selector vs plan task 66

**Now plan-literal.** `units.json:12049-12050` registers:

1. `node node_modules/jest/bin/jest.js --runInBand --watchAll=false --testPathPattern='CampaignSnapshot|campaignAuthoritativeFold|CampaignSyncSession'`
2. `npm.cmd run verify:qc:coop-campaign-journey`

Both strings match plan task 66 QA happy and QA failure (`plan:1909-1910`) character for character. The npm script exists (`package.json:206`). The round-1 term `campaignSyncTransport` was dropped from the Jest pattern, but its registered test `src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts` is still exercised: the journey gate runs it by path. Registered files are unchanged from round 1.

**Per-term match census.** I ran Jest 29.7.0 `--listTests` in the worktree. Jest 29 compiles `--testPathPattern` case-insensitively.

| Term                        | Suites selected                                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CampaignSnapshot`          | 2 — `src/lib/campaign/authority/__tests__/campaignSnapshotBackfill.test.ts`, `…/campaignSnapshotBackfill.twoSeatOwnership.test.ts` (case-insensitive match) |
| `campaignAuthoritativeFold` | **0**. No test file in `src/` imports or names `campaignAuthoritativeFold`/`foldCampaignSnapshot`; only the source file and two product importers match.    |
| `CampaignSyncSession`       | 1 — `src/lib/multiplayer/server/__tests__/CampaignSyncSession.test.ts`                                                                                      |
| Full pattern                | 3 suites                                                                                                                                                    |

**Is the gate vacuous?** No.

- The selector as a whole selects 3 suites, and the second selector runs 9 Jest suites plus 2 Playwright specs.
- Jest without `--passWithNoTests` exits 1 when a pattern selects nothing, so even a fully dead pattern would fail closed rather than pass vacuously.
- Exactly one term (`campaignAuthoritativeFold`) is dead today. `CampaignSnapshot` is live only through case-insensitive matching on the _backfill_ suites. Those are not the "actual CampaignSnapshot transport tests" that plan task 66 names as a proposed output (`plan:1907`).

**Fidelity vs defect.** The plan itself carries the dead term:

- The same term appears in plan task 13 (`plan:1151-1152`) and task 28 (`plan:1729`).
- Task 66 explicitly expects new snapshot/fold tests under existing test parents.

So the term is a prospective selector copied verbatim from the plan. It is not a registration defect.

The Sol lane disclosed it honestly in `round2-qa.md` ("campaignAuthoritativeFold currently matches 0 test filenames … downstream Task 66 owes that proof"). It did not report that `CampaignSnapshot` hits only backfill suites.

**Recommendation: accept as documented plan fidelity.** Rewriting the selector would diverge from the plan letter that F1 asked to restore. See R2-1 for the suggested durable disclosure and the Task 66 admission obligation.

## Q2 — Selector-shape rule

`validate-roadmap.mjs:184` now accepts `command.startsWith(prefix)` for exactly `['node ', 'npx ', 'npm run ', 'npm.cmd run ']`. Round 1 accepted `['node ', 'npx ']`.

**Not looser than claimed.** The rule is a case-sensitive literal-prefix test. My probes on the real-ledger copy, mutating U105's second selector:

| Selector                       | Exit |
| ------------------------------ | ---- |
| `npm.cmd run-script …`         | 1    |
| `bash -c "npm run x"`          | 1    |
| `npm test`                     | 1    |
| `NPM RUN x`                    | 1    |
| `[]` (empty)                   | 1    |
| `npm run x && rm -rf .`        | 0    |
| `node x; rm -rf .`             | 0    |
| `npm run ` (empty script name) | 0    |

**No chaining regression.** Chaining and empty tails after a valid prefix were already accepted at round 1 through `node `. The rule is a shape check on ledger metadata. The validator never executes selectors, and it never claimed shell safety. The two new prefixes add no new class of acceptance. (Info, see R2-3.)

**Tests.** `validate-roadmap.test.mjs:594-605` pins the four accepted prefixes (expects exit 0, `U99`) and ten refused near-misses: `npm `, `npm.cmd `, `npm run-script `, `npm.cmd run-script `, `npm-run `, `nodejs `, `npxx `, leading space, `npm run\t`, `npm.cmd run\t`. Each refusal expects exit 1 and `U100 lacks executable residual selectors`. No committed case covers chaining. That is consistent with the rule's scope.

## Q3 — F2: `socketTokenScope` vs `scopedToken`

Resolved.

- `units.json:11887` (U101) and `units.json:12251` (U101d) now carry `selectorNote`: "Plan task 65 scopedToken has no matching file; use the existing socketTokenScope.test.ts name instead."
- My round-1 finding still holds: no tracked path contains `scopedToken`, and `src/lib/multiplayer/server/__tests__/socketTokenScope.test.ts` exists and is registered.
- The substitution keeps the plan's intent (the scoped-token suite) instead of shipping a selector with a dead term. It is now visible in the ledger.
- The undisclosed U101b/U101c superset terms from round 1 are still undisclosed. They are supersets that add coverage, so this stays Info.

## Q4 — F3: fail-closed

The validator now does the following (`validate-roadmap.mjs:157-169`):

- It collects every unit that has an own `registration20261016` key.
- It returns early only when there is no marker **and** no such unit.
- It fails `marker required` when registrations exist without a marker.
- It treats a malformed marker as empty units.
- It fails any registered unit absent from the marker or outside the fixed ten-unit ceiling table.
- It still runs the per-unit checks for the ten known units when the marker is missing, because `fail` accumulates (`:65-67`) rather than exiting.

My mutation probes (full real-ledger copy, `--next`):

| Probe                                                      | Exit  | Key message                                                          |
| ---------------------------------------------------------- | ----- | -------------------------------------------------------------------- |
| control                                                    | 0     | P2CA                                                                 |
| marker deleted                                             | 1     | Task 57 residual registration marker required                        |
| marker deleted + U101 15/500 + U101a outside file          | 1     | marker required; unmarked registration (cap/outside checks also run) |
| marker `null`                                              | 1     | marker required                                                      |
| marker `{}`                                                | 1     | must name all ten unique units; U99… unmarked                        |
| extra `U101e` carrying registration (round-1 bypass)       | 1     | U101e has unmarked Task 57 registration                              |
| `U101e` with `registration20261016: null`                  | 1     | U101e has unmarked Task 57 registration                              |
| `U101e` added to marker as well                            | 1     | must name all ten; U101e unmarked (not in ceiling table)             |
| unrelated unit (`U0`) carrying registration                | 1     | U0 has unmarked Task 57 registration                                 |
| U101a removed from marker                                  | 1     | must name all ten; U101a unmarked                                    |
| marker reordered                                           | 1     | must name all ten unique units (F9 unchanged)                        |
| marker **and all ten** registrations deleted + U101 15/500 | **0** | P2CA (R2-4)                                                          |
| U99 outside-ownership file                                 | 1     | U99 residual file outside ownership: package.json (+ over cap)       |
| U101d predecessors `['U101b']`                             | 1     | incorrect residual task/predecessors                                 |
| U105 task 65                                               | 1     | incorrect residual task/predecessors                                 |

Both round-1 F3 bypasses now refuse. Committed tests at `validate-roadmap.test.mjs:580-583` cover four cases:

- marker removal
- marker removal plus a changed cap (asserting the cap diagnostic, so the per-unit loop still runs)
- U101a omitted from the marker
- an extra `U101e`

The one remaining pass case (R2-4) is a complete revert to the pre-Task-57 ledger shape.

## Q5 — Census and re-runs (recomputed)

`git diff --numstat 63b8b024 11c4561f` (round 2 only): units.json +4/−1, validate-roadmap.mjs +10/−3, validate-roadmap.test.mjs +17/−0. That is **3 files, +31/−4**, matching the claim.

`git diff --numstat ba8007f2 11c4561f` (full branch):

| File                      |       + |     − |
| ------------------------- | ------: | ----: |
| roadmap.json              |      15 |     1 |
| units.json                |     308 |     1 |
| validate-roadmap.mjs      |      36 |     1 |
| validate-roadmap.test.mjs |      57 |     0 |
| **Total (4 files)**       | **416** | **3** |

This matches the claim and fits the self-applied 15 files / 500 lines with no exemption.

- **No product edits.** `git diff --name-only ba8007f2 11c4561f` lists only the four `openspec/planning/2026-09-12-roadmap-completion/` files. Nothing under `src/`, `server.js`, `scripts/`, `e2e/` or the package files changed.
- **No state, packet or ruling edits.** The round-2 `units.json` diff has three hunks: two added `selectorNote` lines and the U105 selector replacement. No `state`, `caps`, receipts, `ownerGate`, `ownershipPaths`, packet, deferral or other registration field changed. `roadmap.json` is untouched in round 2. All ten holders remain `planned` (U105 rechecked: `planned`, caps 8/300).
- `git diff --check ba8007f2 11c4561f` → clean.

Re-runs in the worktree at `11c4561f`:

- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --next` → exit 0, stdout `P2CA`.
- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` → exit 0, `ROADMAP VALIDATION PASSED: 79 nodes, 13 packages, 381 tasks, 40 triage rows`.
- `node --test openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.test.mjs` → **86 tests, 86 pass, 0 fail** (68 + 4 marker cases + 14 prefix cases).

Authority hashes at head (unchanged after the probes):

| File                      | SHA256                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------ |
| units.json                | `d3aae0d992d6f7fd7272fdffce276484988ce8e448873a1a2a1fbc9bbe19a5ad`                   |
| roadmap.json              | `898811b940c31006e04ade575d3571c7140982f90e1389078cfd0308e4054af4` (same as round 1) |
| validate-roadmap.mjs      | `07dcf8fbdbe599382076a4e4a934ceac5de2a2d8c77b056244cf4c54eb81f9d7`                   |
| validate-roadmap.test.mjs | `efd3a17cea64b29a3566aa13051e8300083abef32f359547a1e9f53d6cdb35c3`                   |

## Q6 — F4-F9 carry-forward

None of F4-F9 became a blocker:

- **F4** (directory-shaped unit grants): unchanged; no ownership edits this round.
- **F5** (per-prefix caps): unchanged; the caps table is identical.
- **F6** (co-ownership from aliases): unchanged; `roadmap.json` is untouched.
- **F7** (shared registered files): unchanged; the U105 file list is the same.
- **F8** (untested branches): partially improved. The selector-shape and marker branches are now pinned. Branches for over-cap files, duplicates, wrong task/predecessor and the new `residual file outside ownership` path are still unpinned. My probes show they refuse.
- **F9** (order-sensitive marker): unchanged. The reorder probe still reports "must name all ten unique units" with no mention of order.

## Findings (round 2)

**R2-1 — Low — U105 carries one dead and one off-target selector term, and the disclosure is not in the ledger.**

- At `units.json:12049`, `campaignAuthoritativeFold` selects 0 suites today. `CampaignSnapshot` selects only the two `campaignSnapshotBackfill*` suites, through Jest's case-insensitive matching, not snapshot-transport tests.
- This is faithful to plan task 66 (`plan:1909-1910`), and the selector as a whole is not vacuous (3 suites plus the journey gate). Do not change the selector.
- The disclosure lives only in untracked `round2-qa.md`. U101/U101d got a durable `selectorNote`; U105 did not.
- Recommendation (non-blocking): add a U105 `selectorNote` stating that `campaignAuthoritativeFold` currently matches no test and that Task 66 must add or name the fold/snapshot-transport suite so each term selects at least one suite. Otherwise, record that obligation in the PR body.
- Either way, Task 66 admission should treat a still-dead term as unproven coverage.

**R2-2 — Low — The PR body is stale at the new head.**

The body still states `Head: 63b8b024…`, `+389/-3`, `Validator tests: 68/68`, and "Final Jest 29 selector discovery is nonempty and matches each registered pattern". At `11c4561f` these are `+416/-3` and 86/86, and the per-term claim is now false for `campaignAuthoritativeFold`. Root should refresh the body, including the R2-1 disclosure and the F1-F3 resolution, before merge. No code change is needed.

**R2-3 — Info — The selector rule is a prefix-shape check, not a command allow-list.**

`npm run x && rm -rf .` and `npm run ` (empty script) pass `:184`, exactly as `node x; rm -rf .` and `node ` did at round 1. This is not a regression, and no consumer executes these strings today. If a future gate runs registry selectors directly, it needs its own allow-list.

**R2-4 — Info — A complete revert still disables the check.**

Deleting the marker and all ten `registration20261016` keys returns early (`:160`), and the U101 8/300 pin is no longer enforced (probe: U101 15/500 → exit 0). That is the base ledger shape, would be a large visible diff, and is outside Task 57's guard scope. Recorded for completeness only.

## Answers summary

1. **F1** — fixed to the plan letter, including the snapshot/fold terms and `npm.cmd run verify:qc:coop-campaign-journey`.
   - `campaignAuthoritativeFold` matches 0 tests; `CampaignSnapshot` matches only backfill suites.
   - The gate is not vacuous (3 suites plus the journey gate), and Jest fails closed on an empty selection.
   - Accept as documented plan fidelity. Add a durable note (R2-1); Task 66 owes the live term.
2. **Prefix rule** — exactly two literal prefixes were added. It is case-sensitive, rejects `run-script`, tab separators, a leading space and lookalikes, and adds no new chaining acceptance. 4 accept and 10 refuse cases are committed.
3. **F2** — disclosed via `selectorNote` on U101 and U101d, and justified (no `scopedToken` path exists).
4. **F3** — now fails closed: marker removal, a malformed marker, an unmarked or unknown registered unit, and an extra `U101e` all refuse. Only a complete revert passes (R2-4).
5. **Census** — 3 files +31/−4 (round 2) and 4 files +416/−3 (branch), both matching the claims. There are no product, state, packet or ruling edits. `--next` exits 0 with `P2CA`, the full validator passes, and the tests pass 86/86.
6. **F4-F9** — none became a blocker; F8 is partially closed.
