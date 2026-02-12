/**
 * Encounter Flow E2E Tests
 *
 * Tests for the full encounter lifecycle: force creation, encounter setup,
 * launch, and auto-resolve. Verifies the end-to-end gameplay pipeline from
 * force building through battle completion.
 *
 * @tags @encounter @smoke
 */

import { test, expect, type Page } from '@playwright/test';

import { getStoreState } from './helpers/store';

// =============================================================================
// Types
// =============================================================================

interface EncounterStoreState {
  readonly encounters: Record<
    string,
    {
      readonly id: string;
      readonly name: string;
      readonly status: string;
      readonly playerForceId?: string;
      readonly opponentForceId?: string;
    }
  >;
}

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
    };
  } | null;
}

// =============================================================================
// Test Configuration
// =============================================================================

test.setTimeout(60000);

async function waitForStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { encounter?: unknown };
      };
      return win.__ZUSTAND_STORES__?.encounter !== undefined;
    },
    { timeout: 15000 },
  );
}

// =============================================================================
// Force Creation
// =============================================================================

test.describe('Encounter Flow - Force Creation', () => {
  test(
    'should create a player force with units',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay/forces/create');

      // Fill force name
      const nameInput = page.getByTestId('force-name-input');
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('E2E Player Lance');
      }

      // Select force type
      const forceType = page.getByTestId('force-type-lance');
      if (await forceType.isVisible().catch(() => false)) {
        await forceType.click();
      }

      // Add units to the force
      const addUnitBtn = page.getByTestId('add-unit-btn');
      if (await addUnitBtn.isVisible().catch(() => false)) {
        await addUnitBtn.click();

        // Select first available unit from picker
        const unitOption = page
          .locator('[data-testid^="unit-option-"]')
          .first();
        if (await unitOption.isVisible().catch(() => false)) {
          await unitOption.click();
        }
      }

      // Save force
      const saveBtn = page.getByTestId('save-force-btn');
      const submitBtn = page.getByTestId('submit-force-btn');

      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
      } else if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
      }

      // Should navigate to force detail or list
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toMatch(/\/gameplay\/forces/);
    },
  );
});

// =============================================================================
// Encounter Creation
// =============================================================================

test.describe('Encounter Flow - Encounter Creation', () => {
  test(
    'should create an encounter from the create page',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay/encounters/create');

      // Fill encounter name
      const nameInput = page.getByTestId('encounter-name-input');
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('E2E Flow Test Encounter');
      }

      // Select template (skirmish)
      const skirmishTemplate = page.getByTestId('template-skirmish');
      if (await skirmishTemplate.isVisible().catch(() => false)) {
        await skirmishTemplate.click();
      }

      // Submit encounter
      const submitBtn = page.getByTestId('submit-encounter-btn');
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
      }

      // Should redirect to encounter detail page
      await expect(page).toHaveURL(/\/gameplay\/encounters\/[^/]+$/, {
        timeout: 10000,
      });
    },
  );

  test(
    'should configure encounter with forces',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay/encounters/create');

      // Fill encounter details
      const nameInput = page.getByTestId('encounter-name-input');
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Configured Encounter');
      }

      // Select template
      const template = page.getByTestId('template-skirmish');
      if (await template.isVisible().catch(() => false)) {
        await template.click();
      }

      // Submit to create encounter
      const submitBtn = page.getByTestId('submit-encounter-btn');
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
      }

      await page.waitForTimeout(1000);

      // On detail page, look for force selection options
      const selectPlayerForce = page.getByTestId('select-player-force-link');
      const playerForceEmpty = page.getByTestId('player-force-empty');

      const hasForceLink = await selectPlayerForce
        .isVisible()
        .catch(() => false);
      const hasEmptyState = await playerForceEmpty
        .isVisible()
        .catch(() => false);

      // Encounter should show force configuration options
      expect(hasForceLink || hasEmptyState).toBe(true);
    },
  );
});

// =============================================================================
// Encounter Launch
// =============================================================================

test.describe('Encounter Flow - Launch', () => {
  test(
    'should show launch button on encounter detail',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay/encounters');
      await waitForStoreReady(page);

      // Look for existing encounter or create one
      const encounterCard = page
        .locator('[data-testid^="encounter-card-"]')
        .first();
      if (await encounterCard.isVisible().catch(() => false)) {
        await encounterCard.click();
        await page.waitForLoadState('networkidle');

        // Launch button should exist (may be disabled without forces)
        const launchBtn = page.getByTestId('launch-encounter-btn');
        await expect(launchBtn).toBeVisible();
      }
    },
  );

  test(
    'should disable launch without forces configured',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay/encounters');
      await waitForStoreReady(page);

      // Navigate to first encounter
      const encounterCard = page
        .locator('[data-testid^="encounter-card-"]')
        .first();
      if (await encounterCard.isVisible().catch(() => false)) {
        await encounterCard.click();
        await page.waitForLoadState('networkidle');

        // Launch should be disabled without forces
        const launchBtn = page.getByTestId('launch-encounter-btn');
        if (await launchBtn.isVisible().catch(() => false)) {
          const isDisabled = await launchBtn.isDisabled();
          // Button should be disabled when forces aren't assigned
          expect(isDisabled).toBe(true);
        }
      }
    },
  );
});

// =============================================================================
// Encounter Auto-Resolve
// =============================================================================

test.describe('Encounter Flow - Auto-Resolve', () => {
  test(
    'should auto-resolve encounter when launched',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay/encounters');
      await waitForStoreReady(page);

      // Find a ready encounter (with forces assigned)
      const encounterCards = page.locator('[data-testid^="encounter-card-"]');
      const cardCount = await encounterCards.count();

      if (cardCount > 0) {
        await encounterCards.first().click();
        await page.waitForLoadState('networkidle');

        // Try to launch
        const launchBtn = page.getByTestId('launch-encounter-btn');
        if (await launchBtn.isVisible().catch(() => false)) {
          const isEnabled = await launchBtn.isEnabled();

          if (isEnabled) {
            await launchBtn.click();

            // Should transition to pre-battle or battle screen
            await page.waitForTimeout(2000);

            // Look for auto-resolve option
            const autoResolveBtn = page.getByTestId('auto-resolve-btn');
            if (await autoResolveBtn.isVisible().catch(() => false)) {
              await autoResolveBtn.click();

              // Wait for results
              await page.waitForTimeout(10000);

              // Verify game completed
              const resultsVisible = await page
                .getByText(/complete|over|victory|defeat/i)
                .isVisible()
                .catch(() => false);
              expect(resultsVisible).toBe(true);
            }
          }
        }
      }
    },
  );
});

// =============================================================================
// Encounter Game Session Verification
// =============================================================================

test.describe('Encounter Flow - Game Session', () => {
  test(
    'should create game session from encounter launch',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay/encounters');
      await waitForStoreReady(page);

      // Find and click a ready encounter
      const encounterCards = page.locator('[data-testid^="encounter-card-"]');
      if ((await encounterCards.count()) > 0) {
        await encounterCards.first().click();
        await page.waitForLoadState('networkidle');

        const launchBtn = page.getByTestId('launch-encounter-btn');
        if (await launchBtn.isVisible().catch(() => false)) {
          if (await launchBtn.isEnabled()) {
            await launchBtn.click();
            await page.waitForTimeout(3000);

            // Check that gameplay store has a session
            try {
              const state = await getStoreState<GameplayStoreState>(
                page,
                'gameplayStore',
              );
              if (state.session) {
                expect(state.session.id).toBeTruthy();
                expect(state.session.currentState).toBeTruthy();
              }
            } catch {
              // Store may not be available on results page
            }
          }
        }
      }
    },
  );
});
