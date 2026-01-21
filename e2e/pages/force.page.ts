import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the force list page (/gameplay/forces).
 * Provides methods to interact with the force listing.
 */
export class ForceListPage extends BasePage {
  readonly url = '/gameplay/forces';

  /**
   * Navigate to the force list page.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  /**
   * Get the count of force cards displayed.
   */
  async getCardCount(): Promise<number> {
    const cards = this.getByTestId('force-card');
    return cards.count();
  }

  /**
   * Click the create force button.
   */
  async clickCreateButton(): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId('create-force-btn'));
  }

  /**
   * Click a specific force card by ID.
   * @param id - The force ID
   */
  async clickForceCard(id: string): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId(`force-card-${id}`));
  }

  /**
   * Search forces by query string.
   * @param query - The search query
   */
  async searchForces(query: string): Promise<void> {
    await this.fillByTestId('force-search', query);
    await this.page.waitForTimeout(300);
  }

  /**
   * Get all force names displayed.
   */
  async getForceNames(): Promise<string[]> {
    const names = this.getByTestId('force-name');
    return names.allTextContents();
  }

  /**
   * Filter forces by faction.
   * @param faction - The faction to filter by
   */
  async filterByFaction(faction: string): Promise<void> {
    await this.clickByTestId('faction-filter');
    await this.clickByTestId(`faction-option-${faction}`);
  }

  /**
   * Check if empty state is displayed.
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.isVisibleByTestId('forces-empty-state');
  }
}

/**
 * Page object for the force detail page (/gameplay/forces/[id]).
 * Provides methods to interact with force details.
 */
export class ForceDetailPage extends BasePage {
  /**
   * Navigate to a specific force's detail page.
   * @param id - The force ID
   */
  async navigate(id: string): Promise<void> {
    await this.page.goto(`/gameplay/forces/${id}`);
    await this.waitForReady();
  }

  /**
   * Get the force name.
   */
  async getName(): Promise<string> {
    return this.getTextByTestId('force-name');
  }

  /**
   * Get the force faction.
   */
  async getFaction(): Promise<string> {
    return this.getTextByTestId('force-faction');
  }

  /**
   * Get the total battle value (BV).
   */
  async getTotalBV(): Promise<string> {
    return this.getTextByTestId('force-total-bv');
  }

  /**
   * Get the unit count.
   */
  async getUnitCount(): Promise<number> {
    const countText = await this.getTextByTestId('force-unit-count');
    return parseInt(countText, 10);
  }

  /**
   * Click the units tab.
   */
  async clickUnitsTab(): Promise<void> {
    await this.clickByTestId('tab-units');
  }

  /**
   * Click the roster tab.
   */
  async clickRosterTab(): Promise<void> {
    await this.clickByTestId('tab-roster');
  }

  /**
   * Click the statistics tab.
   */
  async clickStatisticsTab(): Promise<void> {
    await this.clickByTestId('tab-statistics');
  }

  /**
   * Click a specific unit in the force.
   * @param unitId - The unit ID
   */
  async clickUnit(unitId: string): Promise<void> {
    await this.clickByTestId(`unit-${unitId}`);
  }

  /**
   * Add a unit to the force.
   */
  async clickAddUnit(): Promise<void> {
    await this.clickByTestId('add-unit-btn');
  }

  /**
   * Remove a unit from the force.
   * @param unitId - The unit ID to remove
   */
  async removeUnit(unitId: string): Promise<void> {
    await this.clickByTestId(`remove-unit-${unitId}`);
    await this.clickByTestId('confirm-remove-btn');
  }

  /**
   * Click the delete force button.
   */
  async clickDelete(): Promise<void> {
    await this.clickByTestId('delete-force-btn');
  }

  /**
   * Confirm the delete action.
   */
  async confirmDelete(): Promise<void> {
    await this.clickByTestId('confirm-delete-btn');
    await this.page.waitForURL(/\/gameplay\/forces$/);
  }

  /**
   * Cancel the delete action.
   */
  async cancelDelete(): Promise<void> {
    await this.clickByTestId('cancel-delete-btn');
  }

  /**
   * Click the edit force button.
   */
  async clickEdit(): Promise<void> {
    await this.clickByTestId('edit-force-btn');
  }

  /**
   * Export the force.
   * @param format - The export format (e.g., 'json', 'pdf')
   */
  async exportForce(format: string): Promise<void> {
    await this.clickByTestId('export-force-btn');
    await this.clickByTestId(`export-format-${format}`);
  }
}

/**
 * Page object for the force create page (/gameplay/forces/create).
 * Provides methods to create a new force.
 */
export class ForceCreatePage extends BasePage {
  readonly url = '/gameplay/forces/create';

  /**
   * Navigate to the force create page.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  /**
   * Fill the force name field.
   * @param name - The force name
   */
  async fillName(name: string): Promise<void> {
    await this.fillByTestId('force-name-input', name);
  }

  /**
   * Select a faction for the force.
   * @param faction - The faction identifier
   */
  async selectFaction(faction: string): Promise<void> {
    await this.clickByTestId('faction-select');
    await this.clickByTestId(`faction-option-${faction}`);
  }

  /**
   * Set the BV limit for the force.
   * @param limit - The BV limit value
   */
  async setBVLimit(limit: number): Promise<void> {
    await this.fillByTestId('bv-limit-input', limit.toString());
  }

  /**
   * Select an era for the force.
   * @param era - The era identifier
   */
  async selectEra(era: string): Promise<void> {
    await this.clickByTestId('era-select');
    await this.clickByTestId(`era-option-${era}`);
  }

  /**
   * Submit the create force form.
   */
  async submit(): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId('submit-force-btn'));
  }

  /**
   * Cancel force creation.
   */
  async cancel(): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId('cancel-btn'));
  }

  /**
   * Check if form validation error is displayed.
   * @param field - The field name to check for errors
   */
  async hasFieldError(field: string): Promise<boolean> {
    return this.isVisibleByTestId(`${field}-error`);
  }

  /**
   * Create a force with the given details (convenience method).
   * @param name - The force name
   * @param faction - The faction
   * @param bvLimit - Optional BV limit
   */
  async createForce(name: string, faction: string, bvLimit?: number): Promise<void> {
    await this.fillName(name);
    await this.selectFaction(faction);
    if (bvLimit) {
      await this.setBVLimit(bvLimit);
    }
    await this.submit();
  }
}
