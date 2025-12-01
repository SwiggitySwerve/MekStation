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
import { CustomizerTabs, DEFAULT_CUSTOMIZER_TABS, useCustomizerTabs } from '@/components/customizer/tabs/CustomizerTabs';
import { StructureTab } from '@/components/customizer/tabs/StructureTab';
import { OverviewTab } from '@/components/customizer/tabs/OverviewTab';

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main customizer content - runs only on client side
 */
export default function CustomizerContent() {
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Use individual selectors for primitives and stable references
  const tabs = useTabManagerStore((s) => s.tabs);
  const activeTabId = useTabManagerStore((s) => s.activeTabId);
  const isLoading = useTabManagerStore((s) => s.isLoading);
  
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
 * Shows tabbed interface with Structure, Armor, Weapons, etc.
 */
function UnitEditorContent() {
  // Access unit state from context for header
  const unitName = useUnitStore((s) => s.name);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBase = useUnitStore((s) => s.techBase);
  
  // Customizer section tabs (Overview, Structure, Armor, etc.)
  const { tabs, activeTab, setActiveTab } = useCustomizerTabs('structure');
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Unit header with name and basic info */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{unitName}</h2>
            <p className="text-sm text-slate-400">
              {tonnage}t {techBase === TechBase.INNER_SPHERE ? 'Inner Sphere' : 'Clan'} BattleMech
            </p>
          </div>
        </div>
      </div>
      
      {/* Section tabs (Structure, Armor, Weapons, etc.) */}
      <CustomizerTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'structure' && <StructureTab />}
        {activeTab === 'armor' && <PlaceholderTab name="Armor" />}
        {activeTab === 'weapons' && <PlaceholderTab name="Weapons" />}
        {activeTab === 'equipment' && <PlaceholderTab name="Equipment" />}
        {activeTab === 'criticals' && <PlaceholderTab name="Critical Slots" />}
        {activeTab === 'fluff' && <PlaceholderTab name="Fluff" />}
      </div>
    </div>
  );
}

// =============================================================================
// Placeholder Tab (for tabs not yet fully implemented)
// =============================================================================

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center text-slate-400">
        <h3 className="text-xl font-bold mb-2">{name}</h3>
        <p className="text-sm">This section is under development</p>
      </div>
    </div>
  );
}
