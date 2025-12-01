/**
 * Multi-Unit Tabs Component
 * 
 * Browser-like tabs for editing multiple units.
 * Uses the new TabManagerStore for tab lifecycle management.
 * Integrates with URL routing for shareable links.
 * 
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { TabBar } from './TabBar';
import { NewTabModal } from './NewTabModal';
import { useTabManagerStore, UNIT_TEMPLATES, TabInfo } from '@/stores/useTabManagerStore';
import { TechBase } from '@/types/enums/TechBase';
import { DEFAULT_TAB } from '@/hooks/useCustomizerRouter';

// =============================================================================
// Types
// =============================================================================

interface MultiUnitTabsProps {
  /** Content to render for the active tab */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Multi-unit tab container with tab bar and content area
 */
export function MultiUnitTabs({
  children,
  className = '',
}: MultiUnitTabsProps) {
  const router = useRouter();
  
  // Use individual selectors for primitives and stable references
  // This avoids creating new objects on each render
  const tabs = useTabManagerStore((s) => s.tabs);
  const activeTabId = useTabManagerStore((s) => s.activeTabId);
  const isLoading = useTabManagerStore((s) => s.isLoading);
  const isNewTabModalOpen = useTabManagerStore((s) => s.isNewTabModalOpen);
  
  // Actions are stable references from the store
  const storeSelectTab = useTabManagerStore((s) => s.selectTab);
  const storeCloseTab = useTabManagerStore((s) => s.closeTab);
  const renameTab = useTabManagerStore((s) => s.renameTab);
  const createTab = useTabManagerStore((s) => s.createTab);
  const openNewTabModal = useTabManagerStore((s) => s.openNewTabModal);
  const closeNewTabModal = useTabManagerStore((s) => s.closeNewTabModal);
  
  // Select tab with URL navigation
  const selectTab = useCallback((tabId: string) => {
    storeSelectTab(tabId);
    // Navigate to the unit URL
    router.push(`/customizer/${tabId}/${DEFAULT_TAB}`, undefined, { shallow: true });
  }, [storeSelectTab, router]);
  
  // Close tab with URL navigation
  const closeTab = useCallback((tabId: string) => {
    // Get current tabs before closing
    const currentTabs = useTabManagerStore.getState().tabs;
    const closingTabIndex = currentTabs.findIndex((t) => t.id === tabId);
    
    // Close the tab in the store
    storeCloseTab(tabId);
    
    // Get updated state after closing
    const newState = useTabManagerStore.getState();
    
    if (newState.tabs.length === 0) {
      // All tabs closed - navigate to index (empty state)
      router.push('/customizer', undefined, { shallow: true });
    } else if (newState.activeTabId && newState.activeTabId !== tabId) {
      // A different tab is now active - navigate to it
      router.push(`/customizer/${newState.activeTabId}/${DEFAULT_TAB}`, undefined, { shallow: true });
    }
  }, [storeCloseTab, router]);
  
  // Create unit from template with URL navigation
  const createNewUnit = useCallback((tonnage: number, techBase: TechBase = TechBase.INNER_SPHERE) => {
    const template = UNIT_TEMPLATES.find(t => t.tonnage === tonnage) || UNIT_TEMPLATES[1];
    const templateWithTechBase = { ...template, techBase };
    const newTabId = createTab(templateWithTechBase);
    // Navigate to the new unit URL
    router.push(`/customizer/${newTabId}/${DEFAULT_TAB}`, undefined, { shallow: true });
    return newTabId;
  }, [createTab, router]);
  
  // Transform tabs to format expected by TabBar
  const tabBarTabs = useMemo(() => 
    tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      isModified: false, // Would need to track this separately
    })),
    [tabs]
  );
  
  // Loading state - show while Zustand is hydrating
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }
  
  // Empty state - no tabs
  if (tabs.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Units Open</h2>
          <p className="text-slate-400 mb-4">Create a new unit to get started</p>
          <button
            onClick={openNewTabModal}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
          >
            Create New Unit
          </button>
        </div>
        
        <NewTabModal
          isOpen={isNewTabModalOpen}
          onClose={closeNewTabModal}
          onCreateUnit={createNewUnit}
        />
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tab bar */}
      <TabBar
        tabs={tabBarTabs}
        activeTabId={activeTabId}
        onSelectTab={selectTab}
        onCloseTab={closeTab}
        onRenameTab={renameTab}
        onNewTab={openNewTabModal}
      />
      
      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
      
      {/* New tab modal */}
      <NewTabModal
        isOpen={isNewTabModalOpen}
        onClose={closeNewTabModal}
        onCreateUnit={createNewUnit}
      />
    </div>
  );
}
