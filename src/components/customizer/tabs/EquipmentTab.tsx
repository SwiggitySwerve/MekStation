/**
 * Equipment Tab Component
 * 
 * Full-width equipment browser for adding equipment to the unit.
 * The loadout tray is now a global component visible across all tabs.
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 * @spec openspec/changes/unify-equipment-tab/specs/customizer-tabs/spec.md
 */

import React, { useCallback } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { EquipmentBrowser } from '../equipment/EquipmentBrowser';
import { IEquipmentItem } from '@/types/equipment';

// =============================================================================
// Types
// =============================================================================

interface EquipmentTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Equipment configuration tab
 * 
 * Full-width equipment browser. The loadout tray with mounted equipment
 * is now a global sidebar visible across all tabs.
 */
export function EquipmentTab({
  readOnly = false,
  className = '',
}: EquipmentTabProps) {
  // Get unit state from context
  const addEquipment = useUnitStore((s) => s.addEquipment);
  
  // Handle adding equipment
  const handleAddEquipment = useCallback((item: IEquipmentItem) => {
    if (readOnly) return;
    addEquipment(item);
  }, [addEquipment, readOnly]);
  
  return (
    <div className={`flex flex-col h-full p-4 ${className}`}>
      {/* Full-width Equipment Browser */}
      <EquipmentBrowser
        onAddEquipment={handleAddEquipment}
        className="flex-1 min-h-0"
      />
      
      {readOnly && (
        <div className="mt-4 bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-blue-300 text-sm">
          This unit is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}

export default EquipmentTab;
