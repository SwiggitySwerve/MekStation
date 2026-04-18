/**
 * useCustomizerTabs hook
 *
 * Per-type tab state management for the customizer.  Wraps activeTab,
 * dirtyTabs, and validationError tracking so every per-type customizer stays
 * thin: it delegates all tab-state logic here.
 *
 * Spec: openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 *   § Requirement: Tab Dirty Tracking
 *   § Requirement: Validation Error Markers
 */

import { useState, useCallback } from "react";

import {
  TabSpec,
  filterVisibleTabs,
} from "@/components/customizer/shared/TabSpec";

// =============================================================================
// Types
// =============================================================================

export interface UseCustomizerTabsOptions<TState> {
  /** Full spec list (may include conditionally-hidden tabs) */
  specs: TabSpec<TState>[];

  /** Current store state snapshot, evaluated against each spec.visibleWhen */
  state: TState;

  /** Tab id to activate initially */
  initialTabId?: string;
}

export interface UseCustomizerTabsResult<TState> {
  /** Filtered visible tab specs — pass these to the tab-bar renderer */
  visibleSpecs: TabSpec<TState>[];

  /** Currently active tab id */
  activeTab: string;

  /** Change the active tab */
  setActiveTab: (tabId: string) => void;

  /**
   * Set of tab ids that have un-saved field changes.
   * The tab bar renders a dirty marker (• or *) on each dirty tab.
   */
  dirtyTabs: Set<string>;

  /** Mark a tab as dirty (call from field onChange handlers) */
  markDirty: (tabId: string) => void;

  /** Clear dirty state for a tab (call after successful save) */
  clearDirty: (tabId: string) => void;

  /** Clear all dirty state (call after unit-wide save) */
  clearAllDirty: () => void;

  /**
   * Set of tab ids whose fields currently fail validation.
   * The tab bar renders an error dot on each errored tab.
   */
  errorTabs: Set<string>;

  /**
   * Replace the full set of tabs with validation errors.
   * Call with the set of tab ids that have failing constraints after each
   * validation pass.
   */
  setErrorTabs: (tabIds: Set<string>) => void;

  /**
   * True when the active tab id is not present in visibleSpecs (e.g. the
   * active tab was hidden by a visibleWhen predicate flip).  The customizer
   * should reset to the first visible tab in this case.
   */
  activeTabIsHidden: boolean;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Manages tab state for a single per-type customizer.
 *
 * Usage:
 * ```tsx
 * const { visibleSpecs, activeTab, setActiveTab, dirtyTabs, markDirty } =
 *   useCustomizerTabs({ specs: AEROSPACE_TABS, state: aerospaceSnapshot });
 * ```
 */
export function useCustomizerTabs<TState>({
  specs,
  state,
  initialTabId,
}: UseCustomizerTabsOptions<TState>): UseCustomizerTabsResult<TState> {
  // Derive the visible tab list from specs + current state
  const visibleSpecs = filterVisibleTabs(specs, state);

  // Determine the default active tab: prefer initialTabId if it exists in the
  // visible set, otherwise fall back to the first visible tab.
  const defaultTabId =
    initialTabId && visibleSpecs.some((s) => s.id === initialTabId)
      ? initialTabId
      : (visibleSpecs[0]?.id ?? "");

  const [activeTab, setActiveTabRaw] = useState<string>(defaultTabId);
  const [dirtyTabs, setDirtyTabs] = useState<Set<string>>(new Set());
  const [errorTabs, setErrorTabsState] = useState<Set<string>>(new Set());

  // Only navigate to tabs that are in the visible set; silently ignore invalid ids
  const setActiveTab = useCallback(
    (tabId: string) => {
      if (visibleSpecs.some((s) => s.id === tabId)) {
        setActiveTabRaw(tabId);
      }
    },
    [visibleSpecs],
  );

  const markDirty = useCallback((tabId: string) => {
    setDirtyTabs((prev) => {
      if (prev.has(tabId)) return prev;
      return new Set(prev).add(tabId);
    });
  }, []);

  const clearDirty = useCallback((tabId: string) => {
    setDirtyTabs((prev) => {
      if (!prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  const clearAllDirty = useCallback(() => {
    setDirtyTabs(new Set());
  }, []);

  const setErrorTabs = useCallback((tabIds: Set<string>) => {
    setErrorTabsState(tabIds);
  }, []);

  const activeTabIsHidden = !visibleSpecs.some((s) => s.id === activeTab);

  return {
    visibleSpecs,
    activeTab,
    setActiveTab,
    dirtyTabs,
    markDirty,
    clearDirty,
    clearAllDirty,
    errorTabs,
    setErrorTabs,
    activeTabIsHidden,
  };
}
