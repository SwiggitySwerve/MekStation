import { expect, test } from '@playwright/test';

import { createTestCampaign, deleteCampaign } from './fixtures/campaign';

test.describe('GM campaign ledger control plane @gm-ledger', () => {
  test('previews, approves, and redacts a merchant reversal', async ({
    page,
  }) => {
    let campaignId = '';

    await page.goto('/gameplay/campaigns', { waitUntil: 'domcontentloaded' });
    campaignId = await createTestCampaign(page, {
      name: 'GM Ledger Browser Proof',
      cBills: 1_000_000,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });

      await expect(page.getByTestId('page-title')).toContainText('GM Ledger');
      await expect(page.getByTestId('gm-ledger-balance')).toContainText(
        '1,000,000.00 C-bills',
      );

      await page.getByTestId('gm-ledger-preview-btn').click();
      await expect(page.getByTestId('gm-ledger-preview-status')).toContainText(
        'ready',
      );
      await expect(
        page.getByTestId('gm-ledger-preview-net-effect'),
      ).toContainText(
        '1,000,000.00 C-bills -> 997,500.00 C-bills (-2,500.00 C-bills)',
      );

      await page.getByTestId('gm-ledger-approve-btn').click();

      await expect(page.getByTestId('gm-ledger-approval-status')).toContainText(
        'Approved and applied',
      );
      await expect(page.getByTestId('gm-ledger-balance')).toContainText(
        '997,500.00 C-bills',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).toContainText(
        'Merchant charge corrected by -2,500.00 C-bills.',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).not.toContainText(
        /Hidden campaign|black-market|GM-only/i,
      );
      await expect(page.getByTestId('gm-ledger-private-log')).toContainText(
        'Hidden campaign merchant reversal',
      );
    } finally {
      if (campaignId) {
        await deleteCampaign(page, campaignId);
      }
    }
  });

  test('blocks conflicted cascades until the GM takes manual control', async ({
    page,
  }) => {
    let campaignId = '';

    await page.goto('/gameplay/campaigns', { waitUntil: 'domcontentloaded' });
    campaignId = await createTestCampaign(page, {
      name: 'GM Ledger Manual Proof',
      cBills: 1_000_000,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });

      await page.getByTestId('gm-ledger-conflict-preview-btn').click();
      await expect(page.getByTestId('gm-ledger-preview-status')).toContainText(
        'requires-manual-takeover',
      );
      await expect(page.getByTestId('gm-ledger-approve-btn')).toBeDisabled();
      await page.getByTestId('gm-ledger-manual-btn').click();

      await expect(page.getByTestId('gm-ledger-manual-status')).toContainText(
        'no campaign state changed',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).toContainText(
        'No campaign state changed',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).not.toContainText(
        /Hidden campaign|black-market|GM-only/i,
      );
      await expect(page.getByTestId('gm-ledger-private-log')).toContainText(
        'Manual takeover selected',
      );
    } finally {
      if (campaignId) {
        await deleteCampaign(page, campaignId);
      }
    }
  });
});
