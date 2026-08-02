import { createHash } from 'node:crypto';

export const RECEIPT_SCHEMA = 'camp01-authority-receipt/v1';
// prettier-ignore
export const REPOSITORY_IDENTITY = deepFreeze({ repositoryId: 1014984218, nodeId: 'R_kgDOPH9uGg', nameWithOwner: 'SwiggitySwerve/MekStation', baseRef: 'main', fetchUrl: 'https://github.com/SwiggitySwerve/MekStation.git' });

const DATA = JSON.parse(String.raw`{
  "programChildChanges":["add-camp01-authority-receipts","bind-packaged-server-to-loopback","add-campaign-roster-source-readiness","add-authoritative-campaign-coop-snapshot","authorize-campaign-coop-participation","enforce-campaign-unit-source-launch-boundary","add-saved-custom-unit-campaign-picker","persist-saved-custom-unit-campaign-creation","resolve-saved-custom-units-in-mech-bay","prove-saved-custom-unit-campaign-journey"],
  "captureContracts":{"camp-01e":[{"invocationId":"camp-01e-picker-browser","commandSequenceIndex":1,"artifactPaths":["desktop.png","mobile-390x844.png"]}],"camp-01h":[{"invocationId":"01-ux-audit-deep","commandSequenceIndex":0,"artifactPaths":["desktop.png","mobile-390x844.png"]}]},
  "proof02Reporters":[{"invocationId":"proof-02-command-browser","producerId":"scripts/playwright/run-playwright.mjs","reporterId":"playwright-json/v1","reportSchema":"camp01-proof02-reproduction/v1","normalizedPath":"proof02-reproduction.json","sourceIds":["e2e/campaign-starmap-logistics.spec.ts","e2e/campaign-customizer-handoff.spec.ts","e2e/gm-campaign-ledger-control-plane.spec.ts"],"requiredTestIds":["e2e/campaign-starmap-logistics.spec.ts::campaign starmap logistics::previews, approves, and reloads campaign travel consequences","e2e/gm-campaign-ledger-control-plane.spec.ts::GM campaign ledger control plane @gm-ledger::guest direct route shows only player-safe ledger projection","e2e/gm-campaign-ledger-control-plane.spec.ts::GM campaign ledger control plane @gm-ledger::saves and reloads a player-safe merchant reversal from the server campaign list"],"allowedStatuses":["passed","failed","missing"],"minimumObservedTests":1,"completeObservationSet":true}],
  "fReporters":[{"invocationId":"camp-01f-persistence-browser","producerId":"scripts/playwright/run-playwright.mjs","reporterId":"camp01-campaign-persistence-reporter/v1","reportSchema":"camp01-campaign-persistence-authority/v1","normalizedPath":"reports/campaign-persistence-authority.json","sourceIds":["e2e/campaign-customizer-handoff.spec.ts"],"requiredTestIds":["e2e/campaign-customizer-handoff.spec.ts::campaign customizer handoff @campaign @customizer::creates a saved custom unit campaign through accepted server persistence"],"allowedStatuses":["passed"],"minimumObservedTests":1,"completeObservationSet":true}],
  "gReporters":[{"invocationId":"camp-01g-mech-bay-browser","producerId":"scripts/playwright/run-playwright.mjs","reporterId":"camp01-mech-bay-authority-reporter/v1","reportSchema":"camp01-mech-bay-authority/v1","normalizedPath":"reports/mech-bay-authority.json","sourceIds":["e2e/campaign-customizer-handoff.spec.ts"],"requiredTestIds":["e2e/campaign-customizer-handoff.spec.ts::campaign customizer handoff @campaign @customizer::cold reloads a saved custom unit into Mech Bay without source substitution"],"allowedStatuses":["passed"],"minimumObservedTests":1,"completeObservationSet":true}],
  "hReporters":[
    {"invocationId":"01-ux-audit-deep","producerId":"scripts/qc/run-ux-walkthrough.mjs","reporterId":"ux-walkthrough-manifest/v1","reportSchema":"camp01-ux-audit-report/v1","normalizedPath":"reports/01-ux-audit-deep.json","sourceIds":["e2e/ux-deep-play-audit.spec.ts"],"requiredTestIds":[],"allowedStatuses":["passed","failed","missing"],"minimumObservedTests":1,"completeObservationSet":true,"witnessLabel":"campaign-mech-bay-readiness"},
    {"invocationId":"02-command-browser-quick","producerId":"scripts/playwright/run-playwright.mjs","reporterId":"playwright-json/v1","reportSchema":"camp01-normalized-test-report/v1","normalizedPath":"reports/02-command-browser-quick.json","sourceIds":["e2e/campaign-starmap-logistics.spec.ts","e2e/campaign-customizer-handoff.spec.ts","e2e/gm-campaign-ledger-control-plane.spec.ts"],"requiredTestIds":["e2e/campaign-starmap-logistics.spec.ts::campaign starmap logistics::previews, approves, and reloads campaign travel consequences","e2e/gm-campaign-ledger-control-plane.spec.ts::GM campaign ledger control plane @gm-ledger::guest direct route shows only player-safe ledger projection","e2e/gm-campaign-ledger-control-plane.spec.ts::GM campaign ledger control plane @gm-ledger::saves and reloads a player-safe merchant reversal from the server campaign list"],"allowedStatuses":["passed","failed","missing"],"minimumObservedTests":1,"completeObservationSet":true,"witnessLabel":"custom-save-reload"},
    {"invocationId":"03-campaign-long-browser","producerId":"scripts/playwright/run-playwright.mjs","reporterId":"playwright-json/v1","reportSchema":"camp01-normalized-test-report/v1","normalizedPath":"reports/03-campaign-long-browser.json","sourceIds":["e2e/campaign-long-browser-signoff.spec.ts"],"requiredTestIds":[],"allowedStatuses":["passed","failed","missing"],"minimumObservedTests":1,"completeObservationSet":true,"witnessLabel":"canonical-combat-post-battle"},
    {"invocationId":"04-screen-inventory","producerId":"scripts/playwright/run-playwright.mjs","reporterId":"playwright-json/v1","reportSchema":"camp01-normalized-test-report/v1","normalizedPath":"reports/04-screen-inventory.json","sourceIds":["e2e/layout-sweep/screenInventory.guard.spec.ts"],"requiredTestIds":[],"allowedStatuses":["passed","failed","missing"],"minimumObservedTests":1,"completeObservationSet":true,"witnessLabel":"custom-save-reload"},
    {"invocationId":"05-layout-helpers","producerId":"scripts/playwright/run-playwright.mjs","reporterId":"playwright-json/v1","reportSchema":"camp01-normalized-test-report/v1","normalizedPath":"reports/05-layout-helpers.json","sourceIds":["e2e/layout-sweep/layout-helpers.selftest.spec.ts"],"requiredTestIds":[],"allowedStatuses":["passed","failed","missing"],"minimumObservedTests":1,"completeObservationSet":true,"witnessLabel":"campaign-mech-bay-readiness"},
    {"invocationId":"06-viewport-layout-sweep","producerId":"scripts/playwright/run-playwright.mjs","reporterId":"playwright-json/v1","reportSchema":"camp01-normalized-test-report/v1","normalizedPath":"reports/06-viewport-layout-sweep.json","sourceIds":["e2e/layout-sweep/viewport-layout-sweep.spec.ts"],"requiredTestIds":[],"allowedStatuses":["passed","failed","missing"],"minimumObservedTests":1,"completeObservationSet":true,"witnessLabel":"canonical-combat-post-battle"}
  ],
  "hArtifacts":["command-result.json","receipt-manifest.json","wave-result.json","session-authority-map.json","combat-authority.json","proof02-triage.json","proof02-repairs.json","desktop.png","mobile-390x844.png","audit-reconciliation.json","reports/01-ux-audit-deep.json","reports/02-command-browser-quick.json","reports/03-campaign-long-browser.json","reports/04-screen-inventory.json","reports/05-layout-helpers.json","reports/06-viewport-layout-sweep.json","witnesses/custom-save-reload/authority.json","witnesses/custom-save-reload/experience.json","witnesses/campaign-mech-bay-readiness/authority.json","witnesses/campaign-mech-bay-readiness/experience.json","witnesses/canonical-combat-post-battle/authority.json","witnesses/canonical-combat-post-battle/experience.json"],
  "hAssertions":["routeSequenceMatched===true","apiIdentityMatched===true","storeIdentityMatched===true","persistenceIdentityMatched===true","reloadIdentityMatched===true","customLaunchBlockedWithoutSideEffect===true","canonicalSelectionLaunched===true","serverSessionIdentityMatched===true","combatCommandVisible===true","combatCommandAccepted===true","sessionNavigationReloadMatched===true","terminalResultObserved===true","postBattlePersistenceAccepted===true","postBattleReloadMatched===true","threeSessionWitnessCount===3","threeSessionWitnessIdsUnique===true","threeSessionExecutionIdsUnique===true","threeSessionContextIdsUnique===true","threeSessionReportDigestsDisjoint===true","customSaveReloadSessionAuthorityMapped===true","campaignReadinessSessionAuthorityMapped===true","combatPostBattleSessionAuthorityMapped===true","desktopInspected===true","mobileInspected===true","accessibilityReviewed===true","visibilityReviewed===true","feedbackReviewed===true","recoveryReviewed===true","cognitiveLoadReviewed===true","playabilityReviewed===true","enjoymentReviewed===true","positiveObservationsRecorded>=1","auditBacklogSeverityRanked===true","auditObservationSetReconciled===true","auditCriticalMajorDispositioned===true","hRequiredRepairsVerified===true","hExternalBlockersExplicit===true","commandBrowserObservedCount>=1","commandBrowserFailureCount===0","developmentMimeRegressionCovered===true","guestBadgeRegressionCovered===true","saveConflictRegressionCovered===true","proof02TriageSetMatched===true","proof02RequiredRepairsVerified===true","proof02ExternalBlockersExplicit===true","proof02LowerSeverityRanked===true"],
  "waves":{
    "camp-proof":{"wave":"camp-proof","commandId":"camp-proof","childChange":"add-camp01-authority-receipts","runRootTemplate":".sisyphus/evidence/playtest/camp-proof-<sha>","bootstrapProductRef":"refs/heads/codex/implement-camp01-authority-receipts","commandSequence":[["@npm","test","--","--watchAll=false","--runTestsByPath","scripts/__tests__/camp01-authority-receipt-qc.test.ts","--runInBand"]],"canonicalArgvDigest":"68e44c6b37134fb790026e615b26ddda39fb68cbf49921be33e1d1a1bd4d48a0","artifacts":["command-result.json","receipt-manifest.json","wave-result.json"],"assertions":["unknownFieldsRejected===true","missingFieldsRejected===true","headShaMatched===true","pathShaMatched===true","inputDigestsMatched===true","exactMainRegenerated===true"],"predecessors":[],"capSubject":"product-pr","maxFiles":15,"maxChangedLines":500,"reporterContracts":[]},
    "proof-02-reproduction":{"wave":"proof-02-reproduction","commandId":"proof-02-reproduction","childChange":"add-camp01-authority-receipts","runRootTemplate":".sisyphus/evidence/playtest/proof02-reproduction-<sha>","commandSequence":[["@npm","run","qc:command:browser:quick"]],"canonicalArgvDigest":"5326e9ef772870a3691dcfd6168851b3def278db08dd7e2d4d64d989f04aaba7","artifacts":["command-result.json","receipt-manifest.json","proof02-reproduction.json"],"assertions":["completeObservationSet===true","anchorStatesPublished===true","unexpectedFailuresPublished===true"],"predecessors":["camp-proof"],"capSubject":"none","maxFiles":null,"maxChangedLines":null,"reporterContracts":[]},
    "proof-02-triage":{"wave":"proof-02-triage","commandId":"proof-02-triage","childChange":"add-camp01-authority-receipts","runRootTemplate":".sisyphus/evidence/playtest/proof02-triage-<sha>","commandSequence":[],"canonicalArgvDigest":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945","artifacts":["command-result.json","receipt-manifest.json","proof02-triage.json"],"assertions":["observationSetMatched===true","outcomeFieldsValid===true","auditProvenanceValid===true"],"predecessors":["proof-02-reproduction"],"capSubject":"audit-pr","maxFiles":5,"maxChangedLines":300,"reporterContracts":[]},
    "camp-00":{"wave":"camp-00","commandId":"camp-00","childChange":"bind-packaged-server-to-loopback","runRootTemplate":".sisyphus/evidence/playtest/camp00-loopback-<sha>","commandSequence":[["@npm","run","validate:multiplayer:packaged-socket"]],"canonicalArgvDigest":"8e4005d9f13011f8229bbd457d23a9297a1fc17f0d843c70a1da4bb37c04a501","artifacts":["command-result.json","receipt-manifest.json","listener-result.json","wave-result.json"],"assertions":["boundAddressIsLoopback===true","expectedAddressMatched===true","unspecifiedAddressRejected===true","initialHostnameOmitted===true","restartHostnameExplicitLoopback===true","packagedModeEnvironmentIndependent===true","ipv4UnspecifiedRejected===true","ipv6UnspecifiedRejected===true","ipv6LoopbackRejected===true","hostnameMatrixPassed===true","rejectedBeforeNextPrepare===true","standalonePreparedInArtifactDir===true","packagedSocketJourneyPassed===true","observationNoReplaceFinalized===true","observationStableAcrossReads===true","runtimeOutputRemoved===true","portReusableAfterEachChild===true"],"predecessors":["proof-02-triage","proof-02-required-repairs"],"capSubject":"product-pr","maxFiles":4,"maxChangedLines":180,"reporterContracts":[]},
    "camp-01a":{"wave":"camp-01a","commandId":"camp-01a","childChange":"add-campaign-roster-source-readiness","runRootTemplate":".sisyphus/evidence/playtest/camp01a-catalog-<sha>","commandSequence":[["@npm","test","--","--watchAll=false","--runTestsByPath","src/types/campaign/__tests__/RosterUnitSource.test.ts","src/lib/campaign/readiness/__tests__/missionReadinessProjection.test.ts","src/lib/campaign/encounter/__tests__/materializeCampaignMissionEncounter.test.ts","--runInBand"]],"canonicalArgvDigest":"5c08026e8fa784f59f4744cfa7faf163908634eb4b7f7da658f343a0d8fc5eca","artifacts":["command-result.json","receipt-manifest.json","wave-result.json"],"assertions":["legacySourceResolvedCanonical===true","unknownSourceRejected===true","canonicalExactRefResolved===true","blockerPresent===true","encounterLookupCount===0","reuseResultCount===0","routeCallCount===0","mutationCount===0","downgradeRejected===true"],"predecessors":["camp-00"],"capSubject":"product-pr","maxFiles":10,"maxChangedLines":400,"reporterContracts":[]},
    "camp-01b":{"wave":"camp-01b","commandId":"camp-01b","childChange":"add-authoritative-campaign-coop-snapshot","runRootTemplate":".sisyphus/evidence/playtest/camp01b-snapshot-<sha>","commandSequence":[["@npm","test","--","--watchAll=false","--runTestsByPath","src/types/campaign/__tests__/CampaignSync.test.ts","src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx","src/lib/multiplayer/server/__tests__/CampaignHostRegistry.test.ts","src/lib/campaign/sync/__tests__/sharedCampaignState.integration.test.ts","--runInBand"],["@npm","run","verify:qc:coop-campaign-journey"]],"canonicalArgvDigest":"8ace8ae2a924103218b629d757de23f771cbf0da4f60bae4390ca284580d9bcd","artifacts":["command-result.json","receipt-manifest.json","wave-result.json"],"assertions":["campaignIdMatched===true","matchIdMatched===true","revisionMatched===true","forceMembershipMatched===true","sourceIdentityMatched===true","guestMirrorHydrated===true"],"predecessors":["camp-01a"],"capSubject":"product-pr","maxFiles":14,"maxChangedLines":480,"reporterContracts":[]},
    "camp-01c":{"wave":"camp-01c","commandId":"camp-01c","childChange":"authorize-campaign-coop-participation","runRootTemplate":".sisyphus/evidence/playtest/camp01c-participation-<sha>","commandSequence":[["@npm","test","--","--watchAll=false","--runTestsByPath","src/types/multiplayer/__tests__/Protocol.test.ts","src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.test.ts","src/lib/campaign/coop/__tests__/coopRuntimeSession.test.ts","--runInBand"],["@npm","run","verify:qc:coop-campaign-journey"]],"canonicalArgvDigest":"4ebd9923861982f9f37151156a072e40c6f4bf58238d09a7d8fd96b0349885d1","artifacts":["command-result.json","receipt-manifest.json","wave-result.json"],"assertions":["serverPlayerDerived===true","serverRoleDerived===true","authorizedChoiceAccepted===true","fullForceRejected===true","forgedIdentityRejected===true","foreignForceRejected===true","staleRevisionRejected===true"],"predecessors":["camp-01b"],"capSubject":"product-pr","maxFiles":12,"maxChangedLines":450,"reporterContracts":[]},
    "camp-01d":{"wave":"camp-01d","commandId":"camp-01d","childChange":"enforce-campaign-unit-source-launch-boundary","runRootTemplate":".sisyphus/evidence/playtest/camp01d-launch-<sha>","commandSequence":[["@npm","test","--","--watchAll=false","--runTestsByPath","src/lib/campaign/fastForward/__tests__/fastForwardCombatRunner.test.ts","src/components/gameplay/pages/campaigns/dashboard/__tests__/CampaignDashboardPage.reactivity.test.tsx","src/lib/campaign/coop/__tests__/launchCoopMission.test.ts","--runInBand"],["@npm","run","qc:command:readiness-stable:quick"],["@npm","run","verify:qc:coop-campaign-journey"]],"canonicalArgvDigest":"cb3ee9a647e27ee3436be604511a3d529fc4f8bdfdb132716381f159d98a54f5","artifacts":["command-result.json","receipt-manifest.json","wave-result.json"],"assertions":["catalogReady===true","canonicalSelection.launchSucceeded===true","canonicalSelection.launchEncounterCount===1","blockedSelection.encounterLookupCount===0","blockedSelection.reuseResultCount===0","blockedSelection.createEncounterCount===0","blockedSelection.launchEncounterCount===0"],"predecessors":["camp-01c"],"capSubject":"product-pr","maxFiles":12,"maxChangedLines":450,"reporterContracts":[]},
    "camp-01e":{"wave":"camp-01e","commandId":"camp-01e","childChange":"add-saved-custom-unit-campaign-picker","runRootTemplate":".sisyphus/evidence/playtest/camp01e-picker-<sha>","commandSequence":[["@npm","test","--","--watchAll=false","--runTestsByPath","src/components/gameplay/pages/campaigns/create/__tests__/savedCustomUnitCampaignAdapter.test.ts","src/components/gameplay/pages/campaigns/create/__tests__/CreateCampaignPage.RosterStep.test.tsx","src/components/gameplay/pages/campaigns/create/__tests__/CreateCampaignPage.rosterPersistence.test.ts","--runInBand"],["@node","scripts/playwright/run-playwright.mjs","test","--project=chromium","e2e/campaign-customizer-handoff.spec.ts","--workers=1"]],"canonicalArgvDigest":"052993da0c60c14d2af410f61c15eb44ea6d3eba85644d9a0beb0069f16c828b","artifacts":["command-result.json","receipt-manifest.json","wave-result.json","desktop.png","mobile-390x844.png"],"assertions":["savedDesignIdPresent===true","rosterInstanceIdPresent===true","unitRefMatched===true","unitSourceCustom===true","rootForceContainsInstance===true","programmaticNamesPresent===true","narrowViewportUsable===true"],"predecessors":["camp-01d"],"capSubject":"product-pr","maxFiles":10,"maxChangedLines":450,"reporterContracts":[]},
    "camp-01f":{"wave":"camp-01f","commandId":"camp-01f","childChange":"persist-saved-custom-unit-campaign-creation","runRootTemplate":".sisyphus/evidence/playtest/camp01f-persistence-<sha>","commandSequence":[["@npm","test","--","--watchAll=false","--runTestsByPath","src/components/gameplay/pages/campaigns/create/__tests__/CreateCampaignPage.submitPersistence.test.tsx","src/stores/campaign/__tests__/useCampaignPersistenceStore.test.ts","--runInBand"],["@node","scripts/playwright/run-playwright.mjs","test","--project=chromium","e2e/campaign-customizer-handoff.spec.ts","--workers=1"]],"canonicalArgvDigest":"b0708546b48ed3c1355f813c2d3e9d0ac6dbdadb7734dd60ae26a600899c30ef","artifacts":["command-result.json","receipt-manifest.json","wave-result.json","reports/campaign-persistence-authority.json"],"assertions":["requestMethodPut===true","responseAccepted===true","campaignIdMatched===true","rosterInstanceIdPresent===true","unitRefMatched===true","unitSourceCustom===true","rootForceContainsInstance===true","constructionPayloadAbsent===true","successSuppressedOnFailure===true","sameIdRetried===true","conflictSameIdRetried===true","conflictOverwritePrevented===true"],"predecessors":["camp-01e"],"capSubject":"product-pr","maxFiles":8,"maxChangedLines":400,"reporterContracts":[]},
    "camp-01g":{"wave":"camp-01g","commandId":"camp-01g","childChange":"resolve-saved-custom-units-in-mech-bay","runRootTemplate":".sisyphus/evidence/playtest/camp01g-mech-bay-<sha>","commandSequence":[["@npm","test","--","--watchAll=false","--runTestsByPath","src/components/campaign/bays/__tests__/MechBay.test.tsx","--runInBand"],["@npm","run","qc:command:readiness-stable:quick"],["@node","scripts/playwright/run-playwright.mjs","test","--project=chromium","e2e/campaign-customizer-handoff.spec.ts","--workers=1"]],"canonicalArgvDigest":"ae3582f0603a9028613a874859974617281750628e33e71080a70c308bfc105f","artifacts":["command-result.json","receipt-manifest.json","wave-result.json","reports/mech-bay-authority.json"],"assertions":["coldReloaded===true","rosterInstanceIdPresent===true","unitRefMatched===true","unitSourceCustom===true","cachedNamePreserved===true","tonnagePreserved===true","bvAvailabilityHonest===true","unresolvedSourceVisible===true"],"predecessors":["camp-01f"],"capSubject":"product-pr","maxFiles":7,"maxChangedLines":350,"reporterContracts":[]},
    "camp-01h":{"wave":"camp-01h","commandId":"camp-01h","childChange":"prove-saved-custom-unit-campaign-journey","runRootTemplate":".sisyphus/evidence/playtest/camp01h-journey-<sha>","commandSequence":[["@npm","run","qc:ux-audit:deep"],["@npm","run","qc:command:browser:quick"],["@npm","run","qc:campaign-long:browser"],["@node","scripts/playwright/run-playwright.mjs","test","--project=chromium","e2e/layout-sweep/screenInventory.guard.spec.ts","--workers=1"],["@node","scripts/playwright/run-playwright.mjs","test","--project=chromium","e2e/layout-sweep/layout-helpers.selftest.spec.ts","--workers=1"],["@node","scripts/playwright/run-playwright.mjs","test","--project=chromium","e2e/layout-sweep/viewport-layout-sweep.spec.ts","--workers=1"]],"canonicalArgvDigest":"d6855f61d03fc0c2bfc56c2f1dc38a227093e4fd3b01e3706749f2cf3c3d2d1a","artifacts":[],"assertions":[],"predecessors":["camp-01g","proof-02-triage","proof-02-required-repairs","camp-01h-required-repairs"],"capSubject":"product-pr","maxFiles":5,"maxChangedLines":300,"reporterContracts":[]}
  }
}`);

DATA.waves['proof-02-reproduction'].reporterContracts = DATA.proof02Reporters;
DATA.waves['camp-01f'].reporterContracts = DATA.fReporters;
DATA.waves['camp-01g'].reporterContracts = DATA.gReporters;
Object.assign(DATA.waves['camp-01h'], {
  artifacts: DATA.hArtifacts,
  assertions: DATA.hAssertions,
  reporterContracts: DATA.hReporters,
});
deepFreeze(DATA);

export const PROGRAM_CHILD_CHANGES = DATA.programChildChanges;
export const CAPTURE_CONTRACTS = DATA.captureContracts;
export const WAVE_CONTRACTS = DATA.waves;

// prettier-ignore
const ROW_KEYS = new Set(['wave', 'commandId', 'childChange', 'runRootTemplate', 'bootstrapProductRef', 'commandSequence', 'canonicalArgvDigest', 'artifacts', 'assertions', 'predecessors', 'sourceDisposition', 'capSubject', 'maxFiles', 'maxChangedLines', 'reporterContracts']);
// prettier-ignore
const REPORTER_KEYS = new Set(['invocationId', 'producerId', 'reporterId', 'reportSchema', 'normalizedPath', 'witnessLabel', 'sourceIds', 'requiredTestIds', 'allowedStatuses', 'minimumObservedTests', 'completeObservationSet']);
// prettier-ignore
const DISPOSITION_KEYS = ['receiptId', 'observationId', 'failedReportObservationId', 'failedReportFingerprint', 'causeFingerprint'];
// prettier-ignore
const REPAIR_ROW_KEYS = ['wave', 'commandId', 'childChange', 'runRootTemplate', 'commandSequence', 'canonicalArgvDigest', 'artifacts', 'assertions', 'predecessors', 'sourceDisposition', 'capSubject', 'maxFiles', 'maxChangedLines', 'reporterContracts'];
// prettier-ignore
const PROOF_CAUSE_KEYS = ['observationId', 'causeFingerprint', 'severity', 'outcome', 'primaryObservationId'];
// prettier-ignore
const H_CAUSE_KEYS = ['findingId', 'backlogRank', 'causeFingerprint', 'severity', 'outcome', 'primaryFindingId'];
const DANGEROUS_ARG = /^(?:&&|\|\||[&|;<>])$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const PROVENANCE_ID = /^(?:pr|review|receipt|tuple)-[0-9a-f]{16,64}$/;
const SAFE_FIELD_DENYLIST =
  /^(?:argv|environment|environmentValues|localPath|errorText|stack|reporterPayload|credentials|rawId)$/i;
const PRIVACY_SCHEMA_KEYS = deepFreeze({ 'camp01-privacy-probe/v1': ['safe'] });

// prettier-ignore
export function commandSequenceDigest(commandSequence) {
  return createHash('sha256').update(JSON.stringify(commandSequence)).digest('hex');
}
// prettier-ignore
export function contractSnapshot() {
  return JSON.parse(JSON.stringify({ receiptSchema: RECEIPT_SCHEMA, repositoryIdentity: REPOSITORY_IDENTITY, programChildChanges: PROGRAM_CHILD_CHANGES, captureContracts: CAPTURE_CONTRACTS, waveContracts: WAVE_CONTRACTS }));
}

// prettier-ignore
export function assertFixedContract(candidate) {
  exactKeys(candidate, ['receiptSchema', 'repositoryIdentity', 'programChildChanges', 'captureContracts', 'waveContracts'], 'contract');
  if (candidate.receiptSchema !== RECEIPT_SCHEMA) fail('receipt schema drift');
  for (const [id, row] of Object.entries(candidate.waveContracts ?? {})) assertWaveRow(id, row);
  if (JSON.stringify(candidate) !== JSON.stringify(contractSnapshot())) fail('fixed contract drift');
  return true;
}

// prettier-ignore
export function assertWaveRow(id, row) {
  exactAllowedKeys(row, ROW_KEYS, 'wave row');
  if (row.wave !== id || row.commandId !== id) fail('wave identity drift');
  if (!/^\.sisyphus\/evidence\/playtest\/[a-z0-9-]+-<sha>$/.test(row.runRootTemplate)) fail('invalid run root');
  if (!Array.isArray(row.commandSequence)) fail('invalid command sequence');
  for (const argv of row.commandSequence) {
    if (!Array.isArray(argv) || !['@node', '@npm'].includes(argv[0])) fail('invalid executable token');
    if (argv.some((part) => typeof part !== 'string' || DANGEROUS_ARG.test(part))) fail('unsafe command argument');
  }
  if (commandSequenceDigest(row.commandSequence) !== row.canonicalArgvDigest) fail('command digest drift');
  for (const field of ['artifacts', 'assertions', 'predecessors']) if (!Array.isArray(row[field]) || row[field].some((value) => !validBoundedId(value))) fail(`invalid ${field}`);
  if (!Array.isArray(row.reporterContracts)) fail('invalid reporterContracts');
  for (const reporter of row.reporterContracts) assertReporter(reporter);
  const ownsPr = row.capSubject === 'product-pr' || row.capSubject === 'audit-pr';
  if (!ownsPr && row.capSubject !== 'none') fail('invalid cap subject');
  if (ownsPr !== validCap(row.maxFiles, 15) || ownsPr !== validCap(row.maxChangedLines, 500)) fail('invalid caps');
  return true;
}

// prettier-ignore
export function assertRepairDeclaration(declaration, source) {
  exactKeys(declaration, ['schema', 'row'], 'repair declaration');
  if (declaration.schema !== 'camp01-repair-row/v1') fail('repair schema drift');
  exactKeys(source, ['kind', 'childChange', 'causeFingerprint', 'sourceDisposition', 'reporterContracts', 'explicitDependencies'], 'repair source');
  const cause = source.causeFingerprint?.replace(/^sha256:/, '');
  if (!HEX64.test(cause ?? '')) fail('invalid repair cause');
  const prefix = source.kind === 'proof' ? 'proof-02-repair' : source.kind === 'h' ? 'camp-01h-repair' : fail('invalid repair kind');
  const id = `${prefix}-${cause}`;
  const row = declaration.row;
  exactKeys(row, REPAIR_ROW_KEYS, 'repair row');
  assertWaveRow(id, row);
  if (row.childChange !== source.childChange || row.runRootTemplate !== `.sisyphus/evidence/playtest/${prefix}-${cause}-<sha>`) fail('repair identity drift');
  const base = source.kind === 'proof' ? ['proof-02-triage'] : ['camp-01g', 'proof-02-triage', 'proof-02-required-repairs'];
  if (JSON.stringify(row.predecessors) !== JSON.stringify([...base, ...source.explicitDependencies])) fail('repair predecessor drift');
  if (row.capSubject !== 'product-pr' || JSON.stringify(row.artifacts) !== JSON.stringify(['command-result.json', 'receipt-manifest.json', 'wave-result.json'])) fail('invalid repair ownership');
  if (JSON.stringify(row.sourceDisposition) !== JSON.stringify(source.sourceDisposition) || JSON.stringify(row.reporterContracts) !== JSON.stringify(source.reporterContracts)) fail('repair source drift');
  exactKeys(row.sourceDisposition, DISPOSITION_KEYS, 'source disposition');
  const disposition = row.sourceDisposition;
  const failedPair = disposition.failedReportObservationId === null && disposition.failedReportFingerprint === null || validBoundedId(disposition.failedReportObservationId) && DIGEST.test(disposition.failedReportFingerprint);
  if (!PROVENANCE_ID.test(disposition.receiptId) || !validBoundedId(disposition.observationId) || !failedPair || disposition.causeFingerprint !== source.causeFingerprint) fail('invalid repair provenance');
  if (row.commandSequence.length === 0 || row.assertions.length === 0) fail('untargeted repair');
  return `${JSON.stringify(declaration)}\n`;
}

// prettier-ignore
export function assertProofCauseGraph(dispositions) {
  return assertCauseGraph(dispositions, { id: 'observationId', primary: 'primaryObservationId', rank: null, phase: 'proof', keys: PROOF_CAUSE_KEYS });
}

// prettier-ignore
export function assertHCauseGraph(findings, phase) {
  if (!['observation', 'final'].includes(phase)) fail('invalid H phase');
  return assertCauseGraph(findings, { id: 'findingId', primary: 'primaryFindingId', rank: 'backlogRank', phase, keys: H_CAUSE_KEYS });
}

// prettier-ignore
export function assertPrivacyBounded(value, schema) {
  const allowed = PRIVACY_SCHEMA_KEYS[schema];
  if (!allowed) fail('unknown privacy schema');
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid privacy root');
  walk(value, (key, entry) => {
    if (!allowed.includes(key) || SAFE_FIELD_DENYLIST.test(key)) fail(`unsafe retained field: ${key}`);
    if (typeof entry === 'string' && /^(?:[A-Za-z]:[\\/]|\/|\\\\|~[\\/])|-----BEGIN |(?:gh[pousr]_|github_pat_|Bearer\s+|sk-)/i.test(entry)) fail('unsafe retained value');
  });
  return true;
}

// prettier-ignore
function assertCauseGraph(entries, fields) {
  if (!Array.isArray(entries) || entries.length === 0) fail('empty cause graph');
  for (const entry of entries) {
    exactKeys(entry, fields.keys, 'cause entry');
    if (!validBoundedId(entry[fields.id]) || !['critical', 'major', 'minor', 'low'].includes(entry.severity)) fail('invalid cause entry');
    if (fields.rank !== null && (!Number.isInteger(entry[fields.rank]) || entry[fields.rank] < 1)) fail('invalid cause rank');
  }
  if (new Set(entries.map((entry) => entry[fields.id])).size !== entries.length) fail('duplicate cause id');
  for (const group of Map.groupBy(entries, (entry) => entry.causeFingerprint).values()) {
    if (!DIGEST.test(group[0].causeFingerprint)) fail('invalid cause fingerprint');
    const ordered = [...group].sort((left, right) => fields.rank === null ? left[fields.id].localeCompare(right[fields.id]) : left[fields.rank] - right[fields.rank] || left[fields.id].localeCompare(right[fields.id]));
    const root = ordered[0];
    const roots = group.filter((entry) => entry[fields.primary] === null);
    if (roots.length !== 1 || roots[0][fields.id] !== root[fields.id]) fail('invalid cause root');
    const severity = ['low', 'minor', 'major', 'critical'].reduce((maximum, value) => group.some((entry) => entry.severity === value) ? value : maximum, 'low');
    if (root.severity !== severity) fail('cause root severity drift');
    const high = severity === 'critical' || severity === 'major';
    const outcomes = fields.phase === 'observation' ? ['repair-required', 'external-blocker', 'lower-severity'] : fields.phase === 'final' ? high ? ['verified-repair', 'external-blocker'] : ['lower-severity'] : high ? ['repair-required', 'external-blocker'] : ['lower-severity'];
    if (!outcomes.includes(root.outcome)) fail('nonterminal cause root');
    for (const alias of group.filter((entry) => entry !== root)) if (alias[fields.primary] !== root[fields.id] || alias.outcome !== 'not-distinct-cause') fail('invalid cause alias');
  }
  return true;
}

// prettier-ignore
function assertReporter(reporter) {
  exactAllowedKeys(reporter, REPORTER_KEYS, 'reporter');
  for (const field of ['invocationId', 'producerId', 'reporterId', 'reportSchema', 'normalizedPath']) if (!validBoundedId(reporter[field])) fail('invalid reporter identity');
  for (const field of ['sourceIds', 'allowedStatuses']) if (!Array.isArray(reporter[field]) || reporter[field].length === 0 || reporter[field].some((value) => !validBoundedId(value))) fail(`invalid reporter ${field}`);
  if (reporter.requiredTestIds !== undefined && (!Array.isArray(reporter.requiredTestIds) || reporter.requiredTestIds.some((value) => !validBoundedId(value)))) fail('invalid reporter tests'); if (reporter.witnessLabel !== undefined && !validBoundedId(reporter.witnessLabel)) fail('invalid reporter witness'); if (typeof reporter.completeObservationSet !== 'boolean') fail('invalid reporter completeness');
  if (!Number.isInteger(reporter.minimumObservedTests) || reporter.minimumObservedTests < 1) fail('invalid reporter minimum');
}

// prettier-ignore
function exactKeys(value, expected, label) {
  if (JSON.stringify(Object.keys(value ?? {})) !== JSON.stringify(expected)) fail(`${label} fields drift`);
}

// prettier-ignore
function exactAllowedKeys(value, allowed, label) {
  if (!value || Object.keys(value).some((key) => !allowed.has(key))) fail(`${label} has unknown fields`);
}

function validCap(value, maximum) {
  return Number.isInteger(value) && value > 0 && value <= maximum;
}
function validBoundedId(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 512 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function walk(value, visit) {
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    visit(key, entry);
    walk(entry, visit);
  }
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function fail(message) {
  throw new Error(`CAMP01_CONTRACT_INVALID: ${message}`);
}

assertFixedContract(contractSnapshot());
