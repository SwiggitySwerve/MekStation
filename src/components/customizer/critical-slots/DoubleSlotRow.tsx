/**
 * Double Slot Row Component
 *
 * Renders a superheavy CritEntry as a split row when both primary and
 * secondary mounts are present. When only primary is filled, shows
 * a subtle indicator that a compatible item can be paired.
 *
 * @spec openspec/specs/superheavy-mech-system/spec.md
 */

import React, { useState, memo } from 'react';

import type { CritEntry } from './criticalSlotTypes';
import type {
  DoubleSlotContextMenuState,
  DoubleSlotDragStartState,
  DoubleSlotDropState,
  DoubleSlotRemoveState,
} from './SlotInteractionTypes';

import {
  getDoubleSlotContainerClasses,
  getDoubleSlotTitle,
  getPairDoubleSlotAriaLabel,
  getSingleDoubleSlotAriaLabel,
} from './DoubleSlotVisualHelpers';
import { SlotContextMenuShell } from './SlotContextMenuShell';
import { SlotEquipmentLabel } from './SlotEquipmentLabel';
import {
  getMergedSlotClasses,
  isMultiSlotEquipment,
  getSlotContentClasses,
  getSlotDisplayName,
  getSlotSizeClasses,
  getSlotColorStyle,
} from './SlotVisualHelpers';

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
}: DoubleSlotContextMenuProps): React.ReactElement {
  return (
    <SlotContextMenuShell x={x} y={y} menuHeight={120} onClose={onClose}>
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
    </SlotContextMenuShell>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function handleDoubleSlotDragStart(
  e: React.DragEvent,
  state: DoubleSlotDragStartState,
): void {
  const { canDrag, equipmentId, onDragStart } = state;
  if (!canDrag || !equipmentId) {
    e.preventDefault();
    return;
  }

  e.dataTransfer.setData('text/equipment-id', equipmentId);
  e.dataTransfer.effectAllowed = 'move';
  onDragStart?.(equipmentId);
}

function handleDoubleSlotDrop(
  e: React.DragEvent,
  state: DoubleSlotDropState,
): void {
  e.preventDefault();
  state.setIsDragOver(false);
  const equipmentId = e.dataTransfer.getData('text/equipment-id');

  if (equipmentId) {
    state.onDrop(equipmentId);
  }
}

function handleDoubleSlotDoubleClick(state: DoubleSlotRemoveState): void {
  if (state.canUnassign) {
    state.onRemove();
  }
}

function handleDoubleSlotContextMenu(
  e: React.MouseEvent,
  state: DoubleSlotContextMenuState,
): void {
  if (state.canUnassign) {
    e.preventDefault();
    state.setContextMenu({ x: e.clientX, y: e.clientY });
  }
}

function handleDoubleSlotKeyDown(
  e: React.KeyboardEvent,
  state: DoubleSlotRemoveState & { onClick: () => void },
): void {
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

  const selectionClasses = isSelected
    ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface-deep'
    : '';
  const sizeClasses = getSlotSizeClasses(compact);
  const visualState = {
    primary,
    isAssignable,
    isDragOver,
    isPairable,
    hasPair,
  };
  const removeState = { canUnassign, onRemove };
  const contextMenuState = { ...removeState, setContextMenu };
  const containerClasses = getDoubleSlotContainerClasses(visualState);
  const singleSlotTitle = getDoubleSlotTitle(
    primary,
    canDrag,
    isPairable,
    hasPair,
  );

  if (hasPair && secondary) {
    // Split view: two items side by side
    return (
      <>
        <div
          role="gridcell"
          tabIndex={0}
          className={`focus-visible:ring-accent my-0.5 flex items-stretch rounded-sm border transition-all focus-visible:ring-2 ${selectionClasses} ${sizeClasses}`}
          onClick={onClick}
          onDoubleClick={() => handleDoubleSlotDoubleClick(removeState)}
          onContextMenu={(e) =>
            handleDoubleSlotContextMenu(e, contextMenuState)
          }
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => handleDoubleSlotDrop(e, { onDrop, setIsDragOver })}
          title="Double-slot: two items paired. Right-click to unpair."
          aria-label={getPairDoubleSlotAriaLabel(entry, secondary)}
        >
          {/* Primary half */}
          <div
            style={getSlotColorStyle(primary)}
            className={`border-border-theme flex min-w-0 flex-1 items-center border-r border-dashed pr-1 ${getSlotContentClasses(primary)}`}
          >
            <span
              aria-hidden="true"
              className="mr-1 text-sm text-inherit tabular-nums lg:pointer-fine:text-[13px]"
            >
              {primary.index + 1}
            </span>
            <span className="min-w-0 flex-1 break-words whitespace-normal">
              {getSlotDisplayName(primary)}
            </span>
          </div>
          {/* Secondary half */}
          <div
            style={getSlotColorStyle(secondary)}
            className={`flex min-w-0 flex-1 items-center pl-1 ${getSlotContentClasses(secondary)}`}
          >
            <span
              aria-hidden="true"
              className="mr-1 text-sm text-inherit tabular-nums lg:pointer-fine:text-[13px]"
            >
              {secondary.index + 1}
            </span>
            <span className="min-w-0 flex-1 break-words whitespace-normal">
              {getSlotDisplayName(secondary)}
            </span>
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
        style={getSlotColorStyle(primary)}
        className={`focus-visible:ring-accent my-0.5 flex items-center rounded-sm border transition-all focus-visible:ring-2 ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${containerClasses} ${selectionClasses} ${sizeClasses} ${getMergedSlotClasses(primary)}`}
        onClick={onClick}
        onDoubleClick={() => handleDoubleSlotDoubleClick(removeState)}
        onContextMenu={(e) => handleDoubleSlotContextMenu(e, contextMenuState)}
        onDragStart={(e) =>
          handleDoubleSlotDragStart(e, {
            canDrag,
            equipmentId: primary.equipmentId,
            onDragStart,
          })
        }
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => handleDoubleSlotDrop(e, { onDrop, setIsDragOver })}
        onKeyDown={(e) => {
          handleDoubleSlotKeyDown(e, { ...removeState, onClick });
        }}
        title={singleSlotTitle}
        aria-label={getSingleDoubleSlotAriaLabel(entry)}
      >
        {!isMultiSlotEquipment(primary) && (
          <span
            aria-hidden="true"
            className="mr-1 w-4 flex-shrink-0 pr-1 text-right text-sm text-inherit tabular-nums lg:pointer-fine:text-[13px]"
          >
            {primary.index + 1}
          </span>
        )}
        <SlotEquipmentLabel slot={primary} />
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
