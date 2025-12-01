/**
 * Customizer Content Component
 * 
 * Main content for the customizer page.
 * This component is dynamically imported with SSR disabled to avoid
 * hydration issues with Zustand's persist middleware.
 * 
 * @spec openspec/changes/add-customizer-ui-components
 */

import React, { useEffect, useState, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Stores
import { useTabManagerStore, TabInfo } from '@/stores/useTabManagerStore';
import { UnitStoreProvider, ActiveTabInfo } from '@/stores/UnitStoreProvider';
import { useUnitStore } from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';

// Tab components
import { MultiUnitTabs } from '@/components/customizer/tabs';

// =============================================================================
// Single Selector for Tab State
// =============================================================================

interface TabManagerSnapshot {
  tabs: TabInfo[];
  activeTabId: string | null;
  isLoading: boolean;
}

/**
 * Single combined selector to avoid hook ordering issues
 */
const selectTabManagerState = (state: {
  tabs?: TabInfo[];
  activeTabId?: string | null;
  isLoading?: boolean;
}): TabManagerSnapshot => ({
  tabs: Array.isArray(state.tabs) ? state.tabs : [],
  activeTabId: state.activeTabId ?? null,
  isLoading: state.isLoading ?? true,
});

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main customizer content - runs only on client side
 */
export default function CustomizerContent() {
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Single selector to get all tab state at once
  const { tabs, activeTabId, isLoading } = useTabManagerStore(selectTabManagerState);
  
  // Trigger hydration on mount
  useEffect(() => {
    useTabManagerStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);
  
  // Derive active tab from state
  const activeTab: ActiveTabInfo | null = useMemo(() => {
    if (!activeTabId || tabs.length === 0) {
      return null;
    }
    const tab = tabs.find((t) => t.id === activeTabId);
    return tab ?? null;
  }, [tabs, activeTabId]);
  
  // Show loading during initial hydration
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading customizer...</div>
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
            {/* Content when a unit is selected */}
            <UnitEditorContent />
          </UnitStoreProvider>
        </MultiUnitTabs>
      </div>
    </DndProvider>
  );
}

// =============================================================================
// Unit Editor Content (uses UnitStoreContext)
// =============================================================================

/**
 * Unit editor content - rendered when UnitStoreProvider has a valid store
 */
function UnitEditorContent() {
  // Access unit state from context
  const unitName = useUnitStore((s) => s.name);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBase = useUnitStore((s) => s.techBase);
  
  return (
    <div className="flex-1 p-6">
      <div className="bg-slate-800 rounded-lg p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-white mb-4">Unit Editor</h2>
        <div className="space-y-2 text-slate-300">
          <p><span className="text-slate-500">Name:</span> {unitName}</p>
          <p><span className="text-slate-500">Tonnage:</span> {tonnage} tons</p>
          <p><span className="text-slate-500">Tech Base:</span> {techBase === TechBase.INNER_SPHERE ? 'Inner Sphere' : 'Clan'}</p>
        </div>
        <p className="text-xs text-slate-500 mt-6">
          UnitStoreProvider is active - unit data is accessible
        </p>
      </div>
    </div>
  );
}
