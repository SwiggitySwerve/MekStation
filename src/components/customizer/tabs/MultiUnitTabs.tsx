/**
 * Multi-Unit Tabs Component
 * 
 * Browser-like tabs for editing multiple units.
 * Uses the new TabManagerStore for tab lifecycle management.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/add-customizer-ui-components/specs/unit-store-architecture/spec.md
 */

import React, { useCallback, useMemo } from 'react';
import { TabBar } from './TabBar';
import { NewTabModal } from './NewTabModal';
import { useTabManagerStore, UNIT_TEMPLATES, TabInfo } from '@/stores/useTabManagerStore';
import { TechBase } from '@/types/enums/TechBase';

// =============================================================================
// Types
// =============================================================================

interface MultiUnitTabsProps {
  /** Content to render for the active tab */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Combined selector state for stable hook ordering
 */
interface TabManagerSnapshot {
  tabs: TabInfo[];
  activeTabId: string | null;
  isLoading: boolean;
  isNewTabModalOpen: boolean;
}

/**
 * Combined actions for stable hook ordering
 */
interface TabManagerActions {
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  renameTab: (tabId: string, newName: string) => void;
  createTab: (template: { id: string; name: string; tonnage: number; techBase: TechBase; walkMP: number }, customName?: string) => string;
  openNewTabModal: () => void;
  closeNewTabModal: () => void;
}

// =============================================================================
// Single Selectors
// =============================================================================

/**
 * Single combined selector for state - avoids hook ordering issues
 */
const selectState = (s: {
  tabs?: TabInfo[];
  activeTabId?: string | null;
  isLoading?: boolean;
  isNewTabModalOpen?: boolean;
}): TabManagerSnapshot => ({
  tabs: Array.isArray(s.tabs) ? s.tabs : [],
  activeTabId: s.activeTabId ?? null,
  isLoading: s.isLoading ?? true,
  isNewTabModalOpen: s.isNewTabModalOpen ?? false,
});

/**
 * Single combined selector for actions - avoids hook ordering issues
 */
const selectActions = (s: {
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  renameTab: (tabId: string, newName: string) => void;
  createTab: (template: { id: string; name: string; tonnage: number; techBase: TechBase; walkMP: number }, customName?: string) => string;
  openNewTabModal: () => void;
  closeNewTabModal: () => void;
}): TabManagerActions => ({
  selectTab: s.selectTab,
  closeTab: s.closeTab,
  renameTab: s.renameTab,
  createTab: s.createTab,
  openNewTabModal: s.openNewTabModal,
  closeNewTabModal: s.closeNewTabModal,
});

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
  // Use combined selectors for stable hook ordering
  const { tabs, activeTabId, isLoading, isNewTabModalOpen } = useTabManagerStore(selectState);
  const { selectTab, closeTab, renameTab, createTab, openNewTabModal, closeNewTabModal } = useTabManagerStore(selectActions);
  
  // Create unit from template
  const createNewUnit = useCallback((tonnage: number, techBase: TechBase = TechBase.INNER_SPHERE) => {
    const template = UNIT_TEMPLATES.find(t => t.tonnage === tonnage) || UNIT_TEMPLATES[1];
    const templateWithTechBase = { ...template, techBase };
    return createTab(templateWithTechBase);
  }, [createTab]);
  
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
