import React from 'react';

import { EquipmentCategory } from '@/types/equipment';
import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';

import { CATEGORY_LABELS } from './equipmentConstants';
import { trayStyles } from './GlobalLoadoutTray.styles';
import { LoadoutEquipmentItem } from './GlobalLoadoutTray.types';
import { GlobalLoadoutTrayEquipmentItem } from './GlobalLoadoutTrayEquipmentItem';

interface CategoryGroupProps {
  category: EquipmentCategory;
  items: LoadoutEquipmentItem[];
  selectedId?: string | null;
  isOmni?: boolean;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, item: LoadoutEquipmentItem) => void;
}

export function GlobalLoadoutTrayCategoryGroup({
  category,
  items,
  selectedId,
  isOmni = false,
  onSelect,
  onRemove,
  onContextMenu,
}: CategoryGroupProps): React.ReactElement {
  const colors = getCategoryColorsLegacy(category);
  const label = CATEGORY_LABELS[category] || category;

  return (
    <div>
      <div className={trayStyles.categoryRow}>
        <span className={`${trayStyles.categoryDot} ${colors.bg}`} />
        <span
          className={`${trayStyles.text.secondary} text-text-theme-secondary font-medium tracking-wide uppercase`}
        >
          {label}
        </span>
        <span className={`${trayStyles.text.secondary} text-slate-500`}>
          ({items.length})
        </span>
      </div>

      {items.map((item) => (
        <GlobalLoadoutTrayEquipmentItem
          key={item.instanceId}
          item={item}
          isOmni={isOmni}
          isSelected={selectedId === item.instanceId}
          onSelect={() =>
            onSelect(selectedId === item.instanceId ? null : item.instanceId)
          }
          onRemove={() => onRemove(item.instanceId)}
          onContextMenu={(e) => onContextMenu(e, item)}
        />
      ))}
    </div>
  );
}
