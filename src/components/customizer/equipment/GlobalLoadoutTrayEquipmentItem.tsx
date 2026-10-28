import React, { useId, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

import { trayStyles } from './GlobalLoadoutTray.styles';
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
  const initialView = buildEquipmentItemView({
    item,
    isOmni,
    isDragging: false,
    isSelected,
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
  });
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsId = useId();

  return (
    <div
      draggable={view.canDrag}
      onDragStart={interactions.handleDragStart}
      onDragEnd={interactions.handleDragEnd}
      className={view.rowClassName}
      onContextMenu={onContextMenu}
      title={view.tooltip}
    >
      <div className={trayStyles.equipmentRowLine}>
        <button
          type="button"
          onClick={onSelect}
          aria-label={view.selectAccessibleName}
          aria-pressed={isSelected}
          className="focus-visible:ring-text-theme-primary flex min-h-11 min-w-0 flex-1 items-center rounded-l-md !py-0 !pr-0 !pl-4 text-left focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          <EquipmentItemSummary item={item} displayName={view.displayName} />
        </button>

        {/* The same trailing chevron as a group card; it opens this item's
            actions instead of its instances. */}
        <span className={trayStyles.rowActionCell}>
          <button
            type="button"
            onClick={() => setActionsOpen((open) => !open)}
            aria-expanded={actionsOpen}
            aria-controls={actionsOpen ? actionsId : undefined}
            aria-label={`${actionsOpen ? 'Hide' : 'Show'} actions for ${view.actionsAccessibleName}`}
            title={actionsOpen ? 'Hide actions' : 'Show actions'}
            className="focus-visible:ring-text-theme-primary hover:bg-surface-raised flex h-full min-h-11 w-11 items-center justify-center rounded-r-md !p-0 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
          >
            <AppIcon
              name="chevron-down"
              size="inline"
              aria-hidden="true"
              className={`text-text-theme-secondary transition-transform ${actionsOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </span>
      </div>

      {actionsOpen && (
        <div
          id={actionsId}
          className="border-border-theme-subtle/50 flex justify-end border-t px-1 py-1"
        >
          <EquipmentRemoveControl
            isRemovable={item.isRemovable}
            showConfirmRemove={interactions.showConfirmRemove}
            removeAccessibleName={view.removeAccessibleName}
            confirmRemoveAccessibleName={view.confirmRemoveAccessibleName}
            onRemoveClick={interactions.handleRemoveClick}
          />
        </div>
      )}
    </div>
  );
}
