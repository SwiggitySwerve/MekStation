# Tasks: ux-audit-remediation

## 1. Campaign economy bootstrap (C2)

- [x] 1.1 Add positive `startingFunds` to CASUAL/STANDARD/FULL preset overrides in the preset definitions module (placeholder constants, single module, tuning comment); update preset unit tests
- [x] 1.2 Make the creation wizard submit path pass `applyPreset(campaignType, preset)` output (including `startingFunds`) into `createCampaign` (`CreateCampaignPage.submit.ts`); assert dashboard balance equals preset funds in a unit test
- [x] 1.3 Add a deterministic base-pay formula (per-type rate x duration multiplier) to contract offer generation so every generated offer has `basePayment > 0`; unit test over all 19 AtB types
- [x] 1.4 Fix salvage-rights display to derive from `salvagePercent` (0 -> "None", otherwise the percentage; never "None (43%)"); unit test the formatter

## 2. Wizard roster persistence (M1)

- [x] 2.1 Investigate where wizard `initRoster` pilots land vs where dashboard Force Snapshot and mission readiness read (roster store vs campaign personnel); document the root cause in the PR description
  - Root cause for PR description: wizard submit correctly initialized `useCampaignRosterStore`, but `useCampaignDashboardSummary` still counted deleted legacy `campaign.personnel` and `campaign.forces.size` instead of roster-store pilots/units, so Force Snapshot read 0 pilots even after roster persistence succeeded; mission readiness already read the roster projection and only needed submit-time lone-pilot assignment normalization.
- [x] 2.2 Fix persistence/read path so wizard pilots appear in Force Snapshot counts and launch readiness; unit test: wizard submit with 1 unit + 1 pilot -> snapshot reports 1 pilot
- [x] 2.3 Auto-assign a lone wizard pilot to a lone wizard unit at submit; unit test both the auto-assign case and the multi-unit explicit-assignment case (warning preserved)

## 3. Mission launch affordance (C1)

- [x] 3.1 Add a "Launch" action (Next Link) to ACTIVE mission cards on `src/pages/gameplay/campaigns/[id]/missions.tsx` routing to `/gameplay/campaigns/<id>/missions/<missionId>/launch`; hide for non-launchable statuses; component test for both statuses
- [x] 3.2 Extend UX walkthrough journey 06 to reach the launch page through the new card action instead of direct `goto` (e2e/ux-walkthrough-audit.spec.ts)

## 4. Auto-resolve outcome integrity (C3)

- [x] 4.1 Reproduce and root-cause `runToCompletion` ending after 1 turn with reason `turn_limit` (turn-loop exit condition, recon-objective adjudication, or stalemate mislabel); document findings
  - Root cause for PR description: `GameEngine.runToCompletion` ended sessions by stamping `GameEnded` directly (`destruction` for any in-loop terminal state, `turn_limit` after loop exhaustion) instead of reusing `calculateGameOutcome`; the shared calculator already guarded `turn_limit` behind `state.turn >= config.turnLimit`, but the terminal event/report path bypassed that guard.
- [x] 4.2 Fix the engine so `turn_limit` is only reported when the executed turn count reached the configured limit, and early termination carries its true reason (new reason member if needed — check `IGameOutcome.reason` type and the GameEventType QC-pin ripple)
- [x] 4.3 Make `IGameOutcome` statistics (turnsPlayed, losses, damage) derive from the session record; unit tests for elimination, genuine turn-limit, and early-termination outcomes
- [x] 4.4 Run the combat/BV jest suites and `qc:scenarios` to confirm no combat-math regressions
  - Evidence: `npx.cmd jest battleValue equipmentBV bv --runInBand` passed 31 suites / 506 tests; full `npm.cmd run qc:scenarios` passed 12 scenarios / 37 checks / 0 required failures in `.sisyphus/evidence/qc-scenarios/major-capability-scenarios-2026-07-04T21-19-48-571Z.json`; post-UX generated-evidence MC-12 rerun passed 1 scenario / 3 checks / 0 required failures.

## 5. Quick-game results presentation (C3/M5)

- [x] 5.1 Results banner: render verdict reason with turn context ("Turn limit reached (N/limit)") sourced from the outcome record; component test asserting banner matches Battle Statistics
- [x] 5.2 Fix Key Moments initial visibility: render first moment(s) before the "show more" affordance; explicit empty message when no moments; component tests for 0 and 4 moments

## 6. Player-first navigation (M2/M3)

- [x] 6.1 Add a Gameplay card to the dashboard nav cards (`src/pages/index.tsx`) linking to `/gameplay`; component test
- [x] 6.2 Reorder `/gameplay` so player navigation cards render above the flow shell (`src/pages/gameplay/index.tsx`)
- [x] 6.3 Gate `GameplayFlowShell` to development/QC contexts (`NODE_ENV === 'development'` or `NEXT_PUBLIC_E2E_MODE === 'true'`); verify `qc:ui-flow-shell:validate` and the e2e specs asserting `gameplay-flow-shell` testids stay green (Playwright webServer sets `NEXT_PUBLIC_E2E_MODE=true`)

## 7. Equipment catalog link semantics (M4)

- [x] 7.1 Replace the table-row `onClick` + `window.location.href` in `EquipmentViews.tsx` with a stretched Next Link on the Name cell (row as positioning context); remove the handler; keep hover styling
- [x] 7.2 Component tests: table row renders an anchor with the detail href; keyboard Enter on the link navigates; grid/list views still render anchors

## 8. Verification

- [x] 8.1 Build, lint, and full jest pass (new files add zero lint findings)
  - Evidence: `npm.cmd run build` passed with standalone hydration `ok: true`; `npm.cmd run typecheck -- --pretty false` passed; `npm.cmd run lint` passed with warnings only; `npm.cmd run format:check` passed; `npm.cmd run test:stable` passed 2168 suites / 30491 tests.
- [x] 8.2 Re-run `npm run qc:ux-audit`; confirm journey 04 shows a coherent verdict, journey 06 launches through the UI, and the run manifest records no console errors; attach the run folder path to the PR
  - Evidence: `npm.cmd run qc:ux-audit` passed 7 journeys / 58 steps / 0 failed / 0 steps with console errors in `.sisyphus/evidence/ux-walkthrough/2026-07-04T15-43-57`; journey 04 reached outcome and replay tabs; journey 06 reached the mission launch screen through the mission-card Launch link.
- [x] 8.3 Verify each delta-spec scenario has a covering test; update the walkthrough REVIEW conventions if journey steps changed
  - Evidence: scenario coverage is locked by focused unit/component tests, `e2e/ux-walkthrough-audit.spec.ts`, `scripts/qc/run-ux-walkthrough.mjs`, `scripts/__tests__/maintenance-warning-ledger.test.ts`, and the full scenario evidence above; this run writes `manifest.json` plus `index.html` review artifacts, so no separate `REVIEW.md` update was required.
