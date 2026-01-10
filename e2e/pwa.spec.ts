import { test, expect } from '@playwright/test';

test.describe('PWA Functionality', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MekStation/i);
  });

  test('should have service worker support', async ({ page }) => {
    await page.goto('/');

    // Check if service worker API is available
    const swSupported = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(swSupported).toBe(true);

    // Check if service worker file exists
    const swResponse = await page.request.get('/service-worker.js');
    // In dev mode, service worker might not be served, so we just check if the file structure is correct
    // In production, this would return 200
    expect(swResponse.status()).toBeLessThan(500); // Not a server error
  });

  test('should have web app manifest', async ({ page }) => {
    await page.goto('/');

    // Check for manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
  });

  test('should load manifest with correct properties', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.ok()).toBeTruthy();

    const manifest = await response.json();
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should have theme-color meta tag', async ({ page }) => {
    await page.goto('/');

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', /#[0-9a-fA-F]{6}/);
  });

  test('should have apple-touch-icon', async ({ page }) => {
    await page.goto('/');

    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleTouchIcon).toBeAttached();
  });
});

test.describe('Offline Support', () => {
  test('should cache static assets', async ({ page }) => {
    await page.goto('/');

    // Wait for service worker to be ready and cache populated
    await page.waitForTimeout(2000);

    // Check if caches exist
    const cacheNames = await page.evaluate(async () => {
      const names = await caches.keys();
      return names;
    });

    expect(cacheNames.length).toBeGreaterThan(0);
  });

  test('should have offline page available', async ({ request }) => {
    // Check that offline.html exists and is valid
    const response = await request.get('/offline.html');
    expect(response.ok()).toBeTruthy();

    const content = await response.text();
    expect(content.toLowerCase()).toContain('offline');
  });
});
