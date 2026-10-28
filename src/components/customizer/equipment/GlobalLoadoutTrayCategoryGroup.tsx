import React, { useState } from 'react';

import { SvgIcon } from '@/components/ui/SvgIcon';
import { getCategoryIndicatorClass } from '@/utils/colors/equipmentColors';

import { trayStyles } from './GlobalLoadoutTray.styles';
import { LoadoutEquipmentItem } from './GlobalLoadoutTray.types';
import { GlobalLoadoutTrayEquipmentGroup } from './GlobalLoadoutTrayEquipmentGroup';

interface CategoryGroupProps {
  title: string;
  items: LoadoutEquipmentItem[];
  grouping: 'category' | 'location' | 'fixed';
  selectedId?: string | null;
  isOmni?: boolean;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, item: LoadoutEquipmentItem) => void;
}

export function GlobalLoadoutTrayCategoryGroup({
  title,
  items,
  grouping,
  selectedId,
  isOmni = false,
  onSelect,
  onRemove,
  onContextMenu,
}: CategoryGroupProps): React.ReactElement {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const equipmentGroups = new Map<string, LoadoutEquipmentItem[]>();

  for (const item of items) {
    const location =
      item.isAllocated && item.location ? item.location : 'unassigned';
    const groupId = `${item.equipmentId}::${location}`;
    const groupedItems = equipmentGroups.get(groupId) ?? [];
    groupedItems.push(item);
    equipmentGroups.set(groupId, groupedItems);
  }

  const groupIcon =
    grouping === 'location'
      ? 'm12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 5Z'
      : grouping === 'fixed'
        ? 'M7 11V7a5 5 0 0 1 10 0v4m-9 0h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z'
        : // Category headers lead with their colour dot alone: a ≡ glyph
          // there read as a drag handle on a header that cannot be dragged.
          null;

  const toggleEquipmentGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <section>
      <div className={trayStyles.categoryRow}>
        {grouping === 'category' && items[0] && (
          <span
            aria-hidden="true"
            className={`${trayStyles.categoryDot} ${getCategoryIndicatorClass(items[0].category)}`}
          />
        )}
        {groupIcon && (
          <SvgIcon
            size="inline"
            aria-hidden="true"
            className="text-text-theme-secondary"
          >
            <path d={groupIcon} />
          </SvgIcon>
        )}
        <span
          className={`${trayStyles.text.secondary} text-text-theme-secondary min-w-0 truncate font-medium tracking-wide uppercase`}
        >
          {title}
        </span>
        {/* The count joins the label ("ENERGY · 6") rather than the right
            column, where the Mounted and Unassigned section counts sit. */}
        <span
          data-testid="loadout-category-count"
          className={`${trayStyles.text.secondary} text-text-theme-secondary shrink-0 tabular-nums`}
        >
          · {items.length}
        </span>
      </div>

      {Array.from(equipmentGroups.entries()).map(([groupId, groupItems]) => (
        <GlobalLoadoutTrayEquipmentGroup
          key={groupId}
          items={groupItems}
          isExpanded={expandedGroups.has(groupId)}
          isOmni={isOmni}
          selectedId={selectedId}
          onToggle={() => toggleEquipmentGroup(groupId)}
          onSelect={onSelect}
          onRemove={onRemove}
          onContextMenu={onContextMenu}
        />
      ))}
    </section>
  );
}
