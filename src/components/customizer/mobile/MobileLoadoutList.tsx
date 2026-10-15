/**
 * Mobile Loadout List Component
 *
 * Full-screen scrollable equipment list for mobile devices.
 * Features category filter tabs, separate unassigned/allocated sections,
 * and only shows removable equipment items.
 *
 * @spec c:\Users\wroll\.cursor\plans\mobile_loadout_full-screen_redesign_00a59d27.plan.md
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useId,
  useRef,
  useLayoutEffect,
} from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { useEquipmentFiltering } from '@/hooks/useEquipmentFiltering';
import { EquipmentCategory } from '@/types/equipment';
import {
  captureEquipmentMutationPolicy,
  isFixedOmniEquipment,
  matchesEquipmentMutationPolicy,
} from '@/utils/construction/equipmentMutationPolicy';

import { useCustomizerConfirmation } from '../dialogs/CustomizerConfirmationProvider';
import { ModalOverlay } from '../dialogs/ModalOverlay';
import { CategoryFilterBar } from '../equipment/CategoryFilterBar';
import { MobileEquipmentRow, MobileEquipmentItem } from './MobileEquipmentRow';
import { MobileLoadoutStats } from './MobileLoadoutHeader';
import {
  SectionHeader,
  StatsSummary,
  SectionColumnHeaders,
} from './MobileLoadoutList.parts';

// =============================================================================
// Types
// =============================================================================

/** Available location for quick assignment */
interface AvailableLocationForList {
  location: string;
  label: string;
  availableSlots: number;
  canFit: boolean;
  reason?: string;
}

interface MobileLoadoutListProps {
  equipment: MobileEquipmentItem[];
  stats: MobileLoadoutStats;
  isOmni?: boolean;
  selectedEquipmentId?: string | null;
  onSelectEquipment?: (instanceId: string | null) => void;
  onRemoveEquipment: (instanceId: string) => void;
  onRemoveAllEquipment: () => void;
  onUnassignEquipment?: (instanceId: string) => void;
  /** Quick assign equipment to a location */
  onQuickAssign?: (instanceId: string, location: string) => void;
  /** Get available locations for a specific equipment item */
  getAvailableLocations?: (instanceId: string) => AvailableLocationForList[];
  onClose: () => void;
  className?: string;
}

// =============================================================================
// Section Header Component
// =============================================================================

export function MobileLoadoutList({
  equipment,
  stats,
  isOmni = false,
  selectedEquipmentId,
  onSelectEquipment,
  onRemoveEquipment,
  onRemoveAllEquipment,
  onUnassignEquipment,
  onQuickAssign,
  getAvailableLocations,
  onClose,
  className = '',
}: MobileLoadoutListProps): React.ReactElement {
  const headingId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<{ instanceId: string | null } | null>(null);
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const target = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-equipment-select]',
      ) ?? [],
    ).find(
      (button) =>
        button.dataset.equipmentSelect === pendingFocus.current?.instanceId,
    );
    (target ?? closeRef.current)?.focus();
    pendingFocus.current = null;
  }, [equipment]);
  const [activeCategory, setActiveCategory] = useState<
    EquipmentCategory | 'ALL'
  >('ALL');
  const [unassignedExpanded, setUnassignedExpanded] = useState(true);
  const [allocatedExpanded, setAllocatedExpanded] = useState(true);
  // Track which item has its location menu open (only one at a time)
  const [openLocationMenuId, setOpenLocationMenuId] = useState<string | null>(
    null,
  );

  // Filter out non-removable equipment (structural components)
  const removableEquipment = useMemo(() => {
    return equipment.filter((item) => item.isRemovable);
  }, [equipment]);

  // Apply category filter and split by allocation status
  const {
    filteredEquipment,
    unallocated: unassigned,
    allocated,
  } = useEquipmentFiltering(removableEquipment, activeCategory);

  const handleRemove = (instanceId: string) => {
    const index = filteredEquipment.findIndex(
      (item) => item.instanceId === instanceId,
    );
    const next = filteredEquipment[index + 1] ?? filteredEquipment[index - 1];
    pendingFocus.current = { instanceId: next?.instanceId ?? null };
    onRemoveEquipment(instanceId);
  };

  // Handle equipment selection
  const handleSelect = useCallback(
    (instanceId: string) => {
      onSelectEquipment?.(
        selectedEquipmentId === instanceId ? null : instanceId,
      );
    },
    [selectedEquipmentId, onSelectEquipment],
  );

  // Handle remove all
  const removableCount = removableEquipment.filter(
    (item) =>
      !isFixedOmniEquipment(isOmni, {
        isOmniPodMounted: item.isOmniPodMounted ?? true,
      }),
  ).length;
  const { requestConfirmation } = useCustomizerConfirmation();
  const committed = useRef<{
    readonly equipment: readonly MobileEquipmentItem[];
    readonly isOmni: boolean;
    readonly removableCount: number;
    readonly onRemoveAllEquipment: () => void;
  } | null>(null);
  useLayoutEffect(() => {
    committed.current = {
      equipment,
      isOmni,
      removableCount,
      onRemoveAllEquipment,
    };
  });
  const handleRemoveAll = useCallback(() => {
    const requested = committed.current;
    if (!requested || requested.removableCount === 0) return;
    const policies = captureEquipmentMutationPolicy(requested.equipment);
    requestConfirmation({
      title: 'Clear equipment loadout?',
      message: `Remove all ${requested.removableCount} equipment items?`,
      confirmLabel: 'Clear equipment',
      isCurrent: () => {
        const current = committed.current;
        return (
          !!current &&
          current.isOmni === requested.isOmni &&
          matchesEquipmentMutationPolicy(policies, current.equipment)
        );
      },
      onConfirm: () => {
        const current = committed.current;
        if (!current) return;
        pendingFocus.current = { instanceId: null };
        current.onRemoveAllEquipment();
      },
    });
  }, [requestConfirmation]);

  return (
    <ModalOverlay
      isOpen
      fullScreen
      onClose={onClose}
      ariaLabelledBy={headingId}
    >
      <div
        ref={listRef}
        className={`bg-surface-deep flex h-full flex-col ${className}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className="bg-surface-base border-border-theme flex flex-shrink-0 items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              ref={closeRef}
              onClick={onClose}
              className="text-text-theme-secondary hover:text-text-theme-primary flex min-h-11 min-w-11 items-center justify-center transition-all active:scale-95"
              aria-label="Close loadout"
            >
              <AppIcon name="close" size="control" aria-hidden="true" />
            </button>
            <h2
              id={headingId}
              className="text-text-theme-primary text-base font-bold"
            >
              Equipment Loadout
            </h2>
            <span className="bg-accent text-on-accent rounded-full px-2 py-0.5 text-xs">
              {removableEquipment.length}
            </span>
          </div>

          {removableCount > 0 && (
            <button
              onClick={handleRemoveAll}
              className="min-h-11 rounded bg-red-900/40 px-3 py-1.5 text-xs text-red-300 transition-all hover:bg-red-900/60 active:scale-95"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Stats Summary */}
        <StatsSummary stats={stats} />

        {/* Category Filters */}
        <CategoryFilterBar
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          showLabels
        />

        {/* Equipment List */}
        <div className="flex-1 overflow-y-auto">
          {filteredEquipment.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <AppIcon
                name="settings"
                size="hero"
                className="text-text-theme-muted mb-3"
                aria-hidden="true"
              />
              <div className="text-text-theme-primary mb-1 text-lg font-medium">
                No Equipment
              </div>
              <div className="text-text-theme-secondary text-sm">
                {activeCategory === 'ALL'
                  ? 'Add equipment from the Equipment tab'
                  : 'No items in this category'}
              </div>
            </div>
          ) : (
            <>
              {/* Unassigned Section */}
              {unassigned.length > 0 && (
                <>
                  <SectionHeader
                    title="Unassigned"
                    count={unassigned.length}
                    isExpanded={unassignedExpanded}
                    onToggle={() => setUnassignedExpanded(!unassignedExpanded)}
                    titleColor="text-amber-400"
                  />
                  {unassignedExpanded && (
                    <div className="bg-amber-900/10">
                      <SectionColumnHeaders />
                      {unassigned.map((item) => (
                        <MobileEquipmentRow
                          key={item.instanceId}
                          item={item}
                          isOmni={isOmni}
                          isSelected={selectedEquipmentId === item.instanceId}
                          onSelect={() => handleSelect(item.instanceId)}
                          onRemove={() => handleRemove(item.instanceId)}
                          onQuickAssign={
                            onQuickAssign
                              ? (location) => {
                                  pendingFocus.current = {
                                    instanceId: item.instanceId,
                                  };
                                  onQuickAssign(item.instanceId, location);
                                  setOpenLocationMenuId(null);
                                }
                              : undefined
                          }
                          availableLocations={
                            getAvailableLocations?.(item.instanceId) ?? []
                          }
                          isLocationMenuOpen={
                            openLocationMenuId === item.instanceId
                          }
                          onToggleLocationMenu={() =>
                            setOpenLocationMenuId(
                              openLocationMenuId === item.instanceId
                                ? null
                                : item.instanceId,
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Allocated Section */}
              {allocated.length > 0 && (
                <>
                  <SectionHeader
                    title="Allocated"
                    count={allocated.length}
                    isExpanded={allocatedExpanded}
                    onToggle={() => setAllocatedExpanded(!allocatedExpanded)}
                    titleColor="text-green-400"
                  />
                  {allocatedExpanded && (
                    <div className="bg-green-900/10">
                      <SectionColumnHeaders />
                      {allocated.map((item) => (
                        <MobileEquipmentRow
                          key={item.instanceId}
                          item={item}
                          isOmni={isOmni}
                          isSelected={selectedEquipmentId === item.instanceId}
                          onSelect={() => handleSelect(item.instanceId)}
                          onRemove={() => handleRemove(item.instanceId)}
                          onUnassign={
                            onUnassignEquipment
                              ? () => {
                                  pendingFocus.current = {
                                    instanceId: item.instanceId,
                                  };
                                  onUnassignEquipment(item.instanceId);
                                }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer with close button */}
        <div className="bg-surface-base border-border-theme flex-shrink-0 border-t px-3 py-3">
          <button
            onClick={onClose}
            className="bg-surface-raised hover:bg-surface-raised/80 text-text-theme-primary min-h-11 w-full rounded-lg py-3 font-medium transition-all active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default MobileLoadoutList;
