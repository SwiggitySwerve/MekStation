/**
 * Customizer With Router
 * 
 * Integrates URL routing with the unit customizer.
 * Handles navigation between units and tabs via URL.
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Router
import { 
  useCustomizerRouter, 
  CustomizerTabId,
  DEFAULT_TAB,
  isValidTabId,
} from '@/hooks/useCustomizerRouter';

// Stores
import { useTabManagerStore, TabInfo } from '@/stores/useTabManagerStore';
import { UnitStoreProvider, ActiveTabInfo } from '@/stores/UnitStoreProvider';
import { hasUnitStore, hydrateOrCreateUnit } from '@/stores/unitStoreRegistry';
import { TechBase } from '@/types/enums/TechBase';

// Components
import { MultiUnitTabs } from '@/components/customizer/tabs';
import { UnitEditorWithRouting } from './UnitEditorWithRouting';

// =============================================================================
// Main Component
// =============================================================================

/**
 * Customizer with URL routing support
 * Runs only on client side (dynamically imported with SSR disabled)
 */
export default function CustomizerWithRouter() {
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Tab manager store (for multi-unit tabs)
  const tabs = useTabManagerStore((s) => s.tabs);
  const activeTabId = useTabManagerStore((s) => s.activeTabId);
  const isLoading = useTabManagerStore((s) => s.isLoading);
  const selectTab = useTabManagerStore((s) => s.selectTab);
  
  // URL router - pass activeTabId as fallback for index page navigation
  // This enables tab switching even when on /customizer without unit ID in URL
  const router = useCustomizerRouter({ fallbackUnitId: activeTabId });
  
  // Prevent sync loops
  const isSyncingRef = useRef(false);
  const lastSyncedRef = useRef<{ unitId: string | null; activeTabId: string | null }>({
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
  
  // Trigger hydration on mount
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
    if (lastSyncedRef.current.unitId === routerUnitId && 
        lastSyncedRef.current.activeTabId === activeTabId) {
      return;
    }
    
    // If URL has a unit ID that differs from active tab
    if (routerUnitId && routerIsValid && routerUnitId !== activeTabId) {
      // Check if this unit exists in our tabs
      const tabExists = tabs.some((t) => t.id === routerUnitId);
      
      if (tabExists) {
        isSyncingRef.current = true;
        selectTab(routerUnitId);
        lastSyncedRef.current = { unitId: routerUnitId, activeTabId: routerUnitId };
        // Reset sync flag after a tick
        setTimeout(() => { isSyncingRef.current = false; }, 0);
      } else {
        // Unit doesn't exist in tabs - redirect to index
        console.warn('Unit not found in tabs:', routerUnitId);
        isSyncingRef.current = true;
        routerNavigateToIndex();
        setTimeout(() => { isSyncingRef.current = false; }, 0);
      }
    }
  }, [isHydrated, isLoading, routerUnitId, routerIsValid, activeTabId, tabs, selectTab, routerNavigateToIndex]);
  
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
      if (lastSyncedRef.current.unitId === activeTabId && 
          lastSyncedRef.current.activeTabId === activeTabId) {
        return;
      }
      
      isSyncingRef.current = true;
      routerSyncUrl(activeTabId, routerTabId);
      lastSyncedRef.current = { unitId: activeTabId, activeTabId };
      setTimeout(() => { isSyncingRef.current = false; }, 0);
    }
  }, [isHydrated, isLoading, activeTabId, routerUnitId, routerTabId, routerSyncUrl]);
  
  // ==========================================================================
  // Derive active tab info for provider
  // ==========================================================================
  
  const activeTab: ActiveTabInfo | null = useMemo(() => {
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading customizer...</div>
      </div>
    );
  }
  
  // Invalid unit ID in URL
  if (!routerIsValid && !routerIsIndex) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400 p-8">
          <p className="text-lg mb-2">Invalid unit ID</p>
          <p className="text-sm mb-4">The requested unit could not be found.</p>
          <button
            onClick={routerNavigateToIndex}
            className="px-4 py-2 bg-amber-500 text-slate-900 rounded hover:bg-amber-400 transition-colors"
          >
            Go to Customizer
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Multi-unit tabs at top */}
        <MultiUnitTabs>
          {/* UnitStoreProvider - activeTab passed as prop */}
          <UnitStoreProvider
            activeTab={activeTab}
            fallback={
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-400 p-8">
                  <p className="text-lg mb-2">No unit selected</p>
                  <p className="text-sm">Click &quot;New Unit&quot; to create a new BattleMech</p>
                </div>
              </div>
            }
          >
            {/* Unit editor with routing support */}
            <UnitEditorWithRouting
              activeTabId={routerTabId}
              onTabChange={router.navigateToTab}
            />
          </UnitStoreProvider>
        </MultiUnitTabs>
      </div>
    </DndProvider>
  );
}

