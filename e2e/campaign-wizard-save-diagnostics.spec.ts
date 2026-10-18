import { expect, test } from '@playwright/test';

import { createCampaignViaWizard } from './helpers/campaignFlow';
import { createSilentStepRecorder } from './helpers/seamCampaign';

test('campaign wizard reports the failed create PUT before dashboard assertions @campaign', async ({
  page,
}) => {
  await page.route('**/api/campaigns/*', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    await route.fulfill({
      status: 404,
      contentType: 'text/plain',
      body: 'route unavailable: diagnostic sentinel',
    });
  });
  await expect(
    createCampaignViaWizard(createSilentStepRecorder(page), page, {
      name: `Save diagnostics ${Date.now()}`,
      description: 'Failed-save diagnostic proof',
    }),
  ).rejects.toThrow(
    /Campaign create save failed: PUT .* returned 404\nroute unavailable: diagnostic sentinel/,
  );
  await expect(page).toHaveURL(/\/gameplay\/campaigns\/create$/);
});
