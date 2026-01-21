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
    const stores = (window as unknown as { __ZUSTAND_STORES__?: { force?: { getState: () => { forces: Array<{
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
    // forces is an array, not a Map
    return state.forces.find((f) => f.id === id) || null;
  }, forceId);
}

/**
 * Assigns a pilot and unit to an existing assignment slot.
 * Note: Forces are created with empty assignment slots. Use this to populate them.
 *
 * @param page - Playwright page object
 * @param assignmentId - The assignment slot ID to update
 * @param pilotId - The pilot ID to assign
 * @param unitId - The unit ID to assign
 * @returns True if successful
 */
export async function assignPilotAndUnit(
  page: Page,
  assignmentId: string,
  pilotId: string,
  unitId: string
): Promise<boolean> {
  return page.evaluate(
    async ({ assignmentId, pilotId, unitId }) => {
      const stores = (window as unknown as { __ZUSTAND_STORES__?: { force?: { getState: () => { 
        assignPilotAndUnit: (assignmentId: string, pilotId: string, unitId: string) => Promise<boolean>;
      } } } }).__ZUSTAND_STORES__;

      if (!stores?.force) {
        throw new Error('Force store not exposed');
      }

      return stores.force.getState().assignPilotAndUnit(assignmentId, pilotId, unitId);
    },
    { assignmentId, pilotId, unitId }
  );
}

/**
 * Clears an assignment slot.
 *
 * @param page - Playwright page object
 * @param assignmentId - The assignment slot ID to clear
 * @returns True if successful
 */
export async function clearAssignment(
  page: Page,
  assignmentId: string
): Promise<boolean> {
  return page.evaluate(async (id) => {
    const stores = (window as unknown as { __ZUSTAND_STORES__?: { force?: { getState: () => { 
      clearAssignment: (id: string) => Promise<boolean>;
    } } } }).__ZUSTAND_STORES__;

    if (!stores?.force) {
      throw new Error('Force store not exposed');
    }

    return stores.force.getState().clearAssignment(id);
  }, assignmentId);
}

/**
 * Clones a force with a new name.
 *
 * @param page - Playwright page object
 * @param forceId - The force ID to clone
 * @param newName - The name for the cloned force
 * @returns The new force ID or null
 */
export async function cloneForce(
  page: Page,
  forceId: string,
  newName: string
): Promise<string | null> {
  return page.evaluate(
    async ({ forceId, newName }) => {
      const stores = (window as unknown as { __ZUSTAND_STORES__?: { force?: { getState: () => { 
        cloneForce: (id: string, newName: string) => Promise<string | null>;
      } } } }).__ZUSTAND_STORES__;

      if (!stores?.force) {
        throw new Error('Force store not exposed');
      }

      return stores.force.getState().cloneForce(forceId, newName);
    },
    { forceId, newName }
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
