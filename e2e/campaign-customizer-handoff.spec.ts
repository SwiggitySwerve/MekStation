import { expect, test, type Page } from '@playwright/test';

import { persistCampaignThroughDashboard } from './fixtures/campaign';
import {
  ATLAS_AS7_D_E2E_UNIT_ID,
  cloneCanonicalAtlasAs7DConfig,
  expectCanonicalAtlasCustomizerStats,
  expectCanonicalAtlasStoredConfiguration,
} from './fixtures/campaignUnits';
import { assertNoMekStationLoading } from './helpers/wait';

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

interface SeededCustomizerCampaign {
  readonly campaignId: string;
  readonly missionId: string;
}

async function seedCampaignWithRoster(
  page: Page,
): Promise<SeededCustomizerCampaign> {
  const atlasConfig = cloneCanonicalAtlasAs7DConfig();
  return page.evaluate(
    ({ atlasConfig: seededAtlasConfig, atlasUnitId }) => {
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
        getMissionsStore?: () => {
          getState: () => {
            addMission?: (mission: Record<string, unknown>) => void;
          };
        };
      };
      const campaignId = campaignState.createCampaign(
        'E2E Customizer Handoff',
        'mercenary',
        {
          startingFunds: 2_500_000,
        },
      );
      const campaign = campaignState.getCampaign();
      const missionId = 'mission-alpha';
      const mission = {
        id: missionId,
        name: 'Mission Readiness Browser Proof',
        status: 'Active',
        type: 'mission',
        systemId: 'terra',
        scenarioIds: [],
        description: 'Browser proof mission for readiness customizer handoff.',
        briefing:
          'Verify readiness refit returns without resetting deployment.',
        startDate: '3025-01-03',
        createdAt: '3025-01-03T00:00:00.000Z',
        updatedAt: '3025-01-03T00:00:00.000Z',
      };
      campaignState.updateCampaign({
        ...campaign,
        currentDate: new Date('3025-01-03T00:00:00.000Z'),
        missions: new Map([[missionId, mission]]),
        unitConfigurations: {
          ...((campaign.unitConfigurations as Record<string, unknown>) ?? {}),
          [atlasUnitId]: seededAtlasConfig,
        },
      });
      campaignState.getMissionsStore?.().getState().addMission?.(mission);
      stores.campaignRoster.setState?.({
        campaignId,
        units: [
          {
            unitId: atlasUnitId,
            unitRef: 'atlas-as7-d',
            unitName: 'Atlas',
            chassisVariant: 'AS7-D',
            readiness: 'Ready',
          },
        ],
        pilots: [],
        missions: [],
        activeMissionId: null,
        missionCount: 1,
      });
      return { campaignId, missionId };
    },
    {
      atlasConfig,
      atlasUnitId: ATLAS_AS7_D_E2E_UNIT_ID,
    },
  );
}

async function makeOneCampaignRefitChange(page: Page): Promise<void> {
  await expect(page.getByTestId('campaign-refit-save')).toBeDisabled();
  await expect(page.getByTestId('campaign-refit-no-delta')).toContainText(
    'No refit order will be created',
  );
  await page.getByTestId('structure-heat-sink-increment').click();
  await expect(page.getByTestId('campaign-refit-change-count')).toContainText(
    '1 build field changed',
  );
  await expect(page.getByTestId('campaign-refit-save')).toBeEnabled();
}

test.describe('campaign customizer handoff @campaign @customizer', () => {
  test('routes Mech Bay refit into campaign customizer and saves a refit order', async ({
    page,
  }) => {
    await page.goto('/gameplay/campaigns');
    await waitForCampaignStores(page);
    const { campaignId } = await seedCampaignWithRoster(page);
    await expectCanonicalAtlasStoredConfiguration(page);
    await persistCampaignThroughDashboard(page, campaignId);

    await page.goto(`/gameplay/campaigns/${campaignId}/mech-bay`);
    await assertNoMekStationLoading(page);
    await expect(page.getByTestId('mech-bay-grid')).toBeVisible();
    await page.getByTestId('mech-bay-refit-unit-atlas-e2e').click();

    await expect(page).toHaveURL(/\/customizer.*mode=campaign-refit/);
    await expect(page.getByTestId('campaign-refit-command-bar')).toBeVisible();
    await expectCanonicalAtlasCustomizerStats(page);
    await expect(page.getByTestId('campaign-refit-context')).toContainText(
      'Campaign refit limits',
    );
    await expect(page.getByTestId('campaign-refit-context')).toContainText(
      '3025-01-03',
    );
    await expect(page.getByTestId('campaign-refit-context')).not.toContainText(
      'campaign-owned-refit',
    );
    await expect(page.getByTestId('campaign-refit-context')).not.toContainText(
      '3025-01-03T00:00:00.000Z',
    );
    await makeOneCampaignRefitChange(page);

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

  test('returns from campaign customizer into mission readiness with deployment validation refresh', async ({
    page,
  }) => {
    await page.goto('/gameplay/campaigns');
    await waitForCampaignStores(page);
    const { campaignId, missionId } = await seedCampaignWithRoster(page);
    await expectCanonicalAtlasStoredConfiguration(page);
    await persistCampaignThroughDashboard(page, campaignId);

    await page.goto(
      `/gameplay/campaigns/${campaignId}/missions/${missionId}/launch`,
    );
    await assertNoMekStationLoading(page);
    await expect(page.getByTestId('mission-readiness-panel')).toBeVisible();
    await expect(page.getByTestId('mission-readiness-status')).toContainText(
      'Ready with warnings (1)',
    );
    await expect(
      page.getByTestId(
        `mission-readiness-action-${ATLAS_AS7_D_E2E_UNIT_ID}-pilot_unassigned`,
      ),
    ).toContainText('Assign pilot');
    await expect(page.getByTestId('launch-mission-direct')).toContainText(
      'Launch with warnings',
    );
    await page
      .getByTestId(`mission-readiness-customize-${ATLAS_AS7_D_E2E_UNIT_ID}`)
      .click();

    await expect(page).toHaveURL(/\/customizer.*returnTo=mission-readiness/);
    await expect(page.getByTestId('campaign-refit-command-bar')).toBeVisible();
    await expectCanonicalAtlasCustomizerStats(page);
    await expect(page.getByTestId('campaign-refit-context')).toContainText(
      'Campaign refit limits',
    );
    await expect(page.getByTestId('campaign-refit-context')).toContainText(
      '3025-01-03',
    );
    await expect(page.getByTestId('campaign-refit-context')).not.toContainText(
      'campaign-owned-refit',
    );
    await expect(page.getByTestId('campaign-refit-context')).not.toContainText(
      '3025-01-03T00:00:00.000Z',
    );
    await makeOneCampaignRefitChange(page);

    await page.getByTestId('campaign-refit-save').click();

    await expect(page).toHaveURL(
      new RegExp(
        `/gameplay/campaigns/${campaignId}/missions/${missionId}/launch\\?.*refresh=deployment-validation.*customizerResult=saved`,
      ),
    );
    await expect(
      page.getByTestId('mission-readiness-refit-return-status'),
    ).toContainText('Refit order saved');
    await expect(
      page.getByTestId('mission-readiness-refit-return-status'),
    ).not.toContainText('refit-');
    await expect(
      page.getByTestId('mission-readiness-refit-return-status'),
    ).not.toContainText(ATLAS_AS7_D_E2E_UNIT_ID);
    await expect(page.getByTestId('mission-readiness-panel')).toBeVisible();
    await expect(page.getByTestId('mission-readiness-status')).toContainText(
      'Ready with warnings (1)',
    );
    await expect(page.getByTestId('launch-mission-direct')).toContainText(
      'Launch with warnings',
    );
    await expect(page.getByTestId('launch-mission-direct')).toBeEnabled();

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
    expect(refitOrders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: 'unit-atlas-e2e',
          status: 'in-progress',
        }),
      ]),
    );
  });
});
