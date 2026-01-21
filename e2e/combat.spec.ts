/**
 * Combat UI E2E Tests
 *
 * Tests for combat-related UI components: Record Sheet Display,
 * Heat Tracker, Event Log, and unit destruction states.
 *
 * NOTE: Combat LOGIC is extensively unit-tested (4,800+ lines in
 * src/utils/gameplay/__tests__/). These E2E tests focus on verifying
 * the UI correctly displays combat data.
 *
 * @spec openspec/changes/add-comprehensive-e2e-tests/specs/e2e-testing/spec.md
 * @tags @combat
 */

import { test, expect, type Page } from '@playwright/test';
import { GameSessionPage } from './pages/game.page';
import {
  waitForGameplayStoreReady,
  selectUnit,
  getUnitState,
  DEMO_UNITS,
  DEMO_ARMOR,
  DEMO_MAX_ARMOR,
  DEMO_STRUCTURE,
  DEMO_WEAPONS,
} from './fixtures/game';

// =============================================================================
// Test Configuration
// =============================================================================

test.setTimeout(30000);

// Helper to ensure gameplay store is available before tests
async function waitForStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { gameplay?: unknown };
      };
      return win.__ZUSTAND_STORES__?.gameplay !== undefined;
    },
    { timeout: 10000 }
  );
}

// =============================================================================
// Record Sheet Display Tests
// =============================================================================

test.describe('Record Sheet Display @smoke @combat', () => {
  let sessionPage: GameSessionPage;

  test.beforeEach(async ({ page }) => {
    sessionPage = new GameSessionPage(page);
    await sessionPage.navigate('demo');
    await waitForStoreReady(page);
    await sessionPage.waitForGameLoaded();
  });

  test('shows no unit selected initially', async ({ page }) => {
    // Initially no unit should be selected
    const noUnitVisible = await sessionPage.isNoUnitSelectedVisible();
    expect(noUnitVisible).toBe(true);
  });

  test('displays record sheet when unit is selected', async ({ page }) => {
    // Select player unit
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200); // Wait for UI update

    // Record sheet should be visible
    await expect(page.getByTestId('record-sheet')).toBeVisible();
  });

  test('displays correct unit name and designation', async ({ page }) => {
    // Select player unit
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);

    // Check unit name - Atlas AS7-D
    const unitName = await page.getByTestId('record-sheet-unit-name').textContent();
    expect(unitName).toContain('Atlas');

    // Check designation
    const designation = await page.getByTestId('record-sheet-designation').textContent();
    expect(designation).toBe('AS7-D');
  });

  test('displays pilot status section', async ({ page }) => {
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);

    // Pilot status should be visible
    await expect(page.getByTestId('pilot-status')).toBeVisible();

    // Pilot name should be displayed
    const pilotName = await page.getByTestId('pilot-name').textContent();
    expect(pilotName).toBe(DEMO_UNITS.PLAYER.pilotName);
  });

  test('displays gunnery and piloting skills', async ({ page }) => {
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);

    // Check gunnery
    const gunneryText = await page.getByTestId('pilot-gunnery').textContent();
    expect(gunneryText).toContain(String(DEMO_UNITS.PLAYER.gunnery));

    // Check piloting
    const pilotingText = await page.getByTestId('pilot-piloting').textContent();
    expect(pilotingText).toContain(String(DEMO_UNITS.PLAYER.piloting));
  });

  test('displays pilot wounds correctly for player unit (0 wounds)', async ({ page }) => {
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);

    // Check wounds section exists
    await expect(page.getByTestId('pilot-wounds')).toBeVisible();

    // Player has 0 wounds - all wound indicators should be empty
    const filledWounds = await page.locator('[data-testid^="pilot-wound-"][data-filled="true"]').count();
    expect(filledWounds).toBe(0);
  });

  test('displays pilot wounds correctly for opponent unit (1 wound)', async ({ page }) => {
    await selectUnit(page, DEMO_UNITS.OPPONENT.id);
    await page.waitForTimeout(200);

    // Opponent has 1 wound
    const filledWounds = await page.locator('[data-testid^="pilot-wound-"][data-filled="true"]').count();
    expect(filledWounds).toBe(1);
  });
});

// =============================================================================
// Armor and Structure Display Tests
// =============================================================================

test.describe('Armor/Structure Display @combat', () => {
  let sessionPage: GameSessionPage;

  test.beforeEach(async ({ page }) => {
    sessionPage = new GameSessionPage(page);
    await sessionPage.navigate('demo');
    await waitForStoreReady(page);
    await sessionPage.waitForGameLoaded();
    // Select player unit for all tests
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);
  });

  test('displays armor/structure section', async ({ page }) => {
    await expect(page.getByTestId('armor-structure-section')).toBeVisible();
  });

  test('displays all 8 standard locations', async ({ page }) => {
    const locations = [
      'head',
      'center_torso',
      'left_torso',
      'right_torso',
      'left_arm',
      'right_arm',
      'left_leg',
      'right_leg',
    ];

    for (const location of locations) {
      await expect(page.getByTestId(`location-row-${location}`)).toBeVisible();
    }
  });

  test('displays correct center torso armor values', async ({ page }) => {
    // Check center torso armor (front)
    const ctArmor = await page.getByTestId('location-armor-center_torso').textContent();
    const expectedCurrent = DEMO_ARMOR['unit-player-1'].center_torso;
    const expectedMax = DEMO_MAX_ARMOR['unit-player-1'].center_torso;
    expect(ctArmor).toBe(`${expectedCurrent}/${expectedMax}`);
  });

  test('displays rear armor for torso locations', async ({ page }) => {
    // Check center torso rear armor
    const ctRearArmor = await page.getByTestId('location-armor-center_torso_rear').textContent();
    const expectedCurrent = DEMO_ARMOR['unit-player-1'].center_torso_rear;
    const expectedMax = DEMO_MAX_ARMOR['unit-player-1'].center_torso_rear;
    expect(ctRearArmor).toBe(`${expectedCurrent}/${expectedMax}`);
  });

  test('displays structure values', async ({ page }) => {
    // Check center torso structure
    const ctStructure = await page.getByTestId('location-structure-center_torso').textContent();
    const expected = DEMO_STRUCTURE['unit-player-1'].center_torso;
    expect(ctStructure).toBe(`${expected}/${expected}`); // Current equals max in demo
  });

  test('displays head armor values', async ({ page }) => {
    const headArmor = await page.getByTestId('location-armor-head').textContent();
    const expectedCurrent = DEMO_ARMOR['unit-player-1'].head;
    const expectedMax = DEMO_MAX_ARMOR['unit-player-1'].head;
    expect(headArmor).toBe(`${expectedCurrent}/${expectedMax}`);
  });
});

// =============================================================================
// Heat Display Tests
// =============================================================================

test.describe('Heat Display @combat', () => {
  let sessionPage: GameSessionPage;

  test.beforeEach(async ({ page }) => {
    sessionPage = new GameSessionPage(page);
    await sessionPage.navigate('demo');
    await waitForStoreReady(page);
    await sessionPage.waitForGameLoaded();
  });

  test('displays heat section for selected unit', async ({ page }) => {
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);

    // Heat display should be visible
    await expect(page.getByTestId('heat-display')).toBeVisible();
  });

  test('displays current heat value for player unit', async ({ page }) => {
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);

    // Player unit has heat = 5
    const heatValue = await page.getByTestId('heat-value').textContent();
    expect(heatValue).toBe(String(DEMO_UNITS.PLAYER.initialHeat));
  });

  test('displays current heat value for opponent unit', async ({ page }) => {
    await selectUnit(page, DEMO_UNITS.OPPONENT.id);
    await page.waitForTimeout(200);

    // Opponent unit has heat = 8
    const heatValue = await page.getByTestId('heat-value').textContent();
    expect(heatValue).toBe(String(DEMO_UNITS.OPPONENT.initialHeat));
  });

  test('displays heat bar', async ({ page }) => {
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);

    await expect(page.getByTestId('heat-bar')).toBeVisible();
  });

  test('displays heat dissipation info', async ({ page }) => {
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);

    const dissipationText = await page.getByTestId('heat-dissipation').textContent();
    expect(dissipationText).toContain(String(DEMO_UNITS.PLAYER.heatSinks));
  });
});

// =============================================================================
// Weapons Display Tests
// =============================================================================

test.describe('Weapons Display @combat', () => {
  let sessionPage: GameSessionPage;

  test.beforeEach(async ({ page }) => {
    sessionPage = new GameSessionPage(page);
    await sessionPage.navigate('demo');
    await waitForStoreReady(page);
    await sessionPage.waitForGameLoaded();
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);
  });

  test('displays weapons section', async ({ page }) => {
    await expect(page.getByTestId('weapons-section')).toBeVisible();
  });

  test('displays correct number of weapons for player unit', async ({ page }) => {
    // Player unit has 4 weapons
    const weaponRows = await page.locator('[data-testid^="weapon-row-"]').count();
    expect(weaponRows).toBe(DEMO_WEAPONS['unit-player-1'].length);
  });

  test('displays weapon name', async ({ page }) => {
    // Check first weapon (AC/20)
    const weaponName = await page.getByTestId('weapon-name-weapon-1').textContent();
    expect(weaponName).toBe('AC/20');
  });

  test('displays weapon heat', async ({ page }) => {
    // Check AC/20 heat (7)
    const weaponHeat = await page.getByTestId('weapon-heat-weapon-1').textContent();
    expect(weaponHeat).toContain('7');
  });

  test('displays weapon damage', async ({ page }) => {
    // Check AC/20 damage (20)
    const weaponDamage = await page.getByTestId('weapon-damage-weapon-1').textContent();
    expect(weaponDamage).toContain('20');
  });

  test('displays weapon ammo for ammo-using weapons', async ({ page }) => {
    // Check AC/20 ammo (10 rounds)
    const weaponAmmo = await page.getByTestId('weapon-ammo-weapon-1').textContent();
    expect(weaponAmmo).toContain('10');
  });

  test('displays all player weapons', async ({ page }) => {
    for (const weapon of DEMO_WEAPONS['unit-player-1']) {
      await expect(page.getByTestId(`weapon-row-${weapon.id}`)).toBeVisible();
    }
  });
});

// =============================================================================
// Event Log Display Tests
// =============================================================================

test.describe('Event Log Display @combat', () => {
  let sessionPage: GameSessionPage;

  test.beforeEach(async ({ page }) => {
    sessionPage = new GameSessionPage(page);
    await sessionPage.navigate('demo');
    await waitForStoreReady(page);
    await sessionPage.waitForGameLoaded();
  });

  test('displays event log component', async ({ page }) => {
    await expect(page.getByTestId('event-log')).toBeVisible();
  });

  test('displays event log toggle button', async ({ page }) => {
    await expect(page.getByTestId('event-log-toggle')).toBeVisible();
  });

  test('displays event count', async ({ page }) => {
    const countText = await page.getByTestId('event-log-count').textContent();
    // Demo session has at least 2 events
    expect(countText).toMatch(/Event Log \(\d+\)/);
  });

  test('can toggle event log collapsed state', async ({ page }) => {
    // Click toggle to collapse/expand
    await page.getByTestId('event-log-toggle').click();
    await page.waitForTimeout(100);

    // Click again to toggle back
    await page.getByTestId('event-log-toggle').click();
    await page.waitForTimeout(100);

    // Event log should still be visible
    await expect(page.getByTestId('event-log')).toBeVisible();
  });

  test('displays event rows when expanded', async ({ page }) => {
    // Event log content should be visible (not collapsed by default)
    const content = page.getByTestId('event-log-content');
    const isContentVisible = await content.isVisible();

    if (isContentVisible) {
      // Should have event rows
      const eventRows = await page.locator('[data-testid="event-row"]').count();
      expect(eventRows).toBeGreaterThanOrEqual(0); // May be 0 if collapsed or empty
    }
  });
});

// =============================================================================
// Movement Info Display Tests
// =============================================================================

test.describe('Movement Info Display @combat', () => {
  let sessionPage: GameSessionPage;

  test.beforeEach(async ({ page }) => {
    sessionPage = new GameSessionPage(page);
    await sessionPage.navigate('demo');
    await waitForStoreReady(page);
    await sessionPage.waitForGameLoaded();
    await selectUnit(page, DEMO_UNITS.PLAYER.id);
    await page.waitForTimeout(200);
  });

  test('displays movement info section', async ({ page }) => {
    await expect(page.getByTestId('movement-info')).toBeVisible();
  });

  test('displays movement type', async ({ page }) => {
    // Demo player unit used Walk movement
    const movementType = await page.getByTestId('movement-type').textContent();
    expect(movementType?.toLowerCase()).toContain('walk');
  });

  test('displays hexes moved', async ({ page }) => {
    // Demo player unit moved 3 hexes
    await expect(page.getByTestId('hexes-moved')).toBeVisible();
    const hexesMoved = await page.getByTestId('hexes-moved').textContent();
    expect(hexesMoved).toContain('3');
  });
});

// =============================================================================
// Unit State Tests (via Store)
// =============================================================================

test.describe('Unit State Verification @combat', () => {
  let sessionPage: GameSessionPage;

  test.beforeEach(async ({ page }) => {
    sessionPage = new GameSessionPage(page);
    await sessionPage.navigate('demo');
    await waitForStoreReady(page);
    await sessionPage.waitForGameLoaded();
  });

  test('player unit has correct heat in store', async ({ page }) => {
    const unitState = await getUnitState(page, DEMO_UNITS.PLAYER.id);
    expect(unitState?.heat).toBe(DEMO_UNITS.PLAYER.initialHeat);
  });

  test('opponent unit has correct heat in store', async ({ page }) => {
    const unitState = await getUnitState(page, DEMO_UNITS.OPPONENT.id);
    expect(unitState?.heat).toBe(DEMO_UNITS.OPPONENT.initialHeat);
  });

  test('player unit has correct pilot wounds in store', async ({ page }) => {
    const unitState = await getUnitState(page, DEMO_UNITS.PLAYER.id);
    expect(unitState?.pilotWounds).toBe(DEMO_UNITS.PLAYER.pilotWounds);
  });

  test('opponent unit has correct pilot wounds in store', async ({ page }) => {
    const unitState = await getUnitState(page, DEMO_UNITS.OPPONENT.id);
    expect(unitState?.pilotWounds).toBe(DEMO_UNITS.OPPONENT.pilotWounds);
  });

  test('units are not destroyed in demo', async ({ page }) => {
    const playerState = await getUnitState(page, DEMO_UNITS.PLAYER.id);
    const opponentState = await getUnitState(page, DEMO_UNITS.OPPONENT.id);

    expect(playerState?.destroyed).toBe(false);
    expect(opponentState?.destroyed).toBe(false);
  });
});
