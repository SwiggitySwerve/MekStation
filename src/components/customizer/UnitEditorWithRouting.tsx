/**
 * Unit Editor With Routing
 * 
 * Unit editor content that uses URL-based tab navigation.
 * Receives active tab from router instead of local state.
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useMemo } from 'react';

// Stores
import { useUnitStore } from '@/stores/useUnitStore';
import { getTotalAllocatedArmor } from '@/stores/unitState';

// Hooks
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { CustomizerTabId, VALID_TAB_IDS } from '@/hooks/useCustomizerRouter';

// Components
import { CustomizerTabs, DEFAULT_CUSTOMIZER_TABS, CustomizerTabConfig } from '@/components/customizer/tabs/CustomizerTabs';
import { StructureTab } from '@/components/customizer/tabs/StructureTab';
import { OverviewTab } from '@/components/customizer/tabs/OverviewTab';
import { ArmorTab } from '@/components/customizer/tabs/ArmorTab';
import { UnitInfoBanner, UnitStats } from '@/components/customizer/shared/UnitInfoBanner';

// Utils
import { ValidationStatus } from '@/utils/colors/statusColors';
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';

// =============================================================================
// Types
// =============================================================================

interface UnitEditorWithRoutingProps {
  /** Active tab ID from URL */
  activeTabId: CustomizerTabId;
  /** Called when user changes tabs */
  onTabChange: (tabId: CustomizerTabId) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Unit editor content - rendered when UnitStoreProvider has a valid store
 * Shows tabbed interface with Structure, Armor, Weapons, etc.
 * Tab state is managed via URL routing.
 */
export function UnitEditorWithRouting({
  activeTabId,
  onTabChange,
}: UnitEditorWithRoutingProps) {
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
  
  // Calculate armor stats for display
  const allocatedArmorPoints = useMemo(
    () => getTotalAllocatedArmor(armorAllocation),
    [armorAllocation]
  );
  const maxArmorPoints = useMemo(
    () => getMaxTotalArmor(tonnage),
    [tonnage]
  );
  
  // Calculate unit stats (weight is based on armorTonnage, not allocated points)
  const calculations = useUnitCalculations(
    tonnage,
    {
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      heatSinkType,
      heatSinkCount,
      armorType,
    },
    armorTonnage
  );
  
  // Build stats object for UnitInfoBanner
  const unitStats: UnitStats = useMemo(() => ({
    name: unitName,
    tonnage,
    techBase,
    walkMP: calculations.walkMP,
    runMP: calculations.runMP,
    jumpMP: 0, // TODO: Calculate from jump jets when equipment system is added
    weightUsed: calculations.totalStructuralWeight,
    weightRemaining: tonnage - calculations.totalStructuralWeight,
    armorPoints: allocatedArmorPoints,
    maxArmorPoints: maxArmorPoints,
    criticalSlotsUsed: calculations.totalSystemSlots,
    criticalSlotsTotal: 78,
    heatGenerated: 0, // TODO: Calculate from weapons
    heatDissipation: calculations.totalHeatDissipation,
    validationStatus: 'valid' as ValidationStatus, // TODO: Get from validation
    errorCount: 0,
    warningCount: 0,
  }), [unitName, tonnage, techBase, calculations, allocatedArmorPoints, maxArmorPoints]);
  
  // Handle tab change - delegate to router
  const handleTabChange = (tabId: string) => {
    if (VALID_TAB_IDS.includes(tabId as CustomizerTabId)) {
      onTabChange(tabId as CustomizerTabId);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Unit Info Banner - at-a-glance stats */}
      <div className="p-2 bg-slate-900 border-b border-slate-700">
        <UnitInfoBanner stats={unitStats} />
      </div>
      
      {/* Section tabs (Structure, Armor, Weapons, etc.) */}
      <CustomizerTabs
        tabs={DEFAULT_CUSTOMIZER_TABS}
        activeTab={activeTabId}
        onTabChange={handleTabChange}
      />
      
      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTabId === 'overview' && <OverviewTab />}
        {activeTabId === 'structure' && <StructureTab />}
        {activeTabId === 'armor' && <ArmorTab />}
        {activeTabId === 'weapons' && <PlaceholderTab name="Weapons" />}
        {activeTabId === 'equipment' && <PlaceholderTab name="Equipment" />}
        {activeTabId === 'criticals' && <PlaceholderTab name="Critical Slots" />}
        {activeTabId === 'fluff' && <PlaceholderTab name="Fluff" />}
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

