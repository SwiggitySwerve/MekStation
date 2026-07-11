/**
 * Shared layout assertion vocabulary for the viewport layout sweep.
 *
 * Promotes three spec-local checks (`expectNoHorizontalOverflow`,
 * `expectClickable` from `coop-campaign-ui-audit.spec.ts`;
 * `expectNonBlankRender`/`measureRenderedContrast` from
 * `tactical-map-visual-smoke.spec.ts`) into one importable module, and adds
 * the net-new `expectNoOverlap` overlap check (design D6). This module is
 * e2e-only test infrastructure -- it must never import from `src/**` beyond
 * the `BREAKPOINTS` constant (zero-production-touch): the AABB overlap math
 * mirrors `LayoutValidator.boxesOverlap` but is reimplemented locally rather
 * than imported, so armor-pip customizer layout code stays decoupled from
 * e2e assertion plumbing.
 */

import {
  expect,
  type ElementHandle,
  type Locator,
  type Page,
} from '@playwright/test';
import sharp from 'sharp';

import { BREAKPOINTS } from '../../src/constants/layout';

// ============================================================================
// expectNoHorizontalOverflow -- promoted near-verbatim from
// coop-campaign-ui-audit.spec.ts (same +1px scroll tolerance, up-to-8
// offender reporting).
// ============================================================================

/**
 * Assert the page has no horizontal overflow at its current viewport.
 *
 * Scans `body *` bounding rects in-page, skips zero-size elements and
 * full-bleed `position:fixed` elements (those are allowed to span the full
 * width by design), and asserts the document's scroll width never exceeds
 * the viewport width by more than 1px. Up to 8 offenders are reported by
 * tag/testid/class/geometry so failures are triageable without a screenshot.
 */
export async function expectNoHorizontalOverflow(
  page: Page,
  label: string,
): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const width = window.innerWidth;
    const offenders = Array.from(document.querySelectorAll('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        const style = window.getComputedStyle(element);
        if (
          style.position === 'fixed' &&
          rect.left <= 0 &&
          rect.right >= width
        ) {
          return null;
        }
        if (rect.left < -1 || rect.right > width + 1) {
          return {
            tag: element.tagName.toLowerCase(),
            testId: element.getAttribute('data-testid'),
            className: element.getAttribute('class'),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 8);
    return {
      width,
      rootScrollWidth: root.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
      offenders,
    };
  });
  const maxScrollWidth = Math.max(
    overflow.rootScrollWidth,
    overflow.bodyScrollWidth,
  );
  expect(
    maxScrollWidth,
    `${label} has horizontal overflow: ${JSON.stringify(overflow.offenders)}`,
  ).toBeLessThanOrEqual(overflow.width + 1);
}

// ============================================================================
// expectClickable -- promoted near-verbatim from coop-campaign-ui-audit.spec.ts
// (same visible/enabled/in-viewport 20s timeouts, same 32x32px box floor).
// ============================================================================

/**
 * Assert a locator is a real, clickable affordance: visible, enabled,
 * scrolled into the viewport, and at least 32x32px. The 32x32px floor is
 * the shared layout-sweep minimum -- the stricter 44x44px touch-target
 * guideline stays `mobile-navigation.spec.ts`'s own assertion, not this
 * helper's.
 */
export async function expectClickable(
  locator: Locator,
  label: string,
): Promise<void> {
  await expect(locator, `${label} visible`).toBeVisible({ timeout: 20_000 });
  await expect(locator, `${label} enabled`).toBeEnabled({ timeout: 20_000 });
  await expect(locator, `${label} in viewport`).toBeInViewport({
    timeout: 20_000,
  });
  const box = await locator.boundingBox();
  expect(box, `${label} has layout box`).not.toBeNull();
  expect(box?.width ?? 0, `${label} width`).toBeGreaterThanOrEqual(32);
  expect(box?.height ?? 0, `${label} height`).toBeGreaterThanOrEqual(32);
}

// ============================================================================
// expectNonBlankRender / measureRenderedContrast -- promoted from
// tactical-map-visual-smoke.spec.ts with the signature generalized from a
// hardcoded `page.getByTestId('hex-map-container')` to a caller-supplied
// locator (the sweep asserts non-blank render on whatever canvas locator the
// inventory declares, not only the hex map).
// ============================================================================

/**
 * Assert a canvas-like locator renders more than a flat color -- catches a
 * canvas/SVG surface that mounted but never painted (blank/flat-color
 * regressions pixel-diffing would also catch, but this sweep is
 * screenshot-diff-free by design). Retries up to 3 times with a short
 * settle delay because canvas paints can lag one animation frame behind
 * `toBeVisible`.
 */
export async function expectNonBlankRender(
  locator: Locator,
  label: string,
): Promise<void> {
  let lastMetrics:
    | {
        readonly quantizedColorCount: number;
        readonly contrastedPixels: number;
      }
    | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await expect(locator).toBeVisible();
      const screenshot = await locator.screenshot({ animations: 'disabled' });
      lastMetrics = await measureRenderedContrast(screenshot);
      if (
        lastMetrics.quantizedColorCount > 8 &&
        lastMetrics.contrastedPixels > 150
      ) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await locator.page().waitForTimeout(100);
  }

  if (!lastMetrics) throw lastError;

  expect(
    lastMetrics.quantizedColorCount,
    `${label} should render more than a flat color`,
  ).toBeGreaterThan(8);
  expect(
    lastMetrics.contrastedPixels,
    `${label} should contain visible terrain/token/overlay contrast`,
  ).toBeGreaterThan(150);
}

/**
 * Sample a screenshot buffer (every 8th pixel) and report how many
 * quantized (4-bit-per-channel) colors and how many contrasted pixels
 * (max-min channel spread > 32) it contains. A flat-color render collapses
 * to a single quantized color and zero contrasted pixels.
 */
export async function measureRenderedContrast(screenshot: Buffer): Promise<{
  readonly quantizedColorCount: number;
  readonly contrastedPixels: number;
}> {
  const { data } = await sharp(screenshot)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const quantizedColors = new Set<string>();
  let contrastedPixels = 0;

  for (let offset = 0; offset < data.length; offset += 4 * 8) {
    const alpha = data[offset + 3];
    if (alpha < 16) continue;

    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    quantizedColors.add(`${red >> 4},${green >> 4},${blue >> 4}`);

    if (Math.max(red, green, blue) - Math.min(red, green, blue) > 32) {
      contrastedPixels += 1;
    }
  }

  return {
    quantizedColorCount: quantizedColors.size,
    contrastedPixels,
  };
}

// ============================================================================
// expectNoOverlap -- net new (design D6). AABB disjointness on declared
// check targets, reimplemented locally (never imported) from
// LayoutValidator.boxesOverlap's math at
// src/components/customizer/armor/shared/layout/LayoutValidator.ts:38.
// ============================================================================

/** Minimal rectangle shape shared with Playwright's `boundingBox()` return. */
interface OverlapBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A single declared overlap check target: a locator plus its report label. */
export interface LayoutOverlapTarget {
  readonly locator: Locator;
  readonly label: string;
}

/** Options for `expectNoOverlap`. */
export interface ExpectNoOverlapOptions {
  /** AABB disjointness tolerance in px. Defaults to 1 (abutting elements do not flap). */
  readonly tolerance?: number;
  /**
   * Pairs of target labels that are allowed to overlap by design (badge on
   * icon, avatar stacks, dropdown chevrons). An inventory-side data change,
   * visible in review -- never a helper-code tolerance bump.
   */
  readonly allowedOverlaps?: ReadonlyArray<readonly [string, string]>;
}

/**
 * AABB disjointness test on two boxes, tolerance in px. Standard bounding-box
 * overlap math -- structurally identical to (and reimplemented from, never
 * imported from) `LayoutValidator.boxesOverlap`; importing armor-pip
 * customizer layout code into e2e assertion plumbing would be a nonsense
 * cross-domain coupling.
 */
function boxesOverlap(
  a: OverlapBox,
  b: OverlapBox,
  tolerance: number,
): boolean {
  return !(
    a.x + a.width <= b.x + tolerance ||
    b.x + b.width <= a.x + tolerance ||
    a.y + a.height <= b.y + tolerance ||
    b.y + b.height <= a.y + tolerance
  );
}

/** Order-independent key for an allowlisted overlap pair. */
function overlapPairKey(labelA: string, labelB: string): string {
  return [labelA, labelB].sort().join('::');
}

/** Render a box compactly for failure messages. */
function formatOverlapBox(box: OverlapBox): string {
  return `{x:${Math.round(box.x)},y:${Math.round(box.y)},w:${Math.round(box.width)},h:${Math.round(box.height)}}`;
}

/**
 * True when `a` and `b` are in an ancestor-descendant relationship in the
 * DOM. Containment is not overlap (design D6): an element containing its own
 * child is CSS working as intended, so only sibling-ish pairs (neither
 * contains the other) are compared. This is a real DOM containment check
 * (`Node.contains`), not a geometric one -- a CSS-overlaid element whose box
 * happens to sit fully inside another's box, without being its DOM
 * descendant, is exactly the defect this helper exists to catch.
 */
async function isAncestorDescendant(
  a: ElementHandle<SVGElement | HTMLElement>,
  b: ElementHandle<SVGElement | HTMLElement>,
): Promise<boolean> {
  return a.evaluate((elA, elB) => elA.contains(elB) || elB.contains(elA), b);
}

interface ResolvedOverlapTarget {
  readonly target: LayoutOverlapTarget;
  readonly box: OverlapBox;
  readonly element: ElementHandle<SVGElement | HTMLElement>;
}

/**
 * Assert none of the declared `targets` overlap each other (pairwise AABB
 * disjointness), except ancestor-descendant pairs (structural containment,
 * excluded always) and `allowedOverlaps` pairs (excluded by declared,
 * reviewable opt-out).
 *
 * The helper never visibility-filters: a declared target that resolves to no
 * visible element is itself a hard failure naming the missing target
 * (design D6/D9's no-silent-filter rule) -- a silent filter would let a
 * vanished affordance regression pass this check vacuously. Per-viewport
 * exclusions belong to the caller's inventory data (which targets are
 * declared applicable at a given viewport), never to this helper.
 */
export async function expectNoOverlap(
  targets: readonly LayoutOverlapTarget[],
  label: string,
  options: ExpectNoOverlapOptions = {},
): Promise<void> {
  const { tolerance = 1, allowedOverlaps = [] } = options;
  const allowedPairs = new Set(
    allowedOverlaps.map(([a, b]) => overlapPairKey(a, b)),
  );

  const resolved: ResolvedOverlapTarget[] = [];
  for (const target of targets) {
    const box = await target.locator.boundingBox();
    expect(
      box,
      `${label}: overlap target "${target.label}" resolved to no visible element`,
    ).not.toBeNull();
    if (!box) continue;

    const element = await target.locator.elementHandle();
    expect(
      element,
      `${label}: overlap target "${target.label}" resolved to no visible element`,
    ).not.toBeNull();
    if (!element) continue;

    resolved.push({ target, box, element });
  }

  const overlaps: string[] = [];
  for (let i = 0; i < resolved.length; i += 1) {
    for (let j = i + 1; j < resolved.length; j += 1) {
      const a = resolved[i];
      const b = resolved[j];
      if (!boxesOverlap(a.box, b.box, tolerance)) continue;
      if (allowedPairs.has(overlapPairKey(a.target.label, b.target.label))) {
        continue;
      }
      if (await isAncestorDescendant(a.element, b.element)) continue;

      overlaps.push(
        `"${a.target.label}" ${formatOverlapBox(a.box)} overlaps "${b.target.label}" ${formatOverlapBox(b.box)}`,
      );
    }
  }

  expect(overlaps, `${label} has overlapping layout targets`).toEqual([]);
}

// ============================================================================
// SWEEP_VIEWPORTS -- design D4. The four historical project widths; three
// bind BREAKPOINTS.MD/LG/XL by import (never copied), 375 is a documented
// device literal below the SM breakpoint.
// ============================================================================

/** One viewport the sweep resizes to and re-checks layout invariants at. */
export interface SweepViewport {
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

/**
 * The four viewports the layout sweep loops per screen. Widths match the
 * four deleted responsive Playwright projects (design D2) so the sweep
 * preserves their coverage as a parameter dimension instead of suite
 * duplication. `BREAKPOINTS.SM` (640) is deliberately not swept -- no
 * historical project and no device class the app targets used it.
 */
export const SWEEP_VIEWPORTS: readonly SweepViewport[] = [
  {
    // Below the SM breakpoint -- iPhone-SE class device width. No
    // BREAKPOINTS key exists for it, deliberately: it matches the deleted
    // Mobile Chrome project and ~8 existing specs' hardcoded 375.
    label: 'mobile-375',
    width: 375,
    height: 667,
  },
  {
    label: 'tablet-portrait-768',
    width: BREAKPOINTS.MD,
    height: 1024,
  },
  {
    label: 'tablet-landscape-1024',
    width: BREAKPOINTS.LG,
    height: 768,
  },
  {
    label: 'desktop-1280',
    width: BREAKPOINTS.XL,
    height: 720,
  },
] as const;
