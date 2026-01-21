import { Page, expect } from '@playwright/test';
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
   * Get the count of encounter cards displayed.
   */
  async getCardCount(): Promise<number> {
    const cards = this.getByTestId('encounter-card');
    return cards.count();
  }

  /**
   * Click the create encounter button.
   */
  async clickCreateButton(): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId('create-encounter-btn'));
  }

  /**
   * Click a specific encounter card by ID.
   * @param id - The encounter ID
   */
  async clickEncounterCard(id: string): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId(`encounter-card-${id}`));
  }

  /**
   * Search encounters by query string.
   * @param query - The search query
   */
  async searchEncounters(query: string): Promise<void> {
    await this.fillByTestId('encounter-search', query);
    await this.page.waitForTimeout(300);
  }

  /**
   * Get all encounter names displayed.
   */
  async getEncounterNames(): Promise<string[]> {
    const names = this.getByTestId('encounter-name');
    return names.allTextContents();
  }

  /**
   * Filter encounters by status.
   * @param status - The status to filter by (e.g., 'active', 'completed', 'pending')
   */
  async filterByStatus(status: string): Promise<void> {
    await this.clickByTestId('status-filter');
    await this.clickByTestId(`status-option-${status}`);
  }

  /**
   * Filter encounters by type.
   * @param type - The encounter type
   */
  async filterByType(type: string): Promise<void> {
    await this.clickByTestId('type-filter');
    await this.clickByTestId(`type-option-${type}`);
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
 * Provides methods to interact with encounter details.
 */
export class EncounterDetailPage extends BasePage {
  /**
   * Navigate to a specific encounter's detail page.
   * @param id - The encounter ID
   */
  async navigate(id: string): Promise<void> {
    await this.page.goto(`/gameplay/encounters/${id}`);
    await this.waitForReady();
  }

  /**
   * Get the encounter name.
   */
  async getName(): Promise<string> {
    return this.getTextByTestId('encounter-name');
  }

  /**
   * Get the encounter status.
   */
  async getStatus(): Promise<string> {
    return this.getTextByTestId('encounter-status');
  }

  /**
   * Get the encounter type.
   */
  async getType(): Promise<string> {
    return this.getTextByTestId('encounter-type');
  }

  /**
   * Get the current turn number.
   */
  async getCurrentTurn(): Promise<number> {
    const turnText = await this.getTextByTestId('encounter-turn');
    return parseInt(turnText, 10);
  }

  /**
   * Get the current phase.
   */
  async getCurrentPhase(): Promise<string> {
    return this.getTextByTestId('encounter-phase');
  }

  /**
   * Click the map tab.
   */
  async clickMapTab(): Promise<void> {
    await this.clickByTestId('tab-map');
  }

  /**
   * Click the units tab.
   */
  async clickUnitsTab(): Promise<void> {
    await this.clickByTestId('tab-units');
  }

  /**
   * Click the log tab.
   */
  async clickLogTab(): Promise<void> {
    await this.clickByTestId('tab-log');
  }

  /**
   * Click the objectives tab.
   */
  async clickObjectivesTab(): Promise<void> {
    await this.clickByTestId('tab-objectives');
  }

  /**
   * Select a unit on the battlefield.
   * @param unitId - The unit ID
   */
  async selectUnit(unitId: string): Promise<void> {
    await this.clickByTestId(`unit-${unitId}`);
  }

  /**
   * Click a hex on the map.
   * @param hexId - The hex coordinates (e.g., '1203')
   */
  async clickHex(hexId: string): Promise<void> {
    await this.clickByTestId(`hex-${hexId}`);
  }

  /**
   * End the current phase.
   */
  async endPhase(): Promise<void> {
    await this.clickByTestId('end-phase-btn');
  }

  /**
   * End the current turn.
   */
  async endTurn(): Promise<void> {
    await this.clickByTestId('end-turn-btn');
    await this.clickByTestId('confirm-end-turn-btn');
  }

  /**
   * Open the action menu for a unit.
   * @param unitId - The unit ID
   */
  async openUnitActionMenu(unitId: string): Promise<void> {
    await this.clickByTestId(`unit-actions-${unitId}`);
  }

  /**
   * Execute a movement action.
   * @param unitId - The unit ID
   * @param targetHex - The target hex coordinates
   */
  async moveUnit(unitId: string, targetHex: string): Promise<void> {
    await this.selectUnit(unitId);
    await this.clickByTestId('action-move');
    await this.clickHex(targetHex);
    await this.clickByTestId('confirm-move-btn');
  }

  /**
   * Execute an attack action.
   * @param attackerId - The attacking unit ID
   * @param targetId - The target unit ID
   */
  async attackUnit(attackerId: string, targetId: string): Promise<void> {
    await this.selectUnit(attackerId);
    await this.clickByTestId('action-attack');
    await this.selectUnit(targetId);
    await this.clickByTestId('confirm-attack-btn');
  }

  /**
   * Click the pause encounter button.
   */
  async pauseEncounter(): Promise<void> {
    await this.clickByTestId('pause-encounter-btn');
  }

  /**
   * Click the resume encounter button.
   */
  async resumeEncounter(): Promise<void> {
    await this.clickByTestId('resume-encounter-btn');
  }

  /**
   * Click the end encounter button.
   */
  async endEncounter(): Promise<void> {
    await this.clickByTestId('end-encounter-btn');
    await this.clickByTestId('confirm-end-encounter-btn');
  }

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

  /**
   * Open the replay controls.
   */
  async openReplayControls(): Promise<void> {
    await this.clickByTestId('replay-controls-btn');
  }

  /**
   * Save the encounter state.
   */
  async saveEncounter(): Promise<void> {
    await this.clickByTestId('save-encounter-btn');
  }
}

/**
 * Page object for the encounter create page (/gameplay/encounters/create).
 * Provides methods to create a new encounter.
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

  /**
   * Select an encounter type.
   * @param type - The encounter type (e.g., 'skirmish', 'campaign', 'scenario')
   */
  async selectType(type: string): Promise<void> {
    await this.clickByTestId('type-select');
    await this.clickByTestId(`type-option-${type}`);
  }

  /**
   * Select a map for the encounter.
   * @param mapId - The map ID
   */
  async selectMap(mapId: string): Promise<void> {
    await this.clickByTestId('map-select');
    await this.clickByTestId(`map-option-${mapId}`);
  }

  /**
   * Add a force to the encounter.
   * @param forceId - The force ID to add
   * @param team - The team to assign (e.g., 'attacker', 'defender')
   */
  async addForce(forceId: string, team: string): Promise<void> {
    await this.clickByTestId('add-force-btn');
    await this.clickByTestId(`force-option-${forceId}`);
    await this.clickByTestId(`team-option-${team}`);
    await this.clickByTestId('confirm-add-force-btn');
  }

  /**
   * Remove a force from the encounter.
   * @param forceId - The force ID to remove
   */
  async removeForce(forceId: string): Promise<void> {
    await this.clickByTestId(`remove-force-${forceId}`);
  }

  /**
   * Set victory conditions.
   * @param condition - The victory condition type
   */
  async setVictoryCondition(condition: string): Promise<void> {
    await this.clickByTestId('victory-condition-select');
    await this.clickByTestId(`victory-option-${condition}`);
  }

  /**
   * Set the turn limit.
   * @param turns - The maximum number of turns
   */
  async setTurnLimit(turns: number): Promise<void> {
    await this.fillByTestId('turn-limit-input', turns.toString());
  }

  /**
   * Submit the create encounter form.
   */
  async submit(): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId('submit-encounter-btn'));
  }

  /**
   * Cancel encounter creation.
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
   * Create an encounter with the given details (convenience method).
   * @param name - The encounter name
   * @param type - The encounter type
   * @param mapId - The map ID
   */
  async createEncounter(name: string, type: string, mapId: string): Promise<void> {
    await this.fillName(name);
    await this.selectType(type);
    await this.selectMap(mapId);
    await this.submit();
  }
}
