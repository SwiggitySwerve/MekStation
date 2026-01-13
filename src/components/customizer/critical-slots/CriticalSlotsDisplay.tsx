/**
 * Critical Slots Display Component
 * 
 * Grid display of all mech locations with critical slots.
 * 
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import React from 'react';
import { LocationGrid } from './LocationGrid';
import { CriticalSlotToolbar } from './CriticalSlotToolbar';
import { MechLocation } from '@/types/construction';

/**
 * Critical slot content data
 */
export interface SlotContent {
  /** Slot index (0-based) */
  index: number;
  /** Content type */
  type: 'empty' | 'system' | 'equipment';
  /** Display name */
  name?: string;
  /** Equipment ID if equipment */
  equipmentId?: string;
  /** Is first slot of multi-slot equipment */
  isFirstSlot?: boolean;
  /** Is last slot of multi-slot equipment */
  isLastSlot?: boolean;
  /** Total slots this equipment occupies */
  totalSlots?: number;
  /** Can be removed */
  isRemovable?: boolean;
  /** Whether this is pod-mounted equipment on an OmniMech (false = fixed to chassis) */
  isOmniPodMounted?: boolean;
}

/**
 * Location data for the display
 */
export interface LocationData {
  location: MechLocation;
  slots: SlotContent[];
}

interface CriticalSlotsDisplayProps {
  /** Location data for all locations */
  locations: LocationData[];
  /** Currently selected equipment ID */
  selectedEquipmentId?: string;
  /** Slots that can accept the selected equipment */
  assignableSlots?: { location: MechLocation; slots: number[] }[];
  /** Auto-fill unhittables mode */
  autoFillUnhittables: boolean;
  /** Show placement preview */
  showPlacementPreview: boolean;
  /** Called when a slot is clicked */
  onSlotClick: (location: MechLocation, slotIndex: number) => void;
  /** Called when equipment is dropped on a slot */
  onEquipmentDrop: (location: MechLocation, slotIndex: number, equipmentId: string) => void;
  /** Called when equipment is removed */
  onEquipmentRemove: (location: MechLocation, slotIndex: number) => void;
  /** Called when auto-fill toggle changes */
  onAutoFillToggle: () => void;
  /** Called when preview toggle changes */
  onPreviewToggle: () => void;
  /** Called when toolbar action is clicked */
  onToolbarAction: (action: 'fill' | 'compact' | 'sort' | 'reset') => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Critical slots display grid
 */
export function CriticalSlotsDisplay({
  locations,
  selectedEquipmentId,
  assignableSlots,
  autoFillUnhittables,
  showPlacementPreview,
  onSlotClick,
  onEquipmentDrop,
  onEquipmentRemove,
  onAutoFillToggle,
  onPreviewToggle,
  onToolbarAction,
  className = '',
}: CriticalSlotsDisplayProps): React.ReactElement {
  // Organize locations into rows for the grid
  const getLocationData = (loc: MechLocation) => 
    locations.find((l) => l.location === loc);
  
  const getAssignableSlots = (loc: MechLocation) =>
    assignableSlots?.find((a) => a.location === loc)?.slots || [];
  
  return (
    <div className={`bg-surface-base rounded-lg border border-border-theme ${className}`}>
      {/* Toolbar */}
      <CriticalSlotToolbar
        autoFillUnhittables={autoFillUnhittables}
        showPlacementPreview={showPlacementPreview}
        onAutoFillToggle={onAutoFillToggle}
        onPreviewToggle={onPreviewToggle}
        onAction={onToolbarAction}
        className="border-b border-border-theme"
      />
      
      {/* Grid layout - MegaMekLab style with 5 columns */}
      <div className="p-4">
        <div className="flex gap-2 items-start">
          {/* Column 1: Left Arm */}
          <div className="flex flex-col" style={{ marginTop: '40px' }}>
            <LocationGrid
              location={MechLocation.LEFT_ARM}
              data={getLocationData(MechLocation.LEFT_ARM)}
              selectedEquipmentId={selectedEquipmentId}
              assignableSlots={getAssignableSlots(MechLocation.LEFT_ARM)}
              onSlotClick={(i) => onSlotClick(MechLocation.LEFT_ARM, i)}
              onEquipmentDrop={(i, e) => onEquipmentDrop(MechLocation.LEFT_ARM, i, e)}
              onEquipmentRemove={(i) => onEquipmentRemove(MechLocation.LEFT_ARM, i)}
            />
          </div>
          
          {/* Column 2: Left Torso + Left Leg stacked */}
          <div className="flex flex-col gap-2" style={{ marginTop: '40px' }}>
            <LocationGrid
              location={MechLocation.LEFT_TORSO}
              data={getLocationData(MechLocation.LEFT_TORSO)}
              selectedEquipmentId={selectedEquipmentId}
              assignableSlots={getAssignableSlots(MechLocation.LEFT_TORSO)}
              onSlotClick={(i) => onSlotClick(MechLocation.LEFT_TORSO, i)}
              onEquipmentDrop={(i, e) => onEquipmentDrop(MechLocation.LEFT_TORSO, i, e)}
              onEquipmentRemove={(i) => onEquipmentRemove(MechLocation.LEFT_TORSO, i)}
            />
            <LocationGrid
              location={MechLocation.LEFT_LEG}
              data={getLocationData(MechLocation.LEFT_LEG)}
              selectedEquipmentId={selectedEquipmentId}
              assignableSlots={getAssignableSlots(MechLocation.LEFT_LEG)}
              onSlotClick={(i) => onSlotClick(MechLocation.LEFT_LEG, i)}
              onEquipmentDrop={(i, e) => onEquipmentDrop(MechLocation.LEFT_LEG, i, e)}
              onEquipmentRemove={(i) => onEquipmentRemove(MechLocation.LEFT_LEG, i)}
            />
          </div>
          
          {/* Column 3: Head + Center Torso stacked */}
          <div className="flex flex-col gap-2">
            <LocationGrid
              location={MechLocation.HEAD}
              data={getLocationData(MechLocation.HEAD)}
              selectedEquipmentId={selectedEquipmentId}
              assignableSlots={getAssignableSlots(MechLocation.HEAD)}
              onSlotClick={(i) => onSlotClick(MechLocation.HEAD, i)}
              onEquipmentDrop={(i, e) => onEquipmentDrop(MechLocation.HEAD, i, e)}
              onEquipmentRemove={(i) => onEquipmentRemove(MechLocation.HEAD, i)}
            />
            <LocationGrid
              location={MechLocation.CENTER_TORSO}
              data={getLocationData(MechLocation.CENTER_TORSO)}
              selectedEquipmentId={selectedEquipmentId}
              assignableSlots={getAssignableSlots(MechLocation.CENTER_TORSO)}
              onSlotClick={(i) => onSlotClick(MechLocation.CENTER_TORSO, i)}
              onEquipmentDrop={(i, e) => onEquipmentDrop(MechLocation.CENTER_TORSO, i, e)}
              onEquipmentRemove={(i) => onEquipmentRemove(MechLocation.CENTER_TORSO, i)}
            />
          </div>
          
          {/* Column 4: Right Torso + Right Leg stacked */}
          <div className="flex flex-col gap-2" style={{ marginTop: '40px' }}>
            <LocationGrid
              location={MechLocation.RIGHT_TORSO}
              data={getLocationData(MechLocation.RIGHT_TORSO)}
              selectedEquipmentId={selectedEquipmentId}
              assignableSlots={getAssignableSlots(MechLocation.RIGHT_TORSO)}
              onSlotClick={(i) => onSlotClick(MechLocation.RIGHT_TORSO, i)}
              onEquipmentDrop={(i, e) => onEquipmentDrop(MechLocation.RIGHT_TORSO, i, e)}
              onEquipmentRemove={(i) => onEquipmentRemove(MechLocation.RIGHT_TORSO, i)}
            />
            <LocationGrid
              location={MechLocation.RIGHT_LEG}
              data={getLocationData(MechLocation.RIGHT_LEG)}
              selectedEquipmentId={selectedEquipmentId}
              assignableSlots={getAssignableSlots(MechLocation.RIGHT_LEG)}
              onSlotClick={(i) => onSlotClick(MechLocation.RIGHT_LEG, i)}
              onEquipmentDrop={(i, e) => onEquipmentDrop(MechLocation.RIGHT_LEG, i, e)}
              onEquipmentRemove={(i) => onEquipmentRemove(MechLocation.RIGHT_LEG, i)}
            />
          </div>
          
          {/* Column 5: Right Arm */}
          <div className="flex flex-col" style={{ marginTop: '40px' }}>
            <LocationGrid
              location={MechLocation.RIGHT_ARM}
              data={getLocationData(MechLocation.RIGHT_ARM)}
              selectedEquipmentId={selectedEquipmentId}
              assignableSlots={getAssignableSlots(MechLocation.RIGHT_ARM)}
              onSlotClick={(i) => onSlotClick(MechLocation.RIGHT_ARM, i)}
              onEquipmentDrop={(i, e) => onEquipmentDrop(MechLocation.RIGHT_ARM, i, e)}
              onEquipmentRemove={(i) => onEquipmentRemove(MechLocation.RIGHT_ARM, i)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

