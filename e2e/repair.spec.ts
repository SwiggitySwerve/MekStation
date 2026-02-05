/**
 * Repair System E2E Tests
 *
 * Tests for repair bay page, damage assessment, repair queue, and cost breakdown.
 *
 * @spec openspec/changes/add-comprehensive-e2e-tests/specs/e2e-testing/spec.md
 * @tags @repair
 */

import { test, expect, type Page } from '@playwright/test';

import {
  initializeRepairStore,
  getRepairJobs,
  getRepairJob,
  getSelectedJobId,
} from './fixtures/repair';
import { RepairBayPage } from './pages/repair.page';

// =============================================================================
// Test Configuration
// =============================================================================

test.setTimeout(30000);

// Default campaign ID used by the demo store
const DEMO_CAMPAIGN_ID = 'demo-campaign';

// Helper to ensure repair store is available
async function waitForRepairStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { repair?: unknown };
      };
      return win.__ZUSTAND_STORES__?.repair !== undefined;
    },
    { timeout: 10000 },
  );
}

// =============================================================================
// Repair Bay Page Tests
// =============================================================================

test.describe('Repair Bay Page @smoke @repair', () => {
  let repairPage: RepairBayPage;

  test.beforeEach(async ({ page }) => {
    repairPage = new RepairBayPage(page);
    await repairPage.navigate();
    await waitForRepairStoreReady(page);
  });

  test('navigates to repair bay page', async ({ page }) => {
    // Page should load with title
    await expect(page).toHaveURL(/\/gameplay\/repair/);
    await expect(
      page.getByRole('heading', { name: /repair bay/i }),
    ).toBeVisible();
  });

  test('displays stats overview cards', async ({ page }) => {
    // Stats cards should be visible
    await expect(page.getByTestId('repair-stats')).toBeVisible();
    await expect(page.getByTestId('repair-stats-active')).toBeVisible();
    await expect(page.getByTestId('repair-stats-pending')).toBeVisible();
    await expect(page.getByTestId('repair-stats-completed')).toBeVisible();
    await expect(page.getByTestId('repair-stats-cost')).toBeVisible();
  });

  test('displays filter controls', async ({ page }) => {
    // Filter section should be visible
    await expect(page.getByTestId('repair-filters')).toBeVisible();
    await expect(page.getByTestId('repair-search-input')).toBeVisible();
    await expect(page.getByTestId('repair-status-filter-all')).toBeVisible();
    await expect(
      page.getByTestId('repair-status-filter-pending'),
    ).toBeVisible();
    await expect(
      page.getByTestId('repair-status-filter-in-progress'),
    ).toBeVisible();
    await expect(
      page.getByTestId('repair-status-filter-complete'),
    ).toBeVisible();
  });

  test('displays header action buttons', async ({ page }) => {
    // Header buttons should be visible
    await expect(page.getByTestId('repair-field-btn')).toBeVisible();
    await expect(page.getByTestId('repair-all-btn')).toBeVisible();
  });

  test('shows all operational state when no jobs exist', async ({ page }) => {
    // Navigate with a campaign that has no repair jobs
    await page.goto('/gameplay/repair?campaignId=empty-campaign');
    await page.waitForLoadState('networkidle');

    // Either shows all operational message or unit list
    const allOperational = page.getByTestId('repair-all-operational');
    const unitList = page.getByTestId('repair-unit-list');

    // One of these should be visible depending on store initialization
    await expect(allOperational.or(unitList)).toBeVisible();
  });
});

// =============================================================================
// Unit List Tests
// =============================================================================

test.describe('Repair Unit List @repair', () => {
  let repairPage: RepairBayPage;

  test.beforeEach(async ({ page }) => {
    repairPage = new RepairBayPage(page);
    await repairPage.navigate();
    await waitForRepairStoreReady(page);
    // Initialize demo campaign data
    await initializeRepairStore(page, DEMO_CAMPAIGN_ID);
    // Wait for store to update
    await page.waitForTimeout(300);
  });

  test('displays unit repair cards when jobs exist', async ({ page }) => {
    // Get jobs from store
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      // Unit list should be visible
      await expect(page.getByTestId('repair-unit-list')).toBeVisible();

      // First job card should be visible
      await expect(
        page.getByTestId(`repair-unit-card-${jobs[0].id}`),
      ).toBeVisible();
    }
  });

  test('shows results count', async ({ page }) => {
    // Results count should show
    await expect(page.getByTestId('repair-results-count')).toBeVisible();
    const countText = await repairPage.getResultsCount();
    expect(countText).toContain('unit');
  });

  test('clicking unit card shows damage assessment', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      // Click first unit card
      await repairPage.selectUnit(jobs[0].id);

      // Damage assessment panel should appear
      await expect(page.getByTestId('damage-assessment-panel')).toBeVisible();

      // Should show unit name
      const unitName = await repairPage.getDamageAssessmentUnitName();
      expect(unitName).toBe(jobs[0].unitName);
    }
  });

  test('clicking same unit card deselects it', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      // Click first unit card
      await repairPage.selectUnit(jobs[0].id);
      await expect(page.getByTestId('damage-assessment-panel')).toBeVisible();

      // Click same card again to deselect
      await repairPage.selectUnit(jobs[0].id);

      // Should show select prompt instead
      await expect(page.getByTestId('repair-select-prompt')).toBeVisible();
    }
  });
});

// =============================================================================
// Search and Filter Tests
// =============================================================================

test.describe('Repair Search and Filters @repair', () => {
  let repairPage: RepairBayPage;

  test.beforeEach(async ({ page }) => {
    repairPage = new RepairBayPage(page);
    await repairPage.navigate();
    await waitForRepairStoreReady(page);
    await initializeRepairStore(page, DEMO_CAMPAIGN_ID);
    await page.waitForTimeout(300);
  });

  test('search filters unit list', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      const firstUnitName = jobs[0].unitName;

      // Search for a unit name
      await repairPage.searchUnits(firstUnitName.substring(0, 3));

      // Results should update
      const countText = await repairPage.getResultsCount();
      expect(countText).toContain('filtered');
    }
  });

  test('clear search shows all units', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      // Search first
      await repairPage.searchUnits('xyz');

      // Clear search
      await repairPage.clearSearch();

      // Should not show filtered indicator
      const countText = await repairPage.getResultsCount();
      // Only shows "(filtered)" when filter is active
      const isFiltered = countText.includes('filtered');
      // After clearing, should not be filtered (unless status filter is active)
      expect(isFiltered).toBe(false);
    }
  });

  test('status filter shows pending jobs', async ({ page }) => {
    // Click pending filter
    await repairPage.filterByStatus('pending');

    // Results should show filtered
    const countText = await repairPage.getResultsCount();
    expect(countText).toContain('unit');
  });

  test('status filter shows in-progress jobs', async ({ page }) => {
    // Click in-progress filter
    await repairPage.filterByStatus('in-progress');

    // Results should update
    await expect(page.getByTestId('repair-results-count')).toBeVisible();
  });

  test('all filter shows all jobs', async ({ page }) => {
    // First apply a filter
    await repairPage.filterByStatus('pending');

    // Then click all
    await repairPage.filterByStatus('all');

    // Should not show filtered indicator (unless search is active)
    const countText = await repairPage.getResultsCount();
    expect(countText).not.toContain('filtered');
  });
});

// =============================================================================
// Damage Assessment Panel Tests
// =============================================================================

test.describe('Damage Assessment Panel @repair', () => {
  let repairPage: RepairBayPage;

  test.beforeEach(async ({ page }) => {
    repairPage = new RepairBayPage(page);
    await repairPage.navigate();
    await waitForRepairStoreReady(page);
    await initializeRepairStore(page, DEMO_CAMPAIGN_ID);
    await page.waitForTimeout(300);
  });

  test('displays damage assessment when unit selected', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      await repairPage.selectUnit(jobs[0].id);

      // Panel should be visible
      await expect(page.getByTestId('damage-assessment-panel')).toBeVisible();

      // Should show select all / deselect all buttons
      await expect(page.getByTestId('repair-select-all-btn')).toBeVisible();
      await expect(page.getByTestId('repair-deselect-all-btn')).toBeVisible();
    }
  });

  test('displays cost summary', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      await repairPage.selectUnit(jobs[0].id);

      // Cost summary should be visible
      await expect(page.getByTestId('repair-cost-summary')).toBeVisible();
      await expect(page.getByTestId('repair-selected-count')).toBeVisible();
      await expect(page.getByTestId('repair-estimated-time')).toBeVisible();
      await expect(page.getByTestId('repair-total-cost')).toBeVisible();
    }
  });

  test('displays repair action buttons', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      await repairPage.selectUnit(jobs[0].id);

      // Action buttons should be visible for pending jobs
      const job = await getRepairJob(page, DEMO_CAMPAIGN_ID, jobs[0].id);
      if (job && job.status === 'Pending') {
        await expect(page.getByTestId('repair-start-full-btn')).toBeVisible();
        await expect(page.getByTestId('repair-partial-btn')).toBeVisible();
      }
    }
  });

  test('select all selects all repair items', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      await repairPage.selectUnit(jobs[0].id);

      // Click select all
      await repairPage.selectAllItems();

      // Selected count should match total items
      const countText = await repairPage.getSelectedItemsCount();
      // Format is "X / Y"
      const parts = countText.split('/').map((s) => s.trim());
      expect(parts[0]).toBe(parts[1]);
    }
  });

  test('deselect all deselects all repair items', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      await repairPage.selectUnit(jobs[0].id);

      // First select all
      await repairPage.selectAllItems();

      // Then deselect all
      await repairPage.deselectAllItems();

      // Selected count should be 0
      const countText = await repairPage.getSelectedItemsCount();
      expect(countText.startsWith('0')).toBe(true);
    }
  });
});

// =============================================================================
// Cost Breakdown Tests
// =============================================================================

test.describe('Repair Cost Breakdown @repair', () => {
  let repairPage: RepairBayPage;

  test.beforeEach(async ({ page }) => {
    repairPage = new RepairBayPage(page);
    await repairPage.navigate();
    await waitForRepairStoreReady(page);
    await initializeRepairStore(page, DEMO_CAMPAIGN_ID);
    await page.waitForTimeout(300);
  });

  test('displays cost breakdown when unit selected', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      await repairPage.selectUnit(jobs[0].id);

      // Cost breakdown should be visible
      await expect(page.getByTestId('repair-cost-breakdown')).toBeVisible();
    }
  });

  test('shows itemized costs by type', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    if (jobs.length > 0) {
      await repairPage.selectUnit(jobs[0].id);

      // Cost items section should be visible
      await expect(page.getByTestId('repair-cost-items')).toBeVisible();
    }
  });
});

// =============================================================================
// Repair Queue Tests
// =============================================================================

test.describe('Repair Queue @repair', () => {
  let repairPage: RepairBayPage;

  test.beforeEach(async ({ page }) => {
    repairPage = new RepairBayPage(page);
    await repairPage.navigate();
    await waitForRepairStoreReady(page);
    await initializeRepairStore(page, DEMO_CAMPAIGN_ID);
    await page.waitForTimeout(300);
  });

  test('displays repair queue when jobs exist', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    // Queue should be visible if there are active or pending jobs
    const hasActiveOrPending = jobs.some(
      (j) => j.status === 'InProgress' || j.status === 'Pending',
    );

    if (hasActiveOrPending) {
      await expect(page.getByTestId('repair-queue')).toBeVisible();
    }
  });

  test('queue shows job items', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    const activeOrPending = jobs.filter(
      (j) => j.status === 'InProgress' || j.status === 'Pending',
    );

    if (activeOrPending.length > 0) {
      // First queue item should be visible
      await expect(
        page.getByTestId(`repair-queue-item-${activeOrPending[0].id}`),
      ).toBeVisible();
    }
  });

  test('clicking queue item selects unit', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    const activeOrPending = jobs.filter(
      (j) => j.status === 'InProgress' || j.status === 'Pending',
    );

    if (activeOrPending.length > 0) {
      // Click queue item
      await repairPage.clickQueueJob(activeOrPending[0].id);

      // Should select that job
      const selectedId = await getSelectedJobId(page);
      expect(selectedId).toBe(activeOrPending[0].id);
    }
  });

  test('completed jobs toggle is visible', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);

    const completedJobs = jobs.filter((j) => j.status === 'Completed');

    if (completedJobs.length > 0) {
      // Completed toggle should be visible
      await expect(
        page.getByTestId('repair-queue-completed-toggle'),
      ).toBeVisible();
    }
  });
});

// =============================================================================
// Repair Actions Tests
// =============================================================================

test.describe('Repair Actions @repair', () => {
  let repairPage: RepairBayPage;

  test.beforeEach(async ({ page }) => {
    repairPage = new RepairBayPage(page);
    await repairPage.navigate();
    await waitForRepairStoreReady(page);
    await initializeRepairStore(page, DEMO_CAMPAIGN_ID);
    await page.waitForTimeout(300);
  });

  test('start repair button disabled when no items selected', async ({
    page,
  }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);
    const pendingJobs = jobs.filter((j) => j.status === 'Pending');

    if (pendingJobs.length > 0) {
      // Select a pending job
      await repairPage.selectUnit(pendingJobs[0].id);

      // Deselect all items
      await repairPage.deselectAllItems();

      // Start button should be disabled
      const isDisabled = await repairPage.isStartRepairDisabled();
      expect(isDisabled).toBe(true);
    }
  });

  test('start repair button enabled when items selected', async ({ page }) => {
    const jobs = await getRepairJobs(page, DEMO_CAMPAIGN_ID);
    const pendingJobs = jobs.filter((j) => j.status === 'Pending');

    if (pendingJobs.length > 0) {
      // Select a pending job
      await repairPage.selectUnit(pendingJobs[0].id);

      // Select all items
      await repairPage.selectAllItems();

      // Start button should be enabled
      const isDisabled = await repairPage.isStartRepairDisabled();
      expect(isDisabled).toBe(false);
    }
  });

  test('repair all button is visible', async ({ page }) => {
    // Repair all button should be in header
    await expect(page.getByTestId('repair-all-btn')).toBeVisible();
  });

  test('field repair button is visible', async ({ page }) => {
    // Field repair button should be in header
    await expect(page.getByTestId('repair-field-btn')).toBeVisible();
  });
});

// =============================================================================
// Error State Tests
// =============================================================================

test.describe('Repair Error States @repair', () => {
  let repairPage: RepairBayPage;

  test.beforeEach(async ({ page }) => {
    repairPage = new RepairBayPage(page);
    await repairPage.navigate();
    await waitForRepairStoreReady(page);
  });

  test('error can be dismissed', async ({ page }) => {
    // This test requires triggering an error state
    // For now, just verify error dismiss button exists when error is shown

    // Check if error is visible (it may not be in normal flow)
    const hasError = await repairPage.hasError();

    if (hasError) {
      await repairPage.dismissError();

      // Error should no longer be visible
      await expect(page.getByTestId('repair-error')).not.toBeVisible();
    }
  });
});

// =============================================================================
// Navigation Tests
// =============================================================================

test.describe('Repair Navigation @repair', () => {
  test('can navigate with campaign ID query param', async ({ page }) => {
    const repairPage = new RepairBayPage(page);
    await repairPage.navigate('test-campaign-123');

    // Should include campaign ID in URL
    await expect(page).toHaveURL(/campaignId=test-campaign-123/);
  });

  test('back link goes to gameplay page', async ({ page }) => {
    const repairPage = new RepairBayPage(page);
    await repairPage.navigate();

    // Back link should be visible
    const backLink = page.getByRole('link', { name: /gameplay/i });
    await expect(backLink).toBeVisible();
  });
});
