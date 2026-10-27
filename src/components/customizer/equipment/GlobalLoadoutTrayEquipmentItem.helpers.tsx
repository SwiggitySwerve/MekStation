import React, { useEffect, useRef, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { getEquipmentAccentClasses } from '@/utils/colors/equipmentColors';
import { getLocationShorthand } from '@/utils/locationUtils';

import { trayStyles } from './GlobalLoadoutTray.styles';
import { LoadoutEquipmentItem } from './GlobalLoadoutTray.types';
import { GlobalLoadoutTrayPlacementStatus } from './GlobalLoadoutTrayPlacementStatus';

interface EquipmentItemViewArgs {
  item: LoadoutEquipmentItem;
  isOmni: boolean;
  isDragging: boolean;
  isSelected: boolean;
}

interface EquipmentItemView {
  canDrag: boolean;
  displayName: string;
  selectAccessibleName: string;
  removeAccessibleName: string;
  confirmRemoveAccessibleName: string;
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

function getAccessibleLocation(item: LoadoutEquipmentItem): string {
  return item.isAllocated && item.location
    ? item.location
    : 'unallocated loadout';
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
  const classes = [
    trayStyles.equipmentSurface,
    trayStyles.equipmentRow,
    categoryClassName,
  ];

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
    classes.push('ring-accent ring-1 ring-inset');
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
}: EquipmentItemViewArgs): EquipmentItemView {
  const isFixedOnOmni = isOmni && item.isOmniPodMounted === false;
  const canDrag = !item.isAllocated && !isFixedOnOmni;

  const displayName = getDisplayName(item, isOmni);
  const accessibleLocation = getAccessibleLocation(item);

  return {
    canDrag,
    displayName,
    selectAccessibleName: `Select ${displayName} in ${accessibleLocation}`,
    removeAccessibleName: `Remove ${displayName} from ${accessibleLocation}`,
    confirmRemoveAccessibleName: `Confirm removal of ${displayName} from ${accessibleLocation}`,
    tooltip: getTooltip(isFixedOnOmni, canDrag),
    rowClassName: buildRowClassName({
      categoryClassName: getEquipmentAccentClasses(item.category, item.name),
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
    <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
      <span
        className={`w-full truncate leading-tight font-medium text-inherit ${trayStyles.text.primary}`}
      >
        {displayName}
      </span>
      <span
        className={`text-text-theme-secondary mt-0.5 w-full truncate leading-tight tabular-nums ${trayStyles.text.secondary}`}
      >
        {item.weight}t · {item.criticalSlots} slot
        {item.criticalSlots !== 1 ? 's' : ''}
        {item.isAllocated && item.location && (
          <> · {getLocationShorthand(item.location)}</>
        )}
        {!item.isAllocated && (
          <>
            {' '}
            · <GlobalLoadoutTrayPlacementStatus />
          </>
        )}
      </span>
    </div>
  );
}

export function EquipmentRemoveControl({
  isRemovable,
  showConfirmRemove,
  removeAccessibleName,
  confirmRemoveAccessibleName,
  onRemoveClick,
}: {
  isRemovable: boolean;
  showConfirmRemove: boolean;
  removeAccessibleName: string;
  confirmRemoveAccessibleName: string;
  onRemoveClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}): React.ReactElement {
  if (!isRemovable) {
    return (
      <span
        className="text-text-theme-muted text-[11px]"
        title="Managed by configuration"
      >
        <AppIcon name="lock" size="inline" aria-hidden="true" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onRemoveClick}
      aria-label={
        showConfirmRemove ? confirmRemoveAccessibleName : removeAccessibleName
      }
      className={`focus-visible:ring-accent flex h-full min-h-11 w-full min-w-11 items-center justify-center rounded-r-md text-sm font-medium transition-all focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${
        showConfirmRemove
          ? 'bg-red-950 text-white'
          : 'text-text-theme-secondary hover:bg-red-950 hover:text-white'
      }`}
      title={showConfirmRemove ? 'Click again to confirm' : 'Remove from unit'}
    >
      {showConfirmRemove ? (
        <AppIcon name="check" size="inline" aria-hidden="true" />
      ) : (
        <AppIcon name="trash" size="inline" aria-hidden="true" />
      )}
    </button>
  );
}
