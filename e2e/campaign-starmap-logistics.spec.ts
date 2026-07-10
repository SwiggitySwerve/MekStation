import {
  expect,
  request as playwrightRequest,
  test,
  type Page,
} from '@playwright/test';

import { persistCampaignThroughDashboard } from './fixtures/campaign';
import { withBrowserDiagnostics } from './helpers';
import { assertNoMekStationLoading } from './helpers/wait';

interface SeededCampaign {
  readonly campaignId: string;
  readonly initialDate: string;
  readonly startingFunds: number;
}

test.setTimeout(120_000);

const persistedCampaignIds = new Set<string>();

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
  // Runs once after the whole describe block (== whole file, single
  // describe), not after each test: intra-file tests may chain on state a
  // prior test persisted. Cleaning up per-test would delete that state
  // mid-file; afterAll still clears the shared DB before the next spec file.
  test.afterAll(async ({}, testInfo) => {
    if (persistedCampaignIds.size === 0) {
      return;
    }
    // page/context fixtures are per-test and unavailable in afterAll
    // (Playwright 1.57 hard-rejects them); use a standalone request context.
    const baseURL = testInfo.project.use.baseURL ?? 'http://localhost:3600';
    const ctx = await playwrightRequest.newContext({ baseURL });
    for (const campaignId of Array.from(persistedCampaignIds)) {
      try {
        await ctx.delete(`/api/campaigns/${encodeURIComponent(campaignId)}`);
      } catch {
        // Cleanup is best-effort; the campaign may already be deleted.
      }
    }
    persistedCampaignIds.clear();
    await ctx.dispose();
  });

  test(
    'previews, approves, and reloads campaign travel consequences',
    { tag: ['@campaign', '@starmap', '@logistics'] },
    async ({ page }, testInfo) =>
      withBrowserDiagnostics(page, testInfo, async () => {
        const seeded = await seedTravelCampaign(page);
        persistedCampaignIds.add(seeded.campaignId);
        await persistCampaignThroughDashboard(page, seeded.campaignId);

        await page.goto(`/gameplay/campaigns/${seeded.campaignId}/starmap`);
        await assertNoMekStationLoading(page);
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
        await expect(page.getByTestId('starmap-detail-status')).toContainText(
          'Zoom',
        );
        await expect(
          page.getByTestId('starmap-detail-status'),
        ).not.toContainText('Detail');
        await expect(
          page.getByTestId('starmap-detail-status'),
        ).not.toContainText('LOD');
        await expect(
          page.getByTestId('starmap-annotation-legend'),
        ).toBeVisible();
        await expect(
          page.getByTestId('starmap-travel-preview'),
        ).not.toContainText('roster-owned');
        await expect(
          page.getByTestId('starmap-travel-preview'),
        ).not.toContainText('GM time cascade');

        await page.getByTestId('starmap-travel-btn').click();
        await expect(page.getByTestId('starmap-current-system')).toContainText(
          'Luthien',
        );
        // Arrival-appropriate copy (re-audit DC-05): the already-here state
        // reads 'at destination', not the engine's raw 'blocked'.
        await expect(page.getByTestId('starmap-route-status')).toContainText(
          'at destination',
        );
        await expect(page.getByTestId('starmap-arrival-date')).toContainText(
          '3025-03-14 (now)',
        );
        await expect(page.getByTestId('starmap-travel-btn')).toBeDisabled();
        await expect(page.getByTestId('starmap-travel-btn')).toContainText(
          'Already at Luthien',
        );
        await expect(
          page.getByTestId('starmap-travel-action-reason'),
        ).toContainText('Luthien is already the campaign location.');
        await expect(
          page.getByTestId('starmap-travel-action-reason'),
        ).not.toContainText('destination-current-system');
        await expect(page.getByTestId('starmap-lens-panel')).toContainText(
          'Current campaign location',
        );
        await expect(page.getByTestId('starmap-lens-panel')).not.toContainText(
          'Single-jump reachable',
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
        await assertNoMekStationLoading(page);
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
