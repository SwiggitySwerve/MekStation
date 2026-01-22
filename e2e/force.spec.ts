/**
 * Force Management E2E Tests
 *
 * Tests for force list, creation, detail, and management functionality.
 *
 * @spec openspec/changes/add-comprehensive-e2e-tests/specs/e2e-testing/spec.md
 * @tags @force
 */

import { test, expect, type Page } from '@playwright/test';
import {
  ForceListPage,
  ForceDetailPage,
  ForceCreatePage,
} from './pages/force.page';
import {
  createTestForce,
  createTestLance,
  getForce,
  deleteForce,
  cloneForce,
} from './fixtures/force';

// =============================================================================
// Test Configuration
// =============================================================================

test.setTimeout(30000);

// Helper to ensure store is available before tests
async function waitForStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as { __ZUSTAND_STORES__?: { force?: unknown } };
      return win.__ZUSTAND_STORES__?.force !== undefined;
    },
    { timeout: 10000 }
  );
}

// =============================================================================
// Force List Page Tests
// =============================================================================

test.describe('Force List Page @smoke @force', () => {
  let listPage: ForceListPage;

  test.beforeEach(async ({ page }) => {
    listPage = new ForceListPage(page);
    await listPage.navigate();
    await waitForStoreReady(page);
  });

  test('navigates to forces list page', async ({ page }) => {
    // Page should load with title
    await expect(page).toHaveURL(/\/gameplay\/forces$/);
    await expect(page.getByRole('heading', { name: /force roster/i })).toBeVisible();
  });

  test('shows forces or empty state correctly', async ({ page }) => {
    // Note: This test verifies UI consistency - either cards OR empty state should show
    // We can't guarantee empty state in parallel test runs
    const cardCount = await listPage.getCardCount();
    
    if (cardCount === 0) {
      // When there are no forces, empty state should be visible
      const emptyVisible = await listPage.isEmptyStateVisible();
      const showingZero = await page.getByText(/Showing 0 force/i).isVisible();
      expect(emptyVisible || showingZero).toBe(true);
    } else {
      // When forces exist, cards should be visible and count should match
      await expect(page.locator('[data-testid^="force-card-"]').first()).toBeVisible();
      // Verify the count display matches
      await expect(page.getByText(new RegExp(`Showing ${cardCount} force`))).toBeVisible();
    }
  });

  test('shows create force button', async ({ page }) => {
    // Create button should be visible
    await expect(page.getByTestId('create-force-btn')).toBeVisible();
  });

  test('displays forces when they exist', async ({ page }) => {
    // Create a force via store
    const forceId = await createTestLance(page, 'Alpha Lance');

    // Refresh to see the new force
    await listPage.navigate();

    // Wait for force cards to appear
    await page.locator('[data-testid^="force-card-"]').first().waitFor({ state: 'visible', timeout: 10000 });

    // Force should appear in list - check the card exists
    const forceCard = page.getByTestId(`force-card-${forceId}`);
    await expect(forceCard).toBeVisible();

    // Cleanup
    if (forceId) {
      await deleteForce(page, forceId);
    }
  });

  test('search filters forces', async ({ page }) => {
    // Create multiple forces
    const id1 = await createTestForce(page, { name: 'Alpha Lance' });
    const id2 = await createTestForce(page, { name: 'Beta Star' });
    const id3 = await createTestForce(page, { name: 'Alpha Support' });

    await listPage.navigate();

    // Wait for force cards to appear
    await page.locator('[data-testid^="force-card-"]').first().waitFor({ state: 'visible', timeout: 10000 });

    // Search for "Alpha"
    await listPage.searchForces('Alpha');

    // Should only show Alpha forces
    const cardCount = await listPage.getCardCount();
    expect(cardCount).toBeGreaterThanOrEqual(2);
    
    // Beta Star should not be visible
    const betaCard = page.getByTestId(`force-card-${id2}`);
    await expect(betaCard).not.toBeVisible();

    // Cleanup
    if (id1) await deleteForce(page, id1);
    if (id2) await deleteForce(page, id2);
    if (id3) await deleteForce(page, id3);
  });
});

// =============================================================================
// Force Creation Tests
// =============================================================================

test.describe('Force Creation @smoke @force', () => {
  let listPage: ForceListPage;
  let createPage: ForceCreatePage;

  test.beforeEach(async ({ page }) => {
    listPage = new ForceListPage(page);
    createPage = new ForceCreatePage(page);
    await listPage.navigate();
    await waitForStoreReady(page);
  });

  test('navigates to create page from list', async ({ page }) => {
    await listPage.clickCreateButton();
    await expect(page).toHaveURL(/\/gameplay\/forces\/create$/);
  });

  test('creates lance with name only', async ({ page }) => {
    await createPage.navigate();

    // Fill name (minimum 2 characters required)
    await createPage.fillName('Test Lance');
    
    // Lance should be selected by default
    await expect(page.getByTestId('force-type-lance')).toBeVisible();
    
    // Submit
    await createPage.submit();

    // Should redirect to force detail
    await expect(page).toHaveURL(/\/gameplay\/forces\/[^/]+$/);
  });

  test('creates star force type', async ({ page }) => {
    await createPage.navigate();

    // Fill name
    await createPage.fillName('Test Star');
    
    // Select star type
    await createPage.selectForceType('star');
    
    // Fill affiliation
    await createPage.fillAffiliation('Clan Wolf');
    
    // Submit
    await createPage.submit();

    // Should redirect to force detail
    await expect(page).toHaveURL(/\/gameplay\/forces\/[^/]+$/);
  });

  test('creates company force type', async ({ page }) => {
    await createPage.navigate();

    // Fill name
    await createPage.fillName('Test Company');
    
    // Select company type (12 slots)
    await createPage.selectForceType('company');
    
    // Submit
    await createPage.submit();

    // Should redirect to force detail
    await expect(page).toHaveURL(/\/gameplay\/forces\/[^/]+$/);
  });

  test('validates minimum name length', async ({ page }) => {
    await createPage.navigate();

    // Fill single character name (too short)
    await createPage.fillName('X');
    
    // Submit button should be disabled (name < 2 chars)
    const isEnabled = await createPage.isSubmitEnabled();
    expect(isEnabled).toBe(false);
    
    // Add another character
    await createPage.fillName('XY');
    
    // Now submit should be enabled
    const isEnabledAfter = await createPage.isSubmitEnabled();
    expect(isEnabledAfter).toBe(true);
  });

  test('can cancel force creation', async ({ page }) => {
    await createPage.navigate();
    await createPage.fillName('Force to Cancel');

    // Click cancel
    await createPage.cancel();

    // Should return to list
    await expect(page).toHaveURL(/\/gameplay\/forces$/);
  });
});

// =============================================================================
// Force Detail Page Tests
// =============================================================================

test.describe('Force Detail Page @force', () => {
  let detailPage: ForceDetailPage;
  let listPage: ForceListPage;
  let forceId: string | null;

  test.beforeEach(async ({ page }) => {
    detailPage = new ForceDetailPage(page);
    listPage = new ForceListPage(page);
    
    // Navigate to list first to ensure store is initialized
    await listPage.navigate();
    await waitForStoreReady(page);

    // Create a force for detail tests via store
    forceId = await createTestLance(page, 'Detail Test Lance');

    // Refresh list and wait for card to appear
    await listPage.navigate();
    await page.locator('[data-testid^="force-card-"]').first().waitFor({ state: 'visible', timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
    if (forceId) {
      try {
        await deleteForce(page, forceId);
      } catch {
        // Force may already be deleted
      }
    }
  });

  test('displays force details via list click', async ({ page }) => {
    // Navigate to detail by clicking on force card in list
    await listPage.clickForceCard(forceId!);
    
    // Wait for navigation to detail page
    await expect(page).toHaveURL(new RegExp(`/gameplay/forces/${forceId}`));
    
    // Wait for page to finish loading
    await page.waitForLoadState('networkidle');
    
    // Should show edit and delete buttons
    await expect(page.getByTestId('edit-force-btn')).toBeVisible();
    await expect(page.getByTestId('delete-force-btn')).toBeVisible();
  });

  test('shows force header with name and type', async ({ page }) => {
    // Navigate via list click
    await listPage.clickForceCard(forceId!);
    await page.waitForLoadState('networkidle');

    // Page title should include force name (use the page-title testid)
    await expect(page.getByTestId('page-title')).toContainText('Detail Test Lance');
    
    // Should show Lance type badge
    await expect(page.getByText(/Lance/i).first()).toBeVisible();
  });
});

// =============================================================================
// Force Deletion Tests
// =============================================================================

test.describe('Force Deletion @force', () => {
  let detailPage: ForceDetailPage;
  let listPage: ForceListPage;

  test.beforeEach(async ({ page }) => {
    detailPage = new ForceDetailPage(page);
    listPage = new ForceListPage(page);
    await listPage.navigate();
    await waitForStoreReady(page);
  });

  test('deletes force with confirmation', async ({ page }) => {
    // Create force to delete
    const forceId = await createTestForce(page, {
      name: 'Force to Delete',
    });

    // Wait for force card to appear
    await listPage.navigate();
    await page.locator('[data-testid^="force-card-"]').first().waitFor({ state: 'visible', timeout: 10000 });
    await listPage.clickForceCard(forceId!);
    await page.waitForLoadState('networkidle');

    // Click delete button
    await detailPage.clickDelete();

    // Confirmation dialog should appear
    await expect(page.getByTestId('delete-confirm-dialog')).toBeVisible();
    await expect(page.getByText(/permanently delete/i)).toBeVisible();

    // Confirm delete
    await detailPage.confirmDelete();

    // Should redirect to list
    await expect(page).toHaveURL(/\/gameplay\/forces$/);

    // Force should no longer exist
    const force = await getForce(page, forceId!);
    expect(force).toBeNull();
  });

  test('can cancel deletion', async ({ page }) => {
    // Create force
    const forceId = await createTestForce(page, {
      name: 'Force Keep',
    });

    // Wait for force card to appear
    await listPage.navigate();
    await page.locator('[data-testid^="force-card-"]').first().waitFor({ state: 'visible', timeout: 10000 });
    await listPage.clickForceCard(forceId!);
    await page.waitForLoadState('networkidle');

    // Click delete button
    await detailPage.clickDelete();

    // Cancel
    await detailPage.cancelDelete();

    // Dialog should close
    await expect(page.getByTestId('delete-confirm-dialog')).not.toBeVisible();

    // Force should still exist
    const force = await getForce(page, forceId!);
    expect(force).not.toBeNull();

    // Cleanup
    await deleteForce(page, forceId!);
  });
});

// =============================================================================
// Force Edit Tests
// =============================================================================

test.describe('Force Edit @force', () => {
  let detailPage: ForceDetailPage;
  let listPage: ForceListPage;
  let forceId: string | null;

  test.beforeEach(async ({ page }) => {
    detailPage = new ForceDetailPage(page);
    listPage = new ForceListPage(page);
    
    await listPage.navigate();
    await waitForStoreReady(page);

    // Create a force for edit tests
    forceId = await createTestForce(page, {
      name: 'Edit Test Force',
      affiliation: 'House Steiner',
    });

    await listPage.navigate();
    await page.locator('[data-testid^="force-card-"]').first().waitFor({ state: 'visible', timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    if (forceId) {
      try {
        await deleteForce(page, forceId);
      } catch {
        // Ignore
      }
    }
  });

  test('edit button opens edit modal', async ({ page }) => {
    await listPage.clickForceCard(forceId!);
    await page.waitForLoadState('networkidle');

    // Click edit button
    await detailPage.clickEdit();

    // Edit modal should appear
    await expect(page.getByText('Edit Force Details')).toBeVisible();
  });
});

// =============================================================================
// Force Type Variations Tests
// =============================================================================

test.describe('Force Type Variations @force', () => {
  let createPage: ForceCreatePage;
  let listPage: ForceListPage;
  const createdForceIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    createPage = new ForceCreatePage(page);
    listPage = new ForceListPage(page);
    await listPage.navigate();
    await waitForStoreReady(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup all created forces
    for (const id of createdForceIds) {
      try {
        await deleteForce(page, id);
      } catch {
        // Ignore
      }
    }
    createdForceIds.length = 0;
  });

  test('can create Level II force (ComStar)', async ({ page }) => {
    await createPage.navigate();

    await createPage.fillName('ComStar Level II');
    await createPage.selectForceType('level_ii');
    await createPage.fillAffiliation('ComStar');
    
    await createPage.submit();

    // Should redirect to force detail
    await expect(page).toHaveURL(/\/gameplay\/forces\/[^/]+$/);
    
    // Extract force ID from URL for cleanup
    const url = page.url();
    const match = url.match(/\/gameplay\/forces\/([^/]+)$/);
    if (match) {
      createdForceIds.push(match[1]);
    }
  });

  test('can create Binary force (Clan)', async ({ page }) => {
    await createPage.navigate();

    await createPage.fillName('Wolf Binary');
    await createPage.selectForceType('binary');
    await createPage.fillAffiliation('Clan Wolf');
    
    await createPage.submit();

    // Should redirect to force detail
    await expect(page).toHaveURL(/\/gameplay\/forces\/[^/]+$/);
    
    // Extract force ID from URL for cleanup
    const url = page.url();
    const match = url.match(/\/gameplay\/forces\/([^/]+)$/);
    if (match) {
      createdForceIds.push(match[1]);
    }
  });

  test('can create Custom force', async ({ page }) => {
    await createPage.navigate();

    await createPage.fillName('Custom Merc Unit');
    await createPage.selectForceType('custom');
    await createPage.fillAffiliation('Mercenary');
    
    await createPage.submit();

    // Should redirect to force detail
    await expect(page).toHaveURL(/\/gameplay\/forces\/[^/]+$/);
    
    // Extract force ID from URL for cleanup
    const url = page.url();
    const match = url.match(/\/gameplay\/forces\/([^/]+)$/);
    if (match) {
      createdForceIds.push(match[1]);
    }
  });
});

// =============================================================================
// Force Clone Tests
// =============================================================================

test.describe('Force Clone @force', () => {
  let listPage: ForceListPage;
  let originalForceId: string | null;
  let clonedForceId: string | null;

  test.beforeEach(async ({ page }) => {
    listPage = new ForceListPage(page);
    await listPage.navigate();
    await waitForStoreReady(page);
    
    // Create a force to clone
    originalForceId = await createTestForce(page, {
      name: 'Original Force',
      forceType: 'lance',
      affiliation: 'House Davion',
    });
    
    clonedForceId = null;
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
    if (originalForceId) {
      try {
        await deleteForce(page, originalForceId);
      } catch {
        // Ignore
      }
    }
    if (clonedForceId) {
      try {
        await deleteForce(page, clonedForceId);
      } catch {
        // Ignore
      }
    }
  });

  test('can clone a force via store', async ({ page }) => {
    // Clone the force
    clonedForceId = await cloneForce(page, originalForceId!, 'Cloned Force');

    // Verify the clone was created
    expect(clonedForceId).not.toBeNull();
    expect(clonedForceId).not.toBe(originalForceId);

    // Verify the cloned force exists
    const clonedForce = await getForce(page, clonedForceId!);
    expect(clonedForce).not.toBeNull();
    expect(clonedForce?.name).toBe('Cloned Force');
  });

  test('cloned force has same type as original', async ({ page }) => {
    // Clone the force
    clonedForceId = await cloneForce(page, originalForceId!, 'Type Test Clone');

    // Get both forces
    const original = await getForce(page, originalForceId!);
    const cloned = await getForce(page, clonedForceId!);

    // Should have same type
    expect(cloned?.forceType).toBe(original?.forceType);
    expect(cloned?.forceType).toBe('lance');
  });

  test('cloned force appears in force list', async ({ page }) => {
    // Clone the force
    clonedForceId = await cloneForce(page, originalForceId!, 'List Test Clone');

    // Refresh the list
    await listPage.navigate();
    await page.locator('[data-testid^="force-card-"]').first().waitFor({ state: 'visible', timeout: 10000 });

    // Both forces should be visible
    await expect(page.getByTestId(`force-card-${originalForceId}`)).toBeVisible();
    await expect(page.getByTestId(`force-card-${clonedForceId}`)).toBeVisible();
  });

  test('cloned force has unique ID', async ({ page }) => {
    // Clone the same force twice
    const clone1Id = await cloneForce(page, originalForceId!, 'Clone 1');
    const clone2Id = await cloneForce(page, originalForceId!, 'Clone 2');

    // IDs should all be unique
    expect(clone1Id).not.toBe(originalForceId);
    expect(clone2Id).not.toBe(originalForceId);
    expect(clone1Id).not.toBe(clone2Id);

    // Cleanup extra clones
    if (clone1Id) await deleteForce(page, clone1Id);
    if (clone2Id) await deleteForce(page, clone2Id);
  });
});
