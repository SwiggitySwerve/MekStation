import { expect, test, type Page } from '@playwright/test';

import { createTestCampaign, deleteCampaign } from './fixtures/campaign';
import { assertNoMekStationLoading } from './helpers/wait';

test.setTimeout(120_000);

const GM_LEDGER_NAVIGATION_TIMEOUT_MS = 60_000;

test.beforeEach(async ({ page }) => {
  page.setDefaultNavigationTimeout(GM_LEDGER_NAVIGATION_TIMEOUT_MS);
});

async function waitForCampaignStoreExposure(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      Boolean(
        (
          window as unknown as {
            __ZUSTAND_STORES__?: { campaign?: unknown };
          }
        ).__ZUSTAND_STORES__?.campaign,
      ),
    undefined,
    { timeout: 15_000 },
  );
}

type CampaignTimeState = {
  readonly currentDate: string | null;
  readonly timeCascadeEventCount: number;
};

type CampaignLedgerSnapshot = {
  readonly balance: number | null;
  readonly gmInterventionEventCount: number;
  readonly playerSummaries: readonly string[];
};

type CampaignBaseFixSnapshot = {
  readonly repairStatus?: string;
  readonly repairRemainingHours?: number;
  readonly salvageProcessed?: boolean;
  readonly unitCombatReady?: boolean;
  readonly unitLastUpdated?: string;
  readonly gmInterventionEventFamilies: readonly string[];
};

type SavedCampaignRecord = {
  readonly version: number;
};

async function clearLiveCampaignClientState(page: Page): Promise<void> {
  await page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            setState: (state: Record<string, unknown>) => void;
          };
          campaignRoster?: {
            getState: () => { reset?: () => void };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error('Campaign store not exposed');
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
              campaign?: { getState: () => { campaign?: unknown } };
            };
          }
        ).__ZUSTAND_STORES__;
        return stores?.campaign?.getState().campaign ?? null;
      }),
    )
    .toBeNull();
}

async function deleteServerCampaign(
  page: Page,
  campaignId: string,
): Promise<void> {
  await page.evaluate(async (id) => {
    const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete server campaign: ${response.status}`);
    }
  }, campaignId);
}

async function readClientLedgerSnapshot(
  page: Page,
): Promise<CampaignLedgerSnapshot> {
  return page.evaluate(() => {
    function readBalance(value: unknown): number | null {
      if (typeof value === 'number') return value;
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as { amount?: unknown }).amount === 'number'
      ) {
        return (value as { amount: number }).amount;
      }
      return null;
    }

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            getState: () => {
              getCampaign?: () => {
                finances?: { balance?: { amount?: unknown } };
                gmInterventionEvents?: readonly {
                  publicSummary?: unknown;
                }[];
              } | null;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;
    const campaign = stores?.campaign?.getState().getCampaign?.();
    const events = campaign?.gmInterventionEvents ?? [];

    return {
      balance: readBalance(campaign?.finances?.balance),
      gmInterventionEventCount: events.length,
      playerSummaries: events
        .map((event) => event.publicSummary)
        .filter((summary): summary is string => typeof summary === 'string'),
    };
  });
}

async function readServerLedgerSnapshot(
  page: Page,
  campaignId: string,
): Promise<CampaignLedgerSnapshot> {
  return page.evaluate(async (id) => {
    function readBalance(value: unknown): number | null {
      if (typeof value === 'number') return value;
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as { amount?: unknown }).amount === 'number'
      ) {
        return (value as { amount: number }).amount;
      }
      return null;
    }

    const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error(`server responded ${response.status}`);
    }
    const record = (await response.json()) as {
      body?: {
        finances?: { balance?: { amount?: unknown } };
        gmInterventionEvents?: readonly {
          publicSummary?: unknown;
        }[];
      };
    };
    const events = record.body?.gmInterventionEvents ?? [];

    return {
      balance: readBalance(record.body?.finances?.balance),
      gmInterventionEventCount: events.length,
      playerSummaries: events
        .map((event) => event.publicSummary)
        .filter((summary): summary is string => typeof summary === 'string'),
    };
  }, campaignId);
}

async function saveCampaignThroughDashboard(
  page: Page,
  campaignId: string,
): Promise<SavedCampaignRecord> {
  await page.goto(`/gameplay/campaigns/${campaignId}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('campaign-save-now-btn')).toBeEnabled({
    timeout: 20_000,
  });

  const [saveResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes(`/api/campaigns/${campaignId}`) &&
        [200, 409].includes(response.status()),
      { timeout: 20_000 },
    ),
    page.getByTestId('campaign-save-now-btn').click(),
  ]);

  const finalSaveResponse =
    saveResponse.status() === 409
      ? await resolveSaveConflictKeepLocal(page, campaignId)
      : saveResponse;
  const saved = (await finalSaveResponse.json()) as {
    version?: unknown;
  };

  expect(typeof saved.version).toBe('number');
  await expect(page.getByTestId('campaign-last-saved')).not.toContainText(
    'Never saved',
  );

  return {
    version: saved.version as number,
  };
}

async function resolveSaveConflictKeepLocal(page: Page, campaignId: string) {
  await expect(
    page.getByTestId('campaign-conflict-keep-local-btn'),
  ).toBeVisible({
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
    page.getByTestId('campaign-conflict-keep-local-btn').click(),
  ]);
  return saveResponse;
}

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

async function seedCampaignBaseFixState(page: Page): Promise<void> {
  await waitForCampaignStoreExposure(page);

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
    const candidate = {
      source: 'part',
      unitId: 'enemy-1',
      designation: 'Medium Laser',
      destroyedFromBattle: 'match-1',
      finalStatus: 'destroyed',
      damageLevel: 'moderate',
      originalValue: 40_000,
      recoveredValue: 20_000,
      recoveryPercentage: 0.5,
      repairCostEstimate: 2_000,
      partId: 'medium-laser',
      location: 'RA',
      disposition: 'mercenary',
      status: 'awarded',
    };

    store.getState().updateCampaign({
      updatedAt: '3025-02-01T00:00:00.000Z',
      repairQueue: [
        {
          ticketId: 'ticket-1',
          unitId: 'unit-1',
          kind: 'armor',
          location: 'CT',
          pointsToRestore: 8,
          expectedHours: 4,
          remainingHours: 4,
          partsRequired: [],
          source: 'combat',
          matchId: 'match-1',
          createdAt: '3025-02-01T00:00:00.000Z',
          status: 'queued',
        },
      ],
      salvageAllocations: {
        'match-1': {
          pool: {
            battleId: 'match-1',
            contractId: 'contract-1',
            candidates: [candidate],
            totalEstimatedValue: 20_000,
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
            candidates: [candidate],
            totalValue: 20_000,
            estimatedRepairCost: 2_000,
          },
          splitMethod: 'contract',
          processed: false,
        },
      },
      unitCombatStates: {
        'unit-1': {
          unitId: 'unit-1',
          currentArmorPerLocation: {
            CT: 20,
            RA: 8,
          },
          currentStructurePerLocation: {
            CT: 10,
            RA: 0,
          },
          destroyedLocations: ['RA'],
          destroyedComponents: [],
          heatEnd: 0,
          ammoRemaining: {},
          combatReady: false,
          lastCombatOutcomeId: 'match-1',
          lastUpdated: '3025-02-01T00:00:00.000Z',
        },
      },
    });
  });
}

async function readCampaignBaseFixSnapshot(
  page: Page,
): Promise<CampaignBaseFixSnapshot> {
  return page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            getState: () => {
              getCampaign?: () => {
                repairQueue?: readonly {
                  status?: unknown;
                  remainingHours?: unknown;
                }[];
                salvageAllocations?: Record<string, { processed?: unknown }>;
                unitCombatStates?: Record<
                  string,
                  {
                    combatReady?: unknown;
                    lastUpdated?: unknown;
                  }
                >;
                gmInterventionEvents?: readonly {
                  family?: unknown;
                }[];
              } | null;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;
    const campaign = stores?.campaign?.getState().getCampaign?.();
    const repair = campaign?.repairQueue?.[0];
    const salvage = campaign?.salvageAllocations?.['match-1'];
    const unit = campaign?.unitCombatStates?.['unit-1'];

    return {
      repairStatus:
        typeof repair?.status === 'string' ? repair.status : undefined,
      repairRemainingHours:
        typeof repair?.remainingHours === 'number'
          ? repair.remainingHours
          : undefined,
      salvageProcessed:
        typeof salvage?.processed === 'boolean' ? salvage.processed : undefined,
      unitCombatReady:
        typeof unit?.combatReady === 'boolean' ? unit.combatReady : undefined,
      unitLastUpdated:
        typeof unit?.lastUpdated === 'string' ? unit.lastUpdated : undefined,
      gmInterventionEventFamilies: (campaign?.gmInterventionEvents ?? [])
        .map((event) => event.family)
        .filter((family): family is string => typeof family === 'string'),
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
      persist: true,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });
      await assertNoMekStationLoading(page);

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
      await assertNoMekStationLoading(page);
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
      persist: true,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });
      await assertNoMekStationLoading(page);
      await page.getByTestId('gm-ledger-preview-btn').click();
      await page.getByTestId('gm-ledger-approve-btn').click();
      await expect(page.getByTestId('gm-ledger-approval-status')).toContainText(
        'Approved and applied',
      );

      await stampGuestCoopSession(page);
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });
      await assertNoMekStationLoading(page);

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

  test('saves and reloads a player-safe merchant reversal from the server campaign list', async ({
    page,
  }) => {
    let campaignId = '';
    const campaignName = `GM Ledger Server Persistence ${Date.now()}`;

    await page.goto('/gameplay/campaigns', { waitUntil: 'domcontentloaded' });
    campaignId = await createTestCampaign(page, {
      name: campaignName,
      cBills: 1_000_000,
      persist: true,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });
      await assertNoMekStationLoading(page);

      await page.getByTestId('gm-ledger-preview-btn').click();
      await page.getByTestId('gm-ledger-approve-btn').click();
      await expect(page.getByTestId('gm-ledger-approval-status')).toContainText(
        'Approved and applied',
      );

      await expect
        .poll(async () => readClientLedgerSnapshot(page))
        .toMatchObject({
          balance: 997_500,
          gmInterventionEventCount: 1,
          playerSummaries: ['Merchant charge corrected by -2,500.00 C-bills.'],
        });

      const saved = await saveCampaignThroughDashboard(page, campaignId);
      expect(saved.version).toBeGreaterThan(0);
      await expect
        .poll(async () => readServerLedgerSnapshot(page, campaignId))
        .toMatchObject({
          balance: 997_500,
          gmInterventionEventCount: 1,
          playerSummaries: ['Merchant charge corrected by -2,500.00 C-bills.'],
        });

      await clearLiveCampaignClientState(page);
      await page.goto('/gameplay/campaigns', { waitUntil: 'domcontentloaded' });

      const serverBackedCard = page.getByTestId(`campaign-card-${campaignId}`);
      await expect(serverBackedCard).toContainText(campaignName, {
        timeout: 20_000,
      });
      await serverBackedCard.click();
      await page.waitForURL(new RegExp(`/gameplay/campaigns/${campaignId}$`), {
        timeout: 20_000,
      });

      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });
      await assertNoMekStationLoading(page);
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
      await expect
        .poll(async () => readClientLedgerSnapshot(page))
        .toMatchObject({
          balance: 997_500,
          gmInterventionEventCount: 1,
          playerSummaries: ['Merchant charge corrected by -2,500.00 C-bills.'],
        });
    } finally {
      if (campaignId) {
        await deleteServerCampaign(page, campaignId).catch(() => undefined);
        await deleteCampaign(page, campaignId).catch(() => undefined);
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
      persist: true,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });
      await assertNoMekStationLoading(page);

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

  test('previews and applies repair, salvage, and unit reload corrections', async ({
    page,
  }) => {
    let campaignId = '';

    await page.goto('/gameplay/campaigns', { waitUntil: 'domcontentloaded' });
    campaignId = await createTestCampaign(page, {
      name: 'GM Base Fix Browser Proof',
      cBills: 1_000_000,
      persist: true,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });
      await assertNoMekStationLoading(page);
      await seedCampaignBaseFixState(page);

      await page.getByTestId('gm-ledger-repair-preview-btn').click();
      await expect(page.getByTestId('gm-ledger-preview-status')).toContainText(
        'ready',
      );
      await expect(
        page.getByTestId('gm-ledger-preview-state-summary'),
      ).toContainText('Repair ticket ticket-1: queued, 4h remaining');
      await expect(
        page.getByTestId('gm-ledger-preview-state-summary'),
      ).toContainText('Repair ticket ticket-1: completed, 0h remaining');
      await page.getByTestId('gm-ledger-approve-btn').click();
      await expect
        .poll(async () => readCampaignBaseFixSnapshot(page))
        .toMatchObject({
          repairStatus: 'completed',
          repairRemainingHours: 0,
        });

      await page.getByTestId('gm-ledger-salvage-preview-btn').click();
      await expect(
        page.getByTestId('gm-ledger-preview-state-summary'),
      ).toContainText('Salvage allocation match-1: processed=false');
      await expect(
        page.getByTestId('gm-ledger-preview-state-summary'),
      ).toContainText('Salvage allocation match-1: processed=true');
      await page.getByTestId('gm-ledger-approve-btn').click();
      await expect
        .poll(async () => readCampaignBaseFixSnapshot(page))
        .toMatchObject({
          salvageProcessed: true,
        });

      await page.getByTestId('gm-ledger-unit-reload-preview-btn').click();
      await expect(
        page.getByTestId('gm-ledger-preview-state-summary'),
      ).toContainText('Unit unit-1: combatReady=false');
      await expect(
        page.getByTestId('gm-ledger-preview-state-summary'),
      ).toContainText('Unit unit-1: combatReady=true');
      await page.getByTestId('gm-ledger-approve-btn').click();
      await expect
        .poll(async () => readCampaignBaseFixSnapshot(page))
        .toMatchObject({
          unitCombatReady: true,
          unitLastUpdated: expect.any(String),
          gmInterventionEventFamilies: [
            'repair-ticket',
            'salvage-allocation',
            'base-unit-state',
          ],
        });

      await expect(page.getByTestId('gm-ledger-player-log')).toContainText(
        'Repair ticket ticket-1 corrected by the GM.',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).toContainText(
        'Salvage allocation match-1 corrected by the GM.',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).toContainText(
        'Unit unit-1 reload reconciliation recorded by the GM.',
      );
      await expect(page.getByTestId('gm-ledger-player-log')).not.toContainText(
        /Hidden repair|Hidden salvage|Hidden unit reload|GM-only/i,
      );
      await expect(page.getByTestId('gm-ledger-private-log')).toContainText(
        'Hidden repair correction',
      );
      await expect(page.getByTestId('gm-ledger-private-log')).toContainText(
        'Hidden salvage correction',
      );
      await expect(page.getByTestId('gm-ledger-private-log')).toContainText(
        'Hidden unit reload reconciliation',
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
      persist: true,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });
      await assertNoMekStationLoading(page);

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
      await assertNoMekStationLoading(page);
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
      persist: true,
    });

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
        waitUntil: 'domcontentloaded',
      });
      await assertNoMekStationLoading(page);

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
