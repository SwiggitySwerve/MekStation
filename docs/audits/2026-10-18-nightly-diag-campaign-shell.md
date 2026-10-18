# Nightly failure diagnosis: campaign and app shell

- **Date:** 2026-10-18
- **Author:** research sub-agent (diagnosis only: no commits, no PRs, root checkout untouched)
- **Latest failing run:** 39129982940, head 1b8558625. Compared against 39033900424, 39022280834, 39017508685, 39013211365 and 39008344531, plus August–October history.
- **Code read at:** origin/main ebbea9a4e, in a private worktree at E:/Projects/Personal/MekStation-wt/nightly-diag-cs. It is 34 commits ahead of 1b8558625, and none of those commits touch the files cited below.
- **Evidence:** CI logs, the Playwright report, traces, error-context files and probe output are in nightly-diag-20261018/campaign-shell-private/.

## TL;DR

The bucket has five failing tests. They come from **three independent causes**, not five bugs.

| #   | Test                                   | Class                                                     | Root cause                                                                                                                                                                                                      | Fix touches L1? | Safe now, in parallel with B14-0? | Size      |
| --- | -------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------------- | --------- |
| 1   | campaign-flow.spec.ts:780              | **(b) test/spec drift**                                   | The spec builds its campaign directly in the browser store and never saves it to the server, then reloads. The product now treats that copy as an unadopted legacy copy, so **Save now silently skips the PUT** | No              | Yes                               | S         |
| 2   | campaign-subroute-recovery.spec.ts:402 | **(b) test/spec drift**                                   | Same cause as #1                                                                                                                                                                                                | No              | Yes                               | (with #1) |
| 3   | campaign-economy-browser.spec.ts:377   | **(b) test/spec drift**                                   | Same seed shape. Every campaign route's server GETs return 404, and those 404 console errors are fatal to the diagnostics check                                                                                 | No              | Yes                               | (with #1) |
| 4   | app-shell-route-proof.spec.ts:814      | **(a) product regression**, #1634 (45a94017a, 2026-09-09) | Hydration mismatch (React #418) on /settings: an SVG title in BipedArmorDiagram.tsx:115-118 has two child expressions                                                                                           | No              | Yes                               | XS        |
| 5   | saved-custom-combat-launch.spec.ts:229 | **(c) test-side timing flake**                            | The test leaves the page about 15 ms after the archive POSTs answer, so their response bodies are aborted. Its waitForLoadState('networkidle') settle step does nothing at that point                           | No              | Yes                               | XS        |

The shared requestfailed / waitForResponse symptom in #1–#3 has **one common cause**. A campaign created in a browser-store seed and first reloaded before any save is, by product design, a "legacy browser-only copy." The suspected API route, persistence startup, vault or recent route change is not the cause. On 2026-08-29, #1444 already fixed the same problem for the shared fixture e2e/fixtures/campaign.ts. These three specs have their own private seed helpers and were never migrated. #4 and #5 are unrelated to that cause.

## Why these failures surfaced only on 2026-10-17

The nightly full E2E job was not running these tests for weeks:

- **2026-09-12 to 2026-10-16:** the job died at test collection with "Missing browser route proof details for /compendium/chassis" (app-shell-route-proof.spec.ts:492). This was confirmed in runs 34694473235, 34864355797, 36010347384, 37210212802 and 38747765378. Commit 77c30dcf0 ("restore the nightly e2e collection", 2026-10-16) fixed it.
- **About 2026-09-09 to 2026-10-17:** the app-shell describe block runs in **serial** mode. Its customizer deep-link test failed first, so every later test in the block, including settings, was skipped. Commit e823de8dc (2026-10-17) fixed the customizer test, and the settings test then ran for the first time (run 39022280834).
- **Still hidden in the latest run:** the settings, invalid share token, global not found, desktop dropdown and mobile bottom-nav tests in the same serial block. The report data shows them as skipped,skipped,skipped. Once #4 is fixed, these tests run for the first time in more than five weeks, so do not assume they are green.

Failure presence per run (F = failed, P = passed or absent from the failed list, f = flaky, i.e. passed on retry):

| Test                                    | 08-20 (c26020065)      | 08-21 (3ea7b319c) | 08-22/23 | 08-24/26 | 09-03 | 10-17 06:01                 | 10-17 07:19 | 10-17 08:28 | 10-17 09:44 | 10-17 12:47 | 10-18 13:04        |
| --------------------------------------- | ---------------------- | ----------------- | -------- | -------- | ----- | --------------------------- | ----------- | ----------- | ----------- | ----------- | ------------------ |
| campaign-flow:780 (was 775)             | **P**                  | F                 | F        | F        | F     | F                           | F           | F           | F           | F           | F                  |
| campaign-subroute-recovery:402          | **P**                  | F                 | F        | F        | F     | F                           | F           | F           | F           | F           | F                  |
| campaign-economy-browser:377            | **P**                  | F                 | F        | F        | F     | F                           | F           | F           | F           | F           | F                  |
| app-shell "settings vault hash"         | –                      | –                 | –        | –        | P\*   | skipped (customizer failed) | skipped     | skipped     | **F**       | F           | F                  |
| saved-custom-combat-launch (212 to 229) | n/a (spec added 09-15) |                   |          |          |       | F (stores not exposed)      | F           | f           | f           | **P**       | F (all 3 attempts) |

\* Before 09-09 the settings test ran and passed. #1634 landed on 09-09.

## 1–3. Campaign trio: one cause, test/spec drift (b)

### Evidence

- **No PUT is sent.** campaign-flow:780 and campaign-subroute-recovery:402 fail with a 20 s "page.waitForResponse timeout" waiting for a PUT to /api/campaigns/:id (campaign-flow.spec.ts:259, campaign-subroute-recovery.spec.ts:183). The retry-1 trace for campaign-flow (tr-flow/0-trace.network) contains **no PUT at all**. The only API traffic is GET /api/campaigns/:id → 404 and GET /api/campaigns/:id/head → 404.
- **The page shows the legacy banner.** The page snapshot at failure (error-context.md) shows "This campaign is a legacy copy stored only in this browser. Adopt it onto this server to share it with other players." The page also shows "Last saved: Never saved", and the **Save now** button is the active element.
- **The economy test fails only at the end.** campaign-economy-browser:377 passes every functional assertion. It fails in the trailing withBrowserDiagnostics check (e2e/helpers/browserDiagnostics.ts:140). The fatal events are the Chromium console errors "Failed to load resource: 404" for GET /api/campaigns/:id and /head, logged on every campaign route the test visits. Under browserDiagnosticsModel.ts:46-48, every console error is fatal.
- **The equipment-JSON net::ERR_ABORTED events are harmless.** They are aborted GETs, which the model treats as non-fatal at browserDiagnosticsModel.ts:59-62.

### Mechanism (file:line)

1. **The seed never touches the server.** All three spec seed helpers call the in-memory store's createCampaign from page.evaluate, which only calls set():
   - campaign-flow.spec.ts:416-448 (seedDamagedPostBattleCampaign)
   - campaign-subroute-recovery.spec.ts:66-162 (seedRecoverableCampaign)
   - campaign-economy-browser.spec.ts:136-165 (seedPostBattleCampaign)

   The store action is src/stores/campaign/useCampaignStore.actions.ts:100-116. The specs then page.goto the dashboard: campaign-flow.spec.ts:787, campaign-subroute-recovery.spec.ts:174 and campaign-economy-browser.spec.ts:385.

2. **The reload marks the campaign as rehydrated.** It rehydrates from localStorage, and the persist merge sets rehydratedCampaignId = campaign.id (src/stores/campaign/useCampaignStore.ts:150-153).
3. **#1253 (ebaf5c5c7, 2026-08-20)** added a server validation load for a rehydrated campaign, in campaignPageShell.tsx:146-166 (cacheNeedsValidation leads to loadCampaign). This implements the spec scenario "Stale cache is refreshed, not trusted" (openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md:37). That load gets a 404, which Chromium logs as a console error. **This is the first break, and it is enough to fail all three tests.**
4. **#1333 (1f90ac4b0, 2026-08-24)** made that 404 an adoption offer. useCampaignPersistenceStore.ts:958-976 sets legacyUnadopted: true. runSave then returns {status:'skipped'} **before any network call** (useCampaignPersistenceStore.ts:845-852). This implements "Existing browser-local campaigns are adopted, not stranded" (same spec, :46-51). From here on, Save now on the dashboard is a silent no-op (CampaignSaveStatusCard.tsx:80-82 / :176-183). That is why two of the tests now die at waitForResponse instead of at the diagnostics check.
5. **#1444 (11dec7e4a, 2026-08-29)** diagnosed exactly this: "deliberate product design, not a product bug." It fixed the shared persistCampaignThroughDashboard (e2e/fixtures/campaign.ts:136-179) by doing one in-context saveCampaign({retryOnConflict:false}) before any navigation, which mirrors the create wizard. The three specs here have **private** seed and save helpers, were not consumers of that fixture, and kept the old shape.

### Introducing commit (bisected from nightly heads)

- **Last pass:** nightly 32354845862 (2026-08-20, head c26020065). All three passed.
- **First fail:** nightly 32468976659 (2026-08-21, head 3ea7b319c). All three failed with a console 404 on GET /api/campaigns/:id.
- **The product change in that range:** git log --first-parent c26020065..3ea7b319c contains **#1253**, and #1253 is the commit that introduced cacheNeedsValidation (found with git log -S).
- **The second change:** #1333 changed the failure shape on 08-24 and added the silent save skip.

**Classification:** **(b) test/spec drift.** Both product changes are intentional and covered by the spec. The specs model a state, a browser-only campaign, that the product deliberately no longer treats as server-owned. Once the seed is fixed, no product regression is implied.

### Fix proposal (test-only)

1. **Extract a shared helper.** Pull the in-context genesis save out of e2e/fixtures/campaign.ts:147-179 into an exported helper, for example saveSeededCampaignInContext(page). It should call window.**ZUSTAND_STORES**.campaignPersistence.getState().saveCampaign({ retryOnConflict: false }) and assert the status is 'saved'. Have persistCampaignThroughDashboard call it too.
2. **Call it in all three specs.** Call it right after each seed's page.evaluate returns, while the page is still on /gameplay/campaigns and before any page.goto:
   - e2e/campaign-flow.spec.ts: at the end of seedDamagedPostBattleCampaign, line 416ff
   - e2e/campaign-subroute-recovery.spec.ts: at the end of seedRecoverableCampaign, line 66ff
   - e2e/campaign-economy-browser.spec.ts: at the end of seedPostBattleCampaign, line 136ff

   Call it **after** the campaignRoster.setState and updateCampaign calls, so the genesis rosterProjection carries the seeded roster.

3. **Keep the existing assertions.** Keep each spec's saveCampaignThroughDashboard. It then exercises the normal update PUT, as in #1444.
4. **Confirm the economy spec locally.** For campaign-economy-browser, confirm with one local run that the post-mutation reloads (repair priority, salvage accept, loan) still read back. The campaign is now server-validated on reload, so persistence goes through auto-save or the cache-key path rather than pure localStorage. I expect it to pass, because the #1444 fixture consumers have the same shape, but **this was not run locally**.
5. **Verify** with npm run verify:qc:campaign-economy:browser, or node scripts/playwright/run-playwright.mjs test --project=chromium e2e/campaign-flow.spec.ts e2e/campaign-subroute-recovery.spec.ts e2e/campaign-economy-browser.spec.ts --workers=1.

- **Size:** S (about 20–40 lines across 3 specs and 1 fixture).
- **L1 paths:** none. All changes are under e2e/ and none are in units.json ownership. LSC-2 (blocked) owns src/pages-modules/gameplay/campaigns and src/lib/campaign, which this fix does not touch.
- **Safe now, in parallel with B14-0:** yes.

**Optional product follow-up, not needed for the baseline.** For an unadopted legacy copy, Save now stays enabled and silently does nothing. That is an honest-UX gap: the button should be disabled or should route to Adopt. Fixing it would touch src/components/gameplay/pages/campaigns/dashboard/CampaignSaveStatusCard.tsx and probably src/stores/campaign/useCampaignPersistenceStore.ts. That store is campaign persistence/sync, so treat it as L1-adjacent and defer it until the campaign-sync lanes clear.

## 4. app-shell-route-proof:814, "settings vault hash": product regression (a)

### Evidence

- **The error.** The test throws React #418 twice, once on goto and once on reload: "Minified React error #418; args[]=HTML", collected as pageerror and asserted at app-shell-route-proof.spec.ts:624. The server HTML is byte-identical across loads (trace resource 7271f074…html), so the mismatch is deterministic.
- **Local repro.** Reproduced on origin/main ebbea9a4e with next dev -p 3711 --webpack and a one-off Playwright probe (campaign-shell-private/hydration-probe.cjs and hydration-probe.out.txt):
  - **Both /settings and /settings#vault fail.** The hash is not the trigger.
  - **The plain /settings test is currently masked.** It is skipped by serial mode.
  - **The dev-mode diff points at the SVG title.** Excerpt below (the full component stack also includes App → AppContent):

```
SettingsPage (src/pages/settings.tsx:149) -> CustomizerSettings (CustomizerSettings.tsx:47)
-> ArmorDiagramModePreview (ArmorDiagramPreview.tsx:351/395) -> CleanTechDiagram (CleanTechDiagram.tsx:42)
-> BipedArmorDiagram (BipedArmorDiagram.tsx:86/115)
  <g role="button" aria-label="Head armor..."> <title>  + Head
> 115 |               <title>
  116 |                 {location}
  117 |                 {selected ? ' — selected' : ''}
  118 |               </title>
```

### Root cause

src/components/customizer/armor/variants/BipedArmorDiagram.tsx:115-118. An SVG title has **two child expressions**: {location} and {selected ? ' — selected' : ''}. React 19 gives title special handling for document metadata and expects a single string child. The server and client produce different child structures, so hydration of the whole settings page fails and the tree is re-rendered on the client.

This is a real user-facing defect. Every visit to /settings does a full client re-render and logs an error, and the same component is used by the customizer armor diagram.

This is the only multi-child title in src/ (checked with rg). Other titles, such as HeatGlow.tsx:49 and HexCell.layers.tsx:195, already use a single template string.

### Introducing commit

**#1634, 45a94017a ("Establish customizer and application UI baseline", 2026-09-09).** It is the only commit touching BipedArmorDiagram.tsx and the origin of lines 115-118 (git log -S). The settings test passed in nightly through 09-03. From about 09-09 it was hidden, first by the customizer serial failure and then by the collection error.

### Fix proposal

In BipedArmorDiagram.tsx:115-118, replace the children with one string:

```tsx
<title>{selected ? location + ' — selected' : location}</title>
```

Optionally add a regression unit test that renders with renderToString and then hydrateRoot, or asserts that title children are a single string. The test would go in src/components/customizer/armor/variants/**tests**/.

- **Verify** with npm run verify:qc:app-shell. Expect the 5 previously skipped serial tests to execute for the first time, and check them.
- **Size:** XS (1 line, plus an optional test).
- **L1 paths:** none.
- **Safe now, in parallel with B14-0:** yes.

## 5. saved-custom-combat-launch:229: test-side timing flake (c)

### Evidence

- **Only the final check fails.** In all three attempts the full journey passes. The test fails only in the closing withBrowserDiagnostics check, on two **fatal aborted writes**: POST /api/replay-library/encounter and POST /api/matches. Aborted API writes are fatal by rule (browserDiagnosticsModel.ts:54-62).
- **The server answered both writes.** In the retry-1 trace (tr-scl/1-trace.network), POST /api/matches (wall time 14:04:32.504) and POST /api/replay-library/encounter (14:04:32.533) **both received response headers**: 201 with Content-Length 50, and 200 with Content-Length 560. Both still show receive -1 and net::ERR_ABORTED.
- **The navigation follows immediately.** The test's own actions, mapped to wall time, are:
  - 14:04:32.557: waitForLoadState('networkidle') (spec :442)
  - 14:04:32.558: page.goto(…/review) (spec :460)

  That is about 15 ms after the response headers, before the response bodies finished.

### Root cause

e2e/saved-custom-combat-launch.spec.ts:423-442. The test awaits the response headers from waitForResponse, then relies on await page.waitForLoadState('networkidle') to "let the duplicate archive writes settle." **waitForLoadState resolves immediately when the page already reached that state**, which it did on the first load. So line 442 is a no-op and nothing waits for the response bodies.

The server did commit both writes (201 and 200), so this is **not data loss**. Only the client-side body read was cancelled. Whether it fails depends on timing: it passed on 10-17 12:47, passed on retry twice on 10-17, and failed all 3 attempts on 10-18.

Earlier failures of this spec on 10-17 ("Campaign E2E stores are not exposed", victory screen) were a different cause. b79583d93 fixed them on 2026-10-17.

### Fix proposal (test-only)

In e2e/saved-custom-combat-launch.spec.ts, replace line 442 with explicit body completion:

```ts
await Promise.all([replayResponse.finished(), matchResponse.finished()]);
```

Keep the archivedMatch Response in a variable named matchResponse at :438.

If the "effects can re-fire" duplicates the comment mentions are real, also wait on them. One option is page.waitForResponse with a counter. Another is expect.poll on a request tally until it stops changing. No duplicates were observed in this run's trace.

Optional product hardening, separate and not required:

- **Make the writes navigation-safe.** The terminal archive writes are fire-and-forget and never read the body: src/components/encounter/persistEncounterFromSession.ts:127-132 and src/lib/combat/combatResolution.ts:73-89. Adding keepalive: true would make them survive a fast user navigation (these bodies are small).
- **Narrow the harness rule.** Alternatively, refine browserDiagnosticsModel so that an aborted write that already received a 2xx response is not fatal. That is broader and needs the harness to track responses.

- **Size:** XS (2–4 lines).
- **L1 paths:** none (e2e/ only; the optional hardening is in src/components/encounter and src/lib/combat, which are not L1).
- **Safe now, in parallel with B14-0:** yes.

## Ownership check (openspec/planning/2026-09-12-roadmap-completion/units.json)

| Unit                          | State                                                   | ownershipPaths                                                                 |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| B14-0                         | planned                                                 | src/lib/multiplayer/server, openspec/specs/fog-of-war/spec.md                  |
| B14-0A, B14-0B                | main-verified                                           | src/lib/multiplayer/server and related tests                                   |
| LSC-0, LSC-1, LSC-1DB, LSC-1S | blocked                                                 | vault, persistence, multiplayer auth                                           |
| LSC-2, LSC-2OP                | blocked                                                 | src/pages-modules/gameplay/campaigns, src/lib/campaign, CampaignNavigation.tsx |
| LSC-2P                        | blocked                                                 | e2e/local-seat-credentials.spec.ts                                             |
| P2CG1H, P2CG1HP               | blocked                                                 | src/lib/multiplayer/server/\*, server.js, src/components/campaign/coop         |
| L1-SMOKE                      | **not present** in units.json or any openspec/docs file | –                                                                              |

None of the proposed fixes touches L1-owned paths: src/lib/multiplayer/server, src/lib/campaign/coop, src/components/campaign/coop, src/pages/api/multiplayer, server.js, or campaign sync. The proposed write set is:

- e2e/fixtures/campaign.ts
- e2e/campaign-flow.spec.ts
- e2e/campaign-subroute-recovery.spec.ts
- e2e/campaign-economy-browser.spec.ts
- e2e/saved-custom-combat-launch.spec.ts
- src/components/customizer/armor/variants/BipedArmorDiagram.tsx

Only the _optional_ Save-now UX follow-up (src/stores/campaign/useCampaignPersistenceStore.ts) is L1-adjacent, and it should wait.

## Suggested order

1. **Fix #4 first** (XS, product), then run verify:qc:app-shell. This unmasks 5 serial tests that have not run for weeks, so triage them in the same pass.
2. **Fix #1–#3 as one PR** (S, test-only) with the shared genesis-save helper. Run the three specs solo with --workers=1.
3. **Fix #5** (XS, test-only).

None of this changes the B14-0 product lane's write set.

## Method notes and limits

- **Sources:** CI logs came from gh run view --log-failed for 26 nightly runs between 2026-08-18 and 2026-10-18. The latest run's artifacts are the Playwright report data, traces and error-context files. The bisection uses nightly heads plus git merge-base and git log -S.
- **Local repro scope:** I reproduced **#4 only**, with next dev on port 3711 and one Playwright probe. Each heavy step was gated on machine-idle.mjs and run alone. The dev server was stopped afterwards, and port 3711 was not listening when checked.
- **Not reproduced locally:** #1–#3 and #5 were diagnosed from the CI traces and code. The economy-spec persistence note in §1–3 step 4 is therefore an expectation, not a verified result.
- **Reporter limits:** the nightly reporter does not list passing tests, so "P" in the table means absent from the failed and flaky lists. Exceptions are the 10-18 app-shell rows, which come from the HTML report data.
