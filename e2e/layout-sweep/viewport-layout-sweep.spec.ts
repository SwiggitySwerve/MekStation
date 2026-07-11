/**
 * Viewport layout sweep (design D5/D6/D9/D10, tasks 3.3/5.1).
 *
 * Three groups of screens, one `test()` per screen:
 *  - The 33 swept-now literal-goto screens (standalone + recovery +
 *    static-catalog): each test navigates once, then loops the four
 *    canonical sweep viewports (`SWEEP_VIEWPORTS`).
 *  - The 17 navigation-pack-seeded campaign screens (task 5.1, design D5/D10a):
 *    one `loadCampaignPack('navigation-briefing', ...)` call per worker
 *    (`test.beforeAll`, amortized across every test in the describe block --
 *    "seed once, sweep many"), then 16 direct-`goto` subroutes against the
 *    stamped campaign id read from the loader's post-navigation URL, plus
 *    the mission-launch screen reached by front-door in-page discovery from
 *    the pack-seeded missions screen (goto missions, click the mission's
 *    launch-briefing affordance -- never construct a mission id, never
 *    actuate the launch control itself).
 *  - The 1 combat-pack-seeded game session screen (task 5.1, design D5):
 *    `loadEncounterPack('combat-midbattle', ...)` per test (a single screen,
 *    no amortization to do).
 *
 * Every screen loops the same four sweep viewports, asserting at each width:
 * no horizontal overflow, no overlap among the declared check-target group,
 * the viewport-applicable primary affordance is clickable, and (where
 * declared) the canvas locator renders non-blank. Screens flagged
 * `remountPerViewport` re-navigate at every width instead of resizing in
 * place (design R3 -- mount-bound viewport branching).
 *
 * Quarantine entries (design D5) convert a documented pre-existing violation
 * into a visible, annotated skip of exactly the named check at the named
 * viewport -- never a silent filter, never a helper-side weakening. Nothing
 * here fixes a layout bug (Non-Goals): a real violation found here either
 * gets quarantined with a reason + follow-up, or the screen stays red until
 * a future change fixes it.
 *
 * All pack-seeded state enters through the W4 front-door loaders exclusively
 * (`e2e/helpers/scenarioPackLoading.ts`) -- no store injection, no
 * hand-seeded rows, no pack payload file read from this spec. Teardown rides
 * the loaders' own row-tracking `test.afterAll` (registered at import time by
 * `scenarioPackLoading.ts` itself).
 *
 * No screenshot-diff assertions anywhere in this spec (Non-Goals) -- every
 * check is DOM-geometry or color/contrast-diversity, never a pixel/baseline
 * comparison.
 */

import { expect, test, type Page } from '@playwright/test';

import {
  expectClickable,
  expectNoHorizontalOverflow,
  expectNonBlankRender,
  expectNoOverlap,
  SWEEP_VIEWPORTS,
  type SweepViewport,
  type LayoutOverlapTarget,
} from '../helpers/layout';
import {
  loadCampaignPack,
  loadEncounterPack,
} from '../helpers/scenarioPackLoading';
import { waitForPageReady } from '../helpers/wait';
import {
  PACK_SEEDED_SWEPT_ENTRIES,
  SWEPT_NOW_ENTRIES,
  type CheckTarget,
  type LayoutCheckKind,
  type QuarantineEntry,
  type SweepViewportLabel,
} from './screenInventory';

/**
 * Settle delay after a `setViewportSize` resize, before asserting layout.
 * `useDeviceType`'s reactive resize listener debounces at 150ms
 * (`src/hooks/useDeviceType.ts`); this gives reactive viewport-branching
 * components and CSS transitions time to finish before a measurement.
 */
const VIEWPORT_SETTLE_MS = 300;

/** True when a declared check target is applicable at the given sweep viewport. */
function isApplicableAt(
  target: { readonly viewports?: readonly SweepViewportLabel[] },
  viewport: SweepViewportLabel,
): boolean {
  return !target.viewports || target.viewports.includes(viewport);
}

/**
 * The common shape both `SweptScreenEntry` (literal-goto) and
 * `PackSeededScreenEntry` (pack-seeded, task 5.1) satisfy structurally --
 * everything the per-viewport check loop needs, independent of how the
 * screen was navigated to.
 */
interface SweepCheckable {
  readonly id: string;
  readonly label: string;
  readonly primaryAffordances: readonly CheckTarget[];
  readonly overlapTargets: readonly CheckTarget[];
  readonly canvasLocator?: CheckTarget;
  readonly quarantine?: readonly QuarantineEntry[];
}

/** Find a quarantine entry matching this viewport + check, if any. */
function findQuarantine(
  entry: SweepCheckable,
  viewport: SweepViewportLabel,
  check: LayoutCheckKind,
): QuarantineEntry | undefined {
  return (entry.quarantine ?? []).find(
    (quarantineEntry) =>
      quarantineEntry.viewport === viewport && quarantineEntry.check === check,
  );
}

/**
 * Run the four layout-invariant checks (overflow, overlap, clickable
 * primary affordance, optional non-blank canvas render) for one screen at
 * one already-resized viewport -- shared by every screen class (literal-goto
 * and pack-seeded alike) so the assertion logic exists exactly once.
 */
async function runViewportChecks(
  page: Page,
  entry: SweepCheckable,
  viewport: SweepViewport & { readonly label: SweepViewportLabel },
): Promise<void> {
  const screenLabel = `${entry.label} @ ${viewport.label}`;

  // --- overflow -------------------------------------------------------
  const overflowQuarantine = findQuarantine(entry, viewport.label, 'overflow');
  if (overflowQuarantine) {
    test.info().annotations.push({
      type: 'quarantine',
      description: `overflow @ ${viewport.label}: ${overflowQuarantine.reason} (follow-up: ${overflowQuarantine.followUp})`,
    });
  } else {
    await expectNoHorizontalOverflow(page, screenLabel);
  }

  // --- overlap ----------------------------------------------------------
  const applicableOverlapTargets: LayoutOverlapTarget[] = entry.overlapTargets
    .filter((target) => isApplicableAt(target, viewport.label))
    .map((target) => ({
      locator: target.resolve(page),
      label: target.label,
    }));

  const overlapQuarantine = findQuarantine(entry, viewport.label, 'overlap');
  if (overlapQuarantine) {
    test.info().annotations.push({
      type: 'quarantine',
      description: `overlap @ ${viewport.label}: ${overlapQuarantine.reason} (follow-up: ${overlapQuarantine.followUp})`,
    });
  } else if (applicableOverlapTargets.length > 0) {
    await expectNoOverlap(applicableOverlapTargets, screenLabel);
  }

  // --- clickable (primary affordance) ------------------------------------
  const applicablePrimaryAffordance = entry.primaryAffordances.find((target) =>
    isApplicableAt(target, viewport.label),
  );
  // Design D9 rule 1 enforces that every swept entry has an applicable
  // primary affordance at every sweep viewport -- for the 33 literal-goto
  // entries the inventory guard already proves this statically; pack-seeded
  // entries (task 5.1) are outside the guard's swept-now scope, so this is
  // the ONLY enforcement for them, not a defensive re-assertion.
  if (!applicablePrimaryAffordance) {
    throw new Error(
      `${entry.id} has no primary affordance applicable at ${viewport.label}`,
    );
  }

  const clickableQuarantine = findQuarantine(
    entry,
    viewport.label,
    'clickable',
  );
  if (clickableQuarantine) {
    test.info().annotations.push({
      type: 'quarantine',
      description: `clickable @ ${viewport.label}: ${clickableQuarantine.reason} (follow-up: ${clickableQuarantine.followUp})`,
    });
  } else {
    await expectClickable(
      applicablePrimaryAffordance.resolve(page),
      `${screenLabel} primary affordance (${applicablePrimaryAffordance.label})`,
    );
  }

  // --- non-blank render (optional canvas locator) --------------------------
  if (
    entry.canvasLocator &&
    isApplicableAt(entry.canvasLocator, viewport.label)
  ) {
    const nonBlankQuarantine = findQuarantine(
      entry,
      viewport.label,
      'non-blank-render',
    );
    if (nonBlankQuarantine) {
      test.info().annotations.push({
        type: 'quarantine',
        description: `non-blank-render @ ${viewport.label}: ${nonBlankQuarantine.reason} (follow-up: ${nonBlankQuarantine.followUp})`,
      });
    } else {
      await expectNonBlankRender(
        entry.canvasLocator.resolve(page),
        `${screenLabel} canvas (${entry.canvasLocator.label})`,
      );
    }
  }
}

// =============================================================================
// Group 1: the 33 swept-now literal-goto screens (task 3.3, unchanged).
// =============================================================================

test.describe('Viewport layout sweep', () => {
  for (const entry of SWEPT_NOW_ENTRIES) {
    test(`${entry.label} [${entry.id}]`, async ({ page }) => {
      test.setTimeout(60_000);

      if (!entry.remountPerViewport) {
        await page.goto(entry.goto, { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
      }

      for (const viewport of SWEEP_VIEWPORTS) {
        if (entry.remountPerViewport) {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await page.goto(entry.goto, { waitUntil: 'domcontentloaded' });
          await waitForPageReady(page);
        } else {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await page.waitForTimeout(VIEWPORT_SETTLE_MS);
        }

        await runViewportChecks(page, entry, viewport);
      }
    });
  }
});

// =============================================================================
// Group 2: navigation-pack-seeded campaign screens (task 5.1, design D5/D10a).
// One `loadCampaignPack` call per worker (test.beforeAll below), amortized
// across the 16 direct-goto subroutes + the 1 in-page-discovery mission-launch
// screen -- "seed once, sweep many". The stamped campaign id is read from the
// loader's own return value (the loader's post-navigation URL is what the
// design's observable-only rule actually promises; the loader's return value
// is the same id, task-level implementation convenience this sweep already
// relies on identically to the parity specs, e2e/scenario-packs/*.parity.spec.ts).
// =============================================================================

const navigationPackEntries = PACK_SEEDED_SWEPT_ENTRIES.filter(
  (entry) => entry.pack === 'navigation' && entry.navigation === 'direct-goto',
);
const missionLaunchEntry = PACK_SEEDED_SWEPT_ENTRIES.find(
  (entry) => entry.navigation === 'in-page-discovery',
);
const gameDetailEntry = PACK_SEEDED_SWEPT_ENTRIES.find(
  (entry) => entry.pack === 'combat',
);

test.describe('Viewport layout sweep -- pack-seeded (navigation)', () => {
  let campaignId: string | undefined;

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext();
    const seedPage = await context.newPage();
    const loaded = await loadCampaignPack(seedPage, 'navigation-briefing', {
      workerIndex: testInfo.workerIndex,
    });
    campaignId = loaded.campaignId;
    await context.close();
  });

  for (const entry of navigationPackEntries) {
    test(`${entry.label} [${entry.id}]`, async ({ page }) => {
      test.setTimeout(60_000);
      if (!campaignId) {
        throw new Error(
          `${entry.id}: navigation-briefing pack was not loaded (test.beforeAll did not set campaignId)`,
        );
      }
      if (!entry.routeTemplate) {
        throw new Error(
          `${entry.id}: direct-goto pack-seeded entry declares no routeTemplate`,
        );
      }

      await page.goto(entry.routeTemplate.replace('{id}', campaignId), {
        waitUntil: 'domcontentloaded',
      });
      await waitForPageReady(page);

      for (const viewport of SWEEP_VIEWPORTS) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.waitForTimeout(VIEWPORT_SETTLE_MS);
        await runViewportChecks(page, entry, viewport);
      }
    });
  }

  // The mission-launch screen (design D10a): front-door in-page discovery
  // from the pack-seeded missions screen. Never constructs a mission id and
  // never actuates the launch control (`launch-mission-direct`) -- the
  // discovery click targets the mission's own `mission-launch-{missionId}`
  // link (missions.tsx), landing on the briefing route exactly as a user
  // would, mirroring `navigation-briefing.parity.spec.ts`'s own discovery.
  test(
    missionLaunchEntry
      ? `${missionLaunchEntry.label} [${missionLaunchEntry.id}]`
      : 'mission launch briefing (undeclared)',
    async ({ page }) => {
      test.setTimeout(60_000);
      if (!missionLaunchEntry) {
        throw new Error(
          'screenInventory.ts declares no in-page-discovery pack-seeded entry',
        );
      }
      if (!campaignId) {
        throw new Error(
          `${missionLaunchEntry.id}: navigation-briefing pack was not loaded (test.beforeAll did not set campaignId)`,
        );
      }

      await page.goto(`/gameplay/campaigns/${campaignId}/missions`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForPageReady(page);

      const launchDiscoveryLink = page
        .locator('[data-testid^="mission-launch-"]')
        .first();
      await expect(launchDiscoveryLink).toBeVisible({ timeout: 20_000 });
      await launchDiscoveryLink.click();
      await waitForPageReady(page);

      for (const viewport of SWEEP_VIEWPORTS) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.waitForTimeout(VIEWPORT_SETTLE_MS);
        await runViewportChecks(page, missionLaunchEntry, viewport);
      }
    },
  );
});

// =============================================================================
// Group 3: the combat-pack-seeded game session screen (task 5.1, design D5).
// A single screen -- no amortization to do, `loadEncounterPack` runs once
// per test.
// =============================================================================

test.describe('Viewport layout sweep -- pack-seeded (combat)', () => {
  test(
    gameDetailEntry
      ? `${gameDetailEntry.label} [${gameDetailEntry.id}]`
      : 'game session detail (undeclared)',
    async ({ page }, testInfo) => {
      test.setTimeout(60_000);
      if (!gameDetailEntry) {
        throw new Error(
          'screenInventory.ts declares no combat pack-seeded entry',
        );
      }

      await loadEncounterPack(page, 'combat-midbattle', {
        workerIndex: testInfo.workerIndex,
      });

      for (const viewport of SWEEP_VIEWPORTS) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.waitForTimeout(VIEWPORT_SETTLE_MS);
        await runViewportChecks(page, gameDetailEntry, viewport);
      }
    },
  );
});
