/**
 * Location Grid Component
 *
 * Grid of critical slots for a single location.
 * Matches MegaMekLab's visual style with full location names.
 *
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import React from 'react';

import { MechLocation, LOCATION_SLOT_COUNTS } from '@/types/construction';

import { LocationData, SlotContent } from './CriticalSlotsDisplay';
import { SlotRow } from './SlotRow';

/**
 * Get full location name
 */
function getLocationLabel(location: MechLocation): string {
  switch (location) {
    case MechLocation.HEAD:
      return 'Head';
    case MechLocation.CENTER_TORSO:
      return 'Center Torso';
    case MechLocation.LEFT_TORSO:
      return 'Left Torso';
    case MechLocation.RIGHT_TORSO:
      return 'Right Torso';
    case MechLocation.LEFT_ARM:
      return 'Left Arm';
    case MechLocation.RIGHT_ARM:
      return 'Right Arm';
    case MechLocation.LEFT_LEG:
      return 'Left Leg';
    case MechLocation.RIGHT_LEG:
      return 'Right Leg';
    default:
      return '';
  }
}

interface LocationGridProps {
  /** Location */
  location: MechLocation;
  /** Location data */
  data?: LocationData;
  /** Currently selected equipment ID */
  selectedEquipmentId?: string;
  /** Slots that can accept selected equipment */
  assignableSlots: number[];
  /** Called when slot is clicked */
  onSlotClick: (slotIndex: number) => void;
  /** Called when equipment is dropped */
  onEquipmentDrop: (slotIndex: number, equipmentId: string) => void;
  /** Called when equipment is removed */
  onEquipmentRemove: (slotIndex: number) => void;
  /** Called when equipment drag starts from a slot */
  onEquipmentDragStart?: (equipmentId: string) => void;
  /** Use compact layout */
  compact?: boolean;
  /** Whether the unit is an OmniMech */
  isOmni?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Grid of slots for a single location
 */
export function LocationGrid({
  location,
  data,
  selectedEquipmentId,
  assignableSlots,
  onSlotClick,
  onEquipmentDrop,
  onEquipmentRemove,
  onEquipmentDragStart,
  compact = false,
  isOmni = false,
  className = '',
}: LocationGridProps): React.ReactElement {
  const slotCount = LOCATION_SLOT_COUNTS[location];
  const label = getLocationLabel(location);

  // Create slot data for all slots
  const slots: SlotContent[] = Array.from({ length: slotCount }, (_, i) => {
    const existing = data?.slots.find((s) => s.index === i);
    return existing || { index: i, type: 'empty' as const };
  });

  return (
    <div
      className={`bg-surface-deep border-border-theme w-full max-w-xs border sm:w-32 md:w-36 ${className} `}
    >
      {/* Location header */}
      <div className="border-border-theme bg-surface-base border-b px-1 py-1 text-center sm:px-2 sm:py-1.5">
        <span className="block truncate text-xs font-medium text-slate-200 sm:text-sm">
          {label}
        </span>
      </div>

      {/* Slots */}
      <div className="p-0.5">
        {slots.map((slot) => (
          <SlotRow
            key={slot.index}
            slot={slot}
            isAssignable={assignableSlots.includes(slot.index)}
            isSelected={
              !!(
                selectedEquipmentId && slot.equipmentId === selectedEquipmentId
              )
            }
            compact={compact}
            isOmni={isOmni}
            onClick={() => onSlotClick(slot.index)}
            onDrop={(equipmentId) => onEquipmentDrop(slot.index, equipmentId)}
            onRemove={() => onEquipmentRemove(slot.index)}
            onDragStart={onEquipmentDragStart}
          />
        ))}
      </div>
    </div>
  );
}
