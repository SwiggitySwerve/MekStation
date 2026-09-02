/**
 * The four canonical sweep viewports, in their own Playwright-free module.
 *
 * This lived in `layout.ts` until the pack-seeded sweep-coverage guard
 * needed it. That guard is a JEST test (the Playwright suites need a dev
 * server the guard worktree cannot start), and it has to load the screen
 * inventory through the SAME module path the sweep spec does -- but
 * `screenInventory.types.ts` only wanted `SWEEP_VIEWPORTS` from `layout.ts`,
 * and importing `layout.ts` drags in `@playwright/test` and `sharp`, which
 * blows up under Jest before a single row runs.
 *
 * So the constant moves down here, where it depends on nothing but a `src`
 * constant, and `layout.ts` re-exports it -- every existing importer is
 * untouched. Nothing else about the values changed.
 *
 * Design D4: the four historical project widths; three bind
 * `BREAKPOINTS.MD/LG/XL` by import (never copied), 375 is a documented
 * device literal below the SM breakpoint.
 */

import { BREAKPOINTS } from '../../src/constants/layout';

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
