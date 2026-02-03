import { test, expect, Page } from '@playwright/test';

/**
 * UX Audit Capture Suite
 * 
 * Captures ~530 screenshots across 4 viewports (375, 768, 1024, 1280) for comprehensive UX review.
 * 
 * Run with: npx playwright test --grep @audit
 * 
 * Screenshot organization:
 * - PRIMARY routes: captured at all 4 viewports
 * - SECONDARY routes: captured at phone (375) + desktop (1280) only
 * - DIALOG routes: captured at phone (375) + desktop (1280) when triggered
 * - Touch overlays: captured at phone (375) only for key interaction pages
 * 
 * All screenshots saved to: .sisyphus/evidence/screenshots/
 * Naming convention: {route-slug}_{viewport}_{state}.png (viewport added by Playwright)
 */

const testData = {
  units: {
    battlemech: 'akuma-aku-1x',
    vehicle: 'battle-tripod-r-h3l-2x',
    aerospace: 'wing-wraith-tr4',
    battleArmor: 'anubis-abs-3l',
    infantry: 'alfar-al-a1',
    protomech: 'amarok-2',
  },
  equipment: 'medium-laser',
  rule: 'structure',
  pilot: 'pilot-131cf888-5b53-4ef3-a905-037fa83352c5',
  force: 'force-b62e773d-87b1-407e-a63b-a8e048b8d3bd',
  encounter: 'encounter-be2c62e5-3dc8-40d6-850d-c8db31bb0d94',
  customUnit: 'custom-a12fe19c-bd97-46ac-9f81-0c4b99bfa2de',
  campaign: null as string | null,
  game: null as string | null,
};

// Helper: Add touch target overlay
async function addTouchTargetOverlay(page: Page) {
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      button, a, [role="button"], input, select, textarea, [onclick] {
        outline: 2px solid rgba(255, 0, 0, 0.5) !important;
      }
    `;
    document.head.appendChild(style);
  });
}

// Helper: Wait for page to be ready
async function waitForPageReady(page: Page) {
   await page.waitForLoadState('networkidle');
   // Small delay for animations to settle
   await page.waitForTimeout(300);
}

test.describe('UX Audit Capture Suite @audit', () => {
  
  // ============================================================================
  // 1. HOME & GLOBAL
  // ============================================================================
  
  test.describe('Home & Global', () => {
    
    test('Home dashboard - primary', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('home.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Home dashboard - pre-services-ready', async ({ page }) => {
      // Capture before IndexedDB/equipment registry init
      await page.goto('/');
      // Don't wait for networkidle - capture early state
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('home_pre-ready.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Settings - appearance default', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('settings_default.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Settings - customizer section', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      // Click customizer section to expand
      await page.click('button:has-text("Customizer")');
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('settings_customizer.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Settings - p2p sync section', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      // Click p2p sync section
      await page.click('button:has-text("P2P Sync")');
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('settings_p2p-sync.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Settings - vault section', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      // Click vault section
      await page.click('button:has-text("Vault")');
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('settings_vault.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Settings - accessibility section', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      // Click accessibility section
      await page.click('button:has-text("Accessibility")');
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('settings_accessibility.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Contacts page', async ({ page }) => {
      await page.goto('/contacts');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('contacts.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 2. COMPENDIUM
  // ============================================================================
  
  test.describe('Compendium', () => {
    
    test('Compendium hub', async ({ page }) => {
      await page.goto('/compendium');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('compendium-hub.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium hub - search active', async ({ page }) => {
      await page.goto('/compendium');
      await waitForPageReady(page);
      // Trigger search
      await page.click('input[placeholder*="Search"]');
      await page.fill('input[placeholder*="Search"]', 'engine');
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('compendium-hub_search.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium units - populated', async ({ page }) => {
      await page.goto('/compendium/units');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('compendium-units_populated.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium units - empty', async ({ page }) => {
      await page.goto('/compendium/units?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('compendium-units_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium units - filtered', async ({ page }) => {
      await page.goto('/compendium/units');
      await waitForPageReady(page);
      // Apply era filter if available
      const filterButton = await page.$('button:has-text("Filter")');
      if (filterButton) {
        await filterButton.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('compendium-units_filtered.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium unit detail', async ({ page }) => {
      const unitId = testData.units.battlemech;
      await page.goto(`/compendium/units/${unitId}`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('compendium-unit-detail.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium equipment - populated', async ({ page }) => {
      await page.goto('/compendium/equipment');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('compendium-equipment_populated.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium equipment - empty', async ({ page }) => {
      await page.goto('/compendium/equipment?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('compendium-equipment_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium equipment - filtered', async ({ page }) => {
      await page.goto('/compendium/equipment');
      await waitForPageReady(page);
      const filterButton = await page.$('button:has-text("Filter")');
      if (filterButton) {
        await filterButton.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('compendium-equipment_filtered.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium equipment detail', async ({ page }) => {
      const equipId = testData.equipment;
      await page.goto(`/compendium/equipment/${equipId}`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('compendium-equip-detail.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium rules', async ({ page }) => {
      await page.goto('/compendium/rules');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('compendium-rules.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium rules - section expanded', async ({ page }) => {
      await page.goto('/compendium/rules');
      await waitForPageReady(page);
      // Click first expandable section
      const firstSection = await page.$('button[aria-expanded="false"]');
      if (firstSection) {
        await firstSection.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('compendium-rules_expanded.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 3. UNIT MANAGEMENT
  // ============================================================================
  
  test.describe('Unit Management', () => {
    
    test('My units - populated', async ({ page }) => {
      await page.goto('/units');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('my-units_populated.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('My units - empty', async ({ page }) => {
      // Navigate with filter to show empty state
      await page.goto('/units?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('my-units_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Shared items - received', async ({ page }) => {
      await page.goto('/shared');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('shared_received.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Shared items - sent', async ({ page }) => {
      await page.goto('/shared');
      await waitForPageReady(page);
      // Click "Shared by me" tab if available
      const sentTab = await page.$('button:has-text("Shared by me")');
      if (sentTab) {
        await sentTab.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('shared_sent.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Shared items - empty', async ({ page }) => {
      await page.goto('/shared?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('shared_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Unit detail', async ({ page }) => {
      const unitId = testData.units.battlemech;
      await page.goto(`/units/${unitId}`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('unit-detail.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 4. CUSTOMIZER - BATTLEMECH (7 tabs)
  // ============================================================================
  
  test.describe('Customizer - BattleMech', () => {
    const mechId = testData.units.battlemech;

    test('Customizer empty state', async ({ page }) => {
      await page.goto('/customizer');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer BattleMech - overview', async ({ page }) => {
      await page.goto(`/customizer/${mechId}/overview`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-overview-mech.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer BattleMech - structure', async ({ page }) => {
      await page.goto(`/customizer/${mechId}/structure`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-structure-mech.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer BattleMech - armor grid', async ({ page }) => {
      await page.goto(`/customizer/${mechId}/armor`);
      await waitForPageReady(page);
      // Ensure grid mode is active
      const gridButton = await page.$('button:has-text("Grid")');
      if (gridButton) {
        await gridButton.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('customizer-armor-mech_grid.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer BattleMech - armor silhouette', async ({ page }) => {
      await page.goto(`/customizer/${mechId}/armor`);
      await waitForPageReady(page);
      // Switch to silhouette mode
      const silhouetteButton = await page.$('button:has-text("Silhouette")');
      if (silhouetteButton) {
        await silhouetteButton.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('customizer-armor-mech_silhouette.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer BattleMech - equipment', async ({ page }) => {
      await page.goto(`/customizer/${mechId}/equipment`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-equip-mech.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer BattleMech - criticals', async ({ page }) => {
      await page.goto(`/customizer/${mechId}/criticals`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-crits-mech.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer BattleMech - fluff', async ({ page }) => {
      await page.goto(`/customizer/${mechId}/fluff`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-fluff-mech.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer BattleMech - preview', async ({ page }) => {
      await page.goto(`/customizer/${mechId}/preview`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-preview-mech.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 5. CUSTOMIZER - VEHICLE (4 tabs)
  // ============================================================================
  
  test.describe('Customizer - Vehicle', () => {
    const vehicleId = testData.units.vehicle;

    test('Customizer Vehicle - structure', async ({ page }) => {
      await page.goto(`/customizer/${vehicleId}/structure`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-structure-vehicle.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer Vehicle - armor', async ({ page }) => {
      await page.goto(`/customizer/${vehicleId}/armor`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-armor-vehicle.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer Vehicle - equipment', async ({ page }) => {
      await page.goto(`/customizer/${vehicleId}/equipment`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-equip-vehicle.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer Vehicle - turret', async ({ page }) => {
      await page.goto(`/customizer/${vehicleId}/turret`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-turret-vehicle.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 6. CUSTOMIZER - AEROSPACE (3 tabs)
  // ============================================================================
  
  test.describe('Customizer - Aerospace', () => {
    const aeroId = testData.units.aerospace;

    test('Customizer Aerospace - structure', async ({ page }) => {
      await page.goto(`/customizer/${aeroId}/structure`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-structure-aero.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer Aerospace - armor', async ({ page }) => {
      await page.goto(`/customizer/${aeroId}/armor`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-armor-aero.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer Aerospace - equipment', async ({ page }) => {
      await page.goto(`/customizer/${aeroId}/equipment`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-equip-aero.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 7. CUSTOMIZER - BATTLE ARMOR (2 tabs)
  // ============================================================================
  
  test.describe('Customizer - Battle Armor', () => {
    const baId = testData.units.battleArmor;

    test('Customizer Battle Armor - structure', async ({ page }) => {
      await page.goto(`/customizer/${baId}/structure`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-structure-ba.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer Battle Armor - squad', async ({ page }) => {
      await page.goto(`/customizer/${baId}/squad`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-squad-ba.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 8. CUSTOMIZER - INFANTRY (1 view)
  // ============================================================================
  
  test.describe('Customizer - Infantry', () => {
    const infantryId = testData.units.infantry;

    test('Customizer Infantry', async ({ page }) => {
      await page.goto(`/customizer/${infantryId}`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-infantry.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 9. CUSTOMIZER - PROTOMECH (1 view)
  // ============================================================================
  
  test.describe('Customizer - ProtoMech', () => {
    const protomechId = testData.units.protomech;

    test('Customizer ProtoMech', async ({ page }) => {
      await page.goto(`/customizer/${protomechId}`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('customizer-protomech.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 10. GAMEPLAY - PILOTS
  // ============================================================================
  
  test.describe('Gameplay - Pilots', () => {
    
    test('Pilots roster - populated', async ({ page }) => {
      await page.goto('/gameplay/pilots');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('pilots_populated.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Pilots roster - empty', async ({ page }) => {
      await page.goto('/gameplay/pilots?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('pilots_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Pilots roster - filtered', async ({ page }) => {
      await page.goto('/gameplay/pilots');
      await waitForPageReady(page);
      const filterButton = await page.$('button:has-text("Filter")');
      if (filterButton) {
        await filterButton.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('pilots_filtered.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Pilot creation - closed', async ({ page }) => {
      await page.goto('/gameplay/pilots/create');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('pilot-create_closed.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Pilot creation - step 1 mode', async ({ page }) => {
      await page.goto('/gameplay/pilots/create');
      await waitForPageReady(page);
      const openButton = await page.$('button:has-text("Open Creation Wizard")');
      if (openButton) {
        await openButton.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('pilot-create_step1-mode.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Pilot detail', async ({ page }) => {
      const pilotId = testData.pilot;
      await page.goto(`/gameplay/pilots/${pilotId}`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('pilot-detail.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 11. GAMEPLAY - FORCES
  // ============================================================================
  
  test.describe('Gameplay - Forces', () => {
    
    test('Forces roster - populated', async ({ page }) => {
      await page.goto('/gameplay/forces');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('forces_populated.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Forces roster - empty', async ({ page }) => {
      await page.goto('/gameplay/forces?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('forces_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Force creation form', async ({ page }) => {
      await page.goto('/gameplay/forces/create');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('force-create.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Force detail - overview', async ({ page }) => {
      const forceId = testData.force;
      await page.goto(`/gameplay/forces/${forceId}`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('force-detail_overview.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Force detail - units tab', async ({ page }) => {
      const forceId = testData.force;
      await page.goto(`/gameplay/forces/${forceId}`);
      await waitForPageReady(page);
      const unitsTab = await page.$('button:has-text("Units")');
      if (unitsTab) {
        await unitsTab.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('force-detail_units.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Force detail - personnel tab', async ({ page }) => {
      const forceId = testData.force;
      await page.goto(`/gameplay/forces/${forceId}`);
      await waitForPageReady(page);
      const personnelTab = await page.$('button:has-text("Personnel")');
      if (personnelTab) {
        await personnelTab.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('force-detail_personnel.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Force detail - history tab', async ({ page }) => {
      const forceId = testData.force;
      await page.goto(`/gameplay/forces/${forceId}`);
      await waitForPageReady(page);
      const historyTab = await page.$('button:has-text("History")');
      if (historyTab) {
        await historyTab.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('force-detail_history.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 12. GAMEPLAY - ENCOUNTERS
  // ============================================================================
  
  test.describe('Gameplay - Encounters', () => {
    
    test('Encounters list - populated', async ({ page }) => {
      await page.goto('/gameplay/encounters');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('encounters_populated.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Encounters list - empty', async ({ page }) => {
      await page.goto('/gameplay/encounters?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('encounters_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Encounter creation - step 1', async ({ page }) => {
      await page.goto('/gameplay/encounters/create');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('encounter-create_step1.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Encounter detail - overview', async ({ page }) => {
      const encounterId = testData.encounter;
      await page.goto(`/gameplay/encounters/${encounterId}`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('encounter-detail_overview.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Encounter detail - map tab', async ({ page }) => {
      const encounterId = testData.encounter;
      await page.goto(`/gameplay/encounters/${encounterId}`);
      await waitForPageReady(page);
      const mapTab = await page.$('button:has-text("Map")');
      if (mapTab) {
        await mapTab.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('encounter-detail_map.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Encounter detail - modifiers tab', async ({ page }) => {
      const encounterId = testData.encounter;
      await page.goto(`/gameplay/encounters/${encounterId}`);
      await waitForPageReady(page);
      const modifiersTab = await page.$('button:has-text("Modifiers")');
      if (modifiersTab) {
        await modifiersTab.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('encounter-detail_modifiers.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Encounter detail - history tab', async ({ page }) => {
      const encounterId = testData.encounter;
      await page.goto(`/gameplay/encounters/${encounterId}`);
      await waitForPageReady(page);
      const historyTab = await page.$('button:has-text("History")');
      if (historyTab) {
        await historyTab.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('encounter-detail_history.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 13. GAMEPLAY - CAMPAIGNS
  // ============================================================================
  
  test.describe('Gameplay - Campaigns', () => {
    
    test('Campaigns list - populated', async ({ page }) => {
      await page.goto('/gameplay/campaigns');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('campaigns_populated.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Campaigns list - empty', async ({ page }) => {
      await page.goto('/gameplay/campaigns?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('campaigns_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Campaign creation form', async ({ page }) => {
      await page.goto('/gameplay/campaigns/create');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('campaign-create.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Campaign detail - dashboard', async ({ page }) => {
      // Use null campaign ID if available, otherwise skip
      if (testData.campaign) {
        await page.goto(`/gameplay/campaigns/${testData.campaign}`);
        await waitForPageReady(page);
        await expect(page).toHaveScreenshot('campaign-detail_dashboard.png', {
          fullPage: true,
          animations: 'disabled',
        });
      }
    });
  });

  // ============================================================================
  // 14. GAMEPLAY - QUICK GAME
  // ============================================================================
  
  test.describe('Gameplay - Quick Game', () => {
    
    test('Quick game welcome', async ({ page }) => {
      await page.goto('/gameplay/quick');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('quickgame_welcome.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 15. GAMEPLAY - GAMES & REPLAY
  // ============================================================================
  
  test.describe('Gameplay - Games & Replay', () => {
    
    test('Games history - populated', async ({ page }) => {
      await page.goto('/gameplay/games');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('games_populated.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Games history - empty', async ({ page }) => {
      await page.goto('/gameplay/games?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('games_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 16. GAMEPLAY - REPAIR
  // ============================================================================
  
  test.describe('Gameplay - Repair', () => {
    
    test('Repair queue - populated', async ({ page }) => {
      await page.goto('/gameplay/repair');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('repair_all.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Repair queue - empty', async ({ page }) => {
      await page.goto('/gameplay/repair?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('repair_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 17. COMPARISON
  // ============================================================================
  
  test.describe('Comparison', () => {
    
    test('Comparison - empty', async ({ page }) => {
      await page.goto('/compare');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('compare_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Comparison - 2 units', async ({ page }) => {
      await page.goto('/compare');
      await waitForPageReady(page);
      // Add units to comparison if possible
      const searchInput = await page.$('input[placeholder*="Search"]');
      if (searchInput) {
        await searchInput.click();
        await searchInput.fill('atlas');
        await page.waitForTimeout(300);
        const firstResult = await page.$('button:has-text("Atlas")');
        if (firstResult) {
          await firstResult.click();
          await page.waitForTimeout(300);
        }
      }
      await expect(page).toHaveScreenshot('compare_2-units.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 18. AUDIT & TIMELINE
  // ============================================================================
  
  test.describe('Audit & Timeline', () => {
    
    test('Timeline - loaded', async ({ page }) => {
      await page.goto('/audit/timeline');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('timeline_loaded.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Timeline - filtered', async ({ page }) => {
      await page.goto('/audit/timeline');
      await waitForPageReady(page);
      const filterButton = await page.$('button:has-text("Filter")');
      if (filterButton) {
        await filterButton.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('timeline_filtered.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 19. SHARING & VAULT
  // ============================================================================
  
  test.describe('Sharing & Vault', () => {
    
    test('Share hub - populated', async ({ page }) => {
      await page.goto('/share');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('share_populated.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Share hub - empty', async ({ page }) => {
      await page.goto('/share?search=zzzzzzzzzzzzzzzzzzz');
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('share_empty.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ============================================================================
  // 20. TOUCH TARGET OVERLAYS (Mobile-specific)
  // ============================================================================
  
  test.describe('Touch Target Overlays @mobile-audit', () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

    test('Home - touch targets', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);
      await addTouchTargetOverlay(page);
      await expect(page).toHaveScreenshot('home_touch-targets.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Compendium units - touch targets', async ({ page }) => {
      await page.goto('/compendium/units');
      await waitForPageReady(page);
      await addTouchTargetOverlay(page);
      await expect(page).toHaveScreenshot('compendium-units_touch-targets.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Customizer BattleMech equipment - touch targets', async ({ page }) => {
      const mechId = testData.units.battlemech;
      await page.goto(`/customizer/${mechId}/equipment`);
      await waitForPageReady(page);
      await addTouchTargetOverlay(page);
      await expect(page).toHaveScreenshot('customizer-equip-mech_touch-targets.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Pilots roster - touch targets', async ({ page }) => {
      await page.goto('/gameplay/pilots');
      await waitForPageReady(page);
      await addTouchTargetOverlay(page);
      await expect(page).toHaveScreenshot('pilots_touch-targets.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Settings - touch targets', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      await addTouchTargetOverlay(page);
      await expect(page).toHaveScreenshot('settings_touch-targets.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });
});
