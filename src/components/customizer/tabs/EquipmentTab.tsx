/**
 * Equipment Tab - equipment browser/catalog
 * 
 * Shows the equipment database for adding items to the unit.
 * Equipped items are displayed in the GlobalLoadoutTray sidebar (desktop)
 * or BottomSheetTray (mobile), not duplicated here.
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React, { useCallback } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { EquipmentBrowser } from '../equipment/EquipmentBrowser';
import { IEquipmentItem } from '@/types/equipment';

interface EquipmentTabProps {
  readOnly?: boolean;
  className?: string;
}

export function EquipmentTab({
  readOnly = false,
  className = '',
}: EquipmentTabProps): React.ReactElement {
  const addEquipment = useUnitStore((s) => s.addEquipment);
  
  const handleAddEquipment = useCallback((item: IEquipmentItem) => {
    if (readOnly) return;
    addEquipment(item);
  }, [addEquipment, readOnly]);
  
  return (
    <div className={`flex flex-col h-full p-3 gap-2 ${className}`}>
      <EquipmentBrowser
        onAddEquipment={handleAddEquipment}
        className="flex-1 min-h-0"
      />
      
      {readOnly && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-blue-300 text-xs">
          This unit is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}

export default EquipmentTab;
