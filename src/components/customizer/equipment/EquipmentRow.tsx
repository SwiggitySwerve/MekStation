/**
 * Equipment Row Component
 * 
 * Table row for equipment in the browser.
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React, { memo } from 'react';
import { IEquipmentItem, EquipmentCategory } from '@/types/equipment';
import { categoryToColorType, getEquipmentColors } from '@/utils/colors/equipmentColors';

interface EquipmentRowProps {
  /** Equipment item data */
  equipment: IEquipmentItem;
  /** Called when add button is clicked */
  onAdd: () => void;
  /** Compact mode - fewer columns, smaller text */
  compact?: boolean;
}

/**
 * Format range display (short/medium/long)
 */
function formatRange(equipment: IEquipmentItem): string {
  // Check if equipment has range properties
  const rangeMin = (equipment as any).rangeMin;
  const rangeShort = (equipment as any).rangeShort;
  const rangeMedium = (equipment as any).rangeMedium;
  const rangeLong = (equipment as any).rangeLong;
  
  if (rangeShort && rangeMedium && rangeLong) {
    return `${rangeShort}/${rangeMedium}/${rangeLong}`;
  }
  if (rangeLong) {
    return `${rangeLong}`;
  }
  return '-';
}

/**
 * Get damage display
 */
function formatDamage(equipment: IEquipmentItem): string {
  const damage = (equipment as any).damage;
  if (damage !== undefined && damage !== null) {
    return String(damage);
  }
  return '-';
}

/**
 * Get heat display
 */
function formatHeat(equipment: IEquipmentItem): string {
  // Heat is only on weapon types, access via any cast
  const heat = (equipment as any).heat;
  if (heat !== undefined && heat !== null && heat > 0) {
    return String(heat);
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
  const colorType = categoryToColorType(equipment.category);
  const colors = getEquipmentColors(colorType);
  
  if (compact) {
    // Compact layout - fewer columns, MekLab-style
    return (
      <tr className="border-t border-slate-700/30 hover:bg-slate-700/30 transition-colors text-xs">
        {/* Name with category color indicator */}
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${colors.bg}`} />
            <span className="text-white truncate" title={equipment.name}>
              {equipment.name}
            </span>
          </div>
        </td>
        
        {/* Damage */}
        <td className="px-2 py-1.5 text-slate-300 text-center">
          {formatDamage(equipment)}
        </td>
        
        {/* Heat */}
        <td className="px-2 py-1.5 text-slate-300 text-center">
          {formatHeat(equipment)}
        </td>
        
        {/* Range */}
        <td className="px-2 py-1.5 text-slate-400 text-center">
          {formatRange(equipment)}
        </td>
        
        {/* Weight */}
        <td className="px-2 py-1.5 text-slate-300 text-right">
          {equipment.weight}
        </td>
        
        {/* Critical Slots */}
        <td className="px-2 py-1.5 text-slate-300 text-center">
          {equipment.criticalSlots}
        </td>
        
        {/* Add button */}
        <td className="px-2 py-1.5">
          <button
            onClick={onAdd}
            className="w-full px-1.5 py-0.5 text-[10px] bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
            title={`Add ${equipment.name}`}
          >
            Add
          </button>
        </td>
      </tr>
    );
  }
  
  // Standard layout
  return (
    <tr className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
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
      <td className="px-3 py-2 text-slate-400 text-center">
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
          className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
        >
          Add
        </button>
      </td>
    </tr>
  );
});

export default EquipmentRow;
