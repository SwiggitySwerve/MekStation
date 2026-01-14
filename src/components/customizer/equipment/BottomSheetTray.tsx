/**
 * Bottom Sheet Tray Component
 *
 * Mobile-optimized equipment tray that slides up from the bottom of the screen.
 * Provides collapsed (peek), half-expanded, and full-expanded states with
 * drag-to-expand gesture support.
 *
 * Designed to work alongside GlobalLoadoutTray for adaptive mobile/desktop layouts.
 *
 * @spec openspec/changes/pwa-implementation-tasks.md - Phase 3.3
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { EquipmentCategory } from '@/types/equipment';
import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';
import type { LoadoutEquipmentItem } from './GlobalLoadoutTray';

// =============================================================================
// Types
// =============================================================================

/** Bottom sheet expansion states */
export type SheetState = 'collapsed' | 'half' | 'expanded';

interface BottomSheetTrayProps {
  /** Equipment items to display */
  equipment: LoadoutEquipmentItem[];
  /** Total equipment count */
  equipmentCount: number;
  /** Called when equipment is removed */
  onRemoveEquipment: (instanceId: string) => void;
  /** Called when removing all equipment */
  onRemoveAllEquipment: () => void;
  /** Currently selected equipment ID */
  selectedEquipmentId?: string | null;
  /** Called when equipment is selected */
  onSelectEquipment?: (instanceId: string | null) => void;
  /** Called when equipment is unassigned */
  onUnassignEquipment?: (instanceId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Height of the collapsed peek state */
const PEEK_HEIGHT = 56;

/** Height of the half-expanded state (viewport percentage) */
const HALF_HEIGHT_PERCENT = 40;

/** Height of the full-expanded state (viewport percentage) */
const FULL_HEIGHT_PERCENT = 85;

/** Minimum drag distance to trigger state change */
const _DRAG_THRESHOLD = 50; // TODO: Implement drag gesture handling

/** Velocity threshold for quick swipes (px/ms) */
const VELOCITY_THRESHOLD = 0.5;

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

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  [EquipmentCategory.ENERGY_WEAPON]: 'Energy',
  [EquipmentCategory.BALLISTIC_WEAPON]: 'Ballistic',
  [EquipmentCategory.MISSILE_WEAPON]: 'Missile',
  [EquipmentCategory.ARTILLERY]: 'Artillery',
  [EquipmentCategory.CAPITAL_WEAPON]: 'Capital',
  [EquipmentCategory.AMMUNITION]: 'Ammo',
  [EquipmentCategory.ELECTRONICS]: 'Electronics',
  [EquipmentCategory.PHYSICAL_WEAPON]: 'Physical',
  [EquipmentCategory.MOVEMENT]: 'Movement',
  [EquipmentCategory.STRUCTURAL]: 'Structural',
  [EquipmentCategory.MISC_EQUIPMENT]: 'Misc',
};

// =============================================================================
// Helper Functions
// =============================================================================

function groupByCategory(
  equipment: LoadoutEquipmentItem[]
): Map<EquipmentCategory, LoadoutEquipmentItem[]> {
  const groups = new Map<EquipmentCategory, LoadoutEquipmentItem[]>();
  for (const item of equipment) {
    const existing = groups.get(item.category) || [];
    existing.push(item);
    groups.set(item.category, existing);
  }
  return groups;
}

function getSheetHeight(state: SheetState, viewportHeight: number): number {
  switch (state) {
    case 'collapsed':
      return PEEK_HEIGHT;
    case 'half':
      return (viewportHeight * HALF_HEIGHT_PERCENT) / 100;
    case 'expanded':
      return (viewportHeight * FULL_HEIGHT_PERCENT) / 100;
  }
}

// =============================================================================
// Drag Handle Component
// =============================================================================

interface DragHandleProps {
  onDragStart: (y: number) => void;
  onDragMove: (y: number) => void;
  onDragEnd: (velocity: number) => void;
}

function DragHandle({ onDragStart, onDragMove, onDragEnd }: DragHandleProps) {
  const dragStartY = useRef<number | null>(null);
  const lastY = useRef<number>(0);
  const lastTime = useRef<number>(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const y = e.touches[0].clientY;
      dragStartY.current = y;
      lastY.current = y;
      lastTime.current = Date.now();
      onDragStart(y);
    },
    [onDragStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (dragStartY.current === null) return;
      const y = e.touches[0].clientY;
      lastY.current = y;
      onDragMove(y);
    },
    [onDragMove]
  );

  const handleTouchEnd = useCallback(() => {
    if (dragStartY.current === null) return;

    const timeDelta = Date.now() - lastTime.current;
    const yDelta = lastY.current - dragStartY.current;
    const velocity = timeDelta > 0 ? yDelta / timeDelta : 0;

    dragStartY.current = null;
    onDragEnd(velocity);
  }, [onDragEnd]);

  return (
    <div
      className="flex items-center justify-center h-6 cursor-grab active:cursor-grabbing touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-10 h-1 bg-text-theme-secondary rounded-full" />
    </div>
  );
}

// =============================================================================
// Equipment Item Component
// =============================================================================

interface SheetEquipmentItemProps {
  item: LoadoutEquipmentItem;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function SheetEquipmentItem({ item, isSelected, onSelect, onRemove }: SheetEquipmentItemProps) {
  const colors = getCategoryColorsLegacy(item.category);

  return (
    <div
      className={`
        px-3 py-2 flex items-center gap-2 rounded-lg border border-border-theme-subtle/50
        ${colors.bg}
        ${isSelected ? 'ring-2 ring-accent ring-inset' : ''}
        active:brightness-110 transition-all min-h-[44px]
      `}
      onClick={onSelect}
    >
      <span className="flex-1 text-sm text-white truncate">{item.name}</span>
      <span className="text-xs text-white/60 whitespace-nowrap">
        {item.weight}t | {item.criticalSlots}cr
        {item.isAllocated && item.location && (
          <span className="text-white/80 ml-1">@ {item.location}</span>
        )}
      </span>
      {item.isRemovable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-6 h-6 flex items-center justify-center text-text-theme-secondary hover:text-red-400 transition-colors"
        >
          <span className="text-sm">x</span>
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function BottomSheetTray({
  equipment,
  equipmentCount,
  onRemoveEquipment,
  onRemoveAllEquipment,
  selectedEquipmentId,
  onSelectEquipment,
  onUnassignEquipment,
  className = '',
}: BottomSheetTrayProps): React.ReactElement {
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const dragStartY = useRef<number>(0);
  const baseHeight = useRef<number>(PEEK_HEIGHT);

  // Update viewport height on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Split equipment by allocation
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

  // Group by category
  const unallocatedByCategory = useMemo(() => groupByCategory(unallocated), [unallocated]);

  // Calculate current height
  const currentHeight = getSheetHeight(sheetState, viewportHeight);
  const displayHeight = isDragging ? baseHeight.current - dragOffset : currentHeight;

  // Drag handlers
  const handleDragStart = useCallback(
    (y: number) => {
      dragStartY.current = y;
      baseHeight.current = getSheetHeight(sheetState, viewportHeight);
      setIsDragging(true);
    },
    [sheetState, viewportHeight]
  );

  const handleDragMove = useCallback((y: number) => {
    const delta = y - dragStartY.current;
    setDragOffset(delta);
  }, []);

  const handleDragEnd = useCallback(
    (velocity: number) => {
      setIsDragging(false);

      // Determine new state based on velocity or position
      const isQuickSwipe = Math.abs(velocity) > VELOCITY_THRESHOLD;
      const isSwipeUp = velocity < 0;
      const currentPos = baseHeight.current - dragOffset;

      let newState: SheetState;

      if (isQuickSwipe) {
        // Quick swipe - move in swipe direction
        if (isSwipeUp) {
          newState = sheetState === 'collapsed' ? 'half' : 'expanded';
        } else {
          newState = sheetState === 'expanded' ? 'half' : 'collapsed';
        }
      } else {
        // Slow drag - snap to nearest state based on position
        const halfHeight = getSheetHeight('half', viewportHeight);
        const expandedHeight = getSheetHeight('expanded', viewportHeight);

        if (currentPos < (PEEK_HEIGHT + halfHeight) / 2) {
          newState = 'collapsed';
        } else if (currentPos < (halfHeight + expandedHeight) / 2) {
          newState = 'half';
        } else {
          newState = 'expanded';
        }
      }

      setSheetState(newState);
      setDragOffset(0);
    },
    [sheetState, dragOffset, viewportHeight]
  );

  // Handle equipment selection
  const handleSelect = useCallback(
    (instanceId: string) => {
      onSelectEquipment?.(selectedEquipmentId === instanceId ? null : instanceId);
    },
    [selectedEquipmentId, onSelectEquipment]
  );

  // Handle tap on collapsed state to expand
  const handlePeekTap = useCallback(() => {
    if (sheetState === 'collapsed') {
      setSheetState('half');
    }
  }, [sheetState]);

  // Removable count for "Remove All" button
  const removableCount = equipment.filter((e) => e.isRemovable).length;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-surface-base border-t border-border-theme rounded-t-2xl
        shadow-2xl transition-all duration-300 ease-out
        ${isDragging ? 'transition-none' : ''}
        ${className}
      `}
      style={{
        height: `${Math.max(PEEK_HEIGHT, displayHeight)}px`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Drag Handle */}
      <DragHandle
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />

      {/* Collapsed Peek View */}
      {sheetState === 'collapsed' && (
        <div
          className="px-4 py-1 flex items-center justify-between"
          onClick={handlePeekTap}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Loadout</span>
            <span className="bg-accent text-white text-xs rounded-full px-2 py-0.5">
              {equipmentCount}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-theme-secondary">
            <span>{unallocated.length} unassigned</span>
            <span className="text-border-theme">|</span>
            <span className="text-slate-500">Tap to expand</span>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {sheetState !== 'collapsed' && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-border-theme-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Loadout</h3>
              <span className="bg-surface-raised text-text-theme-secondary text-xs rounded-full px-2 py-0.5">
                {equipmentCount}
              </span>
            </div>
            {removableCount > 0 && (
              <button
                onClick={() => {
                  if (
                    window.confirm(`Remove all ${removableCount} removable equipment items?`)
                  ) {
                    onRemoveAllEquipment();
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors"
              >
                Remove All
              </button>
            )}
          </div>

          {/* Equipment List */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2 space-y-3">
            {equipment.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <div className="text-2xl mb-2">--</div>
                <div className="text-sm">No equipment</div>
                <div className="text-xs mt-1">Add from Equipment tab</div>
              </div>
            ) : (
              <>
                {/* Unallocated Section */}
                {unallocated.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-accent uppercase tracking-wider mb-2">
                      Unallocated ({unallocated.length})
                    </div>
                    <div className="space-y-1">
                      {CATEGORY_ORDER.map((category) => {
                        const items = unallocatedByCategory.get(category);
                        if (!items || items.length === 0) return null;
                        return (
                          <div key={category}>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wide pl-1 mb-1">
                              {CATEGORY_LABELS[category]}
                            </div>
                            {items.map((item) => (
                              <SheetEquipmentItem
                                key={item.instanceId}
                                item={item}
                                isSelected={selectedEquipmentId === item.instanceId}
                                onSelect={() => handleSelect(item.instanceId)}
                                onRemove={() => onRemoveEquipment(item.instanceId)}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Allocated Section */}
                {allocated.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">
                      Allocated ({allocated.length})
                    </div>
                    <div className="space-y-1">
                      {allocated.map((item) => (
                        <SheetEquipmentItem
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

          {/* Selection Info Footer */}
          {selectedEquipmentId && (
            <div className="flex-shrink-0 px-4 py-2 border-t border-border-theme-subtle bg-surface-raised/50">
              <div className="text-xs text-text-theme-secondary">Selected for placement</div>
              <div className="text-sm text-accent font-medium truncate">
                {equipment.find((e) => e.instanceId === selectedEquipmentId)?.name}
              </div>
              {onUnassignEquipment && (
                <button
                  onClick={() => onUnassignEquipment(selectedEquipmentId)}
                  className="mt-1 text-xs text-text-theme-secondary hover:text-accent transition-colors"
                >
                  Unassign
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BottomSheetTray;
