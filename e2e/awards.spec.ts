/**
 * Awards System E2E Tests
 *
 * Tests for the pilot awards system including award tracking,
 * progress tracking, and award evaluation.
 *
 * NOTE: The pilot store uses API persistence, so we use mock pilot IDs
 * for award store testing since the award store tracks stats independently
 * of the pilot store.
 *
 * @spec openspec/changes/add-comprehensive-e2e-tests/tasks.md - Section 12
 * @tags @awards @gameplay
 */

import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// Test Configuration
// =============================================================================

test.setTimeout(30000);

// Helper to wait for page hydration
async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// Helper to wait for store to be ready
async function waitForAwardStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { award?: unknown };
      };
      return win.__ZUSTAND_STORES__?.award !== undefined;
    },
    { timeout: 10000 },
  );
}

// =============================================================================
// Award Store Fixtures
// =============================================================================

/**
 * Generates a unique test pilot ID for award tracking
 * Note: This doesn't create a real pilot, just an ID for the award store
 */
function generateTestPilotId(): string {
  return `test-pilot-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Gets pilot stats from the award store
 */
async function getPilotStats(
  page: Page,
  pilotId: string,
): Promise<{
  combat: { totalKills: number; totalDamageDealt: number };
  career: { missionsCompleted: number; gamesPlayed: number };
} | null> {
  return page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          award?: {
            getState: () => {
              getPilotStats: (pilotId: string) => {
                combat: { totalKills: number; totalDamageDealt: number };
                career: { missionsCompleted: number; gamesPlayed: number };
              };
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.award) {
      return null;
    }

    return stores.award.getState().getPilotStats(id);
  }, pilotId);
}

/**
 * Records a kill for a pilot
 */
async function recordKill(page: Page, pilotId: string): Promise<void> {
  await page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          award?: {
            getState: () => {
              recordKill: (pilotId: string, context: object) => void;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.award) {
      throw new Error('Award store not exposed');
    }

    stores.award.getState().recordKill(id, {});
  }, pilotId);
}

/**
 * Records damage dealt by a pilot
 */
async function recordDamage(
  page: Page,
  pilotId: string,
  damage: number,
): Promise<void> {
  await page.evaluate(
    ({ id, dmg }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            award?: {
              getState: () => {
                recordDamage: (
                  pilotId: string,
                  damage: number,
                  context: object,
                ) => void;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.award) {
        throw new Error('Award store not exposed');
      }

      stores.award.getState().recordDamage(id, dmg, {});
    },
    { id: pilotId, dmg: damage },
  );
}

/**
 * Records a mission completion
 */
async function recordMissionComplete(
  page: Page,
  pilotId: string,
  survived: boolean = true,
): Promise<void> {
  await page.evaluate(
    ({ id, surv }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            award?: {
              getState: () => {
                recordMissionComplete: (
                  pilotId: string,
                  survived: boolean,
                  context: object,
                ) => void;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.award) {
        throw new Error('Award store not exposed');
      }

      stores.award.getState().recordMissionComplete(id, surv, {});
    },
    { id: pilotId, surv: survived },
  );
}

/**
 * Gets pilot awards
 */
async function getPilotAwards(
  page: Page,
  pilotId: string,
): Promise<Array<{ awardId: string; earnedAt: string }>> {
  return page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          award?: {
            getState: () => {
              getPilotAwards: (
                pilotId: string,
              ) => Array<{ awardId: string; earnedAt: string }>;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.award) {
      return [];
    }

    return stores.award.getState().getPilotAwards(id);
  }, pilotId);
}

/**
 * Checks if a pilot has a specific award
 */
async function hasPilotAward(
  page: Page,
  pilotId: string,
  awardId: string,
): Promise<boolean> {
  return page.evaluate(
    ({ id, award }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            award?: {
              getState: () => {
                hasPilotAward: (pilotId: string, awardId: string) => boolean;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.award) {
        return false;
      }

      return stores.award.getState().hasPilotAward(id, award);
    },
    { id: pilotId, award: awardId },
  );
}

/**
 * Grants an award directly (for testing)
 */
async function grantAward(
  page: Page,
  pilotId: string,
  awardId: string,
): Promise<boolean> {
  return page.evaluate(
    ({ id, award }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            award?: {
              getState: () => {
                grantAward: (input: {
                  pilotId: string;
                  awardId: string;
                }) => boolean;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.award) {
        return false;
      }

      return stores.award
        .getState()
        .grantAward({ pilotId: id, awardId: award });
    },
    { id: pilotId, award: awardId },
  );
}

// =============================================================================
// Award Store Tests
// =============================================================================

test.describe('Awards Store @awards @gameplay', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to any page to initialize stores
    await page.goto('/');
    await waitForHydration(page);
    await waitForAwardStoreReady(page);
  });

  test('can get pilot stats', async ({ page }) => {
    const pilotId = generateTestPilotId();
    const stats = await getPilotStats(page, pilotId);

    expect(stats).not.toBeNull();
    expect(stats?.combat.totalKills).toBe(0);
    expect(stats?.combat.totalDamageDealt).toBe(0);
    expect(stats?.career.missionsCompleted).toBe(0);
  });

  test('can record kills', async ({ page }) => {
    const pilotId = generateTestPilotId();

    // Record 3 kills
    await recordKill(page, pilotId);
    await recordKill(page, pilotId);
    await recordKill(page, pilotId);

    const stats = await getPilotStats(page, pilotId);
    expect(stats?.combat.totalKills).toBe(3);
  });

  test('can record damage', async ({ page }) => {
    const pilotId = generateTestPilotId();

    // Record 150 damage
    await recordDamage(page, pilotId, 100);
    await recordDamage(page, pilotId, 50);

    const stats = await getPilotStats(page, pilotId);
    expect(stats?.combat.totalDamageDealt).toBe(150);
  });

  test('can record mission completion', async ({ page }) => {
    const pilotId = generateTestPilotId();

    // Complete 2 missions
    await recordMissionComplete(page, pilotId, true);
    await recordMissionComplete(page, pilotId, true);

    const stats = await getPilotStats(page, pilotId);
    expect(stats?.career.missionsCompleted).toBe(2);
  });

  test('can grant award directly', async ({ page }) => {
    const pilotId = generateTestPilotId();

    // Grant "First Blood" award
    const granted = await grantAward(page, pilotId, 'first-blood');
    expect(granted).toBe(true);

    // Verify award is recorded
    const hasAward = await hasPilotAward(page, pilotId, 'first-blood');
    expect(hasAward).toBe(true);
  });

  test('can get pilot awards list', async ({ page }) => {
    const pilotId = generateTestPilotId();

    // Grant multiple awards
    await grantAward(page, pilotId, 'first-blood');
    await grantAward(page, pilotId, 'survivor');

    // Check awards list
    const awards = await getPilotAwards(page, pilotId);
    expect(awards.length).toBe(2);

    const awardIds = awards.map((a) => a.awardId);
    expect(awardIds).toContain('first-blood');
    expect(awardIds).toContain('survivor');
  });

  test('kill awards are evaluated automatically', async ({ page }) => {
    const pilotId = generateTestPilotId();

    // Record 1 kill - should trigger "First Blood" award
    await recordKill(page, pilotId);

    // Check if First Blood was automatically awarded
    const hasFirstBlood = await hasPilotAward(page, pilotId, 'first-blood');
    expect(hasFirstBlood).toBe(true);
  });

  test('mission awards are evaluated automatically', async ({ page }) => {
    const pilotId = generateTestPilotId();

    // Complete 1 mission - should trigger "Survivor" award
    await recordMissionComplete(page, pilotId, true);

    // Check if Survivor was automatically awarded
    const hasSurvivor = await hasPilotAward(page, pilotId, 'survivor');
    expect(hasSurvivor).toBe(true);
  });
});

// =============================================================================
// Award UI Tests
// =============================================================================

test.describe('Awards UI @awards @gameplay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await waitForAwardStoreReady(page);
  });

  test('pilots list page loads', async ({ page }) => {
    await page.goto('/gameplay/pilots');
    await waitForHydration(page);

    await expect(page).toHaveURL('/gameplay/pilots');
  });

  test('pilot create page loads', async ({ page }) => {
    await page.goto('/gameplay/pilots/create');
    await waitForHydration(page);

    await expect(page).toHaveURL('/gameplay/pilots/create');
  });
});

// =============================================================================
// Award Progress Tests
// =============================================================================

test.describe('Award Progress Tracking @awards @gameplay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await waitForAwardStoreReady(page);
  });

  test('stats accumulate across multiple actions', async ({ page }) => {
    const pilotId = generateTestPilotId();

    // Accumulate various stats
    await recordKill(page, pilotId);
    await recordKill(page, pilotId);
    await recordDamage(page, pilotId, 75);
    await recordDamage(page, pilotId, 25);
    await recordMissionComplete(page, pilotId, true);

    const stats = await getPilotStats(page, pilotId);
    expect(stats?.combat.totalKills).toBe(2);
    expect(stats?.combat.totalDamageDealt).toBe(100);
    expect(stats?.career.missionsCompleted).toBe(1);
  });

  test('multiple pilots have independent stats', async ({ page }) => {
    const pilot1 = generateTestPilotId();
    const pilot2 = generateTestPilotId();

    // Different actions for each pilot
    await recordKill(page, pilot1);
    await recordKill(page, pilot1);
    await recordKill(page, pilot2);

    const stats1 = await getPilotStats(page, pilot1);
    const stats2 = await getPilotStats(page, pilot2);

    expect(stats1?.combat.totalKills).toBe(2);
    expect(stats2?.combat.totalKills).toBe(1);
  });

  test('multiple pilots have independent awards', async ({ page }) => {
    const pilot1 = generateTestPilotId();
    const pilot2 = generateTestPilotId();

    // Grant awards to different pilots
    await grantAward(page, pilot1, 'first-blood');
    await grantAward(page, pilot2, 'survivor');

    const has1 = await hasPilotAward(page, pilot1, 'first-blood');
    const has2 = await hasPilotAward(page, pilot1, 'survivor');
    const has3 = await hasPilotAward(page, pilot2, 'first-blood');
    const has4 = await hasPilotAward(page, pilot2, 'survivor');

    expect(has1).toBe(true);
    expect(has2).toBe(false);
    expect(has3).toBe(false);
    expect(has4).toBe(true);
  });
});
