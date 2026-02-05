/**
 * Simulation Viewer E2E Tests
 *
 * Tests full browser workflows for the Simulation Viewer feature:
 * Campaign Dashboard, Encounter History, Analysis & Bugs tabs.
 *
 * Uses a dedicated test harness page at /e2e/simulation-viewer.
 *
 * @tags @simulation-viewer
 */

import { test, expect, type Page } from '@playwright/test';

test.setTimeout(30000);

const HARNESS_URL = '/e2e/simulation-viewer';

async function navigateToHarness(page: Page): Promise<void> {
  await page.goto(HARNESS_URL);
  await page.waitForLoadState('networkidle');
  // Dismiss Next.js dev-mode portal overlay that can intercept pointer events
  await page.evaluate(() => {
    document.querySelectorAll('nextjs-portal').forEach((el) => el.remove());
  });
  await expect(page.getByTestId('simulation-viewer-harness')).toBeVisible({
    timeout: 10000,
  });
}

// =============================================================================
// Test 1: Full workflow — dashboard → encounter history → analysis
// =============================================================================

test.describe('Simulation Viewer E2E Tests', () => {
  test('Full workflow: dashboard → history → analysis @smoke @simulation-viewer', async ({
    page,
  }) => {
    await navigateToHarness(page);

    // Verify Campaign Dashboard is the default tab
    await expect(page.getByTestId('campaign-dashboard')).toBeVisible();
    await expect(page.getByTestId('dashboard-title')).toContainText(
      'Campaign Dashboard',
    );

    // Verify KPI cards are rendered
    const kpiCards = page.getByTestId('kpi-card');
    await expect(kpiCards.first()).toBeVisible();

    // Verify drill-down links are present
    await expect(page.getByTestId('drill-down-link').first()).toBeVisible();

    // Click Encounter History tab
    await page.getByTestId('tab-encounter-history').click({ force: true });

    // Verify Encounter History tab is active
    await expect(page.getByTestId('tab-encounter-history')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('encounter-history')).toBeVisible();
    await expect(page.getByTestId('encounter-history-title')).toContainText(
      'Encounter History',
    );

    // Verify battle list is displayed
    await expect(page.getByTestId('battle-list')).toBeVisible();

    // Select the first battle card
    await page.getByTestId('battle-card-battle-1').click({ force: true });

    // Verify battle detail is shown
    await expect(page.getByTestId('forces-section')).toBeVisible();
    await expect(page.getByTestId('outcome-summary')).toBeVisible();

    // Click Analysis & Bugs tab
    await page.getByTestId('tab-analysis-bugs').click({ force: true });

    // Verify Analysis & Bugs tab is active
    await expect(page.getByTestId('tab-analysis-bugs')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('analysis-bugs-page')).toBeVisible();
    await expect(page.getByTestId('page-title')).toContainText(
      'Analysis & Bugs',
    );

    // Verify all four sections are visible
    await expect(page.getByTestId('invariant-section')).toBeVisible();
    await expect(page.getByTestId('anomaly-section')).toBeVisible();
    await expect(page.getByTestId('violation-section')).toBeVisible();
    await expect(page.getByTestId('threshold-section')).toBeVisible();
  });

  // ===========================================================================
  // Test 2: Drill-down navigation with filter application
  // ===========================================================================

  test('Drill-down navigation with filter application @simulation-viewer', async ({
    page,
  }) => {
    await navigateToHarness(page);

    // Navigate to Encounter History tab
    await page.getByTestId('tab-encounter-history').click({ force: true });
    await expect(page.getByTestId('encounter-history')).toBeVisible();

    // Verify all 3 battles are initially shown
    const allBattleCards = page.locator('[data-testid^="battle-card-"]');
    await expect(allBattleCards).toHaveCount(3);

    // Open the outcome filter section and apply "victory" filter
    const victoryCheckbox = page.getByTestId('checkbox-outcome-victory');
    await victoryCheckbox.check();

    // Verify only victory battles are shown (2 victories in mock data)
    await expect(allBattleCards).toHaveCount(2);

    // Click on the first victory battle to drill down
    await allBattleCards.first().click({ force: true });

    // Verify battle detail view opens
    await expect(page.getByTestId('forces-section')).toBeVisible();
    await expect(page.getByTestId('outcome-summary')).toContainText('Victory');

    // Verify the filter persists — the checkbox should still be checked
    await expect(victoryCheckbox).toBeChecked();

    // Verify the defeat battle (battle-3) is not shown
    await expect(page.getByTestId('battle-card-battle-3')).not.toBeVisible();

    // Clear the filter
    await page.getByTestId('clear-all-button').click({ force: true });

    // All 3 battles should be visible again
    await expect(allBattleCards).toHaveCount(3);
  });

  // ===========================================================================
  // Test 3: VCR playback controls
  // ===========================================================================

  test('VCR playback controls @simulation-viewer', async ({ page }) => {
    await navigateToHarness(page);

    // Navigate to Encounter History and select a battle
    await page.getByTestId('tab-encounter-history').click({ force: true });
    await page.getByTestId('battle-card-battle-1').click({ force: true });

    // Verify VCR controls are visible
    await expect(page.getByTestId('vcr-controls')).toBeVisible();
    await expect(page.getByTestId('vcr-play-pause')).toBeVisible();
    await expect(page.getByTestId('vcr-step-back')).toBeVisible();
    await expect(page.getByTestId('vcr-step-forward')).toBeVisible();
    await expect(page.getByTestId('vcr-speed-select')).toBeVisible();

    // Verify initial turn display
    await expect(page.getByTestId('vcr-turn-display')).toContainText('Turn 1');

    // Click step forward
    await page.getByTestId('vcr-step-forward').click({ force: true });
    await expect(page.getByTestId('vcr-turn-display')).toContainText('Turn 2');

    // Click step forward again
    await page.getByTestId('vcr-step-forward').click({ force: true });
    await expect(page.getByTestId('vcr-turn-display')).toContainText('Turn 3');

    // Click step back
    await page.getByTestId('vcr-step-back').click({ force: true });
    await expect(page.getByTestId('vcr-turn-display')).toContainText('Turn 2');

    // Click play — turn should advance automatically
    await page.getByTestId('vcr-play-pause').click({ force: true });

    // Wait for at least one turn advance (speed=1x means ~1s per turn)
    await expect(page.getByTestId('vcr-turn-display')).not.toContainText(
      'Turn 2',
      { timeout: 3000 },
    );

    // Click pause (button label changes to Pause when playing)
    await page.getByTestId('vcr-play-pause').click({ force: true });

    // After pausing, turn should remain stable
    const currentText = await page
      .getByTestId('vcr-turn-display')
      .textContent();
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('vcr-turn-display')).toHaveText(currentText!);

    // Change speed to 2x
    await page.getByTestId('vcr-speed-select').selectOption('2');
    await expect(page.getByTestId('vcr-speed-select')).toHaveValue('2');
  });

  // ===========================================================================
  // Test 4: Threshold configuration with live preview
  // ===========================================================================

  test('Threshold configuration with live preview @simulation-viewer', async ({
    page,
  }) => {
    await navigateToHarness(page);

    // Navigate to Analysis & Bugs tab
    await page.getByTestId('tab-analysis-bugs').click({ force: true });
    await expect(page.getByTestId('threshold-section')).toBeVisible();

    // Verify the Heat Suicide threshold slider exists
    const heatSlider = page.getByTestId('threshold-input-heatSuicide');
    await expect(heatSlider).toBeVisible();

    // Read initial value
    const initialValue = await page
      .getByTestId('threshold-value-heatSuicide')
      .textContent();
    expect(initialValue).toBe('80');

    // Adjust slider value via fill (simulates user typing)
    await heatSlider.fill('50');

    // Verify displayed value updates to reflect the new threshold
    await expect(page.getByTestId('threshold-value-heatSuicide')).toHaveText(
      '50',
    );

    // Click Save Thresholds button
    await page.getByTestId('threshold-save').click({ force: true });

    // Verify success toast
    await expect(page.getByTestId('threshold-saved-toast')).toBeVisible();
    await expect(page.getByTestId('threshold-saved-toast')).toContainText(
      'Thresholds saved',
    );

    // Reset to defaults
    await page.getByTestId('threshold-reset').click({ force: true });

    // Verify reset back to 80
    await expect(page.getByTestId('threshold-value-heatSuicide')).toHaveText(
      '80',
    );
  });

  // ===========================================================================
  // Test 5: Dark mode toggle
  // ===========================================================================

  test('Dark mode toggle @simulation-viewer', async ({ page }) => {
    await navigateToHarness(page);

    // Verify light mode by default (no 'dark' class on <html>)
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Click dark mode toggle
    await page.getByTestId('dark-mode-toggle').click({ force: true });

    // Verify dark mode is applied
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Verify dark mode affects component rendering
    const dashboard = page.getByTestId('campaign-dashboard');
    const bgColor = await dashboard.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    // Dark mode bg-gray-900 should produce a dark background
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');

    // Toggle back to light mode
    await page.getByTestId('dark-mode-toggle').click({ force: true });

    // Verify light mode restored
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  // ===========================================================================
  // Test 6: Responsive layout — mobile (480px)
  // ===========================================================================

  test('Responsive layout at mobile (480px) @simulation-viewer', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await navigateToHarness(page);

    // Dashboard should render with stacked layout
    await expect(page.getByTestId('campaign-dashboard')).toBeVisible();
    await expect(page.getByTestId('dashboard-grid')).toBeVisible();

    // KPI cards should exist
    const kpiCards = page.getByTestId('kpi-card');
    const firstCard = kpiCards.first();
    await expect(firstCard).toBeVisible();
    const cardBox = await firstCard.boundingBox();

    // On mobile, cards should take near-full width (>400px of 480 viewport minus padding)
    expect(cardBox!.width).toBeGreaterThan(360);

    // Navigate to Encounter History (JS click: bypass nextjs-portal overlay at small viewports)
    await page.getByTestId('tab-encounter-history').dispatchEvent('click');
    await expect(page.getByTestId('encounter-history')).toBeVisible();

    // On mobile, sidebar toggle should be visible
    await expect(page.getByTestId('sidebar-toggle')).toBeVisible();

    // Verify primary interactive elements meet 44px minimum touch target
    const tabButtons = page.locator('[role="tab"]');
    const tabCount = await tabButtons.count();
    for (let i = 0; i < tabCount; i++) {
      const box = await tabButtons.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
    const toggleBox = await page.getByTestId('sidebar-toggle').boundingBox();
    expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
  });

  // ===========================================================================
  // Test 7: Responsive layout — tablet (768px)
  // ===========================================================================

  test('Responsive layout at tablet (768px) @simulation-viewer', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateToHarness(page);

    await expect(page.getByTestId('campaign-dashboard')).toBeVisible();

    // KPI cards should be visible and arranged in a grid
    const kpiCards = page.getByTestId('kpi-card');
    const count = await kpiCards.count();
    expect(count).toBeGreaterThan(1);

    // At tablet (md breakpoint), dashboard grid uses md:grid-cols-2
    // So first two section-level cards should be side-by-side
    const rosterSection = page.getByTestId('roster-section');
    const forceSection = page.getByTestId('force-section');
    const rosterBox = await rosterSection.boundingBox();
    const forceBox = await forceSection.boundingBox();

    // Sections should be on the same row (Y positions close)
    expect(Math.abs(rosterBox!.y - forceBox!.y)).toBeLessThan(10);
  });

  // ===========================================================================
  // Test 8: Responsive layout — desktop (1920px)
  // ===========================================================================

  test('Responsive layout at desktop (1920px) @simulation-viewer', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToHarness(page);

    await expect(page.getByTestId('campaign-dashboard')).toBeVisible();

    // At desktop (lg breakpoint), dashboard grid uses lg:grid-cols-4
    // All four top sections should be in one row
    const rosterSection = page.getByTestId('roster-section');
    const forceSection = page.getByTestId('force-section');
    const financialSection = page.getByTestId('financial-section');
    const progressionSection = page.getByTestId('progression-section');

    const rosterBox = await rosterSection.boundingBox();
    const forceBox = await forceSection.boundingBox();
    const financialBox = await financialSection.boundingBox();
    const progressionBox = await progressionSection.boundingBox();

    // Roster and Force should be on same row
    expect(Math.abs(rosterBox!.y - forceBox!.y)).toBeLessThan(10);

    // Financial section spans 2 cols, should still be on the same row
    expect(Math.abs(rosterBox!.y - financialBox!.y)).toBeLessThan(10);

    // Navigate to Encounter History
    await page.getByTestId('tab-encounter-history').click({ force: true });
    await expect(page.getByTestId('encounter-history')).toBeVisible();

    // On desktop, sidebar toggle should NOT be visible (sidebar is always shown)
    await expect(page.getByTestId('sidebar-toggle')).not.toBeVisible();

    // Battle list sidebar and detail should be side-by-side
    const sidebar = page.getByTestId('battle-list-sidebar');
    const detail = page.getByTestId('battle-detail');
    const sidebarBox = await sidebar.boundingBox();
    const detailBox = await detail.boundingBox();

    // Sidebar and detail should be on the same Y
    expect(Math.abs(sidebarBox!.y - detailBox!.y)).toBeLessThan(10);

    // Progression should be below the first row (different Y)
    // Actually at lg:grid-cols-4, progression is col-span-1, and financial is col-span-2
    // So roster(1) + force(1) + financial(2) = 4 cols = fills first row
    // progression is on the second row
    expect(progressionBox!.y).toBeGreaterThan(rosterBox!.y + 50);
  });
});
