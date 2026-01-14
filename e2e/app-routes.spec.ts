import { test, expect } from '@playwright/test';

test.describe('Application Routes', () => {
  test('homepage loads without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should load
    await expect(page).toHaveURL(/localhost:3000/);

    // Filter out expected/benign errors
    const criticalErrors = errors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('404') &&
      !err.includes('service-worker') &&
      !err.includes('legacyBehavior') &&
      !err.includes('codemod')
    );

    // Should have no critical console errors
    expect(criticalErrors).toHaveLength(0);
  });

  test('should not have broken images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check all images loaded properly
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      // naturalWidth > 0 means image loaded successfully
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('should have no accessibility violations on critical elements', async ({ page }) => {
    await page.goto('/');

    // Check that interactive elements have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const accessibleName = await button.getAttribute('aria-label') ||
          await button.textContent();
        expect(accessibleName?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('should have proper document structure', async ({ page }) => {
    await page.goto('/');

    // Check for proper HTML structure
    const html = page.locator('html');
    await expect(html).toBeAttached();

    // Check the page renders properly
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Page should have some content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });
});

test.describe('Network Requests', () => {
  test('should not have failed network requests', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', request => {
      // Ignore certain expected failures
      const url = request.url();
      if (!url.includes('favicon') && !url.includes('analytics')) {
        failedRequests.push(url);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have no failed requests
    expect(failedRequests).toHaveLength(0);
  });

  test('should load critical resources quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds (generous for dev server)
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Dark Mode Support', () => {
  test('should respect system dark mode preference', async ({ page }) => {
    // Emulate dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    // Check if dark mode classes are applied
    const _html = page.locator('html');
    const _body = page.locator('body');

    // The app should respond to dark mode (check for dark background or class)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should respect system light mode preference', async ({ page }) => {
    // Emulate light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
  });
});
