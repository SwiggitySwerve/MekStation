import { expect, test, type Page } from '@playwright/test';

import { createTestCampaign, deleteCampaign } from './fixtures/campaign';

test.setTimeout(120_000);

type CampaignTimeState = {
  readonly currentDate: string | null;
  readonly timeCascadeEventCount: number;
};

async function stampGuestCoopSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    type CampaignStoreApi = {
      getState: () => {
        updateCampaign: (updates: Record<string, unknown>) => void;
      };
    };
    type ExposedCampaignStore = CampaignStoreApi | (() => CampaignStoreApi);

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: ExposedCampaignStore;
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error('Campaign store not exposed');
    }

    const exposed = stores.campaign;
    const store = 'getState' in exposed ? exposed : exposed();
    store.getState().updateCampaign({
      coopSession: {
        mode: 'guest',
        roomCode: 'GUESTGM',
        hostMatchId: 'match-gm-ledger-host',
      },
    });
  });
}

async function readCampaignTimeState(page: Page): Promise<CampaignTimeState> {
  return page.evaluate(() => {
    function toIsoDate(value: unknown): string | null {
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
      }
      return null;
    }

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            getState: () => {
              getCampaign?: () => {
                currentDate?: Date | string;
                timeCascadeEvents?: readonly unknown[];
              } | null;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;
    const campaign = stores?.campaign?.getState().getCampaign?.();
    return {
      currentDate: toIsoDate(campaign?.currentDate),
      timeCascadeEventCount: campaign?.timeCascadeEvents?.length ?? 0,
    };
  });
}

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

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('page-title')).toContainText('GM Ledger');
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
        'Merchant charge corrected by -2,500.00 C-bills.',
      );
      await expect(page.getByTestId('gm-ledger-private-log')).not.toContainText(
        /Hidden campaign|black-market|GM-only/i,
      );
    } finally {
      if (campaignId) {
        await deleteCampaign(page, campaignId);
      }
    }
  });

  test('guest direct route shows only player-safe ledger projection', async ({
    page,
  }) => {
    let campaignId = '';

    await page.goto('/gameplay/campaigns', { waitUntil: 'domcontentloaded' });
    campaignId = await createTestCampaign(page, {
      name: 'GM Ledger Guest Direct Proof',
      cBills: 1_000_000,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });
      await page.getByTestId('gm-ledger-preview-btn').click();
      await page.getByTestId('gm-ledger-approve-btn').click();
      await expect(page.getByTestId('gm-ledger-approval-status')).toContainText(
        'Approved and applied',
      );

      await stampGuestCoopSession(page);
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });

      await expect(page.getByTestId('page-title')).toContainText('GM Ledger');
      await expect(page.getByTestId('coop-session-badge')).toContainText(
        'Co-op session: Guest',
      );
      await expect(
        page.getByTestId('gm-ledger-player-only-notice'),
      ).toContainText(
        'GM controls are available only to the campaign owner or co-op host',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).toContainText(
        'Merchant charge corrected by -2,500.00 C-bills.',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).not.toContainText(
        /Hidden campaign|black-market|GM-only|default outcome/i,
      );
      await expect(page.getByTestId('gm-ledger-preview-btn')).toHaveCount(0);
      await expect(page.getByTestId('gm-ledger-approve-btn')).toHaveCount(0);
      await expect(page.getByTestId('gm-ledger-manual-btn')).toHaveCount(0);
      await expect(page.getByTestId('gm-ledger-private-log')).toHaveCount(0);
      await expect(
        page
          .getByRole('navigation', { name: 'Campaign sections' })
          .getByRole('link', { name: 'GM Ledger' }),
      ).toHaveCount(0);
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

  test('previews and approves an accumulated time cascade', async ({
    page,
  }) => {
    let campaignId = '';

    await page.goto('/gameplay/campaigns', { waitUntil: 'domcontentloaded' });
    campaignId = await createTestCampaign(page, {
      name: 'GM Time Cascade Browser Proof',
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

      const initialState = await readCampaignTimeState(page);
      if (!initialState.currentDate) {
        throw new Error(
          'Campaign currentDate did not hydrate before time-cascade preview.',
        );
      }
      const expectedDate = new Date(
        new Date(initialState.currentDate).getTime() + 2 * 24 * 60 * 60 * 1000,
      ).toISOString();

      await page.getByTestId('gm-ledger-time-preview-btn').click();
      await expect(page.getByTestId('gm-ledger-preview-status')).toContainText(
        'ready',
      );
      await expect(
        page.getByTestId('gm-ledger-preview-time-effect'),
      ).toContainText('2 days');

      await page.getByTestId('gm-ledger-approve-btn').click();

      await expect(page.getByTestId('gm-ledger-approval-status')).toContainText(
        'Approved and applied',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).toContainText(
        'Campaign time corrected by 2 days.',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).not.toContainText(
        /Hidden time|Secret employer|GM-only/i,
      );
      await expect(page.getByTestId('gm-ledger-private-log')).toContainText(
        'Hidden time cascade correction',
      );

      await expect
        .poll(async () => readCampaignTimeState(page))
        .toEqual({
          currentDate: expectedDate,
          timeCascadeEventCount: 1,
        });

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('page-title')).toContainText('GM Ledger');
      await expect
        .poll(async () => readCampaignTimeState(page))
        .toEqual({
          currentDate: expectedDate,
          timeCascadeEventCount: 1,
        });
      await expect(page.getByTestId('gm-ledger-player-log')).toContainText(
        'Campaign time corrected by 2 days.',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).not.toContainText(
        /Hidden time|Secret employer|GM-only/i,
      );
      await expect(page.getByTestId('gm-ledger-private-log')).toContainText(
        'Campaign time corrected by 2 days.',
      );
      await expect(page.getByTestId('gm-ledger-private-log')).not.toContainText(
        /Hidden time|Secret employer|GM-only/i,
      );
    } finally {
      if (campaignId) {
        await deleteCampaign(page, campaignId);
      }
    }
  });

  test('blocks unprojected external time effects until manual takeover', async ({
    page,
  }) => {
    let campaignId = '';

    await page.goto('/gameplay/campaigns', { waitUntil: 'domcontentloaded' });
    campaignId = await createTestCampaign(page, {
      name: 'GM Time Cascade Manual Browser Proof',
      cBills: 1_000_000,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });

      await page.getByTestId('gm-ledger-time-conflict-preview-btn').click();
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
        /Hidden time|Secret employer|GM-only/i,
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
