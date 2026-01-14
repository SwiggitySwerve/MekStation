/**
 * Vertical Slot Chip Component
 * 
 * A rotated version of SlotRow for displaying unassigned equipment.
 * Width EXACTLY matches SlotRow height at each breakpoint.
 * Scales up on larger screens just like SlotRow does.
 * 
 * SlotRow sizing:
 * - Mobile: px-1 py-0.5 text-[10px] → height ~22px
 * - sm+: px-2 py-1 text-sm → height ~30px
 * 
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import React, { memo } from 'react';
import { 
  classifyEquipment, 
  getEquipmentColors 
} from '@/utils/colors/equipmentColors';
import { abbreviateEquipmentName } from '@/utils/equipmentNameAbbreviations';

export interface VerticalSlotChipProps {
  /** Equipment name */
  name: string;
  /** Number of critical slots */
  criticalSlots: number;
  /** Whether this chip is selected */
  isSelected?: boolean;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Vertical slot chip - a SlotRow rotated 90 degrees.
 * Responsive width matching SlotRow height at each breakpoint.
 */
export const VerticalSlotChip = memo(function VerticalSlotChip({
  name,
  criticalSlots,
  isSelected = false,
  onClick,
}: VerticalSlotChipProps) {
  const colorType = classifyEquipment(name);
  const colors = getEquipmentColors(colorType);
  const displayName = abbreviateEquipmentName(name);

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${name} (${criticalSlots} slots)`} // Full name in tooltip
      className={`
        flex items-center justify-center flex-shrink-0 overflow-hidden
        border border-border-theme-subtle rounded-sm
        cursor-pointer active:scale-95 transition-all
        ${colors.bg} ${colors.border} ${colors.text}
        ${isSelected ? 'ring-2 ring-accent' : ''}
        w-[22px] sm:w-[30px]
        h-[80px] sm:h-[100px]
      `}
    >
      {/* Rotated text - scales with breakpoint like SlotRow, never wraps */}
      <span 
        className="text-[10px] sm:text-sm whitespace-nowrap"
        style={{ 
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
        }}
      >
        {displayName}
      </span>
    </button>
  );
});

export default VerticalSlotChip;
