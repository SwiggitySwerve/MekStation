import { BasePage } from './base.page';

/**
 * Page object for the repair bay page (/gameplay/repair).
 * Provides methods to interact with the repair management interface.
 */
export class RepairBayPage extends BasePage {
  readonly url = '/gameplay/repair';

  /**
   * Navigate to the repair bay page.
   * @param campaignId - Optional campaign ID to pass as query param
   */
  async navigate(campaignId?: string): Promise<void> {
    const url = campaignId ? `${this.url}?campaignId=${campaignId}` : this.url;
    await this.page.goto(url);
    await this.waitForReady();
  }

  // =============================================================================
  // Stats Cards
  // =============================================================================

  /**
   * Get the active jobs count from stats.
   */
  async getActiveCount(): Promise<string> {
    return this.getTextByTestId('repair-stats-active');
  }

  /**
   * Get the pending jobs count from stats.
   */
  async getPendingCount(): Promise<string> {
    return this.getTextByTestId('repair-stats-pending');
  }

  /**
   * Get the completed jobs count from stats.
   */
  async getCompletedCount(): Promise<string> {
    return this.getTextByTestId('repair-stats-completed');
  }

  /**
   * Get the estimated cost from stats.
   */
  async getEstimatedCost(): Promise<string> {
    return this.getTextByTestId('repair-stats-cost');
  }

  // =============================================================================
  // Search & Filtering
  // =============================================================================

  /**
   * Search for units by query string.
   * @param query - The search query
   */
  async searchUnits(query: string): Promise<void> {
    await this.fillByTestId('repair-search-input', query);
    await this.page.waitForTimeout(300); // Debounce
  }

  /**
   * Clear the search input.
   */
  async clearSearch(): Promise<void> {
    await this.fillByTestId('repair-search-input', '');
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter by status.
   * @param status - 'all' | 'pending' | 'in-progress' | 'complete'
   */
  async filterByStatus(status: 'all' | 'pending' | 'in-progress' | 'complete'): Promise<void> {
    await this.clickByTestId(`repair-status-filter-${status}`);
    await this.page.waitForTimeout(200);
  }

  /**
   * Get current filter results count text.
   */
  async getResultsCount(): Promise<string> {
    return this.getTextByTestId('repair-results-count');
  }

  // =============================================================================
  // Unit Cards
  // =============================================================================

  /**
   * Get the count of unit repair cards displayed.
   */
  async getUnitCardCount(): Promise<number> {
    const cards = this.getByTestId('repair-unit-card');
    return cards.count();
  }

  /**
   * Click a specific unit repair card.
   * @param unitId - The unit ID
   */
  async selectUnit(unitId: string): Promise<void> {
    await this.clickByTestId(`repair-unit-card-${unitId}`);
    await this.page.waitForTimeout(200);
  }

  /**
   * Check if a unit card is selected.
   * @param unitId - The unit ID
   */
  async isUnitSelected(unitId: string): Promise<boolean> {
    const card = this.getByTestId(`repair-unit-card-${unitId}`);
    const classList = await card.getAttribute('class');
    return classList?.includes('border-accent') ?? false;
  }

  /**
   * Get unit names from all visible unit cards.
   */
  async getUnitNames(): Promise<string[]> {
    const names = this.getByTestId('repair-unit-name');
    return names.allTextContents();
  }

  /**
   * Check if the unit list is empty.
   */
  async isUnitListEmpty(): Promise<boolean> {
    return this.isVisibleByTestId('repair-empty-state');
  }

  /**
   * Check if "All Units Operational" empty state is shown.
   */
  async isAllOperational(): Promise<boolean> {
    return this.isVisibleByTestId('repair-all-operational');
  }

  // =============================================================================
  // Damage Assessment Panel
  // =============================================================================

  /**
   * Check if the damage assessment panel is visible.
   */
  async isDamageAssessmentVisible(): Promise<boolean> {
    return this.isVisibleByTestId('damage-assessment-panel');
  }

  /**
   * Get the unit name from the damage assessment panel.
   */
  async getDamageAssessmentUnitName(): Promise<string> {
    return this.getTextByTestId('damage-assessment-unit-name');
  }

  /**
   * Toggle a specific repair item selection.
   * @param itemId - The repair item ID
   */
  async toggleRepairItem(itemId: string): Promise<void> {
    await this.clickByTestId(`repair-item-checkbox-${itemId}`);
  }

  /**
   * Click "Select All" items button.
   */
  async selectAllItems(): Promise<void> {
    await this.clickByTestId('repair-select-all-btn');
  }

  /**
   * Click "Deselect All" items button.
   */
  async deselectAllItems(): Promise<void> {
    await this.clickByTestId('repair-deselect-all-btn');
  }

  /**
   * Get the selected items count text.
   */
  async getSelectedItemsCount(): Promise<string> {
    return this.getTextByTestId('repair-selected-count');
  }

  /**
   * Get the estimated repair time.
   */
  async getEstimatedTime(): Promise<string> {
    return this.getTextByTestId('repair-estimated-time');
  }

  /**
   * Get the total repair cost from the panel.
   */
  async getTotalCost(): Promise<string> {
    return this.getTextByTestId('repair-total-cost');
  }

  /**
   * Click the "Start Full Repair" button.
   */
  async startFullRepair(): Promise<void> {
    await this.clickByTestId('repair-start-full-btn');
    await this.page.waitForTimeout(300);
  }

  /**
   * Click the "Partial Repair" button.
   */
  async startPartialRepair(): Promise<void> {
    await this.clickByTestId('repair-partial-btn');
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if the start repair button is disabled.
   */
  async isStartRepairDisabled(): Promise<boolean> {
    const btn = this.getByTestId('repair-start-full-btn');
    return btn.isDisabled();
  }

  /**
   * Check if insufficient funds warning is shown.
   */
  async hasInsufficientFundsWarning(): Promise<boolean> {
    return this.isVisibleByTestId('repair-insufficient-funds');
  }

  // =============================================================================
  // Cost Breakdown
  // =============================================================================

  /**
   * Check if cost breakdown panel is visible.
   */
  async isCostBreakdownVisible(): Promise<boolean> {
    return this.isVisibleByTestId('repair-cost-breakdown');
  }

  /**
   * Get the armor repair cost.
   */
  async getArmorRepairCost(): Promise<string> {
    return this.getTextByTestId('repair-cost-armor');
  }

  /**
   * Get the structure repair cost.
   */
  async getStructureRepairCost(): Promise<string> {
    return this.getTextByTestId('repair-cost-structure');
  }

  // =============================================================================
  // Repair Queue
  // =============================================================================

  /**
   * Check if repair queue section is visible.
   */
  async isRepairQueueVisible(): Promise<boolean> {
    return this.isVisibleByTestId('repair-queue');
  }

  /**
   * Get count of jobs in the queue.
   */
  async getQueueJobCount(): Promise<number> {
    const items = this.getByTestId('repair-queue-item');
    return items.count();
  }

  /**
   * Get queue job details by job ID.
   * @param jobId - The job ID
   */
  async getQueueJobStatus(jobId: string): Promise<string> {
    return this.getTextByTestId(`repair-queue-status-${jobId}`);
  }

  /**
   * Click a job in the queue.
   * @param jobId - The job ID
   */
  async clickQueueJob(jobId: string): Promise<void> {
    await this.clickByTestId(`repair-queue-item-${jobId}`);
  }

  /**
   * Move a job up in the queue.
   * @param jobId - The job ID
   */
  async moveJobUp(jobId: string): Promise<void> {
    await this.clickByTestId(`repair-queue-up-${jobId}`);
  }

  /**
   * Move a job down in the queue.
   * @param jobId - The job ID
   */
  async moveJobDown(jobId: string): Promise<void> {
    await this.clickByTestId(`repair-queue-down-${jobId}`);
  }

  /**
   * Cancel a job in the queue.
   * @param jobId - The job ID
   */
  async cancelQueueJob(jobId: string): Promise<void> {
    await this.clickByTestId(`repair-queue-cancel-${jobId}`);
  }

  /**
   * Expand the completed jobs section.
   */
  async expandCompletedJobs(): Promise<void> {
    await this.clickByTestId('repair-queue-completed-toggle');
  }

  // =============================================================================
  // Header Actions
  // =============================================================================

  /**
   * Click the "Field Repair" button.
   */
  async clickFieldRepair(): Promise<void> {
    await this.clickByTestId('repair-field-btn');
  }

  /**
   * Click the "Repair All" button.
   */
  async clickRepairAll(): Promise<void> {
    await this.clickByTestId('repair-all-btn');
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if the "Repair All" button is disabled.
   */
  async isRepairAllDisabled(): Promise<boolean> {
    const btn = this.getByTestId('repair-all-btn');
    return btn.isDisabled();
  }

  // =============================================================================
  // Error State
  // =============================================================================

  /**
   * Check if error message is displayed.
   */
  async hasError(): Promise<boolean> {
    return this.isVisibleByTestId('repair-error');
  }

  /**
   * Get the error message text.
   */
  async getErrorMessage(): Promise<string> {
    return this.getTextByTestId('repair-error');
  }

  /**
   * Dismiss the error message.
   */
  async dismissError(): Promise<void> {
    await this.clickByTestId('repair-error-dismiss');
  }
}
