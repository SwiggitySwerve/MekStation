/**
 * Equipment Browser Table - Main table display for equipment data
 * Handles equipment table rendering with sortable columns and equipment actions
 * Follows SOLID principles with single responsibility for table display
 */

import React from 'react';
import { EquipmentObject } from '../../../utils/criticalSlots/CriticalSlot';

export interface LocalEquipmentVariant {
  id: string;
  name: string;
  category: string;
  techBase: string;
  weight: number;
  crits: number;
  damage?: number | null;
  heat?: number | null;
  minRange?: number | null;
  rangeShort?: number | null;
  rangeMedium?: number | null;
  rangeLong?: number | null;
  rangeExtreme?: number | null;
  ammoPerTon?: number | null;
  cost?: number | null;
  battleValue?: number | null;
  requiresAmmo: boolean;
  introductionYear: number;
  rulesLevel: string;
  baseType?: string;
  description?: string;
  special?: string[];
  sourceBook?: string;
  pageReference?: string;
}

export interface EquipmentBrowserTableProps {
  equipment: LocalEquipmentVariant[];
  onAddEquipment?: (equipment: EquipmentObject) => void;
  onEquipmentAction?: (action: string, equipment: EquipmentObject) => void;
  showAddButtons?: boolean;
  actionButtonLabel?: string;
  actionButtonIcon?: string;
  isLoading?: boolean;
  className?: string;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (variant: LocalEquipmentVariant) => React.ReactNode;
}

// Convert local equipment to EquipmentObject
function convertLocalEquipmentToObject(variant: LocalEquipmentVariant): EquipmentObject {
  const categoryToType: Record<string, EquipmentObject['type']> = {
    'Energy Weapons': 'weapon',
    'Ballistic Weapons': 'weapon',
    'Missile Weapons': 'weapon',
    'Artillery Weapons': 'weapon',
    'Capital Weapons': 'weapon',
    'Physical Weapons': 'weapon',
    'Anti-Personnel Weapons': 'weapon',
    'One-Shot Weapons': 'weapon',
    'Torpedoes': 'weapon',
    'Ammunition': 'ammo',
    'Heat Management': 'heat_sink',
    'Equipment': 'equipment',
    'Industrial Equipment': 'equipment',
    'Movement Equipment': 'equipment',
    'Electronic Warfare': 'equipment',
    'Prototype Equipment': 'equipment'
  }

  let type: EquipmentObject['type'] = 'equipment'
  if (categoryToType[variant.category]) {
    type = categoryToType[variant.category]
  }

  return {
    id: variant.id,
    name: variant.name,
    requiredSlots: variant.crits,
    weight: variant.weight,
    type,
    techBase: variant.techBase === 'IS' ? 'Inner Sphere' : variant.techBase === 'Clan' ? 'Clan' : 'Both',
    heat: variant.heat || 0
  }
}

// Get tech base colors
function getTechBaseColors(techBase: string) {
  switch (techBase) {
    case 'IS': return { text: 'text-blue-300' };
    case 'Clan': return { text: 'text-green-300' };
    default: return { text: 'text-gray-300' };
  }
}

function getTechBaseDisplayName(techBase: string): string {
  switch (techBase) {
    case 'IS': return 'Inner Sphere';
    case 'Clan': return 'Clan';
    default: return techBase;
  }
}

interface EquipmentRowProps {
  variant: LocalEquipmentVariant;
  onAddEquipment?: (equipment: EquipmentObject) => void;
  onEquipmentAction?: (action: string, equipment: EquipmentObject) => void;
  showAddButtons?: boolean;
  actionButtonLabel?: string;
  actionButtonIcon?: string;
}

function EquipmentRow({
  variant,
  onAddEquipment,
  onEquipmentAction,
  showAddButtons = true,
  actionButtonLabel = "Add to unit",
  actionButtonIcon = "+"
}: EquipmentRowProps) {
  const techBaseColors = getTechBaseColors(variant.techBase);

  const handleAdd = () => {
    try {
      const equipment = convertLocalEquipmentToObject(variant)
      if (onAddEquipment) {
        onAddEquipment(equipment)
      } else if (onEquipmentAction) {
        onEquipmentAction('add', equipment)
      }
    } catch (error) {
      console.error('EquipmentBrowserTable: Error adding equipment:', error);
    }
  }

  const rangeDisplay = variant.rangeShort && variant.rangeMedium && variant.rangeLong
    ? `${variant.rangeShort}/${variant.rangeMedium}/${variant.rangeLong}`
    : ''

  return (
    <tr className="border-b border-gray-600 hover:bg-gray-700 transition-colors">
      {/* Add Button */}
      <td className="px-2 py-2 text-center w-12">
        {showAddButtons && (onAddEquipment || onEquipmentAction) ? (
          <button
            onClick={handleAdd}
            className="bg-green-600 hover:bg-green-500 text-white text-xs w-6 h-6 rounded flex items-center justify-center transition-colors"
            title={actionButtonLabel}
          >
            {actionButtonIcon}
          </button>
        ) : (
          <div className="w-6 h-6 flex items-center justify-center">
            <span className="text-gray-500 text-xs">—</span>
          </div>
        )}
      </td>

      {/* Name */}
      <td className="px-3 py-2 text-white font-medium text-sm">{variant.name}</td>
      
      {/* Damage */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">{variant.damage || '-'}</td>
      
      {/* Heat */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">{variant.heat || '-'}</td>
      
      {/* Min R */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">{variant.minRange || '0'}</td>
      
      {/* Range */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">{rangeDisplay || '-'}</td>
      
      {/* Shots */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">{variant.ammoPerTon || '-'}</td>
      
      {/* Base */}
      <td className="px-3 py-2 text-xs">
        <span className={techBaseColors.text}>
          {getTechBaseDisplayName(variant.techBase)}
        </span>
      </td>
      
      {/* BV */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">{variant.battleValue || '-'}</td>
      
      {/* Weight */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">{variant.weight}</td>
      
      {/* Crit */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">{variant.crits}</td>
      
      {/* Reference */}
      <td className="px-3 py-2 text-gray-400 text-xs">
        {variant.pageReference || `${variant.introductionYear}, ${variant.rulesLevel}`}
      </td>
    </tr>
  )
}

export function EquipmentBrowserTable({
  equipment,
  onAddEquipment,
  onEquipmentAction,
  showAddButtons = true,
  actionButtonLabel = "Add to unit",
  actionButtonIcon = "+",
  isLoading = false,
  className = ""
}: EquipmentBrowserTableProps) {

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-900 border border-gray-600 rounded ${className}`}>
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-gray-400">Loading equipment...</div>
        </div>
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-900 border border-gray-600 rounded ${className}`}>
        <div className="text-center text-gray-400">
          <div className="text-lg mb-2">No Equipment Found</div>
          <div className="text-sm">Try adjusting your search filters to find equipment.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-600 rounded bg-gray-900 ${className}`}>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-left table-auto">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b border-gray-600">
              <th className="px-2 py-2 text-gray-300 text-sm font-medium text-center w-12"></th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium">Name</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Damage</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Heat</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Min R</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Range</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Shots</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Base</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">BV</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Weight</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Crit</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Reference</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map((variant) => (
              <EquipmentRow
                key={variant.name}
                variant={variant}
                onAddEquipment={onAddEquipment}
                onEquipmentAction={onEquipmentAction}
                showAddButtons={showAddButtons}
                actionButtonLabel={actionButtonLabel}
                actionButtonIcon={actionButtonIcon}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Export utility functions and types
export { convertLocalEquipmentToObject, getTechBaseColors, getTechBaseDisplayName };
