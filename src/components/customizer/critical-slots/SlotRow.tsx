/**
 * Slot Row Component
 *
 * Single critical slot display with drag-and-drop support.
 * Matches MegaMekLab's visual style.
 *
 * @spec openspec/specs/critical-slots-display/spec.md
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

import type { SlotContent } from './criticalSlotTypes';

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

function SlotContextMenu({
  x,
  y,
  slotName,
  onUnassign,
  onClose,
}: SlotContextMenuProps) {
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
      className="bg-surface-base border-border-theme fixed z-50 min-w-[140px] rounded-lg border py-1 shadow-xl"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="border-border-theme-subtle text-text-theme-secondary max-w-[200px] truncate border-b px-3 py-1 text-xs">
        {slotName}
      </div>
      <button
        onClick={() => {
          onUnassign();
          onClose();
        }}
        className="text-accent hover:bg-surface-raised w-full px-3 py-1.5 text-left text-sm transition-colors"
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
  /** Whether the unit is an OmniMech (affects fixed equipment behavior) */
  isOmni?: boolean;
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

function isFixedEquipmentOnOmni(slot: SlotContent, isOmni: boolean): boolean {
  return isOmni && slot.type === 'equipment' && slot.isOmniPodMounted === false;
}

function canUnassignSlot(slot: SlotContent, isFixedOnOmni: boolean): boolean {
  return (
    !isFixedOnOmni &&
    (slot.type === 'equipment' ||
      (slot.type === 'system' && !!slot.equipmentId))
  );
}

interface SlotStyleState {
  slot: SlotContent;
  isAssignable: boolean;
  isDragOver: boolean;
}

interface SlotInteractivityState {
  canDrag: boolean;
  isTouchDevice: boolean;
  isFixedOnOmni: boolean;
  canUnassign: boolean;
}

interface SlotDragStartState {
  canDrag: boolean;
  equipmentId?: string;
  onDragStart?: (equipmentId: string) => void;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
}

interface SlotDropState {
  slot: SlotContent;
  onDrop: (equipmentId: string) => void;
  setIsDragOver: React.Dispatch<React.SetStateAction<boolean>>;
}

interface SlotRemoveState {
  canUnassign: boolean;
  onRemove: () => void;
}

interface SlotContextMenuState extends SlotRemoveState {
  setContextMenu: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
}

interface SlotTouchState extends SlotContextMenuState {
  isTouchDevice: boolean;
  setLongPressTimer: React.Dispatch<
    React.SetStateAction<ReturnType<typeof setTimeout> | null>
  >;
}

interface SlotKeyState extends SlotRemoveState {
  onClick: () => void;
}

function getStyleClasses({
  slot,
  isAssignable,
  isDragOver,
}: SlotStyleState): string {
  if (isDragOver) {
    return slot.type === 'empty' && isAssignable
      ? 'bg-green-800 border-green-400 text-green-200 scale-[1.02]'
      : 'bg-red-900/70 border-red-400 text-red-200';
  }

  if (isAssignable && slot.type === 'empty') {
    return 'bg-green-900/60 border-green-500 text-green-300';
  }

  return getSlotContentClasses(slot);
}

function getDisplayName(slot: SlotContent, isOmni: boolean): string {
  if (slot.type === 'empty') return '- Empty -';
  if (!slot.name) return '';

  const name = abbreviateEquipmentName(slot.name);
  if (!isOmni || slot.type !== 'equipment') return name;

  return `${name}${slot.isOmniPodMounted ? ' (Pod)' : ' (Fixed)'}`;
}

function getCursorClasses({
  canDrag,
  isTouchDevice,
  isFixedOnOmni,
}: SlotInteractivityState): string {
  if (canDrag) {
    return isTouchDevice
      ? 'cursor-pointer'
      : 'cursor-grab active:cursor-grabbing';
  }
  return isFixedOnOmni ? 'cursor-not-allowed' : 'cursor-pointer';
}

function getOpacityClasses({
  isDragging,
  isFixedOnOmni,
}: {
  isDragging: boolean;
  isFixedOnOmni: boolean;
}): string {
  if (isDragging) return 'opacity-50';
  return isFixedOnOmni ? 'opacity-60' : '';
}

function getTitle({
  isFixedOnOmni,
  canDrag,
  canUnassign,
  isTouchDevice,
}: SlotInteractivityState): string | undefined {
  if (isFixedOnOmni) return 'Fixed equipment - part of OmniMech base chassis';
  if (canDrag) {
    return isTouchDevice
      ? 'Tap to select, long-press to unassign'
      : 'Drag to move, double-click or right-click to unassign';
  }
  if (!canUnassign) return undefined;

  return isTouchDevice
    ? 'Long-press to unassign'
    : 'Double-click or right-click to unassign';
}

function getSlotAriaLabel(slot: SlotContent): string {
  return slot.name
    ? `Slot ${slot.index + 1}: ${slot.name}`
    : `Empty slot ${slot.index + 1}`;
}

function handleSlotDragStart(
  e: React.DragEvent,
  state: SlotDragStartState,
): void {
  const { canDrag, equipmentId, onDragStart, setIsDragging } = state;
  if (!canDrag || !equipmentId) {
    e.preventDefault();
    return;
  }

  e.dataTransfer.setData('text/equipment-id', equipmentId);
  e.dataTransfer.effectAllowed = 'move';
  setIsDragging(true);
  onDragStart?.(equipmentId);
}

function handleSlotDrop(e: React.DragEvent, state: SlotDropState): void {
  e.preventDefault();
  state.setIsDragOver(false);
  const equipmentId = e.dataTransfer.getData('text/equipment-id');

  if (equipmentId && state.slot.type === 'empty') {
    state.onDrop(equipmentId);
  }
}

function handleSlotDoubleClick(state: SlotRemoveState): void {
  if (state.canUnassign) {
    state.onRemove();
  }
}

function handleSlotContextMenu(
  e: React.MouseEvent,
  state: SlotContextMenuState,
): void {
  if (state.canUnassign) {
    e.preventDefault();
    state.setContextMenu({ x: e.clientX, y: e.clientY });
  }
}

function handleSlotTouchStart(
  e: React.TouchEvent,
  state: SlotTouchState,
): void {
  if (!state.canUnassign || !state.isTouchDevice) return;

  const timer = setTimeout(() => {
    const touch = e.touches[0];
    state.setContextMenu({ x: touch.clientX, y: touch.clientY });
  }, 500);

  state.setLongPressTimer(timer);
}

function clearLongPressTimer(
  longPressTimer: ReturnType<typeof setTimeout> | null,
  setLongPressTimer: React.Dispatch<
    React.SetStateAction<ReturnType<typeof setTimeout> | null>
  >,
): void {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    setLongPressTimer(null);
  }
}

function handleSlotKeyDown(e: React.KeyboardEvent, state: SlotKeyState): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    state.onClick();
    return;
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && state.canUnassign) {
    e.preventDefault();
    state.onRemove();
  }
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
  isOmni = false,
  onClick,
  onDrop,
  onRemove,
  onDragStart: onDragStartProp,
}: SlotRowProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Touch device detection
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    // Detect if device supports touch
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const isFixedOnOmni = isFixedEquipmentOnOmni(slot, isOmni);
  const canUnassign = canUnassignSlot(slot, isFixedOnOmni);
  const canDrag = !!(slot.equipmentId && canUnassign);
  const interactivityState = {
    canDrag,
    isTouchDevice,
    isFixedOnOmni,
    canUnassign,
  };
  const styleClasses = getStyleClasses({ slot, isAssignable, isDragOver });
  const selectionClasses = isSelected ? 'ring-2 ring-accent' : '';
  const displayName = getDisplayName(slot, isOmni);
  const title = getTitle(interactivityState);

  return (
    <>
      <div
        role="gridcell"
        tabIndex={0}
        draggable={canDrag}
        aria-label={getSlotAriaLabel(slot)}
        aria-selected={isSelected}
        className={`border-border-theme-subtle my-0.5 flex items-center rounded-sm border transition-all focus:outline-none ${getCursorClasses(interactivityState)} ${getOpacityClasses({ isDragging, isFixedOnOmni })} ${isAssignable ? 'focus:ring-1 focus:ring-green-400 focus:ring-inset' : ''} ${styleClasses} ${selectionClasses} ${compact ? 'px-1 py-0.5 text-[10px] sm:text-xs' : 'px-1 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-sm'} `}
        onClick={onClick}
        onDoubleClick={() => handleSlotDoubleClick({ canUnassign, onRemove })}
        onContextMenu={(e) =>
          handleSlotContextMenu(e, { canUnassign, onRemove, setContextMenu })
        }
        onKeyDown={(e) => {
          handleSlotKeyDown(e, { canUnassign, onClick, onRemove });
        }}
        onDragStart={(e) =>
          handleSlotDragStart(e, {
            canDrag,
            equipmentId: slot.equipmentId,
            onDragStart: onDragStartProp,
            setIsDragging,
          })
        }
        onDragEnd={() => setIsDragging(false)}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => handleSlotDrop(e, { slot, onDrop, setIsDragOver })}
        onTouchStart={(e) =>
          handleSlotTouchStart(e, {
            canUnassign,
            onRemove,
            setContextMenu,
            isTouchDevice,
            setLongPressTimer,
          })
        }
        onTouchEnd={() =>
          clearLongPressTimer(longPressTimer, setLongPressTimer)
        }
        onTouchMove={() =>
          clearLongPressTimer(longPressTimer, setLongPressTimer)
        }
        title={title}
      >
        <span className="flex-1 truncate">{displayName}</span>
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
