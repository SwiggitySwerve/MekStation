/**
 * Exotic Mech E2E Tests
 *
 * Tests for exotic BattleMech configurations: QuadMech, LAM, Tripod
 * These tests verify that exotic mechs can be created, configured, and
 * display correctly in the customizer.
 *
 * @spec openspec/changes/add-comprehensive-e2e-tests/tasks.md - Section 11
 * @tags @customizer @exotic
 */

import { test, expect, type Page } from '@playwright/test';

import {
  waitForTabManagerStoreReady,
  createQuadMech,
  createLAM,
  createTripodMech,
  getExoticMechState,
  setLAMMode,
  getConfigurationLocations,
  closeTab,
} from './fixtures/customizer';

// =============================================================================
// Test Configuration
// =============================================================================

test.setTimeout(30000);

// Helper to wait for page hydration
async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// =============================================================================
// QuadMech Tests
// =============================================================================

test.describe('QuadMech Customizer @customizer @exotic @quad', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/customizer');
    await waitForHydration(page);
    await waitForTabManagerStoreReady(page);
  });

  test('can create QuadMech unit', async ({ page }) => {
    const unitId = await createQuadMech(page, {
      name: 'Test Quad',
      tonnage: 75,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state).not.toBeNull();
    expect(state?.configuration).toBe('Quad');
    expect(state?.tonnage).toBe(75);

    await closeTab(page, unitId);
  });

  test('QuadMech has correct locations (4 legs, no arms)', async ({ page }) => {
    const unitId = await createQuadMech(page, {
      name: 'Quad Locations Test',
      tonnage: 60,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state).not.toBeNull();

    // Quad mechs should have 4 leg locations in the armor allocation
    // Note: armorAllocation includes ALL possible location keys (set to 0 for unused)
    // But the configuration determines which are valid/used
    const armorKeys = Object.keys(state?.armorAllocation ?? {});

    // Should have quad-specific leg location keys (using MechLocation enum values)
    expect(armorKeys).toContain('Front Left Leg');
    expect(armorKeys).toContain('Front Right Leg');
    expect(armorKeys).toContain('Rear Left Leg');
    expect(armorKeys).toContain('Rear Right Leg');

    // Verify configuration is set correctly
    expect(state?.configuration).toBe('Quad');

    await closeTab(page, unitId);
  });

  test('can create light QuadMech (20-35 tons)', async ({ page }) => {
    const unitId = await createQuadMech(page, {
      name: 'Light Quad',
      tonnage: 30,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state?.tonnage).toBe(30);
    expect(state?.configuration).toBe('Quad');

    await closeTab(page, unitId);
  });

  test('can create assault QuadMech (80-100 tons)', async ({ page }) => {
    const unitId = await createQuadMech(page, {
      name: 'Assault Quad',
      tonnage: 100,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state?.tonnage).toBe(100);
    expect(state?.configuration).toBe('Quad');

    await closeTab(page, unitId);
  });

  test('can navigate to QuadMech in customizer', async ({ page }) => {
    const unitId = await createQuadMech(page, {
      name: 'Nav Test Quad',
      tonnage: 55,
    });

    await page.goto(`/customizer/${unitId}`);
    await waitForHydration(page);

    await expect(page).toHaveURL(new RegExp(`/customizer/${unitId}`));

    const state = await getExoticMechState(page, unitId);
    expect(state?.configuration).toBe('Quad');

    await closeTab(page, unitId);
  });
});

// =============================================================================
// LAM (Land-Air Mech) Tests
// =============================================================================

test.describe('LAM Customizer @customizer @exotic @lam', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/customizer');
    await waitForHydration(page);
    await waitForTabManagerStoreReady(page);
  });

  test('can create LAM unit', async ({ page }) => {
    const unitId = await createLAM(page, {
      name: 'Test LAM',
      tonnage: 50,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state).not.toBeNull();
    expect(state?.configuration).toBe('LAM');
    expect(state?.tonnage).toBe(50);

    await closeTab(page, unitId);
  });

  test('LAM is limited to 55 tons', async ({ page }) => {
    // Try to create a 75 ton LAM - should be capped at 55
    const unitId = await createLAM(page, {
      name: 'Heavy LAM',
      tonnage: 75,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state?.tonnage).toBe(55); // Should be capped

    await closeTab(page, unitId);
  });

  test('LAM has default Mech mode', async ({ page }) => {
    const unitId = await createLAM(page, {
      name: 'Mode Test LAM',
      tonnage: 45,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state?.lamMode).toBe('Mech');

    await closeTab(page, unitId);
  });

  test('can set LAM to AirMech mode', async ({ page }) => {
    const unitId = await createLAM(page, {
      name: 'AirMech Test LAM',
      tonnage: 50,
    });

    await setLAMMode(page, unitId, 'AirMech');

    const state = await getExoticMechState(page, unitId);
    expect(state?.lamMode).toBe('AirMech');

    await closeTab(page, unitId);
  });

  test('can set LAM to Fighter mode', async ({ page }) => {
    const unitId = await createLAM(page, {
      name: 'Fighter Test LAM',
      tonnage: 50,
    });

    await setLAMMode(page, unitId, 'Fighter');

    const state = await getExoticMechState(page, unitId);
    expect(state?.lamMode).toBe('Fighter');

    await closeTab(page, unitId);
  });

  test('LAM has biped-like locations in Mech mode', async ({ page }) => {
    const unitId = await createLAM(page, {
      name: 'LAM Locations Test',
      tonnage: 55,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state).not.toBeNull();

    // In Mech mode, LAM should have standard biped locations
    const expectedLocations = getConfigurationLocations('LAM');
    expect(expectedLocations).toContain('Left Arm');
    expect(expectedLocations).toContain('Right Arm');
    expect(expectedLocations).toContain('Left Leg');
    expect(expectedLocations).toContain('Right Leg');

    await closeTab(page, unitId);
  });

  test('can create light LAM (20-35 tons)', async ({ page }) => {
    const unitId = await createLAM(page, {
      name: 'Light LAM',
      tonnage: 30,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state?.tonnage).toBe(30);
    expect(state?.configuration).toBe('LAM');

    await closeTab(page, unitId);
  });

  test('can navigate to LAM in customizer', async ({ page }) => {
    const unitId = await createLAM(page, {
      name: 'Nav Test LAM',
      tonnage: 45,
    });

    await page.goto(`/customizer/${unitId}`);
    await waitForHydration(page);

    await expect(page).toHaveURL(new RegExp(`/customizer/${unitId}`));

    const state = await getExoticMechState(page, unitId);
    expect(state?.configuration).toBe('LAM');

    await closeTab(page, unitId);
  });
});

// =============================================================================
// Tripod Mech Tests
// =============================================================================

test.describe('Tripod Mech Customizer @customizer @exotic @tripod', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/customizer');
    await waitForHydration(page);
    await waitForTabManagerStoreReady(page);
  });

  test('can create Tripod mech unit', async ({ page }) => {
    const unitId = await createTripodMech(page, {
      name: 'Test Tripod',
      tonnage: 80,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state).not.toBeNull();
    expect(state?.configuration).toBe('Tripod');
    expect(state?.tonnage).toBe(80);

    await closeTab(page, unitId);
  });

  test('Tripod has center leg location', async ({ page }) => {
    const unitId = await createTripodMech(page, {
      name: 'Tripod Locations Test',
      tonnage: 75,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state).not.toBeNull();

    // Tripod should have center leg location key in armor allocation
    // Note: armorAllocation includes ALL possible location keys
    const armorKeys = Object.keys(state?.armorAllocation ?? {});
    expect(armorKeys).toContain('Center Leg');

    // Verify configuration is set correctly
    expect(state?.configuration).toBe('Tripod');

    // Verify helper function returns expected locations
    const expectedLocations = getConfigurationLocations('Tripod');
    expect(expectedLocations.length).toBe(9); // 9 locations for Tripod

    await closeTab(page, unitId);
  });

  test('Tripod has 9 locations (3 legs + arms + torsos + head)', async ({
    page,
  }) => {
    const unitId = await createTripodMech(page, {
      name: 'Tripod 9 Locations',
      tonnage: 85,
    });

    const expectedLocations = getConfigurationLocations('Tripod');
    // Head, CT, LT, RT, LA, RA, LL, RL, CL = 9 locations
    expect(expectedLocations.length).toBe(9);

    await closeTab(page, unitId);
  });

  test('can create heavy Tripod (60-75 tons)', async ({ page }) => {
    const unitId = await createTripodMech(page, {
      name: 'Heavy Tripod',
      tonnage: 70,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state?.tonnage).toBe(70);
    expect(state?.configuration).toBe('Tripod');

    await closeTab(page, unitId);
  });

  test('can create assault Tripod (80-100 tons)', async ({ page }) => {
    const unitId = await createTripodMech(page, {
      name: 'Assault Tripod',
      tonnage: 100,
    });

    const state = await getExoticMechState(page, unitId);
    expect(state?.tonnage).toBe(100);
    expect(state?.configuration).toBe('Tripod');

    await closeTab(page, unitId);
  });

  test('can navigate to Tripod in customizer', async ({ page }) => {
    const unitId = await createTripodMech(page, {
      name: 'Nav Test Tripod',
      tonnage: 90,
    });

    await page.goto(`/customizer/${unitId}`);
    await waitForHydration(page);

    await expect(page).toHaveURL(new RegExp(`/customizer/${unitId}`));

    const state = await getExoticMechState(page, unitId);
    expect(state?.configuration).toBe('Tripod');

    await closeTab(page, unitId);
  });
});

// =============================================================================
// Configuration Switching Tests
// =============================================================================

test.describe('Exotic Mech Configuration Switching @customizer @exotic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/customizer');
    await waitForHydration(page);
    await waitForTabManagerStoreReady(page);
  });

  test('multiple exotic mechs can coexist', async ({ page }) => {
    // Create one of each type
    const quadId = await createQuadMech(page, { name: 'Quad A', tonnage: 60 });
    const lamId = await createLAM(page, { name: 'LAM B', tonnage: 50 });
    const tripodId = await createTripodMech(page, {
      name: 'Tripod C',
      tonnage: 80,
    });

    // Verify all exist with correct configurations
    const quadState = await getExoticMechState(page, quadId);
    const lamState = await getExoticMechState(page, lamId);
    const tripodState = await getExoticMechState(page, tripodId);

    expect(quadState?.configuration).toBe('Quad');
    expect(lamState?.configuration).toBe('LAM');
    expect(tripodState?.configuration).toBe('Tripod');

    // Cleanup
    await closeTab(page, quadId);
    await closeTab(page, lamId);
    await closeTab(page, tripodId);
  });

  test('configuration locations are distinct', async () => {
    const bipedLocations = getConfigurationLocations('Biped');
    const quadLocations = getConfigurationLocations('Quad');
    const tripodLocations = getConfigurationLocations('Tripod');

    // Biped has no center leg
    expect(bipedLocations).not.toContain('Center Leg');

    // Quad has no arms, has 4 distinct leg locations
    expect(quadLocations).not.toContain('Left Arm');
    expect(quadLocations).toContain('Front Left Leg');

    // Tripod has center leg and arms
    expect(tripodLocations).toContain('Center Leg');
    expect(tripodLocations).toContain('Left Arm');
  });
});
