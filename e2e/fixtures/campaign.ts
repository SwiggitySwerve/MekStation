import { Page } from '@playwright/test';

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
  const campaignId = await page.evaluate((opts) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            getState: () => {
              createCampaign: (input: {
                name: string;
                description?: string;
                unitIds: string[];
                pilotIds: string[];
                resources?: {
                  cBills?: number;
                  supplies?: number;
                  morale?: number;
                  salvageParts?: number;
                };
                difficultyModifier?: number;
              }) => string;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error(
        'Campaign store not exposed. Ensure window.__ZUSTAND_STORES__.campaign is set in your app for E2E testing.',
      );
    }

    const store = stores.campaign.getState();
    return store.createCampaign({
      name: opts.name || `Test Campaign ${Date.now()}`,
      description: opts.description || 'E2E test campaign',
      unitIds: opts.unitIds || [],
      pilotIds: opts.pilotIds || [],
      resources: {
        cBills: opts.cBills ?? 1000000,
        supplies: opts.supplies ?? 100,
        morale: opts.morale ?? 75,
        salvageParts: 0,
      },
      difficultyModifier: opts.difficultyModifier ?? 0,
    });
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
  return page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            getState: () => {
              campaigns: Array<{
                id: string;
                name: string;
                status: string;
                description?: string;
              }>;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error('Campaign store not exposed');
    }

    const state = stores.campaign.getState();
    return state.campaigns.find((c) => c.id === id) || null;
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
  await page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            getState: () => { deleteCampaign: (id: string) => void };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error('Campaign store not exposed');
    }

    stores.campaign.getState().deleteCampaign(id);
  }, campaignId);
}
