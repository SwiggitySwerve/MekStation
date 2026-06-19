import React from 'react';

import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';

import { LoadoutEquipmentItem } from './GlobalLoadoutTray.types';
import {
  buildEquipmentItemView,
  EquipmentItemSummary,
  EquipmentRemoveControl,
  useEquipmentItemInteractions,
} from './GlobalLoadoutTrayEquipmentItem.helpers';

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
  const initialView = buildEquipmentItemView({
    item,
    isOmni,
    isDragging: false,
    isSelected,
    categoryClassName: colors.bg,
  });
  const interactions = useEquipmentItemInteractions({
    canDrag: initialView.canDrag,
    instanceId: item.instanceId,
    onSelect,
    onRemove,
  });
  const view = buildEquipmentItemView({
    item,
    isOmni,
    isDragging: interactions.isDragging,
    isSelected,
    categoryClassName: colors.bg,
  });

  return (
    <div
      draggable={view.canDrag}
      onDragStart={interactions.handleDragStart}
      onDragEnd={interactions.handleDragEnd}
      className={view.rowClassName}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      title={view.tooltip}
    >
      <EquipmentItemSummary item={item} displayName={view.displayName} />

      <div className="border-border-theme-subtle/30 ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center border-l">
        <EquipmentRemoveControl
          isRemovable={item.isRemovable}
          showConfirmRemove={interactions.showConfirmRemove}
          onRemoveClick={interactions.handleRemoveClick}
        />
      </div>
    </div>
  );
}
