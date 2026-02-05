import { Page } from '@playwright/test';

/**
 * Options for creating a test repair job
 */
export interface TestRepairJobOptions {
  /** Unit ID for the repair job */
  unitId?: string;
  /** Unit name for display */
  unitName?: string;
  /** Repair items to include */
  items?: TestRepairItemOptions[];
}

/**
 * Options for a repair item
 */
export interface TestRepairItemOptions {
  /** Repair type: Armor, Structure, ComponentRepair, ComponentReplace */
  type?: string;
  /** Location on the unit */
  location?: string;
  /** Cost in C-Bills */
  cost?: number;
  /** Time in hours */
  timeHours?: number;
  /** Points to restore */
  pointsToRestore?: number;
  /** Component name (for component repairs) */
  componentName?: string;
  /** Whether the item is selected for repair */
  selected?: boolean;
}

/**
 * Initializes the repair store for a campaign.
 * This creates demo repair jobs for testing.
 *
 * @param page - Playwright page object
 * @param campaignId - Campaign ID to initialize repairs for
 */
export async function initializeRepairStore(
  page: Page,
  campaignId: string,
): Promise<void> {
  await page.evaluate((cId) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          repair?: {
            getState: () => { initializeCampaign: (id: string) => void };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.repair) {
      console.warn('Repair store not exposed');
      return;
    }

    stores.repair.getState().initializeCampaign(cId);
  }, campaignId);
}

/**
 * Gets repair jobs for a campaign.
 *
 * @param page - Playwright page object
 * @param campaignId - Campaign ID
 * @returns Array of repair jobs
 */
export async function getRepairJobs(
  page: Page,
  campaignId: string,
): Promise<
  Array<{
    id: string;
    unitId: string;
    unitName: string;
    status: string;
    totalCost: number;
    items: Array<{ id: string; selected: boolean }>;
  }>
> {
  return page.evaluate((cId) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          repair?: {
            getState: () => {
              getJobs: (id: string) => Array<{
                id: string;
                unitId: string;
                unitName: string;
                status: string;
                totalCost: number;
                items: Array<{ id: string; selected: boolean }>;
              }>;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.repair) {
      return [];
    }

    return stores.repair.getState().getJobs(cId);
  }, campaignId);
}

/**
 * Gets a specific repair job.
 *
 * @param page - Playwright page object
 * @param campaignId - Campaign ID
 * @param jobId - Job ID
 * @returns The repair job or null
 */
export async function getRepairJob(
  page: Page,
  campaignId: string,
  jobId: string,
): Promise<{
  id: string;
  unitName: string;
  status: string;
  totalCost: number;
  items: Array<{ id: string; selected: boolean; type: string }>;
} | null> {
  return page.evaluate(
    ({ cId, jId }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            repair?: {
              getState: () => {
                getJob: (
                  cId: string,
                  jId: string,
                ) =>
                  | {
                      id: string;
                      unitName: string;
                      status: string;
                      totalCost: number;
                      items: Array<{
                        id: string;
                        selected: boolean;
                        type: string;
                      }>;
                    }
                  | undefined;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.repair) {
        return null;
      }

      return stores.repair.getState().getJob(cId, jId) || null;
    },
    { cId: campaignId, jId: jobId },
  );
}

/**
 * Selects a repair job in the store.
 *
 * @param page - Playwright page object
 * @param jobId - Job ID to select (or null to deselect)
 */
export async function selectRepairJob(
  page: Page,
  jobId: string | null,
): Promise<void> {
  await page.evaluate((jId) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          repair?: {
            getState: () => { selectJob: (id: string | null) => void };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.repair) {
      return;
    }

    stores.repair.getState().selectJob(jId);
  }, jobId);
}

/**
 * Starts a repair job.
 *
 * @param page - Playwright page object
 * @param campaignId - Campaign ID
 * @param jobId - Job ID to start
 */
export async function startRepairJob(
  page: Page,
  campaignId: string,
  jobId: string,
): Promise<void> {
  await page.evaluate(
    ({ cId, jId }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            repair?: {
              getState: () => { startJob: (cId: string, jId: string) => void };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.repair) {
        return;
      }

      stores.repair.getState().startJob(cId, jId);
    },
    { cId: campaignId, jId: jobId },
  );
}

/**
 * Cancels a repair job.
 *
 * @param page - Playwright page object
 * @param campaignId - Campaign ID
 * @param jobId - Job ID to cancel
 */
export async function cancelRepairJob(
  page: Page,
  campaignId: string,
  jobId: string,
): Promise<void> {
  await page.evaluate(
    ({ cId, jId }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            repair?: {
              getState: () => { cancelJob: (cId: string, jId: string) => void };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.repair) {
        return;
      }

      stores.repair.getState().cancelJob(cId, jId);
    },
    { cId: campaignId, jId: jobId },
  );
}

/**
 * Toggles a repair item selection.
 *
 * @param page - Playwright page object
 * @param campaignId - Campaign ID
 * @param jobId - Job ID
 * @param itemId - Item ID to toggle
 */
export async function toggleRepairItem(
  page: Page,
  campaignId: string,
  jobId: string,
  itemId: string,
): Promise<void> {
  await page.evaluate(
    ({ cId, jId, iId }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            repair?: {
              getState: () => {
                toggleRepairItem: (
                  cId: string,
                  jId: string,
                  iId: string,
                ) => void;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.repair) {
        return;
      }

      stores.repair.getState().toggleRepairItem(cId, jId, iId);
    },
    { cId: campaignId, jId: jobId, iId: itemId },
  );
}

/**
 * Gets the current selected job ID from the store.
 *
 * @param page - Playwright page object
 * @returns The selected job ID or null
 */
export async function getSelectedJobId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          repair?: { getState: () => { selectedJobId: string | null } };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.repair) {
      return null;
    }

    return stores.repair.getState().selectedJobId;
  });
}
