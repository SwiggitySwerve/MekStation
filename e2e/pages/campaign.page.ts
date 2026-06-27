import { BasePage } from './base.page';

/**
 * Page object for the campaign list page (/gameplay/campaigns).
 * Provides methods to interact with the campaign listing.
 */
export class CampaignListPage extends BasePage {
  readonly url = '/gameplay/campaigns';

  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  async clickCreateButton(): Promise<void> {
    await this.clickAndWaitForNavigation(
      this.getByTestId('create-campaign-btn'),
    );
  }

  async clickCampaignCard(id: string): Promise<void> {
    await this.clickAndWaitForNavigation(
      this.getByTestId(`campaign-card-${id}`),
    );
  }
}

/**
 * Read-only helpers for the campaign list page.
 */
export class CampaignListReadPage extends BasePage {
  async getCardCount(): Promise<number> {
    const cards = this.page.locator('[data-testid^="campaign-card-"]');
    return cards.count();
  }

  async getCampaignNames(): Promise<string[]> {
    const names = this.page.locator('[data-testid^="campaign-card-"] h3');
    return names.allTextContents();
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return this.isVisibleByTestId('campaigns-empty-state');
  }
}

/**
 * Page object for the campaign create page (/gameplay/campaigns/create).
 * Provides methods to create a new campaign.
 */
export class CampaignCreatePage extends BasePage {
  readonly url = '/gameplay/campaigns/create';

  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  async fillName(name: string): Promise<void> {
    await this.fillByTestId('campaign-name-input', name);
  }

  async fillDescription(description: string): Promise<void> {
    await this.fillByTestId('campaign-description-input', description);
  }

  async hasFieldError(field: string): Promise<boolean> {
    return this.isVisibleByTestId(`${field}-error`);
  }
}
