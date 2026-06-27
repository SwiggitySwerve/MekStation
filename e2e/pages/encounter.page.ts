import { BasePage } from './base.page';

/**
 * Page object for the encounter list page (/gameplay/encounters).
 * Provides methods to interact with the encounter listing.
 */
export class EncounterListPage extends BasePage {
  readonly url = '/gameplay/encounters';

  /**
   * Navigate to the encounter list page.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  /**
   * Click the create encounter button.
   */
  async clickCreateButton(): Promise<void> {
    await this.clickAndWaitForNavigation(
      this.getByTestId('create-encounter-btn'),
    );
  }

  /**
   * Click a specific encounter card by ID.
   * @param id - The encounter ID
   */
  async clickEncounterCard(id: string): Promise<void> {
    await this.clickAndWaitForNavigation(
      this.getByTestId(`encounter-card-${id}`),
    );
  }

  /**
   * Search encounters by query string.
   * @param query - The search query
   */
  async searchEncounters(query: string): Promise<void> {
    await this.fillByTestId('encounter-search', query);
    await this.page.waitForTimeout(300);
  }
}

/**
 * Read-only assertions for the encounter list page.
 */
export class EncounterListReadPage extends BasePage {
  /**
   * Get the count of encounter cards displayed.
   */
  async getCardCount(): Promise<number> {
    return this.page.locator('[data-testid^="encounter-card-"]').count();
  }

  /**
   * Get all encounter names displayed.
   */
  async getEncounterNames(): Promise<string[]> {
    return this.getByTestId('encounter-name').allTextContents();
  }

  /**
   * Check if empty state is displayed.
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.isVisibleByTestId('encounters-empty-state');
  }
}

/**
 * Page object for the encounter detail page (/gameplay/encounters/[id]).
 * Provides methods for currently tested encounter detail actions.
 */
export class EncounterDetailPage extends BasePage {
  /**
   * Click the delete encounter button.
   */
  async clickDelete(): Promise<void> {
    await this.clickByTestId('delete-encounter-btn');
  }

  /**
   * Confirm the delete action.
   */
  async confirmDelete(): Promise<void> {
    await this.clickByTestId('confirm-delete-btn');
    await this.page.waitForURL(/\/gameplay\/encounters$/);
  }

  /**
   * Cancel the delete action.
   */
  async cancelDelete(): Promise<void> {
    await this.clickByTestId('cancel-delete-btn');
  }
}

/**
 * Page object for the encounter create page (/gameplay/encounters/create).
 * Provides methods to fill the encounter creation form.
 */
export class EncounterCreatePage extends BasePage {
  readonly url = '/gameplay/encounters/create';

  /**
   * Navigate to the encounter create page.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  /**
   * Fill the encounter name field.
   * @param name - The encounter name
   */
  async fillName(name: string): Promise<void> {
    await this.fillByTestId('encounter-name-input', name);
  }

  /**
   * Fill the encounter description field.
   * @param description - The encounter description
   */
  async fillDescription(description: string): Promise<void> {
    await this.fillByTestId('encounter-description-input', description);
  }
}

/**
 * Submission controls for the encounter create page.
 */
export class EncounterCreateSubmitPage extends BasePage {
  /**
   * Submit the create encounter form.
   */
  async submit(): Promise<void> {
    await this.clickAndWaitForNavigation(
      this.getByTestId('submit-encounter-btn'),
    );
  }

  /**
   * Cancel encounter creation.
   */
  async cancel(): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId('cancel-btn'));
  }
}

/**
 * Read-only validation helpers for the encounter create page.
 */
export class EncounterCreateReadPage extends BasePage {
  /**
   * Check if form validation error is displayed.
   * @param field - The field name to check for errors
   */
  async hasFieldError(field: string): Promise<boolean> {
    return this.isVisibleByTestId(`${field}-error`);
  }
}
