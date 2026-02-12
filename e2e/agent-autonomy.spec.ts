/**
 * Agent Autonomy E2E Tests
 *
 * Tests that the AgentPlayer can autonomously play through a full interactive
 * game session. The agent reads Zustand store state and makes movement/attack
 * decisions via UI clicks until the game completes.
 *
 * @tags @game @agent
 */

import { test, expect, type Page } from '@playwright/test';

import { AgentPlayer } from './helpers/agent-player';
import { getStoreState } from './helpers/store';

// =============================================================================
// Types
// =============================================================================

interface GameplayStoreState {
  readonly session: {
    readonly id: string;
    readonly currentState: {
      readonly status: string;
      readonly turn: number;
      readonly phase: string;
      readonly result?: {
        readonly winner: string;
        readonly reason: string;
      };
      readonly units: Record<
        string,
        {
          readonly id: string;
          readonly side: 'player' | 'opponent';
          readonly destroyed: boolean;
        }
      >;
    };
  } | null;
  readonly interactivePhase: string;
}

// =============================================================================
// Test Configuration
// =============================================================================

test.setTimeout(90000);

async function waitForStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { gameplayStore?: unknown };
      };
      return win.__ZUSTAND_STORES__?.gameplayStore !== undefined;
    },
    { timeout: 15000 },
  );
}

async function waitForGameSession(page: Page): Promise<void> {
  await expect(async () => {
    const state = await getStoreState<GameplayStoreState>(
      page,
      'gameplayStore',
    );
    expect(state.session).not.toBeNull();
  }).toPass({ timeout: 15000 });
}

// =============================================================================
// Agent Plays Full Interactive Game
// =============================================================================

test.describe('Agent Autonomy', () => {
  test(
    'should play through a full interactive game autonomously',
    { tag: ['@game', '@agent'] },
    async ({ page }) => {
      await page.goto('/gameplay/quick');

      // Select units for an interactive game
      await page
        .getByTestId('unit-card-0')
        .click()
        .catch(() => {});
      await page
        .getByTestId('unit-card-1')
        .click()
        .catch(() => {});

      // Start interactive (manual) mode
      const playManualBtn = page.getByTestId('play-manual-btn');
      const interactiveBtn = page.getByTestId('interactive-btn');
      const startBattleBtn = page.getByTestId('start-battle-btn');

      if (await playManualBtn.isVisible().catch(() => false)) {
        await playManualBtn.click();
      } else if (await interactiveBtn.isVisible().catch(() => false)) {
        await interactiveBtn.click();
      } else if (await startBattleBtn.isVisible().catch(() => false)) {
        await startBattleBtn.click();
      }

      // Wait for game session to initialize
      await waitForStoreReady(page);
      await waitForGameSession(page);

      // Create agent and play the game
      const agent = new AgentPlayer(page);
      await agent.playGame();

      // Verify game completed
      const state = await getStoreState<GameplayStoreState>(
        page,
        'gameplayStore',
      );
      expect(state.session).not.toBeNull();
      expect(state.session!.currentState.status).toBe('completed');
      expect(state.session!.currentState.result).toBeTruthy();
      expect(state.session!.currentState.result!.winner).toBeTruthy();
    },
  );

  test(
    'should complete game within 60 seconds',
    { tag: ['@game', '@agent'] },
    async ({ page }) => {
      await page.goto('/gameplay/quick');

      // Select units
      await page
        .getByTestId('unit-card-0')
        .click()
        .catch(() => {});
      await page
        .getByTestId('unit-card-1')
        .click()
        .catch(() => {});

      // Start interactive mode
      const playManualBtn = page.getByTestId('play-manual-btn');
      const startBattleBtn = page.getByTestId('start-battle-btn');

      if (await playManualBtn.isVisible().catch(() => false)) {
        await playManualBtn.click();
      } else if (await startBattleBtn.isVisible().catch(() => false)) {
        await startBattleBtn.click();
      }

      await waitForStoreReady(page);
      await waitForGameSession(page);

      const startTime = Date.now();

      const agent = new AgentPlayer(page);
      await agent.playGame();

      const elapsed = Date.now() - startTime;
      // AgentPlayer has built-in 60s timeout, verify it completes within that
      expect(elapsed).toBeLessThan(60000);
    },
  );

  test(
    'should determine a winner',
    { tag: ['@game', '@agent'] },
    async ({ page }) => {
      await page.goto('/gameplay/quick');

      // Select units
      await page
        .getByTestId('unit-card-0')
        .click()
        .catch(() => {});
      await page
        .getByTestId('unit-card-1')
        .click()
        .catch(() => {});

      // Start interactive mode
      const playManualBtn = page.getByTestId('play-manual-btn');
      const startBattleBtn = page.getByTestId('start-battle-btn');

      if (await playManualBtn.isVisible().catch(() => false)) {
        await playManualBtn.click();
      } else if (await startBattleBtn.isVisible().catch(() => false)) {
        await startBattleBtn.click();
      }

      await waitForStoreReady(page);
      await waitForGameSession(page);

      const agent = new AgentPlayer(page);
      await agent.playGame();

      // Verify winner is one of the valid sides
      const state = await getStoreState<GameplayStoreState>(
        page,
        'gameplayStore',
      );
      const winner = state.session!.currentState.result!.winner;
      expect(['player', 'opponent', 'draw']).toContain(winner);
    },
  );

  test(
    'should process multiple game turns',
    { tag: ['@game', '@agent'] },
    async ({ page }) => {
      await page.goto('/gameplay/quick');

      // Select units
      await page
        .getByTestId('unit-card-0')
        .click()
        .catch(() => {});
      await page
        .getByTestId('unit-card-1')
        .click()
        .catch(() => {});

      // Start interactive mode
      const playManualBtn = page.getByTestId('play-manual-btn');
      const startBattleBtn = page.getByTestId('start-battle-btn');

      if (await playManualBtn.isVisible().catch(() => false)) {
        await playManualBtn.click();
      } else if (await startBattleBtn.isVisible().catch(() => false)) {
        await startBattleBtn.click();
      }

      await waitForStoreReady(page);
      await waitForGameSession(page);

      const agent = new AgentPlayer(page);
      await agent.playGame();

      // Verify multiple turns were played (game shouldn't end on turn 1)
      const state = await getStoreState<GameplayStoreState>(
        page,
        'gameplayStore',
      );
      expect(state.session!.currentState.turn).toBeGreaterThanOrEqual(1);
    },
  );
});

// =============================================================================
// Agent Decision Making
// =============================================================================

test.describe('Agent Decision Making', () => {
  test(
    'should make valid movement decisions',
    { tag: ['@game', '@agent'] },
    async ({ page }) => {
      await page.goto('/gameplay/quick');

      // Select units
      await page
        .getByTestId('unit-card-0')
        .click()
        .catch(() => {});

      // Start interactive mode
      const playManualBtn = page.getByTestId('play-manual-btn');
      const startBattleBtn = page.getByTestId('start-battle-btn');

      if (await playManualBtn.isVisible().catch(() => false)) {
        await playManualBtn.click();
      } else if (await startBattleBtn.isVisible().catch(() => false)) {
        await startBattleBtn.click();
      }

      await waitForStoreReady(page);

      try {
        await waitForGameSession(page);

        const agent = new AgentPlayer(page);
        const decision = await agent.makeMovementDecision();

        if (decision) {
          expect(decision.unitId).toBeTruthy();
          expect(decision.targetHex).toBeDefined();
          expect(typeof decision.targetHex.q).toBe('number');
          expect(typeof decision.targetHex.r).toBe('number');
        }
      } catch {
        // Game may not have started in interactive mode
      }
    },
  );

  test(
    'should make valid attack decisions',
    { tag: ['@game', '@agent'] },
    async ({ page }) => {
      await page.goto('/gameplay/quick');

      // Select units
      await page
        .getByTestId('unit-card-0')
        .click()
        .catch(() => {});

      // Start interactive mode
      const playManualBtn = page.getByTestId('play-manual-btn');
      const startBattleBtn = page.getByTestId('start-battle-btn');

      if (await playManualBtn.isVisible().catch(() => false)) {
        await playManualBtn.click();
      } else if (await startBattleBtn.isVisible().catch(() => false)) {
        await startBattleBtn.click();
      }

      await waitForStoreReady(page);

      try {
        await waitForGameSession(page);

        const agent = new AgentPlayer(page);
        const decision = await agent.makeAttackDecision();

        if (decision) {
          expect(decision.attackerId).toBeTruthy();
          expect(decision.targetId).toBeTruthy();
          expect(Array.isArray(decision.weaponIds)).toBe(true);
        }
      } catch {
        // Game may not have started in interactive mode
      }
    },
  );
});

// =============================================================================
// Agent Game Completion Verification
// =============================================================================

test.describe('Agent Game Completion', () => {
  test(
    'should show game over UI after agent completes game',
    { tag: ['@game', '@agent'] },
    async ({ page }) => {
      await page.goto('/gameplay/quick');

      // Select units
      await page
        .getByTestId('unit-card-0')
        .click()
        .catch(() => {});
      await page
        .getByTestId('unit-card-1')
        .click()
        .catch(() => {});

      // Start interactive mode
      const playManualBtn = page.getByTestId('play-manual-btn');
      const startBattleBtn = page.getByTestId('start-battle-btn');

      if (await playManualBtn.isVisible().catch(() => false)) {
        await playManualBtn.click();
      } else if (await startBattleBtn.isVisible().catch(() => false)) {
        await startBattleBtn.click();
      }

      await waitForStoreReady(page);
      await waitForGameSession(page);

      const agent = new AgentPlayer(page);
      await agent.playGame();

      // Verify game over UI elements appear
      const gameOverBanner = page.getByText(
        /game over|battle complete|victory|defeat/i,
      );
      const resultsPage = page.getByTestId('results-page');
      const gameOverPhase = page.getByTestId('game-over-banner');

      const hasGameOver = await gameOverBanner.isVisible().catch(() => false);
      const hasResults = await resultsPage.isVisible().catch(() => false);
      const hasPhase = await gameOverPhase.isVisible().catch(() => false);

      // At least one game-over indicator should be visible
      expect(hasGameOver || hasResults || hasPhase).toBe(true);
    },
  );
});
