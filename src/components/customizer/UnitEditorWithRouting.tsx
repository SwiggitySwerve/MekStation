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
import { GlobalLoadoutTray, LoadoutEquipmentItem, AvailableLocation } from '@/components/customizer/equipment/GlobalLoadoutTray';

// Equipment
import { EquipmentCategory } from '@/types/equipment';
import { JUMP_JETS } from '@/types/equipment/MiscEquipmentTypes';

// Types
import { MechLocation, LOCATION_SLOT_COUNTS } from '@/types/construction';
import { isValidLocationForEquipment } from '@/types/equipment/EquipmentPlacement';
import { EngineType, getEngineDefinition } from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';
import { TechBaseMode, isEffectivelyMixed } from '@/types/construction/TechBaseConfiguration';
import { calculateEnhancedMaxRunMP } from '@/utils/construction/movementCalculations';

// Utils
import { ValidationStatus } from '@/utils/colors/statusColors';
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';

// =============================================================================
// Constants
// =============================================================================

/** Jump jet equipment IDs for category normalization */
const JUMP_JET_IDS = new Set(JUMP_JETS.map(jj => jj.id));

/**
 * Get fixed slot indices for a location (occupied by system components)
 * These slots cannot have equipment assigned to them.
 */
function getFixedSlotIndices(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType
): Set<number> {
  const fixed = new Set<number>();
  
  switch (location) {
    case MechLocation.HEAD:
      // Life Support (0), Sensors (1), Cockpit (2), Sensors (4), Life Support (5)
      // Slot 3 is the only assignable slot in head
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(4);
      fixed.add(5);
      break;
      
    case MechLocation.CENTER_TORSO:
      // Engine slots + Gyro slots
      const engineDef = getEngineDefinition(engineType);
      const gyroDef = getGyroDefinition(gyroType);
      const engineSlots = engineDef?.ctSlots ?? 6;
      const gyroSlots = gyroDef?.criticalSlots ?? 4;
      // Engine takes first 3, then gyro, then remaining engine
      for (let i = 0; i < Math.min(3, engineSlots); i++) {
        fixed.add(i);
      }
      for (let i = 0; i < gyroSlots; i++) {
        fixed.add(3 + i);
      }
      for (let i = 3; i < engineSlots; i++) {
        fixed.add(3 + gyroSlots + (i - 3));
      }
      break;
      
    case MechLocation.LEFT_ARM:
    case MechLocation.RIGHT_ARM:
      // Actuators: Shoulder (0), Upper Arm (1), Lower Arm (2), Hand (3)
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(3);
      break;
      
    case MechLocation.LEFT_LEG:
    case MechLocation.RIGHT_LEG:
      // Actuators: Hip (0), Upper Leg (1), Lower Leg (2), Foot (3)
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(3);
      break;
      
    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO: {
      // XL/Light/XXL engines require side torso slots
      const sideTorsoEngineDef = getEngineDefinition(engineType);
      const sideTorsoSlots = sideTorsoEngineDef?.sideTorsoSlots ?? 0;
      for (let i = 0; i < sideTorsoSlots; i++) {
        fixed.add(i);
      }
      break;
    }
  }
  
  return fixed;
}

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
}: UnitEditorWithRoutingProps): React.ReactElement {
  // Loadout tray state
  const [isTrayExpanded, setIsTrayExpanded] = useState(true);
  
  // Equipment selection state (for critical slot assignment)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  
  // Access unit state from context
  const unitName = useUnitStore((s) => s.name);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBaseMode = useUnitStore((s) => s.techBaseMode);
  const componentTechBases = useUnitStore((s) => s.componentTechBases);
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
  const enhancement = useUnitStore((s) => s.enhancement);
  const removeEquipment = useUnitStore((s) => s.removeEquipment);
  const clearAllEquipment = useUnitStore((s) => s.clearAllEquipment);
  const clearEquipmentLocation = useUnitStore((s) => s.clearEquipmentLocation);
  const updateEquipmentLocation = useUnitStore((s) => s.updateEquipmentLocation);
  
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
  
  // Calculate max run MP with enhancement active
  const maxRunMP = useMemo(() => {
    if (!enhancement) return undefined;
    return calculateEnhancedMaxRunMP(calculations.walkMP, enhancement);
  }, [enhancement, calculations.walkMP]);

  // Compute effective tech base mode (detect mixed even if not in mixed mode)
  const effectiveTechBaseMode = useMemo(() => {
    // If mode is explicitly MIXED, use it
    if (techBaseMode === TechBaseMode.MIXED) {
      return TechBaseMode.MIXED;
    }
    // Check if components actually have different tech bases
    if (isEffectivelyMixed(componentTechBases)) {
      return TechBaseMode.MIXED;
    }
    // Use the declared mode
    return techBaseMode;
  }, [techBaseMode, componentTechBases]);

  const unitStats: UnitStats = useMemo(() => ({
    name: unitName,
    tonnage,
    techBaseMode: effectiveTechBaseMode,
    engineRating,
    walkMP: calculations.walkMP,
    runMP: calculations.runMP,
    jumpMP: calculations.jumpMP,
    maxRunMP,
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
  }), [unitName, tonnage, effectiveTechBaseMode, engineRating, calculations, equipmentCalcs, totalWeight, totalSlotsUsed, allocatedArmorPoints, maxArmorPoints, maxRunMP]);
  
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
  
  // Handle unassign equipment (clear its slot location)
  const handleUnassignEquipment = useCallback((instanceId: string) => {
    clearEquipmentLocation(instanceId);
  }, [clearEquipmentLocation]);
  
  // Calculate available locations for the selected equipment
  const availableLocations: AvailableLocation[] = useMemo(() => {
    if (!selectedEquipmentId) return [];
    
    const selectedItem = equipment.find(e => e.instanceId === selectedEquipmentId);
    if (!selectedItem) return [];
    
    const slotsNeeded = selectedItem.criticalSlots;
    const locations: AvailableLocation[] = [];
    
    // Location labels for display
    const locationLabels: Record<MechLocation, string> = {
      [MechLocation.HEAD]: 'Head',
      [MechLocation.CENTER_TORSO]: 'Center Torso',
      [MechLocation.LEFT_TORSO]: 'Left Torso',
      [MechLocation.RIGHT_TORSO]: 'Right Torso',
      [MechLocation.LEFT_ARM]: 'Left Arm',
      [MechLocation.RIGHT_ARM]: 'Right Arm',
      [MechLocation.LEFT_LEG]: 'Left Leg',
      [MechLocation.RIGHT_LEG]: 'Right Leg',
    };
    
    // Check each location
    const allLocations = Object.values(MechLocation) as MechLocation[];
    for (const loc of allLocations) {
      // Check location restrictions for this equipment
      if (!isValidLocationForEquipment(selectedItem.equipmentId, loc)) {
        // Location is forbidden for this equipment type
        locations.push({
          location: loc,
          label: locationLabels[loc],
          availableSlots: 0,
          canFit: false,
        });
        continue;
      }
      
      const totalSlots = LOCATION_SLOT_COUNTS[loc] || 0;
      
      // Get fixed slot indices (actuators, engine, gyro, etc.)
      const fixedSlots = getFixedSlotIndices(loc, engineType, gyroType);
      
      // Get slots used by existing equipment
      const usedSlotIndices = new Set<number>();
      for (const eq of equipment) {
        if (eq.location === loc && eq.slots) {
          for (const slot of eq.slots) {
            usedSlotIndices.add(slot);
          }
        }
      }
      
      // Calculate truly available slots (not fixed and not used by equipment)
      let availableSlots = 0;
      for (let i = 0; i < totalSlots; i++) {
        if (!fixedSlots.has(i) && !usedSlotIndices.has(i)) {
          availableSlots++;
        }
      }
      
      // Check if there's a contiguous range large enough
      let maxContiguous = 0;
      let currentContiguous = 0;
      for (let i = 0; i < totalSlots; i++) {
        if (!fixedSlots.has(i) && !usedSlotIndices.has(i)) {
          currentContiguous++;
          maxContiguous = Math.max(maxContiguous, currentContiguous);
        } else {
          currentContiguous = 0;
        }
      }
      
      locations.push({
        location: loc,
        label: locationLabels[loc],
        availableSlots,
        canFit: maxContiguous >= slotsNeeded,
      });
    }
    
    return locations;
  }, [selectedEquipmentId, equipment, engineType, gyroType]);
  
  // Handle quick assign to a location
  const handleQuickAssign = useCallback((instanceId: string, location: MechLocation) => {
    const item = equipment.find(e => e.instanceId === instanceId);
    if (!item) return;
    
    // Check location restrictions first
    if (!isValidLocationForEquipment(item.equipmentId, location)) {
      console.warn(`Cannot assign ${item.name} to ${location} - location restriction`);
      return;
    }
    
    // Find first contiguous empty slot range in the location
    const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;
    const slotsNeeded = item.criticalSlots;
    
    // Get fixed slot indices (actuators, engine, gyro, etc.)
    const fixedSlots = getFixedSlotIndices(location, engineType, gyroType);
    
    // Get slots already used by other equipment in this location
    const usedSlotIndices = new Set<number>();
    for (const eq of equipment) {
      if (eq.location === location && eq.slots) {
        for (const slot of eq.slots) {
          usedSlotIndices.add(slot);
        }
      }
    }
    
    // Find first available contiguous range (skipping fixed slots)
    for (let start = 0; start <= totalSlots - slotsNeeded; start++) {
      let canFit = true;
      for (let i = 0; i < slotsNeeded; i++) {
        const slotIdx = start + i;
        if (fixedSlots.has(slotIdx) || usedSlotIndices.has(slotIdx)) {
          canFit = false;
          break;
        }
      }
      if (canFit) {
        const slots: number[] = [];
        for (let i = 0; i < slotsNeeded; i++) {
          slots.push(start + i);
        }
        updateEquipmentLocation(instanceId, location, slots);
        setSelectedEquipmentId(null);
        return;
      }
    }
    
    // No contiguous slots found (shouldn't happen if canFit was true)
    console.warn('No contiguous slots found for quick assign');
  }, [equipment, engineType, gyroType, updateEquipmentLocation]);
  
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
          onUnassignEquipment={handleUnassignEquipment}
          onQuickAssign={handleQuickAssign}
          availableLocations={availableLocations}
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

