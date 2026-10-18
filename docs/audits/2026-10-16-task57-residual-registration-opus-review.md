# Task 57 residual registration — independent review (PR #2136)

- PR: https://github.com/SwiggitySwerve/MekStation/pull/2136
- Head: `63b8b02410dfc3d1b24fc87e397dc30b5774f516` (branch `codex/task57-residual-registration-20261016`, one commit `63b8b0241 docs(roadmap): register U99/U100/U101/U103-U105 and U101a-d`)
- Base: `ba8007f2dfea7786a3823145eb999e308c97f3fa`
- Contract: `.omo/plans/mekstation-whole-roadmap-reconciliation-20261002.md` task 57 (lines 1784-1795), plus tasks 58-66 for task numbers, predecessors and selectors
- Reviewer: Claude Opus 5.5, read-only. No branch, packet, ledger or product file was modified. All mutation probes ran against temp copies via `--roadmap`. `units.json` and `roadmap.json` hashes were checked before and after (`sha256sum -c`: OK).
- I judged the diff, not CI.

## Verdict: APPROVE-WITH-NOTES

No blockers. The registration matches the task 57 letter on holders, task numbers, predecessors, original caps, exact-file alias amendment and the no-product-edit rule. The validator change only adds checks. F1 (U105 selector narrower than the plan letter) should be fixed before merge or recorded as a tracked amendment. The other findings are low or informational.

## Q1 — Registered units, aliases, caps, tasks, predecessors, selectors

The holder list is exactly `U99, U100, U101, U103, U104, U105, U101a, U101b, U101c, U101d` (`units.json:17327-17342`, marker `residualRegistration20261016`).

| Unit  | Node              | Task (plan)                | Predecessors | Caps (base → head) | Reg. files    | Files exist / inside unit ownership |
| ----- | ----------------- | -------------------------- | ------------ | ------------------ | ------------- | ----------------------------------- |
| U99   | R6.umbrella       | 58 (58)                    | —            | 2/120 → 2/120      | 2             | yes / yes                           |
| U100  | R2.authority-live | 59 (59)                    | —            | 3/120 → 3/120      | 2             | yes / yes                           |
| U101  | R2.authority-live | 65 (65 "U101d/U101")       | U101d        | 8/300 → 8/300      | 0 (aggregate) | —                                   |
| U103  | R6.loop-harness   | 60 (60)                    | —            | 6/350 → 6/350      | 4             | yes / yes                           |
| U104  | R2.authority-live | 61 (61)                    | —            | 5/220 → 5/220      | 4             | yes / yes                           |
| U105  | R2.authority-live | 66 (66)                    | —            | 8/300 → 8/300      | 4             | yes / yes                           |
| U101a | R2.authority-live | 62 (62)                    | —            | new 8/300          | 5             | yes / yes                           |
| U101b | R2.authority-live | 63 (63, blocked by 62)     | U101a        | new 8/300          | 7             | yes / yes                           |
| U101c | R2.authority-live | 64 (64, blocked by 62)     | U101a        | new 8/300          | 5             | yes / yes                           |
| U101d | R2.authority-live | 65 (65, blocked by 63, 64) | U101b, U101c | new 8/300          | 7             | yes / yes                           |

- **Original six unchanged.** After removing the added `registration20261016` key, every one of the 171 base units is structurally identical to base. No state, cap, receipt, ownerGate or ownershipPaths changed. Packets and deferrals are unchanged. The only top-level `units.json` change is the new `residualRegistration20261016` marker.
- **Original U101 grant excludes the new surfaces.** U101 still owns only `src/pages/api/multiplayer/auth` and `src/lib/multiplayer/server`. server.js, security schema, client and script paths sit only on U101a-d, as the contract requires.
- **Prospective IDs are collision-free.** `U101[a-d]` appears nowhere in base `units.json` or `roadmap.json` (0 matches) and in no tracked non-JSON file at base. No packet or deferral mentions U101.
- **Parent aliases.** The diff adds 14 exact file aliases to `R2.authority-live.ownershipPaths` (`roadmap.json:2866-2879`). All 14 exist as tracked files, none is a directory, and no existing alias was removed or widened. Every U101a-d ownership path is now a literal R2.authority-live alias. The validator's existing ownership rule confirms this: probes that remove `server.js` from the node, or add `src/pages/multiplayer` to U101b, both exit 1. The contract allows "a reviewed exact alias amendment". This review accepts these 14 aliases as exact-file amendments with no broad directory grant (see F6 for co-ownership).
- **Selectors** match the plan letter for U99, U100, U103, U104 and U101a. U101b and U101c are supersets of the plan selector. U101 and U101d substitute `socketTokenScope` for the plan's `scopedToken` (F2). U105 is narrower than the plan (F1).

## Q2 — Product edits

None. `git diff --name-only ba8007f2 63b8b024` lists only four paths under `openspec/planning/2026-09-12-roadmap-completion/`. There are no edits under src/, server.js, scripts/, e2e/ or package files.

## Q3 — Validator and test changes

`validate-roadmap.mjs`:

- **`validateResidualRegistration` (`:157-180`)** is a new function, called once at `:406` in every mode (not only `--next`), right after unit uniqueness. It only calls `fail()` and changes no existing rule, constant or exit path.
- **Task-number alignment (`:159-160`)** is correct. Iterating `ceilings` in key order maps to `[58, 59, 65, 60, 61, 66, 62, 63, 64, 65]` = U99→58, U100→59, U101→65, U103→60, U104→61, U105→66, U101a→62, U101b→63, U101c→64, U101d→65, matching plan tasks 58-66. The hardcoded ceilings equal the base caps of all six holders.
- **The `U101` empty-files exception (`:170`)** applies only to `id === 'U101'`. Probe: empty U101b files → exit 1 "U101b lacks exact residual files".
- **Predecessor semantics.** `same()` (`:74`) is an order-sensitive JSON compare against the `dependencies` map, so wrong or reordered predecessors fail (probe: U101d → `['U101b']` exit 1). In `--next`, `predecessorsReady` (`:767-768`) is an extra AND term on the existing admission condition, so it can only block. It uses `TERMINAL_UNIT_STATES` (`:62`, main-verified/complete/archived), and an unknown predecessor ID reads `undefined` state and stays not-ready (fails closed). Units without `registration20261016` default to `[]`, so other units behave as before.
- **Existing rules are not loosened.** The unit-ownership-within-node rule, the per-node cap ceiling (probe: U101a maxFiles 40 → "exceeds R2.authority-live"), the 1..15 cap integer rule and the next-unit path-freedom check are all untouched.

`validate-roadmap.test.mjs:559-598` adds a fixture control (`--next` → U99), four refusal cases and a predecessor-ordering case. That last case discriminates: U101 precedes U101a in list order, so without the gate U101 would be chosen.

Logic findings: F3 (opt-in marker bypass), F8 (untested new branches), F9 (order-sensitive marker).

Collision and ownership against PR #2135 / P2CA (fetched head `e921a69f3cfa92f97a4aa03395fd145f0b567df6`):

- P2CA (planned, R2.authority-live) owns `src/lib/campaign` and `src/services/persistence`. Its PR files under `src/lib/campaign/sync/` and `src/services/persistence/` overlap no Task 57 registered file. They do overlap U100/U101c/U105 at directory level, which `pathFree` serializes once P2CA is in flight.
- `git merge-tree 63b8b024 e921a69f` merges cleanly; the two PRs' `units.json` hunks are disjoint (#2135 edits around lines 5458-5490).
- The validator `--next` on the merged tree exits 0 and prints `U24b`.

## Q4 — Re-run

Commands run in the worktree at head:

- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --next` → exit 0, stdout `P2CA`. This matches `happy.log`.
- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` → exit 0, `ROADMAP VALIDATION PASSED: 79 nodes, 13 packages, 381 tasks, 40 triage rows`.
- `node --test openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.test.mjs` → 68 tests, 68 pass, 0 fail.
- My own mutation probes on full real-ledger copies, all with `--next`:

| Probe                                       | Exit  | Message                                                                   |
| ------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| unmutated control                           | 0     | P2CA                                                                      |
| registration file outside unit ownership    | 1     | U101a residual file outside ownership: package.json                       |
| U99 files over cap                          | 1     | U99 measured 3 files over cap 2                                           |
| unit alias outside node                     | 1     | U101b owns src/pages/multiplayer, which is not owned by R2.authority-live |
| node alias `server.js` removed              | 1     | U101d owns server.js, which is not owned by R2.authority-live             |
| wrong task / wrong predecessor              | 1     | has incorrect residual task/predecessors                                  |
| non-node/npx selector                       | 1     | U100 lacks executable residual selectors                                  |
| duplicate file                              | 1     | U103 has duplicate residual files                                         |
| U101 cap +1 line, or U101a 15/500           | 1     | changed original residual cap                                             |
| marker deleted + U101 15/500 + outside file | **0** | P2CA (F3)                                                                 |
| extra `U101e` carrying registration         | **0** | P2CA (F3)                                                                 |

- The authority hashes at head equal those recorded in `happy.log` and `failure.log`: units `ceffa04f…78a9`, roadmap `898811b9…54af4`, validator `de457405…d350`, test `4fff954c…7104`. `failure.log` records unchanged before/after authority hashes and a restored private view for the outside-alias and 301-line negatives.
- Caveat on `failure.log`: its "outside-node-alias" negative exercises the pre-existing unit-within-node rule, not the new registration-file branch. My probe above shows the new branch also refuses.

## Q5 — Census (recomputed)

`git diff --numstat ba8007f2 63b8b024`:

| File                      |       + |     − |
| ------------------------- | ------: | ----: |
| roadmap.json              |      15 |     1 |
| units.json                |     305 |     1 |
| validate-roadmap.mjs      |      29 |     1 |
| validate-roadmap.test.mjs |      40 |     0 |
| **Total (4 files)**       | **389** | **3** |

This matches the claim. The three deletions are two JSON trailing-element lines turned into comma lines plus the replaced `--next` admission line.

Cap rules that apply:

- Task 57 has no unit record of its own. The lane self-applied the default 15 files / 500 lines and counted every contract and test line without exemption. 4 tracked files and 389 added lines fit; so does the 11-evidence-file + 4 = 15-path count the lane reports.
- The validator treats `openspec/planning/` as a docs prefix (`DOCS_PREFIXES`, `validate-roadmap.mjs:63`). No planning-file exemption was used to justify fit.

## Q6 — Packet and state honesty

- No unit state moved: all new units are `planned` with null receipts and a null ownerGate, and the six holders keep their base state (`planned`).
- No packet or deferral changed, and no owner ruling was invented. The marker `rule` text restates the contract (prospective only, original caps, fresh measured admission, U101 stays the aggregate obligation).
- Triage 32-37 `triageDisposition` blocks are intact.
- `qa.md` correctly disclaims P2CA dispatch, product acceptance, task ticks and merge.

## Findings

**F1 — Medium — U105 selector narrower than plan task 66; validator shape rule cannot express the plan's gate.**

- `units.json:12048` registers `--testPathPattern='campaignSyncTransport|CampaignSyncSession'`.
- Plan task 66 QA happy requires `--testPathPattern='CampaignSnapshot|campaignAuthoritativeFold|CampaignSyncSession'` **and** `npm.cmd run verify:qc:coop-campaign-journey`.
- The registration drops the snapshot and authoritative-fold suites and the journey gate. The deviation is not disclosed in `qa.md`, `scope-census.md` or `pr-body.md`.
- The new selector rule at `validate-roadmap.mjs:177` accepts only `node `/`npx ` prefixes, so the plan's `npm.cmd run …` gate cannot be registered at all.
- Task 57 acceptance requires "correct selectors". The registry selectors are not yet consumed by any execution gate, so this is not a blocker. Still, a Task 66 executor reading the registry instead of the plan would under-verify.
- Fix: register the plan-letter selectors and allow an `npm.cmd run ` prefix, or record the narrowing as a disclosed, reviewed amendment.

**F2 — Low — U101/U101d selector substitution and broad U101b selector not disclosed.**

- `units.json:11890` and `units.json:12260` use `socketTokenScope` where plan task 65 says `scopedToken`. No tracked path contains `scopedToken`, so the plan selector would select nothing for that term. The substitution is defensible, since `socketTokenScope.test.ts` exists and is registered, but it is undisclosed.
- U101b adds `|issuePlayerToken` and U101c adds `|campaignSyncTransport` to the plan selectors. Both are supersets.
- The U101b pattern selects 228 suites (`qa.md` discovery), so it is not a discriminating selector.

**F3 — Low — The new check is opt-in on a top-level marker and ignores unlisted registrations.**

- `validate-roadmap.mjs:158` returns early when `residualRegistration20261016` is absent. Deleting the marker disables every Task 57 assertion, including the U101 8/300 pin. Probe: marker deleted, U101 caps 15/500 and an outside-ownership registration file → exit 0.
- A unit carrying `registration20261016` but absent from the marker (probe `U101e`) gets no checks at all, though `--next` still honors its predecessors.
- This does not weaken any existing rule, and deleting the marker would be a visible diff.
- Hardening: trigger on any unit that carries `registration20261016`, and require every such ID to appear in the marker.

**F4 — Low — The exact-file bound lives only in metadata; some unit grants are directory-shaped.**

- U101a and U101d own `src/lib/multiplayer/server` (U101a also `src/pages/api/multiplayer/auth`), and U101c owns `src/lib/campaign` (`units.json:12167`). These are literal existing node aliases, which the contract sanctions.
- Nothing in the validator constrains a future product diff to `registration20261016.files`. Downstream admission must measure against the registered files, as the marker rule says.
- `pathFree` will serialize U101c against every `src/lib/campaign` holder (U100, U105, P2CA).

**F5 — Info — The cap is read per prefix, not in aggregate.**

- The union of U101a-d registered files is 21 distinct files, against U101's original 8. Each prefix is individually ≤8/300.
- The per-prefix reading is the only one consistent with the plan's own split (task 63 alone names seven client files) and with the U55a "stricter U55/H cap" precedent. The marker rule states it explicitly.
- Flagged for owner awareness only; this review makes no ruling.

**F6 — Info — Cross-node co-ownership from the alias amendment.**

- 12 of the 14 new exact aliases also fall under other nodes' directory aliases: R2.multiplayer-client (planned) for `src/pages/multiplayer` and `src/pages-modules/multiplayer`, R2.combat (`src/lib`), and the R1/R6/R9 script nodes for `scripts/__tests__`.
- `server.js` and `scripts/validate-multiplayer-packaged-socket.mjs` had no node owner before.
- The `src/lib/api/securitySchemas.ts` alias is redundant with the existing `src/lib/api` alias, and harmless.
- R2.authority-live is `main-verified`. Amending its ownership follows the existing pattern: it already hosts the planned U100/U101/U104/U105/P2CA.

**F7 — Info — Shared registered files.**

- U105 and U101c both register `src/lib/campaign/coop/campaignSyncTransport.ts` and its test, with no predecessor order between them.
- U101a and U101d share `auth.ts`, `securitySchemas.ts` and `socketTokenScope.test.ts`; predecessors order these.
- `pathFree` serializes these at runtime. Each unit's admission must still count every touched file toward its own cap.

**F8 — Low — New validator branches lack committed tests.**

- The committed tests cover measured additions, a missing prefix and a changed cap.
- The "outside node alias" case (`validate-roadmap.test.mjs:577`) hits the pre-existing unit-within-node rule, not the new `residual file outside ownership` branch (`:174`).
- There are no committed tests for files over cap, duplicates, wrong task or predecessor, or selector shape. My probes show each of these branches refuses correctly; only regression pinning is missing.

**F9 — Info — The marker unit list must match ceiling order.**

- `same()` at `:162` compares the marker against `Object.keys(ceilings)` order-sensitively. Correct today, but a reorder-only edit would fail with a "must name all ten unique units" message that does not mention order.

## Answers summary

1. Yes: exactly the ten IDs, with literal aliases (14 exact-file node amendments, no directory widening), original caps unchanged, and correct task numbers and predecessors. Selectors: F1/F2.
2. No product edits.
3. The validator only adds checks and tightens `--next`. No existing rule is weakened. Logic is correct; hardening notes F3/F8/F9.
4. Reproduced: `--next` exit 0 `P2CA`; 68/68 tests pass; negatives exit 1; authority hashes unchanged.
5. Census 4 files +389/−3, matching the claim exactly.
6. Honest: no state advance, no packet or ruling edit, no invented owner decision.
