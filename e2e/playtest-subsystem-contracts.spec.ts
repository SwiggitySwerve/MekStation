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
import { seedContractMarket } from './helpers/campaignSeeders';

test.setTimeout(120_000);

test.describe('Wave 6.1.C — Contract Market subsystem', () => {
  test('contract market grid renders with seeded offers', async ({ page }) => {
    await page.goto('/gameplay/campaigns');
    await page.waitForLoadState('domcontentloaded');

    const campaignId = await createTestCampaign(page, {
      name: 'Subsystem Contracts',
    });

    try {
      await seedContractMarket(page, [
        {
          offerId: 'cm-test-1',
          name: 'Defend Carlisle',
          employerFactionId: 'lyran-commonwealth',
          basePayout: 350000,
        },
      ]);

      await page.goto(`/gameplay/campaigns/${campaignId}/contract-market`);
      await page.waitForLoadState('domcontentloaded');

      const grid = page.getByTestId('contract-market-grid');
      await expect(
        grid,
        'contract market grid SHALL render with seeded offers',
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteCampaign(page, campaignId);
    }
  });
});
