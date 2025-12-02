/**
 * Unit Editor With Routing
 * 
 * Unit editor content that uses URL-based tab navigation.
 * Receives active tab from router instead of local state.
 * Includes global loadout tray on right and status bar at bottom.
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/equipment-tray/spec.md
 */

import React, { useMemo, useState, useCallback } from 'react';

// Stores
import { useUnitStore } from '@/stores/useUnitStore';
import { getTotalAllocatedArmor } from '@/stores/unitState';

// Hooks
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { useEquipmentCalculations } from '@/hooks/useEquipmentCalculations';
import { CustomizerTabId, VALID_TAB_IDS } from '@/hooks/useCustomizerRouter';

// Components
import { CustomizerTabs, DEFAULT_CUSTOMIZER_TABS } from '@/components/customizer/tabs/CustomizerTabs';
import { StructureTab } from '@/components/customizer/tabs/StructureTab';
import { OverviewTab } from '@/components/customizer/tabs/OverviewTab';
import { ArmorTab } from '@/components/customizer/tabs/ArmorTab';
import { EquipmentTab } from '@/components/customizer/tabs/EquipmentTab';
import { CriticalSlotsTab } from '@/components/customizer/tabs/CriticalSlotsTab';
import { UnitInfoBanner, UnitStats } from '@/components/customizer/shared/UnitInfoBanner';
import { GlobalLoadoutTray, LoadoutEquipmentItem } from '@/components/customizer/equipment/GlobalLoadoutTray';
import { GlobalStatusBar, StatusBarStats } from '@/components/customizer/shared/GlobalStatusBar';

// Equipment
import { EquipmentCategory } from '@/types/equipment';
import { JUMP_JETS } from '@/types/equipment/MiscEquipmentTypes';

// Utils
import { ValidationStatus } from '@/utils/colors/statusColors';
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';

// =============================================================================
// Constants
// =============================================================================

/** Jump jet equipment IDs for category normalization */
const JUMP_JET_IDS = new Set(JUMP_JETS.map(jj => jj.id));

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
 * Includes global loadout tray on right and status bar at bottom.
 */
export function UnitEditorWithRouting({
  activeTabId,
  onTabChange,
}: UnitEditorWithRoutingProps) {
  // Loadout tray state
  const [isTrayExpanded, setIsTrayExpanded] = useState(true);
  
  // Equipment selection state (for critical slot assignment)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  
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
  const jumpMP = useUnitStore((s) => s.jumpMP);
  const jumpJetType = useUnitStore((s) => s.jumpJetType);
  const removeEquipment = useUnitStore((s) => s.removeEquipment);
  const clearAllEquipment = useUnitStore((s) => s.clearAllEquipment);
  
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
    jumpMP,
    jumpJetType,
  }), [engineType, engineRating, gyroType, internalStructureType, cockpitType, heatSinkType, heatSinkCount, armorType, jumpMP, jumpJetType]);
  
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
    jumpMP: calculations.jumpMP,
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
  
  // Convert equipment to LoadoutEquipmentItem format
  // Normalize categories for consistent display (e.g., jump jets -> Movement)
  const loadoutEquipment: LoadoutEquipmentItem[] = useMemo(() => {
    return equipment.map((item) => {
      // Normalize category: jump jets should be in Movement category
      const normalizedCategory = JUMP_JET_IDS.has(item.equipmentId)
        ? EquipmentCategory.MOVEMENT
        : item.category;
      
      return {
        instanceId: item.instanceId,
        name: item.name,
        category: normalizedCategory,
        weight: item.weight,
        criticalSlots: item.criticalSlots,
        isAllocated: !!item.location,
        location: item.location,
        isRemovable: item.isRemovable,
      };
    });
  }, [equipment]);
  
  // Handle equipment removal
  const handleRemoveEquipment = useCallback((instanceId: string) => {
    removeEquipment(instanceId);
  }, [removeEquipment]);
  
  // Handle remove all equipment
  const handleRemoveAllEquipment = useCallback(() => {
    clearAllEquipment();
  }, [clearAllEquipment]);
  
  // Toggle tray expansion
  const handleToggleTray = useCallback(() => {
    setIsTrayExpanded((prev) => !prev);
  }, []);
  
  // Handle equipment selection for slot assignment
  const handleSelectEquipment = useCallback((id: string | null) => {
    setSelectedEquipmentId(id);
  }, []);
  
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
      
      {/* Main content area with tray */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left side: Tabs and content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
            {activeTabId === 'equipment' && <EquipmentTab />}
            {activeTabId === 'criticals' && (
              <CriticalSlotsTab
                selectedEquipmentId={selectedEquipmentId}
                onSelectEquipment={handleSelectEquipment}
              />
            )}
            {activeTabId === 'fluff' && <PlaceholderTab name="Fluff" />}
          </div>
        </div>
        
        {/* Right side: Global Loadout Tray */}
        <GlobalLoadoutTray
          equipment={loadoutEquipment}
          equipmentCount={equipment.length}
          onRemoveEquipment={handleRemoveEquipment}
          onRemoveAllEquipment={handleRemoveAllEquipment}
          isExpanded={isTrayExpanded}
          onToggleExpand={handleToggleTray}
          selectedEquipmentId={selectedEquipmentId}
          onSelectEquipment={handleSelectEquipment}
        />
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

