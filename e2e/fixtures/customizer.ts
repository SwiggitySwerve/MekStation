import { Page } from '@playwright/test';

/**
 * Options for creating an aerospace unit
 */
export interface CreateAerospaceOptions {
  /** Unit name */
  name?: string;
  /** Tonnage (5-100) */
  tonnage?: number;
  /** Tech base: 'InnerSphere' | 'Clan' */
  techBase?: string;
  /** Is conventional fighter (vs aerospace) */
  isConventional?: boolean;
}

/**
 * Options for creating a BattleMech unit
 */
export interface CreateMechOptions {
  /** Unit name */
  name?: string;
  /** Tonnage (20-100) */
  tonnage?: number;
  /** Tech base: 'InnerSphere' | 'Clan' */
  techBase?: string;
  /** Walk MP */
  walkMP?: number;
}

/**
 * Helper to wait for tab manager store to be ready
 */
export async function waitForTabManagerStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as { __ZUSTAND_STORES__?: { tabManager?: unknown } };
      return win.__ZUSTAND_STORES__?.tabManager !== undefined;
    },
    { timeout: 10000 }
  );
}

/**
 * Creates a new BattleMech unit in the customizer and opens it as a tab.
 *
 * @param page - Playwright page object
 * @param options - Mech creation options
 * @returns The created unit ID
 */
export async function createMechUnit(
  page: Page,
  options: CreateMechOptions = {}
): Promise<string> {
  const unitId = await page.evaluate((opts) => {
    const stores = (window as unknown as {
      __ZUSTAND_STORES__?: {
        tabManager?: {
          getState: () => {
            createTab: (template: {
              id: string;
              name: string;
              tonnage: number;
              techBase: string;
              walkMP: number;
            }, customName?: string) => string;
          };
        };
      };
      __UNIT_TEMPLATES__?: ReadonlyArray<{
        id: string;
        name: string;
        tonnage: number;
        techBase: string;
        walkMP: number;
      }>;
    }).__ZUSTAND_STORES__;

    if (!stores?.tabManager) {
      throw new Error('Tab manager store not exposed');
    }

    const templates = (window as unknown as {
      __UNIT_TEMPLATES__?: ReadonlyArray<{
        id: string;
        name: string;
        tonnage: number;
        techBase: string;
        walkMP: number;
      }>;
    }).__UNIT_TEMPLATES__;

    // Find a template matching the tonnage or use medium as default
    let template = templates?.find((t) => t.tonnage === opts.tonnage);
    if (!template && templates && templates.length > 0) {
      template = templates[1]; // Medium mech (50 tons)
    }
    if (!template) {
      template = {
        id: 'medium',
        name: 'Medium Mech',
        tonnage: opts.tonnage ?? 50,
        techBase: opts.techBase ?? 'InnerSphere',
        walkMP: opts.walkMP ?? 5,
      };
    }

    const store = stores.tabManager.getState();
    return store.createTab(template, opts.name ?? `Test Mech ${Date.now()}`);
  }, options);

  return unitId;
}

/**
 * Creates a new Aerospace unit in the customizer and opens it as a tab.
 *
 * @param page - Playwright page object
 * @param options - Aerospace creation options
 * @returns The created unit ID
 */
export async function createAerospaceUnit(
  page: Page,
  options: CreateAerospaceOptions = {}
): Promise<string> {
  const unitId = await page.evaluate((opts) => {
    const stores = (window as unknown as {
      __ZUSTAND_STORES__?: {
        tabManager?: {
          getState: () => {
            addTab: (tabInfo: {
              id: string;
              name: string;
              tonnage?: number;
              techBase?: string;
              unitType?: string;
            }) => void;
          };
        };
      };
      __AEROSPACE_REGISTRY__?: {
        createAndRegisterAerospace: (options: {
          name: string;
          tonnage: number;
          techBase: string;
          isConventional?: boolean;
        }) => { getState: () => { id: string; name: string; tonnage: number; techBase: string } };
      };
    }).__ZUSTAND_STORES__;

    if (!stores?.tabManager) {
      throw new Error('Tab manager store not exposed');
    }

    const aerospaceRegistry = (window as unknown as {
      __AEROSPACE_REGISTRY__?: {
        createAndRegisterAerospace: (options: {
          name: string;
          tonnage: number;
          techBase: string;
          isConventional?: boolean;
        }) => { getState: () => { id: string; name: string; tonnage: number; techBase: string } };
      };
    }).__AEROSPACE_REGISTRY__;

    if (!aerospaceRegistry) {
      throw new Error('Aerospace registry not exposed');
    }

    // Create aerospace unit in registry
    const aeroStore = aerospaceRegistry.createAndRegisterAerospace({
      name: opts.name ?? `Test Aerospace ${Date.now()}`,
      tonnage: opts.tonnage ?? 50,
      techBase: opts.techBase ?? 'InnerSphere',
      isConventional: opts.isConventional ?? false,
    });

    const state = aeroStore.getState();

    // Add tab for the aerospace unit
    stores.tabManager.getState().addTab({
      id: state.id,
      name: state.name,
      tonnage: state.tonnage,
      techBase: state.techBase,
      unitType: opts.isConventional ? 'Conventional Fighter' : 'Aerospace',
    });

    return state.id;
  }, options);

  return unitId;
}

/**
 * Gets the current active tab ID
 */
export async function getActiveTabId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const stores = (window as unknown as {
      __ZUSTAND_STORES__?: {
        tabManager?: {
          getState: () => {
            activeTabId: string | null;
          };
        };
      };
    }).__ZUSTAND_STORES__;

    if (!stores?.tabManager) {
      return null;
    }

    return stores.tabManager.getState().activeTabId;
  });
}

/**
 * Gets all open tabs
 */
export async function getOpenTabs(page: Page): Promise<
  Array<{
    id: string;
    name: string;
    unitType: string;
  }>
> {
  return page.evaluate(() => {
    const stores = (window as unknown as {
      __ZUSTAND_STORES__?: {
        tabManager?: {
          getState: () => {
            tabs: Array<{
              id: string;
              name: string;
              unitType: string;
            }>;
          };
        };
      };
    }).__ZUSTAND_STORES__;

    if (!stores?.tabManager) {
      return [];
    }

    return stores.tabManager.getState().tabs.map((t) => ({
      id: t.id,
      name: t.name,
      unitType: t.unitType,
    }));
  });
}

/**
 * Closes a tab by unit ID
 */
export async function closeTab(page: Page, unitId: string): Promise<void> {
  await page.evaluate((id) => {
    const stores = (window as unknown as {
      __ZUSTAND_STORES__?: {
        tabManager?: {
          getState: () => {
            closeTab: (id: string) => void;
          };
        };
      };
    }).__ZUSTAND_STORES__;

    if (stores?.tabManager) {
      stores.tabManager.getState().closeTab(id);
    }
  }, unitId);
}

/**
 * Selects a tab by unit ID
 */
export async function selectTab(page: Page, unitId: string): Promise<void> {
  await page.evaluate((id) => {
    const stores = (window as unknown as {
      __ZUSTAND_STORES__?: {
        tabManager?: {
          getState: () => {
            selectTab: (id: string) => void;
          };
        };
      };
    }).__ZUSTAND_STORES__;

    if (stores?.tabManager) {
      stores.tabManager.getState().selectTab(id);
    }
  }, unitId);
}

/**
 * Gets aerospace unit state by ID
 */
export async function getAerospaceState(
  page: Page,
  unitId: string
): Promise<{
  id: string;
  name: string;
  tonnage: number;
  safeThrust: number;
  fuel: number;
  armorTonnage: number;
  heatSinks: number;
} | null> {
  return page.evaluate((id) => {
    const registry = (window as unknown as {
      __AEROSPACE_REGISTRY__?: {
        getAerospaceStore: (id: string) =>
          | {
              getState: () => {
                id: string;
                name: string;
                tonnage: number;
                safeThrust: number;
                fuel: number;
                armorTonnage: number;
                heatSinks: number;
              };
            }
          | undefined;
      };
    }).__AEROSPACE_REGISTRY__;

    if (!registry) {
      return null;
    }

    const store = registry.getAerospaceStore(id);
    if (!store) {
      return null;
    }

    const state = store.getState();
    return {
      id: state.id,
      name: state.name,
      tonnage: state.tonnage,
      safeThrust: state.safeThrust,
      fuel: state.fuel,
      armorTonnage: state.armorTonnage,
      heatSinks: state.heatSinks,
    };
  }, unitId);
}
