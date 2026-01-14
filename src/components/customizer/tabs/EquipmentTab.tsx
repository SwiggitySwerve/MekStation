/**
 * Equipment Tab - equipment browser with equipped summary
 * @spec openspec/specs/equipment-browser/spec.md
 * @spec openspec/changes/unify-equipment-tab/specs/customizer-tabs/spec.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { EquipmentBrowser } from '../equipment/EquipmentBrowser';
import { EquippedSummary } from '../equipment/EquippedSummary';
import { IEquipmentItem, EquipmentCategory } from '@/types/equipment';
import type { LoadoutEquipmentItem } from '../equipment/GlobalLoadoutTray';

interface EquipmentTabProps {
  readOnly?: boolean;
  className?: string;
}

export function EquipmentTab({
  readOnly = false,
  className = '',
}: EquipmentTabProps): React.ReactElement {
  const addEquipment = useUnitStore((s) => s.addEquipment);
  const removeEquipment = useUnitStore((s) => s.removeEquipment);
  const equipment = useUnitStore((s) => s.equipment);
  
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  
  const handleAddEquipment = useCallback((item: IEquipmentItem) => {
    if (readOnly) return;
    addEquipment(item);
  }, [addEquipment, readOnly]);
  
  const handleRemoveEquipment = useCallback((instanceId: string) => {
    if (readOnly) return;
    removeEquipment(instanceId);
    if (selectedEquipmentId === instanceId) {
      setSelectedEquipmentId(null);
    }
  }, [removeEquipment, readOnly, selectedEquipmentId]);
  
  const handleSelectEquipment = useCallback((instanceId: string | null) => {
    setSelectedEquipmentId(instanceId);
  }, []);
  
  const loadoutEquipment: LoadoutEquipmentItem[] = useMemo(() => {
    return equipment.map(eq => ({
      instanceId: eq.instanceId,
      equipmentId: eq.equipmentId,
      name: eq.name,
      category: eq.category as EquipmentCategory,
      weight: eq.weight,
      criticalSlots: eq.criticalSlots,
      isAllocated: eq.location !== undefined,
      location: eq.location,
      isRemovable: eq.isRemovable ?? true,
      isOmniPodMounted: eq.isOmniPodMounted,
    }));
  }, [equipment]);
  
  return (
    <div className={`flex flex-col h-full p-3 gap-2 ${className}`}>
      <EquippedSummary
        equipment={loadoutEquipment}
        onRemoveEquipment={handleRemoveEquipment}
        onSelectEquipment={handleSelectEquipment}
        selectedEquipmentId={selectedEquipmentId}
      />
      
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
