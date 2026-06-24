/**
 * Strict Long-Campaign Browser Signoff
 *
 * Seeds a deterministic 10-contract campaign state through the E2E-exposed
 * campaign stores, then verifies the browser can reload and inspect the
 * accumulated campaign checkpoints that the headless stability lane names:
 * base, starmap, medical, salvage, repair, finances, and campaign log.
 *
 * @tags @campaign @economy @long-campaign @strict
 */

import { expect, test, type Page } from '@playwright/test';

interface SeededLongCampaign {
  readonly campaignId: string;
  readonly initialDate: string;
  readonly injuredPilotId: string;
  readonly repairTicketId: string;
  readonly salvagePartId: string;
  readonly finalLogId: string;
}

test.setTimeout(120_000);

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

async function seedLongCampaign(page: Page): Promise<SeededLongCampaign> {
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
      'E2E Long Campaign Signoff Co.',
      'mercenary',
      { startingFunds: 6_000_000 },
    );

    const initialDate = '3025-08-17T00:00:00.000Z';
    const completedContracts = Array.from({ length: 10 }, (_, index) => {
      const number = index + 1;
      const padded = String(number).padStart(3, '0');
      const id = `long-contract-${padded}`;
      return {
        id,
        missionNumber: number,
        name: `E2E Long Contract ${number}`,
        encounterId: `long-encounter-${padded}`,
        scenarioId: `long-scenario-${padded}`,
        completedAt: `3025-08-${String(7 + number).padStart(2, '0')}T12:00:00.000Z`,
        turnsPlayed: 4 + number,
      };
    });

    const missionMap = new Map(
      completedContracts.map((contract) => [
        contract.id,
        {
          id: contract.id,
          name: contract.name,
          status: 'Success',
          type: 'mission',
          systemId: numberToSystem(contract.missionNumber),
          scenarioIds: [contract.scenarioId],
          description: `Resolved browser-signoff contract ${contract.missionNumber}`,
          briefing: 'Deterministic long-campaign browser signoff mission.',
          startDate: contract.completedAt.slice(0, 10),
          endDate: contract.completedAt.slice(0, 10),
          createdAt: initialDate,
          updatedAt: contract.completedAt,
        },
      ]),
    );

    const unitId = 'unit-long-atlas';
    const injuredPilotId = 'pilot-long-injured';
    const repairTicketId = 'ticket-long-structure-rt';
    const salvagePartId = 'long-salvage-gyro';
    const finalLogId = 'log-long-contract-010';
    const repairTickets = [
      {
        ticketId: repairTicketId,
        unitId,
        kind: 'structure',
        location: 'RT',
        expectedHours: 16,
        remainingHours: 16,
        partsRequired: [{ partId: 'structure-rt', quantity: 1, matched: true }],
        source: 'combat',
        matchId: 'long-match-010',
        createdAt: initialDate,
        status: 'queued',
      },
      {
        ticketId: 'ticket-long-armor-ct',
        unitId,
        kind: 'armor',
        location: 'CT',
        expectedHours: 8,
        remainingHours: 8,
        partsRequired: [],
        source: 'combat',
        matchId: 'long-match-009',
        createdAt: initialDate,
        status: 'queued',
      },
    ];
    const salvageCandidate = {
      source: 'component',
      unitId: 'enemy-long-catapult',
      designation: 'Catapult Salvage Bundle',
      destroyedFromBattle: 'long-match-010',
      finalStatus: 'destroyed',
      damageLevel: 'moderate',
      originalValue: 1_600_000,
      recoveredValue: 450_000,
      recoveryPercentage: 0.28,
      repairCostEstimate: 80_000,
      partId: salvagePartId,
      disposition: 'mercenary',
      status: 'pending',
    };

    stores.campaignRoster.setState?.({
      campaignId,
      units: [
        {
          unitId,
          unitName: 'Atlas AS7-D Longrunner',
          chassis: 'Atlas',
          model: 'AS7-D',
          pilotId: injuredPilotId,
          readiness: 'Damaged',
        },
        {
          unitId: 'unit-long-griffin',
          unitName: 'Griffin GRF-1N',
          chassis: 'Griffin',
          model: 'GRF-1N',
          pilotId: 'pilot-long-griffin',
          readiness: 'Active',
        },
      ],
      pilots: [
        {
          pilotId: injuredPilotId,
          pilotName: 'Tara Bishop',
          status: 'wounded',
          wounds: 1,
          recoveryTime: 5,
          xp: 12,
          campaignXpEarned: 12,
          campaignKills: 4,
          campaignMissions: 10,
          primaryRole: 'Pilot',
          rankIndex: 1,
          hireDate: new Date('3025-07-01T00:00:00.000Z'),
          assignedUnitId: unitId,
        },
        {
          pilotId: 'pilot-long-griffin',
          pilotName: 'Milo Voss',
          status: 'active',
          wounds: 0,
          recoveryTime: 0,
          xp: 9,
          campaignXpEarned: 9,
          campaignKills: 2,
          campaignMissions: 10,
          primaryRole: 'Pilot',
          rankIndex: 0,
          hireDate: new Date('3025-07-01T00:00:00.000Z'),
          assignedUnitId: 'unit-long-griffin',
        },
      ],
      missions: completedContracts.map((contract) => ({
        id: contract.id,
        missionNumber: contract.missionNumber,
        name: contract.name,
        result: 'victory',
        encounterId: contract.encounterId,
        campaignId,
        deployedUnitIds: [unitId, 'unit-long-griffin'],
        completedAt: contract.completedAt,
        turnsPlayed: contract.turnsPlayed,
      })),
      activeMissionId: null,
      missionCount: completedContracts.length,
    });

    campaignState.updateCampaign({
      currentDate: new Date(initialDate),
      currentSystemId: 'terra',
      missions: missionMap,
      activeContract: {
        id: 'long-contract-010',
        name: 'E2E Long Contract 10',
        employerFactionId: 'draconis-combine',
        deadlineDay: 12,
        objectivesCompleted: 10,
        objectivesTotal: 10,
      },
      medical: {
        injuries: [
          {
            pilotId: injuredPilotId,
            pilotName: 'Tara Bishop',
            daysToRecovery: 5,
          },
        ],
      },
      repairQueue: repairTickets,
      repairBay: { tickets: repairTickets },
      salvageAllocations: {
        'long-match-010': {
          pool: {
            battleId: 'long-match-010',
            contractId: 'long-contract-010',
            candidates: [salvageCandidate],
            totalEstimatedValue: 450_000,
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
            totalValue: 450_000,
            estimatedRepairCost: 80_000,
          },
          splitMethod: 'contract',
          processed: false,
        },
      },
      salvageReports: {
        'long-match-010': {
          battleId: 'long-match-010',
          contractId: 'long-contract-010',
          totalCandidates: 1,
          totalValue: 450_000,
        },
      },
      campaignInventory: {
        campaignId,
        generatedAt: initialDate,
        repairBay: repairTickets.map((ticket) => ({
          ...ticket,
          partsReady: true,
        })),
        salvageBay: [
          {
            partId: salvagePartId,
            sourceUnitId: 'enemy-long-catapult',
            designation: 'Catapult Salvage Bundle',
            recoveredValue: 450_000,
            disposition: 'mercenary',
            status: 'pending',
          },
        ],
        medicalBay: [
          {
            pilotId: injuredPilotId,
            pilotName: 'Tara Bishop',
            daysToRecovery: 5,
          },
        ],
        summary: {
          repairTicketCount: repairTickets.length,
          totalRepairHours: 24,
          salvageValueTotal: 450_000,
          pilotsInMedical: 1,
        },
      },
      unitCombatStates: {
        [unitId]: {
          unitId,
          currentArmorPerLocation: { CT: 16, RT: 8, LT: 12 },
          currentStructurePerLocation: { CT: 30, RT: 12, LT: 16 },
          destroyedLocations: [],
          destroyedComponents: [],
          heatEnd: 2,
          ammoRemaining: {},
          combatReady: true,
          lastCombatOutcomeId: 'long-match-010',
          lastUpdated: initialDate,
        },
      },
    });

    const activityLog = completedContracts.map((contract) => {
      const category = contract.missionNumber % 2 === 0 ? 'battle' : 'finances';
      return {
        id:
          contract.missionNumber === 10
            ? finalLogId
            : `log-long-contract-${String(contract.missionNumber).padStart(3, '0')}`,
        timestamp: contract.completedAt,
        campaignDay: 30 + contract.missionNumber,
        category,
        message: `${contract.name} resolved with browser-visible campaign effects.`,
        payload:
          category === 'battle'
            ? {
                missionId: contract.id,
                missionName: contract.name,
                result: 'victory',
                xpAwarded: 2,
              }
            : {
                event: 'contract-payout',
                amount: 100_000 + contract.missionNumber * 1_000,
                currency: 'C-bills',
                memo: contract.name,
              },
      };
    });
    activityLog.forEach((entry) => {
      campaignState.appendActivityLogEntry(entry);
    });

    return {
      campaignId,
      initialDate,
      injuredPilotId,
      repairTicketId,
      salvagePartId,
      finalLogId,
    };

    function numberToSystem(number: number): string {
      return number % 2 === 0 ? 'terra' : 'new-avalon';
    }
  });
}

async function readLongCampaignState(page: Page): Promise<{
  readonly campaignMissionCount: number;
  readonly rosterMissionCount: number;
  readonly activityLogCount: number;
  readonly currentDate: string | null;
  readonly repairTicketCount: number;
  readonly salvageAllocationCount: number;
  readonly currentSystemId: string | null;
}> {
  return page.evaluate(() => {
    type StoreApi = { getState: () => Record<string, any> };
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
    const campaignState = resolveStore(stores.campaign).getState();
    const campaign = campaignState.getCampaign?.();
    const rosterState = stores.campaignRoster.getState();
    return {
      campaignMissionCount: campaign?.missions?.size ?? 0,
      rosterMissionCount: rosterState.missionCount ?? 0,
      activityLogCount: campaignState.activityLog?.length ?? 0,
      currentDate: campaign?.currentDate?.toISOString?.() ?? null,
      repairTicketCount: campaign?.repairQueue?.length ?? 0,
      salvageAllocationCount: Object.keys(campaign?.salvageAllocations ?? {})
        .length,
      currentSystemId: campaign?.currentSystemId ?? null,
    };
  });
}

test.describe('long campaign browser signoff', () => {
  test(
    'reloads and inspects accumulated 10-contract campaign checkpoints',
    { tag: ['@campaign', '@economy', '@long-campaign', '@strict'] },
    async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await page.goto('/gameplay/campaigns');
      const seeded = await seedLongCampaign(page);

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}`);
      await expect(page.getByTestId('campaign-dashboard')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText('10 missions completed')).toBeVisible();
      await expect(page.getByTestId('mission-history-item')).toHaveCount(10);
      await expect(
        page.getByTestId('active-contract-objectives-progress'),
      ).toContainText('10 / 10 objectives');

      await page.reload({ waitUntil: 'networkidle' });
      await waitForCampaignStoresReady(page);
      await expect(page.getByTestId('campaign-dashboard')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('mission-history-item')).toHaveCount(10);
      expect(await readLongCampaignState(page)).toMatchObject({
        campaignMissionCount: 10,
        rosterMissionCount: 10,
        activityLogCount: 10,
        currentDate: seeded.initialDate,
        repairTicketCount: 2,
        salvageAllocationCount: 1,
        currentSystemId: 'terra',
      });

      await page.getByTestId('day-advance-one-day').click();
      await expect(page.getByTestId('day-advance-current-date')).not.toHaveText(
        '3025-08-17',
      );
      const afterAdvance = await readLongCampaignState(page);
      expect(afterAdvance.currentDate).toBe('3025-08-18T00:00:00.000Z');

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}/starmap`);
      await expect(page.getByTestId('starmap-travel-controls')).toBeVisible();
      await expect(page.getByTestId('starmap-current-system')).toContainText(
        'Terra',
      );
      await expect(page.getByTestId('starmap-container')).toBeVisible();

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}/medical-bay`);
      await expect(page.getByTestId('medical-bay-list')).toBeVisible();
      await expect(
        page.getByTestId(`medical-bay-row-${seeded.injuredPilotId}`),
      ).toContainText('Tara Bishop');

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}/repair-bay`);
      await expect(page.getByTestId('repair-bay-queue')).toBeVisible();
      await expect(
        page.getByTestId(`repair-ticket-${seeded.repairTicketId}`),
      ).toContainText('16h');

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}/salvage`);
      await expect(page.getByTestId('salvage-panel')).toBeVisible();
      await expect(
        page.getByTestId(`salvage-row-${seeded.salvagePartId}`),
      ).toContainText('Catapult Salvage Bundle');
      await page.getByTestId(`salvage-accept-${seeded.salvagePartId}`).click();
      await expect(page.getByTestId('salvage-value-total')).toContainText(
        '450,000 C-Bills',
      );

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}/finances`);
      await expect(page.getByTestId('finances-panel')).toBeVisible();
      await expect(page.getByTestId('finances-balance')).toContainText(
        'C-bills',
      );

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}/log`);
      await expect(page.getByTestId('activity-log-table')).toBeVisible();
      await expect(
        page.getByTestId(`activity-log-row-${seeded.finalLogId}`),
      ).toContainText('E2E Long Contract 10');

      await page.reload({ waitUntil: 'networkidle' });
      await waitForCampaignStoresReady(page);
      await expect(
        page.getByTestId(`activity-log-row-${seeded.finalLogId}`),
      ).toContainText('E2E Long Contract 10');

      expect(pageErrors).toEqual([]);
    },
  );
});
