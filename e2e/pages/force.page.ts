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
}

/**
 * Read-only helpers for the force list page.
 */
export class ForceListReadPage extends BasePage {
  /**
   * Get the count of force cards displayed.
   */
  async getCardCount(): Promise<number> {
    // Cards use testid pattern: force-card-{id}
    const cards = this.page.locator('[data-testid^="force-card-"]');
    return cards.count();
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
   * Select a force type.
   * @param forceType - The force type (lance, star, level_ii, company, binary, custom)
   */
  async selectForceType(forceType: string): Promise<void> {
    await this.clickByTestId(`force-type-${forceType}`);
  }
}

/**
 * Submission helpers for the force create page.
 */
export class ForceCreateSubmissionPage extends BasePage {
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
}

/**
 * Read-only helpers for the force create page.
 */
export class ForceCreateReadPage extends BasePage {
  /**
   * Check if submit button is enabled.
   */
  async isSubmitEnabled(): Promise<boolean> {
    const btn = this.getByTestId('submit-force-btn');
    return !(await btn.isDisabled());
  }
}
