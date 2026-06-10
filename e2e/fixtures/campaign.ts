import { Page } from '@playwright/test';

/**
 * Waits for the campaign store to be exposed on `window.__ZUSTAND_STORES__`.
 *
 * Store exposure runs in a post-hydration `useEffect` (`_app.tsx` →
 * `exposeStoresForE2E()`), so a fixture call landing right after
 * `domcontentloaded` can race it — especially on slow CI machines where
 * hydration trails the navigation event by seconds. Poll on the real
 * condition (the store handle existing) instead of throwing immediately.
 */
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

/**
 * Options for creating a test campaign
 */
export interface TestCampaignOptions {
  /** Campaign name. Defaults to 'Test Campaign {timestamp}' */
  name?: string;
  /** Campaign description */
  description?: string;
  /** Unit IDs to include in roster */
  unitIds?: string[];
  /** Pilot IDs to include in roster */
  pilotIds?: string[];
  /** Starting C-Bills. Defaults to 1000000 */
  cBills?: number;
  /** Starting supplies. Defaults to 100 */
  supplies?: number;
  /** Starting morale (0-100). Defaults to 75 */
  morale?: number;
  /** Difficulty modifier. Defaults to 0 */
  difficultyModifier?: number;
}

/**
 * Creates a test campaign via the campaign store.
 * Requires the store to be exposed on window.__ZUSTAND_STORES__.campaign
 *
 * @param page - Playwright page object
 * @param options - Campaign creation options
 * @returns The created campaign ID
 * @throws Error if campaign store is not exposed
 *
 * @example
 * ```typescript
 * const campaignId = await createTestCampaign(page, {
 *   name: 'Iron Warriors Campaign',
 *   cBills: 5000000,
 * });
 * ```
 */
export async function createTestCampaign(
  page: Page,
  options: TestCampaignOptions = {},
): Promise<string> {
  // Exposure is post-hydration — poll before evaluating (CI race fix).
  await waitForCampaignStoreExposure(page);

  const campaignId = await page.evaluate((opts) => {
    type CampaignStoreApi = {
      getState: () => {
        createCampaign: (
          name: string,
          factionId: string,
          options?: { startingFunds?: number },
        ) => string;
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
      throw new Error(
        'Campaign store not exposed. Ensure window.__ZUSTAND_STORES__.campaign is set in your app for E2E testing.',
      );
    }

    const exposed = stores.campaign;
    const store = 'getState' in exposed ? exposed : exposed();

    const state = store.getState();
    const name = opts.name || `Test Campaign ${Date.now()}`;
    const campaignId = state.createCampaign(name, 'mercenary', {
      startingFunds: opts.cBills ?? 1000000,
    });

    const description = opts.description || 'E2E test campaign';
    state.updateCampaign({
      description,
      resources: {
        cBills: opts.cBills ?? 1000000,
        supplies: opts.supplies ?? 100,
        morale: opts.morale ?? 75,
        salvageParts: 0,
      },
    });

    return campaignId;
  }, options);

  return campaignId;
}

/**
 * Creates a test campaign with a full roster of pilots and units.
 *
 * @param page - Playwright page object
 * @param name - Campaign name
 * @param pilotIds - Array of pilot IDs to include
 * @param unitIds - Array of unit IDs to include
 * @returns The created campaign ID
 */
export async function createCampaignWithRoster(
  page: Page,
  name: string,
  pilotIds: string[],
  unitIds: string[],
): Promise<string> {
  return createTestCampaign(page, {
    name,
    pilotIds,
    unitIds,
    description: `Campaign with ${pilotIds.length} pilots and ${unitIds.length} units`,
  });
}

/**
 * Creates a minimal test campaign with default values.
 * Useful for tests that just need a campaign to exist.
 *
 * @param page - Playwright page object
 * @returns The created campaign ID
 */
export async function createMinimalCampaign(page: Page): Promise<string> {
  return createTestCampaign(page, {
    name: `Minimal Campaign ${Date.now()}`,
  });
}

/**
 * Retrieves a campaign by ID from the store.
 *
 * @param page - Playwright page object
 * @param campaignId - The campaign ID to retrieve
 * @returns The campaign object or null if not found
 */
export async function getCampaign(
  page: Page,
  campaignId: string,
): Promise<{
  id: string;
  name: string;
  status: string;
  description?: string;
} | null> {
  // Exposure is post-hydration — poll before evaluating (CI race fix).
  await waitForCampaignStoreExposure(page);

  return page.evaluate((id) => {
    type CampaignStoreApi = {
      getState: () => {
        getCampaign: () => {
          id: string;
          name: string;
          status?: string;
          campaignType?: string;
          description?: string;
        } | null;
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
    const campaign = store.getState().getCampaign();

    if (!campaign || campaign.id !== id) {
      return null;
    }

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status ?? campaign.campaignType ?? 'active',
      description: campaign.description,
    };
  }, campaignId);
}

/**
 * Deletes a campaign by ID.
 *
 * @param page - Playwright page object
 * @param campaignId - The campaign ID to delete
 */
export async function deleteCampaign(
  page: Page,
  campaignId: string,
): Promise<void> {
  // Body extracted so the context-destroyed retry below can reuse it.
  const evaluateDelete = async (): Promise<void> => {
    await page.evaluate((id) => {
      type CampaignStoreApi = {
        getState: () => {
          getCampaign: () => { id: string } | null;
        };
        setState: (state: Record<string, unknown>) => void;
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
      const campaign = store.getState().getCampaign();

      if (!campaign || campaign.id !== id) {
        return;
      }

      store.setState({
        campaign: null,
        forcesStore: null,
        missionsStore: null,
        pendingBattleOutcomes: [],
        processedBattleIds: [],
        reviewedBattleIds: {},
        outcomeApplyErrors: {},
      });
    }, campaignId);
  };

  // Teardown often runs while a client navigation is still in flight; a bare
  // evaluate then dies with "Execution context was destroyed". Settle the
  // document and poll for store exposure first (bounded, real conditions).
  await page.waitForLoadState('domcontentloaded');
  await waitForCampaignStoreExposure(page);

  try {
    await evaluateDelete();
  } catch (error) {
    // A navigation that starts BETWEEN the settle-wait and the evaluate can
    // still destroy the context mid-call. The delete is idempotent (no-op if
    // the campaign is already gone), so re-settle and retry exactly once.
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Execution context was destroyed')) {
      throw error;
    }
    await page.waitForLoadState('domcontentloaded');
    await waitForCampaignStoreExposure(page);
    await evaluateDelete();
  }
}
