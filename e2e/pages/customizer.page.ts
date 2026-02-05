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

  /**
   * Navigate to the customizer page.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  /**
   * Navigate to a specific unit in the customizer.
   * @param unitId - The unit ID to load
   * @param tab - Optional tab to navigate to
   */
  async navigateToUnit(unitId: string, tab?: string): Promise<void> {
    const path = tab ? `/customizer/${unitId}/${tab}` : `/customizer/${unitId}`;
    await this.page.goto(path);
    await this.waitForReady();
  }

  /**
   * Check if customizer is in loading state.
   */
  async isLoading(): Promise<boolean> {
    return this.isVisibleByTestId('customizer-loading');
  }

  /**
   * Check if customizer has an error.
   */
  async hasError(): Promise<boolean> {
    return this.isVisibleByTestId('customizer-error');
  }
}

/**
 * Aerospace Customizer page object.
 * Provides methods for interacting with aerospace fighter customization.
 */
export class AerospaceCustomizerPage extends CustomizerPage {
  /**
   * Wait for the aerospace customizer to be loaded.
   */
  async waitForAerospaceLoaded(): Promise<void> {
    await this.page.waitForSelector('[data-testid="aerospace-customizer"]', {
      timeout: 15000,
    });
  }

  /**
   * Check if aerospace customizer is visible.
   */
  async isAerospaceCustomizerVisible(): Promise<boolean> {
    return this.isVisibleByTestId('aerospace-customizer');
  }

  // ==========================================================================
  // Tab Navigation
  // ==========================================================================

  /**
   * Click a tab in the aerospace customizer.
   * @param tabId - Tab ID: 'structure', 'armor', 'equipment'
   */
  async clickTab(tabId: 'structure' | 'armor' | 'equipment'): Promise<void> {
    await this.clickByTestId(`aerospace-tab-${tabId}`);
  }

  /**
   * Check if a specific tab is active.
   * @param tabId - Tab ID to check
   */
  async isTabActive(tabId: string): Promise<boolean> {
    const tab = this.getByTestId(`aerospace-tab-${tabId}`);
    const isActive = await tab.getAttribute('data-active');
    return isActive === 'true';
  }

  /**
   * Get the currently active tab.
   */
  async getActiveTab(): Promise<string | null> {
    for (const tabId of ['structure', 'armor', 'equipment']) {
      if (await this.isTabActive(tabId)) {
        return tabId;
      }
    }
    return null;
  }

  // ==========================================================================
  // Structure Tab
  // ==========================================================================

  /**
   * Check if structure tab is visible.
   */
  async isStructureTabVisible(): Promise<boolean> {
    return this.isVisibleByTestId('aerospace-structure-tab');
  }

  /**
   * Get current tonnage value.
   */
  async getTonnage(): Promise<number> {
    const select = this.getByTestId('aerospace-tonnage-select');
    const value = await select.inputValue();
    return Number(value);
  }

  /**
   * Set tonnage value.
   * @param tonnage - Tonnage value (5-100)
   */
  async setTonnage(tonnage: number): Promise<void> {
    await this.getByTestId('aerospace-tonnage-select').selectOption(
      String(tonnage),
    );
  }

  /**
   * Get current safe thrust value.
   */
  async getSafeThrust(): Promise<number> {
    const input = this.getByTestId('aerospace-safe-thrust-input');
    const value = await input.inputValue();
    return Number(value);
  }

  /**
   * Increase safe thrust by clicking the + button.
   */
  async increaseThrust(): Promise<void> {
    await this.clickByTestId('aerospace-thrust-increase');
  }

  /**
   * Decrease safe thrust by clicking the - button.
   */
  async decreaseThrust(): Promise<void> {
    await this.clickByTestId('aerospace-thrust-decrease');
  }

  /**
   * Get current fuel value.
   */
  async getFuel(): Promise<number> {
    const input = this.getByTestId('aerospace-fuel-input');
    const value = await input.inputValue();
    return Number(value);
  }

  /**
   * Set fuel value.
   * @param fuel - Fuel points
   */
  async setFuel(fuel: number): Promise<void> {
    await this.getByTestId('aerospace-fuel-input').fill(String(fuel));
  }

  /**
   * Get current engine type.
   */
  async getEngineType(): Promise<string> {
    const select = this.getByTestId('aerospace-engine-type-select');
    return select.inputValue();
  }

  /**
   * Set engine type.
   * @param engineType - Engine type value
   */
  async setEngineType(engineType: string): Promise<void> {
    await this.getByTestId('aerospace-engine-type-select').selectOption(
      engineType,
    );
  }

  /**
   * Get structural integrity value.
   */
  async getStructuralIntegrity(): Promise<number> {
    const input = this.getByTestId('aerospace-si-input');
    const value = await input.inputValue();
    return Number(value);
  }

  /**
   * Increase structural integrity.
   */
  async increaseSI(): Promise<void> {
    await this.clickByTestId('aerospace-si-increase');
  }

  /**
   * Decrease structural integrity.
   */
  async decreaseSI(): Promise<void> {
    await this.clickByTestId('aerospace-si-decrease');
  }

  /**
   * Get heat sinks value.
   */
  async getHeatSinks(): Promise<number> {
    const input = this.getByTestId('aerospace-heatsinks-input');
    const value = await input.inputValue();
    return Number(value);
  }

  /**
   * Toggle OmniFighter checkbox.
   */
  async toggleOmni(): Promise<void> {
    await this.clickByTestId('aerospace-omni-checkbox');
  }

  /**
   * Check if OmniFighter is enabled.
   */
  async isOmniEnabled(): Promise<boolean> {
    const checkbox = this.getByTestId('aerospace-omni-checkbox');
    return checkbox.isChecked();
  }

  /**
   * Toggle double heat sinks checkbox.
   */
  async toggleDoubleHeatSinks(): Promise<void> {
    await this.clickByTestId('aerospace-double-heatsinks-checkbox');
  }

  // ==========================================================================
  // Armor Tab
  // ==========================================================================

  /**
   * Check if armor tab is visible.
   */
  async isArmorTabVisible(): Promise<boolean> {
    return this.isVisibleByTestId('aerospace-armor-tab');
  }

  /**
   * Get current armor type.
   */
  async getArmorType(): Promise<string> {
    const select = this.getByTestId('aerospace-armor-type-select');
    return select.inputValue();
  }

  /**
   * Set armor type.
   * @param armorType - Armor type value
   */
  async setArmorType(armorType: string): Promise<void> {
    await this.getByTestId('aerospace-armor-type-select').selectOption(
      armorType,
    );
  }

  /**
   * Get armor tonnage.
   */
  async getArmorTonnage(): Promise<number> {
    const input = this.getByTestId('aerospace-armor-tonnage-input');
    const value = await input.inputValue();
    return Number(value);
  }

  /**
   * Set armor tonnage.
   * @param tonnage - Armor tonnage
   */
  async setArmorTonnage(tonnage: number): Promise<void> {
    await this.getByTestId('aerospace-armor-tonnage-input').fill(
      String(tonnage),
    );
  }

  /**
   * Get available armor points.
   */
  async getAvailableArmorPoints(): Promise<number> {
    const text = await this.getTextByTestId('aerospace-armor-available');
    return Number(text);
  }

  /**
   * Get allocated armor points.
   */
  async getAllocatedArmorPoints(): Promise<number> {
    const text = await this.getTextByTestId('aerospace-armor-allocated');
    return Number(text);
  }

  /**
   * Get unallocated armor points.
   */
  async getUnallocatedArmorPoints(): Promise<number> {
    const text = await this.getTextByTestId('aerospace-armor-unallocated');
    return Number(text);
  }

  /**
   * Click auto-allocate armor button.
   */
  async autoAllocateArmor(): Promise<void> {
    await this.clickByTestId('aerospace-armor-auto-allocate');
  }

  /**
   * Click maximize armor button.
   */
  async maximizeArmor(): Promise<void> {
    await this.clickByTestId('aerospace-armor-maximize');
  }

  /**
   * Click clear armor button.
   */
  async clearArmor(): Promise<void> {
    await this.clickByTestId('aerospace-armor-clear');
  }

  /**
   * Get armor value for a specific arc.
   * @param arc - Arc name: 'NOSE', 'LEFT_WING', 'RIGHT_WING', 'AFT'
   */
  async getArcArmor(arc: string): Promise<number> {
    const input = this.getByTestId(`aerospace-arc-input-${arc}`);
    const value = await input.inputValue();
    return Number(value);
  }

  /**
   * Set armor value for a specific arc.
   * @param arc - Arc name
   * @param value - Armor points
   */
  async setArcArmor(arc: string, value: number): Promise<void> {
    await this.getByTestId(`aerospace-arc-input-${arc}`).fill(String(value));
  }

  // ==========================================================================
  // Equipment Tab
  // ==========================================================================

  /**
   * Check if equipment tab is visible.
   */
  async isEquipmentTabVisible(): Promise<boolean> {
    return this.isVisibleByTestId('aerospace-equipment-tab');
  }

  /**
   * Get number of mounted equipment items.
   */
  async getMountedEquipmentCount(): Promise<number> {
    const text = await this.getTextByTestId('aerospace-equipment-count');
    return Number(text);
  }

  /**
   * Check if equipment list is empty.
   */
  async isEquipmentEmpty(): Promise<boolean> {
    return this.isVisibleByTestId('aerospace-equipment-empty');
  }

  /**
   * Clear all equipment.
   */
  async clearAllEquipment(): Promise<void> {
    await this.clickByTestId('aerospace-equipment-clear-all');
  }

  /**
   * Remove a specific equipment item.
   * @param equipmentId - Equipment instance ID
   */
  async removeEquipment(equipmentId: string): Promise<void> {
    await this.clickByTestId(`aerospace-equipment-remove-${equipmentId}`);
  }

  /**
   * Get equipment arc assignment.
   * @param equipmentId - Equipment instance ID
   */
  async getEquipmentArc(equipmentId: string): Promise<string> {
    const select = this.getByTestId(`aerospace-equipment-arc-${equipmentId}`);
    return select.inputValue();
  }

  /**
   * Set equipment arc assignment.
   * @param equipmentId - Equipment instance ID
   * @param arc - Arc value
   */
  async setEquipmentArc(equipmentId: string, arc: string): Promise<void> {
    await this.getByTestId(
      `aerospace-equipment-arc-${equipmentId}`,
    ).selectOption(arc);
  }
}
