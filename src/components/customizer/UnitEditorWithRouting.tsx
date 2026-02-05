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

import type {
  LoadoutEquipmentItem,
  AvailableLocation,
} from '@/components/customizer/equipment/GlobalLoadoutTray';
import type { MobileLoadoutStats } from '@/components/customizer/mobile';

import { ErrorBoundary } from '@/components/common';
import { ResponsiveLoadoutTray } from '@/components/customizer/equipment/ResponsiveLoadoutTray';
import {
  UnitInfoBanner,
  UnitStats,
} from '@/components/customizer/shared/UnitInfoBanner';
import { ArmorTab } from '@/components/customizer/tabs/ArmorTab';
import { CriticalSlotsTab } from '@/components/customizer/tabs/CriticalSlotsTab';
// Components
import {
  CustomizerTabs,
  DEFAULT_CUSTOMIZER_TABS,
} from '@/components/customizer/tabs/CustomizerTabs';
import { EquipmentTab } from '@/components/customizer/tabs/EquipmentTab';
import { OverviewTab } from '@/components/customizer/tabs/OverviewTab';
import { PreviewTab } from '@/components/customizer/tabs/PreviewTab';
import { StructureTab } from '@/components/customizer/tabs/StructureTab';
import { CustomizerTabId, VALID_TAB_IDS } from '@/hooks/useCustomizerRouter';
import { useEquipmentCalculations } from '@/hooks/useEquipmentCalculations';
import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { usePersistedState, STORAGE_KEYS } from '@/hooks/usePersistedState';
// Hooks
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { useUnitValidation } from '@/hooks/useUnitValidation';
import { useValidationNavigation } from '@/hooks/useValidationNavigation';
import { useValidationToast } from '@/hooks/useValidationToast';
// Services
import { calculationService } from '@/services/construction/CalculationService';
import {
  IEditableMech,
  IArmorAllocation as IEditableArmorAllocation,
} from '@/services/construction/MechBuilderService';
import { getTotalAllocatedArmor } from '@/stores/unitState';
// Stores
import { useUnitStore } from '@/stores/useUnitStore';
// Types
import { MechLocation, LOCATION_SLOT_COUNTS } from '@/types/construction';
import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';
import {
  TechBaseMode,
  isEffectivelyMixed,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
// Equipment
import { EquipmentCategory } from '@/types/equipment';
import { isValidLocationForEquipment } from '@/types/equipment/EquipmentPlacement';
import { JUMP_JETS } from '@/types/equipment/MiscEquipmentTypes';
import {
  getWeaponById,
  isDirectFireWeaponById,
} from '@/types/equipment/weapons/utilities';
// Utils
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';
import {
  getMovementModifiersFromEquipment,
  calculateMaxRunMPWithModifiers,
} from '@/utils/construction/movementCalculations';

// =============================================================================
// Constants
// =============================================================================

/** Jump jet equipment IDs for category normalization */
const JUMP_JET_IDS = new Set(JUMP_JETS.map((jj) => jj.id));

/**
 * Get fixed slot indices for a location (occupied by system components)
 * These slots cannot have equipment assigned to them.
 */
function getFixedSlotIndices(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
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
  // Persist loadout tray expanded state to localStorage
  const [isTrayExpanded, setIsTrayExpanded] = usePersistedState(
    STORAGE_KEYS.LOADOUT_TRAY_EXPANDED,
    true, // Default: expanded on desktop
  );

  // Equipment selection state (for critical slot assignment)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(
    null,
  );

  // Track equipment registry initialization for BV calculation
  const { isReady: registryReady } = useEquipmentRegistry();

  // Access unit state from context
  const unitName = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const configuration = useUnitStore((s) => s.configuration);
  const techBase = useUnitStore((s) => s.techBase);
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
  const isOmni = useUnitStore((s) => s.isOmni);
  const jumpMP = useUnitStore((s) => s.jumpMP);
  const jumpJetType = useUnitStore((s) => s.jumpJetType);
  const removeEquipment = useUnitStore((s) => s.removeEquipment);
  const clearAllEquipment = useUnitStore((s) => s.clearAllEquipment);
  const clearEquipmentLocation = useUnitStore((s) => s.clearEquipmentLocation);
  const updateEquipmentLocation = useUnitStore(
    (s) => s.updateEquipmentLocation,
  );

  // Calculate equipment totals
  const equipmentCalcs = useEquipmentCalculations(equipment);

  // Get real-time validation results
  const validation = useUnitValidation();
  const validationNav = useValidationNavigation(validation);
  useValidationToast(validation, { onNavigate: onTabChange });

  // Calculate armor stats for display
  const allocatedArmorPoints = useMemo(
    () => getTotalAllocatedArmor(armorAllocation, configuration),
    [armorAllocation, configuration],
  );
  const maxArmorPoints = useMemo(
    () => getMaxTotalArmor(tonnage, configuration),
    [tonnage, configuration],
  );

  // Memoize component selections to avoid breaking hook memoization
  const componentSelections = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  // Calculate unit stats (weight is based on armorTonnage, not allocated points)
  const calculations = useUnitCalculations(
    tonnage,
    componentSelections,
    armorTonnage,
  );

  // Calculate Battle Value
  const battleValue = useMemo(() => {
    try {
      // Convert armor allocation to the format expected by CalculationService
      const armorAllocationForCalc: IEditableArmorAllocation = {
        head: armorAllocation[MechLocation.HEAD],
        centerTorso: armorAllocation[MechLocation.CENTER_TORSO],
        centerTorsoRear: armorAllocation.centerTorsoRear,
        leftTorso: armorAllocation[MechLocation.LEFT_TORSO],
        leftTorsoRear: armorAllocation.leftTorsoRear,
        rightTorso: armorAllocation[MechLocation.RIGHT_TORSO],
        rightTorsoRear: armorAllocation.rightTorsoRear,
        leftArm: armorAllocation[MechLocation.LEFT_ARM],
        rightArm: armorAllocation[MechLocation.RIGHT_ARM],
        leftLeg: armorAllocation[MechLocation.LEFT_LEG],
        rightLeg: armorAllocation[MechLocation.RIGHT_LEG],
      };

      // Convert ALL equipment to IEquipmentSlot format for BV calculation
      // BV should include all equipment on the mech, whether allocated or not
      const equipmentSlots = equipment.map((eq) => ({
        equipmentId: eq.equipmentId,
        location: eq.location ?? '',
        slotIndex: eq.slots?.[0] ?? 0,
      }));

      const editableMech: IEditableMech = {
        id: 'banner',
        chassis: chassis || unitName.split(' ')[0] || 'Unknown',
        variant: model || unitName.split(' ').slice(1).join(' ') || 'Custom',
        tonnage,
        techBase: techBase as TechBase,
        engineType,
        engineRating,
        walkMP: calculations.walkMP,
        structureType: internalStructureType,
        gyroType,
        cockpitType,
        armorType,
        armorAllocation: armorAllocationForCalc,
        heatSinkType,
        heatSinkCount,
        equipment: equipmentSlots,
        isDirty: false,
      };

      return calculationService.calculateBattleValue(editableMech);
    } catch (error) {
      console.warn('Failed to calculate BV:', error);
      return 0;
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- registryReady triggers recalc when registry loads
  }, [
    unitName,
    chassis,
    model,
    tonnage,
    techBase,
    engineType,
    engineRating,
    calculations.walkMP,
    internalStructureType,
    gyroType,
    cockpitType,
    armorType,
    armorAllocation,
    heatSinkType,
    heatSinkCount,
    equipment,
    registryReady,
  ]);

  // Build stats object for UnitInfoBanner
  const totalWeight =
    calculations.totalStructuralWeight + equipmentCalcs.totalWeight;
  const totalSlotsUsed =
    calculations.totalSystemSlots + equipmentCalcs.totalSlots;

  // Calculate heat profile using the CalculationService (looks up heat from registry)
  // This is more reliable than using item.heat which may be 0 if loaded before registry
  const heatProfile = useMemo(() => {
    try {
      const equipmentSlots = equipment.map((eq) => ({
        equipmentId: eq.equipmentId,
        location: eq.location ?? '',
        slotIndex: eq.slots?.[0] ?? 0,
      }));

      const editableMech: IEditableMech = {
        id: 'heat-calc',
        chassis: chassis || 'Unknown',
        variant: model || 'Custom',
        tonnage,
        techBase: techBase as TechBase,
        engineType,
        engineRating,
        walkMP: calculations.walkMP,
        structureType: internalStructureType,
        gyroType,
        cockpitType,
        armorType,
        armorAllocation: {
          head: 0,
          centerTorso: 0,
          centerTorsoRear: 0,
          leftTorso: 0,
          leftTorsoRear: 0,
          rightTorso: 0,
          rightTorsoRear: 0,
          leftArm: 0,
          rightArm: 0,
          leftLeg: 0,
          rightLeg: 0,
        },
        heatSinkType,
        heatSinkCount,
        equipment: equipmentSlots,
        isDirty: false,
      };

      return calculationService.calculateHeatProfile(editableMech);
    } catch (error) {
      console.warn('Failed to calculate heat profile:', error);
      return {
        heatGenerated: 0,
        heatDissipated: calculations.totalHeatDissipation,
        netHeat: -calculations.totalHeatDissipation,
        alphaStrikeHeat: 0,
      };
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- registryReady triggers recalc when registry loads
  }, [
    chassis,
    model,
    tonnage,
    techBase,
    engineType,
    engineRating,
    calculations.walkMP,
    calculations.totalHeatDissipation,
    internalStructureType,
    gyroType,
    cockpitType,
    armorType,
    heatSinkType,
    heatSinkCount,
    equipment,
    registryReady,
  ]);

  const maxRunMP = useMemo(() => {
    const equipmentNames = equipment.map((e) => e.name);
    const modifiers = getMovementModifiersFromEquipment(equipmentNames);
    return calculateMaxRunMPWithModifiers(calculations.walkMP, modifiers);
  }, [equipment, calculations.walkMP]);

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

  const unitStats: UnitStats = useMemo(
    () => ({
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
      heatGenerated: heatProfile.heatGenerated,
      heatDissipation: heatProfile.heatDissipated,
      battleValue,
      validationStatus: validation.status,
      errorCount: validation.errorCount,
      warningCount: validation.warningCount,
    }),
    [
      unitName,
      tonnage,
      effectiveTechBaseMode,
      engineRating,
      calculations,
      heatProfile,
      totalWeight,
      totalSlotsUsed,
      allocatedArmorPoints,
      maxArmorPoints,
      maxRunMP,
      battleValue,
      validation.status,
      validation.errorCount,
      validation.warningCount,
    ],
  );

  // Compute mobile stats for the bottom sheet tray
  const mobileLoadoutStats: MobileLoadoutStats = useMemo(() => {
    const unassignedCount = equipment.filter((e) => !e.location).length;
    return {
      weightUsed: totalWeight,
      weightMax: tonnage,
      slotsUsed: totalSlotsUsed,
      slotsMax: 78,
      heatGenerated: heatProfile.heatGenerated,
      heatDissipation: heatProfile.heatDissipated,
      battleValue,
      equipmentCount: equipment.length,
      unassignedCount,
    };
  }, [
    totalWeight,
    tonnage,
    totalSlotsUsed,
    heatProfile,
    battleValue,
    equipment,
  ]);

  // Convert equipment to LoadoutEquipmentItem format
  // Normalize categories for consistent display (e.g., jump jets -> Movement)
  // Include weapon data (damage, ranges) for mobile loadout display
  // Note: registryReady dependency ensures we re-run when weapon data is loaded
  const loadoutEquipment: LoadoutEquipmentItem[] = useMemo(() => {
    return equipment.map((item) => {
      // Normalize category: jump jets should be in Movement category
      const normalizedCategory = JUMP_JET_IDS.has(item.equipmentId)
        ? EquipmentCategory.MOVEMENT
        : item.category;

      // Look up weapon data for damage/range display
      // This will return data once registryReady is true
      const weapon = getWeaponById(item.equipmentId);
      const isDirectFire = isDirectFireWeaponById(item.equipmentId);

      return {
        instanceId: item.instanceId,
        equipmentId: item.equipmentId,
        name: item.name,
        category: normalizedCategory,
        weight: item.weight,
        criticalSlots: item.criticalSlots,
        // Use weapon heat if available, fall back to store heat
        heat: weapon?.heat ?? item.heat,
        damage: weapon?.damage,
        ranges: weapon
          ? {
              minimum: weapon.ranges.minimum,
              short: weapon.ranges.short,
              medium: weapon.ranges.medium,
              long: weapon.ranges.long,
            }
          : undefined,
        isAllocated: !!item.location,
        location: item.location,
        isRemovable: item.isRemovable,
        isOmniPodMounted: item.isOmniPodMounted,
        targetingComputerCompatible: isDirectFire,
      };
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment, registryReady]);

  // Handle equipment removal
  const handleRemoveEquipment = useCallback(
    (instanceId: string) => {
      removeEquipment(instanceId);
    },
    [removeEquipment],
  );

  // Handle remove all equipment
  const handleRemoveAllEquipment = useCallback(() => {
    clearAllEquipment();
  }, [clearAllEquipment]);

  // Toggle tray expansion
  const handleToggleTray = useCallback(() => {
    setIsTrayExpanded((prev) => !prev);
  }, [setIsTrayExpanded]);

  // Handle equipment selection for slot assignment
  const handleSelectEquipment = useCallback((id: string | null) => {
    setSelectedEquipmentId(id);
  }, []);

  // Handle unassign equipment (clear its slot location)
  const handleUnassignEquipment = useCallback(
    (instanceId: string) => {
      clearEquipmentLocation(instanceId);
    },
    [clearEquipmentLocation],
  );

  // Location labels for display
  const locationLabels: Partial<Record<MechLocation, string>> = useMemo(
    () => ({
      [MechLocation.HEAD]: 'Head',
      [MechLocation.CENTER_TORSO]: 'Center Torso',
      [MechLocation.LEFT_TORSO]: 'Left Torso',
      [MechLocation.RIGHT_TORSO]: 'Right Torso',
      [MechLocation.LEFT_ARM]: 'Left Arm',
      [MechLocation.RIGHT_ARM]: 'Right Arm',
      [MechLocation.LEFT_LEG]: 'Left Leg',
      [MechLocation.RIGHT_LEG]: 'Right Leg',
    }),
    [],
  );

  // Function to calculate available locations for any equipment item
  const getAvailableLocationsForEquipment = useCallback(
    (equipmentInstanceId: string): AvailableLocation[] => {
      const item = equipment.find((e) => e.instanceId === equipmentInstanceId);
      if (!item) return [];

      const slotsNeeded = item.criticalSlots;
      const locations: AvailableLocation[] = [];

      // Check each location
      const allLocations = Object.values(MechLocation) as MechLocation[];
      for (const loc of allLocations) {
        // Check location restrictions for this equipment
        if (!isValidLocationForEquipment(item.equipmentId, loc)) {
          // Location is forbidden for this equipment type
          locations.push({
            location: loc,
            label: locationLabels[loc] ?? loc,
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
          label: locationLabels[loc] ?? loc,
          availableSlots,
          canFit: maxContiguous >= slotsNeeded,
        });
      }

      return locations;
    },
    [equipment, engineType, gyroType, locationLabels],
  );

  // Calculate available locations for the selected equipment (for backwards compatibility)
  const availableLocations: AvailableLocation[] = useMemo(() => {
    if (!selectedEquipmentId) return [];
    return getAvailableLocationsForEquipment(selectedEquipmentId);
  }, [selectedEquipmentId, getAvailableLocationsForEquipment]);

  // Handle quick assign to a location
  const handleQuickAssign = useCallback(
    (instanceId: string, location: MechLocation) => {
      const item = equipment.find((e) => e.instanceId === instanceId);
      if (!item) return;

      // Check location restrictions first
      if (!isValidLocationForEquipment(item.equipmentId, location)) {
        console.warn(
          `Cannot assign ${item.name} to ${location} - location restriction`,
        );
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
    },
    [equipment, engineType, gyroType, updateEquipmentLocation],
  );

  // Handle tab change - delegate to router
  const handleTabChange = (tabId: string) => {
    if (VALID_TAB_IDS.includes(tabId as CustomizerTabId)) {
      onTabChange(tabId as CustomizerTabId);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="bg-surface-deep border-border-theme flex-shrink-0 border-b p-2">
        <UnitInfoBanner
          stats={unitStats}
          validation={validation}
          onValidationNavigate={handleTabChange}
        />
      </div>

      {/* Main content area with tray */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left side: Tabs and content - must shrink to accommodate sidebar */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Section tabs (Structure, Armor, Weapons, etc.) */}
          <div className="flex-shrink-0">
            <CustomizerTabs
              tabs={DEFAULT_CUSTOMIZER_TABS}
              activeTab={activeTabId}
              onTabChange={handleTabChange}
              validationCounts={validationNav.errorsByTab}
            />
          </div>

          {/* Tab content - scrollable area */}
          <div className="min-h-0 flex-1 overflow-auto">
            {activeTabId === 'overview' && (
              <ErrorBoundary componentName="OverviewTab">
                <OverviewTab />
              </ErrorBoundary>
            )}
            {activeTabId === 'structure' && (
              <ErrorBoundary componentName="StructureTab">
                <StructureTab />
              </ErrorBoundary>
            )}
            {activeTabId === 'armor' && (
              <ErrorBoundary componentName="ArmorTab">
                <ArmorTab />
              </ErrorBoundary>
            )}
            {activeTabId === 'weapons' && <PlaceholderTab name="Weapons" />}
            {activeTabId === 'equipment' && (
              <ErrorBoundary componentName="EquipmentTab">
                <EquipmentTab />
              </ErrorBoundary>
            )}
            {activeTabId === 'criticals' && (
              <ErrorBoundary componentName="CriticalSlotsTab">
                <CriticalSlotsTab
                  selectedEquipmentId={selectedEquipmentId}
                  onSelectEquipment={handleSelectEquipment}
                />
              </ErrorBoundary>
            )}
            {activeTabId === 'fluff' && <PlaceholderTab name="Fluff" />}
            {activeTabId === 'preview' && (
              <ErrorBoundary componentName="PreviewTab">
                <PreviewTab />
              </ErrorBoundary>
            )}
          </div>
        </div>

        {/* Loadout Tray: Desktop sidebar / Mobile bottom sheet (hidden on Preview and Critical Slots tabs) */}
        {activeTabId !== 'preview' && activeTabId !== 'criticals' && (
          <ErrorBoundary componentName="ResponsiveLoadoutTray">
            <ResponsiveLoadoutTray
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
              getAvailableLocationsForEquipment={
                getAvailableLocationsForEquipment
              }
              isOmni={isOmni}
              mobileStats={mobileLoadoutStats}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Placeholder Tab (for tabs not yet fully implemented)
// =============================================================================

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-text-theme-secondary text-center">
        <h3 className="mb-2 text-xl font-bold">{name}</h3>
        <p className="text-sm">This section is under development</p>
      </div>
    </div>
  );
}
