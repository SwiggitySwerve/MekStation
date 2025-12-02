/**
 * Global Loadout Tray Component
 * 
 * Persistent sidebar on right edge showing unit's current equipment.
 * Available across all customizer tabs with categorized sections.
 * 
 * @spec openspec/changes/unify-equipment-tab/specs/equipment-tray/spec.md
 */

import React, { useState, useCallback } from 'react';
import { EquipmentCategory } from '@/types/equipment';
import { categoryToColorType, getEquipmentColors } from '@/utils/colors/equipmentColors';

// =============================================================================
// Types
// =============================================================================

/**
 * Equipment item in the loadout tray
 */
export interface LoadoutEquipmentItem {
  /** Unique instance ID */
  instanceId: string;
  /** Equipment name */
  name: string;
  /** Equipment category */
  category: EquipmentCategory;
  /** Weight in tons */
  weight: number;
  /** Critical slots */
  criticalSlots: number;
  /** Is allocated to critical slots */
  isAllocated: boolean;
  /** Location if allocated */
  location?: string;
}

interface GlobalLoadoutTrayProps {
  /** Equipment items (user-added, excludes structural) */
  equipment: LoadoutEquipmentItem[];
  /** Total equipment count for badge */
  equipmentCount: number;
  /** Called when equipment is removed */
  onRemoveEquipment: (instanceId: string) => void;
  /** Called when all equipment is removed */
  onRemoveAllEquipment: () => void;
  /** Is tray expanded */
  isExpanded: boolean;
  /** Toggle expand state */
  onToggleExpand: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Category Display Order & Labels
// =============================================================================

const CATEGORY_ORDER: EquipmentCategory[] = [
  EquipmentCategory.ENERGY_WEAPON,
  EquipmentCategory.BALLISTIC_WEAPON,
  EquipmentCategory.MISSILE_WEAPON,
  EquipmentCategory.ARTILLERY,
  EquipmentCategory.AMMUNITION,
  EquipmentCategory.ELECTRONICS,
  EquipmentCategory.PHYSICAL_WEAPON,
  EquipmentCategory.MISC_EQUIPMENT,
];

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  [EquipmentCategory.ENERGY_WEAPON]: 'Energy Weapons',
  [EquipmentCategory.BALLISTIC_WEAPON]: 'Ballistic Weapons',
  [EquipmentCategory.MISSILE_WEAPON]: 'Missile Weapons',
  [EquipmentCategory.ARTILLERY]: 'Artillery',
  [EquipmentCategory.CAPITAL_WEAPON]: 'Capital Weapons',
  [EquipmentCategory.AMMUNITION]: 'Ammunition',
  [EquipmentCategory.ELECTRONICS]: 'Electronics',
  [EquipmentCategory.PHYSICAL_WEAPON]: 'Physical Weapons',
  [EquipmentCategory.MISC_EQUIPMENT]: 'Misc Equipment',
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

// =============================================================================
// Sub-Components
// =============================================================================

interface CategorySectionProps {
  category: EquipmentCategory;
  items: LoadoutEquipmentItem[];
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: (instanceId: string) => void;
  selectedId?: string;
  onSelect: (instanceId: string) => void;
}

function CategorySection({
  category,
  items,
  isExpanded,
  onToggle,
  onRemove,
  selectedId,
  onSelect,
}: CategorySectionProps) {
  const colorType = categoryToColorType(category);
  const colors = getEquipmentColors(colorType);
  const label = CATEGORY_LABELS[category] || category;
  
  return (
    <div className="border-b border-slate-700/50 last:border-b-0">
      {/* Category Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-700/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-sm ${colors.bg}`} />
          <span className="text-xs font-medium text-slate-300">{label}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">({items.length})</span>
          <span className={`text-[10px] text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </span>
      </button>
      
      {/* Items */}
      {isExpanded && (
        <div className="pb-1 px-1">
          {items.map((item) => (
            <div
              key={item.instanceId}
              className={`
                mx-1 mb-0.5 px-2 py-1 rounded text-xs cursor-pointer
                transition-colors group
                ${selectedId === item.instanceId
                  ? 'bg-amber-600/30 ring-1 ring-amber-500'
                  : 'bg-slate-700/40 hover:bg-slate-700'
                }
              `}
              onClick={() => onSelect(item.instanceId)}
              title="Click to select"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-white truncate flex-1">{item.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.instanceId);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity px-1"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 text-slate-400 mt-0.5">
                <span>{item.weight}t</span>
                <span>{item.criticalSlots} slots</span>
                {item.location ? (
                  <span className="text-green-400">@ {item.location}</span>
                ) : (
                  <span className="text-amber-400 italic">Unallocated</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Global loadout tray - shows equipment across all tabs
 */
export function GlobalLoadoutTray({
  equipment,
  equipmentCount,
  onRemoveEquipment,
  onRemoveAllEquipment,
  isExpanded,
  onToggleExpand,
  className = '',
}: GlobalLoadoutTrayProps) {
  // Track expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<EquipmentCategory>>(
    new Set(CATEGORY_ORDER)
  );
  
  // Track selected item
  const [selectedId, setSelectedId] = useState<string | undefined>();
  
  // Toggle category expansion
  const toggleCategory = useCallback((category: EquipmentCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);
  
  // Handle remove selected
  const handleRemoveSelected = useCallback(() => {
    if (selectedId) {
      onRemoveEquipment(selectedId);
      setSelectedId(undefined);
    }
  }, [selectedId, onRemoveEquipment]);
  
  // Handle remove all with confirmation
  const handleRemoveAll = useCallback(() => {
    if (equipment.length === 0) return;
    
    // Simple confirmation
    if (window.confirm(`Remove all ${equipment.length} equipment items?`)) {
      onRemoveAllEquipment();
      setSelectedId(undefined);
    }
  }, [equipment.length, onRemoveAllEquipment]);
  
  // Group equipment by category
  const grouped = groupByCategory(equipment);
  
  // Collapsed state - just show toggle button
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
    <div className={`bg-slate-800 border-l border-slate-700 flex flex-col ${className}`}
         style={{ width: '280px' }}>
      {/* Fixed Header - doesn't scroll */}
      <div className="flex-shrink-0 border-b border-slate-700">
        {/* Title row */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm">Loadout</h3>
            <span className="bg-slate-700 text-slate-300 text-xs rounded-full px-1.5 py-0.5">
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
        
        {/* Action buttons */}
        <div className="flex gap-2 px-3 pb-2">
          <button
            onClick={handleRemoveSelected}
            disabled={!selectedId}
            className="flex-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-slate-300 transition-colors"
          >
            Remove
          </button>
          <button
            onClick={handleRemoveAll}
            disabled={equipment.length === 0}
            className="flex-1 px-2 py-1 text-xs bg-red-900/50 hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed rounded text-red-300 transition-colors"
          >
            Remove All
          </button>
        </div>
      </div>
      
      {/* Scrollable Equipment List */}
      <div className="flex-1 overflow-y-auto">
        {equipment.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            <div className="text-2xl mb-2">⚙️</div>
            <div>No equipment mounted</div>
            <div className="text-xs mt-1">Add equipment from the Equipment tab</div>
          </div>
        ) : (
          CATEGORY_ORDER.map((category) => {
            const items = grouped.get(category);
            if (!items || items.length === 0) return null;
            
            return (
              <CategorySection
                key={category}
                category={category}
                items={items}
                isExpanded={expandedCategories.has(category)}
                onToggle={() => toggleCategory(category)}
                onRemove={onRemoveEquipment}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default GlobalLoadoutTray;

