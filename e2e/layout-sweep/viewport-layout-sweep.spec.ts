/**
 * Viewport layout sweep (design D5/D6/D9, task 3.3).
 *
 * One `test()` per swept-now inventory entry (standalone + recovery +
 * static-catalog, 33 screens). Each test navigates once, then loops the four
 * canonical sweep viewports (`SWEEP_VIEWPORTS`), asserting at each width:
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
 * No screenshot-diff assertions anywhere in this spec (Non-Goals) -- every
 * check is DOM-geometry or color/contrast-diversity, never a pixel/baseline
 * comparison.
 */

import { test } from '@playwright/test';

import {
  expectClickable,
  expectNoHorizontalOverflow,
  expectNonBlankRender,
  expectNoOverlap,
  SWEEP_VIEWPORTS,
  type LayoutOverlapTarget,
} from '../helpers/layout';
import { waitForPageReady } from '../helpers/wait';
import {
  SWEPT_NOW_ENTRIES,
  type LayoutCheckKind,
  type QuarantineEntry,
  type SweepViewportLabel,
  type SweptScreenEntry,
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

/** Find a quarantine entry matching this viewport + check, if any. */
function findQuarantine(
  entry: SweptScreenEntry,
  viewport: SweepViewportLabel,
  check: LayoutCheckKind,
): QuarantineEntry | undefined {
  return (entry.quarantine ?? []).find(
    (quarantineEntry) =>
      quarantineEntry.viewport === viewport && quarantineEntry.check === check,
  );
}

test.describe('Viewport layout sweep', () => {
  for (const entry of SWEPT_NOW_ENTRIES) {
    test(`${entry.label} [${entry.id}]`, async ({ page }) => {
      test.setTimeout(60_000);

      if (!entry.remountPerViewport) {
        await page.goto(entry.goto, { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
      }

      for (const viewport of SWEEP_VIEWPORTS) {
        const screenLabel = `${entry.label} @ ${viewport.label}`;

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

        // --- overflow ---------------------------------------------------
        const overflowQuarantine = findQuarantine(
          entry,
          viewport.label,
          'overflow',
        );
        if (overflowQuarantine) {
          test.info().annotations.push({
            type: 'quarantine',
            description: `overflow @ ${viewport.label}: ${overflowQuarantine.reason} (follow-up: ${overflowQuarantine.followUp})`,
          });
        } else {
          await expectNoHorizontalOverflow(page, screenLabel);
        }

        // --- overlap ------------------------------------------------------
        const applicableOverlapTargets: LayoutOverlapTarget[] =
          entry.overlapTargets
            .filter((target) => isApplicableAt(target, viewport.label))
            .map((target) => ({
              locator: target.resolve(page),
              label: target.label,
            }));

        const overlapQuarantine = findQuarantine(
          entry,
          viewport.label,
          'overlap',
        );
        if (overlapQuarantine) {
          test.info().annotations.push({
            type: 'quarantine',
            description: `overlap @ ${viewport.label}: ${overlapQuarantine.reason} (follow-up: ${overlapQuarantine.followUp})`,
          });
        } else if (applicableOverlapTargets.length > 0) {
          await expectNoOverlap(applicableOverlapTargets, screenLabel);
        }

        // --- clickable (primary affordance) --------------------------------
        const applicablePrimaryAffordance = entry.primaryAffordances.find(
          (target) => isApplicableAt(target, viewport.label),
        );
        // Design D9 rule 1 + the inventory guard already enforce that every
        // swept entry has an applicable primary affordance at every sweep
        // viewport -- this is a defensive re-assertion, not new coverage.
        if (!applicablePrimaryAffordance) {
          throw new Error(
            `${entry.id} has no primary affordance applicable at ${viewport.label} -- the inventory guard should have caught this`,
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

        // --- non-blank render (optional canvas locator) --------------------
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
    });
  }
});
