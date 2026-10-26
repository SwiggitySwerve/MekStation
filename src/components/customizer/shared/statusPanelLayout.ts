/**
 * Where the build status panel opens.
 *
 * Pure geometry, so the panel component only measures the page and renders.
 * Phones get a bottom sheet. On a desktop workbench the panel is a drawer
 * docked over the Loadout rail column (same left edge and width, full height
 * below the header), so the tab content it describes stays visible. Without
 * a rail it docks to the right edge of the workspace, and without a
 * workspace at all (the panel used outside the workbench) it falls back to a
 * popover under its button.
 */

/** Below this width the panel opens as a bottom sheet. */
export const STATUS_SHEET_MAX_WIDTH = 639;
/** Popover width, and the drawer width when no rail is there to match. */
export const STATUS_PANEL_WIDTH = 384;
export const STATUS_DRAWER_FALLBACK_WIDTH = 320;
const EDGE = 8;

export interface LayoutBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface StatusPanelLayoutInput {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly trigger: LayoutBox;
  /** The expanded Loadout rail, when it is on screen. */
  readonly rail?: LayoutBox | null;
  /** The tab content area, when the workbench is on screen. */
  readonly workspace?: LayoutBox | null;
}

export type StatusPanelLayout =
  | { readonly mode: 'sheet' }
  | {
      readonly mode: 'drawer' | 'popover';
      readonly left: number;
      readonly top: number;
      readonly width: number;
      /** Drawers are full height; popovers cap at the room below. */
      readonly height?: number;
      readonly maxHeight: number;
    };

const isVisible = (box?: LayoutBox | null): box is LayoutBox =>
  Boolean(box && box.right - box.left > 0 && box.bottom - box.top > 0);

export function computeStatusPanelLayout({
  viewportWidth,
  viewportHeight,
  trigger,
  rail,
  workspace,
}: StatusPanelLayoutInput): StatusPanelLayout {
  if (viewportWidth <= STATUS_SHEET_MAX_WIDTH) return { mode: 'sheet' };
  const dock = isVisible(rail) ? rail : null;
  if (dock || isVisible(workspace)) {
    const top = dock ? dock.top : workspace!.top;
    const width = dock
      ? dock.right - dock.left
      : Math.min(STATUS_DRAWER_FALLBACK_WIDTH, viewportWidth - 2 * EDGE);
    const height = Math.max(0, viewportHeight - top);
    return {
      mode: 'drawer',
      left: dock ? dock.left : viewportWidth - width,
      top,
      width,
      height,
      maxHeight: height,
    };
  }
  const width = Math.min(STATUS_PANEL_WIDTH, viewportWidth - 2 * EDGE);
  const top = Math.max(
    EDGE,
    Math.min(trigger.bottom + 4, viewportHeight - 180),
  );
  return {
    mode: 'popover',
    // Right-aligned under the button, kept on screen.
    left: Math.max(
      EDGE,
      Math.min(trigger.right - width, viewportWidth - width - EDGE),
    ),
    top,
    width,
    maxHeight: viewportHeight - top - EDGE,
  };
}

/** Measure the page for `computeStatusPanelLayout`. */
export function measureStatusPanelLayout(
  trigger: HTMLElement,
): StatusPanelLayout {
  const box = (selector: string): LayoutBox | null =>
    document.querySelector(selector)?.getBoundingClientRect() ?? null;
  return computeStatusPanelLayout({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    trigger: trigger.getBoundingClientRect(),
    rail: box('aside[aria-label="Unit loadout"]'),
    workspace: box('[data-testid="customizer-workspace"]'),
  });
}
