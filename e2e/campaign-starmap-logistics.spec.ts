import { expect, test, type Page } from '@playwright/test';

import { withBrowserDiagnostics } from './helpers';

interface SeededCampaign {
  readonly campaignId: string;
  readonly initialDate: string;
  readonly startingFunds: number;
}

test.setTimeout(120_000);

async function waitForCampaignStoresReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: { campaign?: unknown; campaignRoster?: unknown };
        }
      ).__ZUSTAND_STORES__;
      return Boolean(stores?.campaign && stores.campaignRoster);
    },
    undefined,
    { timeout: 15_000 },
  );
}

async function seedTravelCampaign(page: Page): Promise<SeededCampaign> {
  await page.goto('/gameplay/campaigns');
  await waitForCampaignStoresReady(page);

  return page.evaluate(() => {
    type StoreApi = {
      getState: () => Record<string, any>;
      setState?: (state: Record<string, any>) => void;
    };
    type ExposedStore = StoreApi | (() => StoreApi);
    const resolveStore = (store: ExposedStore): StoreApi =>
      typeof (store as StoreApi).getState === 'function'
        ? (store as StoreApi)
        : (store as () => StoreApi)();

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: ExposedStore;
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error('Campaign store is not exposed');
    }

    const campaignStore = resolveStore(stores.campaign);
    const campaignState = campaignStore.getState();
    const startingFunds = 2_000_000;
    const campaignId = campaignState.createCampaign(
      'E2E Starmap Logistics Company',
      'Davion',
      {
        startingFunds,
        payForMaintenance: false,
        payForSalaries: false,
        unitMarketMethod: 'none',
        personnelMarketStyle: 'disabled',
        contractMarketMethod: 'none',
      },
    );
    const initialDate = '3025-01-01T00:00:00.000Z';
    campaignState.updateCampaign({
      currentDate: new Date(initialDate),
      currentSystemId: 'terra',
      updatedAt: initialDate,
    });

    return { campaignId, initialDate, startingFunds };
  });
}

async function readTravelState(page: Page): Promise<{
  readonly currentSystemId: string | null;
  readonly currentDate: string | null;
  readonly balance: number | null;
  readonly activityCategories: readonly string[];
  readonly travelTransactionCount: number;
}> {
  return page.evaluate(() => {
    type StoreApi = { getState: () => Record<string, any> };
    type ExposedStore = StoreApi | (() => StoreApi);
    const resolveStore = (store: ExposedStore): StoreApi =>
      typeof (store as StoreApi).getState === 'function'
        ? (store as StoreApi)
        : (store as () => StoreApi)();
    const campaignState = resolveStore(
      (
        window as unknown as {
          __ZUSTAND_STORES__?: { campaign?: ExposedStore };
        }
      ).__ZUSTAND_STORES__?.campaign as ExposedStore,
    ).getState();
    const campaign = campaignState.getCampaign?.();
    const activityLog = campaignState.activityLog ?? [];
    const transactions = campaign?.finances?.transactions ?? [];

    return {
      currentSystemId: campaign?.currentSystemId ?? null,
      currentDate: campaign?.currentDate?.toISOString?.() ?? null,
      balance: campaign?.finances?.balance?.amount ?? null,
      activityCategories: activityLog.map(
        (entry: { category: string }) => entry.category,
      ),
      travelTransactionCount: transactions.filter(
        (tx: { description?: string }) =>
          typeof tx.description === 'string' &&
          tx.description.includes('Travel fee from Terra to Luthien'),
      ).length,
    };
  });
}

test.describe('campaign starmap logistics', () => {
  test(
    'previews, approves, and reloads campaign travel consequences',
    { tag: ['@campaign', '@starmap', '@logistics'] },
    async ({ page }, testInfo) =>
      withBrowserDiagnostics(page, testInfo, async () => {
        const seeded = await seedTravelCampaign(page);

        await page.goto(`/gameplay/campaigns/${seeded.campaignId}/starmap`);
        await expect(page.getByTestId('starmap-travel-controls')).toBeVisible({
          timeout: 20_000,
        });
        await expect(page.getByTestId('starmap-current-system')).toContainText(
          'Terra',
        );

        await page
          .getByTestId('starmap-destination-select')
          .selectOption('luthien');
        await expect(page.getByTestId('starmap-selected-system')).toContainText(
          'Luthien',
        );
        await expect(page.getByTestId('starmap-route-status')).toContainText(
          'ready',
        );
        await expect(page.getByTestId('starmap-jump-count')).toContainText(
          '10',
        );
        await expect(page.getByTestId('starmap-elapsed-days')).toContainText(
          '72 days',
        );
        await expect(page.getByTestId('starmap-travel-fees')).toContainText(
          'C-bills',
        );
        await expect(page.getByTestId('starmap-lens-risk')).toContainText(
          'high',
        );

        await page.getByTestId('starmap-travel-btn').click();
        await expect(page.getByTestId('starmap-current-system')).toContainText(
          'Luthien',
        );
        await expect(page.getByTestId('starmap-route-status')).toContainText(
          'blocked',
        );

        const afterTravel = await readTravelState(page);
        expect(afterTravel).toMatchObject({
          currentSystemId: 'luthien',
          currentDate: '3025-03-14T00:00:00.000Z',
          travelTransactionCount: 1,
        });
        expect(afterTravel.balance).toBeLessThan(seeded.startingFunds);
        expect(afterTravel.activityCategories).toEqual(
          expect.arrayContaining(['travel', 'finances']),
        );

        await page.reload({ waitUntil: 'networkidle' });
        await waitForCampaignStoresReady(page);
        await expect(page.getByTestId('starmap-current-system')).toContainText(
          'Luthien',
        );
        const afterReload = await readTravelState(page);
        expect(afterReload).toMatchObject({
          currentSystemId: 'luthien',
          currentDate: '3025-03-14T00:00:00.000Z',
          travelTransactionCount: 1,
        });
        expect(afterReload.activityCategories).toEqual(
          expect.arrayContaining(['travel', 'finances']),
        );
      }),
  );
});
