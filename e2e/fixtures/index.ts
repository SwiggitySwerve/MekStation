/**
 * E2E Test Fixtures - Test Data Factories
 *
 * This module provides factory functions for creating test data
 * in E2E tests via Playwright. All factories interact with Zustand
 * stores exposed on `window.__ZUSTAND_STORES__`.
 *
 * @example
 * ```typescript
 * import { test, expect } from '@playwright/test';
 * import {
 *   createTestCampaign,
 *   createTestForce,
 *   createTestPilot,
 *   createTestEncounter,
 * } from './fixtures';
 *
 * test('create a full battle setup', async ({ page }) => {
 *   await page.goto('/');
 *
 *   // Create pilots
 *   const pilotId = await createTestPilot(page, {
 *     name: 'John Smith',
 *     callsign: 'Maverick',
 *   });
 *
 *   // Create forces
 *   const forceId = await createTestForce(page, {
 *     name: 'Alpha Lance',
 *     forceType: 'lance',
 *   });
 *
 *   // Create campaign
 *   const campaignId = await createTestCampaign(page, {
 *     name: 'Iron Warriors',
 *     pilotIds: [pilotId!],
 *   });
 *
 *   // Create encounter
 *   const encounterId = await createTestEncounter(page, {
 *     name: 'Training Mission',
 *     template: 'skirmish',
 *   });
 *
 *   expect(campaignId).toBeTruthy();
 * });
 * ```
 *
 * @module e2e/fixtures
 */

// Campaign fixtures
export {
  createTestCampaign,
  createCampaignWithRoster,
  createMinimalCampaign,
  getCampaign,
  deleteCampaign,
  type TestCampaignOptions,
} from './campaign';

// Force fixtures
export {
  createTestForce,
  createTestLance,
  createTestStar,
  createTestCompany,
  getForce,
  assignPilotAndUnit,
  clearAssignment,
  cloneForce,
  deleteForce,
  type TestForceOptions,
  type TestAssignment,
  type ForceType,
  type ForcePosition,
} from './force';

// Pilot fixtures
export {
  createTestPilot,
  createGreenPilot,
  createRegularPilot,
  createVeteranPilot,
  createElitePilot,
  createMultiplePilots,
  createLancePilots,
  getPilot,
  deletePilot,
  PILOT_SKILL_PRESETS,
  type TestPilotOptions,
  type TestPilotSkills,
  type PilotType,
} from './pilot';

// Encounter fixtures
export {
  createTestEncounter,
  createDuelEncounter,
  createSkirmishEncounter,
  createBattleEncounter,
  createEncounterWithForces,
  getEncounter,
  setEncounterMapConfig,
  launchEncounter,
  deleteEncounter,
  type TestEncounterOptions,
  type TestEncounterFullOptions,
  type TestMapConfig,
  type ScenarioTemplateType,
  type TerrainPreset,
  type DeploymentZone,
} from './encounter';

// Game fixtures
export {
  waitForGameplayStoreReady,
  createDemoSession,
  getGameSession,
  getGameplayState,
  selectUnit,
  setTarget,
  handleAction,
  toggleWeapon,
  resetGameplay,
  getSelectedUnitId,
  DEMO_UNITS,
  DEMO_INITIAL_STATE,
  type GamePhase,
  type GameStatus,
  type GameSide,
  type E2EUnitGameState,
  type E2EGameSession,
  type E2EGameplayState,
} from './game';

// Repair fixtures
export {
  initializeRepairStore,
  getRepairJobs,
  getRepairJob,
  selectRepairJob,
  startRepairJob,
  cancelRepairJob,
  toggleRepairItem,
  getSelectedJobId,
  type TestRepairJobOptions,
  type TestRepairItemOptions,
} from './repair';

// Customizer fixtures
export {
  waitForTabManagerStoreReady,
  createMechUnit,
  createAerospaceUnit,
  createVehicleUnit,
  createOmniMechUnit,
  getActiveTabId,
  getOpenTabs,
  closeTab,
  selectTab,
  getAerospaceState,
  getVehicleState,
  getMechState,
  getOmniMechState,
  setUnitIsOmni,
  resetOmniChassis,
  setBaseChassisHeatSinks,
  type CreateAerospaceOptions,
  type CreateMechOptions,
  type CreateVehicleOptions,
  type CreateOmniMechOptions,
} from './customizer';
