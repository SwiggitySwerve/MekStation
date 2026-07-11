/**
 * Inventory guard test (design D5/D9, task 3.2).
 *
 * Structural checks only -- no browser navigation, no `page` fixture. Fails
 * the moment `screenInventory.ts` drifts from the manifest or from D9's
 * per-viewport coverage rule, so a new route or a narrowed affordance set
 * cannot silently fall out of the sweep's classification.
 */

import { expect, test } from '@playwright/test';

import appShellRouteManifest from '../app-shell-route-manifest.json';
import {
  ALL_SWEEP_VIEWPORT_LABELS,
  SCREEN_INVENTORY,
  SWEPT_NOW_ENTRIES,
  TEST_HARNESS_ROUTE_PATTERNS,
  type ScreenInventoryEntry,
} from './screenInventory';

/** Every manifest primary/recovery/delegated route path or pattern, raw. */
function manifestRoutesRequiringClassification(): readonly string[] {
  return [
    ...appShellRouteManifest.primaryRoutes.map((route) => route.path),
    ...appShellRouteManifest.recoveryRoutes.map((route) => route.path),
    ...appShellRouteManifest.delegatedRoutes.flatMap((group) => group.patterns),
  ];
}

test.describe('Viewport layout sweep -- screen inventory guard', () => {
  test('every manifest route has exactly one inventory classification', () => {
    const coverage = new Map<string, string>();
    for (const entry of SCREEN_INVENTORY) {
      for (const manifestPath of entry.manifestPaths) {
        const existing = coverage.get(manifestPath);
        expect(
          existing,
          `Manifest route "${manifestPath}" is classified by both "${existing}" and "${entry.id}" -- exactly one classification is required`,
        ).toBeUndefined();
        coverage.set(manifestPath, entry.id);
      }
    }

    for (const manifestPath of manifestRoutesRequiringClassification()) {
      expect(
        coverage.has(manifestPath),
        `Manifest route "${manifestPath}" has no inventory classification`,
      ).toBe(true);
    }
  });

  test('harness routes are auto-excluded and require no inventory entry', () => {
    // Harness routes are dev/e2e-only surfaces owned by their own focused
    // specs (see the manifest's testHarnessRoutes reason) -- they are never
    // part of the app-shell screen inventory and never need a classification.
    const inventoryPaths = new Set(
      SCREEN_INVENTORY.flatMap((entry) => entry.manifestPaths),
    );
    for (const harnessPattern of TEST_HARNESS_ROUTE_PATTERNS) {
      expect(
        inventoryPaths.has(harnessPattern),
        `Harness route "${harnessPattern}" should not appear in the screen inventory (auto-excluded)`,
      ).toBe(false);
    }
  });

  test('every excluded entry has a non-empty reason', () => {
    const excludedEntries = SCREEN_INVENTORY.filter(
      (entry): entry is Extract<ScreenInventoryEntry, { class: 'excluded' }> =>
        entry.class === 'excluded',
    );
    expect(excludedEntries.length).toBeGreaterThan(0);
    for (const entry of excludedEntries) {
      expect(
        entry.reason.trim().length,
        `Excluded entry "${entry.id}" has an empty reason`,
      ).toBeGreaterThan(0);
    }
  });

  test('every quarantine entry has a non-empty reason and follow-up', () => {
    for (const entry of SWEPT_NOW_ENTRIES) {
      for (const quarantineEntry of entry.quarantine ?? []) {
        expect(
          quarantineEntry.reason.trim().length,
          `Quarantine entry on "${entry.id}" (${quarantineEntry.viewport}/${quarantineEntry.check}) has an empty reason`,
        ).toBeGreaterThan(0);
        expect(
          quarantineEntry.followUp.trim().length,
          `Quarantine entry on "${entry.id}" (${quarantineEntry.viewport}/${quarantineEntry.check}) has an empty follow-up`,
        ).toBeGreaterThan(0);
      }
    }
  });

  test('every swept screen declares an applicable primary affordance at every sweep viewport', () => {
    expect(ALL_SWEEP_VIEWPORT_LABELS.length).toBe(4);

    for (const entry of SWEPT_NOW_ENTRIES) {
      expect(
        entry.primaryAffordances.length,
        `Swept entry "${entry.id}" declares no primary affordances`,
      ).toBeGreaterThan(0);

      for (const viewport of ALL_SWEEP_VIEWPORT_LABELS) {
        const hasApplicableAffordance = entry.primaryAffordances.some(
          (target) => !target.viewports || target.viewports.includes(viewport),
        );
        expect(
          hasApplicableAffordance,
          `Swept entry "${entry.id}" has no primary affordance applicable at viewport "${viewport}"`,
        ).toBe(true);
      }
    }
  });

  test('classification counts sum to the manifest route arithmetic', () => {
    const counts = new Map<string, number>();
    for (const entry of SCREEN_INVENTORY) {
      counts.set(entry.class, (counts.get(entry.class) ?? 0) + 1);
    }

    // 28 standalone (unique primary route files) + 2 recovery + 3 static-catalog
    // + 18 pack-seeded + 13 excluded = 64 entries; 5 harness patterns are
    // auto-excluded and never enter the inventory (design D5 context).
    expect(counts.get('standalone')).toBe(28);
    expect(counts.get('recovery')).toBe(2);
    expect(counts.get('static-catalog')).toBe(3);
    expect(counts.get('pack-seeded')).toBe(18);
    expect(counts.get('excluded')).toBe(13);
    expect(SCREEN_INVENTORY.length).toBe(64);
    expect(SWEPT_NOW_ENTRIES.length).toBe(33);
  });
});
