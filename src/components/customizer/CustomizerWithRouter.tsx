/**
 * Customizer With Router
 *
 * Integrates URL routing with the unit customizer.
 * Handles navigation between units and tabs via URL.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { ErrorBoundary } from '@/components/common';
// Components
import { MultiUnitTabs } from '@/components/customizer/tabs';
// Hooks
import { useAutoSaveIndicator } from '@/hooks/useAutoSaveIndicator';
// Router
import {
  useCustomizerRouter,
  CustomizerTabId,
  isValidTabId,
} from '@/hooks/useCustomizerRouter';
// Stores
import { useTabManagerStore, TabInfo } from '@/stores/useTabManagerStore';

import { UnitTypeRouter } from './UnitTypeRouter';

// =============================================================================
// Main Component
// =============================================================================

/**
 * Customizer with URL routing support
 * Runs only on client side (dynamically imported with SSR disabled)
 */
export default function CustomizerWithRouter(): React.ReactElement {
  const [isHydrated, setIsHydrated] = useState(false);

  // Tab manager store (for multi-unit tabs)
  const tabs = useTabManagerStore((s) => s.tabs);
  const activeTabId = useTabManagerStore((s) => s.activeTabId);
  const isLoading = useTabManagerStore((s) => s.isLoading);
  const selectTab = useTabManagerStore((s) => s.selectTab);
  const setLastSubTab = useTabManagerStore((s) => s.setLastSubTab);
  const getLastSubTab = useTabManagerStore((s) => s.getLastSubTab);

  // URL router - pass activeTabId as fallback for index page navigation
  // This enables tab switching even when on /customizer without unit ID in URL
  const router = useCustomizerRouter({ fallbackUnitId: activeTabId });

  // Prevent sync loops
  const isSyncingRef = useRef(false);
  const lastSyncedRef = useRef<{
    unitId: string | null;
    activeTabId: string | null;
  }>({
    unitId: null,
    activeTabId: null,
  });

  // Extract stable values from router to avoid dependency on router object
  const routerUnitId = router.unitId;
  const routerTabId = router.tabId;
  const routerIsValid = router.isValid;
  const routerIsIndex = router.isIndex;
  const routerSyncUrl = router.syncUrl;
  const routerNavigateToIndex = router.navigateToIndex;

  // Get effective tab ID: URL tab takes precedence, then stored lastSubTab, then default
  const effectiveUnitId = routerUnitId || activeTabId;
  const storedSubTab = effectiveUnitId
    ? getLastSubTab(effectiveUnitId)
    : undefined;
  // Use stored sub-tab only when URL has default 'structure' (meaning no explicit tab in URL)
  const effectiveTabId: CustomizerTabId =
    routerTabId !== 'structure'
      ? routerTabId
      : storedSubTab && isValidTabId(storedSubTab)
        ? storedSubTab
        : routerTabId;

  useAutoSaveIndicator();

  useEffect(() => {
    useTabManagerStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  // ==========================================================================
  // URL -> State Sync (only when URL changes from external navigation)
  // ==========================================================================

  useEffect(() => {
    if (!isHydrated || isLoading) return;
    if (isSyncingRef.current) return;

    // Skip if we just synced this combination
    if (
      lastSyncedRef.current.unitId === routerUnitId &&
      lastSyncedRef.current.activeTabId === activeTabId
    ) {
      return;
    }

    // If URL has a unit ID that differs from active tab
    if (routerUnitId && routerIsValid && routerUnitId !== activeTabId) {
      // Check if this unit exists in our tabs
      const tabExists = tabs.some((t) => t.id === routerUnitId);

      if (tabExists) {
        isSyncingRef.current = true;
        selectTab(routerUnitId);
        lastSyncedRef.current = {
          unitId: routerUnitId,
          activeTabId: routerUnitId,
        };
        // Reset sync flag after a tick
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 0);
      } else {
        // Unit doesn't exist in tabs - redirect to index
        console.warn('Unit not found in tabs:', routerUnitId);
        isSyncingRef.current = true;
        routerNavigateToIndex();
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 0);
      }
    }
  }, [
    isHydrated,
    isLoading,
    routerUnitId,
    routerIsValid,
    activeTabId,
    tabs,
    selectTab,
    routerNavigateToIndex,
  ]);

  // ==========================================================================
  // State -> URL Sync (only when active tab changes from user action)
  // ==========================================================================

  useEffect(() => {
    if (!isHydrated || isLoading) return;
    if (isSyncingRef.current) return;
    if (!activeTabId) return;

    // Only sync if the URL doesn't match and we haven't just synced
    if (routerUnitId !== activeTabId) {
      // Skip if this is the same sync we just did
      if (
        lastSyncedRef.current.unitId === activeTabId &&
        lastSyncedRef.current.activeTabId === activeTabId
      ) {
        return;
      }

      isSyncingRef.current = true;
      // When switching units, restore the last active sub-tab for that unit
      // instead of carrying over the current URL's tab (which was for the old unit)
      const storedTab = getLastSubTab(activeTabId);
      const tabToSync: CustomizerTabId =
        storedTab && isValidTabId(storedTab) ? storedTab : 'structure';
      routerSyncUrl(activeTabId, tabToSync);
      lastSyncedRef.current = { unitId: activeTabId, activeTabId };
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
    }
  }, [
    isHydrated,
    isLoading,
    activeTabId,
    routerUnitId,
    routerSyncUrl,
    getLastSubTab,
  ]);

  const activeTab: TabInfo | null = useMemo(() => {
    if (!activeTabId || tabs.length === 0) {
      return null;
    }
    const tab = tabs.find((t) => t.id === activeTabId);
    return tab ?? null;
  }, [tabs, activeTabId]);

  // ==========================================================================
  // Render
  // ==========================================================================

  // Show loading during initial hydration
  if (!isHydrated || isLoading) {
    return (
      <div className="bg-surface-deep flex min-h-screen items-center justify-center">
        <div className="text-text-theme-secondary">Loading customizer...</div>
      </div>
    );
  }

  // Invalid unit ID in URL
  if (!routerIsValid && !routerIsIndex) {
    return (
      <div className="bg-surface-deep flex min-h-screen items-center justify-center">
        <div className="text-text-theme-secondary p-8 text-center">
          <p className="mb-2 text-lg">Invalid unit ID</p>
          <p className="mb-4 text-sm">The requested unit could not be found.</p>
          <button
            onClick={routerNavigateToIndex}
            className="bg-accent text-surface-deep hover:bg-accent-hover rounded px-4 py-2 transition-colors"
          >
            Go to Customizer
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="CustomizerWithRouter">
      <DndProvider backend={HTML5Backend}>
        <div className="bg-surface-deep flex min-h-screen flex-col">
          <MultiUnitTabs>
            <ErrorBoundary componentName="UnitTypeRouter">
              <UnitTypeRouter
                activeTab={activeTab}
                activeTabId={effectiveTabId}
                onTabChange={(tabId) => {
                  if (activeTabId) {
                    setLastSubTab(activeTabId, tabId);
                  }
                  router.navigateToTab(tabId);
                }}
              />
            </ErrorBoundary>
          </MultiUnitTabs>
        </div>
      </DndProvider>
    </ErrorBoundary>
  );
}
