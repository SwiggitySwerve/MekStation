/**
 * E2E Page Objects
 *
 * This module exports all page object classes for E2E testing.
 * Page objects encapsulate page interactions and provide a clean API
 * for writing maintainable tests.
 *
 * @example
 * ```typescript
 * import { CampaignListPage, CampaignDetailPage } from './pages';
 *
 * test('view campaign details', async ({ page }) => {
 *   const listPage = new CampaignListPage(page);
 *   await listPage.navigate();
 *   await listPage.clickCampaignCard('campaign-123');
 *
 *   const detailPage = new CampaignDetailPage(page);
 *   const name = await detailPage.getName();
 *   expect(name).toBe('My Campaign');
 * });
 * ```
 */

// Base page
export { BasePage } from './base.page';

// Campaign pages
export {
  CampaignListPage,
  CampaignDetailPage,
  CampaignCreatePage,
} from './campaign.page';

// Force pages
export { ForceListPage, ForceDetailPage, ForceCreatePage } from './force.page';

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
  UnitBrowserPage,
  EquipmentBrowserPage,
  RulesReferencePage,
  UnitDetailPage,
  EquipmentDetailPage,
} from './compendium.page';
