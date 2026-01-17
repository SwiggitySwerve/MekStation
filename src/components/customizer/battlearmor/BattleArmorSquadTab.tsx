/**
 * Battle Armor Squad Tab Component
 *
 * Configuration of squad size, armor, and per-trooper equipment.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.1.3
 */

import React, { useCallback } from 'react';
import { useBattleArmorStore } from '@/stores/useBattleArmorStore';
import { EquipmentBrowser } from '../equipment/EquipmentBrowser';
import { IEquipmentItem } from '@/types/equipment';
import { BattleArmorLocation } from '@/types/construction/UnitLocation';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const LOCATION_OPTIONS: { value: BattleArmorLocation; label: string }[] = [
  { value: BattleArmorLocation.SQUAD, label: 'Squad' },
  { value: BattleArmorLocation.BODY, label: 'Body' },
  { value: BattleArmorLocation.LEFT_ARM, label: 'Left Arm' },
  { value: BattleArmorLocation.RIGHT_ARM, label: 'Right Arm' },
  { value: BattleArmorLocation.TURRET, label: 'Turret' },
];

// =============================================================================
// Types
// =============================================================================

interface BattleArmorSquadTabProps {
  readOnly?: boolean;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function BattleArmorSquadTab({
  readOnly = false,
  className = '',
}: BattleArmorSquadTabProps): React.ReactElement {
  // Get state from store
  const squadSize = useBattleArmorStore((s) => s.squadSize);
  const armorPerTrooper = useBattleArmorStore((s) => s.armorPerTrooper);
  const hasAPMount = useBattleArmorStore((s) => s.hasAPMount);
  const hasModularMount = useBattleArmorStore((s) => s.hasModularMount);
  const hasTurretMount = useBattleArmorStore((s) => s.hasTurretMount);
  const equipment = useBattleArmorStore((s) => s.equipment);

  // Get actions
  const setSquadSize = useBattleArmorStore((s) => s.setSquadSize);
  const setArmorPerTrooper = useBattleArmorStore((s) => s.setArmorPerTrooper);
  const setAPMount = useBattleArmorStore((s) => s.setAPMount);
  const setModularMount = useBattleArmorStore((s) => s.setModularMount);
  const setTurretMount = useBattleArmorStore((s) => s.setTurretMount);
  const addEquipment = useBattleArmorStore((s) => s.addEquipment);
  const removeEquipment = useBattleArmorStore((s) => s.removeEquipment);
  const updateEquipmentLocation = useBattleArmorStore((s) => s.updateEquipmentLocation);
  const clearAllEquipment = useBattleArmorStore((s) => s.clearAllEquipment);

  // Handlers
  const handleAddEquipment = useCallback(
    (item: IEquipmentItem) => {
      if (readOnly) return;
      addEquipment(item, BattleArmorLocation.SQUAD);
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

  const handleLocationChange = useCallback(
    (instanceId: string, location: BattleArmorLocation) => {
      if (readOnly) return;
      updateEquipmentLocation(instanceId, location);
    },
    [updateEquipmentLocation, readOnly]
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Squad Configuration */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Squad Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={cs.text.label}>Squad Size</label>
            <input
              type="number"
              value={squadSize}
              onChange={(e) => !readOnly && setSquadSize(Number(e.target.value))}
              disabled={readOnly}
              min={1}
              max={6}
              className={cs.input.full}
            />
            <p className={cs.text.secondary}>Number of troopers (1-6)</p>
          </div>
          <div>
            <label className={cs.text.label}>Armor/Trooper</label>
            <input
              type="number"
              value={armorPerTrooper}
              onChange={(e) => !readOnly && setArmorPerTrooper(Number(e.target.value))}
              disabled={readOnly}
              min={0}
              max={14}
              className={cs.input.full}
            />
            <p className={cs.text.secondary}>
              Total squad armor: {squadSize * armorPerTrooper}
            </p>
          </div>
        </div>
      </div>

      {/* Mount Options */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Mount Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAPMount}
              onChange={(e) => !readOnly && setAPMount(e.target.checked)}
              disabled={readOnly}
              className="rounded border-border-theme bg-surface-raised"
            />
            <span className="text-white text-sm">Anti-Personnel Mount</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasModularMount}
              onChange={(e) => !readOnly && setModularMount(e.target.checked)}
              disabled={readOnly}
              className="rounded border-border-theme bg-surface-raised"
            />
            <span className="text-white text-sm">Modular Mount</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasTurretMount}
              onChange={(e) => !readOnly && setTurretMount(e.target.checked)}
              disabled={readOnly}
              className="rounded border-border-theme bg-surface-raised"
            />
            <span className="text-white text-sm">Turret Mount</span>
          </label>
        </div>
      </div>

      {/* Equipment Browser */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Equipment</h3>
        <div className="flex-1 min-h-0">
          <EquipmentBrowser
            onAddEquipment={handleAddEquipment}
            className="h-64"
          />
        </div>
      </div>

      {/* Mounted Equipment */}
      <div className={cs.panel.main}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={cs.text.sectionTitle.replace('mb-4', 'mb-0')}>
            Mounted Equipment ({equipment.length})
          </h3>
          {equipment.length > 0 && !readOnly && (
            <button
              onClick={() => clearAllEquipment()}
              className={`${cs.button.action} bg-red-600 hover:bg-red-500`}
            >
              Clear All
            </button>
          )}
        </div>

        {equipment.length === 0 ? (
          <p className={cs.panel.empty}>No equipment mounted</p>
        ) : (
          <div className="space-y-2">
            {equipment.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-surface-raised p-2 rounded"
              >
                <span className="text-white text-sm">{item.name}</span>
                <div className="flex items-center gap-2">
                  <select
                    value={item.location}
                    onChange={(e) =>
                      handleLocationChange(item.id, e.target.value as BattleArmorLocation)
                    }
                    disabled={readOnly}
                    className={cs.select.compact}
                  >
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc.value} value={loc.value}>
                        {loc.label}
                      </option>
                    ))}
                  </select>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveEquipment(item.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BattleArmorSquadTab;
