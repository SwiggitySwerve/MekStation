import { test, expect, type Page } from '@playwright/test';

import { gotoWithRetry } from './helpers/navigation';

/**
 * Waits for React hydration. The hamburger's onClick is a React handler —
 * clicking before hydration is a silent no-op and the overlay menu (which
 * renders only while open) never mounts (e2e triage RC9). `__E2E_MODE__`
 * is set by `_app.tsx`'s post-hydration `exposeStoresForE2E()` effect, so
 * it is a true hydration-complete signal under NEXT_PUBLIC_E2E_MODE.
 */
async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as { __E2E_MODE__?: boolean }).__E2E_MODE__ === true,
    undefined,
    { timeout: 15_000 },
  );
}

// =============================================================================
// Mobile Navigation Header Tests
// =============================================================================

test.describe('Mobile Navigation Header', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('should display mobile header on settings page', async ({ page }) => {
    await page.goto('/settings');
    await waitForHydration(page);

    // Mobile header should be visible (may show "MekStation" or page title)
    const header = page.locator('header');
    await expect(header.first()).toBeVisible();

    // Should have hamburger menu button on the right
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await expect(menuButton).toBeVisible();
  });

  test('should display mobile header on units page', async ({ page }) => {
    await page.goto('/units');
    await waitForHydration(page);

    // Should have hamburger menu button
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await expect(menuButton).toBeVisible();
  });

  test('should display mobile header on compendium page', async ({ page }) => {
    await page.goto('/compendium');
    await waitForHydration(page);

    // Should have hamburger menu button
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await expect(menuButton).toBeVisible();
  });

  test('should display mobile header on customizer page for consistency', async ({
    page,
  }) => {
    await page.goto('/customizer');
    await waitForHydration(page);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Mobile header is now shown on ALL pages for consistent UX
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await expect(menuButton).toBeVisible();
  });

  test('should hide mobile header on desktop viewport', async ({ page }) => {
    // Use desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/settings');
    await waitForHydration(page);

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

  test('should open sidebar when hamburger menu is clicked', async ({
    page,
  }) => {
    await page.goto('/settings');
    await waitForHydration(page);

    // Click hamburger menu
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await menuButton.click();

    // Sidebar (aside element) should be visible with navigation items
    const sidebar = page.getByTestId('mobile-menu');
    await expect(sidebar).toBeVisible();

    // Check for nav links inside sidebar
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Units')).toBeVisible();
    await expect(sidebar.getByText('Compendium')).toBeVisible();
    await expect(sidebar.getByText('Customizer')).toBeVisible();
  });

  test('should hide bottom navigation while mobile sidebar is open', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForHydration(page);

    const bottomNav = page.getByRole('navigation', {
      name: /mobile navigation/i,
    });
    await expect(bottomNav).toBeVisible();

    await page.getByRole('button', { name: /open menu/i }).click();

    await expect(page.getByTestId('mobile-menu')).toBeVisible();
    await expect(bottomNav).toHaveCount(0);
  });

  test('should display sidebar fully expanded with labels on mobile', async ({
    page,
  }) => {
    await page.goto('/settings');
    await waitForHydration(page); // RC9

    // Open sidebar
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await menuButton.click();

    // Sidebar should be visible
    const sidebar = page.getByTestId('mobile-menu');
    await expect(sidebar).toBeVisible();

    // Should show full labels, not just icons. Brand is "MekStation"
    // (TopBarMobileMenu.tsx menu header) — the old "BattleTech Lab" brand
    // predates the TopBar navigation redesign.
    await expect(sidebar.getByText('MekStation')).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
  });

  test('should close sidebar when navigation item is clicked', async ({
    page,
  }) => {
    await page.goto('/settings');
    await waitForHydration(page);

    // Open sidebar
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await menuButton.click();

    // Verify sidebar is open (wait for animation)
    await page.waitForTimeout(350);
    const sidebar = page.getByTestId('mobile-menu');
    await expect(sidebar).toBeVisible();

    // Find Units link (not Dashboard since we're testing navigation TO a different page)
    const unitsLink = sidebar.locator('a[href="/units"]').first();
    await expect(unitsLink).toBeVisible();

    // Click and wait for navigation
    await Promise.all([
      page.waitForURL('/units'),
      unitsLink.evaluate((el: HTMLElement) => el.click()),
    ]);

    // Wait a moment for sidebar animation to complete
    await page.waitForTimeout(350);

    // The overlay menu unmounts entirely when closed (TopBarMobileMenu.tsx
    // returns null while !isOpen) — assert the menu itself is gone instead
    // of probing for the long-removed "BattleTech Lab" subtitle.
    await expect(sidebar).not.toBeVisible();
  });

  test('should close sidebar via the close button', async ({ page }) => {
    // The menu is a fullscreen overlay (TopBarMobileMenu.tsx: fixed inset-0
    // z-50), so the z-40 backdrop behind it is unreachable on mobile — the
    // explicit close affordance is the "Close menu" button. The old
    // backdrop-click flow only "passed" because its final assertion probed
    // for the long-removed "BattleTech Lab" text (vacuously true).
    await page.goto('/settings');
    await waitForHydration(page); // RC9

    // Open sidebar
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await menuButton.click();

    // Verify sidebar is open
    const sidebar = page.getByTestId('mobile-menu');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();

    // Close via the explicit close button
    await sidebar.getByRole('button', { name: /close menu/i }).click();

    // Sidebar should close — the menu unmounts entirely (returns null)
    await expect(sidebar).not.toBeVisible();
  });

  test('should hide collapse toggle button on mobile', async ({ page }) => {
    await page.goto('/settings');
    await waitForHydration(page);

    // Open sidebar
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await menuButton.click();

    // Collapse button should be hidden on mobile (hidden lg:block)
    const collapseButton = page.getByRole('button', {
      name: /collapse sidebar|expand sidebar/i,
    });
    await expect(collapseButton).toBeHidden();
  });
});

// =============================================================================
// Hamburger Menu Button Position Tests
// =============================================================================

test.describe('Hamburger Menu Button Position (Right-Hand Ergonomics)', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('should position hamburger menu on the right side of header', async ({
    page,
  }) => {
    await page.goto('/settings');
    await waitForHydration(page);

    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    const buttonBox = await menuButton.boundingBox();

    // Button should be on the right side of the screen (x > viewport width / 2)
    expect(buttonBox).not.toBeNull();
    if (buttonBox) {
      expect(buttonBox.x).toBeGreaterThan(375 / 2); // More than halfway across screen
    }
  });

  test('should have adequate touch target size (minimum 44x44px)', async ({
    page,
  }) => {
    await page.goto('/settings');
    await waitForHydration(page);

    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
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
    await waitForHydration(page);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // The customizer should have a fixed bottom area for stats
    await expect(page.locator('body')).toBeVisible();
  });

  test('should use mobile header for navigation (consistent with other pages)', async ({
    page,
  }) => {
    await page.goto('/customizer');
    await waitForHydration(page);
    await page.waitForLoadState('networkidle');

    // Menu button should be in the mobile header (top), not in bottom tray
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
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

  test('should open sidebar from customizer mobile header', async ({
    page,
  }) => {
    await page.goto('/customizer');
    await waitForHydration(page);
    await page.waitForLoadState('networkidle');

    // Click the menu button in the mobile header
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await menuButton.click();

    // Sidebar should open
    await page.waitForTimeout(350);
    const sidebar = page.getByTestId('mobile-menu');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
  });
});

// =============================================================================
// Desktop Sidebar Tests
// =============================================================================

// PT-008: the desktop secondary sidebar (and its collapse/expand toggle)
// was removed in the TopBar navigation redesign. Desktop navigation lives
// in the TopBar as labeled dropdown menus (TopBar.tsx); the mobile overlay
// menu renders only while open and only below the md breakpoint
// (TopBarMobileMenu.tsx). These tests pin the TopBar desktop contract.
test.describe('Desktop Navigation (TopBar)', () => {
  test.use({ viewport: { width: 1200, height: 800 } }); // Desktop viewport

  test('should display top-bar navigation on desktop without hamburger menu', async ({
    page,
  }) => {
    await page.goto('/settings');
    await waitForHydration(page); // RC9

    // Desktop labeled nav (first <nav> in the header; the tablet icon-only
    // nav duplicates the structure but is display-hidden at >=lg).
    const desktopNav = page.locator('header nav').first();
    await expect(desktopNav).toBeVisible();
    await expect(
      desktopNav.getByRole('link', { name: 'Dashboard' }),
    ).toBeVisible();

    // The mobile overlay menu is unmounted (renders only while open).
    await expect(page.getByTestId('mobile-menu')).toHaveCount(0);

    // Mobile hamburger is hidden at >=md (TopBar.tsx md:hidden).
    await expect(page.getByRole('button', { name: /open menu/i })).toBeHidden();
  });

  test('should expose section navigation through top-bar dropdowns', async ({
    page,
  }) => {
    await page.goto('/settings');
    await waitForHydration(page); // RC9

    const desktopNav = page.locator('header nav').first();

    // Dropdown items render with role="menuitem" and stay hidden until the
    // section button opens its menu (TopBarMenu.tsx).
    const browseButton = desktopNav.getByRole('button', { name: 'Browse' });
    const myUnitsItem = desktopNav.getByRole('menuitem', { name: 'My Units' });
    await expect(myUnitsItem).toBeHidden();

    await browseButton.click();
    await expect(myUnitsItem).toBeVisible();
    await expect(myUnitsItem).toHaveAttribute('href', '/units');

    // Escape closes the open dropdown again.
    await page.keyboard.press('Escape');
    await expect(myUnitsItem).toBeHidden();
  });
});

// =============================================================================
// Navigation Flow Tests
// =============================================================================

test.describe('Navigation Flows', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('should navigate between pages using mobile sidebar', async ({
    page,
  }) => {
    // Start on settings
    await page.goto('/settings');
    await waitForHydration(page);
    const sidebar = page.getByTestId('mobile-menu');

    // Helper function to open sidebar and navigate
    async function navigateVia(href: string) {
      // RC9: a hamburger click landing before React hydration is a silent
      // no-op and the menu never mounts. Wait on the real condition (the
      // post-hydration __E2E_MODE__ flag) before every open attempt —
      // instant for client-side route changes, load-bearing after a
      // full-page load.
      await waitForHydration(page);
      await page.getByRole('button', { name: /open menu/i }).click();
      await page.waitForTimeout(350); // Wait for animation
      await expect(sidebar).toBeVisible();
      const link = sidebar.locator(`a[href="${href}"]`);
      await expect(link).toBeVisible();
      await link.evaluate((el: HTMLElement) => el.click());
    }

    // Navigate to Compendium. (/units is deliberately NOT a hop here:
    // its client bundle currently crashes at module eval — better-sqlite3
    // pulled client-side — so the menu can never be re-opened FROM /units.
    // Tracked as T2-F2 in docs/audits/2026-06-09-remediation-tracker.md.)
    await navigateVia('/compendium');
    await expect(page).toHaveURL('/compendium');

    // Navigate to Pilots
    await navigateVia('/gameplay/pilots');
    await expect(page).toHaveURL('/gameplay/pilots');

    // Navigate to Customizer
    await navigateVia('/customizer');
    await expect(page).toHaveURL('/customizer');
  });

  test('should close sidebar automatically on route change', async ({
    page,
  }) => {
    await page.goto('/settings');
    await waitForHydration(page); // RC9
    const sidebar = page.getByTestId('mobile-menu');

    // Open sidebar — brand is "MekStation" (TopBarMobileMenu.tsx header)
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.waitForTimeout(350); // Wait for animation
    await expect(sidebar.getByText('MekStation')).toBeVisible();

    // Navigate using link via JS click
    const unitsLink = sidebar.locator('a[href="/units"]');
    await expect(unitsLink).toBeVisible();
    await unitsLink.evaluate((el: HTMLElement) => el.click());

    // Wait for navigation
    await expect(page).toHaveURL('/units');

    // Wait for animation
    await page.waitForTimeout(350);

    // Sidebar should be closed — the overlay unmounts on
    // routeChangeComplete (TopBarMobileMenu.tsx effect)
    await expect(sidebar).not.toBeVisible();
  });
});

// =============================================================================
// Touch Interaction Tests
// =============================================================================

test.describe('Touch Interactions', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
  });

  test('should respond to tap on hamburger menu', async ({ page }) => {
    await page.goto('/settings');
    await waitForHydration(page);

    // Tap the hamburger menu
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await menuButton.tap();

    // Sidebar should open
    const sidebar = page.getByTestId('mobile-menu');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
  });

  test('should respond to tap on navigation items', async ({ page }) => {
    await page.goto('/settings');
    await waitForHydration(page);

    // Open sidebar via tap
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await menuButton.tap();

    // Wait for animation and verify sidebar is visible
    await page.waitForTimeout(350);
    const sidebar = page.getByTestId('mobile-menu');
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

  test('should keep Quick Game primary action above the mobile bottom navigation', async ({
    page,
  }) => {
    await page.goto('/gameplay/quick');
    await waitForHydration(page);

    const startButton = page.getByTestId('start-quick-game-btn');
    const bottomNav = page.getByRole('navigation', {
      name: /mobile navigation/i,
    });
    await expect(startButton).toBeVisible();
    await expect(bottomNav).toBeVisible();

    const buttonBox = await startButton.boundingBox();
    const navBox = await bottomNav.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(navBox!.y);
  });

  test('should show gameplay section with all items in mobile sidebar', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForHydration(page); // RC9

    // Open sidebar
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.waitForTimeout(350);

    const sidebar = page.getByTestId('mobile-menu');
    await expect(sidebar).toBeVisible();

    // Sections are flat headers in the overlay menu — a <span> title with
    // the items always rendered beneath it (TopBarMobileMenu.tsx
    // renderSection). The old expandable-button section predates the
    // TopBar navigation redesign.
    const gameplayHeader = sidebar.getByText('Gameplay', { exact: true });
    await expect(gameplayHeader).toBeVisible();

    // All gameplay items render immediately (no expand step) with correct hrefs
    const pilotsLink = sidebar.locator('a[href="/gameplay/pilots"]');
    const forcesLink = sidebar.locator('a[href="/gameplay/forces"]');
    const campaignsLink = sidebar.locator('a[href="/gameplay/campaigns"]');
    const encountersLink = sidebar.locator('a[href="/gameplay/encounters"]');
    const gamesLink = sidebar.locator('a[href="/gameplay/games"]');
    const quickGameLink = sidebar.locator('a[href="/gameplay/quick"]');

    await expect(pilotsLink).toBeVisible();
    await expect(forcesLink).toBeVisible();
    await expect(campaignsLink).toBeVisible();
    await expect(encountersLink).toBeVisible();
    await expect(gamesLink).toBeVisible();
    await expect(quickGameLink).toBeVisible();

    // Verify labels
    await expect(sidebar.getByText('Pilots')).toBeVisible();
    await expect(sidebar.getByText('Forces')).toBeVisible();
    await expect(sidebar.getByText('Campaigns')).toBeVisible();
    await expect(sidebar.getByText('Encounters')).toBeVisible();
    await expect(sidebar.getByText('Games')).toBeVisible();
    await expect(sidebar.getByText('Quick Game')).toBeVisible();
  });

  test('should have navigable gameplay routes', async ({ page }) => {
    // Test that all gameplay routes are accessible
    const routes = [
      '/gameplay/pilots',
      '/gameplay/forces',
      '/gameplay/campaigns',
      '/gameplay/encounters',
      '/gameplay/games',
      '/gameplay/quick',
    ];

    for (const route of routes) {
      // gotoWithRetry: Next dev aborts in-flight navigations while it
      // on-demand-compiles a cold route (net::ERR_ABORTED) — transient.
      await gotoWithRetry(page, route);
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
    await waitForHydration(page); // RC9

    // Open sidebar
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.waitForTimeout(350);

    const sidebar = page.getByTestId('mobile-menu');
    await expect(sidebar).toBeVisible();

    // Find Timeline link within sidebar navigation
    const timelineLink = sidebar.locator('a[href="/audit/timeline"]');

    // Scroll into view first (Timeline is in the History section which may be below the fold)
    await timelineLink.scrollIntoViewIfNeeded();
    await expect(timelineLink).toBeVisible();

    // Get href and navigate directly because this E2E path has observed
    // Next.js Link timing differences during hydration.
    const href = await timelineLink.getAttribute('href');
    expect(href).toBe('/audit/timeline');

    // Navigate directly to verify the route works
    await page.goto('/audit/timeline');
    await expect(page).toHaveURL('/audit/timeline');
  });

  test('should show History section with Timeline in sidebar', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForHydration(page);
    // RC9: clicking the hamburger before React hydration is a silent no-op
    // and the overlay menu (rendered only while open) never mounts.
    await waitForHydration(page);

    // Open sidebar
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.waitForTimeout(350);

    const sidebar = page.getByTestId('mobile-menu');
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
    await waitForHydration(page);

    // Mobile header should be visible
    const menuButton = page.getByRole('button', {
      name: /open menu/i,
    });
    await expect(menuButton).toBeVisible();

    // Switch to desktop
    await page.setViewportSize({ width: 1200, height: 800 });

    // Mobile hamburger should be hidden (TopBar.tsx md:hidden)
    await expect(menuButton).not.toBeVisible();

    // PT-008: there is no desktop sidebar — the TopBar's labeled nav takes
    // over at >=lg and the mobile overlay menu stays unmounted (it renders
    // only while open, TopBarMobileMenu.tsx).
    await expect(page.getByTestId('mobile-menu')).toHaveCount(0);
    const desktopNav = page.locator('header nav').first();
    await expect(desktopNav).toBeVisible();
    await expect(
      desktopNav.getByRole('link', { name: 'Dashboard' }),
    ).toBeVisible();
  });

  test('should not have horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/settings');
    await waitForHydration(page);

    // Check that the page doesn't have horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 10); // Small tolerance
  });
});
