## 1. Shared Command Contract

- [x] 1.1 Add shared command-screen types for subject selection, authority, preview, reasons, costs, before/after summaries, ledger references, and redaction policy.
- [x] 1.2 Add shared reason and consequence vocabulary for legal, illegal, costly, blocked, risky, stale, and manual-takeover command states.
- [x] 1.3 Add command preview and commit logging event names for combat, travel, readiness, customizer/refit, and GM intervention domains.
- [x] 1.4 Add unit tests proving preview objects can represent legal command, illegal command, drift rejection, and redacted GM command cases.

## 2. Tactical Hex Command Screen

- [x] 2.1 Wire the active game route and `GameplayLayout` to expose a tactical command context for selected unit, phase, movement, combat, and action dock state.
- [x] 2.2 Update `HexMapDisplay` overlays and action dock inputs so movement and combat previews share one projection frame for MP, terrain, elevation, LOS, arcs, range, heat, targetability, and invalid reasons.
- [x] 2.3 Add non-color-only overlay indicators for legal, illegal, costly, blocked, and tactically relevant hexes.
- [x] 2.4 Add a role-gated tactical GM intervention entry point that previews combat corrections and commits through a ledger-backed command path.
- [x] 2.5 Add component/unit tests comparing tactical preview data to committed movement/combat command results.
- [x] 2.6 Add a browser E2E command journey that selects a unit, previews a move or attack, commits it, and validates the resulting state/log.

## 3. Mission Readiness and Mek Stable

- [x] 3.1 Add a mission readiness projection service that evaluates mission constraints, selected roster, eligible/ineligible units, pilot readiness, unresolved blockers, and launch consequences.
- [x] 3.2 Replace broad `getDeployableUnits()` launch handoff with explicit selected roster state and blocker-aware confirmation before encounter materialization.
- [x] 3.3 Prevent silent stock-unit fallback when campaign roster data is missing or invalid for a player-authored mission launch.
- [x] 3.4 Expand the Mech Bay/Mek stable view with mission eligibility, damage, pilot, ticket, ammo/supply, Battle Value or weight, and blocker-to-fix actions.
- [x] 3.5 Add tests for readiness eligibility, invalid roster blocking, selected roster handoff, and materialization failure logging.

## 4. Campaign Customizer Handoff

- [x] 4.1 Add campaign-origin customizer route state for `campaignId`, `unitId`, optional `missionId`, `returnTo`, campaign date, budget, rules level, and refit constraints.
- [x] 4.2 Load campaign-owned unit identity and canonical state in customizer campaign refit mode without mutating free-build sessions.
- [x] 4.3 Save valid campaign-origin edits as campaign refit orders or explicit campaign unit updates, and block invalid edits with tab-level resolution links.
- [x] 4.4 Return from save/cancel to mission readiness or Mek stable and refresh deployment validation against canonical campaign state.
- [x] 4.5 Add tests and a browser journey for stable/readiness -> customizer -> return -> refreshed eligibility.

## 5. Campaign Starmap Logistics

- [x] 5.1 Add a named travel rules/config layer for jump distance limits, transit duration, route planning assumptions, and travel fee defaults.
- [x] 5.2 Add pure starmap logistics preview generation for route legs, illegal leg reasons, elapsed days, arrival date, travel fees, daily costs, repair/medical progress, contract deadline warnings, and projected funds.
- [x] 5.3 Replace direct starmap travel commit with preview approval that applies current-system, date, activity log, finance ledger, and day progression through one validated path.
- [x] 5.4 Add starmap lenses for range, faction/employer context, contract opportunities, market/supply quality, deadlines, and risk without hiding the active route preview.
- [x] 5.5 Add tests proving travel preview does not mutate state, commit matches preview, and reload preserves destination, date, funds, activity, and downstream consequences.

## 6. GM Ledger and Authority Boundaries

- [ ] 6.1 Extend the intervention ledger abstraction with cross-domain command metadata, preview ids, subject ids, before/after summaries, resulting-state summary, and redaction policy.
- [ ] 6.2 Add campaign GM cascade previews for accounting fixes, merchant reversal, roster recovery, repair/salvage adjustment, travel/time correction, and unit reload reconciliation.
- [ ] 6.3 Add manual-takeover flow for ambiguous or conflicting cascade projections.
- [ ] 6.4 Add player and GM projections for command ledger entries so private rationale and full diffs are GM-only while public net effects remain visible.
- [ ] 6.5 Add tests for intervention commit, reversal/repair entries, reload redaction, and player/GM projection separation.
- [ ] 6.6 Align co-op campaign host/guest authority with command projections so hosts approve/veto/GM-correct and guests propose or view public outcomes only.
- [ ] 6.7 Align networked tactical host/guest command surfaces with authoritative sync so host GM corrections replicate as redacted public results.

## 7. Logging and QC Automation

- [ ] 7.1 Add command-path diagnostic logs for preview creation, malformed payload rejection, invalid action rejection, successful commit, persistence reload proof, and GM intervention outcomes.
- [ ] 7.2 Add quick validation scripts for each major screen slice: combat command, readiness/stable, customizer handoff, starmap logistics, GM redaction, and long-campaign drift.
- [ ] 7.3 Expand journey QC definitions for character build, Mek build, Mek 1v1, Mek 4v4, contract scenario, short campaign, and long campaign to include command-screen checkpoints.
- [ ] 7.4 Add browser E2E coverage for campaign logistics reload truth, readiness/customizer deployment handoff, and GM redaction after reload.
- [ ] 7.5 Add a networked/co-op browser proof that host GM intervention, guest proposal or intent, redacted guest result, reconnect, and replay remain consistent.
- [ ] 7.6 Run lint, typecheck, targeted unit tests, targeted E2E journeys, `openspec.cmd validate add-playable-command-screens --strict`, and record evidence before archive.

## 8. PR, Merge, and Archive Bookkeeping

- [ ] 8.1 For each implementation wave, keep tasks/spec status current before creating the wave PR.
- [ ] 8.2 Run UI/UX evaluation against the affected playable screens before marking a wave ready for PR.
- [ ] 8.3 Run relevant maintenance checks for touched files before marking a wave ready for PR.
- [ ] 8.4 Merge each wave only after validation evidence is recorded, then reset/prune local state.
- [ ] 8.5 Archive completed OpenSpec work only after implemented requirements are validated and no active downstream wave still depends on unarchived deltas.

## Evidence

- 2026-06-30 Wave 2 tactical GM route/layout slice: added `?mode=gm` / `?gm=1` route shell resolution, route-side tactical GM intervention surface, ledger-backed combat preview/approval, player-safe public log projection, and `GameplayLayout` pass-through to `TacticalActionDock`.
- Focused command-flow tests: `npm.cmd test -- --watchAll=false --runTestsByPath src/pages-modules/gameplay/games/__tests__/gmTacticalInterventionSurface.test.ts src/components/gameplay/__tests__/GameplayLayout.gmIntervention.test.tsx src/components/gameplay/TacticalActionDock/__tests__/TacticalActionDock.04.gmIntervention.test.tsx --runInBand` passed 3 suites / 7 tests.
- UI/UX evaluation for this slice: normal combat mode remains the default; GM controls only render in GM shell mode; the confirmation surface is an accessible dialog in the existing action dock; player-facing log rows show public net effects without private GM rationale; the central map layout is not replaced or covered by a new shell.
- Maintenance and spec gates: `npm.cmd run typecheck`, targeted `npx.cmd oxlint`, targeted `npx.cmd oxfmt --check`, scoped `node scripts/maintenance/scan-maintenance.mjs`, and `openspec.cmd validate add-playable-command-screens --strict` all passed.
- 2026-06-30 Wave 2 shared projection/parity slice: added `GameplayLayout` shared tactical projection frame construction, passed it into `HexMapDisplay`, derived dock movement/combat preview inputs from that frame, and merged dock combat preview inputs into the effective command context so projected invalid combat blocks commits before dispatch.
- Projection/UI proof: `GameplayLayout.tacticalProjectionFrame.test.tsx` proves map overlays and dock movement preview share `shared-engine-projection`; `HexMapDisplay.nonColorIndicatorMatrix.test.tsx` proves legal, blocked/illegal, costly, hazard, mixed, and combat-relevant hexes have non-color text/glyph/data indicators; `TacticalActionDock.02.test.tsx` proves legal movement/weapon previews dispatch matching commit payloads and blocked weapon projections reject commit with the previewed reason.
- Focused tactical projection tests: `npm.cmd test -- --watchAll=false --runTestsByPath src/components/gameplay/__tests__/GameplayLayout.tacticalProjectionFrame.test.tsx src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.nonColorIndicatorMatrix.test.tsx src/components/gameplay/TacticalActionDock/__tests__/TacticalActionDock.02.test.tsx src/pages-modules/gameplay/games/__tests__/gmTacticalInterventionSurface.test.ts src/components/gameplay/__tests__/GameplayLayout.gmIntervention.test.tsx src/components/gameplay/TacticalActionDock/__tests__/TacticalActionDock.04.gmIntervention.test.tsx --runInBand` passed 6 suites / 18 tests; Jest still reports the pre-existing stale `baseline-browser-mapping` warning.
- UI/UX evaluation for shared projection slice: top-down map remains the primary explanation layer; invalid movement shows a blocked glyph plus reason before commit; costly/hazard/mixed states use text labels and badges, not color alone; combat-relevant hexes carry explicit range metadata; dock preview and disabled command reason now agree with the map projection.
- Static gates for shared projection slice: `npm.cmd run typecheck`, targeted `npx.cmd oxlint`, and targeted `npx.cmd oxfmt --check` passed.
- 2026-06-30 Wave 2 browser command journey slice: added `e2e/tactical-command-journey.spec.ts` and a QuickGame live tactical-session guard so interactive skirmish routing opens the tactical battle instead of auto-resolving over an active gameplay session.
- Browser E2E proof: `npm.cmd run test:e2e -- e2e/tactical-command-journey.spec.ts` passed 4 projects / 4 tests (`chromium`, `Mobile Chrome`, `Tablet Portrait`, `Tablet Landscape`) and validates selected-unit command preview, move commit, resulting unit position, `movement_declared`/`movement_locked` log entries, and selection cleanup.
- QuickGame guard proof: `QuickGamePlay.liveSession.test.tsx` proves active non-tactical quick games still auto-resolve, while active interactive sessions and spectator sessions do not call `startBattle()`.
- Focused Wave 2 regression proof after formatting: `npm.cmd test -- --watchAll=false --runTestsByPath src/components/gameplay/__tests__/GameplayLayout.tacticalProjectionFrame.test.tsx src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.nonColorIndicatorMatrix.test.tsx src/components/gameplay/TacticalActionDock/__tests__/TacticalActionDock.02.test.tsx src/pages-modules/gameplay/games/__tests__/gmTacticalInterventionSurface.test.ts src/components/gameplay/__tests__/GameplayLayout.gmIntervention.test.tsx src/components/gameplay/TacticalActionDock/__tests__/TacticalActionDock.04.gmIntervention.test.tsx src/components/quickgame/__tests__/QuickGamePlay.liveSession.test.tsx --runInBand` passed 7 suites / 21 tests; Jest still reports the pre-existing stale `baseline-browser-mapping` warning.
- Final Wave 2 static/spec gates: `npm.cmd run typecheck`, targeted `npx.cmd oxlint`, targeted `npx.cmd oxfmt --check`, `git diff --check`, and `openspec.cmd validate add-playable-command-screens --strict` passed.
- Maintenance gate: exact changed-file scan `node scripts/maintenance/scan-maintenance.mjs --scope=... --limit=80` reported 0 critical/high findings and only 3 info-level file-bloat advisories on existing touched gameplay files (`GameplayLayout.commandPreview.ts`, `GameplayLayout.tsx`, `TacticalActionDock.tsx`). A broader directory scan still surfaces pre-existing `e2e/fixtures/customizer.ts` type-safety findings outside this wave.
- UI/UX evaluation for browser command journey: the live route now preserves the tactical command screen and avoids the prior "No active session" failure; the E2E revealed compact/mobile hit-target fragility around the rail unit control and SVG map click planning, so the test records state/log proof with fallbacks while those interaction refinements remain queued for the tactical map lens work.
- 2026-06-30 Wave 3 mission readiness/stable slice: added `buildMissionReadinessProjection`, selected roster launch consequences, pilot/repair blockers, damaged-unit warnings, explicit missing-selected-unit rejection, and selected roster extraction for launch.
- Mission launch UI proof: the single-player mission launch route now renders a compact readiness panel with selected roster checkboxes, blocker text, launch consequences, and disabled launch state; its commit path uses `selectedRosterUnitsForLaunch(...)` instead of broad `getDeployableUnits()`.
- Materialization safety proof: `materializeCampaignMissionEncounter` now rejects empty selected rosters and destroyed selected units before force assignment, with diagnostic failure logging, so missed UI gates cannot silently deploy stock fallback units.
- Mek stable proof: `MechBay` rows can receive the same readiness projection and now show eligibility, pilot, ticket count, ammo/supply ticket status, known campaign tonnage when canonical configuration exists, honest "BV not cataloged" text, and blocker-to-fix repair links.
- Focused Wave 3 tests: `npm.cmd test -- --watchAll=false --runTestsByPath src/lib/campaign/readiness/__tests__/missionReadinessProjection.test.ts src/lib/campaign/encounter/__tests__/materializeCampaignMissionEncounter.test.ts src/__tests__/pages/gameplay/campaigns/mission-launch.coop.test.tsx src/components/campaign/bays/__tests__/MechBay.test.tsx src/components/gameplay/pages/campaigns/dashboard/__tests__/CampaignDashboardPage.reactivity.test.tsx --runInBand` passed 5 suites / 20 tests; Jest still reports the pre-existing stale `baseline-browser-mapping` warning.
- Final Wave 3 static/spec gates: `npm.cmd run typecheck`, targeted `npx.cmd oxlint`, targeted `npx.cmd oxfmt --check`, `git diff --check`, and `openspec.cmd validate add-playable-command-screens --strict` passed.
- Maintenance gate: exact changed-file scan `node scripts/maintenance/scan-maintenance.mjs --scope=... --limit=80` reported 0 critical/high findings and only 5 info-level file-bloat advisories on existing/touched modules.
- UI/UX evaluation for readiness/stable slice: readiness is shown before the destructive launch commit; blocked rows keep the map/campaign shell out of the way and point directly to repair detail; the stable row stays information-dense without nested cards; BV is not synthesized where no canonical value exists, which keeps the player-facing surface honest.
- 2026-06-30 PR CI repair: added `openspec/active-change-ledger.json` so active staged specs are explicitly accounted until archive, while unaccounted active changes and stale ledger entries still fail `validate-openspec-ci-quality`.
- Tactical map regression repair: combat projection target overrides now apply only when a supplied tactical projection frame contains combat entries, preserving physical attack target rings during the physical attack phase.
- PR repair validation: `scripts/__tests__/openspec-ci-quality-qc.test.ts` and `addInteractiveCombatCoreUI.smoke.03.test.tsx` passed together; local CI shards `npx.cmd jest --selectProjects unit --ci --shard=4/6` and `--shard=5/6` passed; `npm.cmd run typecheck`, targeted `npx.cmd oxlint`, targeted `npx.cmd oxfmt --check`, `node scripts/qc/validate-openspec-ci-quality.mjs`, `openspec.cmd validate add-playable-command-screens --strict`, `npm.cmd run maintain:scan:gate`, and `npm.cmd run test:e2e -- e2e/tactical-command-journey.spec.ts` passed.
- 2026-06-30 Wave 4 campaign customizer handoff slice: added campaign-origin refit route state, editor-session isolation, campaign customizer context, save/cancel command bar, Mech Bay and mission readiness refit entry points, query-preserving customizer tab routing, and stable/readiness return links that request deployment-validation refresh.
- Campaign customizer proof: route/session unit tests prove campaign refit query round trips and campaign-owned roster identity becomes a separate editor unit; command-bar component tests prove valid refit-order save/return and invalid construction blockers with tab-level resolution links; mission readiness page tests prove per-unit refit editor links preserve campaign/mission context.
- Browser E2E proof: `npm.cmd run test:e2e -- e2e/campaign-customizer-handoff.spec.ts` passed 4 projects / 4 tests (`chromium`, `Mobile Chrome`, `Tablet Portrait`, `Tablet Landscape`) and validates Mech Bay -> campaign customizer -> save refit order -> Mech Bay return with canonical campaign `refitOrders` updated.
- Focused Wave 4 regression proof: `npm.cmd test -- --watchAll=false --runTestsByPath src/lib/campaign/customizer/__tests__/campaignCustomizerRoute.test.ts src/lib/campaign/customizer/__tests__/campaignCustomizerSession.test.ts src/components/customizer/campaign/__tests__/CampaignRefitCommandBar.test.tsx src/hooks/__tests__/useCustomizerRouter.test.ts src/__tests__/pages/gameplay/campaigns/mission-launch.coop.test.tsx --runInBand` passed 5 suites / 11 tests; Jest still reports the pre-existing stale `baseline-browser-mapping` warning.
- Static/spec/maintenance gates for Wave 4: `npm.cmd run typecheck`, targeted `npx.cmd oxlint`, targeted `npx.cmd oxfmt --check`, `git diff --check`, `node scripts/maintenance/scan-maintenance.mjs --scope=... --limit=120`, `npm.cmd run maintain:scan:gate`, `node scripts/qc/validate-openspec-ci-quality.mjs`, and `openspec.cmd validate add-playable-command-screens --strict` passed; scoped maintenance found 0 critical/high findings and only 2 info-level file-bloat advisories.
- UI/UX evaluation for campaign customizer handoff: Mech Bay and mission readiness expose refit affordances where the player already evaluates blockers; the customizer gains a compact campaign refit command bar instead of a modal detour; invalid edits are blocked before commit with tab-level repair links; save/cancel returns to the originating campaign screen with result/refit id context while free-build customizer sessions stay separate.
- 2026-06-30 Wave 5 campaign starmap logistics slice: added named starmap travel rules, pure route/cascade preview generation, preview-gated travel commit, map system annotations, and command-surface lenses for route status, risk, market quality, contracts, deadlines, repair progress, medical roster caveats, daily costs, travel fees, projected funds, and arrival date.
- Starmap state proof: `previewTravelToSystem(...)` does not mutate campaign state, `travelToSystem(...)` only commits ready previews, and the commit applies destination, arrival date, activity log, finance ledger, travel fee transaction, daily progression processors, and generated travel events from one validated preview path.
- Browser E2E proof: `npm.cmd run test:e2e -- e2e/campaign-starmap-logistics.spec.ts` passed 4 projects / 4 tests (`chromium`, `Mobile Chrome`, `Tablet Portrait`, `Tablet Landscape`) and validates destination selection, ready preview, 10-jump / 72-day Luthien route, travel fees, high-risk lens, approval, persisted destination/date/funds/activity/transaction after reload.
- Focused Wave 5 regression proof: `npm.cmd test -- --watchAll=false --runTestsByPath src/lib/starmap/__tests__/starmapTravelPreview.test.ts src/stores/campaign/__tests__/useCampaignStore.travelToSystem.test.ts --runInBand` passed 2 suites / 14 tests; Jest still reports the pre-existing stale `baseline-browser-mapping` warning.
- Final Wave 5 static/spec/maintenance gates: `npm.cmd run typecheck`, targeted `npx.cmd oxlint`, targeted `npx.cmd oxfmt --check`, `git diff --check`, `node scripts/maintenance/scan-maintenance.mjs --scope=... --limit=120`, `npm.cmd run maintain:scan:gate`, `node scripts/qc/validate-openspec-ci-quality.mjs`, and `openspec.cmd validate add-playable-command-screens --strict` passed; scoped maintenance found 0 critical/high findings and only 4 info-level file-bloat advisories.
- UI/UX evaluation for starmap logistics: the map remains the spatial command layer while the side command strip explains the route consequences; destination selection avoids precision-click friction; approval stays disabled for blocked or same-system travel; route legs, fees, dates, funds, repair progress, deadlines, market/risk/faction context, and blockers are visible before commitment without relying on color alone.
