/**
 * E2E Test Helpers
 *
 * Barrel export for all shared E2E test utilities.
 *
 * @example
 * ```typescript
 * import {
 *   navigateTo,
 *   navigateToCompendium,
 *   waitForPageReady,
 *   waitForListItems,
 *   resetStores,
 *   getStoreState,
 * } from './helpers';
 * ```
 */

// Navigation helpers
export {
  navigateTo,
  navigateToCampaigns,
  navigateToEncounters,
  navigateToForces,
  navigateToPilots,
  navigateToGames,
  navigateToCompendium,
  navigateToCustomizer,
} from './navigation';

// Wait/assertion utilities
export {
  waitForPageReady,
  waitForListItems,
  waitForToast,
  waitForModalClosed,
  waitForLoading,
  waitForConnectionState,
  waitForText,
} from './wait';

// Store interaction utilities
export {
  resetStores,
  getStoreState,
  isStoreExposed,
  setStoreValue,
  waitForStoreState,
} from './store';

// Browser diagnostics
export {
  formatBrowserDiagnosticEvents,
  installBrowserDiagnostics,
  isFatalBrowserDiagnosticEvent,
  shouldCaptureRequestFailure,
  withBrowserDiagnostics,
  type BrowserDiagnosticEvent,
  type BrowserDiagnostics,
} from './browserDiagnostics';

// Campaign UI flow sequences
export {
  acceptContractAndOpenLaunch,
  CAMPAIGN_ROSTER_SIZE,
  createCampaignViaWizard,
  launchMissionToPreBattle,
  type CampaignFlowRecorder,
  type CampaignResult,
  type CampaignWizardOptions,
  type ContractAcceptOptions,
  type MissionLaunchObservation,
  type MissionLaunchOptions,
  type MissionLaunchResult,
} from './campaignFlow';

// Match-log IndexedDB seeding (recovery-rehydration seam trust anchor)
export {
  buildGameCreatedAndStartedEvents,
  seedMatchLog,
  type BuildSeededEventsOptions,
  type SeededGameEvent,
  type SeededGameSide,
  type SeededGameUnit,
  type SeededMatchesRowFields,
  type SeededMatchStatus,
} from './matchLogSeeding';

// Roster-materialization-handoff seam trust anchor helpers
export {
  addMirroredCanonicalRefRosterUnits,
  createSeamMaterializedRowTracker,
  createSilentStepRecorder,
  createUniqueSeamCampaign,
  createUniqueSeamCampaignWithMirroredRoster,
  deleteSeamMaterializedRows,
  launchSelectedRosterToPreBattle,
  openSeamMissionLaunchBriefing,
  selectAllRosterUnits,
  type MirroredRosterCampaignOptions,
  type SeamCampaignOptions,
  type SeamLaunchResult,
  type SeamMaterializedRowIds,
} from './seamCampaign';
