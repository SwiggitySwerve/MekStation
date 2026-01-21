/**
 * Customizer E2E Tests
 *
 * Tests for the unit customizer, focusing on aerospace fighters in Phase 8.
 * Future phases will add vehicle, OmniMech, and exotic mech tests.
 *
 * @spec openspec/changes/add-comprehensive-e2e-tests/specs/e2e-testing/spec.md
 * @tags @customizer
 */

import { test, expect, type Page } from '@playwright/test';
import { AerospaceCustomizerPage } from './pages/customizer.page';
import {
  waitForTabManagerStoreReady,
  createAerospaceUnit,
  getActiveTabId,
  getAerospaceState,
  closeTab,
} from './fixtures/customizer';

// =============================================================================
// Test Configuration
// =============================================================================

test.setTimeout(30000);

// Helper to wait for page hydration
async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Extra time for React hydration
}

// =============================================================================
// Aerospace Customizer Navigation Tests
// =============================================================================

test.describe('Aerospace Customizer Navigation @smoke @customizer', () => {
  let customizerPage: AerospaceCustomizerPage;

  test.beforeEach(async ({ page }) => {
    customizerPage = new AerospaceCustomizerPage(page);
  });

  test('customizer page loads', async ({ page }) => {
    await customizerPage.navigate();
    await waitForHydration(page);

    // Page should load without errors
    await expect(page).toHaveURL(/\/customizer/);
  });

  test('can navigate to customizer', async ({ page }) => {
    await page.goto('/customizer');
    await waitForHydration(page);

    // Should be on customizer page
    await expect(page).toHaveURL('/customizer');
  });
});

// =============================================================================
// Aerospace Structure Tab Tests
// =============================================================================

test.describe('Aerospace Structure Tab @customizer', () => {
  let customizerPage: AerospaceCustomizerPage;
  let aerospaceId: string;

  test.beforeEach(async ({ page }) => {
    customizerPage = new AerospaceCustomizerPage(page);
    
    // Navigate to customizer first to initialize stores
    await customizerPage.navigate();
    await waitForHydration(page);
    await waitForTabManagerStoreReady(page);
    
    // Create an aerospace unit
    aerospaceId = await createAerospaceUnit(page, {
      name: 'Test Aerospace Fighter',
      tonnage: 50,
      techBase: 'InnerSphere',
    });
    
    // Navigate to the aerospace unit
    await customizerPage.navigateToUnit(aerospaceId, 'structure');
    await waitForHydration(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up
    try {
      await closeTab(page, aerospaceId);
    } catch {
      // Ignore cleanup errors
    }
  });

  test('structure tab is visible when aerospace unit loaded', async ({ page }) => {
    // Wait for aerospace customizer to load
    const isVisible = await customizerPage.isAerospaceCustomizerVisible().catch(() => false);
    
    // Either aerospace customizer is visible or we're on the unit page
    expect(isVisible || await page.getByText(/structure/i).isVisible()).toBeTruthy();
  });

  test('displays aerospace unit info', async ({ page }) => {
    // Verify the unit was created correctly
    const state = await getAerospaceState(page, aerospaceId);
    expect(state).not.toBeNull();
    expect(state?.name).toBe('Test Aerospace Fighter');
    expect(state?.tonnage).toBe(50);
  });

  test('unit is active in tab manager', async ({ page }) => {
    const activeId = await getActiveTabId(page);
    expect(activeId).toBe(aerospaceId);
  });
});

// =============================================================================
// Aerospace Armor Tab Tests
// =============================================================================

test.describe('Aerospace Armor Tab @customizer', () => {
  let customizerPage: AerospaceCustomizerPage;
  let aerospaceId: string;

  test.beforeEach(async ({ page }) => {
    customizerPage = new AerospaceCustomizerPage(page);
    
    // Navigate to customizer first
    await customizerPage.navigate();
    await waitForHydration(page);
    await waitForTabManagerStoreReady(page);
    
    // Create an aerospace unit
    aerospaceId = await createAerospaceUnit(page, {
      name: 'Armor Test Fighter',
      tonnage: 65,
    });
    
    // Navigate to the unit (tab may default to structure)
    await customizerPage.navigateToUnit(aerospaceId);
    await waitForHydration(page);
  });

  test.afterEach(async ({ page }) => {
    try {
      await closeTab(page, aerospaceId);
    } catch {
      // Ignore
    }
  });

  test('can load aerospace unit in customizer', async ({ page }) => {
    // Verify we navigated to the unit
    await expect(page).toHaveURL(new RegExp(`/customizer/${aerospaceId}`));
  });

  test('aerospace unit has armor values', async ({ page }) => {
    const state = await getAerospaceState(page, aerospaceId);
    expect(state).not.toBeNull();
    // Aerospace units should have armor tonnage
    expect(state?.armorTonnage).toBeDefined();
  });
});

// =============================================================================
// Aerospace Equipment Tab Tests
// =============================================================================

test.describe('Aerospace Equipment Tab @customizer', () => {
  let customizerPage: AerospaceCustomizerPage;
  let aerospaceId: string;

  test.beforeEach(async ({ page }) => {
    customizerPage = new AerospaceCustomizerPage(page);
    
    // Navigate to customizer first
    await customizerPage.navigate();
    await waitForHydration(page);
    await waitForTabManagerStoreReady(page);
    
    // Create an aerospace unit
    aerospaceId = await createAerospaceUnit(page, {
      name: 'Equipment Test Fighter',
      tonnage: 75,
    });
    
    // Navigate to the unit
    await customizerPage.navigateToUnit(aerospaceId);
    await waitForHydration(page);
  });

  test.afterEach(async ({ page }) => {
    try {
      await closeTab(page, aerospaceId);
    } catch {
      // Ignore
    }
  });

  test('can load equipment test fighter', async ({ page }) => {
    // Verify we navigated to the unit
    await expect(page).toHaveURL(new RegExp(`/customizer/${aerospaceId}`));
  });

  test('aerospace unit has heat sinks', async ({ page }) => {
    const state = await getAerospaceState(page, aerospaceId);
    expect(state).not.toBeNull();
    // Aerospace units should have heat sinks
    expect(state?.heatSinks).toBeGreaterThan(0);
  });
});

// =============================================================================
// Aerospace Unit Creation Tests
// =============================================================================

test.describe('Aerospace Unit Creation @customizer', () => {
  let customizerPage: AerospaceCustomizerPage;

  test.beforeEach(async ({ page }) => {
    customizerPage = new AerospaceCustomizerPage(page);
    await customizerPage.navigate();
    await waitForHydration(page);
    await waitForTabManagerStoreReady(page);
  });

  test('can create light aerospace fighter', async ({ page }) => {
    const unitId = await createAerospaceUnit(page, {
      name: 'Light Fighter',
      tonnage: 25,
    });

    const state = await getAerospaceState(page, unitId);
    expect(state?.tonnage).toBe(25);

    // Cleanup
    await closeTab(page, unitId);
  });

  test('can create medium aerospace fighter', async ({ page }) => {
    const unitId = await createAerospaceUnit(page, {
      name: 'Medium Fighter',
      tonnage: 50,
    });

    const state = await getAerospaceState(page, unitId);
    expect(state?.tonnage).toBe(50);

    await closeTab(page, unitId);
  });

  test('can create heavy aerospace fighter', async ({ page }) => {
    const unitId = await createAerospaceUnit(page, {
      name: 'Heavy Fighter',
      tonnage: 75,
    });

    const state = await getAerospaceState(page, unitId);
    expect(state?.tonnage).toBe(75);

    await closeTab(page, unitId);
  });

  test('can create assault aerospace fighter', async ({ page }) => {
    const unitId = await createAerospaceUnit(page, {
      name: 'Assault Fighter',
      tonnage: 100,
    });

    const state = await getAerospaceState(page, unitId);
    expect(state?.tonnage).toBe(100);

    await closeTab(page, unitId);
  });

  test('aerospace unit has required stats', async ({ page }) => {
    const unitId = await createAerospaceUnit(page, {
      name: 'Stats Test Fighter',
      tonnage: 50,
    });

    const state = await getAerospaceState(page, unitId);
    expect(state).not.toBeNull();
    expect(state?.safeThrust).toBeGreaterThan(0);
    expect(state?.fuel).toBeGreaterThan(0);
    expect(state?.heatSinks).toBeGreaterThan(0);

    await closeTab(page, unitId);
  });
});

// =============================================================================
// Aerospace Tab Navigation Tests
// =============================================================================

test.describe('Aerospace Tab Navigation @customizer', () => {
  let customizerPage: AerospaceCustomizerPage;
  let aerospaceId: string;

  test.beforeEach(async ({ page }) => {
    customizerPage = new AerospaceCustomizerPage(page);
    await customizerPage.navigate();
    await waitForHydration(page);
    await waitForTabManagerStoreReady(page);

    aerospaceId = await createAerospaceUnit(page, {
      name: 'Nav Test Fighter',
      tonnage: 50,
    });
  });

  test.afterEach(async ({ page }) => {
    try {
      await closeTab(page, aerospaceId);
    } catch {
      // Ignore
    }
  });

  test('can navigate to aerospace unit', async ({ page }) => {
    await customizerPage.navigateToUnit(aerospaceId);
    await waitForHydration(page);
    // Should be on the unit's page
    await expect(page).toHaveURL(new RegExp(`/customizer/${aerospaceId}`));
  });

  test('aerospace unit is selected after navigation', async ({ page }) => {
    await customizerPage.navigateToUnit(aerospaceId);
    await waitForHydration(page);
    
    const activeId = await getActiveTabId(page);
    expect(activeId).toBe(aerospaceId);
  });

  test('can access aerospace state after navigation', async ({ page }) => {
    await customizerPage.navigateToUnit(aerospaceId);
    await waitForHydration(page);
    
    const state = await getAerospaceState(page, aerospaceId);
    expect(state).not.toBeNull();
    expect(state?.name).toBe('Nav Test Fighter');
  });

  test('multiple aerospace units can be created', async ({ page }) => {
    // Create a second unit
    const secondId = await createAerospaceUnit(page, {
      name: 'Second Fighter',
      tonnage: 65,
    });
    
    // Both units should exist
    const state1 = await getAerospaceState(page, aerospaceId);
    const state2 = await getAerospaceState(page, secondId);
    
    expect(state1?.name).toBe('Nav Test Fighter');
    expect(state2?.name).toBe('Second Fighter');
    
    // Cleanup
    await closeTab(page, secondId);
  });
});
