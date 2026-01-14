/**
 * Equipment Row Component
 * 
 * Table row for equipment in the browser.
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React, { memo } from 'react';
import { IEquipmentItem, EquipmentCategory, getAllWeapons, IWeapon } from '@/types/equipment';
import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';

interface EquipmentRowProps {
  /** Equipment item data */
  equipment: IEquipmentItem;
  /** Called when add button is clicked */
  onAdd: () => void;
  /** Compact mode - fewer columns, smaller text */
  compact?: boolean;
}

/**
 * Get weapon data from equipment item if it's a weapon
 */
function getWeaponData(equipment: IEquipmentItem): IWeapon | null {
  // Check if equipment is a weapon category
  const isWeaponCategory = 
    equipment.category === EquipmentCategory.ENERGY_WEAPON ||
    equipment.category === EquipmentCategory.BALLISTIC_WEAPON ||
    equipment.category === EquipmentCategory.MISSILE_WEAPON ||
    equipment.category === EquipmentCategory.ARTILLERY ||
    equipment.category === EquipmentCategory.CAPITAL_WEAPON ||
    equipment.category === EquipmentCategory.PHYSICAL_WEAPON;
  
  if (!isWeaponCategory) {
    return null;
  }
  
  // Look up weapon by ID
  const weapons = getAllWeapons();
  return weapons.find(w => w.id === equipment.id) ?? null;
}

/**
 * Format range display (short/medium/long)
 */
function formatRange(equipment: IEquipmentItem): string {
  const weapon = getWeaponData(equipment);
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
function formatDamage(equipment: IEquipmentItem): string {
  const weapon = getWeaponData(equipment);
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
function formatHeat(equipment: IEquipmentItem): string {
  const weapon = getWeaponData(equipment);
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
        <td className="hidden sm:table-cell px-1 py-0.5 text-slate-300 text-center">
          {formatDamage(equipment)}
        </td>
        <td className="hidden sm:table-cell px-1 py-0.5 text-slate-300 text-center">
          {formatHeat(equipment)}
        </td>
        <td className="hidden md:table-cell px-1 py-0.5 text-text-theme-secondary text-center">
          {formatRange(equipment)}
        </td>
        <td className="px-1 py-0.5 text-slate-300 text-right tabular-nums">
          {equipment.weight}
        </td>
        <td className="px-1 py-0.5 text-slate-300 text-center tabular-nums">
          {equipment.criticalSlots}
        </td>
        <td className="px-1 py-0.5">
          <button
            onClick={onAdd}
            className="w-full px-1 py-0 text-[10px] bg-accent hover:bg-accent/80 text-white rounded transition-colors"
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
      
      {/* Damage */}
      <td className="px-3 py-2 text-slate-300 text-center">
        {formatDamage(equipment)}
      </td>
      
      {/* Heat */}
      <td className="px-3 py-2 text-slate-300 text-center">
        {formatHeat(equipment)}
      </td>
      
      {/* Range */}
      <td className="px-3 py-2 text-text-theme-secondary text-center">
        {formatRange(equipment)}
      </td>
      
      {/* Weight */}
      <td className="px-3 py-2 text-slate-300 text-right">
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
