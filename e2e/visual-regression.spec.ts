import { test, expect } from '@playwright/test';

/**
 * Visual regression tests
 * These tests capture screenshots for manual review and comparison
 */

test.describe('Visual Regression - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('homepage desktop view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('homepage dark mode desktop', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-desktop-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
  });

  test('homepage mobile view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('homepage dark mode mobile', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-mobile-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('homepage tablet view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Component Screenshots', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

  test('capture touch targets for review', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add visual indicators for touch targets
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        button, a, [role="button"], input, select, textarea {
          outline: 2px solid rgba(255, 0, 0, 0.5) !important;
        }
      `;
      document.head.appendChild(style);
    });

    await expect(page).toHaveScreenshot('touch-targets-highlighted.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
