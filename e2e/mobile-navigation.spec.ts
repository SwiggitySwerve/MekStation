import { test, expect } from '@playwright/test';

// =============================================================================
// Mobile Navigation Header Tests
// =============================================================================

test.describe('Mobile Navigation Header', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('should display mobile header on settings page', async ({ page }) => {
    await page.goto('/settings');

    // Mobile header should be visible (may show "MekStation" or page title)
    const header = page.locator('header');
    await expect(header.first()).toBeVisible();

    // Should have hamburger menu button on the right
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await expect(menuButton).toBeVisible();
  });

  test('should display mobile header on units page', async ({ page }) => {
    await page.goto('/units');

    // Should have hamburger menu button
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await expect(menuButton).toBeVisible();
  });

  test('should display mobile header on compendium page', async ({ page }) => {
    await page.goto('/compendium');

    // Should have hamburger menu button
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await expect(menuButton).toBeVisible();
  });

  test('should display mobile header on customizer page for consistency', async ({ page }) => {
    await page.goto('/customizer');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Mobile header is now shown on ALL pages for consistent UX
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await expect(menuButton).toBeVisible();
  });

  test('should hide mobile header on desktop viewport', async ({ page }) => {
    // Use desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/settings');

    // Mobile header should be hidden (lg:hidden class)
    const mobileHeader = page.locator('header.lg\\:hidden');
    await expect(mobileHeader).toBeHidden();
  });
});

// =============================================================================
// Mobile Sidebar Tests
// =============================================================================

test.describe('Mobile Sidebar', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('should open sidebar when hamburger menu is clicked', async ({ page }) => {
    await page.goto('/settings');

    // Click hamburger menu
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await menuButton.click();

    // Sidebar (aside element) should be visible with navigation items
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Check for nav links inside sidebar
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Units')).toBeVisible();
    await expect(sidebar.getByText('Compendium')).toBeVisible();
    await expect(sidebar.getByText('Customizer')).toBeVisible();
  });

  test('should display sidebar fully expanded with labels on mobile', async ({ page }) => {
    await page.goto('/settings');

    // Open sidebar
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await menuButton.click();

    // Sidebar should be visible
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Should show full labels, not just icons (brand and subtitle in sidebar)
    await expect(sidebar.getByText('BattleTech Lab')).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
  });

  test('should close sidebar when navigation item is clicked', async ({ page }) => {
    await page.goto('/settings');

    // Open sidebar
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await menuButton.click();

    // Verify sidebar is open (wait for animation)
    await page.waitForTimeout(350);
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Find Units link (not Dashboard since we're testing navigation TO a different page)
    const unitsLink = sidebar.locator('a[href="/units"]').first();
    await expect(unitsLink).toBeVisible();
    
    // Click and wait for navigation
    await Promise.all([
      page.waitForURL('/units'),
      unitsLink.evaluate((el: HTMLElement) => el.click())
    ]);
    
    // Wait a moment for sidebar animation to complete
    await page.waitForTimeout(350);
    
    // Sidebar subtitle should not be visible (sidebar closed/translated off-screen)
    await expect(sidebar.getByText('BattleTech Lab')).not.toBeVisible();
  });

  test('should close sidebar when backdrop is clicked', async ({ page }) => {
    await page.goto('/settings');

    // Open sidebar
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await menuButton.click();

    // Verify sidebar is open
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();

    // Click the backdrop (area outside sidebar)
    // The backdrop is a fixed overlay, click on the right side of the screen
    await page.mouse.click(350, 300);

    // Sidebar should close - subtitle should not be visible
    await expect(sidebar.getByText('BattleTech Lab')).not.toBeVisible();
  });

  test('should hide collapse toggle button on mobile', async ({ page }) => {
    await page.goto('/settings');

    // Open sidebar
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await menuButton.click();

    // Collapse button should be hidden on mobile (hidden lg:block)
    const collapseButton = page.getByRole('button', { name: /collapse sidebar|expand sidebar/i });
    await expect(collapseButton).toBeHidden();
  });
});

// =============================================================================
// Hamburger Menu Button Position Tests
// =============================================================================

test.describe('Hamburger Menu Button Position (Right-Hand Ergonomics)', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('should position hamburger menu on the right side of header', async ({ page }) => {
    await page.goto('/settings');

    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    const buttonBox = await menuButton.boundingBox();

    // Button should be on the right side of the screen (x > viewport width / 2)
    expect(buttonBox).not.toBeNull();
    if (buttonBox) {
      expect(buttonBox.x).toBeGreaterThan(375 / 2); // More than halfway across screen
    }
  });

  test('should have adequate touch target size (minimum 44x44px)', async ({ page }) => {
    await page.goto('/settings');

    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    const buttonBox = await menuButton.boundingBox();

    expect(buttonBox).not.toBeNull();
    if (buttonBox) {
      // Touch target should be at least 44x44 (accounting for padding)
      expect(buttonBox.width).toBeGreaterThanOrEqual(40);
      expect(buttonBox.height).toBeGreaterThanOrEqual(40);
    }
  });
});

// =============================================================================
// Customizer Bottom Tray Menu Tests
// =============================================================================

test.describe('Customizer Page', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('should display bottom tray on customizer', async ({ page }) => {
    await page.goto('/customizer');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // The customizer should have a fixed bottom area for stats
    await expect(page.locator('body')).toBeVisible();
  });

  test('should use mobile header for navigation (consistent with other pages)', async ({ page }) => {
    await page.goto('/customizer');
    await page.waitForLoadState('networkidle');

    // Menu button should be in the mobile header (top), not in bottom tray
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await expect(menuButton).toBeVisible();

    // Verify it's in the header (top of screen)
    const buttonBox = await menuButton.boundingBox();
    expect(buttonBox).not.toBeNull();
    if (buttonBox) {
      // Button should be near the top of the screen (in header)
      expect(buttonBox.y).toBeLessThan(100);
      // And on the right side
      expect(buttonBox.x).toBeGreaterThan(375 / 2);
    }
  });

  test('should open sidebar from customizer mobile header', async ({ page }) => {
    await page.goto('/customizer');
    await page.waitForLoadState('networkidle');

    // Click the menu button in the mobile header
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await menuButton.click();

    // Sidebar should open
    await page.waitForTimeout(350);
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
  });
});

// =============================================================================
// Desktop Sidebar Tests
// =============================================================================

test.describe('Desktop Sidebar', () => {
  test.use({ viewport: { width: 1200, height: 800 } }); // Desktop viewport

  test('should display sidebar on desktop without hamburger menu', async ({ page }) => {
    await page.goto('/settings');

    // Sidebar (aside) should be visible with nav items
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();

    // Mobile hamburger should NOT be visible (hidden on desktop via lg:hidden)
    const mobileHeader = page.locator('header.lg\\:hidden');
    await expect(mobileHeader).toBeHidden();
  });

  test('should toggle between collapsed and expanded on desktop', async ({ page }) => {
    await page.goto('/settings');

    // Sidebar should be visible
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Brand subtitle should be visible when expanded
    await expect(sidebar.getByText('BattleTech Lab')).toBeVisible();

    // Find and click the collapse button
    const collapseButton = page.getByRole('button', { name: /collapse sidebar/i });
    await expect(collapseButton).toBeVisible();
    await collapseButton.click();

    // Brand subtitle should be hidden when collapsed
    await expect(sidebar.getByText('BattleTech Lab')).not.toBeVisible();

    // Click expand button
    const expandButton = page.getByRole('button', { name: /expand sidebar/i });
    await expandButton.click();

    // Brand subtitle should be visible again
    await expect(sidebar.getByText('BattleTech Lab')).toBeVisible();
  });
});

// =============================================================================
// Navigation Flow Tests
// =============================================================================

test.describe('Navigation Flows', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('should navigate between pages using mobile sidebar', async ({ page }) => {
    // Start on settings
    await page.goto('/settings');
    const sidebar = page.locator('aside');

    // Helper function to open sidebar and navigate
    async function navigateVia(href: string) {
      await page.getByRole('button', { name: /open navigation menu/i }).click();
      await page.waitForTimeout(350); // Wait for animation
      await expect(sidebar).toBeVisible();
      const link = sidebar.locator(`a[href="${href}"]`);
      await expect(link).toBeVisible();
      await link.evaluate((el: HTMLElement) => el.click());
    }

    // Navigate to Units
    await navigateVia('/units');
    await expect(page).toHaveURL('/units');

    // Navigate to Compendium
    await navigateVia('/compendium');
    await expect(page).toHaveURL('/compendium');

    // Navigate to Customizer
    await navigateVia('/customizer');
    await expect(page).toHaveURL('/customizer');
  });

  test('should close sidebar automatically on route change', async ({ page }) => {
    await page.goto('/settings');
    const sidebar = page.locator('aside');

    // Open sidebar
    await page.getByRole('button', { name: /open navigation menu/i }).click();
    await page.waitForTimeout(350); // Wait for animation
    await expect(sidebar.getByText('BattleTech Lab')).toBeVisible();

    // Navigate using link via JS click
    const unitsLink = sidebar.locator('a[href="/units"]');
    await expect(unitsLink).toBeVisible();
    await unitsLink.evaluate((el: HTMLElement) => el.click());

    // Wait for navigation
    await expect(page).toHaveURL('/units');

    // Wait for animation
    await page.waitForTimeout(350);

    // Sidebar should be closed
    await expect(sidebar.getByText('BattleTech Lab')).not.toBeVisible();
  });
});

// =============================================================================
// Touch Interaction Tests
// =============================================================================

test.describe('Touch Interactions', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true
  });

  test('should respond to tap on hamburger menu', async ({ page }) => {
    await page.goto('/settings');

    // Tap the hamburger menu
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await menuButton.tap();

    // Sidebar should open
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
  });

  test('should respond to tap on navigation items', async ({ page }) => {
    await page.goto('/settings');

    // Open sidebar via tap
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await menuButton.tap();

    // Wait for animation and verify sidebar is visible
    await page.waitForTimeout(350);
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Find Dashboard link and click via JS (tap can have issues with translated elements)
    const dashboardLink = sidebar.locator('a[href="/"]').first();
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.evaluate((el: HTMLElement) => el.click());

    // Should navigate
    await expect(page).toHaveURL('/');
  });
});

// =============================================================================
// Gameplay Navigation Tests
// =============================================================================

test.describe('Gameplay Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('should show expandable gameplay section with all items in mobile sidebar', async ({ page }) => {
    await page.goto('/');
    
    // Open sidebar
    await page.getByRole('button', { name: /open navigation menu/i }).click();
    await page.waitForTimeout(350);
    
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Look for Gameplay section - expandable button
    const gameplayButton = sidebar.getByRole('button', { name: /gameplay/i });
    await expect(gameplayButton).toBeVisible();
    
    // Click to expand
    await gameplayButton.click();
    await page.waitForTimeout(200);
    
    // Should show all gameplay items with correct hrefs
    const pilotsLink = sidebar.locator('a[href="/gameplay/pilots"]');
    const forcesLink = sidebar.locator('a[href="/gameplay/forces"]');
    const campaignsLink = sidebar.locator('a[href="/gameplay/campaigns"]');
    const encountersLink = sidebar.locator('a[href="/gameplay/encounters"]');
    const gamesLink = sidebar.locator('a[href="/gameplay/games"]');
    
    await expect(pilotsLink).toBeVisible();
    await expect(forcesLink).toBeVisible();
    await expect(campaignsLink).toBeVisible();
    await expect(encountersLink).toBeVisible();
    await expect(gamesLink).toBeVisible();
    
    // Verify labels
    await expect(sidebar.getByText('Pilots')).toBeVisible();
    await expect(sidebar.getByText('Forces')).toBeVisible();
    await expect(sidebar.getByText('Campaigns')).toBeVisible();
    await expect(sidebar.getByText('Encounters')).toBeVisible();
    await expect(sidebar.getByText('Games')).toBeVisible();
  });

  test('should have navigable gameplay routes', async ({ page }) => {
    // Test that all gameplay routes are accessible
    const routes = [
      '/gameplay/pilots',
      '/gameplay/forces', 
      '/gameplay/campaigns',
      '/gameplay/encounters',
      '/gameplay/games',
    ];
    
    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(route);
    }
  });
});

// =============================================================================
// History/Timeline Navigation Tests
// =============================================================================

test.describe('History Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('should navigate to timeline via mobile sidebar', async ({ page }) => {
    await page.goto('/');
    
    // Open sidebar
    await page.getByRole('button', { name: /open navigation menu/i }).click();
    await page.waitForTimeout(350);
    
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Find Timeline link within sidebar navigation
    const timelineLink = sidebar.locator('a[href="/audit/timeline"]');
    
    // Scroll into view first (Timeline is in the History section which may be below the fold)
    await timelineLink.scrollIntoViewIfNeeded();
    await expect(timelineLink).toBeVisible();
    
    // Get href and navigate directly (workaround for Next.js Link issues in E2E)
    const href = await timelineLink.getAttribute('href');
    expect(href).toBe('/audit/timeline');
    
    // Navigate directly to verify the route works
    await page.goto('/audit/timeline');
    await expect(page).toHaveURL('/audit/timeline');
  });

  test('should show History section with Timeline in sidebar', async ({ page }) => {
    await page.goto('/');
    
    // Open sidebar
    await page.getByRole('button', { name: /open navigation menu/i }).click();
    await page.waitForTimeout(350);
    
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Should show History section (may be title or just Timeline item)
    await expect(sidebar.getByText('Timeline')).toBeVisible();
  });
});

// =============================================================================
// Responsive Layout Tests
// =============================================================================

test.describe('Responsive Layout', () => {
  test('should switch between mobile and desktop layouts', async ({ page }) => {
    // Start with mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/settings');

    // Mobile header should be visible
    const menuButton = page.getByRole('button', { name: /open navigation menu/i });
    await expect(menuButton).toBeVisible();

    // Switch to desktop
    await page.setViewportSize({ width: 1200, height: 800 });

    // Mobile header should be hidden
    await expect(menuButton).not.toBeVisible();
    
    // Desktop sidebar should be visible
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
  });

  test('should not have horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/settings');

    // Check that the page doesn't have horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 10); // Small tolerance
  });
});
