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
  type CritEntry,
  type LocationData,
  type SlotContent,
  slotsToCritEntries,
} from './criticalSlotTypes';
import { DoubleSlotRow } from './DoubleSlotRow';
import { SlotRow } from './SlotRow';

const LOCATION_LABELS: Partial<Record<MechLocation, string>> = {
  [MechLocation.HEAD]: 'Head',
  [MechLocation.CENTER_TORSO]: 'Center Torso',
  [MechLocation.LEFT_TORSO]: 'Left Torso',
  [MechLocation.RIGHT_TORSO]: 'Right Torso',
  [MechLocation.LEFT_ARM]: 'Left Arm',
  [MechLocation.RIGHT_ARM]: 'Right Arm',
  [MechLocation.LEFT_LEG]: 'Left Leg',
  [MechLocation.RIGHT_LEG]: 'Right Leg',
};

function getLocationLabel(location: MechLocation): string {
  return LOCATION_LABELS[location] ?? location;
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
  /** The phone selector already identifies the location. */
  hideHeader?: boolean;
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
  hideHeader = false,
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
      role="group"
      aria-label={`${label} critical slots`}
      className={`bg-surface-deep border-border-theme w-full min-w-0 overflow-hidden rounded-md border shadow-sm ${className}`}
    >
      {/* Consistent location header keeps the diagram scannable at any width. */}
      {!hideHeader && (
        <div className="border-border-theme bg-surface-base/95 border-l-accent/70 flex min-h-11 items-center justify-between border-b border-l-2 px-2 py-1.5 lg:pointer-fine:min-h-[30px] lg:pointer-fine:py-0.5">
          <span className="text-text-theme-primary block min-w-0 text-sm font-semibold tracking-wide break-words whitespace-normal uppercase">
            {label}
          </span>
          <span className="text-text-theme-muted ml-2 flex-shrink-0 text-sm tabular-nums lg:pointer-fine:text-[13px]">
            {slotCount}
          </span>
        </div>
      )}

      {/* Slots */}
      <div className="p-1">
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
