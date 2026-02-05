import { Page } from '@playwright/test';

/**
 * Options for creating an OmniMech unit
 */
export interface CreateOmniMechOptions {
  /** Unit name */
  name?: string;
  /** Tonnage (20-100) */
  tonnage?: number;
  /** Tech base: 'InnerSphere' | 'Clan' */
  techBase?: string;
  /** Walk MP */
  walkMP?: number;
  /** Base chassis heat sinks (fixed to chassis, -1 = use engine integral) */
  baseChassisHeatSinks?: number;
}

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
 * Options for creating a vehicle unit
 */
export interface CreateVehicleOptions {
  /** Unit name */
  name?: string;
  /** Tonnage (1-200) */
  tonnage?: number;
  /** Tech base: 'InnerSphere' | 'Clan' */
  techBase?: string;
  /** Motion type: 'Tracked' | 'Wheeled' | 'Hover' | 'VTOL' | 'Naval' etc */
  motionType?: string;
  /** Is VTOL (auto-set if motionType is VTOL) */
  isVTOL?: boolean;
}

/**
 * Helper to wait for tab manager store to be ready
 */
export async function waitForTabManagerStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { tabManager?: unknown };
      };
      return win.__ZUSTAND_STORES__?.tabManager !== undefined;
    },
    { timeout: 10000 },
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
  options: CreateMechOptions = {},
): Promise<string> {
  const unitId = await page.evaluate((opts) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          tabManager?: {
            getState: () => {
              createTab: (
                template: {
                  id: string;
                  name: string;
                  tonnage: number;
                  techBase: string;
                  walkMP: number;
                },
                customName?: string,
              ) => string;
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
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.tabManager) {
      throw new Error('Tab manager store not exposed');
    }

    const templates = (
      window as unknown as {
        __UNIT_TEMPLATES__?: ReadonlyArray<{
          id: string;
          name: string;
          tonnage: number;
          techBase: string;
          walkMP: number;
        }>;
      }
    ).__UNIT_TEMPLATES__;

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

    // Override template values with requested options
    const finalTemplate = {
      ...template,
      tonnage: opts.tonnage ?? template.tonnage,
      techBase: opts.techBase ?? template.techBase,
      walkMP: opts.walkMP ?? template.walkMP,
    };

    const store = stores.tabManager.getState();
    return store.createTab(
      finalTemplate,
      opts.name ?? `Test Mech ${Date.now()}`,
    );
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
  options: CreateAerospaceOptions = {},
): Promise<string> {
  const unitId = await page.evaluate((opts) => {
    const stores = (
      window as unknown as {
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
          }) => {
            getState: () => {
              id: string;
              name: string;
              tonnage: number;
              techBase: string;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.tabManager) {
      throw new Error('Tab manager store not exposed');
    }

    const aerospaceRegistry = (
      window as unknown as {
        __AEROSPACE_REGISTRY__?: {
          createAndRegisterAerospace: (options: {
            name: string;
            tonnage: number;
            techBase: string;
            isConventional?: boolean;
          }) => {
            getState: () => {
              id: string;
              name: string;
              tonnage: number;
              techBase: string;
            };
          };
        };
      }
    ).__AEROSPACE_REGISTRY__;

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
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          tabManager?: {
            getState: () => {
              activeTabId: string | null;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

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
    const stores = (
      window as unknown as {
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
      }
    ).__ZUSTAND_STORES__;

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
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          tabManager?: {
            getState: () => {
              closeTab: (id: string) => void;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

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
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          tabManager?: {
            getState: () => {
              selectTab: (id: string) => void;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (stores?.tabManager) {
      stores.tabManager.getState().selectTab(id);
    }
  }, unitId);
}

/**
 * Creates a new Vehicle unit in the customizer and opens it as a tab.
 *
 * @param page - Playwright page object
 * @param options - Vehicle creation options
 * @returns The created unit ID
 */
export async function createVehicleUnit(
  page: Page,
  options: CreateVehicleOptions = {},
): Promise<string> {
  const unitId = await page.evaluate((opts) => {
    const stores = (
      window as unknown as {
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
        __VEHICLE_REGISTRY__?: {
          createAndRegisterVehicle: (options: {
            name: string;
            tonnage: number;
            techBase: string;
            motionType?: string;
          }) => {
            getState: () => {
              id: string;
              name: string;
              tonnage: number;
              techBase: string;
              motionType: string;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.tabManager) {
      throw new Error('Tab manager store not exposed');
    }

    const vehicleRegistry = (
      window as unknown as {
        __VEHICLE_REGISTRY__?: {
          createAndRegisterVehicle: (options: {
            name: string;
            tonnage: number;
            techBase: string;
            motionType?: string;
          }) => {
            getState: () => {
              id: string;
              name: string;
              tonnage: number;
              techBase: string;
              motionType: string;
            };
          };
        };
      }
    ).__VEHICLE_REGISTRY__;

    if (!vehicleRegistry) {
      throw new Error('Vehicle registry not exposed');
    }

    // Determine unit type based on motion type
    const isVTOL = opts.isVTOL || opts.motionType === 'VTOL';
    const unitType = isVTOL ? 'VTOL' : 'Vehicle';

    // Create vehicle unit in registry
    const vehicleStore = vehicleRegistry.createAndRegisterVehicle({
      name: opts.name ?? `Test Vehicle ${Date.now()}`,
      tonnage: opts.tonnage ?? 50,
      techBase: opts.techBase ?? 'InnerSphere',
      motionType: opts.motionType,
    });

    const state = vehicleStore.getState();

    // Add tab for the vehicle unit
    stores.tabManager.getState().addTab({
      id: state.id,
      name: state.name,
      tonnage: state.tonnage,
      techBase: state.techBase,
      unitType: unitType,
    });

    return state.id;
  }, options);

  return unitId;
}

/**
 * Gets vehicle unit state by ID
 */
export async function getVehicleState(
  page: Page,
  unitId: string,
): Promise<{
  id: string;
  name: string;
  tonnage: number;
  motionType: string;
  cruiseMP: number;
  flankMP: number;
  armorTonnage: number;
  engineType: string;
  engineRating: number;
} | null> {
  return page.evaluate((id) => {
    const registry = (
      window as unknown as {
        __VEHICLE_REGISTRY__?: {
          getVehicleStore: (id: string) =>
            | {
                getState: () => {
                  id: string;
                  name: string;
                  tonnage: number;
                  motionType: string;
                  cruiseMP: number;
                  flankMP: number;
                  armorTonnage: number;
                  engineType: string;
                  engineRating: number;
                };
              }
            | undefined;
        };
      }
    ).__VEHICLE_REGISTRY__;

    if (!registry) {
      return null;
    }

    const store = registry.getVehicleStore(id);
    if (!store) {
      return null;
    }

    const state = store.getState();
    return {
      id: state.id,
      name: state.name,
      tonnage: state.tonnage,
      motionType: state.motionType,
      cruiseMP: state.cruiseMP,
      flankMP: state.flankMP,
      armorTonnage: state.armorTonnage,
      engineType: state.engineType,
      engineRating: state.engineRating,
    };
  }, unitId);
}

/**
 * Gets aerospace unit state by ID
 */
export async function getAerospaceState(
  page: Page,
  unitId: string,
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
    const registry = (
      window as unknown as {
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
      }
    ).__AEROSPACE_REGISTRY__;

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

// =============================================================================
// OmniMech Fixtures
// =============================================================================

/**
 * Creates a new OmniMech unit in the customizer and opens it as a tab.
 * Creates a standard BattleMech first, then converts it to OmniMech.
 *
 * @param page - Playwright page object
 * @param options - OmniMech creation options
 * @returns The created unit ID
 */
export async function createOmniMechUnit(
  page: Page,
  options: CreateOmniMechOptions = {},
): Promise<string> {
  // First create a standard mech
  const unitId = await createMechUnit(page, {
    name: options.name ?? `Test OmniMech ${Date.now()}`,
    tonnage: options.tonnage,
    techBase: options.techBase,
    walkMP: options.walkMP,
  });

  // Then convert it to OmniMech via store action
  await page.evaluate(
    ({ id, baseChassisHeatSinks }) => {
      const registry = (
        window as unknown as {
          __UNIT_REGISTRY__?: {
            getUnitStore: (id: string) =>
              | {
                  getState: () => {
                    setIsOmni: (isOmni: boolean) => void;
                    setBaseChassisHeatSinks: (count: number) => void;
                  };
                }
              | undefined;
          };
        }
      ).__UNIT_REGISTRY__;

      if (!registry) {
        throw new Error('Unit registry not exposed');
      }

      const store = registry.getUnitStore(id);
      if (!store) {
        throw new Error(`Unit store not found for ID: ${id}`);
      }

      const state = store.getState();
      state.setIsOmni(true);

      if (baseChassisHeatSinks !== undefined && baseChassisHeatSinks >= 0) {
        state.setBaseChassisHeatSinks(baseChassisHeatSinks);
      }
    },
    { id: unitId, baseChassisHeatSinks: options.baseChassisHeatSinks },
  );

  return unitId;
}

/**
 * Gets OmniMech-specific state for a unit
 */
export async function getOmniMechState(
  page: Page,
  unitId: string,
): Promise<{
  id: string;
  name: string;
  tonnage: number;
  isOmni: boolean;
  baseChassisHeatSinks: number;
  equipmentCount: number;
  podMountedCount: number;
  fixedCount: number;
} | null> {
  return page.evaluate((id) => {
    const registry = (
      window as unknown as {
        __UNIT_REGISTRY__?: {
          getUnitStore: (id: string) =>
            | {
                getState: () => {
                  id: string;
                  name: string;
                  tonnage: number;
                  isOmni: boolean;
                  baseChassisHeatSinks: number;
                  equipment: Array<{ isOmniPodMounted: boolean }>;
                };
              }
            | undefined;
        };
      }
    ).__UNIT_REGISTRY__;

    if (!registry) {
      return null;
    }

    const store = registry.getUnitStore(id);
    if (!store) {
      return null;
    }

    const state = store.getState();
    const podMountedCount = state.equipment.filter(
      (eq) => eq.isOmniPodMounted,
    ).length;
    const fixedCount = state.equipment.filter(
      (eq) => !eq.isOmniPodMounted,
    ).length;

    return {
      id: state.id,
      name: state.name,
      tonnage: state.tonnage,
      isOmni: state.isOmni,
      baseChassisHeatSinks: state.baseChassisHeatSinks,
      equipmentCount: state.equipment.length,
      podMountedCount,
      fixedCount,
    };
  }, unitId);
}

/**
 * Sets whether a unit is an OmniMech
 */
export async function setUnitIsOmni(
  page: Page,
  unitId: string,
  isOmni: boolean,
): Promise<void> {
  await page.evaluate(
    ({ id, isOmni }) => {
      const registry = (
        window as unknown as {
          __UNIT_REGISTRY__?: {
            getUnitStore: (id: string) =>
              | {
                  getState: () => {
                    setIsOmni: (isOmni: boolean) => void;
                  };
                }
              | undefined;
          };
        }
      ).__UNIT_REGISTRY__;

      if (!registry) {
        throw new Error('Unit registry not exposed');
      }

      const store = registry.getUnitStore(id);
      if (!store) {
        throw new Error(`Unit store not found for ID: ${id}`);
      }

      store.getState().setIsOmni(isOmni);
    },
    { id: unitId, isOmni },
  );
}

/**
 * Resets an OmniMech chassis, removing all pod-mounted equipment
 */
export async function resetOmniChassis(
  page: Page,
  unitId: string,
): Promise<void> {
  await page.evaluate((id) => {
    const registry = (
      window as unknown as {
        __UNIT_REGISTRY__?: {
          getUnitStore: (id: string) =>
            | {
                getState: () => {
                  resetChassis: () => void;
                };
              }
            | undefined;
        };
      }
    ).__UNIT_REGISTRY__;

    if (!registry) {
      throw new Error('Unit registry not exposed');
    }

    const store = registry.getUnitStore(id);
    if (!store) {
      throw new Error(`Unit store not found for ID: ${id}`);
    }

    store.getState().resetChassis();
  }, unitId);
}

/**
 * Sets base chassis heat sinks for an OmniMech
 */
export async function setBaseChassisHeatSinks(
  page: Page,
  unitId: string,
  count: number,
): Promise<void> {
  await page.evaluate(
    ({ id, count }) => {
      const registry = (
        window as unknown as {
          __UNIT_REGISTRY__?: {
            getUnitStore: (id: string) =>
              | {
                  getState: () => {
                    setBaseChassisHeatSinks: (count: number) => void;
                  };
                }
              | undefined;
          };
        }
      ).__UNIT_REGISTRY__;

      if (!registry) {
        throw new Error('Unit registry not exposed');
      }

      const store = registry.getUnitStore(id);
      if (!store) {
        throw new Error(`Unit store not found for ID: ${id}`);
      }

      store.getState().setBaseChassisHeatSinks(count);
    },
    { id: unitId, count },
  );
}

/**
 * Gets the basic mech unit state by ID (includes isOmni)
 */
export async function getMechState(
  page: Page,
  unitId: string,
): Promise<{
  id: string;
  name: string;
  tonnage: number;
  isOmni: boolean;
  walkMP: number;
  engineRating: number;
  heatSinkCount: number;
} | null> {
  return page.evaluate((id) => {
    const registry = (
      window as unknown as {
        __UNIT_REGISTRY__?: {
          getUnitStore: (id: string) =>
            | {
                getState: () => {
                  id: string;
                  name: string;
                  tonnage: number;
                  isOmni: boolean;
                  engineRating: number;
                  heatSinkCount: number;
                };
              }
            | undefined;
        };
      }
    ).__UNIT_REGISTRY__;

    if (!registry) {
      return null;
    }

    const store = registry.getUnitStore(id);
    if (!store) {
      return null;
    }

    const state = store.getState();
    const walkMP = Math.floor(state.engineRating / state.tonnage);

    return {
      id: state.id,
      name: state.name,
      tonnage: state.tonnage,
      isOmni: state.isOmni,
      walkMP,
      engineRating: state.engineRating,
      heatSinkCount: state.heatSinkCount,
    };
  }, unitId);
}

// =============================================================================
// Exotic Mech Fixtures (Quad, LAM, Tripod)
// =============================================================================

/**
 * Mech configuration types
 */
export type MechConfigurationType =
  | 'Biped'
  | 'Quad'
  | 'Tripod'
  | 'LAM'
  | 'QuadVee';

/**
 * LAM operating modes
 */
export type LAMModeType = 'Mech' | 'AirMech' | 'Fighter';

/**
 * Options for creating an exotic mech
 */
export interface CreateExoticMechOptions {
  /** Unit name */
  name?: string;
  /** Tonnage (20-100, LAM max 55) */
  tonnage?: number;
  /** Tech base: 'InnerSphere' | 'Clan' */
  techBase?: string;
  /** Walk MP */
  walkMP?: number;
  /** Configuration type */
  configuration: MechConfigurationType;
  /** Initial LAM mode (for LAM only) */
  lamMode?: LAMModeType;
}

/**
 * Creates a QuadMech unit in the customizer
 */
export async function createQuadMech(
  page: Page,
  options: Omit<CreateExoticMechOptions, 'configuration'> = {},
): Promise<string> {
  return createExoticMech(page, { ...options, configuration: 'Quad' });
}

/**
 * Creates a LAM (Land-Air Mech) unit in the customizer
 * Note: LAMs are limited to 55 tons max
 */
export async function createLAM(
  page: Page,
  options: Omit<CreateExoticMechOptions, 'configuration'> = {},
): Promise<string> {
  // LAMs are limited to 55 tons
  const tonnage = Math.min(options.tonnage ?? 50, 55);
  return createExoticMech(page, { ...options, tonnage, configuration: 'LAM' });
}

/**
 * Creates a Tripod mech unit in the customizer
 */
export async function createTripodMech(
  page: Page,
  options: Omit<CreateExoticMechOptions, 'configuration'> = {},
): Promise<string> {
  return createExoticMech(page, { ...options, configuration: 'Tripod' });
}

/**
 * Creates an exotic mech unit with specified configuration
 */
export async function createExoticMech(
  page: Page,
  options: CreateExoticMechOptions,
): Promise<string> {
  // First create a standard mech
  const unitId = await createMechUnit(page, {
    name: options.name ?? `Test ${options.configuration} ${Date.now()}`,
    tonnage: options.tonnage,
    techBase: options.techBase,
    walkMP: options.walkMP,
  });

  // Then set the configuration via store action
  await page.evaluate(
    ({ id, configuration, lamMode }) => {
      const registry = (
        window as unknown as {
          __UNIT_REGISTRY__?: {
            getUnitStore: (id: string) =>
              | {
                  getState: () => {
                    setConfiguration: (config: string) => void;
                    setLAMMode?: (mode: string) => void;
                  };
                }
              | undefined;
          };
        }
      ).__UNIT_REGISTRY__;

      if (!registry) {
        throw new Error('Unit registry not exposed');
      }

      const store = registry.getUnitStore(id);
      if (!store) {
        throw new Error(`Unit store not found for ID: ${id}`);
      }

      const state = store.getState();
      state.setConfiguration(configuration);

      // Set LAM mode if applicable
      if (configuration === 'LAM' && lamMode && state.setLAMMode) {
        state.setLAMMode(lamMode);
      }
    },
    {
      id: unitId,
      configuration: options.configuration,
      lamMode: options.lamMode,
    },
  );

  return unitId;
}

/**
 * Gets exotic mech state including configuration-specific fields
 */
export async function getExoticMechState(
  page: Page,
  unitId: string,
): Promise<{
  id: string;
  name: string;
  tonnage: number;
  configuration: MechConfigurationType;
  lamMode?: LAMModeType;
  quadVeeMode?: string;
  armorAllocation: Record<string, number>;
} | null> {
  return page.evaluate((id) => {
    const registry = (
      window as unknown as {
        __UNIT_REGISTRY__?: {
          getUnitStore: (id: string) =>
            | {
                getState: () => {
                  id: string;
                  name: string;
                  tonnage: number;
                  configuration: string;
                  lamMode?: string;
                  quadVeeMode?: string;
                  armorAllocation: Record<string, number>;
                };
              }
            | undefined;
        };
      }
    ).__UNIT_REGISTRY__;

    if (!registry) {
      return null;
    }

    const store = registry.getUnitStore(id);
    if (!store) {
      return null;
    }

    const state = store.getState();
    return {
      id: state.id,
      name: state.name,
      tonnage: state.tonnage,
      configuration: state.configuration as
        | 'Biped'
        | 'Quad'
        | 'Tripod'
        | 'LAM'
        | 'QuadVee',
      lamMode: state.lamMode as 'Mech' | 'AirMech' | 'Fighter' | undefined,
      quadVeeMode: state.quadVeeMode,
      armorAllocation: state.armorAllocation,
    };
  }, unitId);
}

/**
 * Sets the LAM operating mode
 */
export async function setLAMMode(
  page: Page,
  unitId: string,
  mode: LAMModeType,
): Promise<void> {
  await page.evaluate(
    ({ id, mode }) => {
      const registry = (
        window as unknown as {
          __UNIT_REGISTRY__?: {
            getUnitStore: (id: string) =>
              | {
                  getState: () => {
                    setLAMMode: (mode: string) => void;
                  };
                }
              | undefined;
          };
        }
      ).__UNIT_REGISTRY__;

      if (!registry) {
        throw new Error('Unit registry not exposed');
      }

      const store = registry.getUnitStore(id);
      if (!store) {
        throw new Error(`Unit store not found for ID: ${id}`);
      }

      store.getState().setLAMMode(mode);
    },
    { id: unitId, mode },
  );
}

/**
 * Gets the locations available for a mech configuration
 * Uses MechLocation enum string values
 */
export function getConfigurationLocations(
  configuration: MechConfigurationType,
): string[] {
  const coreLocations = ['Head', 'Center Torso', 'Left Torso', 'Right Torso'];

  switch (configuration) {
    case 'Biped':
      return [
        ...coreLocations,
        'Left Arm',
        'Right Arm',
        'Left Leg',
        'Right Leg',
      ];
    case 'Quad':
      return [
        ...coreLocations,
        'Front Left Leg',
        'Front Right Leg',
        'Rear Left Leg',
        'Rear Right Leg',
      ];
    case 'Tripod':
      return [
        ...coreLocations,
        'Left Arm',
        'Right Arm',
        'Left Leg',
        'Right Leg',
        'Center Leg',
      ];
    case 'LAM':
      return [
        ...coreLocations,
        'Left Arm',
        'Right Arm',
        'Left Leg',
        'Right Leg',
      ];
    case 'QuadVee':
      return [
        ...coreLocations,
        'Front Left Leg',
        'Front Right Leg',
        'Rear Left Leg',
        'Rear Right Leg',
      ];
    default:
      return [
        ...coreLocations,
        'Left Arm',
        'Right Arm',
        'Left Leg',
        'Right Leg',
      ];
  }
}
