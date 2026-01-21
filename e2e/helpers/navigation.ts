/**
 * Navigation Helper Functions for E2E Tests
 *
 * Provides reusable navigation utilities for Playwright tests.
 * Handles route navigation with proper wait states.
 */

import { type Page } from '@playwright/test';

/**
 * Navigate to a specific path and wait for the page to be ready.
 *
 * @param page - Playwright Page object
 * @param path - The path to navigate to (e.g., '/units', '/compendium')
 *
 * @example
 * ```typescript
 * await navigateTo(page, '/units');
 * await navigateTo(page, '/customizer');
 * ```
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to the Campaigns page.
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * await navigateToCampaigns(page);
 * ```
 */
export async function navigateToCampaigns(page: Page): Promise<void> {
  await navigateTo(page, '/campaigns');
}

/**
 * Navigate to the Encounters page.
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * await navigateToEncounters(page);
 * ```
 */
export async function navigateToEncounters(page: Page): Promise<void> {
  await navigateTo(page, '/encounters');
}

/**
 * Navigate to the Forces page.
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * await navigateToForces(page);
 * ```
 */
export async function navigateToForces(page: Page): Promise<void> {
  await navigateTo(page, '/forces');
}

/**
 * Navigate to the Pilots page.
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * await navigateToPilots(page);
 * ```
 */
export async function navigateToPilots(page: Page): Promise<void> {
  await navigateTo(page, '/pilots');
}

/**
 * Navigate to the Games page.
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * await navigateToGames(page);
 * ```
 */
export async function navigateToGames(page: Page): Promise<void> {
  await navigateTo(page, '/games');
}

/**
 * Navigate to the Compendium page.
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * await navigateToCompendium(page);
 * ```
 */
export async function navigateToCompendium(page: Page): Promise<void> {
  await navigateTo(page, '/compendium');
}

/**
 * Navigate to the Customizer page.
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * await navigateToCustomizer(page);
 * ```
 */
export async function navigateToCustomizer(page: Page): Promise<void> {
  await navigateTo(page, '/customizer');
}
