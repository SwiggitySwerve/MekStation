/**
 * Double Slot Row Component
 *
 * Renders a superheavy CritEntry as a split row when both primary and
 * secondary mounts are present. When only primary is filled, shows
 * a subtle indicator that a compatible item can be paired.
 *
 * @spec openspec/specs/superheavy-mech-system/spec.md
 */

import React, { useState, useRef, useEffect, memo } from 'react';

import {
  classifyEquipment,
  getEquipmentColors,
} from '@/utils/colors/equipmentColors';
import {
  getSlotColors,
  classifySystemComponent,
} from '@/utils/colors/slotColors';
import { abbreviateEquipmentName } from '@/utils/equipmentNameAbbreviations';

import { CritEntry, SlotContent } from './CriticalSlotsDisplay';

// =============================================================================
// Context Menu for Double Slot
// =============================================================================

interface DoubleSlotContextMenuProps {
  x: number;
  y: number;
  primaryName: string;
  secondaryName?: string;
  onUnassign: () => void;
  onUnpair?: () => void;
  onClose: () => void;
}

function DoubleSlotContextMenu({
  x,
  y,
  primaryName,
  secondaryName,
  onUnassign,
  onUnpair,
  onClose,
}: DoubleSlotContextMenuProps) {
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
  const adjustedY = Math.min(y, window.innerHeight - 120);

  return (
    <div
      ref={menuRef}
      className="bg-surface-base border-border-theme fixed z-50 min-w-[140px] rounded-lg border py-1 shadow-xl"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="border-border-theme-subtle text-text-theme-secondary max-w-[200px] truncate border-b px-3 py-1 text-xs">
        {primaryName}
        {secondaryName && ` + ${secondaryName}`}
      </div>
      {secondaryName && onUnpair && (
        <button
          onClick={() => {
            onUnpair();
            onClose();
          }}
          className="text-accent hover:bg-surface-raised w-full px-3 py-1.5 text-left text-sm transition-colors"
        >
          Unpair
        </button>
      )}
      <button
        onClick={() => {
          onUnassign();
          onClose();
        }}
        className="text-accent hover:bg-surface-raised w-full px-3 py-1.5 text-left text-sm transition-colors"
      >
        Unassign All
      </button>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getItemClasses(slot: SlotContent): string {
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

function getDisplayName(slot: SlotContent): string {
  if (slot.type === 'empty') return '- Empty -';
  if (slot.name) return abbreviateEquipmentName(slot.name);
  return '';
}

// =============================================================================
// Main Component
// =============================================================================

interface DoubleSlotRowProps {
  /** The CritEntry data */
  entry: CritEntry;
  /** Is this slot assignable */
  isAssignable: boolean;
  /** Is this slot's primary equipment selected */
  isSelected: boolean;
  /** Is this entry pairable (can accept a second single-crit item) */
  isPairable: boolean;
  /** Compact display */
  compact?: boolean;
  /** Click handler */
  onClick: () => void;
  /** Drop handler */
  onDrop: (equipmentId: string) => void;
  /** Remove all from this entry */
  onRemove: () => void;
  /** Remove only the secondary mount */
  onUnpair?: () => void;
  /** Drag start from this entry */
  onDragStart?: (equipmentId: string) => void;
}

/**
 * Superheavy double-slot row.
 * Renders split view when secondary is present, full-width otherwise.
 */
export const DoubleSlotRow = memo(function DoubleSlotRow({
  entry,
  isAssignable,
  isSelected,
  isPairable,
  compact = false,
  onClick,
  onDrop,
  onRemove,
  onUnpair,
  onDragStart,
}: DoubleSlotRowProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const { primary, secondary } = entry;
  const hasPair = !!secondary;
  const canDrag = !!(primary.equipmentId && primary.type === 'equipment');
  const canUnassign = primary.type === 'equipment' || hasPair;

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const equipmentId = e.dataTransfer.getData('text/equipment-id');
    if (equipmentId) {
      onDrop(equipmentId);
    }
  };
  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag || !primary.equipmentId) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/equipment-id', primary.equipmentId);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(primary.equipmentId);
  };

  const handleDoubleClick = () => {
    if (canUnassign) onRemove();
  };
  const handleContextMenu = (e: React.MouseEvent) => {
    if (canUnassign) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  // Style computation
  const getContainerClasses = (): string => {
    if (isDragOver) {
      if (
        (primary.type === 'empty' && isAssignable) ||
        (isPairable && !hasPair)
      ) {
        return 'bg-green-800 border-green-400 scale-[1.02]';
      }
      return 'bg-red-900/70 border-red-400';
    }
    if (isAssignable && primary.type === 'empty') {
      return 'bg-green-900/60 border-green-500';
    }
    if (isPairable && !hasPair && primary.type === 'equipment') {
      // Subtle blue indicator for pairable slots
      return `${getItemClasses(primary)} ring-1 ring-blue-500/30 ring-inset`;
    }
    return getItemClasses(primary);
  };

  const selectionClasses = isSelected ? 'ring-2 ring-accent' : '';
  const sizeClasses = compact
    ? 'px-1 py-0.5 text-[10px] sm:text-xs'
    : 'px-1 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-sm';

  if (hasPair && secondary) {
    // Split view: two items side by side
    return (
      <>
        <div
          role="gridcell"
          tabIndex={0}
          className={`border-border-theme-subtle my-0.5 flex items-stretch rounded-sm border transition-all ${selectionClasses} ${sizeClasses}`}
          onClick={onClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          title="Double-slot: two items paired. Right-click to unpair."
          aria-label={`Double slot ${entry.index + 1}: ${primary.name ?? 'unknown'} + ${secondary.name ?? 'unknown'}`}
        >
          {/* Primary half */}
          <div
            className={`flex flex-1 items-center truncate border-r border-dashed border-slate-600 pr-1 ${getItemClasses(primary)}`}
          >
            <span className="truncate">{getDisplayName(primary)}</span>
          </div>
          {/* Secondary half */}
          <div
            className={`flex flex-1 items-center truncate pl-1 ${getItemClasses(secondary)}`}
          >
            <span className="truncate">{getDisplayName(secondary)}</span>
          </div>
        </div>

        {contextMenu && (
          <DoubleSlotContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            primaryName={primary.name ?? 'unknown'}
            secondaryName={secondary.name}
            onUnassign={onRemove}
            onUnpair={onUnpair}
            onClose={() => setContextMenu(null)}
          />
        )}
      </>
    );
  }

  // Single view (same as SlotRow but with double-slot indicator)
  return (
    <>
      <div
        role="gridcell"
        tabIndex={0}
        draggable={canDrag}
        className={`border-border-theme-subtle my-0.5 flex items-center rounded-sm border transition-all ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${getContainerClasses()} ${selectionClasses} ${sizeClasses}`}
        onClick={onClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
          if ((e.key === 'Delete' || e.key === 'Backspace') && canUnassign) {
            e.preventDefault();
            onRemove();
          }
        }}
        title={
          isPairable && !hasPair && primary.type === 'equipment'
            ? 'Double-slot: drop compatible ammo or heat sink to pair'
            : canDrag
              ? 'Drag to move, double-click or right-click to unassign'
              : undefined
        }
        aria-label={
          primary.name
            ? `Slot ${entry.index + 1}: ${primary.name}`
            : `Empty slot ${entry.index + 1}`
        }
      >
        <span className="flex-1 truncate">{getDisplayName(primary)}</span>
        {/* Double-slot indicator dot */}
        {entry.isDoubleSlot &&
          primary.type === 'equipment' &&
          !hasPair &&
          isPairable && (
            <span
              className="ml-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400/60"
              title="Can pair with another single-crit item"
            />
          )}
      </div>

      {contextMenu && primary.name && (
        <DoubleSlotContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          primaryName={primary.name}
          onUnassign={onRemove}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
});
