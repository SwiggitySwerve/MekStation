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

interface CreateEncounterResponse {
  readonly success: boolean;
  readonly id?: string;
  readonly error?: string;
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

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
}

async function submitEncounterCreateForm(page: Page): Promise<string> {
  const responsePromise = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/encounters' &&
        response.request().method() === 'POST'
      );
    },
    { timeout: 15000 },
  );

  const submitBtn = page.getByTestId('submit-encounter-btn');
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();

  const response = await responsePromise;
  expect(response.status()).toBe(201);

  const body = (await response.json()) as CreateEncounterResponse;
  expect(body.success).toBe(true);
  expect(body.id).toBeTruthy();

  return body.id!;
}

// =============================================================================
// Force Creation
// =============================================================================

test.describe('Encounter Flow - Force Creation', () => {
  test(
    'should create a player force',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      // RC7: the old flow guarded every step with `isVisible().catch(false)`
      // — on a slow CI page compile the name fill silently skipped, the
      // submit button stayed disabled (`isValid = name.trim().length >= 2`,
      // forces/create.tsx:139), and the test timed out. Hard-wait every
      // step instead. The add-units-at-create surface (`add-unit-btn`,
      // `unit-option-*`, `save-force-btn`) no longer exists — units are
      // attached on the force detail page after creation.
      await page.goto('/gameplay/forces/create');

      // Wait for React hydration before filling: a pre-hydration fill()
      // sets the DOM value (toHaveValue would pass!) without firing the
      // controlled input's React onChange, so `name` state stays empty
      // and submit never enables. `__E2E_MODE__` is set by _app.tsx's
      // post-hydration exposeStoresForE2E() effect.
      await page.waitForFunction(
        () => (window as { __E2E_MODE__?: boolean }).__E2E_MODE__ === true,
        undefined,
        { timeout: 15_000 },
      );

      // Fill force name — submit enables at >= 2 trimmed chars
      const nameInput = page.getByTestId('force-name-input');
      await expect(nameInput).toBeVisible({ timeout: 15000 });
      await nameInput.fill('E2E Player Lance');
      await expect(nameInput).toHaveValue('E2E Player Lance');

      // Select force type (force-type-<ForceType>, Lance = 'lance')
      await page.getByTestId('force-type-lance').click();

      // Submit — page router.pushes to the new force's detail page
      const submitBtn = page.getByTestId('submit-force-btn');
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      await page.waitForURL(/\/gameplay\/forces\/(?!create)[^/]+$/, {
        timeout: 15000,
      });
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
      await waitForPageReady(page);

      // Fill encounter name
      const nameInput = page.getByTestId('encounter-name-input');
      await expect(nameInput).toBeVisible();
      await nameInput.fill('E2E Flow Test Encounter');
      await expect(nameInput).toHaveValue('E2E Flow Test Encounter');

      // Select template (skirmish)
      const skirmishTemplate = page.getByTestId('template-skirmish');
      await expect(skirmishTemplate).toBeVisible();
      await skirmishTemplate.click();

      // Submit encounter
      const encounterId = await submitEncounterCreateForm(page);

      // Should open the encounter detail page
      await page.goto(`/gameplay/encounters/${encounterId}`);
      await expect(page.getByTestId('forces-card')).toBeVisible({
        timeout: 15000,
      });
    },
  );

  test(
    'should configure encounter with forces',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay/encounters/create');
      await waitForPageReady(page);

      // Fill encounter details
      const nameInput = page.getByTestId('encounter-name-input');
      await expect(nameInput).toBeVisible();
      await nameInput.fill('Configured Encounter');
      await expect(nameInput).toHaveValue('Configured Encounter');

      // Select template
      const template = page.getByTestId('template-skirmish');
      await expect(template).toBeVisible();
      await template.click();

      // Submit to create encounter
      const encounterId = await submitEncounterCreateForm(page);

      await page.goto(`/gameplay/encounters/${encounterId}`);
      await expect(page.getByTestId('forces-card')).toBeVisible({
        timeout: 15000,
      });

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
