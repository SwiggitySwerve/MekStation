/**
 * GameplayLayout slot identity regression gate
 *
 * Locks in the slot-identity contract for the tactical-combat GameplayLayout
 * BEFORE Wave 7.1 PR-B refactors it into the TacticalCommandShell slot model.
 *
 * The failure mode this catches (Council Momus Attack #4):
 *   Shell migration produces a parallel layout hierarchy — e.g. shell wraps
 *   GameplayLayout instead of replacing it, leaving two `[data-testid="gameplay-layout"]`
 *   elements mounted simultaneously. The visual surface looks correct but the
 *   slot contract is silently broken (focus order, screen reader nav, event
 *   binding, persistence scope all duplicate). No existing test mounts the
 *   layout end-to-end and asserts cardinality, so the failure ships.
 *
 * This gate asserts each named structural slot resolves to EXACTLY ONE
 * element (or zero on viewports that don't render it). After Wave 7.1's
 * migration the test re-runs against the slot-composition shell; any
 * cardinality drift fails the gate. Visual regression coverage is the
 * separate concern of `e2e/visual-regression.spec.ts`.
 *
 * @spec openspec/changes/add-tactical-command-shell/tasks.md (Wave 7.0 gate)
 * @tags @smoke @game @wave-7-gate
 */

import { test, expect } from '@playwright/test';

import { GameSessionPage } from './pages/game.page';

test.describe('GameplayLayout slot identity @smoke @game @wave-7-gate', () => {
  test.beforeEach(async ({ page }) => {
    const session = new GameSessionPage(page);
    await session.navigate('demo');
    await session.waitForGameLoaded();
  });

  test('root layout container resolves exactly once', async ({ page }) => {
    // Parallel-hierarchy guard: shell migration must REPLACE GameplayLayout's
    // root, not wrap it. A duplicate testid means the old layout is still
    // mounted alongside the new shell.
    const roots = page.locator('[data-testid="gameplay-layout"]');
    await expect(roots).toHaveCount(1);
  });

  test('main content slot resolves exactly once', async ({ page }) => {
    const mainContent = page.locator('[data-testid="gameplay-main-content"]');
    await expect(mainContent).toHaveCount(1);
  });

  test('map-center slot (map-panel) resolves exactly once', async ({
    page,
  }) => {
    // The map is the canonical center slot — its identity is the most
    // load-bearing for hex-click coordinate routing.
    const mapPanel = page.locator('[data-testid="map-panel"]');
    await expect(mapPanel).toHaveCount(1);
    await expect(mapPanel.first()).toBeVisible();
  });

  test('right-tray slot (record-sheet-panel) resolves on desktop width', async ({
    page,
  }) => {
    // Desktop viewport (1280px from playwright.config.ts) renders the
    // split-pane record-sheet-panel; mobile uses RecordSheetDrawer instead.
    // This test runs in the `chromium` project (1280x720). The mobile
    // project skips it via the visibility check.
    const recordSheet = page.locator('[data-testid="record-sheet-panel"]');
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await expect(recordSheet).toHaveCount(1);
    } else {
      // Mobile: record-sheet-panel is replaced by the drawer; either absent
      // or present-but-collapsed. We don't assert on absence to keep this
      // robust against the drawer's rendering choice.
      const count = await recordSheet.count();
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  test('no duplicate slot ids anywhere in the gameplay layout subtree', async ({
    page,
  }) => {
    // Defense-in-depth against parallel-hierarchy bugs that miss the
    // narrow per-slot assertions above. Walks every data-testid below the
    // root and asserts each structural slot appears at most once. Per-unit
    // / per-action testids on children are allowed to repeat — they live
    // inside list containers and are list items, not slots.
    const rootHandle = page.locator('[data-testid="gameplay-layout"]');
    await expect(rootHandle).toHaveCount(1);

    const allIds = await rootHandle
      .locator('[data-testid]')
      .evaluateAll((nodes) =>
        (nodes as HTMLElement[]).map((node) =>
          node.getAttribute('data-testid'),
        ),
      );

    // The layout shell's own structural slots — none of these should ever
    // duplicate. 0 is acceptable on viewports that don't render the slot
    // (e.g. record-sheet-panel on mobile); duplicates are not.
    const structuralSlots = [
      'gameplay-main-content',
      'map-panel',
      'record-sheet-panel',
      'resize-handle',
    ];

    for (const slot of structuralSlots) {
      const count = allIds.filter((id) => id === slot).length;
      expect(
        count,
        `slot "${slot}" appeared ${count} times`,
      ).toBeLessThanOrEqual(1);
    }
  });
});
