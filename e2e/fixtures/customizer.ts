import { Page } from '@playwright/test';

import { LAMMode } from '../../src/types/construction/MechConfigTypes';
import { parseTechBase } from '../../src/types/enums/TechBase';
import { GroundMotionType } from '../../src/types/unit/BaseUnitInterfaces';
import {
  MechConfiguration,
  UnitType,
} from '../../src/types/unit/BattleMechInterfaces';

const GROUND_MOTION_TYPE_VALUES = new Set<string>(
  Object.values(GroundMotionType),
);

/**
 * Converts an optional fixture motion string to a supported production value.
 */
function parseGroundMotionType(
  value: string | undefined,
): GroundMotionType | undefined {
  if (value === undefined || !GROUND_MOTION_TYPE_VALUES.has(value)) {
    return undefined;
  }
  return value as GroundMotionType;
}

/**
 * Converts the fixture's string configuration to the production enum.
 */
function toMechConfiguration(value: MechConfigurationType): MechConfiguration {
  switch (value) {
    case 'Biped':
      return MechConfiguration.BIPED;
    case 'Quad':
      return MechConfiguration.QUAD;
    case 'Tripod':
      return MechConfiguration.TRIPOD;
    case 'LAM':
      return MechConfiguration.LAM;
    case 'QuadVee':
      return MechConfiguration.QUADVEE;
  }
}

/**
 * Converts the fixture's LAM mode to the production enum.
 */
function toLAMMode(value: LAMModeType): LAMMode {
  switch (value) {
    case 'Mech':
      return LAMMode.MECH;
    case 'AirMech':
      return LAMMode.AIRMECH;
    case 'Fighter':
      return LAMMode.FIGHTER;
  }
}

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
      return window.__ZUSTAND_STORES__?.tabManager !== undefined;
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
  const techBase = parseTechBase(options.techBase);
  const unitId = await page.evaluate(
    (opts) => {
      const stores = window.__ZUSTAND_STORES__;

      if (!stores?.tabManager) {
        throw new Error('Tab manager store not exposed');
      }

      const templates = window.__UNIT_TEMPLATES__;

      // Find a template matching the tonnage or use medium as default
      const template = templates?.find(
        (candidate) => candidate.tonnage === opts.tonnage,
      ) ??
        templates?.at(1) ?? {
          id: 'medium',
          name: 'Medium Mech',
          tonnage: opts.tonnage ?? 50,
          techBase: opts.techBase,
          walkMP: opts.walkMP ?? 5,
        };

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
    },
    { ...options, techBase },
  );

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
  const techBase = parseTechBase(options.techBase);
  const unitType = options.isConventional
    ? UnitType.CONVENTIONAL_FIGHTER
    : UnitType.AEROSPACE;
  const unitId = await page.evaluate(
    (opts) => {
      const stores = window.__ZUSTAND_STORES__;

      if (!stores?.tabManager) {
        throw new Error('Tab manager store not exposed');
      }

      const aerospaceRegistry = window.__AEROSPACE_REGISTRY__;

      if (!aerospaceRegistry) {
        throw new Error('Aerospace registry not exposed');
      }

      // Create aerospace unit in registry
      const aeroStore = aerospaceRegistry.createAndRegisterAerospace({
        name: opts.name ?? `Test Aerospace ${Date.now()}`,
        tonnage: opts.tonnage ?? 50,
        techBase: opts.techBase,
        isConventional: opts.isConventional ?? false,
      });

      const state = aeroStore.getState();

      // Add tab for the aerospace unit
      stores.tabManager.getState().addTab({
        id: state.id,
        name: state.name,
        tonnage: state.tonnage,
        techBase: state.techBase,
        unitType: opts.unitType,
      });

      return state.id;
    },
    { ...options, techBase, unitType },
  );

  return unitId;
}

/**
 * Gets the current active tab ID
 */
export async function getActiveTabId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const stores = window.__ZUSTAND_STORES__;

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
    const stores = window.__ZUSTAND_STORES__;

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
    const stores = window.__ZUSTAND_STORES__;

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
    const stores = window.__ZUSTAND_STORES__;

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
  const techBase = parseTechBase(options.techBase);
  const motionType = parseGroundMotionType(options.motionType);
  const isVTOL = options.isVTOL || motionType === GroundMotionType.VTOL;
  const unitType = isVTOL ? UnitType.VTOL : UnitType.VEHICLE;
  const unitId = await page.evaluate(
    (opts) => {
      const stores = window.__ZUSTAND_STORES__;

      if (!stores?.tabManager) {
        throw new Error('Tab manager store not exposed');
      }

      const vehicleRegistry = window.__VEHICLE_REGISTRY__;

      if (!vehicleRegistry) {
        throw new Error('Vehicle registry not exposed');
      }

      // Determine unit type based on motion type
      // Create vehicle unit in registry
      const vehicleStore = vehicleRegistry.createAndRegisterVehicle({
        name: opts.name ?? `Test Vehicle ${Date.now()}`,
        tonnage: opts.tonnage ?? 50,
        techBase: opts.techBase,
        motionType: opts.motionType,
      });

      const state = vehicleStore.getState();

      // Add tab for the vehicle unit
      stores.tabManager.getState().addTab({
        id: state.id,
        name: state.name,
        tonnage: state.tonnage,
        techBase: state.techBase,
        unitType: opts.unitType,
      });

      return state.id;
    },
    { ...options, techBase, motionType, unitType },
  );

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
    const registry = window.__VEHICLE_REGISTRY__;

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
 * Gets aerospace unit state by ID.
 *
 * Fuel contract: add-aerospace-construction replaced the old `fuel` field
 * with `fuelTons` (allocated tonnage) + computed `fuelPoints`
 * (src/stores/aerospaceState.ts:187,193).
 */
export async function getAerospaceState(
  page: Page,
  unitId: string,
): Promise<{
  id: string;
  name: string;
  tonnage: number;
  safeThrust: number;
  fuelTons: number;
  fuelPoints: number;
  armorTonnage: number;
  heatSinks: number;
} | null> {
  return page.evaluate((id) => {
    const registry = window.__AEROSPACE_REGISTRY__;

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
      fuelTons: state.fuelTons,
      fuelPoints: state.fuelPoints,
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
      const registry = window.__UNIT_REGISTRY__;

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
    const registry = window.__UNIT_REGISTRY__;

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
      const registry = window.__UNIT_REGISTRY__;

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
    const registry = window.__UNIT_REGISTRY__;

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
      const registry = window.__UNIT_REGISTRY__;

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
    const registry = window.__UNIT_REGISTRY__;

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
  const configuration = toMechConfiguration(options.configuration);
  const lamMode = options.lamMode ? toLAMMode(options.lamMode) : undefined;
  // First create a standard mech
  const unitId = await createMechUnit(page, {
    name: options.name ?? `Test ${options.configuration} ${Date.now()}`,
    tonnage: options.tonnage,
    techBase: options.techBase,
    walkMP: options.walkMP,
  });

  // Then set the configuration via store action
  await page.evaluate(
    ({ id, configuration: nextConfiguration, isLAM, lamMode: nextLAMMode }) => {
      const registry = window.__UNIT_REGISTRY__;

      if (!registry) {
        throw new Error('Unit registry not exposed');
      }

      const store = registry.getUnitStore(id);
      if (!store) {
        throw new Error(`Unit store not found for ID: ${id}`);
      }

      const state = store.getState();
      state.setConfiguration(nextConfiguration);

      // Set LAM mode if applicable
      if (isLAM && nextLAMMode && state.setLAMMode) {
        state.setLAMMode(nextLAMMode);
      }
    },
    {
      id: unitId,
      configuration,
      isLAM: configuration === MechConfiguration.LAM,
      lamMode,
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
    const registry = window.__UNIT_REGISTRY__;

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
  const lamMode = toLAMMode(mode);
  await page.evaluate(
    ({ id, mode }) => {
      const registry = window.__UNIT_REGISTRY__;

      if (!registry) {
        throw new Error('Unit registry not exposed');
      }

      const store = registry.getUnitStore(id);
      if (!store) {
        throw new Error(`Unit store not found for ID: ${id}`);
      }

      store.getState().setLAMMode(mode);
    },
    { id: unitId, mode: lamMode },
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
