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
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[140px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3 py-1 border-b border-slate-700 text-xs text-slate-400 truncate max-w-[200px]">
        {slotName}
      </div>
      <button
        onClick={() => { onUnassign(); onClose(); }}
        className="w-full text-left px-3 py-1.5 text-sm text-amber-400 hover:bg-slate-700 transition-colors"
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
}

/**
 * Get color classes for slot content
 */
function getSlotContentClasses(slot: SlotContent): string {
  if (slot.type === 'empty') {
    return 'bg-slate-800 border-slate-600 text-slate-500';
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
  
  return 'bg-slate-700 border-slate-600 text-slate-300';
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
}: SlotRowProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  // Check if this slot has equipment that can be unassigned
  // Equipment and system types can be unassigned (moved back to unallocated)
  // Only truly fixed items (like cockpit, gyro) cannot be unassigned
  const canUnassign = slot.type === 'equipment' || 
    (slot.type === 'system' && slot.equipmentId); // System with equipment ID can be unassigned
  
  // Determine styling classes - assignable/drag states override content classes
  // This is needed because Tailwind classes don't override by className order
  const getStyleClasses = (): string => {
    // Drag over state has highest priority
    if (isDragOver) {
      return slot.type === 'empty' 
        ? 'bg-green-800 border-green-400 text-green-200 scale-[1.02]'
        : 'bg-red-900/70 border-red-400 text-red-200';
    }
    // Assignable empty slots show green highlight
    if (isAssignable && slot.type === 'empty') {
      return 'bg-green-900/60 border-green-500 text-green-300';
    }
    // Default content classes
    return getSlotContentClasses(slot);
  };
  
  const styleClasses = getStyleClasses();
  const selectionClasses = isSelected ? 'ring-2 ring-amber-400' : '';
  
  // Handle drag events
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
        aria-label={slot.name ? `Slot ${slot.index + 1}: ${slot.name}` : `Empty slot ${slot.index + 1}`}
        aria-selected={isSelected}
        className={`
          flex items-center border-b border-slate-700 transition-all cursor-pointer
          focus:outline-none focus:ring-1 focus:ring-amber-400 focus:ring-inset
          ${styleClasses}
          ${selectionClasses}
          ${compact ? 'px-2 py-0.5 text-xs' : 'px-2 py-1 text-sm'}
          last:border-b-0
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={canUnassign ? 'Double-click or right-click to unassign' : undefined}
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
