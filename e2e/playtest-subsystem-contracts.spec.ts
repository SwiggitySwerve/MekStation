/**
 * Wave 6.1.C Track A — Contract Market subsystem validation
 *
 * Validates that the Contract Market surface at
 * /gameplay/campaigns/[id]/contract-market mounts and renders the
 * contract-market-grid. The seeded contract-market flow exercises the
 * accept action wire-up.
 *
 * @tags @game @smoke @playtest @subsystem-validation @contracts
 */

import { test, expect } from '@playwright/test';

import { createTestCampaign, deleteCampaign } from './fixtures/campaign';
import { gotoWithRetry } from './helpers/navigation';

test.setTimeout(120_000);

test.describe('Wave 6.1.C — Contract Market subsystem', () => {
  test('contract market grid renders with auto-seeded offers', async ({
    page,
  }) => {
    await page.goto('/gameplay/campaigns');
    await page.waitForLoadState('domcontentloaded');

    const campaignId = await createTestCampaign(page, {
      name: 'Subsystem Contracts',
    });

    try {
      // The page auto-seeds a deterministic 5-offer market on first open
      // when `contractMarket === undefined` (`generateAtBContracts` with
      // fixed count, contract-market.tsx:63-72). Manual seeding via
      // page-evaluate is NOT possible for this surface: offers are full
      // IContract records whose `paymentTerms.basePayment` must be a
      // live Money instance (`OfferCard` calls `.format()` on it).
      await gotoWithRetry(
        page,
        `/gameplay/campaigns/${campaignId}/contract-market`,
      );

      const grid = page.getByTestId('contract-market-grid');
      await expect(
        grid,
        'contract market grid SHALL render with auto-seeded offers',
      ).toBeVisible({ timeout: 10_000 });

      // The auto-seed mints exactly 5 offers — assert at least one card
      // actually rendered (the grid alone could be an empty container).
      await expect(
        page.locator('[data-testid^="offer-card-"]').first(),
      ).toBeVisible();
    } finally {
      await deleteCampaign(page, campaignId);
    }
  });
});
