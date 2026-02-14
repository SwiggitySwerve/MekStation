import React, { useEffect, useRef, useState } from 'react';

import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';
import { getLocationShorthand } from '@/utils/locationUtils';

import { trayStyles } from './GlobalLoadoutTray.styles';
import { LoadoutEquipmentItem } from './GlobalLoadoutTray.types';

interface EquipmentItemProps {
  item: LoadoutEquipmentItem;
  isSelected: boolean;
  isOmni?: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function GlobalLoadoutTrayEquipmentItem({
  item,
  isSelected,
  isOmni = false,
  onSelect,
  onRemove,
  onContextMenu,
}: EquipmentItemProps): React.ReactElement {
  const colors = getCategoryColorsLegacy(item.category);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const isFixedOnOmni = isOmni && item.isOmniPodMounted === false;
  const canDrag = !item.isAllocated && !isFixedOnOmni;

  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/equipment-id', item.instanceId);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    onSelect();
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showConfirmRemove) {
      onRemove();
      setShowConfirmRemove(false);
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
        confirmTimeoutRef.current = null;
      }
      return;
    }

    setShowConfirmRemove(true);
    confirmTimeoutRef.current = setTimeout(() => {
      setShowConfirmRemove(false);
      confirmTimeoutRef.current = null;
    }, 3000);
  };

  const displayName = isOmni
    ? `${item.name} ${item.isOmniPodMounted ? '(Pod)' : '(Fixed)'}`
    : item.name;

  const tooltip = isFixedOnOmni
    ? 'Fixed equipment - part of OmniMech base chassis'
    : canDrag
      ? 'Drag to critical slot or click to select'
      : 'Right-click to unassign';

  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`${trayStyles.equipmentRow} ${colors.bg} ${canDrag ? 'cursor-grab active:cursor-grabbing' : isFixedOnOmni ? 'cursor-not-allowed' : 'cursor-pointer'} ${isDragging ? 'opacity-50' : isFixedOnOmni ? 'opacity-60' : ''} ${
        isSelected
          ? 'ring-accent ring-1 brightness-110 ring-inset'
          : 'hover:brightness-110'
      }`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      title={tooltip}
    >
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

      <div className="border-border-theme-subtle/30 ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center border-l">
        {item.isRemovable ? (
          <button
            onClick={handleRemoveClick}
            className={`flex h-full w-full items-center justify-center rounded-r-md text-sm font-medium transition-all ${
              showConfirmRemove
                ? 'bg-red-900/50 text-red-400'
                : 'text-slate-400 hover:bg-red-900/30 hover:text-red-400'
            }`}
            title={
              showConfirmRemove ? 'Click again to confirm' : 'Remove from unit'
            }
          >
            {showConfirmRemove ? '?' : '×'}
          </button>
        ) : (
          <span
            className="text-[10px] text-white/30"
            title="Managed by configuration"
          >
            🔒
          </span>
        )}
      </div>
    </div>
  );
}
