/**
 * TabSpec — per-type tab configuration contract
 *
 * A TabSpec defines a single customizer tab: its id, label, optional icon,
 * an optional visibility predicate (so conditional tabs hide when irrelevant),
 * and the React component that fills the tab panel.
 *
 * This is the authoritative contract that each per-type tab registry must
 * satisfy. Construction proposals reference this type when wiring real UI.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 */

import React from 'react';

// =============================================================================
// Core TabSpec type
// =============================================================================

/**
 * Describes one tab in a per-type customizer tab bar.
 *
 * @template TState - The store state snapshot passed to visibleWhen.
 *   Use `unknown` for tabs that are always visible (no predicate).
 */
export interface TabSpec<TState = unknown> {
  /** Machine-readable identifier — used as the activeTab key */
  readonly id: string;

  /** Human-readable tab label rendered in the tab bar */
  readonly label: string;

  /**
   * Optional SVG icon node.  When present it is rendered to the left of the
   * label (desktop) or instead of the label (mobile ≤ sm).
   */
  readonly icon?: React.ReactNode;

  /**
   * Optional ARIA label override.  Defaults to `label` when absent.
   * Supply when the tab id differs meaningfully from the human label (e.g.
   * "criticals" → "Critical Slots").
   */
  readonly ariaLabel?: string;

  /**
   * Visibility predicate.  Return `false` to hide this tab from the tab bar.
   * The tab is still registered; it is simply not rendered.
   *
   * Examples:
   *   - Bombs tab hidden when `unit.unitType === UnitType.CONVENTIONAL_FIGHTER`
   *   - Glider tab hidden when `unit.tonnage >= 10`
   *   - Field Guns tab hidden when `unit.motionType === SquadMotionType.JUMP`
   *
   * When undefined the tab is always visible.
   */
  readonly visibleWhen?: (state: TState) => boolean;

  /**
   * The React component that fills the tab panel.
   *
   * Props contract: every tab component MUST accept at minimum `{ readOnly?: boolean }`.
   * Richer prop types are allowed by each concrete component.  The registry
   * stores `React.ComponentType<TabPanelBaseProps>` so any superset is OK.
   */
  readonly component: React.ComponentType<TabPanelBaseProps>;
}

// =============================================================================
// Shared panel props
// =============================================================================

/** Minimum props every tab panel component must accept */
export interface TabPanelBaseProps {
  /** When true the tab panel renders in view-only mode */
  readOnly?: boolean;
  /** Optional extra CSS classes forwarded to the panel root */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Filter a TabSpec array against the current store state, returning only
 * the specs whose `visibleWhen` predicate returns true (or have no predicate).
 *
 * Call this inside the customizer render to derive the visible tab list.
 */
export function filterVisibleTabs<TState>(
  specs: TabSpec<TState>[],
  state: TState,
): TabSpec<TState>[] {
  return specs.filter(
    (spec) => spec.visibleWhen === undefined || spec.visibleWhen(state),
  );
}

/**
 * Convert a TabSpec[] to the `CustomizerTabConfig[]` shape expected by
 * `CustomizerTabs` (the existing tab-bar render component).
 *
 * This bridge function lets the registry drive the existing UI without
 * replacing it wholesale.
 */
export function toCustomizerTabConfigs<TState>(
  specs: TabSpec<TState>[],
): Array<{
  id: string;
  label: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
}> {
  return specs.map((spec) => ({
    id: spec.id,
    label: spec.label,
    icon: spec.icon,
    ariaLabel: spec.ariaLabel ?? spec.label,
  }));
}
