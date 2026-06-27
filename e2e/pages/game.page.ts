import type { Page } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * Page object for the games list page (/gameplay/games).
 * Provides navigation and list actions.
 */
export class GameListPage extends BasePage {
  readonly url = '/gameplay/games';

  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForReady();
  }

  async clickNewGameButton(): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId('new-game-btn'));
  }

  async clickGameCard(id: string): Promise<void> {
    await this.clickAndWaitForNavigation(this.getByTestId(`game-card-${id}`));
  }
}

/**
 * Read-only helpers for the games list page.
 */
export class GameListReadPage extends BasePage {
  async getCardCount(): Promise<number> {
    const cards = this.page.locator('[data-testid^="game-card-"]');
    return cards.count();
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return this.isVisibleByTestId('games-empty-state');
  }
}

/**
 * Page object for the game session page (/gameplay/games/[id]).
 */
export class GameSessionPage extends BasePage {
  readonly status: GameSessionStatusPage;
  readonly turn: GameSessionTurnPage;
  readonly map: GameSessionMapPage;
  readonly commands: GameSessionCommandPage;
  readonly units: GameSessionUnitPage;

  constructor(page: Page) {
    super(page);
    this.status = new GameSessionStatusPage(page);
    this.turn = new GameSessionTurnPage(page);
    this.map = new GameSessionMapPage(page);
    this.commands = new GameSessionCommandPage(page);
    this.units = new GameSessionUnitPage(page);
  }

  async navigate(id: string = 'demo'): Promise<void> {
    await this.page.goto(`/gameplay/games/${id}`);
    await this.waitForReady();
  }

  async waitForGameLoaded(): Promise<void> {
    await this.page.waitForSelector('[data-testid="game-session"]', {
      timeout: 15000,
    });
  }
}

/**
 * Game session load, error, and terminal-state helpers.
 */
export class GameSessionStatusPage extends BasePage {
  async isLoading(): Promise<boolean> {
    return this.isVisibleByTestId('game-loading');
  }

  async hasError(): Promise<boolean> {
    return this.isVisibleByTestId('game-error');
  }

  async clickRetry(): Promise<void> {
    await this.clickByTestId('game-retry-btn');
  }

  async isCompleted(): Promise<boolean> {
    return this.isVisibleByTestId('game-completed');
  }
}

/**
 * Game session turn rail readers.
 */
export class GameSessionTurnPage extends BasePage {
  async getPhaseName(): Promise<string> {
    return this.getTextByTestId('phase-name');
  }

  async getTurnNumber(): Promise<string> {
    return this.getTextByTestId('turn-number');
  }

  async getTurnIndicator(): Promise<string> {
    return this.getTextByTestId('turn-indicator');
  }
}

/**
 * Tactical map and camera controls for a game session.
 */
export class GameSessionMapPage extends BasePage {
  async isHexMapVisible(): Promise<boolean> {
    const map = this.page.locator(
      [
        '[data-testid="hex-map"]',
        '[data-testid="hex-map-container"]',
        '[data-testid="hex-grid"]',
      ].join(', '),
    );
    return map
      .first()
      .isVisible()
      .catch(() => false);
  }

  async clickZoomIn(): Promise<void> {
    await this.clickByTestId('zoom-in-btn');
  }

  async clickZoomOut(): Promise<void> {
    await this.clickByTestId('zoom-out-btn');
  }

  async clickResetView(): Promise<void> {
    await this.clickByTestId('reset-view-btn');
  }
}

/**
 * Tactical action dock helpers.
 */
export class GameSessionCommandPage extends BasePage {
  async isActionBarVisible(): Promise<boolean> {
    return this.isVisibleByTestId('tactical-action-dock');
  }

  async clickAction(commandId: string): Promise<void> {
    await this.clickByTestId(`command-btn-${commandId}`);
  }

  async isActionVisible(commandId: string): Promise<boolean> {
    return this.isVisibleByTestId(`command-btn-${commandId}`);
  }
}

/**
 * Unit token and record-sheet selection helpers.
 */
export class GameSessionUnitPage extends BasePage {
  async clickUnitToken(unitId: string): Promise<void> {
    await this.clickByTestId(`unit-token-${unitId}`);
  }

  async isUnitTokenVisible(unitId: string): Promise<boolean> {
    return this.isVisibleByTestId(`unit-token-${unitId}`);
  }

  async isNoUnitSelectedVisible(): Promise<boolean> {
    return this.isVisibleByTestId('no-unit-selected');
  }
}

/**
 * Page object for the game replay page (/gameplay/games/[id]/replay).
 */
export class GameReplayPage extends BasePage {
  readonly read: GameReplayReadPage;
  readonly controls: GameReplayControlsPage;
  readonly timeline: GameReplayTimelinePage;

  constructor(page: Page) {
    super(page);
    this.read = new GameReplayReadPage(page);
    this.controls = new GameReplayControlsPage(page);
    this.timeline = new GameReplayTimelinePage(page);
  }

  async navigate(id: string): Promise<void> {
    await this.page.goto(`/gameplay/games/${id}/replay`);
    await this.waitForReady();
  }

  async waitForReplayLoaded(): Promise<void> {
    await this.page.waitForSelector('[data-testid="replay-page"]', {
      timeout: 15000,
    });
  }
}

/**
 * Read-only replay page helpers.
 */
export class GameReplayReadPage extends BasePage {
  async getTitle(): Promise<string> {
    return this.getTextByTestId('replay-title');
  }

  async getEventCount(): Promise<string> {
    return this.getTextByTestId('replay-event-count');
  }

  async areControlsVisible(): Promise<boolean> {
    return this.isVisibleByTestId('replay-controls');
  }
}

/**
 * Replay transport controls.
 */
export class GameReplayControlsPage extends BasePage {
  async clickPlayPause(): Promise<void> {
    await this.clickByTestId('replay-btn-play-pause');
  }

  async clickStop(): Promise<void> {
    await this.clickByTestId('replay-btn-stop');
  }

  async clickStepForward(): Promise<void> {
    await this.clickByTestId('replay-btn-step-forward');
  }

  async clickStepBackward(): Promise<void> {
    await this.clickByTestId('replay-btn-step-back');
  }
}

/**
 * Replay timeline jump controls.
 */
export class GameReplayTimelinePage extends BasePage {
  async clickSkipToStart(): Promise<void> {
    await this.clickByTestId('replay-btn-skip-back');
  }

  async clickSkipToEnd(): Promise<void> {
    await this.clickByTestId('replay-btn-skip-forward');
  }
}
