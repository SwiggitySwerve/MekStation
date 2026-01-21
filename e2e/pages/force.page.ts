import type { Page as _Page } from '@playwright/test';
import { expect as _expect } from '@playwright/test';
import { BasePage } from './base.page';

// Re-export to silence unused warnings (types kept for documentation)
void _expect;

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
    // Cards use testid pattern: force-card-{id}
    const cards = this.page.locator('[data-testid^="force-card-"]');
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
   * Fill the affiliation field.
   * @param affiliation - The affiliation/faction name
   */
  async fillAffiliation(affiliation: string): Promise<void> {
    await this.fillByTestId('force-affiliation-input', affiliation);
  }

  /**
   * Fill the description field.
   * @param description - The force description
   */
  async fillDescription(description: string): Promise<void> {
    await this.page.locator('[data-testid="force-description-input"]').fill(description);
  }

  /**
   * Select a force type.
   * @param forceType - The force type (lance, star, level_ii, company, binary, custom)
   */
  async selectForceType(forceType: string): Promise<void> {
    await this.clickByTestId(`force-type-${forceType}`);
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
   * Check if submit button is enabled.
   */
  async isSubmitEnabled(): Promise<boolean> {
    const btn = this.getByTestId('submit-force-btn');
    return !(await btn.isDisabled());
  }

  /**
   * Create a force with the given details (convenience method).
   * @param name - The force name
   * @param forceType - The force type (defaults to 'lance')
   * @param affiliation - Optional affiliation
   */
  async createForce(name: string, forceType: string = 'lance', affiliation?: string): Promise<void> {
    await this.fillName(name);
    await this.selectForceType(forceType);
    if (affiliation) {
      await this.fillAffiliation(affiliation);
    }
    await this.submit();
  }
}
