/**
 * Customizer Content Component
 * 
 * Main content for the customizer page.
 * This component is dynamically imported with SSR disabled to avoid
 * hydration issues with Zustand's persist middleware.
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
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
import { ArmorTab } from '@/components/customizer/tabs/ArmorTab';
import { EquipmentTab } from '@/components/customizer/tabs/EquipmentTab';

// Shared components
import { UnitInfoBanner, UnitStats } from '@/components/customizer/shared/UnitInfoBanner';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { useEquipmentCalculations } from '@/hooks/useEquipmentCalculations';
import { ValidationStatus } from '@/utils/colors/statusColors';
import { getTotalAllocatedArmor } from '@/stores/unitState';
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';

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
  // Access unit state from context
  const unitName = useUnitStore((s) => s.name);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBase = useUnitStore((s) => s.techBase);
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const cockpitType = useUnitStore((s) => s.cockpitType);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const armorType = useUnitStore((s) => s.armorType);
  const armorTonnage = useUnitStore((s) => s.armorTonnage);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  const equipment = useUnitStore((s) => s.equipment);
  
  // Calculate equipment totals
  const equipmentCalcs = useEquipmentCalculations(equipment);
  
  // Calculate armor stats for display
  const allocatedArmorPoints = useMemo(
    () => getTotalAllocatedArmor(armorAllocation),
    [armorAllocation]
  );
  const maxArmorPoints = useMemo(
    () => getMaxTotalArmor(tonnage),
    [tonnage]
  );
  
  // Memoize component selections to avoid breaking hook memoization
  const componentSelections = useMemo(() => ({
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
    heatSinkType,
    heatSinkCount,
    armorType,
  }), [engineType, engineRating, gyroType, internalStructureType, cockpitType, heatSinkType, heatSinkCount, armorType]);
  
  // Calculate unit stats (weight is based on armorTonnage, not allocated points)
  const calculations = useUnitCalculations(
    tonnage,
    componentSelections,
    armorTonnage
  );
  
  // Build stats object for UnitInfoBanner
  const totalWeight = calculations.totalStructuralWeight + equipmentCalcs.totalWeight;
  const totalSlotsUsed = calculations.totalSystemSlots + equipmentCalcs.totalSlots;
  
  const unitStats: UnitStats = useMemo(() => ({
    name: unitName,
    tonnage,
    techBase,
    walkMP: calculations.walkMP,
    runMP: calculations.runMP,
    jumpMP: 0, // TODO: Calculate from jump jets
    weightUsed: totalWeight,
    weightRemaining: tonnage - totalWeight,
    armorPoints: allocatedArmorPoints,
    maxArmorPoints: maxArmorPoints,
    criticalSlotsUsed: totalSlotsUsed,
    criticalSlotsTotal: 78,
    heatGenerated: equipmentCalcs.totalHeat,
    heatDissipation: calculations.totalHeatDissipation,
    validationStatus: 'valid' as ValidationStatus, // TODO: Get from validation
    errorCount: 0,
    warningCount: 0,
  }), [unitName, tonnage, techBase, calculations, equipmentCalcs, totalWeight, totalSlotsUsed, allocatedArmorPoints, maxArmorPoints]);
  
  // Customizer section tabs (Overview, Structure, Armor, etc.)
  const { tabs, activeTab, setActiveTab } = useCustomizerTabs('structure');
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Unit Info Banner - at-a-glance stats */}
      <div className="p-2 bg-slate-900 border-b border-slate-700">
        <UnitInfoBanner stats={unitStats} />
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
        {activeTab === 'armor' && <ArmorTab />}
        {activeTab === 'weapons' && <PlaceholderTab name="Weapons" />}
        {activeTab === 'equipment' && <EquipmentTab />}
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
