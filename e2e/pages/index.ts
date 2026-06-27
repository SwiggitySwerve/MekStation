/**
 * E2E Page Objects
 *
 * This module exports all page object classes for E2E testing.
 * Page objects encapsulate page interactions and provide a clean API
 * for writing maintainable tests.
 *
 * @example
 * ```typescript
 * import { CampaignListPage, CampaignListReadPage } from './pages';
 *
 * test('view campaigns', async ({ page }) => {
 *   const listPage = new CampaignListPage(page);
 *   const listReadPage = new CampaignListReadPage(page);
 *   await listPage.navigate();
 *
 *   const names = await listReadPage.getCampaignNames();
 *   expect(names).toContain('My Campaign');
 * });
 * ```
 */

// Base page
export { BasePage } from './base.page';

// Campaign pages
export {
  CampaignCreatePage,
  CampaignListPage,
  CampaignListReadPage,
} from './campaign.page';

// Force pages
export {
  ForceCreatePage,
  ForceCreateReadPage,
  ForceCreateSubmissionPage,
  ForceDetailPage,
  ForceListPage,
  ForceListReadPage,
} from './force.page';

// Encounter pages
export {
  EncounterListPage,
  EncounterDetailPage,
  EncounterCreatePage,
} from './encounter.page';

// Customizer pages
export { CustomizerPage, AerospaceCustomizerPage } from './customizer.page';

// Compendium pages
export {
  CompendiumPage,
  EquipmentBrowserPage,
  EquipmentBrowserReadPage,
  UnitBrowserPage,
  UnitBrowserReadPage,
} from './compendium.page';

// Repair pages
export { RepairBayPage } from './repair.page';
