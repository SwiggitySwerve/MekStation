/**
 * Bottom Sheet Tray Component
 *
 * Mobile-optimized equipment tray with horizontal scrolling layout.
 * Compact chips allow efficient use of limited screen space.
 *
 * Features:
 * - Collapsed state: Shows equipment count and unassigned count
 * - Expanded state: Horizontal scrolling equipment chips by category
 * - Click arrow or header to toggle
 * - Category colors for visual grouping
 *
 * Designed to work alongside GlobalLoadoutTray for adaptive mobile/desktop layouts.
 *
 * @spec openspec/changes/pwa-implementation-tasks.md - Phase 3.3
 */

import React, { useCallback, useMemo } from 'react';
import { EquipmentCategory } from '@/types/equipment';
import type { LoadoutEquipmentItem, AvailableLocation } from './GlobalLoadoutTray';
import { MechLocation } from '@/types/construction';
import { usePersistedState, STORAGE_KEYS } from '@/hooks/usePersistedState';
import { VerticalSlotChip } from '../critical-slots/VerticalSlotChip';

// =============================================================================
// Types
// =============================================================================

interface BottomSheetTrayProps {
  equipment: LoadoutEquipmentItem[];
  equipmentCount: number;
  onRemoveEquipment: (instanceId: string) => void;
  onRemoveAllEquipment: () => void;
  selectedEquipmentId?: string | null;
  onSelectEquipment?: (instanceId: string | null) => void;
  onUnassignEquipment?: (instanceId: string) => void;
  onQuickAssign?: (instanceId: string, location: MechLocation) => void;
  availableLocations?: AvailableLocation[];
  isOmni?: boolean;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Height of the collapsed state */
const COLLAPSED_HEIGHT = 44;

/** Height of the expanded state - fits 85px vertical chips + padding */
const EXPANDED_HEIGHT = 110;

// =============================================================================
// Category Configuration
// =============================================================================

const CATEGORY_ORDER: EquipmentCategory[] = [
  EquipmentCategory.ENERGY_WEAPON,
  EquipmentCategory.BALLISTIC_WEAPON,
  EquipmentCategory.MISSILE_WEAPON,
  EquipmentCategory.ARTILLERY,
  EquipmentCategory.AMMUNITION,
  EquipmentCategory.ELECTRONICS,
  EquipmentCategory.PHYSICAL_WEAPON,
  EquipmentCategory.MOVEMENT,
  EquipmentCategory.STRUCTURAL,
  EquipmentCategory.MISC_EQUIPMENT,
];

// Short category labels for compact display
const _CATEGORY_SHORT: Record<EquipmentCategory, string> = {
  [EquipmentCategory.ENERGY_WEAPON]: 'E',
  [EquipmentCategory.BALLISTIC_WEAPON]: 'B',
  [EquipmentCategory.MISSILE_WEAPON]: 'M',
  [EquipmentCategory.ARTILLERY]: 'A',
  [EquipmentCategory.CAPITAL_WEAPON]: 'C',
  [EquipmentCategory.AMMUNITION]: 'Am',
  [EquipmentCategory.ELECTRONICS]: 'El',
  [EquipmentCategory.PHYSICAL_WEAPON]: 'P',
  [EquipmentCategory.MOVEMENT]: 'Mv',
  [EquipmentCategory.STRUCTURAL]: 'St',
  [EquipmentCategory.MISC_EQUIPMENT]: '?',
};

// =============================================================================
// Equipment Chip Component (Compact horizontal item)
// =============================================================================

interface EquipmentChipProps {
  item: LoadoutEquipmentItem;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function EquipmentChip({ item, isSelected, onSelect }: EquipmentChipProps) {
  return (
    <VerticalSlotChip
      name={item.name}
      criticalSlots={item.criticalSlots}
      isSelected={isSelected}
      onClick={onSelect}
    />
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function BottomSheetTray({
  equipment,
  equipmentCount,
  onRemoveEquipment,
  onRemoveAllEquipment: _onRemoveAllEquipment,
  selectedEquipmentId,
  onSelectEquipment,
  onUnassignEquipment: _onUnassignEquipment,
  onQuickAssign: _onQuickAssign,
  availableLocations: _availableLocations,
  isOmni: _isOmni = false,
  className = '',
}: BottomSheetTrayProps): React.ReactElement {
  // Persist expanded state to localStorage
  const [isExpanded, setIsExpanded] = usePersistedState(
    STORAGE_KEYS.LOADOUT_SHEET_EXPANDED,
    false
  );

  // Split equipment by allocation status
  const { unallocated, allocated } = useMemo(() => {
    const unalloc: LoadoutEquipmentItem[] = [];
    const alloc: LoadoutEquipmentItem[] = [];
    for (const item of equipment) {
      if (item.isAllocated) {
        alloc.push(item);
      } else {
        unalloc.push(item);
      }
    }
    return { unallocated: unalloc, allocated: alloc };
  }, [equipment]);

  // Sort equipment by category for display
  const sortedUnallocated = useMemo(() => {
    return [...unallocated].sort((a, b) => {
      const aIdx = CATEGORY_ORDER.indexOf(a.category);
      const bIdx = CATEGORY_ORDER.indexOf(b.category);
      return aIdx - bIdx;
    });
  }, [unallocated]);

  const sortedAllocated = useMemo(() => {
    return [...allocated].sort((a, b) => {
      const aIdx = CATEGORY_ORDER.indexOf(a.category);
      const bIdx = CATEGORY_ORDER.indexOf(b.category);
      return aIdx - bIdx;
    });
  }, [allocated]);

  // Toggle expanded/collapsed
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, [setIsExpanded]);

  // Handle equipment selection
  const handleSelect = useCallback(
    (instanceId: string) => {
      onSelectEquipment?.(selectedEquipmentId === instanceId ? null : instanceId);
    },
    [selectedEquipmentId, onSelectEquipment]
  );

  const displayHeight = isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;

  return (
    <div
      className={`
        fixed bottom-0 left-16 right-0 z-40
        bg-surface-base border-t border-border-theme
        shadow-2xl transition-all duration-200 ease-out
        ${className}
      `}
      style={{
        height: `${displayHeight}px`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header Bar - always visible, clickable to toggle */}
      <button
        onClick={handleToggle}
        className="w-full px-3 py-2 flex items-center justify-between min-h-[40px] active:bg-surface-raised/30 transition-colors"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse loadout tray' : 'Expand loadout tray'}
      >
        <div className="flex items-center gap-2">
          {/* Expand/Collapse Arrow */}
          <span className={`text-text-theme-secondary text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ▲
          </span>
          <span className="text-sm font-medium text-white">Loadout</span>
          <span className="bg-accent text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {equipmentCount}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-xs">
          {unallocated.length > 0 && (
            <span className="text-amber-400 font-medium">{unallocated.length} unassigned</span>
          )}
          {allocated.length > 0 && (
            <span className="text-green-400">{allocated.length} placed</span>
          )}
        </div>
      </button>

      {/* Expanded Content - Horizontal Scrolling */}
      {isExpanded && (
        <div className="flex flex-col gap-1 px-2 pb-2 overflow-hidden" style={{ height: `calc(100% - 40px)` }}>
          {equipment.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              No equipment — Add from Equipment tab
            </div>
          ) : (
            <>
              {/* Unallocated Row */}
              {sortedUnallocated.length > 0 && (
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] font-medium text-amber-400 uppercase">Unassigned</span>
                    <span className="text-[10px] text-slate-500">({sortedUnallocated.length})</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border-theme">
                    {sortedUnallocated.map((item) => (
                      <EquipmentChip
                        key={item.instanceId}
                        item={item}
                        isSelected={selectedEquipmentId === item.instanceId}
                        onSelect={() => handleSelect(item.instanceId)}
                        onRemove={() => onRemoveEquipment(item.instanceId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Allocated Row */}
              {sortedAllocated.length > 0 && (
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] font-medium text-green-400 uppercase">Placed</span>
                    <span className="text-[10px] text-slate-500">({sortedAllocated.length})</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border-theme">
                    {sortedAllocated.map((item) => (
                      <EquipmentChip
                        key={item.instanceId}
                        item={item}
                        isSelected={selectedEquipmentId === item.instanceId}
                        onSelect={() => handleSelect(item.instanceId)}
                        onRemove={() => onRemoveEquipment(item.instanceId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default BottomSheetTray;
