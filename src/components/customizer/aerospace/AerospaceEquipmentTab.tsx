/**
 * Aerospace Equipment Tab Component
 *
 * Equipment browser and management for aerospace fighters.
 * Equipment is mounted by firing arc (Nose, Wings, Aft).
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4.2.3
 */

import React, { useCallback } from 'react';
import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { EquipmentBrowser } from '../equipment/EquipmentBrowser';
import { IEquipmentItem } from '@/types/equipment';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { IAerospaceMountedEquipment } from '@/types/unit/AerospaceInterfaces';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const AEROSPACE_ARC_OPTIONS: { value: AerospaceLocation; label: string }[] = [
  { value: AerospaceLocation.NOSE, label: 'Nose' },
  { value: AerospaceLocation.LEFT_WING, label: 'Left Wing' },
  { value: AerospaceLocation.RIGHT_WING, label: 'Right Wing' },
  { value: AerospaceLocation.AFT, label: 'Aft' },
  { value: AerospaceLocation.FUSELAGE, label: 'Fuselage' },
];

// =============================================================================
// Types
// =============================================================================

interface AerospaceEquipmentTabProps {
  readOnly?: boolean;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function AerospaceEquipmentTab({
  readOnly = false,
  className = '',
}: AerospaceEquipmentTabProps): React.ReactElement {
  // Get state from store
  const equipment = useAerospaceStore((s) => s.equipment);

  // Get actions
  const addEquipment = useAerospaceStore((s) => s.addEquipment);
  const removeEquipment = useAerospaceStore((s) => s.removeEquipment);
  const updateEquipmentArc = useAerospaceStore((s) => s.updateEquipmentArc);
  const clearAllEquipment = useAerospaceStore((s) => s.clearAllEquipment);

  // Handlers
  const handleAddEquipment = useCallback(
    (item: IEquipmentItem) => {
      if (readOnly) return;
      addEquipment(item, AerospaceLocation.NOSE);
    },
    [addEquipment, readOnly]
  );

  const handleRemoveEquipment = useCallback(
    (instanceId: string) => {
      if (readOnly) return;
      removeEquipment(instanceId);
    },
    [removeEquipment, readOnly]
  );

  const handleArcChange = useCallback(
    (instanceId: string, newArc: AerospaceLocation) => {
      if (readOnly) return;
      updateEquipmentArc(instanceId, newArc);
    },
    [updateEquipmentArc, readOnly]
  );

  const handleClearAll = useCallback(() => {
    if (readOnly) return;
    clearAllEquipment();
  }, [clearAllEquipment, readOnly]);

  return (
    <div className={`flex flex-col h-full gap-4 ${className}`} data-testid="aerospace-equipment-tab">
      {/* Equipment Browser */}
      <div className="flex-1 min-h-0" data-testid="aerospace-equipment-browser">
        <EquipmentBrowser
          onAddEquipment={handleAddEquipment}
          className="h-full"
        />
      </div>

      {/* Mounted Equipment Section */}
      <div className={cs.panel.main} data-testid="aerospace-mounted-equipment">
        <div className="flex items-center justify-between mb-3">
          <h3 className={cs.text.sectionTitle.replace('mb-4', 'mb-0')}>
            Mounted Equipment (<span data-testid="aerospace-equipment-count">{equipment.length}</span>)
          </h3>
          {equipment.length > 0 && !readOnly && (
            <button
              onClick={handleClearAll}
              className={`${cs.button.action} bg-red-600 hover:bg-red-500`}
              data-testid="aerospace-equipment-clear-all"
            >
              Clear All
            </button>
          )}
        </div>

        {equipment.length === 0 ? (
          <div className={cs.panel.empty} data-testid="aerospace-equipment-empty">
            <p className="text-text-theme-secondary">No equipment mounted</p>
            <p className="text-xs text-text-theme-secondary/70 mt-1">
              Add equipment from the browser above
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto" data-testid="aerospace-equipment-list">
            {equipment.map((item) => (
              <MountedEquipmentRow
                key={item.id}
                item={item}
                readOnly={readOnly}
                onArcChange={handleArcChange}
                onRemove={handleRemoveEquipment}
              />
            ))}
          </div>
        )}
      </div>

      {readOnly && (
        <div className={cs.panel.notice}>
          This aerospace fighter is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Mounted Equipment Row
// =============================================================================

interface MountedEquipmentRowProps {
  item: IAerospaceMountedEquipment;
  readOnly: boolean;
  onArcChange: (instanceId: string, arc: AerospaceLocation) => void;
  onRemove: (instanceId: string) => void;
}

function MountedEquipmentRow({
  item,
  readOnly,
  onArcChange,
  onRemove,
}: MountedEquipmentRowProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2 p-2 bg-surface-raised/50 rounded border border-border-theme-subtle" data-testid={`aerospace-equipment-row-${item.id}`}>
      {/* Equipment Name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white truncate block" data-testid={`aerospace-equipment-name-${item.id}`}>{item.name}</span>
      </div>

      {/* Arc Selector */}
      <select
        value={item.location}
        onChange={(e) => onArcChange(item.id, e.target.value as AerospaceLocation)}
        disabled={readOnly}
        className={`${cs.select.inline} w-28`}
        data-testid={`aerospace-equipment-arc-${item.id}`}
      >
        {AEROSPACE_ARC_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(item.id)}
        disabled={readOnly}
        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
        title="Remove"
        data-testid={`aerospace-equipment-remove-${item.id}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default AerospaceEquipmentTab;
