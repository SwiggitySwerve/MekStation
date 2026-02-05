import { Page } from '@playwright/test';

/**
 * Pilot type enum values
 */
export type PilotType = 'persistent' | 'statblock';

/**
 * Pilot skills interface
 */
export interface TestPilotSkills {
  /** Gunnery skill (1-8, lower is better). Defaults to 4 */
  gunnery: number;
  /** Piloting skill (1-8, lower is better). Defaults to 5 */
  piloting: number;
}

/**
 * Options for creating a test pilot
 */
export interface TestPilotOptions {
  /** Pilot name. Defaults to 'Test Pilot {timestamp}' */
  name?: string;
  /** Pilot callsign */
  callsign?: string;
  /** Pilot affiliation */
  affiliation?: string;
  /** Pilot portrait URL or identifier */
  portrait?: string;
  /** Pilot background/bio */
  background?: string;
  /** Pilot type. Defaults to 'persistent' */
  type?: PilotType;
  /** Pilot skills. Defaults to { gunnery: 4, piloting: 5 } */
  skills?: Partial<TestPilotSkills>;
  /** Ability IDs to assign */
  abilityIds?: string[];
  /** Starting XP. Defaults to 0 */
  startingXp?: number;
  /** Military rank */
  rank?: string;
}

/**
 * Skill level presets for common pilot types
 */
export const PILOT_SKILL_PRESETS = {
  /** Green pilot (5/6) */
  green: { gunnery: 5, piloting: 6 },
  /** Regular pilot (4/5) */
  regular: { gunnery: 4, piloting: 5 },
  /** Veteran pilot (3/4) */
  veteran: { gunnery: 3, piloting: 4 },
  /** Elite pilot (2/3) */
  elite: { gunnery: 2, piloting: 3 },
  /** Legendary pilot (1/2) */
  legendary: { gunnery: 1, piloting: 2 },
} as const;

/**
 * Creates a test pilot via the pilot store.
 * Requires the store to be exposed on window.__ZUSTAND_STORES__.pilot
 *
 * @param page - Playwright page object
 * @param options - Pilot creation options
 * @returns The created pilot ID or null if creation failed
 * @throws Error if pilot store is not exposed
 *
 * @example
 * ```typescript
 * const pilotId = await createTestPilot(page, {
 *   name: 'John "Maverick" Smith',
 *   callsign: 'Maverick',
 *   skills: PILOT_SKILL_PRESETS.veteran,
 * });
 * ```
 */
export async function createTestPilot(
  page: Page,
  options: TestPilotOptions = {},
): Promise<string | null> {
  const pilotId = await page.evaluate(async (opts) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          pilot?: {
            getState: () => {
              createPilot: (options: {
                identity: {
                  name: string;
                  callsign?: string;
                  affiliation?: string;
                  portrait?: string;
                  background?: string;
                };
                type: string;
                skills: { gunnery: number; piloting: number };
                abilityIds?: string[];
                startingXp?: number;
                rank?: string;
              }) => Promise<string | null>;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.pilot) {
      throw new Error(
        'Pilot store not exposed. Ensure window.__ZUSTAND_STORES__.pilot is set in your app for E2E testing.',
      );
    }

    const store = stores.pilot.getState();
    return store.createPilot({
      identity: {
        name: opts.name || `Test Pilot ${Date.now()}`,
        callsign: opts.callsign,
        affiliation: opts.affiliation,
        portrait: opts.portrait,
        background: opts.background || 'E2E test pilot',
      },
      type: opts.type || 'persistent',
      skills: {
        gunnery: opts.skills?.gunnery ?? 4,
        piloting: opts.skills?.piloting ?? 5,
      },
      abilityIds: opts.abilityIds,
      startingXp: opts.startingXp ?? 0,
      rank: opts.rank,
    });
  }, options);

  return pilotId;
}

/**
 * Creates a green pilot with 5/6 skills.
 *
 * @param page - Playwright page object
 * @param name - Pilot name
 * @returns The created pilot ID or null
 */
export async function createGreenPilot(
  page: Page,
  name?: string,
): Promise<string | null> {
  return createTestPilot(page, {
    name: name || `Green Pilot ${Date.now()}`,
    skills: PILOT_SKILL_PRESETS.green,
  });
}

/**
 * Creates a regular pilot with 4/5 skills.
 *
 * @param page - Playwright page object
 * @param name - Pilot name
 * @returns The created pilot ID or null
 */
export async function createRegularPilot(
  page: Page,
  name?: string,
): Promise<string | null> {
  return createTestPilot(page, {
    name: name || `Regular Pilot ${Date.now()}`,
    skills: PILOT_SKILL_PRESETS.regular,
  });
}

/**
 * Creates a veteran pilot with 3/4 skills.
 *
 * @param page - Playwright page object
 * @param name - Pilot name
 * @returns The created pilot ID or null
 */
export async function createVeteranPilot(
  page: Page,
  name?: string,
): Promise<string | null> {
  return createTestPilot(page, {
    name: name || `Veteran Pilot ${Date.now()}`,
    skills: PILOT_SKILL_PRESETS.veteran,
  });
}

/**
 * Creates an elite pilot with 2/3 skills.
 *
 * @param page - Playwright page object
 * @param name - Pilot name
 * @returns The created pilot ID or null
 */
export async function createElitePilot(
  page: Page,
  name?: string,
): Promise<string | null> {
  return createTestPilot(page, {
    name: name || `Elite Pilot ${Date.now()}`,
    skills: PILOT_SKILL_PRESETS.elite,
  });
}

/**
 * Creates multiple pilots at once.
 *
 * @param page - Playwright page object
 * @param count - Number of pilots to create
 * @param baseOptions - Base options to apply to all pilots
 * @returns Array of created pilot IDs (nulls filtered out)
 */
export async function createMultiplePilots(
  page: Page,
  count: number,
  baseOptions: TestPilotOptions = {},
): Promise<string[]> {
  const pilotIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const pilotId = await createTestPilot(page, {
      ...baseOptions,
      name: baseOptions.name
        ? `${baseOptions.name} ${i + 1}`
        : `Test Pilot ${i + 1} ${Date.now()}`,
    });
    if (pilotId) {
      pilotIds.push(pilotId);
    }
  }

  return pilotIds;
}

/**
 * Creates a full lance of 4 pilots with mixed skill levels.
 *
 * @param page - Playwright page object
 * @param lanceName - Base name for the lance pilots
 * @returns Array of 4 pilot IDs
 */
export async function createLancePilots(
  page: Page,
  lanceName: string = 'Alpha',
): Promise<string[]> {
  const pilots: string[] = [];

  // Commander - Veteran
  const commander = await createTestPilot(page, {
    name: `${lanceName} Lead`,
    callsign: `${lanceName}-1`,
    skills: PILOT_SKILL_PRESETS.veteran,
    rank: 'Lieutenant',
  });
  if (commander) pilots.push(commander);

  // 2nd in command - Regular
  const second = await createTestPilot(page, {
    name: `${lanceName} Second`,
    callsign: `${lanceName}-2`,
    skills: PILOT_SKILL_PRESETS.regular,
    rank: 'Sergeant',
  });
  if (second) pilots.push(second);

  // Two regular members - Green/Regular mix
  const member1 = await createTestPilot(page, {
    name: `${lanceName} Three`,
    callsign: `${lanceName}-3`,
    skills: PILOT_SKILL_PRESETS.regular,
    rank: 'Corporal',
  });
  if (member1) pilots.push(member1);

  const member2 = await createTestPilot(page, {
    name: `${lanceName} Four`,
    callsign: `${lanceName}-4`,
    skills: PILOT_SKILL_PRESETS.green,
    rank: 'Private',
  });
  if (member2) pilots.push(member2);

  return pilots;
}

/**
 * Retrieves a pilot by ID from the store.
 *
 * @param page - Playwright page object
 * @param pilotId - The pilot ID to retrieve
 * @returns The pilot object or null if not found
 */
export async function getPilot(
  page: Page,
  pilotId: string,
): Promise<{
  id: string;
  name: string;
  callsign?: string;
  type: string;
  status: string;
  skills: { gunnery: number; piloting: number };
} | null> {
  return page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          pilot?: {
            getState: () => {
              pilots: Map<
                string,
                {
                  id: string;
                  name: string;
                  callsign?: string;
                  type: string;
                  status: string;
                  skills: { gunnery: number; piloting: number };
                }
              >;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.pilot) {
      throw new Error('Pilot store not exposed');
    }

    const state = stores.pilot.getState();
    return state.pilots.get(id) || null;
  }, pilotId);
}

/**
 * Deletes a pilot by ID.
 *
 * @param page - Playwright page object
 * @param pilotId - The pilot ID to delete
 */
export async function deletePilot(page: Page, pilotId: string): Promise<void> {
  await page.evaluate(async (id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          pilot?: {
            getState: () => { deletePilot: (id: string) => Promise<void> };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.pilot) {
      throw new Error('Pilot store not exposed');
    }

    await stores.pilot.getState().deletePilot(id);
  }, pilotId);
}
