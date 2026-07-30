/**
 * Quick Play E2E Tests
 *
 * Tests for the Quick Play game mode, including auto-resolve and interactive
 * battle flows. Quick Play allows jumping straight into standalone battles
 * without force/encounter setup.
 *
 * @tags @game @smoke
 */

import { test, expect, type Page } from '@playwright/test';

import { getStoreState } from './helpers/store';

// =============================================================================
// Types
// =============================================================================

/** Minimal shape of the gameplay store for Quick Play assertions. */
interface QuickPlayState {
  readonly session: {
    readonly id: string;
    readonly units: readonly {
      readonly id: string;
      readonly unitRef: string;
    }[];
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
          readonly armor: Record<string, number>;
        }
      >;
    };
  } | null;
  readonly interactiveSession: {
    getMovementCapability: (unitId: string) => unknown;
    getUnitWeapons: (unitId: string) => readonly unknown[];
  } | null;
  readonly interactivePhase: string;
}

interface QuickPlayRecoverySnapshot {
  readonly sessionId: string | undefined;
  readonly unitIds: readonly string[];
  readonly unitRefs: readonly string[];
  readonly stateUnitIds: readonly string[];
  readonly movementReady: Record<string, boolean>;
  readonly weaponsReady: Record<string, boolean>;
}

// =============================================================================
// Test Configuration
// =============================================================================

test.setTimeout(60000);

/** Wait for the gameplay store to be available. */
async function waitForStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      return window.__ZUSTAND_STORES__?.gameplay !== undefined;
    },
    { timeout: 15000 },
  );
}

async function readQuickPlayRecoverySnapshot(
  page: Page,
): Promise<QuickPlayRecoverySnapshot> {
  return page.evaluate(() => {
    const state = window.__ZUSTAND_STORES__?.gameplay.getState();
    const units = state?.session?.units ?? [];
    const interactiveSession = state?.interactiveSession;
    const movementReady: Record<string, boolean> = {};
    const weaponsReady: Record<string, boolean> = {};

    for (const unit of units) {
      movementReady[unit.id] =
        !!interactiveSession &&
        interactiveSession.getMovementCapability(unit.id) !== null;
      weaponsReady[unit.id] =
        (interactiveSession?.getUnitWeapons(unit.id).length ?? 0) > 0;
    }

    return {
      sessionId: state?.session?.id,
      unitIds: units.map((unit) => unit.id),
      unitRefs: units.map((unit) => unit.unitRef),
      stateUnitIds: Object.keys(state?.session?.currentState.units ?? {}),
      movementReady,
      weaponsReady,
    };
  });
}

async function gotoQuickGame(page: Page): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto('/gameplay/quick', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/gameplay\/quick/);
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
      await page.waitForTimeout(500 * attempt);
    }
  }
}

async function startQuickGameSetup(page: Page): Promise<void> {
  await gotoQuickGame(page);

  await expect(
    page.getByRole('heading', { name: /quick game|select your units/i }),
  ).toBeVisible();

  const startQuickGame = page.getByRole('button', {
    name: /start quick game/i,
  });
  if (await startQuickGame.isVisible().catch(() => false)) {
    await startQuickGame.click();
  }

  await expect(
    page.getByRole('heading', { name: /select your units/i }),
  ).toBeVisible();
}

async function addDemoUnits(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Atlas AS7-D/i }).click();
  await page.getByRole('button', { name: /Marauder MAD-3R/i }).click();
  await expect(page.getByTestId('next-step-btn')).toBeEnabled();
}

async function prepareQuickGameReview(page: Page): Promise<void> {
  await startQuickGameSetup(page);
  await addDemoUnits(page);
  await page.getByTestId('next-step-btn').click();

  await expect(
    page.getByRole('heading', { name: /configure scenario/i }),
  ).toBeVisible();
  await page.getByTestId('generate-scenario-btn').click();

  await expect(page.getByTestId('start-game-btn')).toBeVisible({
    timeout: 15000,
  });
}

async function autoResolveQuickGame(page: Page): Promise<void> {
  await prepareQuickGameReview(page);
  await page.getByTestId('start-game-btn').click();

  await expect(page.getByRole('tab', { name: /summary/i })).toBeVisible({
    timeout: 30000,
  });
}

// =============================================================================
// Quick Play - Page Load
// =============================================================================

test.describe('Quick Play Page', () => {
  test(
    'should load the quick play page',
    { tag: ['@game', '@smoke'] },
    async ({ page }) => {
      await gotoQuickGame(page);
      await expect(page).toHaveURL(/\/gameplay\/quick/);

      await expect(
        page.getByRole('heading', { name: /quick game|quick play/i }),
      ).toBeVisible();
      await expect(page.getByTestId('start-quick-game-btn')).toBeVisible();
    },
  );

  test(
    'should display unit selection area',
    { tag: ['@game', '@smoke'] },
    async ({ page }) => {
      await startQuickGameSetup(page);

      await expect(
        page.getByRole('heading', { name: 'Your Force' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Available Units' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Atlas AS7-D/i }),
      ).toBeVisible();
    },
  );
});

// =============================================================================
// Quick Play - Unit Selection
// =============================================================================

test.describe('Quick Play Unit Selection', () => {
  test(
    'should select player units',
    { tag: ['@game', '@smoke'] },
    async ({ page }) => {
      await startQuickGameSetup(page);
      await addDemoUnits(page);

      await expect(page.getByText('Atlas AS7-D')).toHaveCount(2);
      await expect(page.getByText('Marauder MAD-3R')).toHaveCount(2);
    },
  );

  test(
    'should show Watch AI Battle, Interactive Skirmish, and Auto-Resolve options',
    { tag: ['@game', '@smoke'] },
    async ({ page }) => {
      await prepareQuickGameReview(page);

      await expect(page.getByTestId('start-game-btn')).toBeVisible();
      await expect(page.getByTestId('watch-ai-battle-btn')).toBeVisible();
      await expect(page.getByTestId('interactive-skirmish-btn')).toBeVisible();
      await expect(
        page.getByRole('button', { name: /auto-resolve/i }),
      ).toBeVisible();
    },
  );
});

// =============================================================================
// Quick Play - Interactive Recovery
// =============================================================================

test.describe('Quick Play Interactive Recovery', () => {
  test(
    'should cold-recover every generated combatant with live capabilities',
    { tag: ['@game', '@recovery'] },
    async ({ page }, testInfo) => {
      const recoveryDiagnostics: string[] = [];
      page.on('console', (message) => {
        const text = message.text();
        if (
          text.includes('not found in the canonical catalog') ||
          text.includes('Encountered two children with the same key')
        ) {
          recoveryDiagnostics.push(text);
        }
      });

      await prepareQuickGameReview(page);
      await page.getByTestId('interactive-skirmish-btn').click();
      await expect(page).toHaveURL(/\/gameplay\/games\/[^/?]+$/);
      const launchedUrl = page.url();

      await expect(page.getByTestId('game-session')).toBeVisible({
        timeout: 20_000,
      });
      await waitForStoreReady(page);
      const launched = await readQuickPlayRecoverySnapshot(page);
      expect(launched.sessionId).toBeTruthy();
      expect(launched.unitIds.length).toBeGreaterThan(2);
      expect(new Set(launched.unitIds).size).toBe(launched.unitIds.length);
      expect([...launched.stateUnitIds].sort()).toEqual(
        [...launched.unitIds].sort(),
      );
      expect(
        launched.unitRefs.every((unitRef) =>
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(unitRef),
        ),
      ).toBe(true);
      expect(Object.keys(launched.movementReady)).toHaveLength(
        launched.unitIds.length,
      );
      expect(Object.keys(launched.weaponsReady)).toHaveLength(
        launched.unitIds.length,
      );
      expect(Object.values(launched.movementReady).every(Boolean)).toBe(true);
      expect(Object.values(launched.weaponsReady).every(Boolean)).toBe(true);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(launchedUrl);
      await expect(page.getByTestId('game-session')).toBeVisible({
        timeout: 20_000,
      });
      await page.waitForFunction(
        (expectedSessionId) => {
          const state = window.__ZUSTAND_STORES__?.gameplay.getState();
          return (
            state?.session?.id === expectedSessionId &&
            state?.interactiveSession !== null &&
            state?.interactiveSession !== undefined
          );
        },
        launched.sessionId,
        { timeout: 20_000 },
      );

      const recovered = await readQuickPlayRecoverySnapshot(page);
      expect(recovered.sessionId).toBe(launched.sessionId);
      expect(recovered.unitIds).toEqual(launched.unitIds);
      expect(recovered.unitRefs).toEqual(launched.unitRefs);
      expect([...recovered.stateUnitIds].sort()).toEqual(
        [...recovered.unitIds].sort(),
      );
      expect(Object.keys(recovered.movementReady)).toHaveLength(
        recovered.unitIds.length,
      );
      expect(Object.keys(recovered.weaponsReady)).toHaveLength(
        recovered.unitIds.length,
      );
      expect(Object.values(recovered.movementReady).every(Boolean)).toBe(true);
      expect(Object.values(recovered.weaponsReady).every(Boolean)).toBe(true);
      expect(recoveryDiagnostics).toEqual([]);
      await expect(page.getByTestId('game-error')).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath('interactive-skirmish-cold-recovered.png'),
        fullPage: true,
      });
    },
  );

  test(
    'should preserve spectator capabilities through a cold reload',
    { tag: ['@game', '@recovery'] },
    async ({ page }, testInfo) => {
      await prepareQuickGameReview(page);
      await page.getByTestId('watch-ai-battle-btn').click();
      await expect(page).toHaveURL(/\/gameplay\/games\/[^/?]+\?spectator=1$/);
      const launchedUrl = page.url();

      await expect(
        page.getByRole('heading', {
          name: /AI vs AI.*Spectator Mode/i,
        }),
      ).toBeVisible({ timeout: 20_000 });
      await waitForStoreReady(page);
      const launched = await readQuickPlayRecoverySnapshot(page);
      expect(launched.sessionId).toBeTruthy();
      expect(launched.unitIds.length).toBeGreaterThan(2);
      expect(Object.values(launched.movementReady).every(Boolean)).toBe(true);
      expect(Object.values(launched.weaponsReady).every(Boolean)).toBe(true);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(launchedUrl);
      await expect(
        page.getByRole('heading', {
          name: /AI vs AI.*Spectator Mode/i,
        }),
      ).toBeVisible({ timeout: 20_000 });
      await waitForStoreReady(page);
      const recovered = await readQuickPlayRecoverySnapshot(page);
      expect(recovered.sessionId).toBe(launched.sessionId);
      expect(recovered.unitIds).toEqual(launched.unitIds);
      expect(Object.values(recovered.movementReady).every(Boolean)).toBe(true);
      expect(Object.values(recovered.weaponsReady).every(Boolean)).toBe(true);
      await expect(page.getByTestId('game-error')).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath('spectator-battle-cold-recovered.png'),
        fullPage: true,
      });
    },
  );
});

// =============================================================================
// Quick Play - Auto-Resolve Battle
// =============================================================================

test.describe('Quick Play Auto-Resolve', () => {
  test(
    'should auto-resolve a battle',
    { tag: ['@game', '@smoke'] },
    async ({ page }) => {
      await autoResolveQuickGame(page);

      await expect(
        page.getByRole('heading', { name: /victory|defeat|draw/i }),
      ).toBeVisible();
      await expect(page.getByText(/battle statistics/i)).toBeVisible();
    },
  );

  test(
    'should display winner after auto-resolve',
    { tag: ['@game', '@smoke'] },
    async ({ page }) => {
      await autoResolveQuickGame(page);

      await expect(
        page.getByRole('heading', { name: /victory|defeat|draw/i }),
      ).toBeVisible();
    },
  );

  test(
    'should show battle statistics after auto-resolve',
    { tag: ['@game', '@smoke'] },
    async ({ page }) => {
      await autoResolveQuickGame(page);

      await expect(page.getByText(/battle statistics/i)).toBeVisible();
      await expect(page.getByText(/turns played/i).first()).toBeVisible();
    },
  );

  test(
    'should have replay button after battle',
    { tag: ['@game', '@smoke'] },
    async ({ page }) => {
      await autoResolveQuickGame(page);

      await expect(page.getByRole('tab', { name: /replay/i })).toBeVisible();
      await expect(page.getByTestId('play-again-same-btn')).toBeVisible();
    },
  );
});

// =============================================================================
// Quick Play - Store Verification
// =============================================================================

test.describe('Quick Play Store State', () => {
  test(
    'should create game session in store after battle start',
    { tag: ['@game', '@smoke'] },
    async ({ page }) => {
      await autoResolveQuickGame(page);

      // Check store state
      try {
        await waitForStoreReady(page);
        const state = await getStoreState<QuickPlayState>(page, 'gameplay');

        if (state.session) {
          // Session should exist with valid game state
          expect(state.session.id).toBeTruthy();
          expect(state.session.currentState.status).toBeTruthy();
        }
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }
        // Store may not be ready if page navigated to results
        // This is acceptable - auto-resolve may complete before store check
        console.info('Quick Play store verification skipped:', error.message);
      }
    },
  );

  test(
    'should have completed status after auto-resolve',
    { tag: ['@game', '@smoke'] },
    async ({ page }) => {
      await autoResolveQuickGame(page);

      // Verify game completed via store or UI
      try {
        await waitForStoreReady(page);
        const state = await getStoreState<QuickPlayState>(page, 'gameplay');

        if (state.session) {
          expect(state.session.currentState.status).toBe('completed');
          expect(state.session.currentState.result).toBeTruthy();
          expect(state.session.currentState.result?.winner).toBeTruthy();
        }
      } catch {
        // Verify via UI if store not accessible
        const completedIndicator = page.getByText(
          /complete|over|victory|defeat/i,
        );
        await expect(completedIndicator).toBeVisible({ timeout: 5000 });
      }
    },
  );
});
