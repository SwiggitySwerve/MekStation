/**
 * Slot Row Component
 * 
 * Single critical slot display with drag-and-drop support.
 * Matches MegaMekLab's visual style.
 * 
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { SlotContent } from './CriticalSlotsDisplay';
import { 
  getSlotColors, 
  classifySystemComponent,
} from '@/utils/colors/slotColors';
import { 
  classifyEquipment, 
  getEquipmentColors 
} from '@/utils/colors/equipmentColors';

// =============================================================================
// Context Menu Component
// =============================================================================

interface SlotContextMenuProps {
  x: number;
  y: number;
  slotName: string;
  onUnassign: () => void;
  onClose: () => void;
}

function SlotContextMenu({ x, y, slotName, onUnassign, onClose }: SlotContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);
  
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - 100);
  
  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-surface-base border border-border-theme rounded-lg shadow-xl py-1 min-w-[140px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3 py-1 border-b border-border-theme-subtle text-xs text-text-theme-secondary truncate max-w-[200px]">
        {slotName}
      </div>
      <button
        onClick={() => { onUnassign(); onClose(); }}
        className="w-full text-left px-3 py-1.5 text-sm text-accent hover:bg-surface-raised transition-colors"
      >
        Unassign
      </button>
    </div>
  );
}

interface SlotRowProps {
  /** Slot data */
  slot: SlotContent;
  /** Is this slot assignable (can accept equipment) */
  isAssignable: boolean;
  /** Is this slot's equipment selected */
  isSelected: boolean;
  /** Use compact display */
  compact?: boolean;
  /** Click handler */
  onClick: () => void;
  /** Drop handler */
  onDrop: (equipmentId: string) => void;
  /** Remove handler */
  onRemove: () => void;
  /** Called when equipment drag starts from this slot */
  onDragStart?: (equipmentId: string) => void;
}

/**
 * Get color classes for slot content
 */
function getSlotContentClasses(slot: SlotContent): string {
  if (slot.type === 'empty') {
    return 'bg-surface-base border-border-theme text-slate-500';
  }
  
  if (slot.type === 'system' && slot.name) {
    const componentType = classifySystemComponent(slot.name);
    const colors = getSlotColors(componentType);
    return `${colors.bg} ${colors.border} ${colors.text}`;
  }
  
  if (slot.type === 'equipment' && slot.name) {
    const colorType = classifyEquipment(slot.name);
    const colors = getEquipmentColors(colorType);
    return `${colors.bg} ${colors.border} ${colors.text}`;
  }
  
  return 'bg-surface-raised border-border-theme text-slate-300';
}

/**
 * Single critical slot row
 * Memoized for performance with many slots
 */
export const SlotRow = memo(function SlotRow({
  slot,
  isAssignable,
  isSelected,
  compact = false,
  onClick,
  onDrop,
  onRemove,
  onDragStart: onDragStartProp,
}: SlotRowProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  // Check if this slot has equipment that can be unassigned
  // Equipment and system types can be unassigned (moved back to unallocated)
  // Only truly fixed items (like cockpit, gyro) cannot be unassigned
  const canUnassign = slot.type === 'equipment' || 
    (slot.type === 'system' && slot.equipmentId); // System with equipment ID can be unassigned
  
  // Slots with equipment can be dragged to other locations or back to tray
  const canDrag = !!(slot.equipmentId && canUnassign);
  
  // Determine styling classes - assignable/drag states override content classes
  // This is needed because Tailwind classes don't override by className order
  const getStyleClasses = (): string => {
    // Drag over state has highest priority
    if (isDragOver) {
      // Empty AND assignable = valid drop target (green)
      // Empty but NOT assignable = invalid drop target (red) - not enough space
      // Not empty = invalid drop target (red) - slot occupied
      if (slot.type === 'empty' && isAssignable) {
        return 'bg-green-800 border-green-400 text-green-200 scale-[1.02]';
      }
      return 'bg-red-900/70 border-red-400 text-red-200';
    }
    // Assignable empty slots show green highlight (when equipment is selected)
    if (isAssignable && slot.type === 'empty') {
      return 'bg-green-900/60 border-green-500 text-green-300';
    }
    // Default content classes
    return getSlotContentClasses(slot);
  };
  
  const styleClasses = getStyleClasses();
  const selectionClasses = isSelected ? 'ring-2 ring-accent' : '';
  
  // Handle drag start (this slot is the source)
  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag || !slot.equipmentId) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/equipment-id', slot.equipmentId);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    // Notify parent so equipment can be selected and valid slots highlighted
    onDragStartProp?.(slot.equipmentId);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Handle drag events (this slot is the target)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const equipmentId = e.dataTransfer.getData('text/equipment-id');
    // Allow drop on empty slots - parent handler will validate if there's enough space
    // isAssignable check is for visual feedback, but we let parent do final validation
    // This handles both: drag from tray (selection highlights work) and drag between slots
    if (equipmentId && slot.type === 'empty') {
      onDrop(equipmentId);
    }
  };
  
  // Double-click to unassign any equipment
  const handleDoubleClick = () => {
    if (canUnassign) {
      onRemove();
    }
  };
  
  // Right-click to show context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    if (canUnassign) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };
  
  // Determine display name
  let displayName: string;
  if (slot.type === 'empty') {
    displayName = '- Empty -';
  } else if (slot.name) {
    displayName = slot.name;
  } else {
    // Continuation of multi-slot equipment - show empty or continuation marker
    displayName = '';
  }
  
  return (
    <>
      <div
        role="gridcell"
        tabIndex={0}
        draggable={canDrag}
        aria-label={slot.name ? `Slot ${slot.index + 1}: ${slot.name}` : `Empty slot ${slot.index + 1}`}
        aria-selected={isSelected}
        className={`
          flex items-center border border-border-theme-subtle rounded-sm my-0.5 transition-all
          focus:outline-none
          ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
          ${isDragging ? 'opacity-50' : ''}
          ${isAssignable ? 'focus:ring-1 focus:ring-green-400 focus:ring-inset' : ''}
          ${styleClasses}
          ${selectionClasses}
          ${compact ? 'px-2 py-0.5 text-xs' : 'px-2 py-1 text-sm'}
        `}
        onClick={onClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          } else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (canUnassign) {
              e.preventDefault();
              onRemove();
            }
          }
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={canDrag ? 'Drag to move, double-click or right-click to unassign' : (canUnassign ? 'Double-click or right-click to unassign' : undefined)}
      >
        <span className="truncate flex-1">{displayName}</span>
      </div>
      
      {/* Context Menu */}
      {contextMenu && slot.name && (
        <SlotContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          slotName={slot.name}
          onUnassign={onRemove}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
});
