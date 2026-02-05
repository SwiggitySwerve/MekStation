/**
 * Draggable Equipment Component
 *
 * Equipment item that can be dragged to critical slots.
 *
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import React from 'react';

import {
  classifyEquipment,
  getEquipmentColors,
} from '@/utils/colors/equipmentColors';

interface DraggableEquipmentProps {
  /** Equipment ID */
  id: string;
  /** Equipment name */
  name: string;
  /** Number of critical slots */
  criticalSlots: number;
  /** Is selected */
  isSelected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Draggable equipment item for the unallocated panel
 */
export function DraggableEquipment({
  id,
  name,
  criticalSlots,
  isSelected = false,
  onClick,
  className = '',
}: DraggableEquipmentProps): React.ReactElement {
  const colorType = classifyEquipment(name);
  const colors = getEquipmentColors(colorType);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/equipment-id', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={`flex cursor-grab items-center justify-between rounded border px-2 py-1.5 transition-all ${colors.bg} ${colors.border} ${colors.text} ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900' : ''} hover:brightness-110 active:cursor-grabbing ${className} `}
    >
      <span className="truncate text-sm">{name}</span>
      <span className="ml-2 flex flex-shrink-0 items-center gap-1">
        <span className="text-xs opacity-75">
          {criticalSlots} slot{criticalSlots !== 1 ? 's' : ''}
        </span>
        {isSelected && <span className="text-yellow-400">★</span>}
      </span>
    </div>
  );
}
