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
