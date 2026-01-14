/**
 * Equipped Summary - compact view of currently equipped items
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React, { useState, useMemo, useCallback } from 'react';
import { EquipmentCategory } from '@/types/equipment';
import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';
import type { LoadoutEquipmentItem } from './GlobalLoadoutTray';

export interface EquippedSummaryProps {
  equipment: LoadoutEquipmentItem[];
  onRemoveEquipment: (instanceId: string) => void;
  onSelectEquipment?: (instanceId: string | null) => void;
  selectedEquipmentId?: string | null;
  className?: string;
}

interface EquipmentGroup {
  name: string;
  category: EquipmentCategory;
  items: LoadoutEquipmentItem[];
  totalWeight: number;
  totalSlots: number;
}

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

function groupEquipmentByName(equipment: LoadoutEquipmentItem[]): EquipmentGroup[] {
  const groupMap = new Map<string, EquipmentGroup>();
  
  for (const item of equipment) {
    const key = `${item.name}-${item.category}`;
    const existing = groupMap.get(key);
    
    if (existing) {
      existing.items.push(item);
      existing.totalWeight += item.weight;
      existing.totalSlots += item.criticalSlots;
    } else {
      groupMap.set(key, {
        name: item.name,
        category: item.category,
        items: [item],
        totalWeight: item.weight,
        totalSlots: item.criticalSlots,
      });
    }
  }
  
  return Array.from(groupMap.values()).sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a.category);
    const bIdx = CATEGORY_ORDER.indexOf(b.category);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.name.localeCompare(b.name);
  });
}

export function EquippedSummary({
  equipment,
  onRemoveEquipment,
  onSelectEquipment,
  selectedEquipmentId,
  className = '',
}: EquippedSummaryProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const userEquipment = useMemo(() => equipment.filter(e => e.isRemovable), [equipment]);
  
  const groupedEquipment = useMemo(() => groupEquipmentByName(userEquipment), [userEquipment]);
  
  const totals = useMemo(() => {
    let weight = 0;
    let slots = 0;
    for (const item of userEquipment) {
      weight += item.weight;
      slots += item.criticalSlots;
    }
    return { weight, slots, count: userEquipment.length };
  }, [userEquipment]);
  
  const handleRemoveOne = useCallback((group: EquipmentGroup) => {
    if (group.items.length > 0) {
      onRemoveEquipment(group.items[0].instanceId);
    }
  }, [onRemoveEquipment]);
  
  const handleSelectGroup = useCallback((group: EquipmentGroup) => {
    const firstUnallocated = group.items.find(item => !item.isAllocated);
    if (firstUnallocated && onSelectEquipment) {
      onSelectEquipment(
        selectedEquipmentId === firstUnallocated.instanceId ? null : firstUnallocated.instanceId
      );
    }
  }, [onSelectEquipment, selectedEquipmentId]);
  
  if (userEquipment.length === 0) {
    return <></>;
  }
  
  return (
    <div className={`bg-surface-base/30 rounded-lg border border-border-theme-subtle overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-surface-raised/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-[10px] text-text-theme-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
          <span className="text-xs font-medium text-white">Equipped</span>
          <span className="text-[10px] text-accent bg-accent/20 px-1.5 rounded">
            {totals.count}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-theme-secondary">
          <span>{totals.weight}t</span>
          <span>{totals.slots} slots</span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-2 pb-2 pt-1">
          <div className="flex flex-wrap gap-1">
            {groupedEquipment.map((group) => {
              const colors = getCategoryColorsLegacy(group.category);
              const hasUnallocated = group.items.some(item => !item.isAllocated);
              const isSelected = group.items.some(item => item.instanceId === selectedEquipmentId);
              
              return (
                <div
                  key={`${group.name}-${group.category}`}
                  className={`
                    group relative flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]
                    ${colors.bg} ${colors.text} border ${colors.border}
                    ${hasUnallocated ? 'cursor-pointer hover:brightness-110' : ''}
                    ${isSelected ? 'ring-1 ring-white ring-offset-1 ring-offset-surface-base' : ''}
                    transition-all
                  `}
                  onClick={() => hasUnallocated && handleSelectGroup(group)}
                  title={hasUnallocated ? 'Click to select for placement' : `${group.name} - all allocated`}
                >
                  <span className="truncate max-w-[120px]">{group.name}</span>
                  
                  {group.items.length > 1 && (
                    <span className="opacity-70">×{group.items.length}</span>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveOne(group);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 text-[8px] hover:text-red-300 transition-opacity"
                    title={`Remove one ${group.name}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          
          {groupedEquipment.length === 0 && (
            <div className="text-[10px] text-text-theme-secondary text-center py-2">
              No equipment added yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EquippedSummary;
