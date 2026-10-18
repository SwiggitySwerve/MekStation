# Maintenance gate triage — 2026-10-18

## Scope and evidence

Baseline: `origin/main` at `c962217ba54d3179897918cd234058bf1d9dc298`.
This inventory records the original B1 scans before the repair-bay fixture fix.
It is triage, not a claim that these findings have been remediated or that the
maintenance gate passes. No scanner, baseline, ledger, or protected-path code
changes are included in this triage deliverable.

Commands executed from the isolated B1 worktree with Node 22.22.0:

- `node scripts/qc/machine-idle.mjs --own-pid 47516`: `MACHINE_IDLE`.
- `npm run verify:qc:maintenance`: QC registry passed (27 surfaces, zero
  errors/warnings); `maintain:scan:gate` failed with 76 critical/high findings
  against the reviewed zero baseline (11 aggregate/category regressions).
- `node scripts/qc/validate-maintenance-warning-ledger.mjs`: failed with
  `tracked=54 untracked=48 errors=48`. It was invoked separately because the
  first scanner failure stops the chained gate before the ledger command.

Local raw evidence: `b1-maintenance-before.log` and `b1-ledger-before.log` in
`E:/Projects/Personal/MekStation-wt/backlog-b1-maintenance-gate-20261018/`.
These ignored run logs are not generated source indexes. Every finding below
is transcribed from those runs; scanner IDs S01–S76 preserve scanner order,
and ledger IDs L01–L48 preserve ledger order. Findings appearing in both are
listed in both inventories; 124 entries does not mean 124 distinct defects.
Ledger finding identities omit line numbers. TODO ages are those reported at
scan time and will change with time; re-run before making ledger decisions.

Scanner totals by category: code-smell 8, complexity 33, design-violation 20,
file-bloat 5, dead-code 1, type-safety 9 (76 total).

## Nightly repair-bay root cause

The distinct scheduled `Subsystem Lane (maintenance)` runs Playwright specs
selected by `@subsystem:maintenance`; it is not the code-health scanner.
[Run 39033900424](https://github.com/SwiggitySwerve/MekStation/actions/runs/39033900424/job/117399826983)
failed both repair-bay parity tests at campaign PUT with HTTP 500:
`campaign genesis failed: Roster unit ff-roster-unit-1 is in more than one force`.
Both failures were reproduced locally against the unmodified committed pack,
using the repository Playwright runner, one worker, port 3618, and webpack
(`IS_WEBPACK_TEST=1`) because Turbopack rejects the local dependency junction.
No test timeout was increased.

This is invalid generated seed data, not duplicate assignment during reload:
`buildCombatTeamsAndForces` cycled four roster unit IDs across eight forces,
so forces 1 and 5 already claimed unit 1 in the checked-in JSON before PUT.
The server's non-protected `campaignSourceGenesis.ts` correctly enforces
exclusive roster membership. The same data defect affected the economy pack.
The fix allocates a distinct roster unit and pilot per team while reusing
canonical catalog designs, and regenerates both affected packs through
`scripts/qc/mint-scenario-pack.mjs`. The minter also needs isolated persisted
child stores: resetting only singleton objects allowed an eight-team run's
forces to leak into a later one-team economy mint with the same campaign ID.
Regression coverage checks distinct assignments, fresh mint admission to the
production genesis projection, persisted mint isolation, and the actual
campaign PUT route for both committed packs. The protected reducer is unchanged.

## Classification and recommended order

Group (a) is restricted by the parent brief and belongs to the in-flight
co-op roadmap work; exact human/lane ownership is not inferred from file names.
Coordinate the listed functions with that owner before changing them.
Group (b) covers bounded test/tooling cleanup, comment calibration, and narrow
DOM typing improvements; it is a recommendation to validate semantics first,
not permission to blanket-suppress scanner categories. Group (c) needs an
explicit responsibility/interface/type-boundary refactor and behavioral proof.

1. Land the repaired seed generator and regenerated packs with API and browser
   regression proof first. Do not weaken valid genesis membership checks.
2. Address group (b): historical `plan todo`/resolved `workaround` references
   need wording or token calibration; Preserve meaningful unresolved TODOs; audit-capture and P2P
   entries are real deferred tests and remain in group (c). Extract named test helpers for nesting/argument findings;
   review test-double interfaces before changing class-method diagnostics.
   Make the best-effort appearance bootstrap catch explicit without changing
   behavior. Use an appropriate DOM element/window contract for print casts.
   Inspect duplicate script windows and share genuinely identical loaders.
3. Ask the co-op roadmap owner to handle group (a), including transport message
   dispatch, offer registration, launch orchestration, and transport module size.
4. Refactor group (c) in narrow domain slices: runtime-validated type boundaries
   first; campaign journal/delivery/history privacy and authoritative host
   dispatch next; durable storage/module splits after that; UI/construction
   complexity and script module size last. Resolve audit-capture screenshot
   baseline ownership and implement the missing P2P transport proof rather than
   deleting the FIXME comments on skipped tests. Preserve replay, visibility, branch,
   delivery and admission contracts, with focused tests owned by each slice.
5. Re-run both scanners after each slice. Record acceptance/follow-up only with
   rationale and current evidence; do not raise the zero critical/high baseline
   or add unexplained ledger entries merely to obtain green output.

Group totals: scanner (a) 3, (b) 12, (c) 61; ledger (a) 1, (b) 15,
(c) 32. The larger code-health refactor is deferred by the parent ruling. The following
inventories deliberately retain all original findings, including test doubles
and likely comment-token false positives, so none disappear through triage.

## Scanner inventory (76 critical/high findings)

### (a) Protected path; in-flight roadmap owner — 3

- **S03** `complexity` / critical — `src/lib/campaign/coop/campaignSyncTransport.ts:443`: &lt;anonymous&gt; complexity 34.
- **S26** `complexity` / high — `src/lib/campaign/coop/campaignSyncTransport.ts:266`: registerOffer complexity 22.
- **S27** `complexity` / high — `src/lib/campaign/coop/launchCoopMission.ts:109`: launchCoopMission complexity 21.

### (b) Safe mechanical follow-up after focused verification — 12

- **S01** `code-smell` / critical — `src/__tests__/unit/encoding/mojibakeGuard.test.ts:107`: walk nesting depth 6.
- **S06** `design-violation` / critical — `src/lib/events/journal/__tests__/SQLiteEventJournalTestHarness.ts:14`: class has 8 public methods.
- **S08** `design-violation` / critical — `src/lib/multiplayer/server/history/__tests__/ViewerHistoryService.test.ts:280`: class has 9 public methods.
- **S14** `code-smell` / high — `src/lib/multiplayer/server/__tests__/viewerFrameRawNegativeSweep.test.ts:589`: &lt;anonymous&gt; nesting depth 5.
- **S15** `code-smell` / high — `src/pages-modules/api/__tests__/matchHistoryFog.test.ts:228`: at has 7 parameters.
- **S47** `dead-code` / high — `src/utils/appearanceBootstrap.ts:22`: empty catch block.
- **S59** `design-violation` / high — `src/lib/multiplayer/server/history/__tests__/ViewerHistoryService.test.ts:211`: class has 7 public methods.
- **S60** `design-violation` / high — `src/lib/multiplayer/server/history/__tests__/ViewerHistoryService.test.ts:342`: class has 5 public methods.
- **S61** `design-violation` / high — `src/lib/multiplayer/server/projection/__tests__/ViewerProjectionService.test.ts:123`: class has 7 public methods.
- **S74** `type-safety` / high — `src/services/printing/RecordSheetService.ts:137`: `as unknown as` cast.
- **S75** `type-safety` / high — `src/services/printing/RecordSheetService.ts:191`: `as unknown as` cast.
- **S76** `type-safety` / high — `src/services/printing/svgRecordSheetRenderer/svgGeometry.ts:109`: `as unknown as` cast.

### (c) Needs a real refactor — 61

- **S02** `complexity` / critical — `src/components/quickgame/QuickGamePlay.tsx:104`: QuickGamePlay complexity 33.
- **S04** `complexity` / critical — `src/lib/campaign/encounter/campaignOwnedForceMaterialization.ts:358`: signedMissionForces complexity 31.
- **S05** `complexity` / critical — `src/lib/multiplayer/server/coopMissionAdmission.ts:48`: admitCoopMission complexity 31.
- **S07** `design-violation` / critical — `src/lib/events/journal/SQLiteEventHistoryBranchStore.ts:63`: class has 10 public methods.
- **S09** `file-bloat` / critical — `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:1`: 1459 LOC exceeds standard threshold.
- **S10** `file-bloat` / critical — `src/lib/multiplayer/server/DurableMatchStore.ts:1`: 1394 LOC exceeds standard threshold.
- **S11** `code-smell` / high — `src/components/customizer/critical-slots/DoubleSlotVisualHelpers.ts:33`: getDoubleSlotTitle has 3 boolean parameters.
- **S12** `code-smell` / high — `src/lib/campaign/sync/JournalCampaignEventStore.ts:172`: toAppendEvent has 7 parameters.
- **S13** `code-smell` / high — `src/lib/events/privacy/privateRecordAccess.ts:152`: insertAccessRow has 7 parameters.
- **S16** `code-smell` / high — `src/utils/construction/slotOperations/assignment.ts:21`: createLocationAssignments has 7 parameters.
- **S17** `code-smell` / high — `src/utils/construction/slotOperations/assignment.ts:77`: organizeEquipment has 7 parameters.
- **S18** `complexity` / high — `src/components/campaign/bays/MechBay.tsx:82`: MechBayRow complexity 22.
- **S19** `complexity` / high — `src/components/customizer/armor/variants/BipedArmorSurface.tsx:42`: BipedArmorSurface complexity 30.
- **S20** `complexity` / high — `src/components/customizer/tabs/CriticalSlotsTab.tsx:39`: CriticalSlotsTab complexity 24.
- **S21** `complexity` / high — `src/components/customizer/tabs/useMultiUnitTabsController.dialogs.ts:152`: &lt;anonymous&gt; complexity 24.
- **S22** `complexity` / high — `src/components/multiplayer/GmRewindPreviewDialog.tsx:63`: GmRewindPreviewDialog complexity 30.
- **S23** `complexity` / high — `src/components/settings/DesktopSettingsDialog.advanced.tsx:60`: clearCache complexity 21.
- **S24** `complexity` / high — `src/components/settings/DesktopSettingsDialog.state.ts:211`: &lt;anonymous&gt; complexity 28.
- **S25** `complexity` / high — `src/hooks/gameplay/usePhaseQueueProjection.ts:136`: &lt;anonymous&gt; complexity 22.
- **S28** `complexity` / high — `src/lib/campaign/delivery/projectCampaignStreamForGrant.ts:220`: projectCampaignStreamForGrant complexity 25.
- **S29** `complexity` / high — `src/lib/campaign/sync/campaignPublicAppliedView.ts:196`: &lt;anonymous&gt; complexity 26.
- **S30** `complexity` / high — `src/lib/events/journal/InMemoryEventJournalSnapshot.ts:106`: validateSnapshot complexity 21.
- **S31** `complexity` / high — `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:555`: dispatchCampaignEnvelope complexity 23.
- **S32** `complexity` / high — `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:1133`: handleCampaignJoin complexity 29.
- **S33** `complexity` / high — `src/lib/multiplayer/server/CoopOpponentDriver.ts:72`: driveCoopOpponent complexity 24.
- **S34** `complexity` / high — `src/lib/multiplayer/server/DurableMatchStore.ts:866`: &lt;anonymous&gt; complexity 22.
- **S35** `complexity` / high — `src/lib/multiplayer/server/DurableMatchStore.ts:1278`: &lt;anonymous&gt; complexity 24.
- **S36** `complexity` / high — `src/lib/multiplayer/server/MatchRecovery.ts:158`: recoverActiveMatches complexity 29.
- **S37** `complexity` / high — `src/lib/multiplayer/server/ServerMatchHostEvents.ts:247`: publishEvent complexity 24.
- **S38** `complexity` / high — `src/lib/multiplayer/server/ServerMatchHostIntent.ts:159`: handleIntent complexity 27.
- **S39** `complexity` / high — `src/lib/multiplayer/server/ServerMatchHostJournalAuthority.ts:120`: commitJournalAuthorityCommand complexity 26.
- **S40** `complexity` / high — `src/pages/api/campaigns/[id].ts:177`: handler complexity 27.
- **S41** `complexity` / high — `src/pages/api/campaigns/[id]/commands.ts:119`: handler complexity 21.
- **S42** `complexity` / high — `src/pages/api/campaigns/[id]/replica-sync.ts:123`: handler complexity 23.
- **S43** `complexity` / high — `src/pages/api/matches/[id]/rewind-commit.ts:91`: handler complexity 23.
- **S44** `complexity` / high — `src/stores/campaign/useCampaignPersistenceStore.ts:946`: runLoad complexity 25.
- **S45** `complexity` / high — `src/types/campaign/campaignCoopSnapshot.ts:16`: parseCampaignCoopSnapshot complexity 26.
- **S46** `complexity` / high — `src/utils/construction/slotOperations/topology.ts:18`: getFixedSlotNames complexity 26.
- **S48** `design-violation` / high — `src/hooks/useAutoSaveIndicator.ts:13`: switch statement has 16 cases.
- **S49** `design-violation` / high — `src/lib/campaign/activity/campaignActivityProjection.ts:136`: switch statement has 10 cases.
- **S50** `design-violation` / high — `src/lib/campaign/delivery/projectCampaignStreamForGrant.ts:182`: switch statement has 9 cases.
- **S51** `design-violation` / high — `src/lib/campaign/sync/campaignEventEntityRefs.ts:83`: switch statement has 8 cases.
- **S52** `design-violation` / high — `src/lib/campaign/sync/hostCampaignEventJournal.ts:58`: class has 7 public methods.
- **S53** `design-violation` / high — `src/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore.ts:67`: class has 7 public methods.
- **S54** `design-violation` / high — `src/lib/events/journal/SQLiteEventJournalWriter.ts:43`: class has 6 public methods.
- **S55** `design-violation` / high — `src/lib/events/privacy/privateRecordAccess.ts:36`: class has 5 public methods.
- **S56** `design-violation` / high — `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:574`: switch statement has 10 cases.
- **S57** `design-violation` / high — `src/lib/multiplayer/server/CampaignMatchHostIntent.ts:148`: switch statement has 8 cases.
- **S58** `design-violation` / high — `src/lib/multiplayer/server/delivery/SQLiteDeliveryEpochStore.ts:73`: class has 5 public methods.
- **S62** `design-violation` / high — `src/pages/api/campaigns/[id]/commands.ts:201`: switch statement has 9 cases.
- **S63** `design-violation` / high — `src/services/game-resolution/GameOutcomeCalculator.ts:139`: switch statement has 8 cases.
- **S64** `design-violation` / high — `src/utils/construction/slotOperations/topology.ts:28`: switch statement has 13 cases.
- **S65** `file-bloat` / high — `src/lib/multiplayer/client.ts:1`: 976 LOC exceeds standard threshold.
- **S66** `file-bloat` / high — `src/lib/multiplayer/server/ServerMatchHost.ts:1`: 1056 LOC exceeds standard threshold.
- **S67** `file-bloat` / high — `src/stores/campaign/useCampaignPersistenceStore.ts:1`: 991 LOC exceeds standard threshold.
- **S68** `type-safety` / high — `src/engine/adapters/CompendiumAdapter.ts:227`: `as unknown as` cast.
- **S69** `type-safety` / high — `src/lib/campaign/encounter/requestLaunchAuthority.ts:73`: `as unknown as` cast.
- **S70** `type-safety` / high — `src/lib/campaign/replica/CampaignReplicaSyncClient.ts:185`: `as unknown as` cast.
- **S71** `type-safety` / high — `src/lib/multiplayer/server/projection/FogAwareMatchProjection.ts:146`: `as unknown as` cast.
- **S72** `type-safety` / high — `src/lib/multiplayer/server/projection/FogAwareMatchProjection.ts:265`: `as unknown as` cast.
- **S73** `type-safety` / high — `src/pages/api/campaigns/[id]/replica-sync.ts:215`: `as unknown as` cast.

## Untracked ledger inventory (48 findings)

### (a) Protected path; in-flight roadmap owner — 1

- **L40** `file-bloat` / warn — `src/lib/campaign/coop/campaignSyncTransport.ts`: 661 LOC exceeds standard threshold.

### (b) Safe mechanical follow-up after focused verification — 15

- **L01** `design-violation` / critical — `src/lib/events/journal/__tests__/SQLiteEventJournalTestHarness.ts`: class has 8 public methods.
- **L03** `design-violation` / critical — `src/lib/multiplayer/server/history/__tests__/ViewerHistoryService.test.ts`: class has 9 public methods.
- **L06** `design-violation` / high — `scripts/__tests__/roadmap-codex-review-identity.test.ts`: switch statement has 8 cases.
- **L18** `design-violation` / high — `src/lib/multiplayer/server/history/__tests__/ViewerHistoryService.test.ts`: class has 7 public methods.
- **L19** `design-violation` / high — `src/lib/multiplayer/server/history/__tests__/ViewerHistoryService.test.ts`: class has 5 public methods.
- **L20** `design-violation` / high — `src/lib/multiplayer/server/projection/__tests__/ViewerProjectionService.test.ts`: class has 7 public methods.
- **L30** `stale-todo` / medium — `src/lib/multiplayer/server/__tests__/matchMarkerRetirementRecovery.sqlite.test.ts`: 32 day old TODO-like comment.
- **L31** `stale-todo` / medium — `src/lib/testing/__tests__/faultControlsStartup.test.ts`: 53 day old TODO-like comment.
- **L32** `stale-todo` / medium — `src/lib/testing/faultControls.ts`: 53 day old TODO-like comment.
- **L42** `near-duplicate` / warn — `scripts/accurate-gap-analysis.ts`: 8-line block cluster appears in 29 files.
- **L43** `near-duplicate` / warn — `scripts/analyze-2to5-band.ts`: 8-line block cluster appears in 32 files.
- **L44** `near-duplicate` / warn — `scripts/analyze-def-pattern.ts`: 8-line block cluster appears in 31 files.
- **L45** `near-duplicate` / warn — `scripts/analyze-underc-clusters.ts`: 8-line block cluster appears in 38 files.
- **L46** `near-duplicate` / warn — `scripts/analyze-underc-clusters.ts`: 8-line block cluster appears in 32 files.
- **L47** `near-duplicate` / warn — `scripts/check-defensive-assembly.ts`: 8-line block cluster appears in 28 files.

### (c) Needs a real refactor — 32

- **L02** `design-violation` / critical — `src/lib/events/journal/SQLiteEventHistoryBranchStore.ts `: class has 10 public methods.
- **L04** `file-bloat` / critical — `src/lib/multiplayer/server/bindCampaignSyncConnection.ts`: 1459 LOC exceeds standard threshold.
- **L05** `file-bloat` / critical — `src/lib/multiplayer/server/DurableMatchStore.ts`: 1394 LOC exceeds standard threshold.
- **L07** `design-violation` / high — `src/hooks/useAutoSaveIndicator.ts`: switch statement has 16 cases.
- **L08** `design-violation` / high — `src/lib/campaign/activity/campaignActivityProjection.ts`: switch statement has 10 cases.
- **L09** `design-violation` / high — `src/lib/campaign/delivery/projectCampaignStreamForGrant.ts `: switch statement has 9 cases.
- **L10** `design-violation` / high — `src/lib/campaign/sync/campaignEventEntityRefs.ts`: switch statement has 8 cases.
- **L11** `design-violation` / high — `src/lib/campaign/sync/hostCampaignEventJournal.ts`: class has 7 public methods.
- **L12** `design-violation` / high — `src/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore.ts`: class has 7 public methods.
- **L13** `design-violation` / high — `src/lib/events/journal/SQLiteEventJournalWriter.ts`: class has 6 public methods.
- **L14** `design-violation` / high — `src/lib/events/privacy/privateRecordAccess.ts`: class has 5 public methods.
- **L15** `design-violation` / high — `src/lib/multiplayer/server/bindCampaignSyncConnection.ts`: switch statement has 10 cases.
- **L16** `design-violation` / high — `src/lib/multiplayer/server/CampaignMatchHostIntent.ts`: switch statement has 8 cases.
- **L17** `design-violation` / high — `src/lib/multiplayer/server/delivery/SQLiteDeliveryEpochStore.ts`: class has 5 public methods.
- **L21** `design-violation` / high — `src/pages/api/campaigns/[id]/commands.ts`: switch statement has 9 cases.
- **L22** `design-violation` / high — `src/services/game-resolution/GameOutcomeCalculator.ts`: switch statement has 8 cases.
- **L23** `design-violation` / high — `src/utils/construction/slotOperations/topology.ts`: switch statement has 13 cases.
- **L24** `file-bloat` / high — `scripts/audit-ammo-matching.ts`: 1143 LOC exceeds standard threshold.
- **L25** `file-bloat` / high — `src/lib/multiplayer/client.ts`: 976 LOC exceeds standard threshold.
- **L26** `file-bloat` / high — `src/lib/multiplayer/server/ServerMatchHost.ts`: 1056 LOC exceeds standard threshold.
- **L27** `file-bloat` / high — `src/stores/campaign/useCampaignPersistenceStore.ts`: 991 LOC exceeds standard threshold.
- **L28** `stale-todo` / high — `e2e/audit-capture.spec.ts`: 112 day old TODO-like comment.
- **L29** `stale-todo` / high — `e2e/p2p-sync.spec.ts`: 98 day old TODO-like comment.
- **L33** `design-violation` / warn — `src/lib/campaign/replica/SQLiteCampaignReplicaStore.ts`: value object class has 8 public methods.
- **L34** `design-violation` / warn — `src/lib/events/inMemoryStoreCapabilityPorts.ts`: value object class has 11 public methods.
- **L35** `design-violation` / warn — `src/lib/events/journal/InMemoryEventJournal.ts`: value object class has 11 public methods.
- **L36** `design-violation` / warn — `src/lib/events/privacy/SQLitePrivateRecordRepository.ts`: value object class has 9 public methods.
- **L37** `design-violation` / warn — `src/lib/multiplayer/server/projection/ViewerDeliveryCursors.ts`: value object class has 11 public methods.
- **L38** `file-bloat` / warn — `e2e/helpers/uxWalkthrough.ts`: 624 LOC exceeds standard threshold.
- **L39** `file-bloat` / warn — `scripts/trace-clan-underc.ts`: 621 LOC exceeds standard threshold.
- **L41** `file-bloat` / warn — `src/types/multiplayer/Protocol.ts`: 692 LOC exceeds standard threshold.
- **L48** `near-duplicate` / warn — `src/components/campaign/bays/MedicalBay.tsx`: 8-line block cluster appears in 26 files.

## Validation of the repair-bay fix

- Before the fix: both maintenance parity tests failed with the original HTTP
  500; the added real-PUT regression also reproduced it for both committed packs.
- Both affected packs were regenerated with
  `node scripts/qc/mint-scenario-pack.mjs <pack-id> --selectProjects=unit --cacheDirectory=.tmp/jest-b1-maintenance`.
  Each generator run passed its registered tests and wrote its own payload and
  provenance sidecar. Manifest provenance and schema pins were then aligned
  with the generated files; no generated payload was hand-edited.
- Final focused Jest command (one worker, private cache):
  `npm test -- --selectProjects unit --watchAll=false --runTestsByPath src/__tests__/api/campaigns/campaignPutGenesisRoute.test.ts src/lib/campaign/fastForward/__tests__/fastForwardFixture.test.ts src/lib/scenarioPacks/__tests__/packSchemas.test.ts src/lib/scenarioPacks/__tests__/packStamping.test.ts src/lib/scenarioPacks/__tests__/mintFastForwardPack.test.ts --runInBand --cacheDirectory=.sisyphus/b1-maintenance-cache/jest-b1-maintenance`.
  Result: 5 suites passed, 54 tests passed, 2 gated mint-write tests skipped.
- Final browser command:
  `node scripts/playwright/run-playwright.mjs test --project=chromium e2e/scenario-packs/maintenance-repairbay.parity.spec.ts e2e/scenario-packs/economy-midcampaign.parity.spec.ts e2e/scenario-packs/__tests__/manifest.guard.spec.ts --workers=1`.
  Result: 7 passed in 34.6 seconds, including both maintenance causal controls.
  Environment: `IS_WEBPACK_TEST=1`, `MEKSTATION_E2E_PORT=3618`,
  `MEKSTATION_E2E_SERVER_COMMAND=node server.js`, `PLAYWRIGHT_HTML_OPEN=never`.
  The custom command avoids the default dev script's port-killing helper.
- Application and scripts TypeScript checks passed using TypeScript 7.0.2,
  invoked read-only from the existing
  `E:/Projects/Personal/MekStation-wt/ts7s4b-ts7-20261017/node_modules/typescript7/bin/tsc`.
  The ordinary `npm run typecheck` could not start because the shared root
  dependency installation lacks `typescript7`; no root dependencies were
  changed. Equivalent checks used `--noEmit --skipLibCheck` with a private
  build-info path, and `-p scripts/tsconfig.json --noEmit`, respectively.
- `oxfmt --check` on touched files, repository-configured `oxlint` on touched
  TypeScript files, and `git diff --check` passed. The repository intentionally
  excludes test/e2e files from lint. An extra exploratory lint with those
  exclusions removed found existing test-only hook-name/size/unused-variable
  diagnostics; it was not treated as a repository gate or used to change scope.
- Every heavy run was preceded by
  `node scripts/qc/machine-idle.mjs --own-pid 47516` reporting `MACHINE_IDLE`.
  No unrelated process was killed, no timeout was raised, and no protected
  path or root-checkout file was changed.

Final local logs: `b1-jest-final.log`, `b1-parity-final.log`,
`b1-typecheck-ts7-final.log`, and `b1-typecheck-scripts-ts7.log`.
The code-health scanner findings above remain deferred and must not be
interpreted as fixed.
