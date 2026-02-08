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

import {
  CritEntry,
  LocationData,
  SlotContent,
  slotsToCritEntries,
} from './CriticalSlotsDisplay';
import { DoubleSlotRow } from './DoubleSlotRow';
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
  const isSuperheavy = data?.isSuperheavy ?? false;

  // Build CritEntry[] from entries (preferred) or slots (backward compat)
  const entries: CritEntry[] = (() => {
    if (data?.entries && data.entries.length > 0) {
      // Pad with empty entries if needed
      const padded = Array.from({ length: slotCount }, (_, i) => {
        const existing = data.entries.find((e) => e.index === i);
        return (
          existing || {
            index: i,
            primary: { index: i, type: 'empty' as const },
            isDoubleSlot: isSuperheavy,
          }
        );
      });
      return padded;
    }
    // Fallback: build from slots array
    const slots: SlotContent[] = Array.from({ length: slotCount }, (_, i) => {
      const existing = data?.slots.find((s) => s.index === i);
      return existing || { index: i, type: 'empty' as const };
    });
    return slotsToCritEntries(slots, isSuperheavy);
  })();

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
        {entries.map((entry) =>
          isSuperheavy && entry.isDoubleSlot ? (
            <DoubleSlotRow
              key={entry.index}
              entry={entry}
              isAssignable={assignableSlots.includes(entry.index)}
              isSelected={
                !!(
                  selectedEquipmentId &&
                  entry.primary.equipmentId === selectedEquipmentId
                )
              }
              isPairable={
                entry.primary.type === 'equipment' &&
                entry.primary.totalSlots === 1 &&
                !entry.secondary
              }
              compact={compact}
              onClick={() => onSlotClick(entry.index)}
              onDrop={(equipmentId) =>
                onEquipmentDrop(entry.index, equipmentId)
              }
              onRemove={() => onEquipmentRemove(entry.index)}
              onDragStart={onEquipmentDragStart}
            />
          ) : (
            <SlotRow
              key={entry.index}
              slot={entry.primary}
              isAssignable={assignableSlots.includes(entry.index)}
              isSelected={
                !!(
                  selectedEquipmentId &&
                  entry.primary.equipmentId === selectedEquipmentId
                )
              }
              compact={compact}
              isOmni={isOmni}
              onClick={() => onSlotClick(entry.index)}
              onDrop={(equipmentId) =>
                onEquipmentDrop(entry.index, equipmentId)
              }
              onRemove={() => onEquipmentRemove(entry.index)}
              onDragStart={onEquipmentDragStart}
            />
          ),
        )}
      </div>
    </div>
  );
}
