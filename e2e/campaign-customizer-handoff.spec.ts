import { expect, test, type Page } from '@playwright/test';

async function waitForCampaignStores(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const win = window as unknown as {
      __ZUSTAND_STORES__?: { campaign?: unknown; campaignRoster?: unknown };
    };
    return Boolean(
      win.__ZUSTAND_STORES__?.campaign &&
      win.__ZUSTAND_STORES__?.campaignRoster,
    );
  });
}

async function seedCampaignWithRoster(page: Page): Promise<string> {
  return page.evaluate(() => {
    type StoreApi = {
      getState: () => Record<string, unknown>;
      setState?: (state: Record<string, unknown>) => void;
    };
    const resolveStore = (store: StoreApi | (() => StoreApi)): StoreApi =>
      typeof (store as StoreApi).getState === 'function'
        ? (store as StoreApi)
        : (store as () => StoreApi)();
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: StoreApi | (() => StoreApi);
          campaignRoster?: StoreApi;
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign || !stores.campaignRoster) {
      throw new Error('Campaign E2E stores are not exposed');
    }

    const campaignStore = resolveStore(stores.campaign);
    const campaignState = campaignStore.getState() as {
      createCampaign: (
        name: string,
        factionId: string,
        options: Record<string, unknown>,
      ) => string;
      getCampaign: () => Record<string, unknown>;
      updateCampaign: (updates: Record<string, unknown>) => void;
    };
    const campaignId = campaignState.createCampaign(
      'E2E Customizer Handoff',
      'mercenary',
      {
        startingFunds: 2_500_000,
      },
    );
    const campaign = campaignState.getCampaign();
    campaignState.updateCampaign({
      ...campaign,
      currentDate: new Date('3025-01-03T00:00:00.000Z'),
    });
    stores.campaignRoster.setState?.({
      campaignId,
      units: [
        {
          unitId: 'unit-atlas-e2e',
          unitName: 'Atlas',
          chassisVariant: 'AS7-D',
          readiness: 'Ready',
        },
      ],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });
    return campaignId;
  });
}

test.describe('campaign customizer handoff @campaign @customizer', () => {
  test('routes Mech Bay refit into campaign customizer and saves a refit order', async ({
    page,
  }) => {
    await page.goto('/gameplay/campaigns');
    await waitForCampaignStores(page);
    const campaignId = await seedCampaignWithRoster(page);

    await page.goto(`/gameplay/campaigns/${campaignId}/mech-bay`);
    await expect(page.getByTestId('mech-bay-grid')).toBeVisible();
    await page.getByTestId('mech-bay-refit-unit-atlas-e2e').click();

    await expect(page).toHaveURL(/\/customizer.*mode=campaign-refit/);
    await expect(page.getByTestId('campaign-refit-command-bar')).toBeVisible();
    await expect(page.getByTestId('campaign-refit-context')).toContainText(
      'campaign-owned-refit',
    );
    await expect(page.getByTestId('campaign-refit-save')).toBeEnabled();

    await page.getByTestId('campaign-refit-save').click();

    await expect(page).toHaveURL(
      new RegExp(
        `/gameplay/campaigns/${campaignId}/mech-bay\\?.*customizerResult=saved`,
      ),
    );
    await expect(page.getByTestId('mech-bay-grid')).toBeVisible();

    const refitOrders = await page.evaluate(() => {
      type StoreApi = {
        getState: () => Record<string, unknown>;
      };
      const resolveStore = (store: StoreApi | (() => StoreApi)): StoreApi =>
        typeof (store as StoreApi).getState === 'function'
          ? (store as StoreApi)
          : (store as () => StoreApi)();
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            campaign?: StoreApi | (() => StoreApi);
          };
        }
      ).__ZUSTAND_STORES__;
      const campaignState = stores?.campaign
        ? (resolveStore(stores.campaign).getState() as {
            getCampaign: () => { refitOrders?: readonly unknown[] } | null;
          })
        : null;
      return campaignState?.getCampaign()?.refitOrders ?? [];
    });
    expect(refitOrders).toHaveLength(1);
    expect(refitOrders[0]).toMatchObject({
      unitId: 'unit-atlas-e2e',
      status: 'in-progress',
    });
  });
});
