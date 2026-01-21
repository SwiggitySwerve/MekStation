import { Page } from '@playwright/test';

/**
 * Force type enum values
 */
export type ForceType =
  | 'lance'
  | 'star'
  | 'level_ii'
  | 'company'
  | 'binary'
  | 'battalion'
  | 'cluster'
  | 'custom';

/**
 * Force position enum values
 */
export type ForcePosition =
  | 'commander'
  | 'executive'
  | 'lead'
  | 'member'
  | 'scout'
  | 'fire_support';

/**
 * Options for creating a test force
 */
export interface TestForceOptions {
  /** Force name. Defaults to 'Test Force {timestamp}' */
  name?: string;
  /** Force type. Defaults to 'lance' */
  forceType?: ForceType;
  /** Force affiliation (e.g., 'Federated Suns') */
  affiliation?: string;
  /** Parent force ID for hierarchical forces */
  parentId?: string;
  /** Force description */
  description?: string;
}

/**
 * Assignment to add to a force
 */
export interface TestAssignment {
  pilotId: string | null;
  unitId: string | null;
  position: ForcePosition;
  slot: number;
  notes?: string;
}

/**
 * Creates a test force via the force store.
 * Requires the store to be exposed on window.__ZUSTAND_STORES__.force
 *
 * @param page - Playwright page object
 * @param options - Force creation options
 * @returns The created force ID or null if creation failed
 * @throws Error if force store is not exposed
 *
 * @example
 * ```typescript
 * const forceId = await createTestForce(page, {
 *   name: 'Alpha Lance',
 *   forceType: 'lance',
 *   affiliation: 'Federated Suns',
 * });
 * ```
 */
export async function createTestForce(
  page: Page,
  options: TestForceOptions = {}
): Promise<string | null> {
  const forceId = await page.evaluate(async (opts) => {
    const stores = (window as unknown as { __ZUSTAND_STORES__?: { force?: { getState: () => { createForce: (request: {
      name: string;
      forceType: string;
      affiliation?: string;
      parentId?: string;
      description?: string;
    }) => Promise<string | null> } } } }).__ZUSTAND_STORES__;

    if (!stores?.force) {
      throw new Error(
        'Force store not exposed. Ensure window.__ZUSTAND_STORES__.force is set in your app for E2E testing.'
      );
    }

    const store = stores.force.getState();
    return store.createForce({
      name: opts.name || `Test Force ${Date.now()}`,
      forceType: opts.forceType || 'lance',
      affiliation: opts.affiliation,
      parentId: opts.parentId,
      description: opts.description || 'E2E test force',
    });
  }, options);

  return forceId;
}

/**
 * Creates a lance (4-unit force) with default values.
 *
 * @param page - Playwright page object
 * @param name - Lance name
 * @param affiliation - Force affiliation
 * @returns The created force ID or null
 */
export async function createTestLance(
  page: Page,
  name?: string,
  affiliation?: string
): Promise<string | null> {
  return createTestForce(page, {
    name: name || `Test Lance ${Date.now()}`,
    forceType: 'lance',
    affiliation,
  });
}

/**
 * Creates a star (5-unit Clan force) with default values.
 *
 * @param page - Playwright page object
 * @param name - Star name
 * @param affiliation - Force affiliation (typically a Clan)
 * @returns The created force ID or null
 */
export async function createTestStar(
  page: Page,
  name?: string,
  affiliation?: string
): Promise<string | null> {
  return createTestForce(page, {
    name: name || `Test Star ${Date.now()}`,
    forceType: 'star',
    affiliation,
  });
}

/**
 * Creates a company (3 lances/12 units) with child lances.
 *
 * @param page - Playwright page object
 * @param companyName - Company name
 * @param lanceNames - Names for the 3 child lances
 * @returns Object with company ID and lance IDs
 */
export async function createTestCompany(
  page: Page,
  companyName: string,
  lanceNames: [string, string, string] = ['Alpha Lance', 'Beta Lance', 'Gamma Lance']
): Promise<{ companyId: string | null; lanceIds: (string | null)[] }> {
  const companyId = await createTestForce(page, {
    name: companyName,
    forceType: 'company',
    description: 'E2E test company with 3 lances',
  });

  if (!companyId) {
    return { companyId: null, lanceIds: [] };
  }

  const lanceIds: (string | null)[] = [];
  for (const lanceName of lanceNames) {
    const lanceId = await createTestForce(page, {
      name: lanceName,
      forceType: 'lance',
      parentId: companyId,
    });
    lanceIds.push(lanceId);
  }

  return { companyId, lanceIds };
}

/**
 * Retrieves a force by ID from the store.
 *
 * @param page - Playwright page object
 * @param forceId - The force ID to retrieve
 * @returns The force object or null if not found
 */
export async function getForce(
  page: Page,
  forceId: string
): Promise<{
  id: string;
  name: string;
  forceType: string;
  status: string;
  affiliation?: string;
} | null> {
  return page.evaluate((id) => {
    const stores = (window as unknown as { __ZUSTAND_STORES__?: { force?: { getState: () => { forces: Map<string, {
      id: string;
      name: string;
      forceType: string;
      status: string;
      affiliation?: string;
    }> } } } }).__ZUSTAND_STORES__;

    if (!stores?.force) {
      throw new Error('Force store not exposed');
    }

    const state = stores.force.getState();
    return state.forces.get(id) || null;
  }, forceId);
}

/**
 * Adds an assignment (pilot + unit) to a force.
 *
 * @param page - Playwright page object
 * @param forceId - The force ID to add assignment to
 * @param assignment - The assignment details
 * @returns The assignment ID or null
 */
export async function addAssignmentToForce(
  page: Page,
  forceId: string,
  assignment: TestAssignment
): Promise<string | null> {
  return page.evaluate(
    async ({ forceId, assignment }) => {
      const stores = (window as unknown as { __ZUSTAND_STORES__?: { force?: { getState: () => { addAssignment: (forceId: string, assignment: {
        pilotId: string | null;
        unitId: string | null;
        position: string;
        slot: number;
        notes?: string;
      }) => Promise<string | null> } } } }).__ZUSTAND_STORES__;

      if (!stores?.force) {
        throw new Error('Force store not exposed');
      }

      return stores.force.getState().addAssignment(forceId, assignment);
    },
    { forceId, assignment }
  );
}

/**
 * Deletes a force by ID.
 *
 * @param page - Playwright page object
 * @param forceId - The force ID to delete
 */
export async function deleteForce(page: Page, forceId: string): Promise<void> {
  await page.evaluate(async (id) => {
    const stores = (window as unknown as { __ZUSTAND_STORES__?: { force?: { getState: () => { deleteForce: (id: string) => Promise<void> } } } }).__ZUSTAND_STORES__;

    if (!stores?.force) {
      throw new Error('Force store not exposed');
    }

    await stores.force.getState().deleteForce(id);
  }, forceId);
}
