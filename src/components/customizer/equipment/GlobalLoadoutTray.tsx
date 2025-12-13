/**
 * Global Loadout Tray Component
 * 
 * Persistent sidebar showing unit's equipment in Allocated/Unallocated sections.
 * Supports equipment selection for critical slot assignment workflow.
 * Includes context menu for quick assignment to valid locations.
 * 
 * @spec openspec/changes/unify-equipment-tab/specs/equipment-tray/spec.md
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { EquipmentCategory } from '@/types/equipment';
import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';
import { MechLocation } from '@/types/construction';

// =============================================================================
// Types
// =============================================================================

export interface LoadoutEquipmentItem {
  instanceId: string;
  name: string;
  category: EquipmentCategory;
  weight: number;
  criticalSlots: number;
  isAllocated: boolean;
  location?: string;
  isRemovable: boolean;
}

/** Location with available slot info for context menu */
export interface AvailableLocation {
  location: MechLocation;
  label: string;
  availableSlots: number;
  canFit: boolean;
}

interface GlobalLoadoutTrayProps {
  equipment: LoadoutEquipmentItem[];
  equipmentCount: number;
  onRemoveEquipment: (instanceId: string) => void;
  onRemoveAllEquipment: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  /** Currently selected equipment for slot assignment */
  selectedEquipmentId?: string | null;
  /** Called when equipment is selected for slot assignment */
  onSelectEquipment?: (instanceId: string | null) => void;
  /** Called to unassign equipment from its slot (back to unallocated) */
  onUnassignEquipment?: (instanceId: string) => void;
  /** Called for quick assignment to a specific location */
  onQuickAssign?: (instanceId: string, location: MechLocation) => void;
  /** Available locations with slot info for the currently selected equipment */
  availableLocations?: AvailableLocation[];
  className?: string;
}

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

function groupByCategory(equipment: LoadoutEquipmentItem[]): Map<EquipmentCategory, LoadoutEquipmentItem[]> {
  const groups = new Map<EquipmentCategory, LoadoutEquipmentItem[]>();
  for (const item of equipment) {
    const existing = groups.get(item.category) || [];
    existing.push(item);
    groups.set(item.category, existing);
  }
  return groups;
}

// =============================================================================
// Common Styles
// =============================================================================

/** 
 * Shared styles for consistent row heights, text sizes, padding, and gaps.
 * All row types use h-7 (28px) height with px-2 padding (except main header which uses px-3).
 */
const trayStyles = {
  // Padding - single source of truth
  padding: {
    /** All content rows (equipment, category, section headers) */
    row: 'px-2',
    /** Main tray header only */
    header: 'px-3',
  },
  
  // Text sizes - single source of truth
  text: {
    /** Primary text (equipment names, section titles) */
    primary: 'text-xs',
    /** Secondary text (weight, crits, counts) */
    secondary: 'text-[10px]',
    /** Tertiary text (icons, small labels) */
    tertiary: 'text-[9px]',
  },
  
  // Standard gap for row content
  gap: 'gap-1.5',
  
  // Composed row styles - all use h-7 height
  /** Standard row height for all items */
  row: 'h-7 flex items-center',
  /** Equipment item row */
  equipmentRow: 'px-2 h-7 flex items-center gap-1.5 transition-all group rounded-md border border-slate-700/30 my-0.5',
  /** Category header row */
  categoryRow: 'px-2 h-7 bg-slate-800/50 flex items-center gap-1.5',
  /** Section header row */
  sectionRow: 'w-full h-7 flex items-center justify-between px-2 gap-1.5 hover:bg-slate-700/50 transition-colors bg-slate-700/30',
  
  /** Category dot indicator */
  categoryDot: 'w-2 h-2 rounded-sm',
  /** Action button base */
  actionButton: 'opacity-0 group-hover:opacity-100 transition-opacity px-0.5',
} as const;

/** Convert location names to shorthand (e.g., "Right Torso" -> "RT") */
function getLocationShorthand(location: string): string {
  const shortcuts: Record<string, string> = {
    'Head': 'HD',
    'Center Torso': 'CT',
    'Left Torso': 'LT',
    'Right Torso': 'RT',
    'Left Arm': 'LA',
    'Right Arm': 'RA',
    'Left Leg': 'LL',
    'Right Leg': 'RL',
  };
  return shortcuts[location] || location;
}

// =============================================================================
// Context Menu Component
// =============================================================================

interface ContextMenuProps {
  x: number;
  y: number;
  item: LoadoutEquipmentItem;
  availableLocations: AvailableLocation[];
  onQuickAssign: (location: MechLocation) => void;
  onUnassign: () => void;
  onClose: () => void;
}

function ContextMenu({ x, y, item, availableLocations, onQuickAssign, onUnassign, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);
  
  // Adjust position to keep menu on screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 300);
  
  const validLocations = availableLocations.filter(loc => loc.canFit);
  
  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* Header */}
      <div className={`${trayStyles.padding.header} py-1.5 border-b border-slate-700 ${trayStyles.text.primary} text-slate-400`}>
        {item.name} ({item.criticalSlots} slot {item.criticalSlots !== 1 ? 's' : ''})
      </div>
      
      {/* Unassign option for all allocated items */}
      {item.isAllocated && (
        <>
          <button
            onClick={() => { onUnassign(); onClose(); }}
            className={`w-full text-left ${trayStyles.padding.header} py-1.5 ${trayStyles.text.primary} text-amber-400 hover:bg-slate-700 transition-colors`}
          >
            Unassign from {item.location}
          </button>
          <div className="border-t border-slate-700 my-1" />
        </>
      )}
      
      {/* Quick assign options */}
      {!item.isAllocated && validLocations.length > 0 && (
        <>
          <div className={`${trayStyles.padding.header} py-1 ${trayStyles.text.secondary} text-slate-500 uppercase tracking-wider`}>
            Quick Assign
          </div>
          {validLocations.map(loc => (
            <button
              key={loc.location}
              onClick={() => { onQuickAssign(loc.location); onClose(); }}
              className={`w-full text-left ${trayStyles.padding.header} py-1.5 ${trayStyles.text.primary} text-slate-200 hover:bg-slate-700 transition-colors flex justify-between`}
            >
              <span>Add to {loc.label}</span>
              <span className={`text-slate-500 ${trayStyles.text.secondary}`}>{loc.availableSlots} free</span>
            </button>
          ))}
        </>
      )}
      
      {/* No valid locations message */}
      {!item.isAllocated && validLocations.length === 0 && (
        <div className={`${trayStyles.padding.header} py-2 ${trayStyles.text.primary} text-slate-500 italic`}>
          No locations with {item.criticalSlots} contiguous slots
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Equipment Item Component
// =============================================================================

interface EquipmentItemProps {
  item: LoadoutEquipmentItem;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onUnassign?: () => void;
}

function EquipmentItem({ item, isSelected, onSelect, onRemove, onContextMenu, onUnassign: _onUnassign }: EquipmentItemProps) {
  const colors = getCategoryColorsLegacy(item.category);
  const [isDragging, setIsDragging] = useState(false);
  
  // Unallocated items can be dragged to critical slots
  const canDrag = !item.isAllocated;
  
  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/equipment-id', item.instanceId);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    // Select the item when drag starts so assignable slots are highlighted
    onSelect();
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Unified inline single-line layout for both allocated and unallocated items
  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        ${trayStyles.equipmentRow}
        ${colors.bg}
        ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${isDragging ? 'opacity-50' : ''}
        ${isSelected
          ? 'ring-1 ring-amber-400 ring-inset brightness-110'
          : 'hover:brightness-110'
        }
      `}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      title={canDrag ? 'Drag to critical slot or click to select' : 'Right-click to unassign'}
    >
      <div className={`flex items-center ${trayStyles.gap} w-full`}>
        {/* Name */}
        <span className={`truncate flex-1 text-white ${trayStyles.text.primary} drop-shadow-sm`}>
          {item.name}
        </span>
        {/* Info + action inline */}
        <span className={`text-white/50 ${trayStyles.text.secondary} whitespace-nowrap`}>
          {item.weight}t | {item.criticalSlots} slot{item.criticalSlots !== 1 ? 's' : ''}
          {item.isAllocated && item.location && (
            <span className="text-white/80"> | {getLocationShorthand(item.location)}</span>
          )}
          {/* Remove/Lock icon */}
          <span
            onClick={item.isRemovable ? (e) => { e.stopPropagation(); onRemove(); } : undefined}
            className={`inline-block w-3 ml-0.5 text-center align-middle font-bold ${
              item.isRemovable 
                ? `${trayStyles.text.secondary} text-black hover:text-red-400 cursor-pointer transition-colors` 
                : `${trayStyles.text.tertiary} text-white/30`
            }`}
            title={item.isRemovable ? "Remove from unit" : "Managed by configuration"}
          >
            {item.isRemovable ? '✕' : '🔒'}
          </span>
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Allocation Section Component
// =============================================================================

interface AllocationSectionProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  titleColor?: string;
  /** Is this section a drop zone */
  isDropZone?: boolean;
  /** Called when equipment is dropped on this section */
  onDrop?: (equipmentId: string) => void;
}

function AllocationSection({ 
  title, 
  count, 
  isExpanded, 
  onToggle, 
  children, 
  titleColor = 'text-slate-300',
  isDropZone = false,
  onDrop,
}: AllocationSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    if (!isDropZone) return;
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger if leaving the section, not child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    if (!isDropZone) return;
    e.preventDefault();
    setIsDragOver(false);
    const equipmentId = e.dataTransfer.getData('text/equipment-id');
    if (equipmentId && onDrop) {
      onDrop(equipmentId);
    }
  };
  
  return (
    <div 
      className={`border-b border-slate-600 transition-all ${isDragOver ? 'ring-2 ring-amber-400 ring-inset bg-amber-900/20' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        onClick={onToggle}
        className={trayStyles.sectionRow}
      >
        <span className={`${trayStyles.text.primary} font-medium ${titleColor}`}>{title}</span>
        <span className={`flex items-center ${trayStyles.gap}`}>
          <span className={`${trayStyles.text.secondary} text-slate-400`}>({count})</span>
          <span className={`${trayStyles.text.tertiary} text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </span>
      </button>
      {isExpanded && <div>{children}</div>}
    </div>
  );
}

// =============================================================================
// Category Group Component
// =============================================================================

interface CategoryGroupProps {
  category: EquipmentCategory;
  items: LoadoutEquipmentItem[];
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onUnassign?: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, item: LoadoutEquipmentItem) => void;
}

function CategoryGroup({ category, items, selectedId, onSelect, onRemove, onUnassign, onContextMenu }: CategoryGroupProps) {
  const colors = getCategoryColorsLegacy(category);
  const label = CATEGORY_LABELS[category] || category;
  
  return (
    <div>
      <div className={trayStyles.categoryRow}>
        <span className={`${trayStyles.categoryDot} ${colors.bg}`} />
        <span className={`${trayStyles.text.secondary} font-medium text-slate-400 uppercase tracking-wide`}>{label}</span>
        <span className={`${trayStyles.text.secondary} text-slate-500`}>({items.length})</span>
      </div>
      {items.map(item => (
        <EquipmentItem
          key={item.instanceId}
          item={item}
          isSelected={selectedId === item.instanceId}
          onSelect={() => onSelect(selectedId === item.instanceId ? null : item.instanceId)}
          onRemove={() => onRemove(item.instanceId)}
          onUnassign={onUnassign ? () => onUnassign(item.instanceId) : undefined}
          onContextMenu={(e) => onContextMenu(e, item)}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

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
  className = '',
}: GlobalLoadoutTrayProps): React.ReactElement {
  // Section expansion state
  const [unallocatedExpanded, setUnallocatedExpanded] = useState(true);
  const [allocatedExpanded, setAllocatedExpanded] = useState(true);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: LoadoutEquipmentItem;
  } | null>(null);
  
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
  const allocatedByCategory = useMemo(() => groupByCategory(allocated), [allocated]);
  
  // Handle selection
  const handleSelect = useCallback((id: string | null) => {
    onSelectEquipment?.(id);
  }, [onSelectEquipment]);
  
  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, item: LoadoutEquipmentItem) => {
    e.preventDefault();
    // Select the item when right-clicking
    onSelectEquipment?.(item.instanceId);
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }, [onSelectEquipment]);
  
  // Handle quick assign from context menu
  const handleQuickAssign = useCallback((location: MechLocation) => {
    if (contextMenu) {
      onQuickAssign?.(contextMenu.item.instanceId, location);
      onSelectEquipment?.(null);
    }
  }, [contextMenu, onQuickAssign, onSelectEquipment]);
  
  // Handle unassign
  const handleUnassign = useCallback((instanceId: string) => {
    onUnassignEquipment?.(instanceId);
  }, [onUnassignEquipment]);
  
  // Handle drop to unallocate (drag from slot to tray)
  const handleDropToUnallocated = useCallback((equipmentId: string) => {
    // Find the item being dropped
    const item = equipment.find(e => e.instanceId === equipmentId);
    if (item?.isAllocated) {
      onUnassignEquipment?.(equipmentId);
    }
  }, [equipment, onUnassignEquipment]);
  
  // Handle remove all (only removable items)
  const removableCount = equipment.filter(e => e.isRemovable).length;
  const handleRemoveAll = useCallback(() => {
    if (removableCount === 0) return;
    if (window.confirm(`Remove all ${removableCount} removable equipment items?`)) {
      onRemoveAllEquipment();
      onSelectEquipment?.(null);
    }
  }, [removableCount, onRemoveAllEquipment, onSelectEquipment]);
  
  // Collapsed state
  if (!isExpanded) {
    return (
      <div className={`bg-slate-800 border-l border-slate-700 flex flex-col items-center py-2 ${className}`}
           style={{ width: '40px' }}>
        <button
          onClick={onToggleExpand}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors p-2"
          title="Expand loadout"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {equipmentCount > 0 && (
            <span className="bg-amber-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {equipmentCount}
            </span>
          )}
          <span className="text-xs [writing-mode:vertical-rl] rotate-180 mt-2">Loadout</span>
        </button>
      </div>
    );
  }
  
  // Expanded state
  return (
    <>
      <div className={`bg-slate-800 border-l border-slate-700 flex flex-col ${className}`}
           style={{ width: '260px' }}>
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-600">
          <div className={`flex items-center justify-between ${trayStyles.padding.header} py-2`}>
            <div className={`flex items-center ${trayStyles.gap}`}>
              <h3 className={`font-semibold text-white ${trayStyles.text.primary}`}>Loadout</h3>
              <span className={`bg-slate-700 text-slate-300 ${trayStyles.text.secondary} rounded-full px-1.5 py-0.5`}>
                {equipmentCount}
              </span>
            </div>
            <button
              onClick={onToggleExpand}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="Collapse"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {/* Quick actions */}
          {removableCount > 0 && (
            <div className={`${trayStyles.padding.header} pb-2`}>
              <button
                onClick={handleRemoveAll}
                className={`w-full px-2 py-1 ${trayStyles.text.primary} bg-red-900/40 hover:bg-red-900/60 rounded text-red-300 transition-colors`}
              >
                Remove All ({removableCount})
              </button>
            </div>
          )}
        </div>
        
        {/* Equipment List */}
        <div className="flex-1 overflow-y-auto">
          {equipment.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <div className="text-2xl mb-2">⚙️</div>
              <div className={trayStyles.text.primary}>No equipment</div>
              <div className={`${trayStyles.text.secondary} mt-1`}>Add from Equipment tab</div>
            </div>
          ) : (
            <>
              {/* Unallocated Section - also serves as drop zone for unallocation */}
              <AllocationSection
                title="Unallocated"
                count={unallocated.length}
                isExpanded={unallocatedExpanded}
                onToggle={() => setUnallocatedExpanded(!unallocatedExpanded)}
                titleColor="text-amber-400"
                isDropZone={true}
                onDrop={handleDropToUnallocated}
              >
                {unallocated.length === 0 ? (
                  <div className={`${trayStyles.padding.row} py-1 text-center text-slate-500 ${trayStyles.text.tertiary}`}>
                    Drag here to unassign
                  </div>
                ) : (
                  CATEGORY_ORDER.map(category => {
                    const items = unallocatedByCategory.get(category);
                    if (!items || items.length === 0) return null;
                    return (
                      <CategoryGroup
                        key={category}
                        category={category}
                        items={items}
                        selectedId={selectedEquipmentId}
                        onSelect={handleSelect}
                        onRemove={onRemoveEquipment}
                        onContextMenu={handleContextMenu}
                      />
                    );
                  })
                )}
              </AllocationSection>
              
              {/* Allocated Section */}
              {allocated.length > 0 && (
                <AllocationSection
                  title="Allocated"
                  count={allocated.length}
                  isExpanded={allocatedExpanded}
                  onToggle={() => setAllocatedExpanded(!allocatedExpanded)}
                  titleColor="text-green-400"
                >
                  {CATEGORY_ORDER.map(category => {
                    const items = allocatedByCategory.get(category);
                    if (!items || items.length === 0) return null;
                    return (
                      <CategoryGroup
                        key={category}
                        category={category}
                        items={items}
                        selectedId={selectedEquipmentId}
                        onSelect={handleSelect}
                        onRemove={onRemoveEquipment}
                        onUnassign={handleUnassign}
                        onContextMenu={handleContextMenu}
                      />
                    );
                  })}
                </AllocationSection>
              )}
            </>
          )}
        </div>
        
        {/* Selection info footer */}
        {selectedEquipmentId && (
          <div className={`flex-shrink-0 ${trayStyles.padding.header} py-2 border-t border-slate-600 bg-slate-700/50`}>
            <div className={`${trayStyles.text.secondary} text-slate-400`}>
              Selected for placement
            </div>
            <div className={`${trayStyles.text.primary} text-amber-400 font-medium truncate`}>
              {equipment.find(e => e.instanceId === selectedEquipmentId)?.name}
            </div>
          </div>
        )}
      </div>
      
      {/* Context Menu Portal */}
      {contextMenu && (
        <ContextMenu
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
