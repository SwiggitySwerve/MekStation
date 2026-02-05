/**
 * Wait/Assertion Utilities for E2E Tests
 *
 * Provides reusable wait and assertion helpers for Playwright tests.
 * Follows patterns from existing p2p-sync.spec.ts.
 */

import { expect, type Page } from '@playwright/test';

/** Default timeout for wait operations (in milliseconds) */
const DEFAULT_TIMEOUT = 10000;

/**
 * Wait for the page to be fully ready (hydrated and stable).
 *
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 *
 * @example
 * ```typescript
 * await waitForPageReady(page);
 * await waitForPageReady(page, 15000); // with custom timeout
 * ```
 */
export async function waitForPageReady(
  page: Page,
  timeout = DEFAULT_TIMEOUT,
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
  // Wait for React hydration
  await page.waitForTimeout(500);
}

/**
 * Wait for a list to contain at least the specified number of items.
 *
 * @param page - Playwright Page object
 * @param testId - The data-testid of the list container or items
 * @param minCount - Minimum number of items to wait for (default: 1)
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 *
 * @example
 * ```typescript
 * // Wait for at least one item
 * await waitForListItems(page, 'unit-list-item');
 *
 * // Wait for at least 5 items
 * await waitForListItems(page, 'pilot-cards', 5);
 *
 * // Wait with custom timeout
 * await waitForListItems(page, 'campaign-list', 3, 15000);
 * ```
 */
export async function waitForListItems(
  page: Page,
  testId: string,
  minCount = 1,
  timeout = DEFAULT_TIMEOUT,
): Promise<void> {
  const items = page.getByTestId(testId);
  await expect(async () => {
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(minCount);
  }).toPass({ timeout });
}

/**
 * Wait for a toast notification to appear.
 *
 * @param page - Playwright Page object
 * @param type - Optional toast type to match ('success' | 'error')
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 *
 * @example
 * ```typescript
 * // Wait for any toast
 * await waitForToast(page);
 *
 * // Wait for success toast
 * await waitForToast(page, 'success');
 *
 * // Wait for error toast
 * await waitForToast(page, 'error');
 * ```
 */
export async function waitForToast(
  page: Page,
  type?: 'success' | 'error',
  timeout = DEFAULT_TIMEOUT,
): Promise<void> {
  // Common toast selectors - adjust based on your toast library
  const toastSelector = type
    ? `[data-testid="toast-${type}"], [role="alert"][data-type="${type}"], .toast-${type}`
    : '[data-testid^="toast"], [role="alert"], .toast';

  await expect(page.locator(toastSelector).first()).toBeVisible({ timeout });
}

/**
 * Wait for a modal to close completely.
 *
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 *
 * @example
 * ```typescript
 * // After clicking a close button
 * await closeButton.click();
 * await waitForModalClosed(page);
 * ```
 */
export async function waitForModalClosed(
  page: Page,
  timeout = DEFAULT_TIMEOUT,
): Promise<void> {
  // Common modal selectors - adjust based on your modal implementation
  const modalSelectors = [
    '[data-testid="modal"]',
    '[role="dialog"]',
    '.modal',
    '[data-state="open"]',
  ];

  await expect(async () => {
    for (const selector of modalSelectors) {
      const modal = page.locator(selector);
      const count = await modal.count();
      if (count > 0) {
        const isVisible = await modal.first().isVisible();
        expect(isVisible).toBe(false);
      }
    }
  }).toPass({ timeout });
}

/**
 * Wait for a loading indicator to disappear.
 *
 * @param page - Playwright Page object
 * @param testId - Optional specific loading indicator testId
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 *
 * @example
 * ```typescript
 * // Wait for any loading indicator
 * await waitForLoading(page);
 *
 * // Wait for specific loading indicator
 * await waitForLoading(page, 'unit-list-loading');
 * ```
 */
export async function waitForLoading(
  page: Page,
  testId?: string,
  timeout = DEFAULT_TIMEOUT,
): Promise<void> {
  if (testId) {
    await expect(page.getByTestId(testId)).not.toBeVisible({ timeout });
  } else {
    // Common loading selectors
    const loadingSelectors = [
      '[data-testid="loading"]',
      '[data-testid="spinner"]',
      '[aria-busy="true"]',
      '.loading',
      '.spinner',
    ];

    await expect(async () => {
      for (const selector of loadingSelectors) {
        const loading = page.locator(selector);
        const count = await loading.count();
        if (count > 0) {
          const isVisible = await loading.first().isVisible();
          expect(isVisible).toBe(false);
        }
      }
    }).toPass({ timeout });
  }
}

/**
 * Wait for a specific connection state (useful for P2P tests).
 *
 * @param page - Playwright Page object
 * @param expectedState - The expected connection state text
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 *
 * @example
 * ```typescript
 * await waitForConnectionState(page, 'connected');
 * await waitForConnectionState(page, 'disconnected');
 * ```
 */
export async function waitForConnectionState(
  page: Page,
  expectedState: string,
  timeout = DEFAULT_TIMEOUT,
): Promise<void> {
  await expect(page.getByTestId('connection-state')).toHaveText(expectedState, {
    timeout,
  });
}

/**
 * Wait for an element to have specific text content.
 *
 * @param page - Playwright Page object
 * @param testId - The data-testid of the element
 * @param expectedText - The expected text content (can be partial)
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 *
 * @example
 * ```typescript
 * await waitForText(page, 'item-count', 'Total items: 5');
 * await waitForText(page, 'status', 'Ready');
 * ```
 */
export async function waitForText(
  page: Page,
  testId: string,
  expectedText: string,
  timeout = DEFAULT_TIMEOUT,
): Promise<void> {
  await expect(page.getByTestId(testId)).toContainText(expectedText, {
    timeout,
  });
}
