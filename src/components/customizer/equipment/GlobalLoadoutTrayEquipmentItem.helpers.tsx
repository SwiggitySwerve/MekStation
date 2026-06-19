import React, { useEffect, useRef, useState } from 'react';

import { getLocationShorthand } from '@/utils/locationUtils';

import { trayStyles } from './GlobalLoadoutTray.styles';
import { LoadoutEquipmentItem } from './GlobalLoadoutTray.types';

const REMOVE_MARK = '\u00d7';
const LOCK_MARK = '\uD83D\uDD12';

interface EquipmentItemViewArgs {
  item: LoadoutEquipmentItem;
  isOmni: boolean;
  isDragging: boolean;
  isSelected: boolean;
  categoryClassName: string;
}

interface EquipmentItemView {
  canDrag: boolean;
  displayName: string;
  tooltip: string;
  rowClassName: string;
}

interface EquipmentItemInteractionArgs {
  canDrag: boolean;
  instanceId: string;
  onSelect: () => void;
  onRemove: () => void;
}

function getDisplayName(item: LoadoutEquipmentItem, isOmni: boolean): string {
  if (!isOmni) {
    return item.name;
  }

  return `${item.name} ${item.isOmniPodMounted ? '(Pod)' : '(Fixed)'}`;
}

function getTooltip(isFixedOnOmni: boolean, canDrag: boolean): string {
  if (isFixedOnOmni) {
    return 'Fixed equipment - part of OmniMech base chassis';
  }

  if (canDrag) {
    return 'Drag to critical slot or click to select';
  }

  return 'Right-click to unassign';
}

function buildRowClassName({
  categoryClassName,
  canDrag,
  isFixedOnOmni,
  isDragging,
  isSelected,
}: {
  categoryClassName: string;
  canDrag: boolean;
  isFixedOnOmni: boolean;
  isDragging: boolean;
  isSelected: boolean;
}): string {
  const classes = [trayStyles.equipmentRow, categoryClassName];

  if (canDrag) {
    classes.push('cursor-grab active:cursor-grabbing');
  } else if (isFixedOnOmni) {
    classes.push('cursor-not-allowed');
  } else {
    classes.push('cursor-pointer');
  }

  if (isDragging) {
    classes.push('opacity-50');
  } else if (isFixedOnOmni) {
    classes.push('opacity-60');
  }

  if (isSelected) {
    classes.push('ring-accent ring-1 brightness-110 ring-inset');
  } else {
    classes.push('hover:brightness-110');
  }

  return classes.join(' ');
}

function clearConfirmTimer(
  ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

export function buildEquipmentItemView({
  item,
  isOmni,
  isDragging,
  isSelected,
  categoryClassName,
}: EquipmentItemViewArgs): EquipmentItemView {
  const isFixedOnOmni = isOmni && item.isOmniPodMounted === false;
  const canDrag = !item.isAllocated && !isFixedOnOmni;

  return {
    canDrag,
    displayName: getDisplayName(item, isOmni),
    tooltip: getTooltip(isFixedOnOmni, canDrag),
    rowClassName: buildRowClassName({
      categoryClassName,
      canDrag,
      isFixedOnOmni,
      isDragging,
      isSelected,
    }),
  };
}

export function useEquipmentItemInteractions({
  canDrag,
  instanceId,
  onSelect,
  onRemove,
}: EquipmentItemInteractionArgs): {
  isDragging: boolean;
  showConfirmRemove: boolean;
  handleDragStart: (event: React.DragEvent) => void;
  handleDragEnd: () => void;
  handleRemoveClick: (event: React.MouseEvent) => void;
} {
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => clearConfirmTimer(confirmTimeoutRef);
  }, []);

  const handleDragStart = (event: React.DragEvent) => {
    if (!canDrag) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData('text/equipment-id', instanceId);
    event.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    onSelect();
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleRemoveClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (showConfirmRemove) {
      onRemove();
      setShowConfirmRemove(false);
      clearConfirmTimer(confirmTimeoutRef);
      return;
    }

    setShowConfirmRemove(true);
    confirmTimeoutRef.current = setTimeout(() => {
      setShowConfirmRemove(false);
      confirmTimeoutRef.current = null;
    }, 3000);
  };

  return {
    isDragging,
    showConfirmRemove,
    handleDragStart,
    handleDragEnd,
    handleRemoveClick,
  };
}

export function EquipmentItemSummary({
  item,
  displayName,
}: {
  item: LoadoutEquipmentItem;
  displayName: string;
}): React.ReactElement {
  return (
    <div className={`flex w-full items-center ${trayStyles.gap}`}>
      <span
        className={`flex-1 truncate text-white ${trayStyles.text.primary} drop-shadow-sm`}
      >
        {displayName}
      </span>
      <span
        className={`text-white/50 ${trayStyles.text.secondary} whitespace-nowrap`}
      >
        {item.weight}t | {item.criticalSlots} slot
        {item.criticalSlots !== 1 ? 's' : ''}
        {item.isAllocated && item.location && (
          <span className="text-white/80">
            {' '}
            | {getLocationShorthand(item.location)}
          </span>
        )}
      </span>
    </div>
  );
}

export function EquipmentRemoveControl({
  isRemovable,
  showConfirmRemove,
  onRemoveClick,
}: {
  isRemovable: boolean;
  showConfirmRemove: boolean;
  onRemoveClick: (event: React.MouseEvent) => void;
}): React.ReactElement {
  if (!isRemovable) {
    return (
      <span
        className="text-[10px] text-white/30"
        title="Managed by configuration"
      >
        {LOCK_MARK}
      </span>
    );
  }

  return (
    <button
      onClick={onRemoveClick}
      className={`flex h-full w-full items-center justify-center rounded-r-md text-sm font-medium transition-all ${
        showConfirmRemove
          ? 'bg-red-900/50 text-red-400'
          : 'text-slate-400 hover:bg-red-900/30 hover:text-red-400'
      }`}
      title={showConfirmRemove ? 'Click again to confirm' : 'Remove from unit'}
    >
      {showConfirmRemove ? '?' : REMOVE_MARK}
    </button>
  );
}
