/**
 * Equipment Tab - equipment browser/catalog
 *
 * Shows the equipment database for adding items to the unit.
 * Equipped items are displayed in the GlobalLoadoutTray sidebar (desktop)
 * or BottomSheetTray (mobile), not duplicated here.
 *
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React, { useCallback, useEffect, useState } from 'react';

import { useUnitStore } from '@/stores/useUnitStore';
import { IEquipmentItem } from '@/types/equipment';

import { CatalogPlacementDialog } from '../equipment/CatalogPlacementDialog';
import { EquipmentBrowser } from '../equipment/EquipmentBrowser';

interface EquipmentTabProps {
  readOnly?: boolean;
  className?: string;
}

export function EquipmentTab({
  readOnly = false,
  className = '',
}: EquipmentTabProps): React.ReactElement {
  const unitId = useUnitStore((s) => s.id);
  const addEquipment = useUnitStore((s) => s.addEquipment);
  const [placement, setPlacement] = useState<{
    unitId: string;
    equipment: IEquipmentItem;
  } | null>(null);
  const [placementMessage, setPlacementMessage] = useState('');
  useEffect(() => {
    setPlacement(null);
    setPlacementMessage('');
  }, [unitId]);

  const handleAddEquipment = useCallback(
    (item: IEquipmentItem) => {
      if (readOnly) return;
      addEquipment(item);
      setPlacementMessage('');
    },
    [addEquipment, readOnly],
  );

  return (
    <div
      className={`flex h-full min-h-0 flex-col max-sm:h-[calc(100%+var(--workspace-bottom-gap))] ${className}`}
    >
      <EquipmentBrowser
        key={unitId}
        readOnly={readOnly}
        addHint="Added unassigned. Choose a location in Critical Slots."
        onAddEquipment={handleAddEquipment}
        onAddAndPlace={(equipment) => {
          if (!readOnly) {
            setPlacement({ unitId, equipment });
            setPlacementMessage('');
          }
        }}
        className="min-h-0 flex-1"
      />

      {placement && placement.unitId === unitId && (
        <CatalogPlacementDialog
          key={`${unitId}:${placement.equipment.id}`}
          equipment={placement.equipment}
          readOnly={readOnly}
          onClose={() => setPlacement(null)}
          onPlaced={(message) => {
            setPlacement(null);
            setPlacementMessage(message);
          }}
        />
      )}
      {placementMessage && (
        <p
          role="status"
          className="text-text-theme-secondary shrink-0 px-3 py-2 text-xs"
        >
          {placementMessage}
        </p>
      )}
      {readOnly && (
        <div className="rounded-lg border border-blue-700 bg-blue-900/30 p-3 text-xs text-blue-300">
          This unit is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}

export default EquipmentTab;
