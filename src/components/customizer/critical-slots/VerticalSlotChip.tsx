/**
 * Vertical Slot Chip Component
 * 
 * A rotated version of SlotRow for displaying unassigned equipment.
 * Width EXACTLY matches SlotRow height. No flex/auto-expansion.
 * 
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import React, { memo } from 'react';
import { 
  classifyEquipment, 
  getEquipmentColors 
} from '@/utils/colors/equipmentColors';

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
 * FIXED width of 26px = SlotRow height (text-sm + py-1 + border)
 */
export const VerticalSlotChip = memo(function VerticalSlotChip({
  name,
  criticalSlots,
  isSelected = false,
  onClick,
}: VerticalSlotChipProps) {
  const colorType = classifyEquipment(name);
  const colors = getEquipmentColors(colorType);

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${name} (${criticalSlots} slots)`}
      className={`
        ${colors.bg} ${colors.border} ${colors.text}
        ${isSelected ? 'ring-2 ring-accent' : ''}
        border border-border-theme-subtle rounded-sm
        cursor-pointer active:scale-95 transition-all
      `}
      style={{
        width: '26px',
        height: '96px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
        margin: '0 1px',
      }}
    >
      <span 
        style={{ 
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          fontSize: '10px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxHeight: '90px',
        }}
      >
        {name}
      </span>
    </button>
  );
});

export default VerticalSlotChip;
