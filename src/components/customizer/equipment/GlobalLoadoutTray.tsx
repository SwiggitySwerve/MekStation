import React, { useCallback, useState } from 'react';

import { useEquipmentFiltering } from '@/hooks/useEquipmentFiltering';
import { MechLocation } from '@/types/construction';
import { EquipmentCategory } from '@/types/equipment';

import type {
  AvailableLocation,
  GlobalLoadoutTrayProps,
  LoadoutEquipmentItem,
} from './GlobalLoadoutTray.types';

import { CategoryFilterBar } from './CategoryFilterBar';
import { CATEGORY_ORDER } from './equipmentConstants';
import { trayStyles } from './GlobalLoadoutTray.styles';
import { GlobalLoadoutTrayAllocationSection } from './GlobalLoadoutTrayAllocationSection';
import { GlobalLoadoutTrayCategoryGroup } from './GlobalLoadoutTrayCategoryGroup';
import { GlobalLoadoutTrayContextMenu } from './GlobalLoadoutTrayContextMenu';

interface ContextMenuState {
  x: number;
  y: number;
  item: LoadoutEquipmentItem;
}

export type {
  LoadoutEquipmentItem,
  AvailableLocation,
  GlobalLoadoutTrayProps,
} from './GlobalLoadoutTray.types';

export function GlobalLoadoutTray({
  equipment,
  equipmentCount,
  onRemoveEquipment,
  onRemoveAllEquipment,
  isExpanded,
  onToggleExpand,
  selectedEquipmentId,
  onSelectEquipment,
  onUnassignEquipment,
  onQuickAssign,
  availableLocations = [],
  isOmni = false,
  className = '',
}: GlobalLoadoutTrayProps): React.ReactElement {
  const [unallocatedExpanded, setUnallocatedExpanded] = useState(true);
  const [allocatedExpanded, setAllocatedExpanded] = useState(true);
  const [activeCategory, setActiveCategory] = useState<
    EquipmentCategory | 'ALL'
  >('ALL');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const {
    filteredEquipment,
    unallocated,
    allocated,
    unallocatedByCategory,
    allocatedByCategory,
  } = useEquipmentFiltering(equipment, activeCategory);

  const handleSelect = useCallback(
    (id: string | null) => {
      onSelectEquipment?.(id);
    },
    [onSelectEquipment],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: LoadoutEquipmentItem) => {
      e.preventDefault();
      onSelectEquipment?.(item.instanceId);
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    [onSelectEquipment],
  );

  const handleQuickAssign = useCallback(
    (location: MechLocation) => {
      if (!contextMenu) {
        return;
      }
      onQuickAssign?.(contextMenu.item.instanceId, location);
      onSelectEquipment?.(null);
    },
    [contextMenu, onQuickAssign, onSelectEquipment],
  );

  const handleUnassign = useCallback(
    (instanceId: string) => {
      onUnassignEquipment?.(instanceId);
    },
    [onUnassignEquipment],
  );

  const handleDropToUnallocated = useCallback(
    (equipmentId: string) => {
      const item = equipment.find(
        (candidate) => candidate.instanceId === equipmentId,
      );
      if (item?.isAllocated) {
        onUnassignEquipment?.(equipmentId);
      }
    },
    [equipment, onUnassignEquipment],
  );

  const removableCount = equipment.filter((item) => item.isRemovable).length;
  const handleRemoveAll = useCallback(() => {
    if (removableCount === 0) {
      return;
    }
    if (
      window.confirm(`Remove all ${removableCount} removable equipment items?`)
    ) {
      onRemoveAllEquipment();
      onSelectEquipment?.(null);
    }
  }, [removableCount, onRemoveAllEquipment, onSelectEquipment]);

  if (!isExpanded) {
    return (
      <div
        className={`bg-surface-base border-border-theme-subtle flex w-10 flex-shrink-0 flex-col items-center border-l py-2 ${className}`}
      >
        <button
          onClick={onToggleExpand}
          className="text-text-theme-secondary flex flex-col items-center gap-1 p-2 transition-colors hover:text-white"
          title="Expand loadout"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>

          {equipmentCount > 0 && (
            <span className="bg-accent min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-xs text-white">
              {equipmentCount}
            </span>
          )}

          <span className="mt-2 rotate-180 text-xs [writing-mode:vertical-rl]">
            Loadout
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className={`bg-surface-base border-border-theme-subtle flex w-[180px] flex-shrink-0 flex-col border-l lg:w-[240px] ${className}`}
      >
        <div className="border-border-theme flex-shrink-0 border-b">
          <div
            className={`flex items-center justify-between ${trayStyles.padding.header} py-2`}
          >
            <div className={`flex items-center ${trayStyles.gap}`}>
              <h3
                className={`font-semibold text-white ${trayStyles.text.primary}`}
              >
                Loadout
              </h3>
              <span
                className={`bg-surface-raised text-text-theme-secondary ${trayStyles.text.secondary} rounded-full px-1.5 py-0.5`}
              >
                {equipmentCount}
              </span>
            </div>
            <button
              onClick={onToggleExpand}
              className="text-text-theme-secondary p-1 transition-colors hover:text-white"
              title="Collapse"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <CategoryFilterBar
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            compact
          />

          {removableCount > 0 && (
            <div className={`${trayStyles.padding.header} pb-2`}>
              <button
                onClick={handleRemoveAll}
                className={`w-full rounded bg-red-900/40 px-2 py-1 ${trayStyles.text.primary} text-red-300 transition-colors hover:bg-red-900/60`}
              >
                Remove All ({removableCount})
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredEquipment.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <div className="mb-2 text-2xl">⚙️</div>
              <div className={trayStyles.text.primary}>
                {equipment.length === 0 ? 'No equipment' : 'No items in filter'}
              </div>
              <div className={`${trayStyles.text.secondary} mt-1`}>
                {equipment.length === 0
                  ? 'Add from Equipment tab'
                  : 'Try another category'}
              </div>
            </div>
          ) : (
            <>
              <GlobalLoadoutTrayAllocationSection
                title="Unallocated"
                count={unallocated.length}
                isExpanded={unallocatedExpanded}
                onToggle={() => setUnallocatedExpanded(!unallocatedExpanded)}
                titleColor="text-accent"
                isDropZone={true}
                onDrop={handleDropToUnallocated}
              >
                {unallocated.length === 0 ? (
                  <div
                    className={`${trayStyles.padding.row} py-1 text-center text-slate-500 ${trayStyles.text.tertiary}`}
                  >
                    Drag here to unassign
                  </div>
                ) : (
                  CATEGORY_ORDER.map((category) => {
                    const items = unallocatedByCategory.get(category);
                    if (!items || items.length === 0) {
                      return null;
                    }
                    return (
                      <GlobalLoadoutTrayCategoryGroup
                        key={category}
                        category={category}
                        items={items}
                        selectedId={selectedEquipmentId}
                        isOmni={isOmni}
                        onSelect={handleSelect}
                        onRemove={onRemoveEquipment}
                        onContextMenu={handleContextMenu}
                      />
                    );
                  })
                )}
              </GlobalLoadoutTrayAllocationSection>

              {allocated.length > 0 && (
                <GlobalLoadoutTrayAllocationSection
                  title="Allocated"
                  count={allocated.length}
                  isExpanded={allocatedExpanded}
                  onToggle={() => setAllocatedExpanded(!allocatedExpanded)}
                  titleColor="text-green-400"
                >
                  {CATEGORY_ORDER.map((category) => {
                    const items = allocatedByCategory.get(category);
                    if (!items || items.length === 0) {
                      return null;
                    }
                    return (
                      <GlobalLoadoutTrayCategoryGroup
                        key={category}
                        category={category}
                        items={items}
                        selectedId={selectedEquipmentId}
                        isOmni={isOmni}
                        onSelect={handleSelect}
                        onRemove={onRemoveEquipment}
                        onContextMenu={handleContextMenu}
                      />
                    );
                  })}
                </GlobalLoadoutTrayAllocationSection>
              )}
            </>
          )}
        </div>

        {selectedEquipmentId && (
          <div
            className={`flex-shrink-0 ${trayStyles.padding.header} border-border-theme bg-surface-raised/50 border-t py-2`}
          >
            <div
              className={`${trayStyles.text.secondary} text-text-theme-secondary`}
            >
              Selected for placement
            </div>
            <div
              className={`${trayStyles.text.primary} text-accent truncate font-medium`}
            >
              {
                equipment.find(
                  (item) => item.instanceId === selectedEquipmentId,
                )?.name
              }
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <GlobalLoadoutTrayContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          availableLocations={availableLocations}
          onQuickAssign={handleQuickAssign}
          onUnassign={() => {
            handleUnassign(contextMenu.item.instanceId);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

export default GlobalLoadoutTray;
