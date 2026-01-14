/**
 * Critical Slots Tab Component
 * 
 * Displays the critical slots grid for assigning equipment to locations.
 * Layout matches MegaMekLab's diagram style with proper humanoid mech positioning.
 * Equipment selection is managed via the global loadout tray.
 * 
 * @spec openspec/specs/critical-slots-display/spec.md
 * @spec openspec/specs/critical-slot-allocation/spec.md
 */

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { LocationData, SlotContent } from '../critical-slots';
import { LocationGrid } from '../critical-slots/LocationGrid';
import { MechLocation, LOCATION_SLOT_COUNTS } from '@/types/construction';
import { IMountedEquipmentInstance } from '@/stores/unitState';
import { SystemComponentType } from '@/utils/colors/slotColors';
import { EngineType, getEngineDefinition } from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';
import { isValidLocationForEquipment } from '@/types/equipment/EquipmentPlacement';
import {
  fillUnhittableSlots,
  compactEquipmentSlots,
  sortEquipmentBySize,
  getUnallocatedUnhittables,
} from '@/utils/construction/slotOperations';
import { VerticalSlotChip } from '../critical-slots/VerticalSlotChip';

// =============================================================================
// Types
// =============================================================================

interface CriticalSlotsTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Currently selected equipment ID (from loadout tray) */
  selectedEquipmentId?: string | null;
  /** Called when selection should change */
  onSelectEquipment?: (id: string | null) => void;
  /** Whether to hide the external loadout tray (uses inline unassigned section instead) */
  hideLoadoutTray?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface FixedComponent {
  name: string;
  type: SystemComponentType;
  slots: number;
}

// =============================================================================
// Constants
// =============================================================================

const ARM_ACTUATORS: FixedComponent[] = [
  { name: 'Shoulder', type: 'actuator', slots: 1 },
  { name: 'Upper Arm', type: 'actuator', slots: 1 },
  { name: 'Lower Arm', type: 'actuator', slots: 1 },
  { name: 'Hand', type: 'actuator', slots: 1 },
];

const LEG_ACTUATORS: FixedComponent[] = [
  { name: 'Hip', type: 'actuator', slots: 1 },
  { name: 'Upper Leg', type: 'actuator', slots: 1 },
  { name: 'Lower Leg', type: 'actuator', slots: 1 },
  { name: 'Foot', type: 'actuator', slots: 1 },
];

// =============================================================================
// Helpers
// =============================================================================

function getEngineSlots(engineType: EngineType): number {
  const def = getEngineDefinition(engineType);
  return def?.ctSlots ?? 6;
}

function getGyroSlots(gyroType: GyroType): number {
  const def = getGyroDefinition(gyroType);
  return def?.criticalSlots ?? 4;
}

function getEngineSideTorsoSlots(engineType: EngineType): number {
  const def = getEngineDefinition(engineType);
  return def?.sideTorsoSlots ?? 0;
}

function buildLocationSlots(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
  equipment: readonly IMountedEquipmentInstance[],
): SlotContent[] {
  const slotCount = LOCATION_SLOT_COUNTS[location] || 6;
  const slots: SlotContent[] = [];
  
  const locationEquipment = equipment.filter(e => e.location === location);
  const filledSlots = new Map<number, { equipment: IMountedEquipmentInstance; position: 'first' | 'middle' | 'last' | 'only' }>();
  
  for (const eq of locationEquipment) {
    if (eq.slots && eq.slots.length > 0) {
      for (let i = 0; i < eq.slots.length; i++) {
        const slotIdx = eq.slots[i];
        let position: 'first' | 'middle' | 'last' | 'only' = 'only';
        if (eq.slots.length > 1) {
          if (i === 0) position = 'first';
          else if (i === eq.slots.length - 1) position = 'last';
          else position = 'middle';
        }
        filledSlots.set(slotIdx, { equipment: eq, position });
      }
    }
  }
  
  switch (location) {
    case MechLocation.HEAD:
      slots.push({ index: 0, type: 'system', name: 'Life Support' });
      slots.push({ index: 1, type: 'system', name: 'Sensors' });
      slots.push({ index: 2, type: 'system', name: 'Standard Cockpit' });
      slots.push(filledSlots.has(3) 
        ? createEquipmentSlot(3, filledSlots.get(3)!)
        : { index: 3, type: 'empty' }
      );
      slots.push({ index: 4, type: 'system', name: 'Sensors' });
      slots.push({ index: 5, type: 'system', name: 'Life Support' });
      break;
      
    case MechLocation.CENTER_TORSO:
      const engineSlots = getEngineSlots(engineType);
      for (let i = 0; i < Math.min(3, engineSlots); i++) {
        slots.push({ index: i, type: 'system', name: 'Engine' });
      }
      const gyroSlots = getGyroSlots(gyroType);
      for (let i = 0; i < gyroSlots; i++) {
        slots.push({ index: 3 + i, type: 'system', name: 'Standard Gyro' });
      }
      for (let i = 3; i < engineSlots; i++) {
        slots.push({ index: 3 + gyroSlots + (i - 3), type: 'system', name: 'Engine' });
      }
      const ctUsed = engineSlots + gyroSlots;
      for (let i = ctUsed; i < slotCount; i++) {
        if (filledSlots.has(i)) {
          slots.push(createEquipmentSlot(i, filledSlots.get(i)!));
        } else {
          slots.push({ index: i, type: 'empty' });
        }
      }
      break;
      
    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO: {
      // XL/Light/XXL engines require side torso slots
      const sideTorsoSlots = getEngineSideTorsoSlots(engineType);
      
      // Engine slots first
      for (let i = 0; i < sideTorsoSlots; i++) {
        slots.push({ index: i, type: 'system', name: 'Engine' });
      }
      
      // Remaining slots (equipment or empty)
      for (let i = sideTorsoSlots; i < slotCount; i++) {
        if (filledSlots.has(i)) {
          slots.push(createEquipmentSlot(i, filledSlots.get(i)!));
        } else {
          slots.push({ index: i, type: 'empty' });
        }
      }
      break;
    }
      
    case MechLocation.LEFT_ARM:
    case MechLocation.RIGHT_ARM:
      for (let i = 0; i < ARM_ACTUATORS.length; i++) {
        slots.push({ index: i, type: 'system', name: ARM_ACTUATORS[i].name });
      }
      for (let i = ARM_ACTUATORS.length; i < slotCount; i++) {
        if (filledSlots.has(i)) {
          slots.push(createEquipmentSlot(i, filledSlots.get(i)!));
        } else {
          slots.push({ index: i, type: 'empty' });
        }
      }
      break;
      
    case MechLocation.LEFT_LEG:
    case MechLocation.RIGHT_LEG:
      for (let i = 0; i < LEG_ACTUATORS.length; i++) {
        slots.push({ index: i, type: 'system', name: LEG_ACTUATORS[i].name });
      }
      for (let i = LEG_ACTUATORS.length; i < slotCount; i++) {
        if (filledSlots.has(i)) {
          slots.push(createEquipmentSlot(i, filledSlots.get(i)!));
        } else {
          slots.push({ index: i, type: 'empty' });
        }
      }
      break;
      
    default:
      for (let i = 0; i < slotCount; i++) {
        slots.push({ index: i, type: 'empty' });
      }
  }
  
  return slots;
}

function createEquipmentSlot(
  index: number,
  data: { equipment: IMountedEquipmentInstance; position: 'first' | 'middle' | 'last' | 'only' }
): SlotContent {
  const { equipment, position } = data;
  return {
    index,
    type: 'equipment',
    name: equipment.name,
    equipmentId: equipment.instanceId,
    isFirstSlot: position === 'first' || position === 'only',
    isLastSlot: position === 'last' || position === 'only',
    totalSlots: equipment.criticalSlots,
    isRemovable: equipment.isRemovable,
    isOmniPodMounted: equipment.isOmniPodMounted,
  };
}

// =============================================================================
// Toolbar Component
// =============================================================================

interface ToolbarProps {
  autoFillUnhittables: boolean;
  autoCompact: boolean;
  autoSort: boolean;
  onAutoFillToggle: () => void;
  onAutoCompactToggle: () => void;
  onAutoSortToggle: () => void;
  onFill: () => void;
  onCompact: () => void;
  onSort: () => void;
  onReset: () => void;
  readOnly: boolean;
}

function CriticalSlotsToolbar({
  autoFillUnhittables,
  autoCompact,
  autoSort,
  onAutoFillToggle,
  onAutoCompactToggle,
  onAutoSortToggle,
  onFill: _onFill,
  onCompact: _onCompact,
  onSort: _onSort,
  onReset,
  readOnly,
}: ToolbarProps) {
  // Mobile: tiny buttons, Desktop: full labels
  const toggleBtnClass = (active: boolean) => `
    px-2 py-1 text-[10px] sm:text-sm font-medium rounded border transition-colors
    ${active
      ? 'bg-teal-600 border-teal-500 text-white'
      : 'bg-surface-raised border-border-theme text-slate-300 hover:bg-surface-base'
    }
    ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;
  
  const actionBtnClass = `
    px-2 sm:px-4 py-1 text-[10px] sm:text-sm font-medium rounded border transition-colors
    bg-surface-base border-border-theme-subtle text-white hover:bg-surface-raised
    ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;
  
  return (
    <div className="flex items-center gap-1 p-1 sm:p-2 bg-surface-base border-b border-border-theme-subtle overflow-x-auto">
      <button onClick={onAutoFillToggle} disabled={readOnly} className={toggleBtnClass(autoFillUnhittables)}>
        Fill
      </button>
      <button onClick={onAutoCompactToggle} disabled={readOnly} className={toggleBtnClass(autoCompact)}>
        Compact
      </button>
      <button onClick={onAutoSortToggle} disabled={readOnly} className={toggleBtnClass(autoSort)}>
        Sort
      </button>
      
      <div className="flex-1" />
      
      <button onClick={onReset} disabled={readOnly} className={`${actionBtnClass} hover:bg-red-600`}>
        Reset
      </button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CriticalSlotsTab({
  readOnly = false,
  selectedEquipmentId,
  onSelectEquipment,
  hideLoadoutTray = true, // Default: use inline unassigned section
  className = '',
}: CriticalSlotsTabProps): React.ReactElement {
  // Unit state
  const equipment = useUnitStore((s) => s.equipment);
  const engineType = useUnitStore((s) => s.engineType);
  const gyroType = useUnitStore((s) => s.gyroType);
  const isOmni = useUnitStore((s) => s.isOmni);
  const updateEquipmentLocation = useUnitStore((s) => s.updateEquipmentLocation);
  const bulkUpdateEquipmentLocations = useUnitStore((s) => s.bulkUpdateEquipmentLocations);
  const clearEquipmentLocation = useUnitStore((s) => s.clearEquipmentLocation);
  
  // UI state
  const autoModeSettings = useCustomizerStore((s) => s.autoModeSettings);
  const toggleAutoFillUnhittables = useCustomizerStore((s) => s.toggleAutoFillUnhittables);
  const toggleAutoCompact = useCustomizerStore((s) => s.toggleAutoCompact);
  const toggleAutoSort = useCustomizerStore((s) => s.toggleAutoSort);
  
  // Get selected equipment item
  const selectedEquipment = useMemo(() => {
    if (!selectedEquipmentId) return null;
    return equipment.find(e => e.instanceId === selectedEquipmentId) || null;
  }, [equipment, selectedEquipmentId]);
  
  // Build location data
  const getLocationData = useCallback((location: MechLocation): LocationData => ({
    location,
    slots: buildLocationSlots(location, engineType, gyroType, equipment),
  }), [equipment, engineType, gyroType]);
  
  // Calculate assignable slots for selected equipment
  const getAssignableSlots = useCallback((location: MechLocation): number[] => {
    if (!selectedEquipment || readOnly) {
      return [];
    }
    
    // Check location restrictions (e.g., jump jets can only go in torsos/legs)
    if (!isValidLocationForEquipment(selectedEquipment.equipmentId, location)) {
      return [];
    }
    
    const locData = getLocationData(location);
    const emptySlots = locData.slots
      .filter(s => s.type === 'empty')
      .map(s => s.index);
    
    const slotsNeeded = selectedEquipment.criticalSlots;
    const assignable: number[] = [];
    
    // Find all valid starting positions for contiguous slots
    for (let i = 0; i <= emptySlots.length - slotsNeeded; i++) {
      let contiguous = true;
      for (let j = 1; j < slotsNeeded; j++) {
        if (emptySlots[i + j] !== emptySlots[i + j - 1] + 1) {
          contiguous = false;
          break;
        }
      }
      if (contiguous) {
        assignable.push(emptySlots[i]);
      }
    }
    
    return assignable;
  }, [selectedEquipment, readOnly, getLocationData]);
  
  // Handlers
  const handleSlotClick = useCallback((location: MechLocation, slotIndex: number) => {
    if (readOnly) return;
    
    const locData = getLocationData(location);
    const clickedSlot = locData.slots.find(s => s.index === slotIndex);
    
    // Case 1: Clicked on equipment slot - select it for reassignment
    if (clickedSlot?.type === 'equipment' && clickedSlot.equipmentId) {
      // If clicking same equipment that's already selected, deselect
      if (selectedEquipment?.instanceId === clickedSlot.equipmentId) {
        onSelectEquipment?.(null);
      } else {
        // Select this equipment for reassignment
        onSelectEquipment?.(clickedSlot.equipmentId);
      }
      return;
    }
    
    // Case 2: Clicked on empty slot with equipment selected - place it
    if (selectedEquipment && clickedSlot?.type === 'empty') {
      const assignable = getAssignableSlots(location);
      if (!assignable.includes(slotIndex)) return;
      
      const slots: number[] = [];
      for (let i = 0; i < selectedEquipment.criticalSlots; i++) {
        slots.push(slotIndex + i);
      }
      
      updateEquipmentLocation(selectedEquipment.instanceId, location, slots);
      onSelectEquipment?.(null); // Clear selection after assignment
    }
  }, [readOnly, selectedEquipment, getLocationData, getAssignableSlots, updateEquipmentLocation, onSelectEquipment]);
  
  const handleEquipmentDrop = useCallback((location: MechLocation, slotIndex: number, equipmentId: string) => {
    if (readOnly) return;
    const eq = equipment.find(e => e.instanceId === equipmentId);
    if (!eq) return;
    
    // Validate location restrictions (e.g., jump jets can only go in torsos/legs)
    if (!isValidLocationForEquipment(eq.equipmentId, location)) {
      return;
    }
    
    // Validate there are enough contiguous empty slots starting at slotIndex
    const locData = getLocationData(location);
    const slotsNeeded = eq.criticalSlots;
    
    // Check if all required slots are empty
    for (let i = 0; i < slotsNeeded; i++) {
      const targetSlot = locData.slots.find(s => s.index === slotIndex + i);
      if (!targetSlot || targetSlot.type !== 'empty') {
        return; // Not enough contiguous empty slots
      }
    }
    
    const slots: number[] = [];
    for (let i = 0; i < slotsNeeded; i++) {
      slots.push(slotIndex + i);
    }
    updateEquipmentLocation(equipmentId, location, slots);
    onSelectEquipment?.(null); // Clear selection after successful drop
  }, [readOnly, equipment, getLocationData, updateEquipmentLocation, onSelectEquipment]);
  
  const handleEquipmentRemove = useCallback((location: MechLocation, slotIndex: number) => {
    if (readOnly) return;
    const locData = getLocationData(location);
    const slot = locData.slots.find(s => s.index === slotIndex);
    // Allow unassigning ALL equipment (isRemovable only controls deletion from unit)
    if (!slot || slot.type !== 'equipment' || !slot.equipmentId) return;
    clearEquipmentLocation(slot.equipmentId);
  }, [readOnly, getLocationData, clearEquipmentLocation]);
  
  const handleReset = useCallback(() => {
    if (readOnly) return;
    // Reset clears ALL equipment locations (isRemovable only controls deletion)
    for (const eq of equipment) {
      if (eq.location !== undefined) {
        clearEquipmentLocation(eq.instanceId);
      }
    }
  }, [readOnly, equipment, clearEquipmentLocation]);
  
  // Fill: Distribute unallocated unhittables evenly
  const handleFill = useCallback(() => {
    if (readOnly) return;
    const result = fillUnhittableSlots(equipment, engineType, gyroType);
    if (result.assignments.length > 0) {
      bulkUpdateEquipmentLocations(result.assignments);
    }
  }, [readOnly, equipment, engineType, gyroType, bulkUpdateEquipmentLocations]);
  
  // Compact: Move equipment to lowest slot indices
  const handleCompact = useCallback(() => {
    if (readOnly) return;
    const result = compactEquipmentSlots(equipment, engineType, gyroType);
    if (result.assignments.length > 0) {
      bulkUpdateEquipmentLocations(result.assignments);
    }
  }, [readOnly, equipment, engineType, gyroType, bulkUpdateEquipmentLocations]);
  
  // Sort: Reorder by size (largest first), then compact
  const handleSort = useCallback(() => {
    if (readOnly) return;
    const result = sortEquipmentBySize(equipment, engineType, gyroType);
    if (result.assignments.length > 0) {
      bulkUpdateEquipmentLocations(result.assignments);
    }
  }, [readOnly, equipment, engineType, gyroType, bulkUpdateEquipmentLocations]);
  
  // Track if we're currently running an auto operation to prevent loops
  const isAutoRunning = useRef(false);
  
  // Count of unallocated unhittables for change detection
  const unallocatedUnhittableCount = useMemo(() => {
    return getUnallocatedUnhittables(equipment).length;
  }, [equipment]);
  
  // Auto Fill effect - runs when unallocated unhittables exist and toggle is enabled
  useEffect(() => {
    if (readOnly || isAutoRunning.current) return;
    if (!autoModeSettings.autoFillUnhittables) return;
    if (unallocatedUnhittableCount === 0) return;
    
    isAutoRunning.current = true;
    
    // Small delay to batch rapid changes (e.g., when structure type changes adds many slots)
    const timer = setTimeout(() => {
      const result = fillUnhittableSlots(equipment, engineType, gyroType);
      if (result.assignments.length > 0) {
        bulkUpdateEquipmentLocations(result.assignments);
      }
      isAutoRunning.current = false;
    }, 100);
    
    return () => {
      clearTimeout(timer);
      isAutoRunning.current = false;
    };
  }, [unallocatedUnhittableCount, autoModeSettings.autoFillUnhittables, readOnly, equipment, engineType, gyroType, bulkUpdateEquipmentLocations]);
  
  // Create a fingerprint of current equipment placements for change detection
  const placementFingerprint = useMemo(() => {
    return equipment
      .filter(eq => eq.location !== undefined)
      .map(eq => `${eq.instanceId}:${eq.location}:${(eq.slots || []).join(',')}`)
      .sort()
      .join('|');
  }, [equipment]);
  
  // Auto trigger effect - runs sort/compact when placements change
  useEffect(() => {
    if (readOnly || isAutoRunning.current) return;
    
    // Check if any auto mode is enabled
    if (!autoModeSettings.autoSort && !autoModeSettings.autoCompact) return;
    
    // Only process if there's placed equipment
    const placedEquipment = equipment.filter(eq => eq.location !== undefined);
    if (placedEquipment.length === 0) return;
    
    // Run the appropriate auto operation
    isAutoRunning.current = true;
    
    // Small delay to batch rapid changes
    const timer = setTimeout(() => {
      let result;
      if (autoModeSettings.autoSort) {
        result = sortEquipmentBySize(equipment, engineType, gyroType);
      } else if (autoModeSettings.autoCompact) {
        result = compactEquipmentSlots(equipment, engineType, gyroType);
      }
      
      if (result && result.assignments.length > 0) {
        // Check if the assignments would actually change anything
        const wouldChange = result.assignments.some(assignment => {
          const eq = equipment.find(e => e.instanceId === assignment.instanceId);
          if (!eq) return false;
          if (eq.location !== assignment.location) return true;
          const currentSlots = eq.slots || [];
          if (currentSlots.length !== assignment.slots.length) return true;
          return currentSlots.some((s, i) => s !== assignment.slots[i]);
        });
        
        if (wouldChange) {
          bulkUpdateEquipmentLocations(result.assignments);
        }
      }
      
      isAutoRunning.current = false;
    }, 50);
    
    return () => {
      clearTimeout(timer);
      isAutoRunning.current = false;
    };
  }, [placementFingerprint, readOnly, autoModeSettings, equipment, engineType, gyroType, bulkUpdateEquipmentLocations]);
  
  // Handle drag start from a slot - select the equipment to highlight valid targets
  const handleEquipmentDragStart = useCallback((equipmentId: string) => {
    onSelectEquipment?.(equipmentId);
  }, [onSelectEquipment]);
  
  // Render location grid helper
  const renderLocation = (location: MechLocation) => (
    <LocationGrid
      key={location}
      location={location}
      data={getLocationData(location)}
      selectedEquipmentId={selectedEquipmentId || undefined}
      assignableSlots={getAssignableSlots(location)}
      isOmni={isOmni}
      onSlotClick={(i) => handleSlotClick(location, i)}
      onEquipmentDrop={(i, e) => handleEquipmentDrop(location, i, e)}
      onEquipmentRemove={(i) => handleEquipmentRemove(location, i)}
      onEquipmentDragStart={handleEquipmentDragStart}
    />
  );

  // Get unassigned equipment for inline display
  const unassignedEquipment = useMemo(() => {
    return equipment.filter(e => !e.location);
  }, [equipment]);

  // Render inline unassigned equipment chip using VerticalSlotChip
  const renderUnassignedChip = (item: IMountedEquipmentInstance) => {
    const isSelected = selectedEquipmentId === item.instanceId;
    
    return (
      <VerticalSlotChip
        key={item.instanceId}
        name={item.name}
        criticalSlots={item.criticalSlots}
        isSelected={isSelected}
        onClick={() => onSelectEquipment?.(isSelected ? null : item.instanceId)}
      />
    );
  };
  
  return (
    <div className={`flex flex-col h-full bg-surface-deep ${className}`}>
      {/* Toolbar */}
      <CriticalSlotsToolbar
        autoFillUnhittables={autoModeSettings.autoFillUnhittables}
        autoCompact={autoModeSettings.autoCompact}
        autoSort={autoModeSettings.autoSort}
        onAutoFillToggle={toggleAutoFillUnhittables}
        onAutoCompactToggle={toggleAutoCompact}
        onAutoSortToggle={toggleAutoSort}
        onFill={handleFill}
        onCompact={handleCompact}
        onSort={handleSort}
        onReset={handleReset}
        readOnly={readOnly}
      />

      {/* Inline Unassigned Equipment Section - compact, only when there's unassigned equipment */}
      {hideLoadoutTray && unassignedEquipment.length > 0 && (
        <div className="flex-shrink-0 bg-surface-base/30 border-b border-border-theme-subtle px-1.5 py-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-medium text-amber-400 uppercase">Unassigned</span>
            <span className="text-[9px] text-text-theme-muted">({unassignedEquipment.length})</span>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {unassignedEquipment.map(renderUnassignedChip)}
          </div>
        </div>
      )}
      
      {/* Mobile stacked 3-column layout */}
      <div className="flex-1 p-1 overflow-auto md:hidden">
        <div className="flex flex-col gap-1 items-center">
          {/* Row 1: Arms + Head */}
          <div className="flex gap-1 justify-center">
            {renderLocation(MechLocation.LEFT_ARM)}
            {renderLocation(MechLocation.HEAD)}
            {renderLocation(MechLocation.RIGHT_ARM)}
          </div>
          
          {/* Row 2: Torsos */}
          <div className="flex gap-1 justify-center">
            {renderLocation(MechLocation.LEFT_TORSO)}
            {renderLocation(MechLocation.CENTER_TORSO)}
            {renderLocation(MechLocation.RIGHT_TORSO)}
          </div>
          
          {/* Row 3: Legs */}
          <div className="flex gap-1 justify-center">
            {renderLocation(MechLocation.LEFT_LEG)}
            <div className="w-24 sm:w-32" /> {/* Spacer for center */}
            {renderLocation(MechLocation.RIGHT_LEG)}
          </div>
        </div>
      </div>

      {/* Desktop 5-column layout - hidden on mobile */}
      <div className="hidden md:flex flex-1 p-2 lg:p-4 overflow-auto">
        <div className="flex gap-2 lg:gap-3 items-start justify-center min-w-max mx-auto">
          {/* Column 1: Left Arm */}
          <div className="flex flex-col" style={{ marginTop: '136px' }}>
            {renderLocation(MechLocation.LEFT_ARM)}
          </div>
          
          {/* Column 2: Left Torso + Left Leg */}
          <div className="flex flex-col" style={{ marginTop: '40px' }}>
            {renderLocation(MechLocation.LEFT_TORSO)}
            <div className="mt-16">
              {renderLocation(MechLocation.LEFT_LEG)}
            </div>
          </div>
          
          {/* Column 3: Head + Center Torso */}
          <div className="flex flex-col gap-3">
            {renderLocation(MechLocation.HEAD)}
            {renderLocation(MechLocation.CENTER_TORSO)}
          </div>
          
          {/* Column 4: Right Torso + Right Leg */}
          <div className="flex flex-col" style={{ marginTop: '40px' }}>
            {renderLocation(MechLocation.RIGHT_TORSO)}
            <div className="mt-16">
              {renderLocation(MechLocation.RIGHT_LEG)}
            </div>
          </div>
          
          {/* Column 5: Right Arm */}
          <div className="flex flex-col" style={{ marginTop: '136px' }}>
            {renderLocation(MechLocation.RIGHT_ARM)}
          </div>
        </div>
      </div>
      
      {/* Selection hint bar at bottom - only when equipment is selected */}
      {selectedEquipment && (
        <div className="flex-shrink-0 px-2 py-1.5 bg-surface-base border-t border-border-theme-subtle text-center">
          <span className="text-xs sm:text-sm text-slate-300">
            Tap a slot to place: <span className="text-accent font-medium">{selectedEquipment.name}</span>
            <span className="text-text-theme-muted ml-1">({selectedEquipment.criticalSlots}cr)</span>
          </span>
        </div>
      )}

      {/* Status bar at bottom - shows OK when all placed */}
      {hideLoadoutTray && !selectedEquipment && (
        <div className="flex-shrink-0 px-2 py-1.5 bg-surface-base border-t border-border-theme-subtle flex items-center justify-between text-xs">
          <span className={unassignedEquipment.length === 0 ? 'text-green-400' : 'text-amber-400'}>
            {unassignedEquipment.length === 0 ? '✓ All equipment placed' : `${unassignedEquipment.length} unassigned`}
          </span>
          <span className="text-text-theme-muted">
            Tap equipment above, then tap a slot
          </span>
        </div>
      )}
    </div>
  );
}

export default CriticalSlotsTab;
