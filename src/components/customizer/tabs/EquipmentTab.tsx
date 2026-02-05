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
import { IEquipmentItem } from '@/types/equipment';

import { EquipmentBrowser } from '../equipment/EquipmentBrowser';

interface EquipmentTabProps {
  readOnly?: boolean;
  className?: string;
}

export function EquipmentTab({
  readOnly = false,
  className = '',
}: EquipmentTabProps): React.ReactElement {
  const addEquipment = useUnitStore((s) => s.addEquipment);

  const handleAddEquipment = useCallback(
    (item: IEquipmentItem) => {
      if (readOnly) return;
      addEquipment(item);
    },
    [addEquipment, readOnly],
  );

  return (
    <div className={`flex h-full flex-col gap-2 p-3 ${className}`}>
      <EquipmentBrowser
        onAddEquipment={handleAddEquipment}
        className="min-h-0 flex-1"
      />

      {readOnly && (
        <div className="rounded-lg border border-blue-700 bg-blue-900/30 p-3 text-xs text-blue-300">
          This unit is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}

export default EquipmentTab;
