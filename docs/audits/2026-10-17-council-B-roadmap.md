# Council review 2026-10-17 - Member B: product outcome / roadmap after TypeScript 7

- Lens: what the roadmap after TS7 should be, judged by user-visible outcome.
- Mode: independent, read-only (no repo edits, commits, PR comments, heavy runs). Light `git`/`gh`/file reads only.
- Inputs read: `.omo/plans/mekstation-phased-delivery-20261015/PLAN.md` (Revision 2026-10-17 + phase table), `STATUS.md` (top entries, 2026-10-16/17), `.github/workflows/{auto-version,release,pr-checks}.yml`, `electron-builder.yml`, `desktop/package.json`, `gh release list`, `gh run list`, tag list.
- Observed Main: `08555b7a` (2026-10-16, PR #2180 merge). Local branch `main`.

## 0. Verified facts (corrections to the brief in bold)

| Claim                                                                                      | Verified          | Evidence                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1, P2 closed; P3 open at P2CG1B                                                           | Yes               | PLAN Revision 2026-10-17; STATUS 2026-10-16 "P2CG1B NOT released (held)"                                                                                                                                             |
| No GitHub release since v1.4.225 (2026-05-16)                                              | Yes               | `gh release list` -> latest v1.4.225                                                                                                                                                                                 |
| v2.0.0 tag exists, never released                                                          | Yes               | tag on `099258f23` (2026-07-10, PR #1027 "revive release pipeline"); no release object                                                                                                                               |
| auto-version mints only on subject markers / dispatch                                      | Yes               | `auto-version.yml` bump "none" otherwise. **Additional:** Main merges are merge commits, so `%s` is "Merge pull request #N ..." - a PR title marker never fires. Only `workflow_dispatch` can realistically mint.    |
| release.yml workflow_run path skips unless tag sha == triggering head                      | Yes               | `release-context` guard. Every release.yml run since July is a 13-16 s skip (6 most recent all `workflow_run`, ~14 s).                                                                                               |
| **The full release build path has not executed successfully on any commit since v1.4.225** | Yes               | Only `push`-event runs on record are v0.1.0/v0.1.1 failures (Dec 2025). The SIGPIPE fix (`sed -n 1p`) and the head-sha guard were added in-place and never exercised by a real mint. The pipeline is fixed on paper. |
| Versions 0.1.1 (root) / 1.0.0 (desktop)                                                    | Yes, **cosmetic** | release.yml injects `--config.extraMetadata.version=$APP_VERSION` from the tag; artifact names use `${version}` from that. Installer will read 2.1.0 regardless.                                                     |
| CI "Build Test" builds unpacked apps only                                                  | Yes               | pr-checks job "Build Test / platform" via prepare-build; no packaged launch                                                                                                                                          |
| "E2E Smoke" = tactical map only                                                            | Partially         | job runs chromium Playwright; e2e dir also has `gm-two-player-*.smoke`, `playtest-*-smoke` specs, but no Electron/packaged-app launch spec exists anywhere                                                           |
| `release` job needs `docker-push`                                                          | Yes               | `release: needs: [release-context, build, docker-push]`. A Docker Hub credential/push failure (PAT unused for 5 months) blocks the GitHub release even when all four installers built.                               |
| Auto-update risk on publishing                                                             | None found        | `electron-updater` is only a `desktop/package.json` dependency; no `autoUpdater` wiring under `desktop/src`. Publishing v2.1.0 will not push updates to v1.4.225 installs.                                           |
| Per-unit cost ~2-3 h                                                                       | Yes               | STATUS 2026-10-16: "~2-3 h wall ... most of it test:stable (~17 min) + roadmap-loop-closure-proof (~14 min)", serialized machine-wide                                                                                |
| P2CG1 chain = 14 units, 13 ahead                                                           | Yes               | A1, A2 done; B, C, D, E, F, G1, G2, H (activation), I1, I2, I3 (deletion split in 3), I4 (fail-closed ungated create after deletions); then P2CG2, P2CH, P2C (24 predecessors)                                       |

Not verified in budget: the live `units.json` behavior text and machine predecessors for P2CG1B..G2, P2CG2, P2CH, and whether Tasks 17-19 hard-depend on I1-I4. The Q3 triage below states the assumption it rests on.

## 1. Next user-visible milestone: publish v2.1.0 before resuming P3

**Answer: yes.** The next milestone after TS7 is a published, installable GitHub release of current Main as **v2.1.0**, before P2CG1B is released. Reasons:

1. The owner's stated goal is "something that builds and then we can add onto in layers". Nothing has been proven to build-and-ship for five months; P2 proved Main works in a dev/CI context, not as an installer a user downloads.
2. The release pipeline is the single highest-value unknown in the repo: it is believed fixed but has zero successful executions since the fix. Discovering a 4-platform electron-builder or Docker breakage _now_ costs one unit; discovering it after P3 costs the same unit plus every P3 unit's worth of untested release risk.
3. It is cheap (one small PR + one dispatch + one manual smoke, ~1 unit of wall time) and is not a product-writing-lane conflict: no `src/` changes.
4. P3's first user-visible result is >= 10 units away (~25-40 h wall). A release first gives the owner a concrete artefact and a baseline to diff every later layer against.

`v2.1.0` is correct mechanically: latest tag is v2.0.0, so `bump_type=minor` -> v2.1.0 with no manual tag arithmetic.

### Minimal steps (one unit, "REL-04: publish v2.1.0")

1. **Workflow PR (tiny, ~10 lines, `.github/workflows/release.yml` only):**
   - Change `release: needs: [release-context, build, docker-push]` to `needs: [release-context, build]`. Docker stays as a parallel job; it must not hold the installer release hostage to an unused PAT.
   - Optionally set `prerelease: ${{ contains(tag, '-') }}` so a future `-rc` tag can be used for dry runs. Not required for v2.1.0.
   - Do NOT touch auto-version.yml. Do not add subject-marker conventions; dispatch is the deliberate trigger.
2. **Version alignment (same PR, optional, 2 lines):** set root `package.json` and `desktop/package.json` `version` to `2.1.0` so dev builds / About dialogs stop saying 1.0.0. Cosmetic; skip if the lockfile churn under npm 11.19.1 is unwelcome (lockfile `version` fields would also change).
3. **Mint:** after the PR merges and the TS7 stopping condition is main-verified: `gh workflow run auto-version.yml --ref main -f bump_type=minor`. Confirm the auto-version run shows "Tag Created: Yes" and the follow-on release.yml run resolves the tag (not the 14-s skip). Expect 60-90 runner minutes.
4. **Installer smoke (manual, owner or Root, ~15 min, Windows):** download the NSIS installer (not the portable) from the release, install, launch, and run the P1 loop once: build -> save -> record sheet -> battle -> Results -> reload -> repeat/exit. Record the session in `playtest/` with the release URL and the exact tag sha. This is the L0 acceptance test until step 5 exists.
5. **Automated packaged-launch smoke (follow-up unit, L0.1):** add a Playwright `_electron.launch()` spec against the `win-unpacked` output that the existing "Build Test" job already produces; assert the main window loads and `http://localhost:3600/` serves the unit list. This converts "Build Test" from "it packaged" to "it runs".
6. **If the build fails:** fix forward and mint v2.1.1; do not reuse the tag. Tags are free; the only cost is runner minutes.

## 2. Restructure P3-P8 as ordered layers

Each layer is a user-visible capability, has one named acceptance test, and ends with a published release. Phase IDs, task IDs, caps, and gates do not change; this is a presentation and sequencing layer over the existing ledger (the same approach the 2026-10-17 revision already took).

| Layer                                   | User-visible capability                                                                                                  | One acceptance test                                                                                                                     | Release      | Existing phase/tasks                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| **L0 Installable baseline**             | A user can download, install, and run the repaired app on Windows (mac/linux artefacts present).                         | Packaged app completes the P1 loop (manual once; then the Electron launch smoke).                                                       | **v2.1.0**   | P1+P2 (closed), TS7 track, REL-04 (new, one unit)                                             |
| **L1 First shared mission**             | Two real clients (GM + one player) on one server share a mission; each controls only their own units; reconnect resumes. | `e2e/gm-two-player-membership.smoke.spec.ts` (+ one foreign-unit refusal case) passes on Main against a packaged or `npm start` server. | **v2.2.0**   | P3 core: P2CG1B..G2, H (activation), Tasks 17, 18, 19                                         |
| **L2 Hardened mission**                 | Scoped tokens, snapshot application, correct refusals while a correction saga is pending; legacy transport removed.      | Scope/refusal/reconnect contract pack (PLAN P3 exit discriminators) on Main.                                                            | **v2.3.0**   | Rest of P3: I1-I4, P2CG2, P2CH, P2C closure, 58, 59, 61, 62-66, P2CER; P3 exit + Astra review |
| **L3 Production combat authority**      | Combat results come from journal authority; carried-over campaign databases still load.                                  | Task 33 two-profile UAT (fresh DB + byte-preserved round-one DB).                                                                       | **v2.4.0**   | P4: 20-33                                                                                     |
| **L4 Dependable correction & recovery** | GM correction, fogged rewind, restart/reconnect survive real failures.                                                   | E2E-31..45 / E2E-61..80 scenario packs + scored endurance (67 -> 50).                                                                   | **v2.5.0**   | P5: 34-54, 67                                                                                 |
| **L5 Reliable consequences & history**  | A mission's effects apply once and survive crash/retry; next scenario launches from the terminal state.                  | Task 81 terminal-to-next-scenario UI proof (checkpoint), then 82-87 rollback/refusal proof.                                             | **v2.6.0**   | P6: 68-87                                                                                     |
| **L6 Campaign journey**                 | Published design -> campaign instance -> travel -> opportunity -> mission, with usable map views.                        | Task 104 full journey with reload/replay/guest convergence; Task 103 >= 30 FPS.                                                         | **v3.0.0**   | P7: 88-104                                                                                    |
| **L7 Program closeout**                 | Not a user layer: truthful final accounting.                                                                             | F1-F4 on exact final inputs.                                                                                                            | none (audit) | P8: 127, F1-F4                                                                                |

Rules for the layer scheme:

- A layer's release is cut from Main at the layer's acceptance, not at phase exit; where PLAN says the phase closes only with its full contract (P3-P7), the _phase_ can stay open while the _layer release_ ships (e.g. L1 ships inside an open P3). This is the mechanism that keeps releases short without weakening phase contracts.
- Every release repeats the L0 smoke. Nothing ships that does not install and run the P1 loop.
- Astra independent reviews stay at phase exits (L2, L3, L4, L5, L6), as PLAN already requires.

### What stays held (not reordered, not implied by any layer)

- Owner decisions: OD-scripts-tsconfig (blocks TS7S2OD; S2OD/S5B/S5C remain a gated tail), OD-next-upgrade.
- CAMP-H human gates and the P7 held inputs: actual pilot-version ruling, CAMP compatibility/witness inputs, opportunity policy, B7 decisions.
- Task 33's carried-over round-one DB: custodian must be named; a synthetic fixture does not substitute.
- Task 50 scored endurance: calibration (67) first, never retune a failed scored run.
- P8 final owner acceptance.
- Private audit artefacts and user data never become product commits (P2 rule, still in force).

## 3. P3 chain: required for L1 vs deferrable

Assumption (to confirm against live `units.json`): Tasks 17-19 are machine-gated on P2C closure, which has 24 predecessors including I1-I4, P2CG2, P2CH. If so, pulling L1 forward needs one docs-only ledger amendment PR (same shape as #2165/#2167: cheap, parallel with the running unit) that makes 17-19 depend on H + I4-equivalent fail-closed guard rather than on the full deletion tail.

| Unit(s)                                                                                                               | Verdict for L1                                   | Why                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2CG1B, C, D, E, F, G1, G2 (behavior: durable evaluator, journal writer, creator binding)                             | **Required**                                     | They are what H activates. No shortcut without re-registering the chain.                                                                                                                                                                                      |
| P2CG1H (activation: installs the receipt port)                                                                        | **Required**                                     | This is the single switch that turns ~40 merged dormant PRs into live behaviour. L1 does not exist without it.                                                                                                                                                |
| Task 17 (P2C closure/readmission), 18 (real shared-mission client journey), 19 (own-unit admission / foreign refusal) | **Required**                                     | 18 and 19 _are_ the L1 acceptance. 17 only to the extent it is a hard predecessor; if P2C closure is purely a ledger roll-up of 24 slices, that roll-up can be done after L1.                                                                                 |
| I4 (fail-closed ungated mission create if receipt port failed to install)                                             | **Required in spirit**                           | The authority gap it closes (ungated mission create when the port is absent) is an L1 safety property. If I4's registered form depends on I1-I3 deletions, register a minimal fail-closed guard against the _legacy-present_ world for L1 and keep I4 for L2. |
| I1, I2, I3 (delete legacy transport ACK / static e2e / legacy path)                                                   | **Deferrable to L2**                             | Deletions add no user capability; the split-registration review verified "legacy keeps working at every intermediate main". Ship L1 with legacy present, then delete.                                                                                         |
| P2CG2, P2CH                                                                                                           | **Deferrable to L2 unless proven otherwise**     | Registered as post-chain closure/hardening; not named in any L1 behaviour. Confirm in ledger.                                                                                                                                                                 |
| 58, 59, 61 (privacy/convergence spec, truthful activity, public-route refusal during correction saga)                 | **Deferrable to L2**                             | Correctness properties of an already-working mission; contract packs, not first-run capabilities.                                                                                                                                                             |
| 62-66 (scoped auth migration + enforcement, packaged boundary, CampaignSnapshot proof)                                | **Deferrable to L2**                             | PLAN itself orders "migrate consumers before enforcement"; L1 can run on current tokens. 66 needs 17 anyway.                                                                                                                                                  |
| P2CER (registration prerequisite, "releases no source by itself")                                                     | **Ledger-only; do not let it gate L1's release** | Registration can land any time; it is not a user capability.                                                                                                                                                                                                  |

Net effect: L1 is ~7 product units (B..G2, H) + 17-19 (3) = ~10 units, ~25-30 h wall, instead of ~18 units to P3 exit. The deferred ~8 units are not dropped; they are L2 and still precede the P3 exit review.

## 4. Numbered roadmap (first action after TS7 is step 1)

1. **REL-04 PR**: `release.yml` `needs` decoupling (+ optional 2.1.0 version alignment). Prepare in its own worktree now, during the TS7 tail; merge the moment TS7S5A (or S5C if OD-scripts-tsconfig is ruled by then) is main-verified.
2. **Mint v2.1.0**: `gh workflow run auto-version.yml --ref main -f bump_type=minor`. Watch the release.yml run that follows; it must not be a 14-second skip.
3. **L0 acceptance**: Windows NSIS install + P1 loop, recorded in `playtest/`. If the build or smoke fails, fix forward and mint v2.1.1. L0 is done when a release page with four platform artefacts exists and the smoke is recorded.
4. **Ledger amendment PR (docs-only, parallel with step 2-3)**: register L1 as the layer boundary; reorder so 17-19 follow H (+ minimal fail-closed guard) and I1-I4 / P2CG2 / P2CH / 58-66 / P2CER follow 19. Keep P2C's 24-slice closure as the L2/P3-exit roll-up.
5. **P2CG1B..G2** in the existing cadence (prepare successor in own worktree during predecessor closure). No new review classes.
6. **P2CG1H (activation)** with its registered e2e probe and pack leaves. This is the first commit where the product behaves differently; Astra high review here (major checkpoint).
7. **Tasks 18 and 19** (19 may precede 18 if the ledger allows): the L1 acceptance spec passes on Main; 17 as needed.
8. **Mint v2.2.0** and repeat the L0 smoke on the installer. L1 done.
9. **L0.1 packaged-launch smoke** in CI "Build Test" (Playwright Electron spec; one unit). Slot it between L1 and L2 so every later release has an automated install-and-run check.
10. **L2**: I1-I4, P2CG2, P2CH, P2C closure, 58, 59, 61, 62-66, P2CER; P3 exit + independent Astra review; mint v2.3.0.
11. **L3-L6** per the phase table, each closing with its named acceptance, an Astra phase-exit review, and a minor release (v2.4-v2.6, then v3.0.0 for the campaign journey).
12. **L7**: P8 closeout (127, F1-F4) on the exact final source; no release.

Owner gates fall where they already sit: OD-scripts-tsconfig before TS7S2OD; none block steps 1-8.

## 5. Keeping the cycle short (observations, not new process)

- The 2-3 h unit is ~1 h of serialized proof (`test:stable` 17 min + `roadmap-loop-closure-proof` 14 min, each run twice: author and closure). Closure PRs already skip `test:stable`; keep it that way. Do not add proof to the release unit beyond CI + the smoke.
- Combined "closure + release next" PRs (already practised on TS7S1A->S1B etc.) save one PR per unit; make that the default for the L1 chain.
- Release minting is a dispatch, not a PR; keep it out of the product-writing lane.
- Each layer's acceptance test is named _before_ the layer starts (above). That is the only addition this memo asks for.

## 6. Risks and what I did not check

- The 4-platform electron-builder step and the mm-data asset fetch have not run in CI for 5 months; the mac notarization/signing state, runner images, and `actions/*@v5/v6` pins are all unexercised. Expect at least one fix-forward.
- Docker Hub push (`anaklumos/mekstation`, `DOCKERHUB_PAT`) may fail; with step 1's decoupling it becomes a visible but non-blocking failure. Decide separately whether Docker images are still a product.
- I did not open the live `units.json` for P2CG1B..G2 / P2CG2 / P2CH behaviour text. Section 3's required/deferrable split must be confirmed against it before step 4's amendment is drafted.
- No desktop auto-updater is wired, so v1.4.225 users will not be auto-upgraded; that is also a product decision for a later layer (electron-updater is already a dependency).
