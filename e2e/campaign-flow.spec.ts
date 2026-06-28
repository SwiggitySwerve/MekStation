/**
 * Strict Campaign Flow E2E Tests
 *
 * Browser-drives campaign creation, roster readiness, mission generation,
 * contract acceptance, and post-battle carry-forward with explicit
 * preconditions. These checks intentionally avoid ambient campaign cards and
 * tautological pass paths so the campaign browser lane catches route/state
 * regressions.
 *
 * @tags @campaign @smoke
 */

import { test, expect, type Page } from '@playwright/test';

import { getStoreState } from './helpers/store';

interface CampaignStoreState {
  readonly campaign: {
    readonly id: string;
    readonly name: string;
    readonly status: string;
  } | null;
}

interface CampaignContractSnapshot {
  readonly campaignId: string | null;
  readonly missionIds: readonly string[];
  readonly missionNames: readonly string[];
  readonly missionStatuses: readonly string[];
  readonly missionScenarioIds: readonly string[];
  readonly contractMarketOfferIds: readonly string[];
  readonly rosterUnitNames: readonly string[];
  readonly rosterPilotNames: readonly string[];
}

interface SeededDamagedCampaign {
  readonly campaignId: string;
  readonly auditDate: string;
  readonly matchId: string;
}

interface SavedCampaignSnapshot {
  readonly campaignId: string;
  readonly name: string;
  readonly version: number;
}

test.setTimeout(90_000);

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
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { campaign?: unknown; campaignRoster?: unknown };
      };
      return Boolean(
        win.__ZUSTAND_STORES__?.campaign &&
        win.__ZUSTAND_STORES__?.campaignRoster,
      );
    },
    undefined,
    { timeout: 15_000 },
  );
}

async function createRosteredCampaignViaWizard(page: Page): Promise<string> {
  const campaignName = `E2E Campaign Flow ${Date.now()}`;

  await page.goto('/gameplay/campaigns/create');
  await waitForE2EHydration(page);

  await expect(page.getByTestId('campaign-name-input')).toBeVisible();
  await page.getByTestId('campaign-name-input').fill(campaignName);
  await page
    .getByTestId('campaign-description-input')
    .fill('Strict browser proof for campaign flow coverage.');

  await page.getByTestId('wizard-next-btn').click();
  await expect(page.getByText('Campaign Type')).toBeVisible();

  await page.getByTestId('wizard-next-btn').click();
  await expect(page.getByText('Campaign Preset')).toBeVisible();

  await page.getByTestId('wizard-next-btn').click();
  await expect(page.getByText('Configure Roster')).toBeVisible();
  await page.getByTestId('add-unit-light-mech').click();
  await page.getByTestId('add-pilot-btn').click();
  await page.locator('select').first().selectOption({ index: 1 });

  await page.getByTestId('wizard-next-btn').click();
  await expect(page.getByText('Review Campaign')).toBeVisible();

  await page.getByTestId('wizard-submit-btn').click();
  await page.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, {
    timeout: 20_000,
  });
  await expect(page.getByTestId('campaign-dashboard')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('roster-unit-card')).toContainText(
    'Light Mech',
  );
  await expect(page.getByTestId('roster-unit-card')).toContainText('Ready');

  const campaignId = page.url().match(/\/gameplay\/campaigns\/([^/?#]+)/)?.[1];
  expect(campaignId).toBeTruthy();
  return campaignId!;
}

async function getCampaignContractSnapshot(
  page: Page,
): Promise<CampaignContractSnapshot> {
  return page.evaluate(() => {
    type StoreApi = {
      getState: () => Record<string, unknown>;
    };
    type ExposedStore = StoreApi | (() => StoreApi);
    type MissionRecord = {
      id?: unknown;
      name?: unknown;
      status?: unknown;
      scenarioIds?: unknown;
    };
    type CampaignRecord = {
      id?: unknown;
      missions?: unknown;
      contractMarket?: {
        offers?: readonly { id?: unknown }[];
      };
    };
    type RosterState = {
      units?: readonly { unitName?: unknown }[];
      pilots?: readonly { pilotName?: unknown }[];
    };

    const resolveStore = (raw: ExposedStore | undefined): StoreApi => {
      if (!raw) {
        throw new Error('Expected E2E store to be exposed');
      }
      return 'getState' in raw ? raw : raw();
    };

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: ExposedStore;
          campaignRoster?: ExposedStore;
        };
      }
    ).__ZUSTAND_STORES__;
    const campaignState = resolveStore(stores?.campaign).getState() as {
      getCampaign?: () => CampaignRecord | null;
    };
    const rosterState = resolveStore(stores?.campaignRoster).getState() as
      | RosterState
      | undefined;
    const campaign = campaignState.getCampaign?.() ?? null;
    const missions =
      campaign?.missions instanceof Map
        ? (Array.from(campaign.missions.values()) as MissionRecord[])
        : [];

    return {
      campaignId: typeof campaign?.id === 'string' ? campaign.id : null,
      missionIds: missions
        .map((mission) => mission.id)
        .filter((id): id is string => typeof id === 'string'),
      missionNames: missions
        .map((mission) => mission.name)
        .filter((name): name is string => typeof name === 'string'),
      missionStatuses: missions
        .map((mission) => mission.status)
        .filter((status): status is string => typeof status === 'string'),
      missionScenarioIds: missions.flatMap((mission) =>
        Array.isArray(mission.scenarioIds)
          ? mission.scenarioIds.filter(
              (scenarioId): scenarioId is string =>
                typeof scenarioId === 'string',
            )
          : [],
      ),
      contractMarketOfferIds:
        campaign?.contractMarket?.offers
          ?.map((offer) => offer.id)
          .filter((id): id is string => typeof id === 'string') ?? [],
      rosterUnitNames:
        rosterState?.units
          ?.map((unit) => unit.unitName)
          .filter((name): name is string => typeof name === 'string') ?? [],
      rosterPilotNames:
        rosterState?.pilots
          ?.map((pilot) => pilot.pilotName)
          .filter((name): name is string => typeof name === 'string') ?? [],
    };
  });
}

async function acceptFirstMarketContract(
  page: Page,
  campaignId: string,
): Promise<{ offerId: string; offerName: string }> {
  await page.goto(`/gameplay/campaigns/${campaignId}`);
  await expect(page.getByTestId('quick-action-browse-contracts')).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId('quick-action-browse-contracts').click();
  await page.waitForURL(
    new RegExp(`/gameplay/campaigns/${campaignId}/contract-market$`),
    { timeout: 20_000 },
  );
  await expect(page.getByTestId('contract-market-grid')).toBeVisible({
    timeout: 20_000,
  });

  const firstOffer = page.locator('[data-testid^="offer-card-"]').first();
  await expect(firstOffer).toBeVisible();
  const offerTestId = await firstOffer.getAttribute('data-testid');
  const offerName = (await firstOffer.locator('h3').textContent())?.trim();
  const offerId = offerTestId?.replace(/^offer-card-/, '');

  expect(offerId).toBeTruthy();
  expect(offerName).toBeTruthy();

  await page.getByTestId(`offer-accept-${offerId}`).click();
  await expect(page.getByTestId(`offer-card-${offerId}`)).toHaveCount(0);

  return { offerId: offerId!, offerName: offerName! };
}

async function saveCampaignThroughDashboard(
  page: Page,
  campaignId: string,
): Promise<SavedCampaignSnapshot> {
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });

  const [saveResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes(`/api/campaigns/${campaignId}`) &&
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

  expect(saved.campaignId).toBe(campaignId);
  expect(typeof saved.version).toBe('number');
  expect(typeof saved.body?.name).toBe('string');
  await expect(page.getByTestId('campaign-last-saved')).not.toContainText(
    'Never saved',
  );

  return {
    campaignId,
    name: saved.body!.name as string,
    version: saved.version as number,
  };
}

async function clearLiveCampaignClientState(page: Page): Promise<void> {
  await page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            getState: () => unknown;
            setState: (state: Record<string, unknown>) => void;
          };
          campaignRoster?: {
            getState: () => { reset?: () => void };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error('Campaign E2E store is not exposed');
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
  });

  await expect
    .poll(() =>
      page.evaluate(() => {
        const stores = (
          window as unknown as {
            __ZUSTAND_STORES__?: {
              campaign?: {
                getState: () => { campaign?: unknown };
              };
            };
          }
        ).__ZUSTAND_STORES__;
        return stores?.campaign?.getState().campaign ?? null;
      }),
    )
    .toBeNull();
}

async function seedDamagedPostBattleCampaign(
  page: Page,
): Promise<SeededDamagedCampaign> {
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
          campaignRoster?: StoreApi;
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign || !stores.campaignRoster) {
      throw new Error('Campaign E2E stores are not exposed');
    }

    const campaignStore = resolveStore(stores.campaign);
    const campaignState = campaignStore.getState();
    const campaignId = campaignState.createCampaign(
      'E2E Damage Carry Forward Co.',
      'mercenary',
      { startingFunds: 2_500_000 },
    );
    const currentDate = '3025-01-01T00:00:00.000Z';
    const auditDate = '3025-01-01';
    const matchId = 'match-campaign-flow-damage';
    const unitId = 'unit-damaged-atlas';

    stores.campaignRoster.setState?.({
      campaignId,
      units: [
        {
          unitId,
          unitName: 'Atlas AS7-D',
          chassis: 'Atlas',
          model: 'AS7-D',
          pilotId: 'pilot-damaged-atlas',
          readiness: 'Damaged',
        },
      ],
      pilots: [
        {
          pilotId: 'pilot-damaged-atlas',
          pilotName: 'Morgan Kell',
          status: 'active',
          wounds: 1,
          recoveryTime: 0,
          xp: 0,
          campaignXpEarned: 2,
          campaignKills: 1,
          campaignMissions: 1,
          primaryRole: 'Pilot',
          rankIndex: 0,
          hireDate: new Date(currentDate),
          assignedUnitId: unitId,
        },
      ],
      missions: [
        {
          id: 'mission-damage-carry-forward',
          missionNumber: 1,
          name: 'Damage Carry Forward',
          result: 'victory',
          encounterId: 'encounter-damage-carry-forward',
          campaignId,
          deployedUnitIds: [unitId],
          completedAt: currentDate,
          turnsPlayed: 5,
        },
      ],
      activeMissionId: null,
      missionCount: 1,
    });

    campaignState.updateCampaign({
      currentDate: new Date(currentDate),
      repairQueue: [
        {
          ticketId: 'ticket-damage-carry-forward-ct',
          unitId,
          kind: 'armor',
          location: 'CT',
          expectedHours: 6,
          remainingHours: 6,
          partsRequired: [],
          source: 'combat',
          matchId,
          createdAt: currentDate,
          status: 'queued',
        },
      ],
      dailyBattleAudit: [
        {
          date: auditDate,
          matchesProcessed: 1,
          matches: [
            {
              matchId,
              contractId: 'contract-damage-carry-forward',
              summary: 'Victory - damage carry-forward proof',
            },
          ],
          totalXpAwarded: 2,
          pilotsWounded: 1,
          pilotsKia: 0,
          pilotsMia: 0,
          salvageValueSecured: 250_000,
          repairTicketsCreated: 1,
          contractsClosed: ['contract-damage-carry-forward'],
        },
      ],
      salvageReports: {
        [matchId]: {
          battleId: matchId,
          contractId: 'contract-damage-carry-forward',
          totalCandidates: 1,
          totalValue: 250_000,
        },
      },
      unitCombatStates: {
        [unitId]: {
          unitId,
          currentArmorPerLocation: {
            CT: 20,
            LT: 10,
            RT: 12,
          },
          currentStructurePerLocation: {
            CT: 30,
            LT: 16,
            RT: 18,
          },
          destroyedLocations: [],
          destroyedComponents: [
            {
              location: 'RA',
              slot: 2,
              componentType: 'weapon',
              name: 'Medium Laser',
              destroyedAt: matchId,
            },
          ],
          heatEnd: 0,
          ammoRemaining: {},
          combatReady: true,
          lastCombatOutcomeId: matchId,
          lastUpdated: currentDate,
        },
      },
    });

    return { campaignId, auditDate, matchId };
  });
}

test.describe('Campaign Flow - Creation', () => {
  test(
    'creates a rostered campaign through the wizard',
    { tag: ['@campaign', '@smoke'] },
    async ({ page }) => {
      const campaignId = await createRosteredCampaignViaWizard(page);
      expect(campaignId).toBeTruthy();
      await expect(page).toHaveURL(
        new RegExp(`/gameplay/campaigns/${campaignId}$`),
      );
    },
  );

  test(
    'requires a campaign name before leaving the first wizard step',
    { tag: ['@campaign', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay/campaigns/create');
      await waitForE2EHydration(page);

      await expect(page.getByTestId('campaign-name-input')).toBeVisible();
      await page.getByTestId('wizard-next-btn').click();

      await expect(page).toHaveURL(/\/gameplay\/campaigns\/create/);
      await expect(page.getByTestId('campaign-name-input')).toBeVisible();
    },
  );
});

test.describe('Campaign Flow - Roster', () => {
  test(
    'displays the rostered unit on campaign detail',
    { tag: ['@campaign', '@smoke'] },
    async ({ page }) => {
      const campaignId = await createRosteredCampaignViaWizard(page);

      await page.reload({ waitUntil: 'networkidle' });
      await waitForE2EHydration(page);
      await expect(page).toHaveURL(
        new RegExp(`/gameplay/campaigns/${campaignId}$`),
      );
      await expect(page.getByTestId('roster-unit-card')).toContainText(
        'Light Mech',
      );
      await expect(page.getByTestId('roster-unit-card')).toContainText('Ready');
    },
  );
});

test.describe('Campaign Flow - Mission Generation', () => {
  test(
    'generates a mission and opens the linked encounter',
    { tag: ['@campaign', '@smoke'] },
    async ({ page }) => {
      const campaignId = await createRosteredCampaignViaWizard(page);

      await expect(page.getByTestId('generate-mission-btn')).toBeEnabled();
      await page.getByTestId('generate-mission-btn').click();

      await page.waitForURL(
        (url) =>
          url.pathname.startsWith('/gameplay/encounters/') &&
          url.searchParams.get('campaignId') === campaignId &&
          Boolean(url.searchParams.get('missionId')),
        { timeout: 30_000 },
      );
      await expect(page.getByTestId('encounter-detail-page')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText('Configuration Required')).toBeVisible();
      await expect(
        page.getByText('Player force must be selected'),
      ).toBeVisible();
      await expect(
        page.getByText('Opponent force or OpFor configuration is required'),
      ).toBeVisible();
      await expect(page.getByTestId('launch-encounter-btn')).toBeDisabled();
    },
  );

  test(
    'accepts a market contract and reloads the accepted mission',
    { tag: ['@campaign', '@smoke'] },
    async ({ page }) => {
      const campaignId = await createRosteredCampaignViaWizard(page);
      const { offerId, offerName } = await acceptFirstMarketContract(
        page,
        campaignId,
      );

      const accepted = await getCampaignContractSnapshot(page);
      expect(accepted.campaignId).toBe(campaignId);
      expect(accepted.rosterUnitNames).toContain('Light Mech');
      expect(accepted.rosterPilotNames).toContain('MechWarrior 1');
      expect(accepted.missionIds).toContain(offerId);
      expect(accepted.missionNames).toContain(offerName);
      expect(accepted.missionStatuses).toContain('Active');
      expect(accepted.contractMarketOfferIds).not.toContain(offerId);

      await page.goto(`/gameplay/campaigns/${campaignId}/missions`);
      await expect(page.getByTestId(`mission-card-${offerId}`)).toContainText(
        offerName,
        { timeout: 20_000 },
      );
      await page.reload({ waitUntil: 'networkidle' });
      await waitForE2EHydration(page);
      await expect(page.getByTestId(`mission-card-${offerId}`)).toContainText(
        offerName,
        { timeout: 20_000 },
      );
    },
  );
});

test.describe('Campaign Flow - Damage Carry-Forward', () => {
  test(
    'shows damaged roster state, audit entry, repair queue, and salvage report',
    { tag: ['@campaign', '@smoke'] },
    async ({ page }) => {
      const seeded = await seedDamagedPostBattleCampaign(page);

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}`);
      await expect(page.getByTestId('campaign-dashboard')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('roster-unit-card')).toContainText(
        'Atlas AS7-D',
      );
      await expect(page.getByTestId('roster-unit-card')).toContainText(
        'Damaged',
      );
      await expect(page.getByTestId('daily-battle-audit-feed')).toBeVisible();
      await expect(
        page.getByTestId(`audit-entry-${seeded.auditDate}`),
      ).toContainText('Repairs: 1');
      await expect(
        page.getByTestId(`audit-match-link-${seeded.matchId}`),
      ).toBeVisible();

      const postBattleState = await page.evaluate(() => {
        const campaign = (
          window as unknown as {
            __ZUSTAND_STORES__?: {
              campaign?: { getState: () => { getCampaign?: () => any } };
            };
          }
        ).__ZUSTAND_STORES__?.campaign
          ?.getState()
          .getCampaign?.();

        return {
          repairTicketCount: campaign?.repairQueue?.length ?? 0,
          salvageReportCount: Object.keys(campaign?.salvageReports ?? {})
            .length,
          auditEntryCount: campaign?.dailyBattleAudit?.length ?? 0,
        };
      });

      expect(postBattleState).toEqual({
        repairTicketCount: 1,
        salvageReportCount: 1,
        auditEntryCount: 1,
      });
    },
  );
});

test.describe('Campaign Flow - Store State', () => {
  test(
    'exposes the created campaign in the campaign store',
    { tag: ['@campaign', '@smoke'] },
    async ({ page }) => {
      const campaignId = await createRosteredCampaignViaWizard(page);
      const state = await getStoreState<CampaignStoreState>(page, 'campaign');

      expect(state).toBeTruthy();
      expect(state.campaign).toBeDefined();
      expect(state.campaign?.id).toBe(campaignId);
    },
  );

  test(
    'saves a wizard campaign and reloads it from the server campaign list',
    { tag: ['@campaign', '@smoke', '@strict'] },
    async ({ page }) => {
      const campaignId = await createRosteredCampaignViaWizard(page);
      const saved = await saveCampaignThroughDashboard(page, campaignId);

      await clearLiveCampaignClientState(page);
      await page.goto('/gameplay/campaigns');
      await waitForE2EHydration(page);

      const serverBackedCard = page.getByTestId(`campaign-card-${campaignId}`);
      await expect(serverBackedCard).toContainText(saved.name, {
        timeout: 20_000,
      });
      await expect(serverBackedCard).toContainText('Faction: mercenary');

      await serverBackedCard.click();
      await page.waitForURL(new RegExp(`/gameplay/campaigns/${campaignId}$`), {
        timeout: 20_000,
      });
      await expect(page.getByTestId('campaign-dashboard')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('campaign-save-status-card')).toBeVisible();

      const reloaded = await page.evaluate(() => {
        const stores = (
          window as unknown as {
            __ZUSTAND_STORES__?: {
              campaign?: {
                getState: () => {
                  campaign?: { id?: unknown; name?: unknown };
                };
              };
            };
          }
        ).__ZUSTAND_STORES__;
        const campaign = stores?.campaign?.getState().campaign;
        return {
          id: typeof campaign?.id === 'string' ? campaign.id : null,
          name: typeof campaign?.name === 'string' ? campaign.name : null,
        };
      });
      expect(reloaded).toEqual({ id: campaignId, name: saved.name });

      const serverRecord = await page.evaluate(async (id) => {
        const response = await fetch(`/api/campaigns/${id}`);
        if (!response.ok) {
          throw new Error(`server responded ${response.status}`);
        }
        const record = (await response.json()) as {
          campaignId?: unknown;
          version?: unknown;
        };
        return {
          campaignId: record.campaignId,
          version: record.version,
        };
      }, campaignId);
      expect(serverRecord).toEqual({
        campaignId,
        version: saved.version,
      });
    },
  );
});
