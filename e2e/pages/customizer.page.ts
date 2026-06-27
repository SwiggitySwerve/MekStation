/**
 * Customizer Page Objects
 *
 * Page objects for the unit customizer, including aerospace, vehicle,
 * and BattleMech customization pages.
 *
 * @spec openspec/changes/add-comprehensive-e2e-tests/specs/e2e-testing/spec.md
 */

import { BasePage } from './base.page';

/**
 * Base customizer page object with common functionality.
 */
export class CustomizerPage extends BasePage {
  readonly url = '/customizer';

  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  async navigateToUnit(unitId: string, tab?: string): Promise<void> {
    const path = tab ? `/customizer/${unitId}/${tab}` : `/customizer/${unitId}`;
    await this.page.goto(path);
    await this.waitForReady();
  }
}

/**
 * Aerospace customizer page object for interactions that are exercised by
 * customizer.spec.ts. Keep broader component assertions in fixtures or specs
 * until a browser test needs a stable page-object method.
 */
export class AerospaceCustomizerPage extends CustomizerPage {
  async isAerospaceCustomizerVisible(): Promise<boolean> {
    return this.isVisibleByTestId('aerospace-customizer');
  }
}
