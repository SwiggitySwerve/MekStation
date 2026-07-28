import { expect, test } from '@playwright/test';

import { deleteCampaign } from './fixtures/campaign';
import { createUniqueSeamCampaign } from './helpers/seamCampaign';

test.describe('Campaign wizard force reconciliation', () => {
  test('shows the selected roster unit on the dashboard and forces route', async ({
    page,
  }) => {
    const campaign = await createUniqueSeamCampaign(page, {
      namePrefix: 'Force Reconciliation',
      rosterSize: 1,
    });

    try {
      await expect(page.getByTestId('force-snapshot-mech-count')).toHaveText(
        '1 mechs',
      );

      await page.getByTestId('force-snapshot-mech-count').click();
      await expect(page).toHaveURL(
        new RegExp(`/gameplay/campaigns/${campaign.campaignId}/forces$`),
      );
      await expect(page.getByText('1 units', { exact: true })).toBeVisible();
    } finally {
      await deleteCampaign(page, campaign.campaignId).catch(() => undefined);
    }
  });
});
