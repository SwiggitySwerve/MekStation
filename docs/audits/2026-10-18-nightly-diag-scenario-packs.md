# Scenario Pack Recapture diagnosis — 2026-10-18

The latest six pack failures represent **three failure mechanisms**, not six demonstrated product regressions: three stale campaign captures/pins; two unsupported co-op registry entries; and an intermittent CI dev-server route failure before combat begins. Do not widen the comparator, hand-edit payloads, or regenerate all packs indiscriminately.

## Evidence and limits

Primary source revision: `1b8558625e1e488e6ba62b916ec68bd2ed0d701f`, run [39129982940](https://github.com/SwiggitySwerve/MekStation/actions/runs/39129982940). All source file:line references below refer to that revision unless explicitly marked `origin/main`.

Executed `gh run view <id> --log-failed` for all five requested runs. Downloaded `nightly-playwright-report` with `gh run download` for the latest run and intermediate run 39017508685. Private evidence directory: `C:/Users/wroll/AppData/Local/Temp/mekstation-scenario-diag-20261018/`, containing `<run-id>-failed.log` and `<run-id>-artifacts/`.

The latest downloaded full-suite artifact contains 44 `trace.zip` files, 33 `error-context.md` files and 46 `test-failed-1.png` files; the intermediate artifact contains 43, 41 and 62 respectively. Inspected the inventory and representative campaign contexts/network traces. **Neither artifact contains scenario-pack minting output.** The recapture job has no upload step (`.github/workflows/nightly-validation.yml:270-306`); the full-suite upload at lines 198-205 belongs to a different runner/job. GitHub's artifact inventory for the latest run contains only the full-suite report and coverage, and the intermediate run adds subsystem reports—not a recapture artifact.

Consequently, the actual fresh pack JSON, recapture screenshots, and combat minter trace/error context are not recoverable from these artifacts. Logs name their temporary runner paths, but those paths were never uploaded. The script also restores original payload/provenance bytes in `finally` (`scripts/qc/recapture-scenario-packs-core.ts:535`). A field-by-field diff of the _fresh CI mints_ is therefore unavailable. Size-growth explanations below distinguish proven source changes from inferred byte attribution.

No build, Jest, Playwright, minting, dependency installation or local reproduction was run. No pack was minted or overwritten. No repository source changes, commits, PRs, or edits in `E:/Projects/Personal/MekStation` were made. This report is the only authored output file; downloaded CI evidence stays in the private temporary directory.

## Five-run comparison

All timestamps are UTC. `V` = fresh capture succeeds, then fails schema pin `2 != 1`; `R` = capture fails after campaign-create PUT returns 404; `C` = committed co-op payload is incorrectly checked as a combat match log.

| Run / created                 | Head           | Navigation | Personnel | Experience | Combat | Co-op host / guest | Economy / maintenance |
| ----------------------------- | -------------- | ---------- | --------- | ---------- | ------ | ------------------ | --------------------- |
| 39013211365 / Oct 17 07:19:37 | `105eddcb9209` | V          | V         | R          | R      | C / C              | V / V                 |
| 39017508685 / Oct 17 08:28:44 | `31610a56daa6` | V          | V         | V          | PASS   | C / C              | V / V                 |
| 39022280834 / Oct 17 09:44:37 | `33d6476e9f74` | V          | V         | V          | PASS   | C / C              | V / V                 |
| 39033900424 / Oct 17 12:47:03 | `0ba167f32edf` | V          | V         | R          | R      | C / C              | V / V                 |
| 39129982940 / Oct 18 13:04:54 | `1b8558625e1e` | V          | V         | V          | R      | C / C              | PASS / PASS           |

Navigation/personnel and both co-op failures are consistent across the requested sample. Experience has consistent pin drift whenever capture reaches completion, plus the same intermittent route failure as combat. Combat is intermittent: two passes and three failed jobs, with retries exhausted in each failed job. None of these six has a newly observed failure signature on Oct 18.

`git log` across the run heads does not identify a new Oct 18 campaign pin/comparator change: those causes predate the first sampled run. Economy/maintenance were separately refreshed by `8da274e5e4e36f6eb8ad54d94958d66144841f40` (Oct 17, “give fast-forward teams distinct roster units”); their pins/captures changed and they pass latest. This is useful corroboration, not a reason to overwrite the other packs blindly. The three flow pins and two co-op registrations were untouched by that repair.

The workflow history also lists failing nightly runs before Oct 17, including Oct 16 run 38910827190. This report establishes behavior in the five requested runs; it does not claim Oct 17 was the first-ever failure date.

## 1. Navigation, personnel and experience: stale captures and schema pins

**Classification: (e) stale committed baseline/fixture. High confidence.** This is intentional product evolution with an unrefreshed cache, not evidence that campaign v2 is broken.

Root cause:

- `e2e/scenario-packs/manifest.ts:52`, `:68`, `:87` pin these packs to schema 1. Each corresponding `campaign/<pack-id>.campaign.json:2` is schema 1, originally minted July 11.
- `src/lib/campaign/persistence/campaignMigration.ts:25` declares schema 2; lines 62-88 migrate v1 by adding source authority and instance identity. `campaignEnvelope.ts:44-50` emits v2 plus `instanceId` and `authority` for every new save.
- `scripts/qc/recapture-scenario-packs-core.ts:215` compares a validated payload's version to its manifest pin. `recapture-scenario-pack-stages.ts:validateAndCompareFreshStage` applies that same validation to the fresh capture. Thus an old payload matching pin 1 passes the committed stage, while the fresh v2 capture fails against that same pin.

Introducing intended product change: [`beb42450ebc71b6d9a45762abc57929b2a564813`](https://github.com/SwiggitySwerve/MekStation/commit/beb42450ebc71b6d9a45762abc57929b2a564813), Aug 23, PR #1326, “D2 authority metadata on the campaign record.” It raised the current envelope version and supplied the migration without refreshing these July packs. This predates all requested run heads.

### Why the fresh payloads are larger

Observed latest sizes: navigation 12.3 → 16.1 KiB; personnel 8.2 → 12.1 KiB; experience 7.8 → 11.7 KiB. These are rounded sizes (`formatKB`, recapture core:453); no threshold or byte-equality assertion uses them.

Read-only comparison of the committed content against the current capture/serialization path identifies these intentional additions:

1. Top-level `instanceId` and `authority`, emitted by `campaignEnvelope.ts:49-50` (PR #1326). The v1→v2 migration itself adds these identity fields; it does **not** account for several KiB alone.
2. `body.unitMaxStates`: full per-unit construction armor, structure and ammunition maxima. All three committed packs have four roster units and lack this field. `CreateCampaignPage.submit.ts:283-286` now awaits its population before the first save; `campaignUnitMaxStates.ts:55-74` resolves and stores it; `unitMaxStateResolver.ts:77-85` constructs the per-location/per-bin maps; `serializeCampaign.ts:166` serializes it. This population landed in [`17525370e00bfd8f022783f2bf1f6b9250422ca6`](https://github.com/SwiggitySwerve/MekStation/commit/17525370e00bfd8f022783f2bf1f6b9250422ca6), Sep 15, PR #1735. This is the strong source-backed explanation for the nearly identical multi-KiB growth across three four-unit captures.
3. Current roster units additionally carry `unitSource`, pinned `sourceVersion`, and optional `tonnage` (`CreateCampaignPage.submit.ts:153-166`); their July committed counterparts omit those fields. The source-identity enrollment change began with `0e5894501` on Aug 13; later tonnage caching is `bce90a7d8`.

Run-varying IDs, timestamps, RNG seeds and market content also exist by design. `packStamping.ts:29-37` deliberately allows row-local force/unit/body-mission IDs to retain minted values. The spec expressly permits calendar/RNG/market variation (`openspec/specs/scenario-packs/spec.md:161-177`). These explain ordinary residual variation; **they are not the failure condition**.

The stable rounded size increases plus current source writers support additive-content drift, especially construction maxima. Without uploaded fresh JSON, an exact byte budget or proof that no other fields changed would be invented. Retain fresh payload diagnostics in a future recapture before making a stronger content-equivalence claim.

**Fix proposal:** intentionally re-mint only these three registered packs through `scripts/qc/mint-scenario-pack.mjs`. Review and update their six payload/provenance files under `e2e/scenario-packs/campaign/`, and the three manifest records in `e2e/scenario-packs/manifest.ts` with generated provenance and pin 2. Run each existing parity spec. Keep separate migration coverage for genuine legacy-v1 loading in `src/lib/campaign/persistence/__tests__/campaignMigration.test.ts`; the ordinary registry cache need not double as a permanent stale baseline.

Do not just change manifest pins: committed v1 payloads would then fail. Do not hand-change JSON `schemaVersion`: this bypasses the generator and omits the actual new state. Do not relax the pin check; the current failure is doing its intended drift-detection job. The spec explicitly supports older migratable load inputs (`spec.md:98-103`), but nightly recapture correctly exposes that their current genesis now emits a different version.

**Owner / parallel safety:** regression-baseline/QC pack maintainer, with an explicit narrow ownership carve-out for the pack files and minter proof. No L1 product-owned path needs editing. Mechanically safe alongside B14-0; heavy verification must remain machine-serialized and broad `e2e` ledger grants require coordination. Estimated **small: 7 files, roughly half a day including controlled capture/parity review**, potentially waiting on the CI route repair.

## 2. Combat-midbattle: CI route failure masquerading as a missing locator

**Classification: (d) CI environment/infra, intermittent; not a demonstrated combat product regression.** Confidence is high for the failed prerequisite and route-level symptom; the underlying Next route-discovery/cache/process cause is unproven.

The error attributed to `e2e/scenario-pack-minting.spec.ts:746` is only the test entry point. Its actual failing assertion is `e2e/helpers/seamCampaign.ts:203`, waiting 20 seconds for `campaign-save-status-card`, called by `mintCombatMidbattle` at `scenario-pack-minting.spec.ts:685`.

The wizard first attempts to save a new campaign, and `CreateCampaignPage.submit.ts:306-315` deliberately refuses to navigate after save failure. The helper URL regex at `seamCampaign.ts:200` also matches `/gameplay/campaigns/create`, so it can pass while still on the wizard and then report a misleading missing dashboard card. Capture never reaches contract acceptance, mission launch, tactical controls or match-log comparison. The locator remains valid and unconditionally renders on a loaded dashboard (`CampaignDashboardPage.tsx:384`, `CampaignSaveStatusCard.tsx:101`).

Latest CI sequence, reproduced in all three attempts:

- 13:07:27: warm-up GET `/gameplay/campaigns/e2e-warmup-nonexistent-campaign` → **404**.
- 13:07:31: PUT `/api/campaigns/campaign-1792328851223-gye283q` → **404**.
- Retry PUTs at 13:07:56 and 13:08:20 → **404**.
- Each attempt waits for a dashboard card that cannot appear after the failed save.

The same pairing occurs in both earlier combat failures and the two experience capture failures. Every successful combat recapture has warm-up **200** and succeeds in about 29 seconds. In the first failed run and run 39033900424, the dev route failure starts at experience and continues through combat; latest it starts at combat. This is not a consistent missing selector or deterministic combat rule failure.

The production API PUT handler (`src/pages/api/campaigns/[id].ts:219-356`) has no 404 response branch: it returns 200/400/403/409/422/500. A plain 404 on that method points outside the normal save-handler result path. The job repeatedly starts `npm run dev` through the minter; config uses the shared default Next output and dev server (`playwright.config.ts:292`). Global setup only logs response status (`e2e/globalSetup.ts:51-64`), so a missing dynamic route is not detected there as a harness fault.

**Introducing commit:** not established. The helper dates to `002ed6009` (July 10, PR #1044), and the minter to `37f3c56ed` (July 11, PR #1051). Their old broad URL regex makes diagnosis misleading but does not explain the intermittent PUT 404. `31610a56d`/PR #2199 fixed the full-suite supervised production server, while recapture retained the dev path; combat passes both at that commit and the next run, then fails again. Do not attribute this to PR #2264 or another between-head product change without trace/server evidence.

**Concrete fix proposal:**

- In `.github/workflows/nightly-validation.yml`, give recapture an E2E production build and the already-used standalone server command, `cd .next/standalone && node ../../scripts/e2e/relaunching-server.mjs`, with the matching build/runtime flags. This removes repeated development compilation from nightly baseline proof; retain per-invocation database/readiness isolation. No `server.js` change is needed. Alternatively, isolate each dev output directory through the existing supported runner mechanism after proving the cache/process hypothesis; do not invent a timeout fix.
- In `e2e/helpers/seamCampaign.ts` and `e2e/helpers/campaignFlow.ts`, make the post-submit URL assertion exclude the create route and report the wizard's save error/failed PUT before waiting for a dashboard widget. Keep the save-card expectation and existing timeouts.
- Preserve each pack's browser output in a separate directory; add `if: always()` recapture artifact upload. A later minter invocation can otherwise replace the previous Playwright report. Retain PUT status/body, browser console/page errors, server logs and runtime/run IDs. Relevant files: `scripts/qc/mint-scenario-pack.mjs`, `scripts/qc/recapture-scenario-pack-stages.ts`, `.github/workflows/nightly-validation.yml`.

Do not re-mint combat merely to make this run green: its invariant comparison passed twice, including with fresh growth 18.7 → 21.1 KiB. First restore the capture prerequisite and investigate any remaining failure with retained evidence.

**Owner / parallel safety:** CI/QC harness maintainer; **no direct L1 product edit** in this proposal. Safe alongside B14-0 after explicit helper/runner ownership coordination and serialized heavy runs. Do not change campaign sync or the API save rules as a workaround. Estimated **small/medium: 4-6 files, 0.5-1 day** for retained diagnostics, server-mode alignment and narrow error reporting. If 404 persists on a clean production build, reclassify only after inspecting the retained response/trace; deeper runtime repair cannot yet be estimated honestly.

## 3. Both co-op packs: unsupported genesis registration and wrong invariant family

**Classification: (b) test/spec drift / broken test-tool integration; also an unsanctioned fixture provenance problem under (e). High confidence.** Neither failure demonstrates that host review or guest proposals are broken in the product.

Introducing commit: [`e9e592762106d618b5b1f1aeff68a3ea704d1e18`](https://github.com/SwiggitySwerve/MekStation/commit/e9e592762106d618b5b1f1aeff68a3ea704d1e18), Sep 2, PR #1531, “the co-op surfaces become real sweep targets.” It added both payloads/manifest entries for umbrella task 19.4. Its commit message and `src/lib/scenarioPacks/__tests__/coopPackCoverage.test.ts:29-38` explicitly acknowledge hand-authoring because no sanctioned minter can create them. This predates all requested runs.

Root cause chain:

1. Manifest entries are `kind: 'campaign'`, but `parityAnchorJourney` starts `anchor:` (`manifest.ts:185-217`). Payloads are serialized campaign bodies, not match logs; provenance explicitly says `hand-authored:...`.
2. `classifyGenesisSource` keys solely on that prefix (`recapture-scenario-packs-core.ts:167-170`) and maps every `anchor:` entry to `anchor-captured`.
3. Committed-stage dispatch calls `assertMatchlogSeedAgnosticInvariants` for that class (`recapture-scenario-pack-stages.ts:117-123`); core:336 reads nonexistent top-level `events` as `[]`, then core:338-340 throws “sequence-0 event is not game_created.” Both fail **before re-mint**. No fresh co-op content or size exists for any sampled run.
4. Merely fixing that dispatch reveals another deterministic failure: `mint-scenario-pack.mjs:47-66` registers six pack IDs, excluding both co-op IDs, and rejects unknown IDs at lines 84-89. They cannot currently be regenerated.

The current scenario-pack specification requires every payload to be generator-minted, rejects hand-authored bootstrap states, and requires recapture of every registry entry (`openspec/specs/scenario-packs/spec.md:36-57`, `:161-164`). The test comment's “deliberate exception” has no corresponding exception in that canonical spec. Fixing this requires a coherent genesis contract, not an `if (packId.startsWith('coop-')) return` exclusion or a larger combat tolerance.

**Fix proposal:** under the co-op/QC owner, register real, server-persisted co-op flow checkpoints and mint both states through supported front-door journeys. Exact files: `e2e/flows/manifest.ts`, `e2e/scenario-pack-minting.spec.ts`, `scripts/qc/mint-scenario-pack.mjs`, `scripts/qc/recapture-scenario-packs-core.ts`, `e2e/scenario-packs/manifest.ts`, both campaign payloads plus generated provenance sidecars, both co-op parity specs, and `src/lib/scenarioPacks/__tests__/coopPackCoverage.test.ts`. Update the scenario-pack spec for the explicitly declared co-op invariant/capture contract where needed.

A flow-checkpoint registration fits the existing architecture: add host/guest campaign predicates for the actual serialized co-op state, rather than treating campaign data as `game_created` history. Prove the source flow and parity on real identities; a pending proposal is runtime state and must not be fabricated into a campaign envelope. Host empty-review and guest blocked/single-browser postures must remain named as such if those are the intended caches. Do not silently claim they prove three-seat approval/sync behavior.

**Owner / parallel safety:** the L1 co-op/QC owner, coordinated with the task-19.4/layout-sweep maintainer. Repairing registration and adding diagnostics can be prepared separately; **do not independently implement a new co-op genesis journey while B14-0/LSC/receipt activation are moving**. A final front-door generator depends on L1 identity, host/guest and sync contracts. The listed test/tool edits need not directly change L1 product paths, but any discovered required product change in `src/lib/campaign/coop`, `src/components/campaign/coop`, campaign sync, `src/lib/multiplayer/server`, multiplayer APIs or `server.js` belongs to that lane. Estimated **medium: roughly 10-15 files, 1-3 days plus prerequisite wait** for a real generator and parity proof; not a two-line comparator patch.

## Ownership ledger and parallel-work boundary

Read `openspec/planning/2026-09-12-roadmap-completion/units.json` at both the failing head and cached `origin/main` **`ebbea9a4ebec2b2445f7a04570a9af1517233881`** (Oct 18 17:59:24 UTC). This was read-only; no remote refresh or lifecycle mutation. Recheck current lane admission before implementing.

At cached origin/main:

| Unit                  | State         | Relevant ownership                                                        |
| --------------------- | ------------- | ------------------------------------------------------------------------- |
| B14-0A / B14-0B       | main-verified | Multiplayer server; A also multiplayer metadata API and pages-modules API |
| B14-0                 | planned       | `src/lib/multiplayer/server`, fog spec                                    |
| P2CG1HP               | blocked       | `src/components/campaign/coop`, multiplayer server                        |
| LSC-0                 | blocked       | Campaign authority/sync design                                            |
| LSC-1DB               | blocked       | Persistence services                                                      |
| LSC-1S / LSC-1        | blocked       | Vault; LSC-1 also multiplayer auth API/security                           |
| LSC-2OP / LSC-2       | blocked       | `src/lib/campaign`, campaign page modules; LSC-2 also navigation          |
| LSC-2P                | blocked       | Broad `e2e`, packaged local-seat proof/release docs                       |
| P2CG1H                | blocked       | `server.js`, multiplayer server, API modules, two named co-op E2E specs   |
| U2 / U2b              | blocked       | Broad co-op `e2e`, `scripts/qc`                                           |
| U28 / U53 / U55 / U57 | planned       | Broad `e2e`/`scripts/qc` grants for specific co-op acceptance behaviors   |

`L1-SMOKE` is **not a literal unit or occurrence** in either inspected `units.json`, nor in the searched current planning/docs/playtest tree. Do not invent a state for it. The actual release checklist is `l1ReleaseChecklist20261018` (`origin/main` units.json:23891): pending exact-RC automated proof, installer rehearsal/L0 smoke, and the human three-seat session; `P2J` is a separate blocked journey unit. This is not acceptance supplied by scenario-pack parity.

No unit explicitly names these scenario-pack payloads or `scenario-pack-minting.spec.ts` as its behavior/leaf. However, broad `e2e` and `scripts/qc` ownership overlaps them syntactically, especially LSC-2P and R6 acceptance units. Therefore “no L1 product file touched” is not automatic ownership clearance. The parent should assign a finite regression-maintenance carve-out for three-pack refresh and CI diagnostics, preserving those units' actual named proof files. The co-op pack repair should be admitted by the co-op owner after agreeing the real identity/sync capture contract.

## Controlled regeneration procedure for the owner — not executed here

1. Create an isolated fresh worktree from current `origin/main` under `E:/Projects/Personal/MekStation-wt/<explicit-pack-refresh-dir>`. Prepend `C:/Users/wroll/AppData/Local/nvm/v22.22.0` to PATH and run `npm ci` there. Do not use the root checkout or share `node_modules` with another lane.
2. Before **every** build, Playwright or Jest invocation, run `node scripts/qc/machine-idle.mjs --own-pid 47516 --own-pid 55164` and wait for idle. One heavy run machine-wide; stop only processes started by this work. Never raise timeouts. Use a self-owned server; avoid `npm run dev`'s port-kill preamble against another lane.
3. For navigation, personnel and experience, run the supported CLI one pack at a time: `node scripts/qc/mint-scenario-pack.mjs <pack-id>`. It selects the gated `scenario-pack-mint` project, chromium and `--workers=1`. Do not invoke the mint spec through the ordinary chromium suite. For baseline refresh, use the minter—not the recapture command, which restores original files.
4. Inspect generated additions, construction maxima/linkage, current authority identity, generated provenance, and intended checkpoint state. Update each manifest record's pin/provenance to match that capture. Preserve true historical migration fixtures separately. No hand-edited pack state.
5. Run only `e2e/scenario-packs/navigation-briefing.parity.spec.ts`, `personnel-roster.parity.spec.ts`, and `experience-pilot.parity.spec.ts` through the repository Playwright wrapper with `--project=chromium --workers=1`, then focused schema/manifest checks and a specifically authorized filtered recapture. Check idle again before each heavy invocation. Review both committed and fresh invariant results; a schema-pin repair can expose a later invariant failure that the old early return masked.
6. Combat needs no baseline refresh until the route prerequisite is reliable and a later invariant mismatch is established. Both co-op pack IDs have **no valid current regeneration command**; first land their admitted generator/contract work. Do not substitute hand editing or skip them in nightly comparison.
7. Retain per-pack diagnostics and fresh payloads as private CI artifacts before restoration, together with exact SHA and command. Upload original and fresh captures distinctly. Leave recapture triage-only and preserve the strict invariant/pin checks.

The immediate trustworthy baseline is obtained by fixing the stale three-pack cache, making the CI capture transport observable and reliable, and resolving the two co-op entries' unsupported genesis contract. These are separate ownership-sized repairs; the sampled evidence does not justify six new product bugs.
