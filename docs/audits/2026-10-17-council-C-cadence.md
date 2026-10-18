# Council C: delivery cadence and process review (2026-10-17)

Lens: delivery cadence, process skeptic. Read-only. Evidence: `gh pr list/view` (#2157-#2180, check rollups for #2179 and #2180), PLAN.md (Revision 2026-10-17, How phases end), STATUS.md (top ~100 lines), `GOAL.md`, `WORKERS.md` (Review lanes and ciClass), `DELIVERY.md`, the council decision `2026-09-16-goal-drivable-roadmap-loop.md`, `scripts/qc/roadmap-unit-closure.mjs`, `roadmap-main-proof.mjs`, `roadmap-unit-fold.mjs`, `machine-idle.mjs`, `scripts/jest/run-jest-lane.mjs`, `.github/workflows/pr-checks.yml`, and the TS7S2A/TS7S3 entries in `units.json` on origin/main. I ran no tests.

## Verdict

Each unit takes about 1 h 55 min from one implementation PR opening to the next. Almost none of that time protects Main. Most of it goes to two full local test runs that CI already runs, in about 7 minutes on Linux, against the same head. The roughly 25-30 minute review sits on the critical path while CI sits idle. One owner-ruling step that the tooling does not require for routine units is performed anyway, and it was even posted after the merge. The ceremony is upside down. On closure PRs the fast CI run is ignored: #2179 was admin-merged at 02:56:03 and its unit shards finished at 02:59. The slow local duplicate is what actually gates. A lean cadence inside the current rules is about 45-60 minutes per routine unit. Nothing in it needs owner approval except item 3(f) below.

## 1. Where the time goes (measured, UTC, 2026-10-16/17)

| Unit   | Release merged to impl PR open         | Impl PR open to merge | Merge to closure merged                                            | PR-to-PR cycle |
| ------ | -------------------------------------- | --------------------- | ------------------------------------------------------------------ | -------------- |
| TS7S1A | split #2173 21:17 to #2174 21:58 (41m) | 21:58 to 22:24 (25m)  | 22:24 to #2175 23:01 (37m)                                         | -              |
| TS7S1B | 23:01 to #2176 23:54 (53m)             | 23:54 to 00:31 (37m)  | 00:31 to #2177 01:06 (35m)                                         | 116m           |
| TS7S2A | 01:06 to #2178 01:48 (42m)             | 01:48 to 02:18 (30m)  | 02:18 to #2179 02:56 (38m)                                         | 114m           |
| TS7S2B | 02:56 to #2180 03:39 (43m)             | 03:39 to 04:14 (35m)  | 04:14 to (not merged at 05:21, more than 67m; contention incident) | 111m           |

The pattern holds for the P2CF/P2CG1 units: impl PR open to merge took 18-35 minutes and closures took about 35-40 minutes.

Per-stage estimate for a routine TS7 unit (~115 min):

- **Implementation, ~45 min.** About 15-20 min is worktree setup, `npm ci`, and the agent's actual work and proofs. **About 16-17 min is local `test:stable`** (STATUS: 996 s, 16.8 min, ~16 min). A few minutes go to receipts and the census.
- **PR open to merge, ~30-35 min.** CI on #2180 took **6 min 20 s** (03:39:43 to 03:46:01, 31 checks). The remaining **~25-28 min was spent waiting for the Lane A review**. The OWNER-RULING comment landed at 04:14:41, three seconds _after_ the 04:14:38 merge.
- **Closure, ~35-38 min.** About **14 min is local roadmap suites plus `roadmap-loop-closure-proof`** (STATUS: 200/200 + 146/146, 815-817 s). The rest is a fresh worktree, the unit's actual main proof (typecheck plus unit commands, a few minutes), receipt and identity-manifest generation, and PR creation. CI on the closure PR takes about 3.5 min, and **it is not waited for**.
- **Hidden cost:** heavy local runs overlap across agents and cause spawnSync ETIMEDOUT failures. Those then cost a rerun, a triage note, and a blocked successor. The TS7S2B closure is still open more than an hour after the merge.

Total time running tests that CI also runs: **about 30 of ~115 minutes (26%)**. Total time waiting on review while CI is already green: **about 25 minutes (22%)**. Together that is close to half of every unit.

## 2. Load-bearing vs redundant

What the rules **require**, from the tooling and documents:

- **Seven ordered stage receipts** (GOAL.md). The `review.head === merge.head === prHead` and `merge.mergeSha === mainProof.mergeCommit` equalities. The whole-tree merge-tree attestation. The review-identity v2 manifest, with the reviewer a different task and session from the author and finishers.
- **Lane A review on every unit.** WORKERS.md asks the reviewer to reproduce at least 2 mutants. **No length or "audit document" format is required.** It needs the first six lines (`Verdict: APPROVE`, `reviewedHead:`, `reviewerModel:`, `reviewContractVersion: 2`) and an output hash.
- **Lane B (OWNER-RULING) only for the classes authority, privacy, migration, replay, idempotency, concurrency, or owner-gated units.** `roadmap-unit-closure.mjs:242` sets `needsOwnerRuling = reviewClasses.some(sensitive)`. `validate-roadmap.mjs:552-561, 700-720` enforce it only for sensitive classes. Every TS7 unit so far is `reviewClasses: ["routine"]`.
- **Main proof is the unit's own required post-merge proof on the exact merge commit** (`roadmap-main-proof.mjs`: exactly one runtime proof, for example `--runtime-command`). For TS7S2A it was 6 checks: typecheck, validator, terminology x2, `npm ls`, and a lockfile blob check. That proof is correct and cheap.
- **Closure must run after the merge**, because its receipts embed the merge SHA and the `--git` ancestry check. So closure _cannot_ ride in the unit's own PR.
- **Docs-class PRs** (paths only under `openspec/planning/**` or `docs/**`) "are combined into one PR and merged with the administrative merge" (WORKERS.md, GOAL.md:94). Closure PRs are docs-class.
- **GOAL stage 3 (Local)** requires "focused tests plus the applicable type, lint, format, QC and build gates". **It does not require a full-suite run.** DELIVERY.md step 4 says the same.

| Ceremony                                                                    | Status                                             | Why                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Head-guarded merge, review-head equality, whole-tree attestation            | **Load-bearing**                                   | Protects Main. It is cheap because a script does it.                                                                                                                                                                                                                                                                                                                                                      |
| CI 31 checks on the impl PR                                                 | **Load-bearing**                                   | The real full-suite gate. About 7 min.                                                                                                                                                                                                                                                                                                                                                                    |
| Lane A independent review, ≥2 mutants                                       | **Load-bearing in substance; redundant in length** | The independence and mutants catch real problems (for example the TS7S1A emit re-derivation and the S2B `lazy` decision). A multi-page audit for a 10-line lockfile change is habit, not rule.                                                                                                                                                                                                            |
| Unit-specific main proof on the merge commit                                | **Load-bearing**                                   | Only it proves the merged tree behaves as claimed. A few minutes.                                                                                                                                                                                                                                                                                                                                         |
| Local `test:stable` in implementation                                       | **Redundant**                                      | `test:stable` = `jest --watchAll=false` with `JEST_EXCLUDE_PERF_SENSITIVE=true` (`run-jest-lane.mjs`). CI runs `jest --selectProjects unit --shard=N/6` with the same env, plus the A11y job. **That is the same test set, on the exact head, in about 7 min.** The only delta is Windows-specific behavior, which matters only for units that touch Windows paths, native modules, or desktop packaging. |
| Local roadmap suites plus `roadmap-loop-closure-proof` in closure (~14 min) | **Redundant**                                      | Both suites live in `scripts/__tests__` and run in CI's unit shards. CI then ran on the closure PR and was ignored. If anything here gates, it should be CI, not a Windows rerun. The validator, which is required, takes seconds.                                                                                                                                                                        |
| OWNER-RULING comment and label plus a stored ruling file for routine units  | **Redundant, and corrosive**                       | No tool requires it. The Root agent posts it from the owner's account, with "The owner authorized this". That dilutes what a Lane B signal means for the sensitive units where it _is_ required. On #2180 it came after the merge, so it gated nothing.                                                                                                                                                   |
| Separate closure PR                                                         | **Required by the current rules, but over-built**  | Post-merge receipts plus "predecessor main-verified on fetched main before successor admission" (GOAL stage 1) force a post-merge commit. The ~850-line evidence payload (review copy, mainproof, merge, identity JSONs, verbatim successor quotes) is mostly generated. Its wall cost should be about 10 min, not 37.                                                                                    |
| Verbatim carry-forward and successor-note quotes                            | **Documentation-only**                             | Useful as a ≤10-line pointer to the review file (which is already stored byte-for-byte), not as re-quotes.                                                                                                                                                                                                                                                                                                |
| Fresh worktree plus `npm ci` for closure                                    | **Partly load-bearing**                            | Lockfile units do need an install that matches the merge commit. The S2A closure noted that root `node_modules` was stale. Non-dependency units do not need a fresh install.                                                                                                                                                                                                                              |

On the specific questions:

- **Must closure be a separate PR?** Under today's rules, yes. `roadmap-unit-fold` only folds stages 1-3 (planned to local-verified) and cannot carry review, merge, main proof, or tick. Carrying closure N inside PR N+1 would break three things: N+1's `lifecycleOwnershipLimit` ("no other-unit ... edit; every actual lifecycle/evidence file counts"), its 500-line cap, and the rule that admission happens on fetched Main with the predecessor main-verified. That needs owner approval (3f). Inside today's rules, the closure can be made cheap: generated, validator-checked, merged on green docs-class CI in about 4 min.
- **Is local `test:stable` needed when CI runs 6 shards?** No, for routine and dependency units. It is the same test selection.
- **Must review be a separate long audit for a routine unit?** Separate (independent identity), yes. Long, no.

## 3. Lean cadence with risk tiers

**Tier R0, routine dependency/config/tooling** (lockfile, devDependency swap, tsconfig, docs-adjacent; reviewClasses routine; no runtime byte change). Examples: TS7S3, S4A, S4B, S5A.

1. **Implementation (target 20-25 min).** Prepared during the predecessor's closure (PLAN already allows this). Admit on fetched Main once the predecessor is main-verified. Run `npm ci` only if the lockfile changed. Run the unit's acceptance commands, typecheck, lint and format, focused suites for touched consumers, and the validator. **No `test:stable`.** When the unit's acceptance text names a full Jest run (TS7S3 names "the full root and desktop Jest runs"), record the CI run id and conclusion for the exact head in the local receipt. Before pushing, run desktop Jest locally only if desktop changed; it is small (5 suites / 57 tests).
2. **PR open: review and CI in parallel (target 15 min).** Short-form Lane A from a fresh identity: the six header lines, ≤1 page, ≥2 mutants or sensitivity probes, explicit findings. Timebox 15 min. Long form only when a decision item exists, for example the S2B `lazy:['electron']` call. **No OWNER-RULING.**
3. **Merge** on CI green plus APPROVE, with the head guard.
4. **Closure (target 10-15 min).** Run the unit's runtime main proof on the merge commit (unit commands; plus `npm ci` for lockfile units). Generate receipts with `roadmap:closure`, run the validator, and open a docs-class PR. **Wait for its ~4 min CI, then merge.** That is safer than today and still faster. No local roadmap suites unless the closure scripts themselves changed. Successor notes are a ≤10-line pointer list.
5. **Wall time:** about 55 min per unit end to end, and **about 40-45 min cadence** with the successor prepared during closure. For the remaining 6-7 TS7 units, that is roughly 5 h instead of 13-15 h.

**Tier R1, routine source** (type-only edits, mechanical refactors, binder moves such as P2CG1A1/A2). Same as R0, plus focused suites for every importer, emit or behavior equality where claimed, and a 20-30 min review. Target 75 min.

**Tier S, sensitive** (authority, privacy, migration, replay, idempotency, concurrency; multiplayer server authority; persistence migrations; auth/grant signing with runtime change). Full ceremony stays: local full suite where Windows or desktop behavior matters, long-form Astra-high review with mutants, **a genuine owner ruling** (see 3e), browser/e2e main-proof rungs per DELIVERY.md:71, and fresh-install closure. 2-3 h is acceptable here; this is where the time should go.

Tier assignment is decided at admission from `reviewClasses` plus one stop rule: any runtime byte or behavior change in an R0/R1 unit promotes it to the next tier. That is the TS7S1A rule, generalized.

Rule status:

- (a) Dropping local `test:stable`: **no rule change.** GOAL stage 3 does not require it.
- (b) Short-form Lane A: **no rule change.** The v2 header, identity, and ≥2 mutants are all retained.
- (c) Dropping routine OWNER-RULING: **no rule change.** The tooling does not require it.
- (d) Closure on green docs-class CI without local suites: **no rule change.** The admin merge is already permitted, and waiting for CI only adds safety.
- (e) **Owner decision needed:** may the Root agent post OWNER-RULING from the owner's account for sensitive units, or must the owner post it personally? Today the practice blurs this. Decide it before P3 resumes (P2CG1B onward carries authority classes).
- (f) **Owner approval needed (optional, ~10 more minutes per unit):** a "closure-carry" amendment. Predecessor N's closure receipts may ride in successor N+1's PR, exempt from N+1's caps and lifecycleOwnershipLimit, with N+1's admission baseline set to N's merge commit, and only within the same node or track. I rate this lower priority: (d) already captures most of the gain without coupling two units' fates.

## 4. Machine-contention policy

- **One heavy run on the machine at a time. No exceptions.** Heavy means: full Jest or any `test:stable`, the roadmap loop or identity suites, `next build`, `storybook:build`, Playwright, the perf lane, and concurrent `npm ci` in two worktrees. Light, and allowed in parallel: typecheck (TS7 runs in ~5 s), validator, lint or format of touched files, focused Jest with ≤5 suites, git and gh.
- **Use the gate that already exists.** `scripts/qc/machine-idle.mjs` already detects busy jest, playwright, and next build/start processes (`MACHINE_BUSY`), and `roadmap-main-proof` already waits on it. Every agent prompt must say: before any heavy command, run the idle check and wait. Never start a heavy run while another is live. If the check fails after 15 min, report instead of running anyway.
- **Root owns the queue.** Priority order: (1) the main proof for the merged unit, which is on the critical path to releasing the successor; (2) the implementation's unit acceptance commands; (3) anything else. A review agent runs no heavy commands. Mutants are run as focused tests.
- **Shrink the heavy surface instead of scheduling it.** With 3(a) and 3(d), a routine unit has **no local full-suite run at all**. CI's six Linux shards are free parallelism that does not contend with the workstation. This removes most of the contention outright.
- **Contention failures are not evidence.** A spawnSync ETIMEDOUT that happened while another heavy run was live gets re-run alone once. Record it as contention, and do not open a triage thread. `roadmap-codex-identity-capture.test.ts`'s 30 s spawn timeout is load-sensitive on Windows. Note it as a test-hardening candidate, not a blocker.

## 5. Top 5 changes, in priority order

1. **Stop running `test:stable` locally for R0/R1 units.** Cite the exact-head CI run in the local receipt. Saves about 17 min per unit and removes the main contention source. No rule change.
2. **Closure: no local roadmap suites; merge on green docs-class CI** (about 4 min), generated receipts, ≤10-line successor notes. Cuts closure from ~37 min to 10-15. It also fixes today's inversion, where CI is ignored and a slower duplicate gates. No rule change.
3. **Short-form, timeboxed Lane A for routine units, kept independent with ≥2 mutants.** Long form only for decision items and Tier S. Cuts PR-open-to-merge from ~33 min to ~15. No rule change.
4. **Drop OWNER-RULING ceremony for routine units now. Ask the owner to rule on who may post Lane B for sensitive units** before P2CG1B. That keeps the one owner gate meaningful. The owner must decide only the Tier S question.
5. **Enforce one heavy run at a time through `machine-idle.mjs`, with Root-owned priority.** Pipeline successor implementation during closure, now that the heavy work has moved to CI and the overlap no longer collides.

Expected effect: a routine unit goes from ~115 min to ~45-55 min. A 10-line lockfile unit stops costing the same as a feature, and Tier S units keep, or gain, scrutiny.
