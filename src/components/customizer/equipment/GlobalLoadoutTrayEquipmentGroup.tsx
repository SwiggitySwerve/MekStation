import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { getEquipmentAccentClasses } from '@/utils/colors/equipmentColors';
import { formatTons } from '@/utils/formatting';
import { getLocationShorthand } from '@/utils/locationUtils';

import { trayStyles } from './GlobalLoadoutTray.styles';
import { LoadoutEquipmentItem } from './GlobalLoadoutTray.types';
import { GlobalLoadoutTrayEquipmentItem } from './GlobalLoadoutTrayEquipmentItem';
import { GlobalLoadoutTrayPlacementStatus } from './GlobalLoadoutTrayPlacementStatus';

interface EquipmentGroupProps {
  items: LoadoutEquipmentItem[];
  isExpanded: boolean;
  isOmni?: boolean;
  selectedId?: string | null;
  onToggle: () => void;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, item: LoadoutEquipmentItem) => void;
}

function getGroupLocation(item: LoadoutEquipmentItem): string {
  return item.isAllocated && item.location
    ? getLocationShorthand(item.location)
    : 'Unassigned';
}

export function GlobalLoadoutTrayEquipmentGroup({
  items,
  isExpanded,
  isOmni = false,
  selectedId,
  onToggle,
  onSelect,
  onRemove,
  onContextMenu,
}: EquipmentGroupProps): React.ReactElement {
  const [representative] = items;
  const location = getGroupLocation(representative);
  const count = items.length;
  const groupName = `${representative.name} in ${location}`;

  if (count === 1) {
    return (
      <GlobalLoadoutTrayEquipmentItem
        item={representative}
        isOmni={isOmni}
        isSelected={selectedId === representative.instanceId}
        onSelect={() =>
          onSelect(
            selectedId === representative.instanceId
              ? null
              : representative.instanceId,
          )
        }
        onRemove={() => onRemove(representative.instanceId)}
        onContextMenu={(event) => onContextMenu(event, representative)}
      />
    );
  }

  return (
    <div
      className={`my-0.5 ${trayStyles.equipmentSurface} ${getEquipmentAccentClasses(representative.category, representative.name)}`}
    >
      {/* Important padding beats the global button rule, so the chevron
          cell sits flush right in the same 44px slot as a single item's
          remove cell, and the name starts at the same inset. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Hide' : 'Show'} ${count} instances of ${groupName}`}
        title={`${count} identical items. ${isExpanded ? 'Hide' : 'Show'} each one.`}
        className="focus-visible:ring-text-theme-primary hover:bg-surface-raised flex min-h-11 w-full items-stretch gap-1.5 rounded-md !py-0 !pr-0 !pl-6 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      >
        <span className="flex min-w-0 flex-1 flex-col justify-center py-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className="border-border-theme bg-surface-base text-text-theme-primary shrink-0 rounded border px-1.5 text-xs leading-5 font-semibold tabular-nums"
              aria-hidden="true"
            >
              {count}&times;
            </span>
            <span
              className={`min-w-0 truncate leading-tight font-medium text-inherit ${trayStyles.text.primary}`}
            >
              {representative.name}
            </span>
          </span>
          <span
            className={`text-text-theme-secondary mt-0.5 block truncate leading-tight tabular-nums ${trayStyles.text.secondary}`}
          >
            {formatTons(representative.weight)} &middot;{' '}
            {representative.criticalSlots} slot
            {representative.criticalSlots === 1 ? '' : 's'}
            {representative.isAllocated && <> &middot; {location}</>}
            {!representative.isAllocated && (
              <>
                {' '}
                &middot; <GlobalLoadoutTrayPlacementStatus />
              </>
            )}
          </span>
        </span>
        <span className={trayStyles.rowActionCell} aria-hidden="true">
          <AppIcon
            name="chevron-down"
            size="inline"
            className={`text-text-theme-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isExpanded && (
        <div className="border-border-theme-subtle/50 border-t px-1 py-1">
          {items.map((item) => (
            <GlobalLoadoutTrayEquipmentItem
              key={item.instanceId}
              item={item}
              isOmni={isOmni}
              isSelected={selectedId === item.instanceId}
              onSelect={() =>
                onSelect(
                  selectedId === item.instanceId ? null : item.instanceId,
                )
              }
              onRemove={() => onRemove(item.instanceId)}
              onContextMenu={(event) => onContextMenu(event, item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
