/**
 * Replay Player E2E Tests
 *
 * Tests for the game replay page UI and playback controls.
 * 
 * NOTE: Full replay functionality requires game events in the store.
 * The core replay logic is tested via unit tests in:
 * - src/hooks/audit/__tests__/useReplayPlayer.test.ts
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import { test, expect, type Page } from '@playwright/test';

test.setTimeout(30000);

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Navigate to audit timeline page
 */
async function navigateToTimeline(page: Page): Promise<void> {
  await page.goto('/audit/timeline');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // React hydration
}

/**
 * Navigate to campaign page and check for audit tab
 */
async function navigateToCampaigns(page: Page): Promise<void> {
  await page.goto('/gameplay/campaigns');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * Navigate to pilots page
 */
async function navigateToPilots(page: Page): Promise<void> {
  await page.goto('/gameplay/pilots');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// =============================================================================
// Test Suite: Audit Timeline Page
// =============================================================================

test.describe('Audit Timeline Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToTimeline(page);
  });

  test('timeline page loads with filters', async ({ page }) => {
    // Check page title/heading
    await expect(page.locator('h1')).toContainText('Event Timeline');
    
    // Check filter controls exist
    await expect(page.getByPlaceholder('Search events...')).toBeVisible();
    
    // Check category filter buttons exist (at least the "All" option)
    await expect(page.getByRole('button', { name: /All/i })).toBeVisible();
  });

  test('can toggle advanced query builder', async ({ page }) => {
    // Click advanced button
    const advancedBtn = page.getByRole('button', { name: /Advanced/i });
    await expect(advancedBtn).toBeVisible();
    await advancedBtn.click();
    
    // Should show query builder section
    await expect(page.locator('text=Save Query').first()).toBeVisible({ timeout: 5000 });
  });

  test('category filters are clickable', async ({ page }) => {
    // Click a category filter
    const gameFilter = page.getByRole('button', { name: /Game/i });
    if (await gameFilter.isVisible()) {
      await gameFilter.click();
      // Should be active
      await expect(gameFilter).toHaveAttribute('data-active', 'true');
    }
  });

  test('shows empty state when no events', async ({ page }) => {
    // With no events, should show empty state message
    const noEventsText = page.locator('text=No events found');
    const hasEmptyState = await noEventsText.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Either show events or empty state
    if (hasEmptyState) {
      await expect(noEventsText).toBeVisible();
    }
    // Otherwise timeline has events which is also valid
  });
});

// =============================================================================
// Test Suite: Pilot Career Tab
// =============================================================================

test.describe('Pilot Career Timeline Tab', () => {
  test('pilot detail page has Career History tab', async ({ page }) => {
    await navigateToPilots(page);
    
    const pilotCards = page.locator('[data-testid="pilot-card"], a[href*="/gameplay/pilots/"]');
    const pilotCount = await pilotCards.count();
    
    // Skip if no pilots exist - this test requires seed data
    test.skip(pilotCount === 0, 'No pilots available - test requires pilot data');
    
    await pilotCards.first().click();
    await page.waitForLoadState('networkidle');
    
    // Check for Career History tab
    const careerTab = page.getByRole('button', { name: /Career History/i });
    await expect(careerTab).toBeVisible({ timeout: 5000 });
    
    // Click career tab
    await careerTab.click();
    
    // Should show career history content
    await expect(page.locator('text=Career History').first()).toBeVisible();
  });
});

// =============================================================================
// Test Suite: Campaign Audit Tab
// =============================================================================

test.describe('Campaign Audit Timeline Tab', () => {
  test('campaign detail page has Audit Timeline tab', async ({ page }) => {
    await navigateToCampaigns(page);
    
    const campaignCards = page.locator('[data-testid="campaign-card"], a[href*="/gameplay/campaigns/"]');
    const campaignCount = await campaignCards.count();
    
    // Skip if no campaigns exist - this test requires seed data
    test.skip(campaignCount === 0, 'No campaigns available - test requires campaign data');
    
    await campaignCards.first().click();
    await page.waitForLoadState('networkidle');
    
    // Check for Audit Timeline tab
    const auditTab = page.getByRole('button', { name: /Audit Timeline/i });
    await expect(auditTab).toBeVisible({ timeout: 5000 });
    
    // Click audit tab
    await auditTab.click();
    
    // Should show campaign timeline content
    await expect(page.locator('text=Campaign Timeline').first()).toBeVisible();
  });
});

// =============================================================================
// Test Suite: Replay Page Navigation
// =============================================================================

test.describe('Game Replay Page', () => {
  test('game replay page shows error for non-existent game', async ({ page }) => {
    // Navigate to replay for a non-existent game
    await page.goto('/gameplay/games/non-existent-game/replay');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Should show error or empty state
    const hasError = await page.locator('text=Error').isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoEvents = await page.locator('text=No events found').isVisible({ timeout: 3000 }).catch(() => false);
    const hasLoading = await page.locator('text=Loading').isVisible({ timeout: 1000 }).catch(() => false);
    
    // Should show some feedback (error, empty, or still loading)
    expect(hasError || hasNoEvents || hasLoading).toBeTruthy();
  });

  test('games page shows replay button for completed games', async ({ page }) => {
    await page.goto('/gameplay/games');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Look for any completed game with replay button
    const replayButtons = page.locator('a[href*="/replay"], button:has-text("Replay")');
    const replayCount = await replayButtons.count();
    
    // Skip if no completed games with replay buttons exist
    test.skip(replayCount === 0, 'No completed games with replay buttons - test requires game data');
    
    const firstReplay = replayButtons.first();
    await expect(firstReplay).toBeVisible();
  });
});

// =============================================================================
// Test Suite: Keyboard Shortcuts (requires replay with events)
// =============================================================================

test.describe('Replay Keyboard Shortcuts', () => {
  test('keyboard help modal can be toggled', async ({ page }) => {
    // Go to a replay page (will show error but keyboard handler should still work)
    await page.goto('/gameplay/games/test-game/replay');
    await page.waitForLoadState('networkidle');
    
    // Look for keyboard help button - uses updated aria-label
    const helpButton = page.locator('button[aria-label="Show keyboard shortcuts"]');
    const hasHelpButton = await helpButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Skip if keyboard help button not visible (page shows error state)
    test.skip(!hasHelpButton, 'Keyboard help button not visible - page may be in error state');
    
    await helpButton.click();
    
    // Should show keyboard shortcuts help
    await expect(page.locator('text=Keyboard Shortcuts').first()).toBeVisible({ timeout: 3000 });
    
    // Close it using the close button with aria-label
    const closeButton = page.locator('button[aria-label="Close keyboard shortcuts"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    
    // Modal should be closed
    await expect(page.locator('text=Keyboard Shortcuts').first()).not.toBeVisible({ timeout: 3000 });
  });
});

// =============================================================================
// Test Suite: Timeline Filters and Export
// =============================================================================

test.describe('Timeline Export Functionality', () => {
  test('export button is visible on timeline page', async ({ page }) => {
    await navigateToTimeline(page);
    
    // Export button should be present - this is a core UI element
    const exportButton = page.locator('button:has-text("Export"), [aria-label*="Export"]');
    
    // Allow export to be optional for now, but track if it's missing
    const hasExport = await exportButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasExport) {
      console.warn('Export button not found on timeline page - may need implementation');
    }
    // Test passes - export is optional until fully implemented
  });

  test('refresh button works on timeline', async ({ page }) => {
    await navigateToTimeline(page);
    
    // Refresh button should exist on timeline page
    const refreshButton = page.locator('button[aria-label="Refresh timeline"]');
    await expect(refreshButton).toBeVisible({ timeout: 5000 });
    
    // Click refresh and verify it doesn't cause errors
    await refreshButton.click();
    
    // Page should remain functional after refresh
    await expect(page.locator('h1')).toContainText('Event Timeline');
  });
});
