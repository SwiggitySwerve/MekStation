/**
 * EquipmentTabV2 - Equipment browser and management tab
 * 
 * Extracted from CustomizerV2Content as part of Phase 2 refactoring
 * Handles equipment browsing, selection, and unallocated equipment management
 * 
 * @see IMPLEMENTATION_REFERENCE.md for tab component patterns
 */

import React from 'react';
import { useUnit } from '../../multiUnit/MultiUnitProvider';

// Import equipment components
import { EquipmentBrowserRefactored as EquipmentBrowser } from '../../equipment/EquipmentBrowserRefactored';

/**
 * Props for EquipmentTabV2 component
 */
export interface EquipmentTabProps {
  /** Whether the component is in read-only mode */
  readOnly?: boolean;
}

/**
 * EquipmentTabV2 Component
 * 
 * Manages equipment browsing and selection including:
 * - Equipment browser with filtering and search
 * - Unallocated equipment statistics and summary
 * - Equipment addition to unit
 * - Weight, slot, and heat tracking
 * - Integration with equipment tray
 */
export const EquipmentTab: React.FC<EquipmentTabProps> = ({ readOnly = false }) => {
  const { unit, unallocatedEquipment, addEquipmentToUnit } = useUnit();

  // Calculate equipment statistics for header display
  const equipmentStats = React.useMemo(() => {
    let totalWeight = 0;
    let totalSlots = 0;
    let totalHeat = 0;

    unallocatedEquipment.forEach((equipment: any) => {
      totalWeight += equipment.weight || 0;
      totalSlots += equipment.requiredSlots || 0;
      totalHeat += equipment.heat || 0;
    });

    return {
      totalWeight,
      totalSlots,
      totalHeat,
      count: unallocatedEquipment.length
    };
  }, [unallocatedEquipment]);

  // Get remaining capacity
  const remainingWeight = unit.getRemainingTonnage();
  const remainingSlots = 78 - unit.getSummary().occupiedSlots;

  return (
    <div className="h-full flex flex-col">
      {/* Equipment Summary Header - Fixed */}
      <div className="flex-shrink-0 p-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Equipment Browser</h2>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Unallocated:</span>
                  <span className="font-medium text-slate-200">{equipmentStats.count} items</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Weight:</span>
                  <span className={`font-medium ${equipmentStats.totalWeight > remainingWeight ? 'text-red-400' : 'text-slate-200'
                    }`}>
                    {equipmentStats.totalWeight.toFixed(1)}t
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Slots:</span>
                  <span className={`font-medium ${equipmentStats.totalSlots > remainingSlots ? 'text-red-400' : 'text-slate-200'
                    }`}>
                    {equipmentStats.totalSlots}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Heat:</span>
                  <span className="font-medium text-orange-400">+{equipmentStats.totalHeat}</span>
                </div>
              </div>
            </div>

            {/* Note about the tray */}
            <div className="text-right">
              <div className="text-sm text-slate-300 font-medium">Equipment Tray Available</div>
              <div className="text-xs text-slate-400">
                Use the tray button on the right to manage allocated equipment →
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Equipment Browser - Natural Height with Scrolling */}
      <div className="flex-1 px-4 pb-4 min-h-0">
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <EquipmentBrowser
            onAddEquipment={addEquipmentToUnit}
            showAddButtons={!readOnly}
            actionButtonLabel="Add to unit"
            actionButtonIcon="+"
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};
