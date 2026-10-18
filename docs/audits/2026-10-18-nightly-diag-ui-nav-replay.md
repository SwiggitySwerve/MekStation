# Nightly failure diagnosis — customizer, navigation and Replay Library

Date: 2026-10-18. Diagnosis only; no source edits, commits, PRs, local builds, Jest runs or Playwright runs. The root checkout `E:/Projects/Personal/MekStation` was not modified. This is the only authored output file; downloaded CI evidence is private temporary material.

## Decision

The six assigned failing cases represent **five causes: two product defects, two stale test expectations, and one CI fixture-location defect shared by desktop and mobile**. They are not six independent product regressions. None is demonstrated to be a flake. The earliest supplied run also has a server-death infrastructure overlay that prevents four of these cases from reaching their assertions.

The maintainability splits #2269, #2272 and #2277 cannot have introduced these nightly failures: all postdate the tested head. In particular, `GameReplayPage.sections` is used by `/gameplay/games/[id]/replay`, whereas the failing tests use `/replay-library` and `QuickGameReplayPanel`.

The source-supported fixes do not require edits to the explicitly protected L1 server/coop/campaign-sync paths. Test-only repairs can be isolated from B14-0. The replay schema repair needs Events/Replay coordination, and the roadmap's one-product-writing-lane rule means technical path independence is not automatic authorization for a second product implementation lane.

## Evidence and recurrence

Fetched failed logs with `gh run view <id> --repo SwiggitySwerve/MekStation --log-failed` and downloaded `nightly-playwright-report` with `gh run download` for **all five runs**. Inspected error contexts, retry traces, HTTP response bodies, DOM snapshots and the latest customizer/replay screenshots. Private evidence root:

`C:/Users/wroll/AppData/Local/Temp/mekstation-ui-nightly-20261018/`

Each run has `<id>-meta.json`, `<id>-failed.log`, and `<id>/test-results/` plus its HTML report. Traces are retained in retry directories. No local reproduction was necessary to identify the failing boundaries; no heavy-run capacity was consumed.

| Run (UTC start)            | Head        | Full chromium result               | Colors           | Unit-switch validation        | Menu target        | Quick replay                | Blocked desktop / mobile                |
| -------------------------- | ----------- | ---------------------------------- | ---------------- | ----------------------------- | ------------------ | --------------------------- | --------------------------------------- |
| 39013211365 — Oct 17 07:19 | `105eddcb9` | 542 passed, 312 failed             | transparent `li` | expected two errors; UI valid | connection refused | connection refused          | connection refused / connection refused |
| 39017508685 — Oct 17 08:28 | `31610a56d` | 905 passed, 21 failed, 2 flaky     | same             | same                          | 37.296875px        | 422, invalid `game_created` | 404 / 404                               |
| 39022280834 — Oct 17 09:44 | `33d6476e9` | 915 passed, 18 failed, 3 flaky     | same             | same                          | same               | same                        | same / same                             |
| 39033900424 — Oct 17 12:47 | `0ba167f32` | 920 passed, 17 failed              | same             | same                          | same               | same                        | same / same                             |
| 39129982940 — Oct 18 13:04 | `1b8558625` | 922 passed, **15 failed, 1 flaky** | same             | same                          | same               | same                        | same / same                             |

These are full-suite totals, not counts of this bucket. The latest “about 16 failures” is more precisely 15 final failures plus one flaky test; that flaky test is outside these six cases. The target failures persist through retries. The menu case's declaration moved from line 268 to 269 after an unrelated navigation-selector update.

Compared history from `105eddcb9` through `1b8558625`; none of the five underlying product/fixture implementations changed in that interval. `31610a56d` repaired server relaunch and absolute database-runtime paths, allowing later tests to reach their real failures. `e823de8dc` updated customizer menu selectors but not the failing menu-size assertion. Earlier origin history and blame identify the changes below. “Observed since Oct 17” therefore does not mean “introduced Oct 17.” There is no passing predecessor for these cases among the supplied runs, and no local binary bisection is claimed.

## 1. Equipment category colors — category (b), test/spec drift

**Case:** `e2e/customizer-category-colors.spec.ts:10`, failing assertion at **40**. Consistent in all five runs.

**Root cause:** The test reads `backgroundColor` from the ancestor `li` at lines **39–40**, then expects catalog/loadout/mounted backgrounds and text to be identical. The catalog intentionally changed to a translucent colored child layer with opaque theme-colored content:

- `src/components/customizer/equipment/EquipmentCatalogCard.tsx:33–40`: transparent `li`, `text-text-theme-primary`, and a separate `data-testid="equipment-catalog-row-fill"` span carrying `colors.slotBg` and opacity 0.3/0.4.
- `openspec/specs/equipment-browser/spec.md:598–603` explicitly requires translucent category backgrounds and opaque content.
- Commit **`be7f85b867aa3e8576e5e3d27e309276203bc24b` / #1636**, September 11, introduced this intentional styling and describes it in the commit message. The old spec from #1634 was not updated.

The latest screenshot visibly shows the gold Small Laser category fill. The transparent computed background on the container is correct, not a missing-color product bug. Updating only line 40 would expose further stale assertions: catalog text need not be black at line 49, nor equal to the black text of solid loadout/critical-slot surfaces.

**Concrete fix:** Edit only `e2e/customizer-category-colors.spec.ts`. Read category RGB from `equipment-catalog-row-fill`, assert that layer's opacity separately and assert content remains opaque/readable. Compare category identity across catalog, grouped loadout and mounted slots; retain surface-specific text/opacity expectations. Preserve grouping, mounting, reload, mobile and overflow assertions. Do not restore opaque catalog rows to satisfy the old test.

**Ownership / parallel safety:** No protected L1 path. Test-only change is technically safe alongside B14-0, subject to the shared `e2e` census below. No need to edit U68-owned customizer product code.

**Size:** Small: one spec, approximately 30–60 changed lines, 1–2 hours including a focused browser proof.

## 2. Unit switching and validation — category (e), stale fixture expectation

**Case:** `e2e/customizer-layout-workbench.spec.ts:372`, failing assertion at **384**. Consistent in all five runs.

**Root cause:** Lines **377–400** assume canonical Locust LCT-1V has exactly two “Machine Gun overlaps a fixed system” errors. The screenshots/error contexts show **Valid**, with the correct Locust selected. The test never reaches the unit-switch attribution checks.

- `public/data/units/battlemechs/1-age-of-war/standard/Locust LCT-1V.json:68` records Shoulder, Upper Arm Actuator, then Machine Gun; it does not install lower-arm/hand actuators in those slots.
- `src/services/units/unitLoaderService/normalizeUnitConfiguration.ts:36–59,243` now derives and retains this topology.
- `src/hooks/validation/useEquipmentValidation.ts:38–53` passes `armActuators` into slot validation instead of inventing default fixed systems.
- **`0c1c325d617cd832a105237c38b67425ff50d46a`**, authored October 12 and merged in **#2134 on October 15**, intentionally fixed the false overlap errors. This is also test drift following a correct product change; category (e) emphasizes the stale assumed canonical baseline.

**Concrete fix:** Edit `e2e/customizer-layout-workbench.spec.ts`. Establish deliberate, identifiable invalid states through the existing browser/store fixture seam instead of relying on a historical canonical-data bug. Keep distinguishable Atlas and Locust issue sets, capture each baseline, then retain the MutationObserver assertion that an Atlas result is never labeled as Locust during switching. Alternatively prove the now-valid Locust remains valid after switching away from an invalid Atlas, while retaining a deliberate invalid-draft attribution case. Do not simply delete the validation assertions or reintroduce lower-arm actuators.

**Ownership / parallel safety:** No L1 source changes. Safe as an isolated test-only repair after the `e2e` census; no edits to canonical generated data, validation rules, or the actuator fix. #2277's validation split is not required to resolve this test.

**Size:** Small: one spec, approximately 40–90 changed lines, 2–3 hours including proof that cross-unit attribution is still detected.

## 3. Mobile hamburger touch target — category (a), product regression

**Case:** `e2e/mobile-navigation.spec.ts:269`; actual width assertion **284**. Consistent in the four runs that reach it; obscured by server death in the first run.

**Root cause:** The button relies on the icon plus padding for its size, without an explicit minimum hit area:

- `src/components/common/TopBar.tsx:266–271`: `p-2`, no 44px minimum dimensions.
- `src/components/common/icons/NavigationIcons.tsx:133–134`: `HamburgerIcon` returns `<AppIcon name="menu" />`.
- `src/components/ui/SvgIcon.tsx:3–9,23–24`: the default control icon is **20px**.
- **`45a94017a` / #1634**, September 9, replaced the previous `h-6 w-6` (24px) hamburger SVG with the 20px default AppIcon. With ordinary 8px padding this reduces the nominal hit area from 40 to 36px; CI measures **37.296875px** at the assertion. The exact fractional measurement is not needed to establish the missing minimum; no computed-style experiment was run to attribute that fraction.
- `openspec/specs/app-navigation/spec.md:90–94` requires **44×44px**. The test already under-enforces its own title by checking 40, so merely getting back to 40 is insufficient. The absence of a 44px guarantee predates the icon regression.

**Concrete fix:** In `src/components/common/TopBar.tsx`, give the menu button an explicit minimum 44×44px hit area and centered, nonshrinking contents (using project conventions). In `e2e/mobile-navigation.spec.ts`, assert 44px on both dimensions; a polling measurement can handle initial layout settling, without raising any timeout. Keep the right-side placement and tap behavior checks. Do not enlarge every icon globally.

**Ownership / parallel safety:** Neither file touches a protected L1 path. Technically independent of B14-0; implementation scheduling still needs the parent to reconcile the roadmap's one-product-writing-lane rule. Test-file ownership census applies.

**Size:** Extra small: two files, approximately 5–15 changed lines, under an hour plus focused mobile proof.

## 4. Quick-game Replay Library viewer — category (a), product regression

**Case:** `e2e/playtest-sp-smoke.spec.ts:288`, failing panel assertion at **331**. Consistent since the first unobscured run, October 17 08:28; all four retry traces inspected return the same typed rejection.

**Root cause:** Persistence writes an extra field that the replay loader's strict schema does not support.

- `src/components/quickgame/persistQuickGame.ts:109–133` injects `payload.quickMeta = { ...quickMeta, bvTotal }` into `game_created`; line **221** passes the request's BV to this writer.
- `src/lib/events/replay/CombatLifecycleBaselineSchemaPack.ts:61–78` defines the strict GameCreated payload without `quickMeta`. At **148–152**, the rejecting registration is `combat.game_created.v1.custom-construction-1`.
- `src/types/gameplay/GameSessionLifecycleEvents.ts:56` also has no typed `quickMeta`; the writer uses a local intersection with `Record<string, unknown>` to bypass this mismatch.
- **`431b98e9f12b3cbfda7c59b627d19953fbc9c354`**, authored October 12 and merged in **#2134 on October 15**, introduced the injection without updating the replay schema.

**Direct CI evidence:** Latest retry trace shows `POST /api/replay-library/quick` returning 200 for fresh event data plus BV, then a load returning **422 REPLAY_HISTORY_BLOCKED**, one blocked event, **line 1 / invalid-payload / game_created**, with message `Payload does not match combat.game_created.v1.custom-construction-1`. The screenshot shows a correctly rendered, accessible blocked panel, not a missing viewer implementation. `ReplayLibraryPage.tsx:112–135` intentionally selects that panel on 422.

The test watches the first Quick row rather than the exact newly saved ID: in retry 1 it creates `quick-1792332068469-b2wium3` but opens `quick-1792332016634-2lropor`. That is an isolation weakness, not the primary cause: every current quick-game write carrying BV gains the unsupported field. Both IDs are from this run, not a stale committed replay fixture.

**Concrete fix proposal:** Preserve the recorded BV feature and explicitly support it with a strict, finite, nonnegative `quickMeta.bvTotal` shape in `src/lib/events/replay/CombatLifecycleBaselineSchemaPack.ts`; add its concrete optional type to `src/types/gameplay/GameSessionLifecycleEvents.ts` and remove the unconstrained intersection in `src/components/quickgame/persistQuickGame.ts`. Update the GameCreated schema identity/fingerprint deliberately, following `openspec/specs/event-store/spec.md:349–360,398–401`; retain strict rejection of unknown/ill-typed metadata and preserve stored bytes. Add a persist-to-real-load-pipeline round-trip to `src/components/quickgame/__tests__/persistQuickGame.test.ts`, including already-written quickMeta histories and negative metadata cases. Update the schema pack's focused contract fixtures/tests as required by that explicit schema change. In `e2e/playtest-sp-smoke.spec.ts`, watch the manifest ID returned by this test's save and assert the load response before the viewer.

Do not turn the replay loader into passthrough, ignore GameCreated, weaken the blocked-history panel, or treat a longer wait as a fix. An alternative narrow containment is to stop injecting metadata and retain BV only in the manifest, but that would lose metadata-based index rebuild behavior and would not make already-written recordings readable; it is not a complete repair.

**Ownership / parallel safety:** No direct edit to the user's L1 server/coop/sync paths. **Coordinate before implementation:** this changes a shared Events/Replay schema consumed by authority code. B14-0 explicitly says to preserve S/U26 Events/Replay contracts; U45 also has a broad planned `src/lib` ownership entry. This is safe to prepare in parallel, but not an uncoordinated schema change alongside B14-0. No reason to modify multiplayer hosts or fog policy for this defect.

**Size:** Small-to-medium: about 5–7 files, 80–160 changed lines including meaningful tests, roughly half a day plus focused integration/browser proof. Exact schema-fixture census determines final file count.

## 5. Blocked history, desktop and mobile — category (d), CI environment/fixture integration

**Cases:** `e2e/replay-blocked-history.spec.ts:70` in both viewports, failing at **109**: expected 422, got **404**. Consistent in four unobscured runs. These are one cause with two viewport cases.

**Root cause:** Test and server resolve `process.cwd()` to different directories.

- `e2e/replay-blocked-history.spec.ts:22–27,55–57` writes `<checkout>/simulation-reports/quick/e2e-blocked-history.jsonl` from the Playwright process.
- `src/pages/api/replay-library/[source]/[gameId].ts:129–143` reads `<server-cwd>/simulation-reports/quick/...`; absence produces `404 { error: 'replay not found', code: 'NOT_FOUND' }`.
- `.github/workflows/nightly-validation.yml:190` explicitly starts the relaunching server after `cd .next/standalone`. The same cwd distinction is documented at `playwright.config.ts:39–45`, but that repair only addresses database runtime paths, not replay files.
- The test stubs the **list** at lines **82–98**, so the watch button appears even though the real server has no matching file. The page correctly renders generic load failure; the actual invalid-payload fixture is never read.

**Introducing configuration:** **`0f86b4ee9` / #1678**, September 15, switched nightly from the root dev server to the production standalone server. **`31610a56d`**, October 17, kept the standalone cwd while adding a relaunching wrapper; it exposed the 404 after fixing the earlier server-death cascade, rather than introducing the original root/standalone mismatch. No passing interval in the supplied runs proves the exact first observed 404 before October 17.

**Concrete fix:** Make fixture root an explicit test-run contract. For the smallest diagnosis-specific repair, set an absolute `MEKSTATION_E2E_REPLAY_FIXTURE_ROOT` for the full-suite step in `.github/workflows/nightly-validation.yml` to `${{ github.workspace }}/.next/standalone`; in `e2e/replay-blocked-history.spec.ts`, resolve the seeded replay directory from that value, falling back to root only for the root dev-server mode. Give the file a run/viewport-unique ID and clean up only that fixture. This preserves the real load pipeline. A broader shared replay-storage-root option would be reasonable separately, but is unnecessary to repair this fixture and would require more ownership review.

Keep the expected 422, typed reason, focused blocked heading, absence of player controls, and payload-privacy assertions. Do not mock the load route or change the expected status to 404.

**Ownership / parallel safety:** No protected L1 path; the proposed minimal repair avoids `server.js`, `playwright.config.ts`, database setup and campaign sync. Safe as isolated CI/test work alongside B14-0 after the shared `e2e` census. `playwright.config.ts` itself is held by U24/U24b and is intentionally not needed for this repair.

**Size:** Small: two files, approximately 15–35 changed lines, 1–2 hours plus a focused standalone-mode proof in both viewports.

## Ownership census and implementation boundaries

Read `openspec/planning/2026-09-12-roadmap-completion/units.json` at fetched main **`ebbea9a4ebec2b2445f7a04570a9af1517233881`**. This file's states are documentary; the user's live B14-0 lane may be ahead of the ledger.

- **B14-0** is `planned`, owns `src/lib/multiplayer/server` and the fog spec, and explicitly preserves S/U26 Events/Replay contracts. Its admission text preserves one product-writing lane. B14-0A/B14-0B/B14-HEAD are additional containment slices; none is a reason to patch Replay Library load semantics through multiplayer.
- **LSC-0, LSC-1DB, LSC-1S, LSC-1, LSC-2OP, LSC-2 and LSC-2P** are `blocked`. They cover identity contracts, persistence/vault/auth, campaign entry and packaged local-seat proof. LSC-2P's broad ownership includes `e2e`; its actual behavior concerns the separate packaged local-seat spec.
- **P2CG1H** is `blocked`; it owns `server.js`, multiplayer server, `src/pages-modules/api`, and named authority/co-op proof files. None of the minimal proposed fixes requires those paths.
- **L1-SMOKE is not present** as a unit ID or string in the fetched `units.json` (also absent from a planning-tree text search). Do not invent its state or claim it is complete. The actual `l1ReleaseChecklist20261018` is pending and includes exact-RC co-op checks, packaged installer rehearsal and the human three-seat session. These UI fixes cannot serve as those receipts. Parent should reconcile any separately maintained L1-SMOKE ownership before implementing overlapping proof work.
- Other relevant open holders: **U68 blocked** broadly owns customizer components for a registry-cycle task; **U45 planned** broadly owns `src/lib`; **U24 blocked / U24b planned** hold `playwright.config.ts`.
- Broad `e2e` prefixes also match **U2/U2b, U25/U27/U28/U30/U31, U51–U55, U57 and FOG-X**, as well as LSC-2P. Their stated work concerns authority, rewind, privacy, restart, campaign and fog packs. This is not a literal-leaf conflict with the five assigned spec files, but broad ownership cannot be silently ignored. Freeze the proposed leaf list with the parent before fixing; do not treat directory prefixes as blanket permission.
- No unit in this fetched snapshot is marked `implementing`. That does not invalidate the user's statement that a B14-0 lane is active.

Technical parallel recommendation: land the two stale-test repairs and the blocked-fixture repair as independent narrow test/CI work; prepare the menu fix independently and schedule it under the product-lane rule; coordinate the quickMeta schema repair with the Events/Replay owner before implementation. All heavy validation remains serialized machine-wide.

## Maintainability splits: relevance and limits

Reviewed #2269 at **`e6d1553ce`**, #2272 at **`ebbea9a4e`**, and open #2277 at fetched head **`087bd7701551941db28a521178c07f4d9dae86c6`**, based on `ebbea9a4e`. This is a static relevance review, not a runtime certification of those PRs.

### #2269 — construction and simulation extraction

Merged October 18 16:24 UTC, after nightly head `1b8558625` and its failures. AttackAI and BV extraction could indirectly affect quick-game generation/simulation or displayed BV in a future run. It does not edit the catalog fill, Locust topology, menu sizing, replay fixture paths or strict GameCreated payload. It cannot explain the existing symptoms. BV changes would not cure the quickMeta mismatch: even zero is a valid BV that activates the writer branch.

### #2272 — GameReplayPage, WeaponSelector, inspector, AI tier, scenario types

Merged October 18 17:59 UTC. The original `GameReplayPage.sections.tsx` becomes a five-export facade; header/sidebar/visualization/footer logic moves into sibling files, with the public props/types retained. Static comparison found those moved implementation lines unchanged apart from module boundaries/imports/exports.

`src/pages/gameplay/games/[id]/replay.tsx:17,29` imports that facade. The assigned specs navigate to `/replay-library`; `src/components/replay-library/ReplayLibraryPage.tsx:16` imports **`src/components/quickgame/QuickGameReplayPanel.tsx`**, which composes existing ReplayControls/ReplayTimeline directly. Neither uses `GameReplayPage.sections`. The blocked tests also fail at HTTP status before any replay player is expected to mount. Therefore the GameReplayPage extraction has **no direct causal path to these observed failures**. A regression there would belong in `/gameplay/games/.../replay` coverage such as `e2e/replay-player.spec.ts` or the corresponding game replay tests.

WeaponSelector and TacticalUnitInspector facades concern tactical combat UI, not catalog categories, shell menu sizing or fixture-file placement. AITierRegistry and ScenarioInterfaces have broader indirect reach into quick-game setup/simulation; their exports remain facades, and AI tier resolver imports go to the extracted catalog/default modules rather than back through the facade. Those areas merit their existing focused contracts for any new failure on a post-merge head. No inspected change supplies evidence of a new break in this bucket.

### #2277 — result/diff/validation/record-sheet/input/BV extraction

Open head inspected; it is not in the failed nightly. QuickSimResultPanel is a Quick Resolve result component, not QuickGameReplayPanel or the Replay Library loader. NestedDiff is unrelated to the failed HTTP/file boundaries. RecordSheetPanels and protoMechBV do not implement the BattleMech catalog/Locust fixture or replay schema. ControlledInput is a distinct shared input component; the failing customizer search/layout assertions are not repaired by its extraction. StandardValidationRules is the closest thematic overlap, but the actual Locust false-overlap removal is in the October 12 actuator plumbing and already visible at `1b8558625`.

The inspected facades preserve exports; the extracted ControlledInput, QuickSimResultPanel and StandardValidationRules implementation lines retain their prior behavior in the static comparison (new imports/exports account for the differences checked). The registry retains its rule ordering. The extra `aiLayeringGuard.test.ts` edit adds guard coverage for AI implementation modules. No concrete new break of these six tests was identified. New import-resolution/cycle/runtime failures are possible with any extraction, so this does not substitute for #2277's own checks; it does rule out attributing this nightly's existing failures to it.

## Restoring a trustworthy baseline

After the proposed fixes, rerun only the five assigned spec files (six failed cases) against the appropriate repo-configured chromium/standalone setup, one worker. Gate every build, Jest or Playwright invocation with:

`node scripts/qc/machine-idle.mjs --own-pid 47516 --own-pid 55164`

Use the requested fresh worktree under `E:/Projects/Personal/MekStation-wt/`, `npm ci`, and prepend `C:/Users/wroll/AppData/Local/nvm/v22.22.0` to PATH. No timeout increases, killing unrelated processes, or root-checkout edits. The blocked-fixture proof must exercise the standalone cwd; a passing root-dev-server run alone would miss its defect. The quick replay proof must load the exact just-persisted ID and retain strict unknown-history rejection.

This report does not diagnose Scenario Pack Recapture or the remaining nightly failure buckets. It does not claim the full regression baseline is restored until those buckets and a new full nightly run are green.
