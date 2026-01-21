import { Page, Locator } from '@playwright/test';

/**
 * Base page object class providing common functionality for all page objects.
 * All page objects should extend this class.
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Wait for page to be ready after navigation.
   * Includes network idle and React hydration buffer.
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(300); // React hydration
  }

  /**
   * Get element by data-testid attribute.
   * @param testId - The test ID to locate
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Click an element and wait for navigation to complete.
   * @param locator - The element to click
   */
  async clickAndWaitForNavigation(locator: Locator): Promise<void> {
    const currentUrl = this.page.url();
    await locator.click();
    // Wait for URL to change from the current URL
    await this.page.waitForFunction(
      (url) => window.location.href !== url,
      currentUrl,
      { timeout: 10000 }
    );
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill an input field by test ID.
   * @param testId - The test ID of the input
   * @param value - The value to fill
   */
  async fillByTestId(testId: string, value: string): Promise<void> {
    await this.getByTestId(testId).fill(value);
  }

  /**
   * Click an element by test ID.
   * @param testId - The test ID of the element
   */
  async clickByTestId(testId: string): Promise<void> {
    await this.getByTestId(testId).click();
  }

  /**
   * Get text content of an element by test ID.
   * @param testId - The test ID of the element
   */
  async getTextByTestId(testId: string): Promise<string> {
    return (await this.getByTestId(testId).textContent()) ?? '';
  }

  /**
   * Check if an element is visible by test ID.
   * @param testId - The test ID of the element
   */
  async isVisibleByTestId(testId: string): Promise<boolean> {
    return this.getByTestId(testId).isVisible();
  }

  /**
   * Wait for an element to be visible by test ID.
   * @param testId - The test ID of the element
   * @param timeout - Optional timeout in milliseconds
   */
  async waitForTestId(testId: string, timeout?: number): Promise<void> {
    await this.getByTestId(testId).waitFor({ state: 'visible', timeout });
  }
}
