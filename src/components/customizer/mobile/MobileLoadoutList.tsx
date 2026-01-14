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
import { EquipmentCategory } from '@/types/equipment';
import { MechLocation } from '@/types/construction';
import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';
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
// Constants
// =============================================================================

interface CategoryConfig {
  category: EquipmentCategory | 'ALL';
  label: string;
  icon: string;
}

const CATEGORY_FILTERS: CategoryConfig[] = [
  { category: 'ALL', label: 'All', icon: '∑' },
  { category: EquipmentCategory.ENERGY_WEAPON, label: 'Energy', icon: '⚡' },
  { category: EquipmentCategory.BALLISTIC_WEAPON, label: 'Ballistic', icon: '🎯' },
  { category: EquipmentCategory.MISSILE_WEAPON, label: 'Missile', icon: '🚀' },
  { category: EquipmentCategory.AMMUNITION, label: 'Ammo', icon: '📦' },
  { category: EquipmentCategory.ELECTRONICS, label: 'Elec', icon: '📡' },
  { category: EquipmentCategory.MISC_EQUIPMENT, label: 'Other', icon: '⚙️' },
];

// Categories to group under "Other" filter
const OTHER_CATEGORIES: EquipmentCategory[] = [
  EquipmentCategory.MISC_EQUIPMENT,
  EquipmentCategory.PHYSICAL_WEAPON,
  EquipmentCategory.MOVEMENT,
  EquipmentCategory.ARTILLERY,
];

// =============================================================================
// Category Filter Bar Component
// =============================================================================

interface CategoryFilterBarProps {
  activeCategory: EquipmentCategory | 'ALL';
  onSelectCategory: (category: EquipmentCategory | 'ALL') => void;
}

function CategoryFilterBar({ activeCategory, onSelectCategory }: CategoryFilterBarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-none bg-surface-base/50">
      {CATEGORY_FILTERS.map(({ category, label, icon }) => {
        const isActive = category === activeCategory;
        const colors = category === 'ALL' 
          ? { bg: 'bg-accent', text: 'text-white', border: 'border-accent' }
          : getCategoryColorsLegacy(category as EquipmentCategory);
        
        return (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`
              flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg
              text-xs font-medium transition-all active:scale-95
              ${isActive
                ? `${colors.bg} text-white ring-1 ring-white/20`
                : 'bg-surface-raised/60 text-text-theme-secondary'
              }
            `}
          >
            <span className="text-sm">{icon}</span>
            <span className="hidden xs:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
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

function SectionHeader({ title, count, isExpanded, onToggle, titleColor = 'text-white' }: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full px-2 py-1 flex items-center justify-between bg-surface-raised/50 border-y border-border-theme-subtle/50 active:bg-surface-raised transition-colors"
    >
      <span className={`text-xs font-semibold ${titleColor}`}>{title}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-text-theme-secondary">({count})</span>
        <span className={`text-[10px] text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
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
    <div className="px-3 py-2 bg-surface-deep border-b border-border-theme flex items-center justify-around text-center">
      <div>
        <div className="text-[10px] text-text-theme-secondary uppercase">Weight</div>
        <div className={`text-sm font-bold ${weightOverage ? 'text-red-400' : 'text-white'}`}>
          {stats.weightUsed.toFixed(1)}
          <span className="text-slate-500 font-normal">/{stats.weightMax}t</span>
        </div>
      </div>
      <div className="w-px h-8 bg-border-theme-subtle" />
      <div>
        <div className="text-[10px] text-text-theme-secondary uppercase">Slots</div>
        <div className={`text-sm font-bold ${slotsOverage ? 'text-red-400' : 'text-white'}`}>
          {stats.slotsUsed}
          <span className="text-slate-500 font-normal">/{stats.slotsMax}</span>
        </div>
      </div>
      <div className="w-px h-8 bg-border-theme-subtle" />
      <div>
        <div className="text-[10px] text-text-theme-secondary uppercase">Heat</div>
        <div className={`text-sm font-bold ${heatNegative ? 'text-red-400' : heatNegative ? 'text-amber-400' : 'text-green-400'}`}>
          {stats.heatGenerated}
          <span className="text-slate-500 font-normal">/{stats.heatDissipation}</span>
        </div>
      </div>
      <div className="w-px h-8 bg-border-theme-subtle" />
      <div>
        <div className="text-[10px] text-text-theme-secondary uppercase">BV</div>
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
    <div className="flex items-center px-2 py-1 bg-surface-raised/30 border-b border-border-theme-subtle/50 text-[8px] text-text-theme-secondary/50 uppercase tracking-wide font-mono">
      <div className="w-1 flex-shrink-0 mr-1.5" />
      <div className="flex-1 min-w-0 text-left font-sans">Name</div>
      <div className="w-[28px] flex-shrink-0 text-center border-l border-border-theme-subtle/30">Loc</div>
      <div className="w-[44px] flex-shrink-0 text-center border-l border-border-theme-subtle/30">S/M/L</div>
      <div className="w-[20px] flex-shrink-0 text-center border-l border-border-theme-subtle/30">H</div>
      <div className="w-[20px] flex-shrink-0 text-center border-l border-border-theme-subtle/30">C</div>
      <div className="w-[28px] flex-shrink-0 text-center border-l border-border-theme-subtle/30">Wt</div>
      <div className="w-[36px] flex-shrink-0 text-center border-l border-border-theme-subtle/30">🔗</div>
      <div className="w-[36px] flex-shrink-0 text-center border-l border-border-theme-subtle/30">✕</div>
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
  const [activeCategory, setActiveCategory] = useState<EquipmentCategory | 'ALL'>('ALL');
  const [unassignedExpanded, setUnassignedExpanded] = useState(true);
  const [allocatedExpanded, setAllocatedExpanded] = useState(true);
  // Track which item has its location menu open (only one at a time)
  const [openLocationMenuId, setOpenLocationMenuId] = useState<string | null>(null);
  
  // Filter out non-removable equipment (structural components)
  const removableEquipment = useMemo(() => {
    return equipment.filter(item => item.isRemovable);
  }, [equipment]);
  
  // Apply category filter
  const filteredEquipment = useMemo(() => {
    if (activeCategory === 'ALL') return removableEquipment;
    
    // "Other" category includes misc, physical, movement, artillery
    if (activeCategory === EquipmentCategory.MISC_EQUIPMENT) {
      return removableEquipment.filter(item => 
        OTHER_CATEGORIES.includes(item.category)
      );
    }
    
    return removableEquipment.filter(item => item.category === activeCategory);
  }, [removableEquipment, activeCategory]);
  
  // Split by allocation status
  const { unassigned, allocated } = useMemo(() => {
    const unalloc: MobileEquipmentItem[] = [];
    const alloc: MobileEquipmentItem[] = [];
    for (const item of filteredEquipment) {
      if (item.isAllocated) {
        alloc.push(item);
      } else {
        unalloc.push(item);
      }
    }
    return { unassigned: unalloc, allocated: alloc };
  }, [filteredEquipment]);
  
  // Handle equipment selection
  const handleSelect = useCallback((instanceId: string) => {
    onSelectEquipment?.(selectedEquipmentId === instanceId ? null : instanceId);
  }, [selectedEquipmentId, onSelectEquipment]);
  
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
      className={`
        fixed inset-0 z-50 flex flex-col
        bg-surface-deep
        ${className}
      `}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-surface-base border-b border-border-theme">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 text-text-theme-secondary hover:text-white active:scale-95 transition-all"
            aria-label="Close loadout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <h2 className="text-base font-bold text-white">Equipment Loadout</h2>
          <span className="bg-accent text-white text-xs rounded-full px-2 py-0.5">
            {removableEquipment.length}
          </span>
        </div>
        
        {removableCount > 0 && (
          <button
            onClick={handleRemoveAll}
            className="px-3 py-1.5 text-xs bg-red-900/40 hover:bg-red-900/60 active:scale-95 rounded text-red-300 transition-all"
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
      />
      
      {/* Equipment List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEquipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="text-4xl mb-3">⚙️</div>
            <div className="text-lg text-white font-medium mb-1">No Equipment</div>
            <div className="text-sm text-text-theme-secondary">
              {activeCategory === 'ALL' 
                ? 'Add equipment from the Equipment tab'
                : 'No items in this category'
              }
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
                    {unassigned.map(item => (
                      <MobileEquipmentRow
                        key={item.instanceId}
                        item={item}
                        isOmni={isOmni}
                        isSelected={selectedEquipmentId === item.instanceId}
                        onSelect={() => handleSelect(item.instanceId)}
                        onRemove={() => onRemoveEquipment(item.instanceId)}
                        onQuickAssign={onQuickAssign ? (location) => {
                          onQuickAssign(item.instanceId, location);
                          setOpenLocationMenuId(null);
                        } : undefined}
                        availableLocations={getAvailableLocations?.(item.instanceId) ?? []}
                        isLocationMenuOpen={openLocationMenuId === item.instanceId}
                        onToggleLocationMenu={() => setOpenLocationMenuId(
                          openLocationMenuId === item.instanceId ? null : item.instanceId
                        )}
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
                    {allocated.map(item => (
                      <MobileEquipmentRow
                        key={item.instanceId}
                        item={item}
                        isOmni={isOmni}
                        isSelected={selectedEquipmentId === item.instanceId}
                        onSelect={() => handleSelect(item.instanceId)}
                        onRemove={() => onRemoveEquipment(item.instanceId)}
                        onUnassign={onUnassignEquipment ? () => onUnassignEquipment(item.instanceId) : undefined}
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
      <div className="flex-shrink-0 px-3 py-3 bg-surface-base border-t border-border-theme">
        <button
          onClick={onClose}
          className="w-full py-3 bg-surface-raised hover:bg-surface-raised/80 active:scale-[0.98] text-white font-medium rounded-lg transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default MobileLoadoutList;
