/**
 * Campaign generated-route recovery proof.
 *
 * Seeds and saves a campaign, clears live/client-side campaign state, then
 * deep-links directly into generated campaign subroutes. Each route must load
 * the canonical server-backed campaign and continue to work after refresh.
 *
 * @tags @campaign @routing @strict
 */

import {
  test,
  expect,
  type Locator,
  type Page,
  request as playwrightRequest,
} from '@playwright/test';

import { deleteCampaign } from './fixtures/campaign';
import { withBrowserDiagnostics } from './helpers';

const persistedCampaignIds = new Set<string>();

interface SavedCampaignSnapshot {
  readonly campaignId: string;
  readonly name: string;
  readonly missionId: string;
  readonly missionName: string;
  readonly version: number;
}

type RouteAssertion = {
  readonly label: string;
  readonly path: (snapshot: SavedCampaignSnapshot) => string;
  readonly surface: (page: Page, snapshot: SavedCampaignSnapshot) => Locator;
};

test.setTimeout(120_000);

async function waitForE2EHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as { __E2E_MODE__?: boolean }).__E2E_MODE__ === true,
    undefined,
    { timeout: 15_000 },
  );
}

async function waitForCampaignStoresReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            campaign?: unknown;
            campaignRoster?: unknown;
          };
        }
      ).__ZUSTAND_STORES__;
      return Boolean(stores?.campaign && stores.campaignRoster);
    },
    undefined,
    { timeout: 15_000 },
  );
}

async function seedRecoverableCampaign(
  page: Page,
): Promise<
  Pick<
    SavedCampaignSnapshot,
    'campaignId' | 'name' | 'missionId' | 'missionName'
  >
> {
  await page.goto('/gameplay/campaigns');
  await waitForE2EHydration(page);
  await waitForCampaignStoresReady(page);

  return page.evaluate(() => {
    type MissionRecord = {
      readonly id: string;
      readonly name: string;
      readonly status: string;
      readonly type: 'mission';
      readonly systemId: string;
      readonly scenarioIds: readonly string[];
      readonly description: string;
      readonly briefing: string;
      readonly startDate: string;
      readonly createdAt: string;
      readonly updatedAt: string;
    };
    type CampaignRecord = {
      readonly id: string;
      readonly missions: Map<string, MissionRecord>;
    };
    type MissionsStore = {
      getState: () => {
        addMission: (mission: MissionRecord) => void;
      };
    };
    type CampaignStore = {
      getState: () => {
        createCampaign: (
          name: string,
          factionId: string,
          options?: { startingFunds?: number },
        ) => string;
        updateCampaign: (updates: Record<string, unknown>) => void;
        getCampaign: () => CampaignRecord | null;
        getMissionsStore: () => MissionsStore | null;
      };
    };

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: CampaignStore;
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error('Campaign store is not exposed');
    }

    const state = stores.campaign.getState();
    const name = `E2E Generated Route Recovery ${Date.now()}`;
    const campaignId = state.createCampaign(name, 'mercenary', {
      startingFunds: 3_000_000,
    });
    const campaign = state.getCampaign();
    if (!campaign) {
      throw new Error('Campaign was not created');
    }

    const now = new Date().toISOString();
    const missionId = `mission-route-recovery-${Date.now()}`;
    const missionName = 'Generated Route Recovery Raid';
    const mission: MissionRecord = {
      id: missionId,
      name: missionName,
      status: 'Active',
      type: 'mission',
      systemId: 'terra',
      scenarioIds: [],
      description: 'Mission seeded for generated campaign route recovery.',
      briefing: 'Direct route recovery must load this mission after refresh.',
      startDate: '3025-01-05',
      createdAt: now,
      updatedAt: now,
    };

    const missions = new Map(campaign.missions);
    missions.set(missionId, mission);
    state.updateCampaign({
      description: 'Strict generated campaign subroute recovery proof.',
      currentSystemId: 'terra',
      missions,
    });
    state.getMissionsStore()?.getState().addMission(mission);

    return { campaignId, name, missionId, missionName };
  });
}

async function saveCampaignThroughDashboard(
  page: Page,
  snapshot: Pick<
    SavedCampaignSnapshot,
    'campaignId' | 'missionId' | 'missionName' | 'name'
  >,
): Promise<SavedCampaignSnapshot> {
  persistedCampaignIds.add(snapshot.campaignId);
  await page.goto(`/gameplay/campaigns/${snapshot.campaignId}`);
  await expect(page.getByTestId('campaign-dashboard')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });

  const [saveResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes(`/api/campaigns/${snapshot.campaignId}`) &&
        response.status() === 200,
      { timeout: 20_000 },
    ),
    page.getByTestId('campaign-save-now-btn').click(),
  ]);
  const saved = (await saveResponse.json()) as {
    campaignId?: unknown;
    version?: unknown;
    body?: { name?: unknown };
  };

  expect(saved.campaignId).toBe(snapshot.campaignId);
  expect(saved.body?.name).toBe(snapshot.name);
  expect(typeof saved.version).toBe('number');

  return {
    ...snapshot,
    version: saved.version as number,
  };
}

async function clearLiveCampaignClientState(page: Page): Promise<void> {
  await page.evaluate(() => {
    type CampaignStore = {
      setState: (state: Record<string, unknown>) => void;
    };
    type RosterStore = {
      getState: () => { reset?: () => void };
    };

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: CampaignStore;
          campaignRoster?: RosterStore;
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error('Campaign store is not exposed');
    }

    stores.campaign.setState({
      campaign: null,
      forcesStore: null,
      missionsStore: null,
      pendingBattleOutcomes: [],
      processedBattleIds: [],
      reviewedBattleIds: {},
      outcomeApplyErrors: {},
      activityLog: [],
    });
    stores.campaignRoster?.getState().reset?.();

    const campaignStoragePrefixes = [
      'campaign-store',
      'campaign-roster-store',
      'campaign-',
      'forces-',
      'missions-',
    ];
    const keys = Array.from(
      { length: window.localStorage.length },
      (_, index) => window.localStorage.key(index),
    ).filter((key): key is string => typeof key === 'string');
    keys.forEach((key) => {
      if (
        campaignStoragePrefixes.some((prefix) =>
          prefix.endsWith('-') ? key.startsWith(prefix) : key === prefix,
        )
      ) {
        window.localStorage.removeItem(key);
      }
    });
  });

  await expect
    .poll(() =>
      page.evaluate(() => {
        const campaign = (
          window as unknown as {
            __ZUSTAND_STORES__?: {
              campaign?: {
                getState: () => { campaign?: unknown };
              };
            };
          }
        ).__ZUSTAND_STORES__?.campaign?.getState().campaign;
        return campaign ?? null;
      }),
    )
    .toBeNull();
}

async function expectLoadedCampaignId(
  page: Page,
  campaignId: string,
): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const campaign = (
            window as unknown as {
              __ZUSTAND_STORES__?: {
                campaign?: {
                  getState: () => {
                    campaign?: { id?: unknown };
                    getCampaign?: () => { id?: unknown } | null;
                  };
                };
              };
            }
          ).__ZUSTAND_STORES__?.campaign?.getState();
          const loaded = campaign?.campaign ?? campaign?.getCampaign?.();
          return typeof loaded?.id === 'string' ? loaded.id : null;
        }),
      { timeout: 20_000 },
    )
    .toBe(campaignId);
}

async function assertRouteRecovery(
  page: Page,
  snapshot: SavedCampaignSnapshot,
  route: RouteAssertion,
): Promise<void> {
  await clearLiveCampaignClientState(page);

  await page.goto(route.path(snapshot), { waitUntil: 'networkidle' });
  await waitForE2EHydration(page);
  await expect(route.surface(page, snapshot), route.label).toBeVisible({
    timeout: 20_000,
  });
  await expectLoadedCampaignId(page, snapshot.campaignId);

  await page.reload({ waitUntil: 'networkidle' });
  await waitForE2EHydration(page);
  await expect(
    route.surface(page, snapshot),
    `${route.label} after reload`,
  ).toBeVisible({ timeout: 20_000 });
  await expectLoadedCampaignId(page, snapshot.campaignId);
}

const GENERATED_CAMPAIGN_ROUTES: readonly RouteAssertion[] = [
  {
    label: 'campaign dashboard',
    path: ({ campaignId }) => `/gameplay/campaigns/${campaignId}`,
    surface: (page) => page.getByTestId('campaign-dashboard'),
  },
  {
    label: 'finances command surface',
    path: ({ campaignId }) => `/gameplay/campaigns/${campaignId}/finances`,
    surface: (page) => page.getByTestId('finances-panel'),
  },
  {
    label: 'GM ledger command surface',
    path: ({ campaignId }) => `/gameplay/campaigns/${campaignId}/gm-ledger`,
    surface: (page) => page.getByTestId('gm-ledger-control-plane'),
  },
  {
    label: 'starmap command surface',
    path: ({ campaignId }) => `/gameplay/campaigns/${campaignId}/starmap`,
    surface: (page) => page.getByTestId('starmap-travel-controls'),
  },
  {
    label: 'activity log command surface',
    path: ({ campaignId }) => `/gameplay/campaigns/${campaignId}/log`,
    surface: (page) => page.getByTestId('activity-log-table'),
  },
  {
    label: 'missions route seeded mission card',
    path: ({ campaignId }) => `/gameplay/campaigns/${campaignId}/missions`,
    surface: (page, { missionId }) =>
      page.getByTestId(`mission-card-${missionId}`),
  },
  {
    label: 'personnel route empty roster recovery',
    path: ({ campaignId }) => `/gameplay/campaigns/${campaignId}/personnel`,
    surface: (page) => page.getByText('No pilots in this campaign roster'),
  },
  {
    label: 'mission launch direct action',
    path: ({ campaignId, missionId }) =>
      `/gameplay/campaigns/${campaignId}/missions/${missionId}/launch`,
    surface: (page) => page.getByTestId('launch-mission-direct'),
  },
];

// Runs once after the whole file, not after each test: intra-file tests may
// chain on state a prior test persisted. Cleaning up per-test would delete
// that state mid-file; afterAll still clears the shared DB before the next
// spec file runs.
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

test.describe('Campaign Generated Subroute Recovery', () => {
  test(
    'direct generated campaign subroutes load canonical campaign state and survive refresh',
    { tag: ['@campaign', '@routing', '@strict'] },
    async ({ page }, testInfo) =>
      withBrowserDiagnostics(page, testInfo, async () => {
        const seeded = await seedRecoverableCampaign(page);
        const saved = await saveCampaignThroughDashboard(page, seeded);

        for (const route of GENERATED_CAMPAIGN_ROUTES) {
          await test.step(route.label, async () => {
            await assertRouteRecovery(page, saved, route);
          });
        }

        const serverRecord = await page.evaluate(async (campaignId) => {
          const response = await fetch(`/api/campaigns/${campaignId}`);
          if (!response.ok) {
            throw new Error(`server responded ${response.status}`);
          }
          const record = (await response.json()) as {
            campaignId?: unknown;
            version?: unknown;
            body?: { missions?: readonly [string, unknown][] };
          };
          return {
            campaignId: record.campaignId,
            version: record.version,
            missionCount: record.body?.missions?.length ?? 0,
          };
        }, saved.campaignId);

        expect(serverRecord).toEqual({
          campaignId: saved.campaignId,
          version: saved.version,
          missionCount: 1,
        });
      }),
  );
});
