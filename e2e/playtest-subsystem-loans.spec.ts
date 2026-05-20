/**
 * Wave 6.1.C Track A — Loans + Interest subsystem validation
 *
 * Validates that the Finances surface at /gameplay/campaigns/[id]/finances
 * mounts and renders the take-loan form. The full take-loan write flow
 * is mid-effort because the existing audit confirmed the form testids
 * (`take-loan-form`, `loan-submit`) without depending on a state seed.
 *
 * @tags @game @smoke @playtest @subsystem-validation @loans
 */

import { test, expect } from '@playwright/test';

import { createTestCampaign, deleteCampaign } from './fixtures/campaign';

test.setTimeout(120_000);

test.describe('Wave 6.1.C — Loans subsystem', () => {
  test('finances page renders take-loan form', async ({ page }) => {
    await page.goto('/gameplay/campaigns');
    await page.waitForLoadState('domcontentloaded');

    const campaignId = await createTestCampaign(page, {
      name: 'Subsystem Loans',
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/finances`);
      await page.waitForLoadState('domcontentloaded');

      // The audit confirmed `take-loan-form` is the primary output
      // testid on FinancesPanel. The spec asserts visibility — the
      // full submit-and-assert-balance round-trip is a Wave 6.1.C
      // polish follow-up once the seeded test campaign's balance
      // type round-trips cleanly through the assertion layer.
      const form = page.getByTestId('take-loan-form');
      await expect(form, 'take-loan form SHALL render').toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await deleteCampaign(page, campaignId);
    }
  });
});
