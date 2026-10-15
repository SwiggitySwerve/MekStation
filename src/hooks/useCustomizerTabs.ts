/**
 * useCustomizerTabs hook
 *
 * Per-type tab state management for the customizer.  Wraps activeTab,
 * dirtyTabs, and validationError tracking so every per-type customizer stays
 * thin: it delegates all tab-state logic here.
 *
 * Spec: openspec/specs/multi-unit-tabs/spec.md
 *   § Requirement: Tab Dirty Tracking
 *   § Requirement: Validation Error Markers
 */

import { useState, useCallback, useLayoutEffect, useRef } from 'react';

import { useCustomizerConfirmation } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';
import {
  TabSpec,
  filterVisibleTabs,
} from '@/components/customizer/shared/TabSpec';

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

  /** Called only when a visible tab change is accepted. */
  onTabChange?: (tabId: string) => void;
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
   * Map of tab ids whose fields currently fail validation to the rule code of
   * the first failing constraint.  The tab bar renders an error dot on each
   * errored tab with an ARIA label naming the rule code, satisfying Spec
   * § Requirement: Validation Error Markers — "an ARIA label naming the
   * failing rule (`VAL-VEHICLE-ARMOR-MAX`)".
   */
  errorTabs: Map<string, string>;

  /**
   * Replace the full map of tabs with validation errors.
   * Call with a Map of tab ids → rule codes after each validation pass.
   * Tabs not present in the map are considered error-free.
   */
  setErrorTabs: (tabErrors: Map<string, string>) => void;

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
  onTabChange,
}: UseCustomizerTabsOptions<TState>): UseCustomizerTabsResult<TState> {
  // Derive the visible tab list from specs + current state
  const visibleSpecs = filterVisibleTabs(specs, state);

  // Determine the default active tab: prefer initialTabId if it exists in the
  // visible set, otherwise fall back to the first visible tab.
  const defaultTabId =
    initialTabId && visibleSpecs.some((s) => s.id === initialTabId)
      ? initialTabId
      : (visibleSpecs[0]?.id ?? '');

  const [activeTab, setActiveTabRaw] = useState<string>(defaultTabId);
  const [dirtyTabs, setDirtyTabs] = useState<Set<string>>(new Set());
  const [errorTabs, setErrorTabsState] = useState<Map<string, string>>(
    new Map(),
  );

  const { requestConfirmation } = useCustomizerConfirmation();
  const committed = useRef({
    activeTab,
    dirtyTabs,
    visibleIds: visibleSpecs.map((spec) => spec.id),
    onTabChange,
  });
  useLayoutEffect(() => {
    committed.current = {
      activeTab,
      dirtyTabs,
      visibleIds: visibleSpecs.map((spec) => spec.id),
      onTabChange,
    };
  });

  // Approval uses committed UI state, so a delayed dialog cannot route a
  // target that disappeared or replace a different active source tab.
  const setActiveTab = useCallback(
    (tabId: string) => {
      const source = committed.current;
      if (!source.visibleIds.includes(tabId) || tabId === source.activeTab)
        return;
      const commit = () => {
        // Linearize accepted navigation before a reentrant callback/click.
        committed.current = { ...committed.current, activeTab: tabId };
        setActiveTabRaw(tabId);
        committed.current.onTabChange?.(tabId);
      };
      if (!source.dirtyTabs.has(source.activeTab)) {
        commit();
        return;
      }
      requestConfirmation({
        title: 'Leave this tab?',
        message: 'You have unsaved changes on this tab. Leave anyway?',
        confirmLabel: 'Leave tab',
        isCurrent: () => {
          const current = committed.current;
          return (
            current.activeTab === source.activeTab &&
            current.dirtyTabs.has(source.activeTab) &&
            current.visibleIds.includes(source.activeTab) &&
            current.visibleIds.length === source.visibleIds.length &&
            current.visibleIds.every(
              (id, index) => id === source.visibleIds[index],
            )
          );
        },
        onConfirm: commit,
      });
    },
    [requestConfirmation],
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

  const setErrorTabs = useCallback((tabErrors: Map<string, string>) => {
    setErrorTabsState(tabErrors);
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
