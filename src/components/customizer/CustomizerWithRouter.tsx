/**
 * Customizer With Router
 * 
 * Integrates URL routing with the unit customizer.
 * Handles navigation between units and tabs via URL.
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  
  // URL router
  const router = useCustomizerRouter();
  
  // Tab manager store (for multi-unit tabs)
  const tabs = useTabManagerStore((s) => s.tabs);
  const activeTabId = useTabManagerStore((s) => s.activeTabId);
  const isLoading = useTabManagerStore((s) => s.isLoading);
  const selectTab = useTabManagerStore((s) => s.selectTab);
  
  // Trigger hydration on mount
  useEffect(() => {
    useTabManagerStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);
  
  // ==========================================================================
  // URL -> State Sync
  // ==========================================================================
  
  // When URL has a unit ID, ensure it's selected in the tab manager
  useEffect(() => {
    if (!isHydrated || isLoading) return;
    
    const { unitId, isValid, isIndex } = router;
    
    // If on index and we have an active tab, sync URL to it
    if (isIndex && activeTabId && tabs.length > 0) {
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (activeTab) {
        router.syncUrl(activeTabId, router.tabId);
      }
      return;
    }
    
    // If URL has a unit ID
    if (unitId && isValid) {
      // Check if this unit exists in our tabs
      const tabExists = tabs.some((t) => t.id === unitId);
      
      if (tabExists) {
        // Unit exists, select it if not already selected
        if (activeTabId !== unitId) {
          selectTab(unitId);
        }
      } else {
        // Unit doesn't exist in tabs - could be from a shared link
        // For now, redirect to index. Future: could load from server
        console.warn('Unit not found in tabs:', unitId);
        router.navigateToIndex();
      }
    }
  }, [isHydrated, isLoading, router.unitId, router.isValid, router.isIndex, activeTabId, tabs, selectTab, router]);
  
  // ==========================================================================
  // State -> URL Sync
  // ==========================================================================
  
  // When active tab changes, update URL
  useEffect(() => {
    if (!isHydrated || isLoading || !activeTabId) return;
    
    // Only sync if the URL doesn't match
    if (router.unitId !== activeTabId) {
      router.syncUrl(activeTabId, router.tabId);
    }
  }, [isHydrated, isLoading, activeTabId, router.unitId, router.tabId, router]);
  
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
  if (!router.isValid && !router.isIndex) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400 p-8">
          <p className="text-lg mb-2">Invalid unit ID</p>
          <p className="text-sm mb-4">The requested unit could not be found.</p>
          <button
            onClick={() => router.navigateToIndex()}
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
              activeTabId={router.tabId}
              onTabChange={router.navigateToTab}
            />
          </UnitStoreProvider>
        </MultiUnitTabs>
      </div>
    </DndProvider>
  );
}

