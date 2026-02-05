import { Page } from '@playwright/test';

/**
 * Scenario template types
 */
export type ScenarioTemplateType = 'duel' | 'skirmish' | 'battle' | 'custom';

/**
 * Terrain preset types
 */
export type TerrainPreset =
  | 'clear'
  | 'light_woods'
  | 'heavy_woods'
  | 'urban'
  | 'rough';

/**
 * Deployment zone directions
 */
export type DeploymentZone = 'north' | 'south' | 'east' | 'west';

/**
 * Map configuration options
 */
export interface TestMapConfig {
  /** Map radius in hexes. Defaults to 15 */
  radius?: number;
  /** Terrain preset. Defaults to 'clear' */
  terrain?: TerrainPreset;
  /** Player deployment zone. Defaults to 'south' */
  playerDeploymentZone?: DeploymentZone;
  /** Opponent deployment zone. Defaults to 'north' */
  opponentDeploymentZone?: DeploymentZone;
}

/**
 * Options for creating a test encounter
 */
export interface TestEncounterOptions {
  /** Encounter name. Defaults to 'Test Encounter {timestamp}' */
  name?: string;
  /** Encounter description */
  description?: string;
  /** Scenario template type. Defaults to 'skirmish' */
  template?: ScenarioTemplateType;
}

/**
 * Extended options for creating an encounter with full configuration
 */
export interface TestEncounterFullOptions extends TestEncounterOptions {
  /** Player force ID */
  playerForceId?: string;
  /** Opponent force ID */
  opponentForceId?: string;
  /** Map configuration */
  mapConfig?: TestMapConfig;
  /** Optional rules to enable */
  optionalRules?: string[];
}

/**
 * Creates a test encounter via the encounter store.
 * Requires the store to be exposed on window.__ZUSTAND_STORES__.encounter
 *
 * @param page - Playwright page object
 * @param options - Encounter creation options
 * @returns The created encounter ID or null if creation failed
 * @throws Error if encounter store is not exposed
 *
 * @example
 * ```typescript
 * const encounterId = await createTestEncounter(page, {
 *   name: 'Training Exercise',
 *   template: 'duel',
 * });
 * ```
 */
export async function createTestEncounter(
  page: Page,
  options: TestEncounterOptions = {},
): Promise<string | null> {
  const encounterId = await page.evaluate(async (opts) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          encounter?: {
            getState: () => {
              createEncounter: (input: {
                name: string;
                description?: string;
                template?: string;
              }) => Promise<string | null>;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.encounter) {
      throw new Error(
        'Encounter store not exposed. Ensure window.__ZUSTAND_STORES__.encounter is set in your app for E2E testing.',
      );
    }

    const store = stores.encounter.getState();
    return store.createEncounter({
      name: opts.name || `Test Encounter ${Date.now()}`,
      description: opts.description || 'E2E test encounter',
      template: opts.template || 'skirmish',
    });
  }, options);

  return encounterId;
}

/**
 * Creates a duel encounter (1v1).
 *
 * @param page - Playwright page object
 * @param name - Encounter name
 * @returns The created encounter ID or null
 */
export async function createDuelEncounter(
  page: Page,
  name?: string,
): Promise<string | null> {
  return createTestEncounter(page, {
    name: name || `Duel ${Date.now()}`,
    template: 'duel',
    description: 'One-on-one combat',
  });
}

/**
 * Creates a skirmish encounter (small-scale battle).
 *
 * @param page - Playwright page object
 * @param name - Encounter name
 * @returns The created encounter ID or null
 */
export async function createSkirmishEncounter(
  page: Page,
  name?: string,
): Promise<string | null> {
  return createTestEncounter(page, {
    name: name || `Skirmish ${Date.now()}`,
    template: 'skirmish',
    description: 'Small-scale combat engagement',
  });
}

/**
 * Creates a battle encounter (large-scale engagement).
 *
 * @param page - Playwright page object
 * @param name - Encounter name
 * @returns The created encounter ID or null
 */
export async function createBattleEncounter(
  page: Page,
  name?: string,
): Promise<string | null> {
  return createTestEncounter(page, {
    name: name || `Battle ${Date.now()}`,
    template: 'battle',
    description: 'Large-scale combat engagement',
  });
}

/**
 * Creates an encounter with forces assigned.
 *
 * @param page - Playwright page object
 * @param name - Encounter name
 * @param playerForceId - Player force ID
 * @param opponentForceId - Opponent force ID
 * @returns The created encounter ID or null
 */
export async function createEncounterWithForces(
  page: Page,
  name: string,
  playerForceId: string,
  opponentForceId: string,
): Promise<string | null> {
  // First create the encounter
  const encounterId = await createTestEncounter(page, { name });

  if (!encounterId) {
    return null;
  }

  // Then assign forces
  await page.evaluate(
    async ({ encounterId, playerForceId, opponentForceId }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            encounter?: {
              getState: () => {
                setPlayerForce: (
                  encounterId: string,
                  forceId: string,
                ) => Promise<void>;
                setOpponentForce: (
                  encounterId: string,
                  forceId: string,
                ) => Promise<void>;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.encounter) {
        throw new Error('Encounter store not exposed');
      }

      const store = stores.encounter.getState();
      await store.setPlayerForce(encounterId, playerForceId);
      await store.setOpponentForce(encounterId, opponentForceId);
    },
    { encounterId, playerForceId, opponentForceId },
  );

  return encounterId;
}

/**
 * Retrieves an encounter by ID from the store.
 *
 * @param page - Playwright page object
 * @param encounterId - The encounter ID to retrieve
 * @returns The encounter object or null if not found
 */
export async function getEncounter(
  page: Page,
  encounterId: string,
): Promise<{
  id: string;
  name: string;
  status: string;
  template?: string;
  description?: string;
} | null> {
  return page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          encounter?: {
            getState: () => {
              encounters: Array<{
                id: string;
                name: string;
                status: string;
                template?: string;
                description?: string;
              }>;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.encounter) {
      throw new Error('Encounter store not exposed');
    }

    const state = stores.encounter.getState();
    // encounters is an array, not a Map
    return state.encounters.find((e) => e.id === id) || null;
  }, encounterId);
}

/**
 * Updates encounter map configuration.
 *
 * @param page - Playwright page object
 * @param encounterId - The encounter ID to update
 * @param mapConfig - Map configuration to set
 */
export async function setEncounterMapConfig(
  page: Page,
  encounterId: string,
  mapConfig: TestMapConfig,
): Promise<void> {
  await page.evaluate(
    async ({ encounterId, mapConfig }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            encounter?: {
              getState: () => {
                updateMapConfig: (
                  encounterId: string,
                  config: {
                    radius?: number;
                    terrain?: string;
                    playerDeploymentZone?: string;
                    opponentDeploymentZone?: string;
                  },
                ) => Promise<void>;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.encounter) {
        throw new Error('Encounter store not exposed');
      }

      await stores.encounter.getState().updateMapConfig(encounterId, {
        radius: mapConfig.radius ?? 15,
        terrain: mapConfig.terrain ?? 'clear',
        playerDeploymentZone: mapConfig.playerDeploymentZone ?? 'south',
        opponentDeploymentZone: mapConfig.opponentDeploymentZone ?? 'north',
      });
    },
    { encounterId, mapConfig },
  );
}

/**
 * Launches an encounter (transitions from draft/ready to launched).
 *
 * @param page - Playwright page object
 * @param encounterId - The encounter ID to launch
 */
export async function launchEncounter(
  page: Page,
  encounterId: string,
): Promise<void> {
  await page.evaluate(async (id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          encounter?: {
            getState: () => {
              launchEncounter: (id: string) => Promise<void>;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.encounter) {
      throw new Error('Encounter store not exposed');
    }

    await stores.encounter.getState().launchEncounter(id);
  }, encounterId);
}

/**
 * Deletes an encounter by ID.
 *
 * @param page - Playwright page object
 * @param encounterId - The encounter ID to delete
 */
export async function deleteEncounter(
  page: Page,
  encounterId: string,
): Promise<void> {
  await page.evaluate(async (id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          encounter?: {
            getState: () => {
              deleteEncounter: (id: string) => Promise<void>;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.encounter) {
      throw new Error('Encounter store not exposed');
    }

    await stores.encounter.getState().deleteEncounter(id);
  }, encounterId);
}
