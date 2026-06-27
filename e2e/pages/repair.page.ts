import type { Page } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * Page object for the repair bay page (/gameplay/repair).
 * Provides navigation plus role-specific helper groups.
 */
export class RepairBayPage extends BasePage {
  readonly url = '/gameplay/repair';
  readonly stats: RepairStatsReadPage;
  readonly filters: RepairFilterPage;
  readonly list: RepairUnitListPage;
  readonly listState: RepairUnitListStatePage;
  readonly assessment: RepairAssessmentPage;
  readonly selection: RepairItemSelectionPage;
  readonly costSummary: RepairCostSummaryPage;
  readonly actions: RepairActionPage;
  readonly costBreakdown: RepairCostBreakdownPage;
  readonly queue: RepairQueuePage;
  readonly queueActions: RepairQueueActionsPage;
  readonly header: RepairHeaderPage;
  readonly errors: RepairErrorPage;

  constructor(page: Page) {
    super(page);
    this.stats = new RepairStatsReadPage(page);
    this.filters = new RepairFilterPage(page);
    this.list = new RepairUnitListPage(page);
    this.listState = new RepairUnitListStatePage(page);
    this.assessment = new RepairAssessmentPage(page);
    this.selection = new RepairItemSelectionPage(page);
    this.costSummary = new RepairCostSummaryPage(page);
    this.actions = new RepairActionPage(page);
    this.costBreakdown = new RepairCostBreakdownPage(page);
    this.queue = new RepairQueuePage(page);
    this.queueActions = new RepairQueueActionsPage(page);
    this.header = new RepairHeaderPage(page);
    this.errors = new RepairErrorPage(page);
  }

  async navigate(campaignId?: string): Promise<void> {
    const url = campaignId ? `${this.url}?campaignId=${campaignId}` : this.url;
    await this.page.goto(url);
    await this.waitForReady();
  }
}

/**
 * Repair overview stats readers.
 */
export class RepairStatsReadPage extends BasePage {
  async getActiveCount(): Promise<string> {
    return this.getTextByTestId('repair-stats-active');
  }

  async getPendingCount(): Promise<string> {
    return this.getTextByTestId('repair-stats-pending');
  }

  async getCompletedCount(): Promise<string> {
    return this.getTextByTestId('repair-stats-completed');
  }

  async getEstimatedCost(): Promise<string> {
    return this.getTextByTestId('repair-stats-cost');
  }
}

/**
 * Search and status-filter helpers.
 */
export class RepairFilterPage extends BasePage {
  async searchUnits(query: string): Promise<void> {
    await this.fillByTestId('repair-search-input', query);
    await this.page.waitForTimeout(300);
  }

  async clearSearch(): Promise<void> {
    await this.fillByTestId('repair-search-input', '');
    await this.page.waitForTimeout(300);
  }

  async filterByStatus(
    status: 'all' | 'pending' | 'in-progress' | 'complete',
  ): Promise<void> {
    await this.clickByTestId(`repair-status-filter-${status}`);
    await this.page.waitForTimeout(200);
  }

  async getResultsCount(): Promise<string> {
    return this.getTextByTestId('repair-results-count');
  }
}

/**
 * Unit-card list helpers.
 */
export class RepairUnitListPage extends BasePage {
  async getUnitCardCount(): Promise<number> {
    const cards = this.getByTestId('repair-unit-card');
    return cards.count();
  }

  async selectUnit(unitId: string): Promise<void> {
    await this.clickByTestId(`repair-unit-card-${unitId}`);
    await this.page.waitForTimeout(200);
  }

  async isUnitSelected(unitId: string): Promise<boolean> {
    const card = this.getByTestId(`repair-unit-card-${unitId}`);
    const classList = await card.getAttribute('class');
    return classList?.includes('border-accent') ?? false;
  }

  async getUnitNames(): Promise<string[]> {
    const names = this.getByTestId('repair-unit-name');
    return names.allTextContents();
  }
}

/**
 * Empty and all-operational unit-list states.
 */
export class RepairUnitListStatePage extends BasePage {
  async isUnitListEmpty(): Promise<boolean> {
    return this.isVisibleByTestId('repair-empty-state');
  }

  async isAllOperational(): Promise<boolean> {
    return this.isVisibleByTestId('repair-all-operational');
  }
}

/**
 * Damage assessment panel helpers.
 */
export class RepairAssessmentPage extends BasePage {
  async isDamageAssessmentVisible(): Promise<boolean> {
    return this.isVisibleByTestId('damage-assessment-panel');
  }

  async getDamageAssessmentUnitName(): Promise<string> {
    return this.getTextByTestId('damage-assessment-unit-name');
  }

  async toggleRepairItem(itemId: string): Promise<void> {
    await this.clickByTestId(`repair-item-checkbox-${itemId}`);
  }
}

/**
 * Repair-item selection helpers.
 */
export class RepairItemSelectionPage extends BasePage {
  async selectAllItems(): Promise<void> {
    await this.clickByTestId('repair-select-all-btn');
  }

  async deselectAllItems(): Promise<void> {
    await this.clickByTestId('repair-deselect-all-btn');
  }

  async getSelectedItemsCount(): Promise<string> {
    return this.getTextByTestId('repair-selected-count');
  }
}

/**
 * Cost summary and repair action state helpers.
 */
export class RepairCostSummaryPage extends BasePage {
  async getEstimatedTime(): Promise<string> {
    return this.getTextByTestId('repair-estimated-time');
  }

  async getTotalCost(): Promise<string> {
    return this.getTextByTestId('repair-total-cost');
  }

  async isStartRepairDisabled(): Promise<boolean> {
    const btn = this.getByTestId('repair-start-full-btn');
    return btn.isDisabled();
  }

  async hasInsufficientFundsWarning(): Promise<boolean> {
    return this.isVisibleByTestId('repair-insufficient-funds');
  }
}

/**
 * Repair execution actions.
 */
export class RepairActionPage extends BasePage {
  async startFullRepair(): Promise<void> {
    await this.clickByTestId('repair-start-full-btn');
    await this.page.waitForTimeout(300);
  }

  async startPartialRepair(): Promise<void> {
    await this.clickByTestId('repair-partial-btn');
    await this.page.waitForTimeout(300);
  }
}

/**
 * Cost breakdown helpers.
 */
export class RepairCostBreakdownPage extends BasePage {
  async isCostBreakdownVisible(): Promise<boolean> {
    return this.isVisibleByTestId('repair-cost-breakdown');
  }

  async getArmorRepairCost(): Promise<string> {
    return this.getTextByTestId('repair-cost-armor');
  }

  async getStructureRepairCost(): Promise<string> {
    return this.getTextByTestId('repair-cost-structure');
  }
}

/**
 * Repair queue readers and selection helpers.
 */
export class RepairQueuePage extends BasePage {
  async isRepairQueueVisible(): Promise<boolean> {
    return this.isVisibleByTestId('repair-queue');
  }

  async getQueueJobCount(): Promise<number> {
    const items = this.getByTestId('repair-queue-item');
    return items.count();
  }

  async getQueueJobStatus(jobId: string): Promise<string> {
    return this.getTextByTestId(`repair-queue-status-${jobId}`);
  }

  async clickQueueJob(jobId: string): Promise<void> {
    await this.clickByTestId(`repair-queue-item-${jobId}`);
  }
}

/**
 * Repair queue mutation helpers.
 */
export class RepairQueueActionsPage extends BasePage {
  async moveJobUp(jobId: string): Promise<void> {
    await this.clickByTestId(`repair-queue-up-${jobId}`);
  }

  async moveJobDown(jobId: string): Promise<void> {
    await this.clickByTestId(`repair-queue-down-${jobId}`);
  }

  async cancelQueueJob(jobId: string): Promise<void> {
    await this.clickByTestId(`repair-queue-cancel-${jobId}`);
  }

  async expandCompletedJobs(): Promise<void> {
    await this.clickByTestId('repair-queue-completed-toggle');
  }
}

/**
 * Header-level repair actions.
 */
export class RepairHeaderPage extends BasePage {
  async clickFieldRepair(): Promise<void> {
    await this.clickByTestId('repair-field-btn');
  }

  async clickRepairAll(): Promise<void> {
    await this.clickByTestId('repair-all-btn');
    await this.page.waitForTimeout(300);
  }

  async isRepairAllDisabled(): Promise<boolean> {
    const btn = this.getByTestId('repair-all-btn');
    return btn.isDisabled();
  }
}

/**
 * Repair error state helpers.
 */
export class RepairErrorPage extends BasePage {
  async hasError(): Promise<boolean> {
    return this.isVisibleByTestId('repair-error');
  }

  async getErrorMessage(): Promise<string> {
    return this.getTextByTestId('repair-error');
  }

  async dismissError(): Promise<void> {
    await this.clickByTestId('repair-error-dismiss');
  }
}
