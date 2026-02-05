import { BasePage } from './base.page';

/**
 * Page object for the campaign list page (/gameplay/campaigns).
 * Provides methods to interact with the campaign listing.
 */
export class CampaignListPage extends BasePage {
  readonly url = '/gameplay/campaigns';

  /**
   * Navigate to the campaign list page.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  /**
   * Get the count of campaign cards displayed.
   */
  async getCardCount(): Promise<number> {
    const cards = this.getByTestId('campaign-card');
    return cards.count();
  }

  /**
   * Click the create campaign button.
   */
  async clickCreateButton(): Promise<void> {
    await this.clickAndWaitForNavigation(
      this.getByTestId('create-campaign-btn'),
    );
  }

  /**
   * Click a specific campaign card by ID.
   * @param id - The campaign ID
   */
  async clickCampaignCard(id: string): Promise<void> {
    await this.clickAndWaitForNavigation(
      this.getByTestId(`campaign-card-${id}`),
    );
  }

  /**
   * Search campaigns by query string.
   * @param query - The search query
   */
  async searchCampaigns(query: string): Promise<void> {
    await this.fillByTestId('campaign-search', query);
    // Wait for search results to update
    await this.page.waitForTimeout(300);
  }

  /**
   * Get all campaign names displayed.
   */
  async getCampaignNames(): Promise<string[]> {
    const names = this.getByTestId('campaign-name');
    return names.allTextContents();
  }

  /**
   * Check if empty state is displayed.
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.isVisibleByTestId('campaigns-empty-state');
  }
}

/**
 * Page object for the campaign detail page (/gameplay/campaigns/[id]).
 * Provides methods to interact with campaign details.
 */
export class CampaignDetailPage extends BasePage {
  /**
   * Navigate to a specific campaign's detail page.
   * @param id - The campaign ID
   */
  async navigate(id: string): Promise<void> {
    await this.page.goto(`/gameplay/campaigns/${id}`);
    await this.waitForReady();
  }

  /**
   * Get the campaign name (from page title).
   */
  async getName(): Promise<string> {
    return this.getTextByTestId('page-title');
  }

  /**
   * Get the campaign status.
   */
  async getStatus(): Promise<string> {
    return this.getTextByTestId('campaign-status');
  }

  /**
   * Get the campaign description.
   */
  async getDescription(): Promise<string> {
    return this.getTextByTestId('campaign-description');
  }

  /**
   * Click the audit tab.
   */
  async clickAuditTab(): Promise<void> {
    await this.clickByTestId('tab-audit');
  }

  /**
   * Click the overview tab.
   */
  async clickOverviewTab(): Promise<void> {
    await this.clickByTestId('tab-overview');
  }

  /**
   * Click the forces tab.
   */
  async clickForcesTab(): Promise<void> {
    await this.clickByTestId('tab-forces');
  }

  /**
   * Click start mission button for a specific mission.
   * @param missionId - The mission ID
   */
  async clickStartMission(missionId: string): Promise<void> {
    await this.clickByTestId(`start-mission-${missionId}`);
  }

  /**
   * Click the delete campaign button.
   */
  async clickDelete(): Promise<void> {
    await this.clickByTestId('delete-campaign-btn');
  }

  /**
   * Confirm the delete action in the confirmation dialog.
   */
  async confirmDelete(): Promise<void> {
    await this.clickByTestId('confirm-delete-btn');
    await this.page.waitForURL(/\/gameplay\/campaigns$/);
  }

  /**
   * Cancel the delete action in the confirmation dialog.
   */
  async cancelDelete(): Promise<void> {
    await this.clickByTestId('cancel-delete-btn');
  }

  /**
   * Click the edit campaign button.
   */
  async clickEdit(): Promise<void> {
    await this.clickByTestId('edit-campaign-btn');
  }
}

/**
 * Page object for the campaign create page (/gameplay/campaigns/create).
 * Provides methods to create a new campaign.
 */
export class CampaignCreatePage extends BasePage {
  readonly url = '/gameplay/campaigns/create';

  /**
   * Navigate to the campaign create page.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  /**
   * Fill the campaign name field.
   * @param name - The campaign name
   */
  async fillName(name: string): Promise<void> {
    await this.fillByTestId('campaign-name-input', name);
  }

  /**
   * Fill the campaign description field.
   * @param description - The campaign description
   */
  async fillDescription(description: string): Promise<void> {
    await this.fillByTestId('campaign-description-input', description);
  }

  /**
   * Select a difficulty level.
   * @param difficulty - The difficulty level (e.g., 'easy', 'normal', 'hard')
   */
  async selectDifficulty(difficulty: string): Promise<void> {
    await this.clickByTestId('difficulty-select');
    await this.clickByTestId(`difficulty-option-${difficulty}`);
  }

  /**
   * Select a ruleset.
   * @param ruleset - The ruleset identifier
   */
  async selectRuleset(ruleset: string): Promise<void> {
    await this.clickByTestId('ruleset-select');
    await this.clickByTestId(`ruleset-option-${ruleset}`);
  }

  /**
   * Submit the create campaign form.
   */
  async submit(): Promise<void> {
    await this.clickAndWaitForNavigation(
      this.getByTestId('submit-campaign-btn'),
    );
  }

  /**
   * Cancel campaign creation.
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
   * Create a campaign with the given details (convenience method).
   * @param name - The campaign name
   * @param description - The campaign description
   * @param difficulty - Optional difficulty level
   */
  async createCampaign(
    name: string,
    description: string,
    difficulty?: string,
  ): Promise<void> {
    await this.fillName(name);
    await this.fillDescription(description);
    if (difficulty) {
      await this.selectDifficulty(difficulty);
    }
    await this.submit();
  }
}
