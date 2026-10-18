# Council A: shortest path to an owner-runnable build

Owner question: "what should be our current path to get to something that builds and then we can add onto in layers".

**Recommendation:** deliver a pinned **MekStation Repair Preview** from the already-buildable main tree, prove its installed/extracted single-player journey, and give the owner that artifact before starting another feature or compiler tranche. Then deliver single-player reliability, same-instance skirmish, and shared campaign missions as separately accepted capabilities. Finishing the P3 receipt chain or TypeScript 7 migration is not a prerequisite to that first artifact. This is a sequencing recommendation, not an instruction executed by this advisor.

## Scope and source identity

Read-only assessment at approximately **2026-10-16 22:44 MDT / 2026-10-17 04:44 UTC**. No build, Jest, Playwright, installation, application launch, Git mutation, publication, or external comment was performed. Initial `Get-CimInstance Win32_Process` found active Node/Jest processes (PIDs 39844 and 6356), including roadmap tests in another worktree, so heavy local verification was excluded. The only intended write is this report. No scratch worktree or dependency junction was created.

The shared checkout is **not current main**: `git log -1` returned `d68858607928f50f4fe30b56481f26b8618a6fc1` (October 4); it has unrelated modifications. `git ls-remote origin refs/heads/main` and the local remote-tracking ref both returned **08555b7a1b22f1bc10f9e6335c3ea7edd79c98da**, PR **#2180**, merged October 16 at 22:14 MDT. Tracked source claims below use `git show origin/main:<path>`, not the stale working files. Both that merge and reviewed PR head `dd9a54dbe4bcdeec06f6d1aea6fe03246015d9f5` have tree **29a19c155107d9d570aee1f8cf6002b7e639402d**; `git diff` between them was empty. These are direct command observations, not inferred from STATUS.md.

Citation convention: all repository-relative paths below are rooted at **E:/Projects/Personal/MekStation/**; tracked-file line numbers refer to the above pinned origin/main. `PLAN`, `STATUS`, and `CARDS` mean the explicitly read files under **E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/**. `UNITS` means **E:/Projects/Personal/MekStation/openspec/planning/2026-09-12-roadmap-completion/units.json**. Those aliases avoid repeatedly printing long paths; no `.omo/ulw-execute` tree was enumerated. Personal altitude guidance was applied to distinguish a runnable owner outcome from task-chain completion.

## What can someone do today, and how strong is the evidence?

### Build and start: yes, with a fresh-checkout qualification caveat

The current tree has the expected custom-server application. `package.json:12-16` defines `npm run dev` as data-config sync plus `node server.js`, ordinary `npm run build` as Next webpack build plus standalone hydration, and `npm start` as `node .next/standalone/server.js`. `package.json` currently requests Next `^16.2.11` and TypeScript `^5.8.3`; TS7 is not needed to run that build. `server.js:388-400` selects development/production mode and port 3600 by default. `scripts/hydrate-next-standalone-multiplayer-server.mjs:266-283` copies the custom server, source/runtime support, public assets, and Next static assets into the standalone payload. This is an existing runnable production surface, not a proposed application rewrite.

**Fresh hosted evidence:** [PR #2180](https://github.com/SwiggitySwerve/MekStation/pull/2180), [run 38999634888](https://github.com/SwiggitySwerve/MekStation/actions/runs/38999634888), created 03:39:41 UTC and finished 03:46:02 UTC October 17, had **31 passing checks**. I inspected job/step results: asset validation, Next build and Electron TypeScript build actually ran successfully. The PR build skips Next's duplicate type pass, while the separate Type Check job passes (`.github/workflows/pr-checks.yml:16-18, 867-878`). This is approximately **one-hour-old proof on an identical source tree**, not a claim that I built the owner's Windows checkout today.

**Start evidence:** the same run's E2E Smoke self-started the custom dev server: `playwright.config.ts:281-310` defaults to `npm run dev`, with per-run readiness and durable database paths. Customizer Regressions uses the built standalone server (`.github/workflows/pr-checks.yml:711-742`). Production startup also has direct older journey evidence below. Fresh unaided production startup on this owner's machine remains **unverified**.

### Core single-player loop: demonstrated, but not by the newest smoke badge

The CI job named **E2E Smoke** runs only `e2e/tactical-map-visual-smoke.spec.ts --project=chromium` (`.github/workflows/pr-checks.yml:597-599`). Its [job 117299813128](https://github.com/SwiggitySwerve/MekStation/actions/runs/38999634888/job/117299813128) logs show **61 tests, 61 passed, 1.8 minutes**, ending 03:43:09 UTC. That establishes tactical rendering/browser operation within that suite. It does **not** establish edit/save/PDF/battle/Results/reload as one journey.

There are useful existing tests to reuse. `e2e/playtest-sp-smoke.spec.ts:1-24, 241-268` covers four scenario types, auto-resolution, review tabs and replay-library appearance; scenario setup uses an E2E store seam. `e2e/quick-play.spec.ts:246-381` includes interactive recovery/cold-reload cases. `e2e/saved-custom-combat-launch.spec.ts:212-488` covers a custom unit through campaign combat and durable post-battle roster, including seeded mission setup. Their existence and scope are verified by reading; a **fresh run of those suites on 08555b7a is unverified**. Neither automated setup nor auto-resolution substitutes for an owner doing interactive combat.

The strongest full-loop evidence is **REL-03 on ba8007f2**, merged by [PR #2134](https://github.com/SwiggitySwerve/MekStation/pull/2134) at 2026-10-15 11:53:12 UTC, approximately **41 hours old**:

- `docs/audits/2026-10-15-p2-main-exit-review.md:23-37` records the merge, 81 suites/1,237 passing cases and an ordinary production build in 104.367 seconds, including internal TypeScript and hydration.
- Its lines **41-47** describe a saved Locust with edited armor, reload, an actual PDF, launch using that saved identity, public movement and weapon interaction, real incoming damage, concession, Results reload, distinct repeat launch, and Exit.
- I also opened **E:/Projects/Personal/MekStation-wt/usability-flow-20261012/.audit/p2-main-ba8007f2-20261015/JOURNEY.md:3-23**. It records a Node22 standalone server, no fixture mode, the actual public actions and identities. Its SHA-256 still matches the exit review: **3e91f2203ca1ac25476cbdbfdb21519900a49998b29d9391f8460bd170eee918**. The accompanying `.../.omo/evidence/usability-release-20261015/main-ba8007f2dfea-r2-20261015-1154/qualified-main-build.json` also matches **8d0631260778b8c990200e16dfa5cc7a49842a65989964b4033aa7eeb0223f83**. Old paths without `/Personal/` in the audit are stale; the relocated files exist.
- Limits matter: this was a one-turn damage-bearing battle ended by **concession**, not proof of every victory condition or a long campaign. Metadata index status remained `active` while canonical end events and public Results showed completion. Live destructive Electron operations, durable unlinked history and shared-client/campaign acceptance were excluded (`p2-main-exit-review.md:45-61`). I did not independently replay the screenshots or event stream during this council review.

The old playtest closeout is much weaker evidence for today. `playtest/CLOSEOUT.md:23-25, 48, 82-99, 148-169, 209-213` describes May 20-21 SP auto-resolve, route and campaign work, with historical multiplayer/co-op gaps and later partial updates. It is roughly **149-150 days old**, and its phase numbers are unrelated to October's P1-P3. `playtest/checklists/sp-uat.md:9-48` remains an unfilled checklist, including interactive turns, reload and sign-off. Do not convert those unchecked boxes into a current PASS.

### Electron: packages in CI; a current installed application is not yet proved

The three #2180 Build Test jobs really ran Electron's native preparation and **`npx electron-builder --dir --publish never`** on Windows, macOS and Linux, then checked output presence. They finished 03:44-03:46 UTC, approximately one hour before this assessment. See `.github/workflows/pr-checks.yml:950-984` and jobs [Windows 117300212891](https://github.com/SwiggitySwerve/MekStation/actions/runs/38999634888/job/117300212891), [macOS 117300212857](https://github.com/SwiggitySwerve/MekStation/actions/runs/38999634888/job/117300212857), [Linux 117300212912](https://github.com/SwiggitySwerve/MekStation/actions/runs/38999634888/job/117300212912).

That proves **unpacked application assembly**, not installer generation, installation, desktop launch, signing/notarization or the desktop gameplay journey. The existing configuration supports NSIS/portable Windows targets and other platform packages (`electron-builder.yml:26-36, 81-110, 122-145`). Desktop uses a separate Electron-ABI standalone copy; preserving the plain-Node payload is intentional (`desktop/scripts/test-build.js:178-188`). Fresh installer and runtime acceptance on the current tree are **unfinished qualification**.

The [latest published release v1.4.225](https://github.com/SwiggitySwerve/MekStation/releases/tag/v1.4.225) dates to **2026-05-16 02:07:08 UTC**, approximately **154 days old**. `gh release view` lists real Windows installers/portable EXE, macOS DMG/ZIP, Linux packages and update metadata. These are not the October repair. At assessment, [Build and Release run 39001845588](https://github.com/SwiggitySwerve/MekStation/actions/runs/39001845588) is green but **only Determine release tag ran; web build, platform build, release and Docker jobs skipped**. The guard deliberately skips when the latest tag does not identify the triggering merge (`.github/workflows/release.yml:61-76`). P2's contractual "ship" means reviewed delivery to Main (`PLAN:26,54-58; CARDS:33-35`), not a newly published installer.

One additional qualification: main is **not universally green**. [CAMP-01 run 39001828361](https://github.com/SwiggitySwerve/MekStation/actions/runs/39001828361), on 08555b7a, failed at 04:16:52 UTC: `degraded — proof6a2-envelope-anchor-production`, Windows degraded, Linux green. This does not by itself establish a single-player defect; it prevents claiming fresh campaign live-proof acceptance. Root cause was not investigated here.

## Define the first deliverable and take the smallest route

**Proposed name:** `MekStation Repair Preview 2026.10.16+08555b7a`.

**Primary artifact:** `MekStation-RepairPreview-2026.10.16-08555b7a-win-x64-node22.tar.gz`, containing the ordinary hydrated standalone application, a one-page run/limits sheet and a manifest identifying commit, tree, Node/npm versions, platform, build ID, proof links and SHA-256. It requires Node 22.22.0 on the owner's Windows machine. This is a proposed artifact, **not yet produced**. A version label tied to source is adequate for a private owner preview; root package version `0.1.1` and desktop version `1.0.0` do not identify October's repair (`package.json:3; desktop/package.json:3`).

**Optional second format:** a Windows x64 Electron portable EXE or installer from the same source, with explicit preview version metadata. Do this only if eliminating the Node requirement is worth the extra desktop runtime acceptance. Do not make three-platform public publication a prerequisite to the owner using the web build.

The following commands are a **proposed next execution**, not commands run by this advisor. Every native command must stop on nonzero `$LASTEXITCODE`; check the process guard again before each heavy stage. Use the pinned commit; any newer candidate needs its own CI/tree binding. The paths are deliberately isolated from the dirty shared checkout.

```powershell
$env:PATH = 'C:/Users/wroll/AppData/Local/nvm/v22.22.0;' + $env:PATH
node --version
npm --version
Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'node.exe' -and $_.CommandLine -match 'jest|next|playwright'
} | Select-Object ProcessId,CommandLine
# If any such process exists, defer heavy work; do not kill another agent's process.
git -C E:/Projects/Personal/MekStation worktree add --detach E:/Projects/Personal/MekStation-wt/owner-preview-08555b7a 08555b7a1b22f1bc10f9e6335c3ea7edd79c98da
Set-Location E:/Projects/Personal/MekStation-wt/owner-preview-08555b7a
npm ci
npm run validate:assets:strict
# Only if required assets are missing, perform release preparation:
# npm run fetch:assets
# npm run validate:assets:strict
Remove-Item Env:NEXT_PUBLIC_E2E_MODE,Env:NEXT_PUBLIC_E2E_TEST,Env:MEKSTATION_SKIP_NEXT_TYPECHECK -ErrorAction SilentlyContinue
npm run build
$env:NODE_ENV = 'production'
$env:HOSTNAME = '127.0.0.1'
$env:PORT = '3659'
$env:DATABASE_PATH = 'E:/Projects/Personal/MekStation-wt/owner-preview-08555b7a/runtime/mekstation.db'
$env:MULTIPLAYER_STORE = 'durable'
$env:MULTIPLAYER_DB_PATH = 'E:/Projects/Personal/MekStation-wt/owner-preview-08555b7a/runtime/matches.db'
New-Item -ItemType Directory -Force E:/Projects/Personal/MekStation-wt/owner-preview-08555b7a/runtime
npm start
```

Preflight that 3659 is free. Open `http://127.0.0.1:3659`, run the acceptance below, then stop this owned foreground server. `npm run dev` is an existing alternative for development, but its script kills port 3600; do not use it against an occupied shared port (`package.json:12`). Native SQLite prerequisites and asset availability for a fresh Windows install remain environment prerequisites, not proven by this read-only audit.

**Acceptance on the actual artifact:** edit/save a supported Mech; close/reopen its saved design; export and inspect its PDF; launch it into interactive Quick Game; move/fire and observe real damage; finish via a supported terminal action; reload Results; create a distinct repeat; Exit; restart the process and repeat the applicable saved-design/results checks. Record exact identities and outcomes using REL-03's existing sheet. Test process restart explicitly as additional artifact acceptance; the old report proves browser reload. A failed step gets a bounded repair; do not expand this into whole-campaign completion. Reuse `playtest/checklists/sp-uat.md` and the audited journey, not a new generic readiness framework.

Package only after stopping the server and adding the proposed manifest/run sheet to the staging payload. Do not include the test databases or owner data. Example archive command, using Windows `tar.exe` (availability must be checked):

```powershell
Get-Command tar.exe
tar.exe -czf E:/Projects/Personal/MekStation-wt/owner-preview-08555b7a/MekStation-RepairPreview-2026.10.16-08555b7a-win-x64-node22.tar.gz -C E:/Projects/Personal/MekStation-wt/owner-preview-08555b7a/.next/standalone .
Get-FileHash -Algorithm SHA256 E:/Projects/Personal/MekStation-wt/owner-preview-08555b7a/MekStation-RepairPreview-2026.10.16-08555b7a-win-x64-node22.tar.gz
```

Extract into a second fresh staging directory, point the two database variables at separate absolute writable paths, and run `node server.js` from the extracted directory. Repeat acceptance there; that is the actual delivery proof. Preserve the accepted artifact/proof outside the disposable worktree before removing it. Check resolved worktree boundaries and unlink any dependency junction before cleanup; this proposal uses a physical `npm ci` install, not a junction.

**Reuse instead of reconstruction:** the hosted run has an unexpired **web-build** artifact (93,238,161 bytes, observed through the Actions artifacts API), containing the workflow paths at `pr-checks.yml:880-889`. `gh run download 38999634888 --name web-build --dir <absolute-isolated-path>` can reuse it for a **Linux/Node22** self-hosted candidate. Its Linux native modules are not a drop-in Windows payload. This is an alternative to the Windows local build, not another mandatory step.

For automated regression qualification, reuse the existing runner, for example `npm run test:e2e -- e2e/quick-play.spec.ts e2e/playtest-sp-smoke.spec.ts --project=chromium --workers=1`, in a separate qualification checkout and only when the machine is idle. These tests use E2E seams. `scripts/qc/roadmap-main-proof.mjs:158-218` already provides idle gates, build, named runtime proof, exact-main ladder, typing and evidence hashes; use it where an existing admitted roadmap unit needs that closure. **Do not blindly make it the owner release command:** it requires clean exact merge inputs and explicitly builds with E2E flags at line 174. It neither produces an installer nor proves an ordinary production artifact. Keep its test build out of the shipped payload.

If the owner wants the Node-free format, after the ordinary root build use the existing desktop path:

```powershell
npm --prefix desktop ci
npm --prefix desktop run build
npm --prefix desktop run rebuild:next-standalone
Push-Location E:/Projects/Personal/MekStation-wt/owner-preview-08555b7a/desktop
npx electron-builder --win portable --x64 --config.extraMetadata.version=1.4.226-preview.20261016 --publish never
Pop-Location
```

The preview version is a proposed label to check for availability, not a release authorization or a claim that `v1.4.226` is unused. Run the generated EXE and the same acceptance before calling it usable. Existing `npm run electron:test:build:win` is an optional stronger packaged-runtime check (`package.json:111-112; desktop/scripts/test-build.js:42-50,151-188`); avoid redundant full builds when equivalent proof is already bound to the candidate. Public release, later, should reuse `.github/workflows/release.yml` with an **explicit approved tag**, not its latest-tag default; platform commands already inject the version and use `--publish never` before release assembly (`release.yml:7-12,45-48,257-270`). No publication is necessary for this first private artifact.

**What is actually unfinished?** Artifact assembly/version/run sheet, clean extraction/launch/restart proof and handing the owner the file are unfinished delivery/qualification. Installer generation and desktop runtime proof are extra unfinished packaging/qualification if chosen. No evidence establishes that another product feature or compiler upgrade must be implemented first. Any defect discovered during this bounded acceptance is actual product repair; its scope is determined by the failure.

### Proposed one-page owner sheet

**Works today, within demonstrated scope:** supported BattleMech edit/save/reload; inspectable PDF; saved design in interactive Quick Game; movement/fire/damage; concession to Results; Results reload; distinct repeat and Exit. This is backed by the October 15 journey, with current-tree build/render/customizer regression evidence, and must be refreshed on the delivered artifact. Sources: REL-03 references above.

**Does not work yet / not promised by this preview:** fully accepted shared campaign missions and receipt-gated readiness; end-to-end campaign consequence/correction journey; all unit-family exports; every scenario victory condition; live destructive Electron reset/cache; a current publicly released installer. Distinguish "not accepted/not verified" from "known broken": most of these are scope exclusions, not demonstrated failures. The observed stale metadata index is a concrete caveat. Sources: `p2-main-exit-review.md:57-61; PLAN:27-31; UNITS:6968-7368`; published-release evidence above. Include the exact start command, data-directory locations, artifact hash and this distinction in the actual handoff sheet.

## Layers after the artifact: visible capabilities with endings

These are proposed product release boundaries. They do not silently amend existing authority/privacy contracts or mark canonical tasks complete.

**Layer 1 — A dependable personal build-to-battle loop.** The owner can play a complete small AI match, reopen it, and start another without losing the chosen design or history. End when a fixed supported-Mech matrix covers one natural terminal result plus concession, PDF identity, interrupted-session recovery, Results reload, process restart and repeat/Exit, with all discovered blockers closed. Reuse Quick Play/SP tests and the existing UAT checklist. Triage the observed metadata-index inconsistency by its effect on that experience. **Activate none of the dormant P3 receipt plumbing.** No TS7 dependency. Sources for existing seams and limits: `quick-play.spec.ts:246-381; playtest-sp-smoke.spec.ts:1-24; playtest/checklists/sp-uat.md:7-43; p2-main-exit-review.md:57-61`.

**Layer 2 — Two people finish one skirmish on the same running instance.** Keep this explicitly outside campaign progression. End when two real authenticated browser profiles join one match, see the same authoritative turns/results, can command only their own units, get a foreign-unit refusal, and reconnect without divergence. Reuse the existing combat socket route/host and packaged-socket validation (`server.js:656-672; package.json:72-73`). The complete current two-human journey is **unverified**; treat wiring/UX defects found here as real work, not assumed complete. **Do not activate campaign application receipts merely to demonstrate a standalone skirmish.** This layer's independence is a scoped architectural recommendation based on the separate combat/campaign socket branches, not fresh behavioral proof. If the owner instead means _shared campaign missions_, this is Layer 3 and its readiness requirements apply.

**Layer 3 — A GM and players launch and complete one shared campaign mission.** End with an actual GM/guest browser journey: create/join, both apply authorized state, refuse launch while a retained seat is behind, launch against server-controlled opponents with ownership enforced, reconnect/cold recover, and show converged completion. This is the place to finish and activate P3, rather than relabel dormant utilities as a released feature. Reuse P2CA applied-view storage, P2CB materialization/convergence, P2CD opaque offers, P2CE1-3 confirmed-send/receipt admission, and P2CF1-2 mounted consumers (`UNITS:5452,5539,5623,5769,5860,5950,6108,6210`). Complete the required integration/hardening, install the port at **P2CG1H**, then remove legacy numeric/unguarded readiness through I1-I4; include P2CG2 retained-seat recovery and P2CH browser proof (`UNITS:6572-7368`). Do not discard these safety obligations just to get a demo; discard **legacy credit paths after verified activation**, not the new receipt safety mechanisms.

**Layer 4 — Reliable campaign continuation and correction.** A finished mission changes roster/resources exactly once; history, restart/retry and permitted correction converge; the next mission uses that state. End with a frozen terminal-to-next-mission journey plus duplicate/restart/refusal cases. Build on the accepted shared-mission baseline, activating the journal/recovery/consequence work in the existing P4-P6 contracts rather than claiming receipt ACKs already deliver campaign consequences (`PLAN:28-30`). Only after this accept the saved-version-to-instance/travel/opportunity/full journey of P7 (`PLAN:31`). No new renderer or whole-program expansion is needed to close the earlier layers.

## Critical path and corrections to the supplied context

1. **The first artifact already has its core implementation.** P1/P2 completion is supported by the review and PR #2134, but those contracts ended at Main acceptance, not owner distribution. The absent current release is the important product gap (`CARDS:33-35; p2-main-exit-review.md:11-15`; release API/run evidence).
2. **The receipt path is actually dormant in production composition.** `bindCampaignSyncConnection.ts:303-316` constructs application handling only with both membership and `applicationReceipts`; `server.js:658-665` supplies membership/force claims but no receipt port. Activation is explicitly future P2CG1H (`UNITS:6968`). Mounted client code alone does not make this a usable shared-mission release.
3. **The chain count is stale.** The corrected chain has **14 slices A1 through I4**, not 13. A1 and A2 are already main-verified, leaving **12** before P2CG2/P2CH/P2C. `STATUS:109-120` and `UNITS:6381-7264` agree. Direct Git history counts **46 PR merges** after #2134 to the assessed tip (47 merge commits including one branch merge); this includes closures, registration and TS7, not 46 user-facing P3 features.
4. **TS7 is a deliberately interleaved throughput project, not a build repair dependency.** Source still builds with its current compiler. `STATUS:102` says TS7 is **not a machine predecessor** of P2CG1B, but the parent's sequencing holds B until the stopping condition or explicit waiver. As assessed, TS7S2B source is merged (#2180) while its ledger still says implementing; S3/S4A/S4B/S5A remain before the selected stop (`STATUS:12-14; UNITS:8028-8394`). The original ten-unit description has also split: the registry now has 11 non-superseded TS7 slices, including held decision/archive tails (`UNITS:7701-8534`). Do not reset completed work or conflate ledger closure with feature delivery.
5. **Critical-path decision:** neither remaining TS7 nor P2CG1 is required for the owner artifact or Layer 1. Neither is a demonstrated prerequisite to the narrowly defined standalone-skirmish Layer 2. P2CG1 integration/activation/legacy removal and P2CG2/P2CH are required for the defined shared-campaign Layer 3 unless a reviewed design changes that contract. Changing the current interleaving is a deliberate sequencing decision; this report does not overrule the standing owner instruction recorded at `STATUS:1-3` to pause after P3.
6. The observed **2-3 hours per unit** is a STATUS estimate (`STATUS:43`), not independently measured throughput. At that rate, 12 remaining receipt slices alone imply 24-36 hours, plus later closure/recovery/journey work; the four remaining pre-stop TS7 slices imply another 8-12 hours. This arithmetic is an opportunity-cost illustration, **not a delivery promise** and not a reason to weaken acceptance.

## Recommended path, in order

1. **Now: designate 08555b7a as the owner-preview candidate and reserve the next idle execution slot for packaging and artifact acceptance.** Record the proposed sequencing change explicitly at the current safe unit boundary; do not wait for the whole P3 chain to answer the owner's immediate question.
2. Prepare the isolated Windows Node22 build using the existing scripts, or reuse the bound Linux CI artifact if a Linux host is the chosen target. Preserve unrelated shared-checkout work.
3. Produce the named, hashed Repair Preview with its run command and one-page works/limits sheet. This closes the missing owner handoff, not another roadmap feature unit.
4. Run the frozen edit/save/PDF/interactive-battle/Results/reload/repeat test on the **extracted artifact**, plus process restart. Repair only demonstrated blockers; hand the accepted file to the owner. Add an Electron portable build only if the owner needs a Node-free launch.
5. Close Layer 1 with the small natural-outcome/recovery matrix. Keep this runnable baseline available while later work proceeds.
6. Close Layer 2 with two real people/profiles completing a same-instance standalone skirmish; prove ownership and reconnect. Do not call route mounts or socket assembly the ending.
7. Deliver Layer 3 by finishing the existing safe receipt integration, activating it, retiring legacy readiness and passing the real shared-mission journey. Publish that capability as its own version; then honor the recorded P3 pause.
8. Resume campaign correction/consequence/full-journey layers only as separate outcomes. Schedule remaining TS7 for a measured developer-throughput benefit at an appropriate boundary; it is not the gate to something the owner can run.
