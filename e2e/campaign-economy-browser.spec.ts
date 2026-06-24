/**
 * Strict Campaign Economy Browser Proof
 *
 * This spec seeds deterministic post-battle campaign economy state through the
 * E2E-exposed stores, then verifies the real browser routes render and mutate
 * repair, salvage, finances, and day-advance state. It complements the
 * headless long-campaign stability lane by proving the player-facing campaign
 * economy pages can see and act on the same state.
 *
 * @tags @campaign @economy @strict
 */

import { expect, test, type Page } from '@playwright/test';

interface SeededCampaign {
  campaignId: string;
  currentDate: string;
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
    { timeout: 15_000 },
  );
}

async function seedPostBattleCampaign(page: Page): Promise<SeededCampaign> {
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
      'E2E Campaign Economy Co.',
      'mercenary',
      { startingFunds: 2_500_000 },
    );
    const baseCampaign = campaignState.getCampaign();
    if (!baseCampaign) {
      throw new Error('Campaign was not created');
    }

    const currentDate = '3025-01-01T00:00:00.000Z';
    const repairTickets = [
      {
        ticketId: 'ticket-armor-ct',
        unitId: 'unit-atlas',
        kind: 'armor',
        location: 'CT',
        expectedHours: 6,
        partsRequired: [],
        source: 'combat',
        matchId: 'match-economy-1',
        createdAt: currentDate,
        status: 'queued',
      },
      {
        ticketId: 'ticket-structure-lt',
        unitId: 'unit-atlas',
        kind: 'structure',
        location: 'LT',
        expectedHours: 12,
        partsRequired: [{ partId: 'structure-lt', quantity: 1, matched: true }],
        source: 'combat',
        matchId: 'match-economy-1',
        createdAt: currentDate,
        status: 'queued',
      },
    ];
    const repairBay = [
      {
        ticketId: 'ticket-armor-ct',
        unitId: 'unit-atlas',
        kind: 'armor',
        location: 'CT',
        expectedHours: 6,
        partsReady: true,
        status: 'queued',
      },
      {
        ticketId: 'ticket-structure-lt',
        unitId: 'unit-atlas',
        kind: 'structure',
        location: 'LT',
        expectedHours: 12,
        partsReady: true,
        status: 'queued',
      },
    ];
    const salvageCandidate = {
      source: 'unit',
      unitId: 'enemy-atlas',
      designation: 'Atlas AS7-D',
      destroyedFromBattle: 'match-economy-1',
      finalStatus: 'destroyed',
      damageLevel: 'heavy',
      originalValue: 8_000_000,
      recoveredValue: 2_000_000,
      recoveryPercentage: 0.25,
      repairCostEstimate: 500_000,
      partId: 'salvage-atlas',
      disposition: 'mercenary',
      status: 'pending',
    };
    const salvageBay = [
      {
        partId: 'salvage-atlas',
        sourceUnitId: 'enemy-atlas',
        designation: 'Atlas AS7-D',
        recoveredValue: 2_000_000,
        disposition: 'mercenary',
        status: 'pending',
      },
    ];
    const activityLog = [
      {
        id: 'activity-battle-economy-1',
        timestamp: currentDate,
        campaignDay: 1,
        category: 'battle',
        message: 'Victory at E2E Ridge produced salvage and repair work.',
      },
      {
        id: 'activity-finances-economy-1',
        timestamp: currentDate,
        campaignDay: 1,
        category: 'finances',
        message: 'Contract advance recorded before post-battle processing.',
      },
    ];

    stores.campaignRoster.setState?.({
      campaignId,
      units: [
        {
          unitId: 'unit-atlas',
          unitName: 'Atlas AS7-D',
          chassis: 'Atlas',
          model: 'AS7-D',
          pilotId: 'pilot-atlas',
          readiness: 'Damaged',
        },
      ],
      pilots: [
        {
          pilotId: 'pilot-atlas',
          pilotName: 'Morgan Kell',
          status: 'active',
          wounds: 0,
          recoveryTime: 0,
          xp: 0,
          campaignXpEarned: 0,
          campaignKills: 1,
          campaignMissions: 1,
          primaryRole: 'Pilot',
          rankIndex: 0,
          hireDate: new Date(currentDate),
          assignedUnitId: 'unit-atlas',
        },
      ],
      missions: [
        {
          id: 'mission-economy-1',
          missionNumber: 1,
          name: 'E2E Contract Battle',
          result: 'victory',
          encounterId: 'encounter-economy-1',
          campaignId,
          deployedUnitIds: ['unit-atlas'],
          completedAt: currentDate,
          turnsPlayed: 5,
        },
      ],
      activeMissionId: null,
      missionCount: 1,
    });

    campaignState.updateCampaign({
      currentDate: new Date(currentDate),
      activeContract: {
        id: 'contract-economy-1',
        name: 'E2E Garrison Contract',
        employerFactionId: 'lyran-commonwealth',
        deadlineDay: 18,
        objectivesCompleted: 1,
        objectivesTotal: 3,
      },
      repairQueue: repairTickets,
      repairBay: { tickets: repairTickets },
      salvageAllocations: {
        'match-economy-1': {
          pool: {
            battleId: 'match-economy-1',
            contractId: 'contract-economy-1',
            candidates: [salvageCandidate],
            totalEstimatedValue: 2_000_000,
            hostileTerritory: false,
          },
          employerAward: {
            side: 'employer',
            candidates: [],
            totalValue: 0,
            estimatedRepairCost: 0,
          },
          mercenaryAward: {
            side: 'mercenary',
            candidates: [salvageCandidate],
            totalValue: 2_000_000,
            estimatedRepairCost: 500_000,
          },
          splitMethod: 'contract',
          processed: false,
        },
      },
      salvageReports: {
        'match-economy-1': {
          battleId: 'match-economy-1',
          contractId: 'contract-economy-1',
          totalCandidates: 1,
          totalValue: 2_000_000,
        },
      },
      campaignInventory: {
        campaignId,
        generatedAt: currentDate,
        repairBay,
        salvageBay,
        medicalBay: [],
        summary: {
          repairTicketCount: 2,
          totalRepairHours: 18,
          salvageValueTotal: 2_000_000,
          pilotsInMedical: 0,
        },
      },
    });

    campaignStore.setState?.({ activityLog });

    return { campaignId, currentDate };
  });
}

test.describe('Campaign economy browser proof', () => {
  test(
    'routes post-battle state through dashboard, repair, salvage, finances, and day advance',
    { tag: ['@campaign', '@economy', '@strict'] },
    async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await page.goto('/gameplay/campaigns');
      const seeded = await seedPostBattleCampaign(page);

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}`);
      await expect(page.getByTestId('dashboard-card-finances')).toBeVisible();
      await expect(
        page.getByTestId('dashboard-card-day-advance'),
      ).toBeVisible();
      await expect(page.getByTestId('finances-balance')).toContainText(
        '2,500,000.00 C-bills',
      );
      const dateBefore = await page
        .getByTestId('day-advance-current-date')
        .textContent();
      expect(dateBefore).toBe('3025-01-01');

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}/repair-bay`);
      await expect(page.getByTestId('repair-bay-queue')).toBeVisible();
      await expect(
        page.getByTestId('repair-ticket-ticket-armor-ct'),
      ).toContainText('6h');
      await page.getByTestId('repair-ticket-down-ticket-armor-ct').click();
      const repairPriorities = await page.evaluate(() => {
        type StoreApi = { getState: () => Record<string, any> };
        type ExposedStore = StoreApi | (() => StoreApi);
        const resolveStore = (store: ExposedStore): StoreApi =>
          typeof (store as StoreApi).getState === 'function'
            ? (store as StoreApi)
            : (store as () => StoreApi)();
        const stores = (
          window as unknown as {
            __ZUSTAND_STORES__?: { campaign?: ExposedStore };
          }
        ).__ZUSTAND_STORES__;
        if (!stores?.campaign) {
          throw new Error('Campaign E2E store is not exposed');
        }
        const campaign = resolveStore(stores.campaign).getState().getCampaign();
        return (campaign?.repairQueue ?? []).map(
          (ticket: { ticketId: string; priority?: number }) => [
            ticket.ticketId,
            ticket.priority ?? null,
          ],
        );
      });
      expect(repairPriorities).toEqual([
        ['ticket-armor-ct', 1],
        ['ticket-structure-lt', 0],
      ]);

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}/salvage`);
      await expect(page.getByTestId('salvage-panel')).toBeVisible();
      await expect(page.getByTestId('salvage-row-salvage-atlas')).toContainText(
        'Atlas AS7-D',
      );
      await expect(page.getByTestId('salvage-value-total')).toContainText(
        '0 C-Bills',
      );
      await page.getByTestId('salvage-accept-salvage-atlas').click();
      await expect(page.getByTestId('salvage-value-total')).toContainText(
        '2,000,000 C-Bills',
      );

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}/finances`);
      await expect(page.getByTestId('finances-panel')).toBeVisible();
      await expect(page.getByTestId('finances-balance')).toContainText(
        '2,500,000.00 C-bills',
      );
      await page.getByTestId('loan-submit').click();
      await expect(page.getByTestId('finances-ledger')).toBeVisible();
      await expect(page.getByTestId('finances-loan-list')).toBeVisible();

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}`);
      await page.getByTestId('day-advance-one-day').click();
      await expect(page.getByTestId('day-advance-current-date')).not.toHaveText(
        '3025-01-01',
      );

      expect(pageErrors).toEqual([]);
    },
  );
});
