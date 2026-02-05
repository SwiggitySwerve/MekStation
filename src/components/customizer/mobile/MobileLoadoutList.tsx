/**
 * Mobile Loadout List Component
 *
 * Full-screen scrollable equipment list for mobile devices.
 * Features category filter tabs, separate unassigned/allocated sections,
 * and only shows removable equipment items.
 *
 * @spec c:\Users\wroll\.cursor\plans\mobile_loadout_full-screen_redesign_00a59d27.plan.md
 */

import React, { useState, useMemo, useCallback } from 'react';

import { useEquipmentFiltering } from '@/hooks/useEquipmentFiltering';
import { EquipmentCategory } from '@/types/equipment';

import { CategoryFilterBar } from '../equipment/CategoryFilterBar';
import { MobileEquipmentRow, MobileEquipmentItem } from './MobileEquipmentRow';
import { MobileLoadoutStats } from './MobileLoadoutHeader';

// =============================================================================
// Types
// =============================================================================

/** Available location for quick assignment */
interface AvailableLocationForList {
  location: string;
  label: string;
  availableSlots: number;
  canFit: boolean;
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

interface SectionHeaderProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  titleColor?: string;
}

function SectionHeader({
  title,
  count,
  isExpanded,
  onToggle,
  titleColor = 'text-white',
}: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="bg-surface-raised/50 border-border-theme-subtle/50 active:bg-surface-raised flex w-full items-center justify-between border-y px-2 py-1 transition-colors"
    >
      <span className={`text-xs font-semibold ${titleColor}`}>{title}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-text-theme-secondary text-[10px]">({count})</span>
        <span
          className={`text-[10px] text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          ▲
        </span>
      </div>
    </button>
  );
}

// =============================================================================
// Stats Summary Component
// =============================================================================

interface StatsSummaryProps {
  stats: MobileLoadoutStats;
}

function StatsSummary({ stats }: StatsSummaryProps) {
  const weightOverage = stats.weightUsed > stats.weightMax;
  const slotsOverage = stats.slotsUsed > stats.slotsMax;
  const heatNegative = stats.heatGenerated > stats.heatDissipation;

  return (
    <div className="bg-surface-deep border-border-theme flex items-center justify-around border-b px-3 py-2 text-center">
      <div>
        <div className="text-text-theme-secondary text-[10px] uppercase">
          Weight
        </div>
        <div
          className={`text-sm font-bold ${weightOverage ? 'text-red-400' : 'text-white'}`}
        >
          {stats.weightUsed.toFixed(1)}
          <span className="font-normal text-slate-500">
            /{stats.weightMax}t
          </span>
        </div>
      </div>
      <div className="bg-border-theme-subtle h-8 w-px" />
      <div>
        <div className="text-text-theme-secondary text-[10px] uppercase">
          Slots
        </div>
        <div
          className={`text-sm font-bold ${slotsOverage ? 'text-red-400' : 'text-white'}`}
        >
          {stats.slotsUsed}
          <span className="font-normal text-slate-500">/{stats.slotsMax}</span>
        </div>
      </div>
      <div className="bg-border-theme-subtle h-8 w-px" />
      <div>
        <div className="text-text-theme-secondary text-[10px] uppercase">
          Heat
        </div>
        <div
          className={`text-sm font-bold ${heatNegative ? 'text-red-400' : heatNegative ? 'text-amber-400' : 'text-green-400'}`}
        >
          {stats.heatGenerated}
          <span className="font-normal text-slate-500">
            /{stats.heatDissipation}
          </span>
        </div>
      </div>
      <div className="bg-border-theme-subtle h-8 w-px" />
      <div>
        <div className="text-text-theme-secondary text-[10px] uppercase">
          BV
        </div>
        <div className="text-sm font-bold text-cyan-400">
          {stats.battleValue.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Section Column Headers Component
// =============================================================================

function SectionColumnHeaders(): React.ReactElement {
  return (
    <div className="bg-surface-raised/30 border-border-theme-subtle/50 text-text-theme-secondary/50 flex items-center border-b px-2 py-1 font-mono text-[8px] tracking-wide uppercase">
      <div className="mr-1.5 w-1 flex-shrink-0" />
      <div className="min-w-0 flex-1 text-left font-sans">Name</div>
      <div className="border-border-theme-subtle/30 w-[28px] flex-shrink-0 border-l text-center">
        Loc
      </div>
      <div className="border-border-theme-subtle/30 w-[44px] flex-shrink-0 border-l text-center">
        S/M/L
      </div>
      <div className="border-border-theme-subtle/30 w-[20px] flex-shrink-0 border-l text-center">
        H
      </div>
      <div className="border-border-theme-subtle/30 w-[20px] flex-shrink-0 border-l text-center">
        C
      </div>
      <div className="border-border-theme-subtle/30 w-[28px] flex-shrink-0 border-l text-center">
        Wt
      </div>
      <div className="border-border-theme-subtle/30 w-[36px] flex-shrink-0 border-l text-center">
        🔗
      </div>
      <div className="border-border-theme-subtle/30 w-[36px] flex-shrink-0 border-l text-center">
        ✕
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
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
  const removableCount = removableEquipment.length;
  const handleRemoveAll = useCallback(() => {
    if (removableCount === 0) return;
    if (window.confirm(`Remove all ${removableCount} equipment items?`)) {
      onRemoveAllEquipment();
    }
  }, [removableCount, onRemoveAllEquipment]);

  return (
    <div
      className={`bg-surface-deep fixed inset-0 z-50 flex flex-col ${className} `}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Header */}
      <div className="bg-surface-base border-border-theme flex flex-shrink-0 items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="text-text-theme-secondary -ml-1.5 p-1.5 transition-all hover:text-white active:scale-95"
            aria-label="Close loadout"
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <h2 className="text-base font-bold text-white">Equipment Loadout</h2>
          <span className="bg-accent rounded-full px-2 py-0.5 text-xs text-white">
            {removableEquipment.length}
          </span>
        </div>

        {removableCount > 0 && (
          <button
            onClick={handleRemoveAll}
            className="rounded bg-red-900/40 px-3 py-1.5 text-xs text-red-300 transition-all hover:bg-red-900/60 active:scale-95"
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
            <div className="mb-3 text-4xl">⚙️</div>
            <div className="mb-1 text-lg font-medium text-white">
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
                        onRemove={() => onRemoveEquipment(item.instanceId)}
                        onQuickAssign={
                          onQuickAssign
                            ? (location) => {
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
                        onRemove={() => onRemoveEquipment(item.instanceId)}
                        onUnassign={
                          onUnassignEquipment
                            ? () => onUnassignEquipment(item.instanceId)
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
          className="bg-surface-raised hover:bg-surface-raised/80 w-full rounded-lg py-3 font-medium text-white transition-all active:scale-[0.98]"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default MobileLoadoutList;
