import type { Page as _Page } from '@playwright/test';
import { expect as _expect } from '@playwright/test';
import { BasePage } from './base.page';

// Re-export to silence unused warnings (types kept for documentation)
void _expect;

/**
 * Page object for the games list page (/gameplay/games).
 * Provides methods to interact with the game listing.
 */
export class GameListPage extends BasePage {
  readonly url = '/gameplay/games';

  /**
   * Navigate to the games list page.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  /**
   * Get the count of game cards displayed.
   */
  async getCardCount(): Promise<number> {
    const cards = this.page.locator('[data-testid^="game-card-"]');
    return cards.count();
  }

  /**
   * Click the new game button.
   */
  async clickNewGameButton(): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId('new-game-btn'));
  }

  /**
   * Click a specific game card by ID.
   * @param id - The game ID
   */
  async clickGameCard(id: string): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId(`game-card-${id}`));
  }

  /**
   * Check if empty state is displayed.
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.isVisibleByTestId('games-empty-state');
  }
}

/**
 * Page object for the game session page (/gameplay/games/[id]).
 * Provides methods to interact with an active game.
 */
export class GameSessionPage extends BasePage {
  /**
   * Navigate to a specific game session.
   * @param id - The game ID (use 'demo' for demo session)
   */
  async navigate(id: string = 'demo'): Promise<void> {
    await this.page.goto(`/gameplay/games/${id}`);
    await this.waitForReady();
  }

  /**
   * Wait for the game session to load.
   */
  async waitForGameLoaded(): Promise<void> {
    // Wait for loading to disappear and game content to appear
    await this.page.waitForSelector('[data-testid="game-session"]', { timeout: 15000 });
  }

  /**
   * Check if game is loading.
   */
  async isLoading(): Promise<boolean> {
    return this.isVisibleByTestId('game-loading');
  }

  /**
   * Check if game has error.
   */
  async hasError(): Promise<boolean> {
    return this.isVisibleByTestId('game-error');
  }

  /**
   * Click retry button on error.
   */
  async clickRetry(): Promise<void> {
    await this.clickByTestId('game-retry-btn');
  }

  /**
   * Check if game is completed.
   */
  async isCompleted(): Promise<boolean> {
    return this.isVisibleByTestId('game-completed');
  }

  /**
   * Click replay button on completed game.
   */
  async clickReplayButton(): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId('replay-game-btn'));
  }

  /**
   * Get the current phase name.
   */
  async getPhaseName(): Promise<string> {
    return this.getTextByTestId('phase-name');
  }

  /**
   * Get the current turn number.
   */
  async getTurnNumber(): Promise<string> {
    return this.getTextByTestId('turn-number');
  }

  /**
   * Get the turn indicator (Your Turn / Opponent's Turn).
   */
  async getTurnIndicator(): Promise<string> {
    return this.getTextByTestId('turn-indicator');
  }

  /**
   * Check if hex map is visible.
   */
  async isHexMapVisible(): Promise<boolean> {
    return this.isVisibleByTestId('hex-map');
  }

  /**
   * Check if action bar is visible.
   */
  async isActionBarVisible(): Promise<boolean> {
    return this.isVisibleByTestId('action-bar');
  }

  /**
   * Click an action button.
   * @param actionId - Action ID (lock, undo, skip, next-turn, concede, clear)
   */
  async clickAction(actionId: string): Promise<void> {
    await this.clickByTestId(`action-btn-${actionId}`);
  }

  /**
   * Check if a specific action button is visible.
   * @param actionId - Action ID
   */
  async isActionVisible(actionId: string): Promise<boolean> {
    return this.isVisibleByTestId(`action-btn-${actionId}`);
  }

  /**
   * Click a unit token on the map.
   * @param unitId - Unit ID
   */
  async clickUnitToken(unitId: string): Promise<void> {
    await this.clickByTestId(`unit-token-${unitId}`);
  }

  /**
   * Check if a unit token is visible.
   * @param unitId - Unit ID
   */
  async isUnitTokenVisible(unitId: string): Promise<boolean> {
    return this.isVisibleByTestId(`unit-token-${unitId}`);
  }

  /**
   * Click zoom in button.
   */
  async clickZoomIn(): Promise<void> {
    await this.clickByTestId('zoom-in-btn');
  }

  /**
   * Click zoom out button.
   */
  async clickZoomOut(): Promise<void> {
    await this.clickByTestId('zoom-out-btn');
  }

  /**
   * Click reset view button.
   */
  async clickResetView(): Promise<void> {
    await this.clickByTestId('reset-view-btn');
  }

  /**
   * Check if record sheet panel shows "no unit selected" message.
   */
  async isNoUnitSelectedVisible(): Promise<boolean> {
    return this.isVisibleByTestId('no-unit-selected');
  }
}

/**
 * Page object for the game replay page (/gameplay/games/[id]/replay).
 * Provides methods to interact with game replay controls.
 */
export class GameReplayPage extends BasePage {
  /**
   * Navigate to a specific game's replay.
   * @param id - The game ID
   */
  async navigate(id: string): Promise<void> {
    await this.page.goto(`/gameplay/games/${id}/replay`);
    await this.waitForReady();
  }

  /**
   * Wait for replay page to load.
   */
  async waitForReplayLoaded(): Promise<void> {
    await this.page.waitForSelector('[data-testid="replay-page"]', { timeout: 15000 });
  }

  /**
   * Get replay title text.
   */
  async getTitle(): Promise<string> {
    return this.getTextByTestId('replay-title');
  }

  /**
   * Get event count text.
   */
  async getEventCount(): Promise<string> {
    return this.getTextByTestId('replay-event-count');
  }

  /**
   * Check if replay controls are visible.
   */
  async areControlsVisible(): Promise<boolean> {
    return this.isVisibleByTestId('replay-controls');
  }

  /**
   * Click play/pause button.
   */
  async clickPlayPause(): Promise<void> {
    await this.clickByTestId('replay-btn-play-pause');
  }

  /**
   * Click stop button.
   */
  async clickStop(): Promise<void> {
    await this.clickByTestId('replay-btn-stop');
  }

  /**
   * Click step forward button.
   */
  async clickStepForward(): Promise<void> {
    await this.clickByTestId('replay-btn-step-forward');
  }

  /**
   * Click step backward button.
   */
  async clickStepBackward(): Promise<void> {
    await this.clickByTestId('replay-btn-step-back');
  }

  /**
   * Click skip to start button.
   */
  async clickSkipToStart(): Promise<void> {
    await this.clickByTestId('replay-btn-skip-back');
  }

  /**
   * Click skip to end button.
   */
  async clickSkipToEnd(): Promise<void> {
    await this.clickByTestId('replay-btn-skip-forward');
  }
}
