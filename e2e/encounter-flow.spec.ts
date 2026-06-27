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

import {
  createEncounterWithForces,
  createTestEncounter,
} from './fixtures/encounter';
import { assignPilotAndUnit, createTestLance } from './fixtures/force';
import { createRegularPilot } from './fixtures/pilot';

// =============================================================================
// Types
// =============================================================================

interface AssignmentSlot {
  readonly id: string;
}

interface GameplaySessionProof {
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

const PLAYER_UNIT_ID = 'atlas-as7-d';
const OPPONENT_UNIT_ID = 'marauder-mad-3r';

async function waitForE2EStores(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __E2E_MODE__?: boolean;
        __ZUSTAND_STORES__?: {
          encounter?: unknown;
          force?: unknown;
          gameplay?: unknown;
          pilot?: unknown;
        };
      };
      const stores = win.__ZUSTAND_STORES__;
      return Boolean(
        win.__E2E_MODE__ &&
        stores?.encounter &&
        stores.force &&
        stores.gameplay &&
        stores.pilot,
      );
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

async function firstAssignmentId(page: Page, forceId: string): Promise<string> {
  return page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          force?: {
            getState: () => {
              forces: Array<{
                id: string;
                assignments: readonly AssignmentSlot[];
              }>;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    const force = stores?.force
      ?.getState()
      .forces.find((candidate) => candidate.id === id);
    const assignmentId = force?.assignments[0]?.id;
    if (!assignmentId) {
      throw new Error(`Force ${id} has no assignment slot`);
    }
    return assignmentId;
  }, forceId);
}

async function createAssignedLance({
  page,
  forceName,
  pilotName,
  unitId,
}: {
  readonly page: Page;
  readonly forceName: string;
  readonly pilotName: string;
  readonly unitId: string;
}): Promise<string> {
  const forceId = await createTestLance(page, forceName, 'Mercenary');
  expect(forceId).toBeTruthy();

  const pilotId = await createRegularPilot(page, pilotName);
  expect(pilotId).toBeTruthy();

  const assignmentId = await firstAssignmentId(page, forceId!);
  await expect(
    assignPilotAndUnit(page, assignmentId, pilotId!, unitId),
  ).resolves.toBe(true);

  return forceId!;
}

async function createConfiguredEncounter(
  page: Page,
  label: string,
): Promise<{ encounterId: string; encounterName: string }> {
  await page.goto('/gameplay');
  await waitForE2EStores(page);

  const stamp = `${Date.now()}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const playerForceId = await createAssignedLance({
    page,
    forceName: `${label} Player Lance ${stamp}`,
    pilotName: `${label} Player Pilot ${stamp}`,
    unitId: PLAYER_UNIT_ID,
  });
  const opponentForceId = await createAssignedLance({
    page,
    forceName: `${label} Opponent Lance ${stamp}`,
    pilotName: `${label} Opponent Pilot ${stamp}`,
    unitId: OPPONENT_UNIT_ID,
  });
  const encounterName = `${label} Encounter ${stamp}`;
  const encounterId = await createEncounterWithForces(
    page,
    encounterName,
    playerForceId,
    opponentForceId,
  );

  expect(encounterId).toBeTruthy();
  return { encounterId: encounterId!, encounterName };
}

async function createUnconfiguredEncounter(
  page: Page,
  label: string,
): Promise<string> {
  await page.goto('/gameplay');
  await waitForE2EStores(page);

  const encounterId = await createTestEncounter(page, {
    name: `${label} Encounter ${Date.now()}`,
    template: 'skirmish',
  });
  expect(encounterId).toBeTruthy();
  return encounterId!;
}

async function readGameplaySessionProof(
  page: Page,
): Promise<GameplaySessionProof> {
  return page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => GameplaySessionProof;
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error('Gameplay store not exposed');
    }

    return { session: stores.gameplay.getState().session };
  });
}

// =============================================================================
// Force Creation
// =============================================================================

test.describe('Encounter Flow - Force Creation', () => {
  test(
    'should create a player force',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      // RC7: the old flow guarded every step with optional visibility checks
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
      const { encounterId } = await createConfiguredEncounter(
        page,
        'Configured Flow',
      );

      await page.goto(`/gameplay/encounters/${encounterId}`);
      await expect(page.getByTestId('forces-card')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByTestId('player-force-info')).toBeVisible();
      await expect(page.getByTestId('opponent-force-info')).toBeVisible();
      await expect(page.getByTestId('launch-encounter-btn')).toBeEnabled();
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
      const { encounterId } = await createConfiguredEncounter(
        page,
        'Launch Button Flow',
      );

      await page.goto(`/gameplay/encounters/${encounterId}`);
      await expect(page.getByTestId('encounter-detail-page')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByTestId('launch-encounter-btn')).toBeVisible();
      await expect(page.getByTestId('launch-encounter-btn')).toBeEnabled();
    },
  );

  test(
    'should disable launch without forces configured',
    { tag: ['@encounter', '@smoke'] },
    async ({ page }) => {
      const encounterId = await createUnconfiguredEncounter(
        page,
        'Blocked Launch Flow',
      );

      await page.goto(`/gameplay/encounters/${encounterId}`);
      await expect(page.getByTestId('encounter-detail-page')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByTestId('player-force-empty')).toBeVisible();
      await expect(page.getByTestId('opponent-force-empty')).toBeVisible();
      await expect(page.getByText('Configuration Required')).toBeVisible();
      await expect(page.getByTestId('launch-encounter-btn')).toBeVisible();
      await expect(page.getByTestId('launch-encounter-btn')).toBeDisabled();
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
      const { encounterId, encounterName } = await createConfiguredEncounter(
        page,
        'Auto Resolve Flow',
      );

      await page.goto(`/gameplay/encounters/${encounterId}`);
      await expect(page.getByTestId('launch-encounter-btn')).toBeEnabled({
        timeout: 15000,
      });
      await page.getByTestId('launch-encounter-btn').click();
      await page.waitForURL(`/gameplay/encounters/${encounterId}/pre-battle`, {
        timeout: 20000,
      });
      await expect(
        page.getByRole('heading', { name: `Pre-Battle: ${encounterName}` }),
      ).toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId('mode-selection')).toBeVisible();
      await expect(page.getByTestId('auto-resolve-btn')).toBeEnabled();

      await page.getByTestId('auto-resolve-btn').click();

      await page.waitForURL(/\/gameplay\/games\/[^/?]+$/, {
        timeout: 30000,
      });
      await expect(page.getByTestId('game-completed')).toBeVisible({
        timeout: 20000,
      });
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
      const { encounterId, encounterName } = await createConfiguredEncounter(
        page,
        'Manual Session Flow',
      );

      await page.goto(`/gameplay/encounters/${encounterId}`);
      await expect(page.getByTestId('launch-encounter-btn')).toBeEnabled({
        timeout: 15000,
      });
      await page.getByTestId('launch-encounter-btn').click();
      await page.waitForURL(`/gameplay/encounters/${encounterId}/pre-battle`, {
        timeout: 20000,
      });
      await expect(
        page.getByRole('heading', { name: `Pre-Battle: ${encounterName}` }),
      ).toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId('play-manually-btn')).toBeEnabled();

      await page.getByTestId('play-manually-btn').click();
      await page.waitForURL(/\/gameplay\/games\/[^/?]+$/, {
        timeout: 30000,
      });
      await expect(page.getByTestId('game-session')).toBeVisible({
        timeout: 20000,
      });

      const state = await readGameplaySessionProof(page);
      expect(state.session?.id).toBeTruthy();
      expect(state.session?.currentState.status).toBe('active');
      expect(state.session?.currentState.turn).toBeGreaterThanOrEqual(1);
      expect(state.session?.currentState.phase).toBeTruthy();
    },
  );
});
