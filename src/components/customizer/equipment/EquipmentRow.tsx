/**
 * Equipment Row Component
 * 
 * Table row for equipment in the browser.
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React, { memo, useMemo } from 'react';
import { IEquipmentItem, EquipmentCategory, IWeapon } from '@/types/equipment';
import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';
import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';

interface EquipmentRowProps {
  /** Equipment item data */
  equipment: IEquipmentItem;
  /** Called when add button is clicked */
  onAdd: () => void;
  /** Compact mode - fewer columns, smaller text */
  compact?: boolean;
}

/**
 * Check if category is a weapon category
 */
function isWeaponCategory(category: EquipmentCategory): boolean {
  return (
    category === EquipmentCategory.ENERGY_WEAPON ||
    category === EquipmentCategory.BALLISTIC_WEAPON ||
    category === EquipmentCategory.MISSILE_WEAPON ||
    category === EquipmentCategory.ARTILLERY ||
    category === EquipmentCategory.CAPITAL_WEAPON ||
    category === EquipmentCategory.PHYSICAL_WEAPON
  );
}

/**
 * Get weapon data from equipment item if it's a weapon
 * Uses equipmentLookupService which loads from JSON
 */
function getWeaponData(equipment: IEquipmentItem, allWeapons: readonly IWeapon[]): IWeapon | null {
  if (!isWeaponCategory(equipment.category)) {
    return null;
  }
  
  // Look up weapon by ID from loaded weapons
  return allWeapons.find(w => w.id === equipment.id) ?? null;
}

/**
 * Format range display (short/medium/long)
 */
function formatRange(weapon: IWeapon | null): string {
  if (!weapon) {
    return '-';
  }
  
  const ranges = weapon.ranges;
  const hasShort = ranges.short !== undefined && ranges.short !== null;
  const hasMedium = ranges.medium !== undefined && ranges.medium !== null;
  const hasLong = ranges.long !== undefined && ranges.long !== null;

  if (hasShort && hasMedium && hasLong) {
    return `${ranges.short}/${ranges.medium}/${ranges.long}`;
  }
  if (hasLong) {
    return `${ranges.long}`;
  }
  return '-';
}

/**
 * Get damage display
 */
function formatDamage(weapon: IWeapon | null): string {
  if (!weapon) {
    return '-';
  }
  
  if (weapon.damage !== undefined && weapon.damage !== null) {
    return String(weapon.damage);
  }
  return '-';
}

/**
 * Get heat display
 */
function formatHeat(weapon: IWeapon | null): string {
  if (!weapon) {
    return '-';
  }
  
  if (weapon.heat !== undefined && weapon.heat !== null && weapon.heat > 0) {
    return String(weapon.heat);
  }
  return '-';
}

/**
 * Equipment table row
 * Memoized for performance when rendering large lists
 */
export const EquipmentRow = memo(function EquipmentRow({
  equipment,
  onAdd,
  compact = false,
}: EquipmentRowProps) {
  const colors = getCategoryColorsLegacy(equipment.category);
  
  // Get all weapons from lookup service (memoized to avoid re-fetching)
  const allWeapons = useMemo(() => {
    return equipmentLookupService.getAllWeapons();
  }, []);
  
  // Look up weapon data for this equipment
  const weaponData = useMemo(() => {
    return getWeaponData(equipment, allWeapons);
  }, [equipment, allWeapons]);
  
  if (compact) {
    return (
      <tr className="border-t border-border-theme-subtle/20 hover:bg-surface-raised/30 transition-colors text-[11px]">
        <td className="px-1.5 py-0.5">
          <div className="flex items-center gap-1">
            <span className={`w-1 h-1 rounded-sm flex-shrink-0 ${colors.bg}`} />
            <span className="text-white truncate" title={equipment.name}>
              {equipment.name}
            </span>
          </div>
        </td>
        <td className="px-1 py-0.5 text-text-theme-secondary text-center w-20 sm:w-24 text-[10px] tabular-nums">
          {formatRange(weaponData)}
        </td>
        <td className="px-1 py-0.5 text-slate-300 text-center w-10 sm:w-12">
          {formatDamage(weaponData)}
        </td>
        <td className="px-1 py-0.5 text-slate-300 text-center w-8 sm:w-10">
          {formatHeat(weaponData)}
        </td>
        <td className="px-1 py-0.5 text-slate-300 text-center tabular-nums w-12">
          {equipment.weight}
        </td>
        <td className="px-1 py-0.5 text-slate-300 text-center tabular-nums w-10">
          {equipment.criticalSlots}
        </td>
        <td className="px-1 py-0.5 w-10">
          <button
            onClick={onAdd}
            className="w-full px-1 py-0.5 text-[10px] bg-accent hover:bg-accent/80 text-white rounded transition-colors font-medium"
            title={`Add ${equipment.name}`}
          >
            +
          </button>
        </td>
      </tr>
    );
  }

  // Standard layout
  return (
    <tr className="border-t border-border-theme-subtle/50 hover:bg-surface-raised/30 transition-colors">
      {/* Name */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-sm ${colors.bg}`} />
          <span className="text-white">{equipment.name}</span>
        </div>
      </td>
      
      {/* Range */}
      <td className="px-3 py-2 text-text-theme-secondary text-center">
        {formatRange(weaponData)}
      </td>
      
      {/* Damage */}
      <td className="px-3 py-2 text-slate-300 text-center">
        {formatDamage(weaponData)}
      </td>
      
      {/* Heat */}
      <td className="px-3 py-2 text-slate-300 text-center">
        {formatHeat(weaponData)}
      </td>
      
      {/* Weight */}
      <td className="px-3 py-2 text-slate-300 text-center">
        {equipment.weight}t
      </td>
      
      {/* Critical Slots */}
      <td className="px-3 py-2 text-slate-300 text-center">
        {equipment.criticalSlots}
      </td>
      
      {/* Add button */}
      <td className="px-3 py-2">
        <button
          onClick={onAdd}
          className="px-2 py-1 text-xs bg-accent hover:bg-accent/80 text-white rounded transition-colors"
        >
          Add
        </button>
      </td>
    </tr>
  );
});

export default EquipmentRow;
