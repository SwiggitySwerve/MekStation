import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { MechLocation } from '@/types/construction';
import {
  captureEquipmentMutationPolicy,
  matchesEquipmentMutationPolicy,
} from '@/utils/construction/equipmentMutationPolicy';

import type {
  EquipmentDisplayGroup,
  GroupingMode,
} from './GlobalLoadoutTray.helpers';
import type {
  AvailableLocation,
  GlobalLoadoutTrayProps,
  LoadoutEquipmentItem,
} from './GlobalLoadoutTray.types';

import { useCustomizerConfirmation } from '../dialogs/CustomizerConfirmationProvider';
import { groupEquipment, isFixedSystem } from './GlobalLoadoutTray.helpers';
import { trayStyles } from './GlobalLoadoutTray.styles';
import { GlobalLoadoutTrayAllocationSection } from './GlobalLoadoutTrayAllocationSection';
import { GlobalLoadoutTrayCategoryGroup } from './GlobalLoadoutTrayCategoryGroup';
import { GlobalLoadoutTrayContextMenu } from './GlobalLoadoutTrayContextMenu';
import { GlobalLoadoutTrayHeader } from './GlobalLoadoutTrayHeader';
import { LoadoutPlacementControls } from './LoadoutPlacementControls';

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
  getAvailableLocationsForEquipment,
  isOmni = false,
  className = '',
}: GlobalLoadoutTrayProps): React.ReactElement {
  // null = follow the content: open while something is unassigned, otherwise
  // a quiet collapsed header. Any explicit toggle then wins.
  const [unassignedOverride, setUnassignedOverride] = useState<boolean | null>(
    null,
  );
  const [mountedExpanded, setMountedExpanded] = useState(true);
  const [fixedExpanded, setFixedExpanded] = useState(false);
  const [grouping, setGrouping] = useState<GroupingMode>('category');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const { unassigned, mounted, fixedSystems } = useMemo(() => {
    const nextUnassigned: LoadoutEquipmentItem[] = [];
    const nextMounted: LoadoutEquipmentItem[] = [];
    const nextFixedSystems: LoadoutEquipmentItem[] = [];

    for (const item of equipment) {
      if (isFixedSystem(item, isOmni)) {
        nextFixedSystems.push(item);
      } else if (item.isAllocated) {
        nextMounted.push(item);
      } else {
        nextUnassigned.push(item);
      }
    }

    return {
      unassigned: nextUnassigned,
      mounted: nextMounted,
      fixedSystems: nextFixedSystems,
    };
  }, [equipment, isOmni]);

  const groupedUnassigned = useMemo(
    () => groupEquipment(unassigned, grouping),
    [grouping, unassigned],
  );
  const groupedMounted = useMemo(
    () => groupEquipment(mounted, grouping),
    [grouping, mounted],
  );
  const groupedFixedSystems = useMemo(
    () => groupEquipment(fixedSystems, grouping),
    [grouping, fixedSystems],
  );
  const contextMenuAvailableLocations = useMemo(() => {
    if (!contextMenu || !getAvailableLocationsForEquipment) {
      return availableLocations;
    }
    return getAvailableLocationsForEquipment(contextMenu.item.instanceId);
  }, [availableLocations, contextMenu, getAvailableLocationsForEquipment]);

  useEffect(() => {
    if (!isActionsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setIsActionsOpen(false);
        actionsRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsActionsOpen(false);
        actionsRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActionsOpen]);

  const unassignedExpanded = unassignedOverride ?? unassigned.length > 0;

  const handleSelect = useCallback(
    (id: string | null) => {
      onSelectEquipment?.(id);
    },
    [onSelectEquipment],
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, item: LoadoutEquipmentItem) => {
      event.preventDefault();
      onSelectEquipment?.(item.instanceId);
      setContextMenu({ x: event.clientX, y: event.clientY, item });
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

  const handleDropToUnassigned = useCallback(
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
  const { requestConfirmation } = useCustomizerConfirmation();
  const committed = useRef<{
    readonly equipment: readonly LoadoutEquipmentItem[];
    readonly isOmni: boolean;
    readonly isExpanded: boolean;
    readonly removableCount: number;
    readonly onRemoveAllEquipment: () => void;
    readonly onSelectEquipment: GlobalLoadoutTrayProps['onSelectEquipment'];
  } | null>(null);
  useLayoutEffect(() => {
    committed.current = {
      equipment,
      isOmni,
      isExpanded,
      removableCount,
      onRemoveAllEquipment,
      onSelectEquipment,
    };
  });
  const handleRemoveAll = useCallback(() => {
    const requested = committed.current;
    if (!requested?.isExpanded || requested.removableCount === 0) return;
    const policies = captureEquipmentMutationPolicy(requested.equipment);
    requestConfirmation({
      title: 'Remove removable equipment?',
      message: `Remove all ${requested.removableCount} removable equipment items?`,
      confirmLabel: 'Remove equipment',
      isCurrent: () => {
        const current = committed.current;
        return (
          !!current?.isExpanded &&
          current.isOmni === requested.isOmni &&
          matchesEquipmentMutationPolicy(policies, current.equipment)
        );
      },
      onConfirm: () => {
        const current = committed.current;
        if (!current) return;
        current.onRemoveAllEquipment();
        current.onSelectEquipment?.(null);
        setIsActionsOpen(false);
      },
    });
  }, [requestConfirmation]);

  const renderGroups = (
    groups: EquipmentDisplayGroup[],
    groupType: 'category' | 'location' | 'fixed' = grouping,
  ) =>
    groups.map((group) => (
      <GlobalLoadoutTrayCategoryGroup
        key={group.id}
        title={group.title}
        items={group.items}
        grouping={groupType}
        selectedId={selectedEquipmentId}
        isOmni={isOmni}
        onSelect={handleSelect}
        onRemove={onRemoveEquipment}
        onContextMenu={handleContextMenu}
      />
    ));

  if (!isExpanded) {
    return (
      <div
        className={`bg-surface-base border-border-theme-subtle flex w-11 shrink-0 flex-col items-center border-l py-2 ${className}`}
      >
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={`Expand loadout with ${equipmentCount} items`}
          className="text-text-theme-secondary focus-visible:ring-accent hover:text-text-theme-primary flex min-h-11 w-11 flex-col items-center gap-1 !px-0 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
          title="Expand loadout"
        >
          <AppIcon name="chevrons-left" size="toolbar" />
          <span className="bg-surface-raised text-text-theme-secondary min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums">
            {equipmentCount}
          </span>
          <span className="mt-1 rotate-180 text-xs tracking-[0.18em] [writing-mode:vertical-rl]">
            LOADOUT
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      <aside
        aria-label="Unit loadout"
        className={`bg-surface-base border-border-theme-subtle flex w-[240px] shrink-0 flex-col border-l ${className}`}
      >
        <GlobalLoadoutTrayHeader
          equipmentCount={equipmentCount}
          grouping={grouping}
          removableCount={removableCount}
          isActionsOpen={isActionsOpen}
          actionsRef={actionsRef}
          onGroupingChange={(value) => {
            setGrouping(value);
            setIsActionsOpen(false);
            actionsRef.current
              ?.querySelector<HTMLButtonElement>('button')
              ?.focus();
          }}
          onToggleActions={() => setIsActionsOpen((current) => !current)}
          onRemoveAll={handleRemoveAll}
          onToggleExpand={onToggleExpand}
        />

        {selectedEquipmentId &&
          equipment.find((item) => item.instanceId === selectedEquipmentId) && (
            <LoadoutPlacementControls
              item={
                equipment.find(
                  (item) => item.instanceId === selectedEquipmentId,
                )!
              }
              locations={availableLocations}
              isOmni={isOmni}
              onAssign={onQuickAssign}
              onUnassign={onUnassignEquipment}
              onCancel={() => onSelectEquipment?.(null)}
            />
          )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {equipment.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <AppIcon
                name="list"
                size="feature"
                className="text-text-theme-secondary/50 mx-auto mb-2"
              />
              <p className="text-text-theme-primary text-xs">No equipment</p>
              <p className="text-text-theme-secondary mt-1 text-xs">
                Add equipment from the Equipment tab.
              </p>
            </div>
          ) : (
            <>
              <GlobalLoadoutTrayAllocationSection
                title="Unassigned"
                count={unassigned.length}
                isExpanded={unassignedExpanded}
                onToggle={() => setUnassignedOverride(!unassignedExpanded)}
                titleColor={
                  unassigned.length > 0
                    ? 'text-accent'
                    : 'text-text-theme-secondary'
                }
                isDropZone
                dropLabel="Drop to unassign"
                onDrop={handleDropToUnassigned}
              >
                {unassigned.length === 0 ? (
                  <div
                    className={`${trayStyles.padding.row} text-text-theme-secondary flex min-h-9 items-center py-1 ${trayStyles.text.secondary}`}
                  >
                    Nothing unassigned. Drop an item here to unassign it.
                  </div>
                ) : (
                  renderGroups(groupedUnassigned)
                )}
              </GlobalLoadoutTrayAllocationSection>

              {mounted.length > 0 && (
                <GlobalLoadoutTrayAllocationSection
                  title="Mounted"
                  count={mounted.length}
                  isExpanded={mountedExpanded}
                  onToggle={() => setMountedExpanded((current) => !current)}
                  titleColor="text-text-theme-primary"
                >
                  {renderGroups(groupedMounted)}
                </GlobalLoadoutTrayAllocationSection>
              )}

              {fixedSystems.length > 0 && (
                <GlobalLoadoutTrayAllocationSection
                  title="Fixed systems"
                  count={fixedSystems.length}
                  isExpanded={fixedExpanded}
                  onToggle={() => setFixedExpanded((current) => !current)}
                  titleColor="text-text-theme-secondary"
                >
                  {renderGroups(groupedFixedSystems, 'fixed')}
                </GlobalLoadoutTrayAllocationSection>
              )}
            </>
          )}
        </div>
      </aside>

      {contextMenu && (
        <GlobalLoadoutTrayContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          availableLocations={contextMenuAvailableLocations}
          onQuickAssign={handleQuickAssign}
          onUnassign={() => {
            onUnassignEquipment?.(contextMenu.item.instanceId);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

export default GlobalLoadoutTray;
