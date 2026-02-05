/**
 * Vehicle Turret Tab Component
 *
 * Management of vehicle turret configuration and turret-mounted weapons.
 * Allows configuring turret type, viewing turret weight capacity,
 * and managing which weapons are mounted in the turret.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.4
 */

import React, { useCallback, useMemo } from 'react';

import { useVehicleStore } from '@/stores/useVehicleStore';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  TurretType,
  IVehicleMountedEquipment,
} from '@/types/unit/VehicleInterfaces';

import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const TURRET_TYPE_OPTIONS: {
  value: TurretType;
  label: string;
  description: string;
}[] = [
  {
    value: TurretType.NONE,
    label: 'No Turret',
    description: 'Fixed weapon mounts only',
  },
  {
    value: TurretType.SINGLE,
    label: 'Single Turret',
    description: '360° rotation for weapons',
  },
  {
    value: TurretType.DUAL,
    label: 'Dual Turret',
    description: 'Two independent turrets',
  },
  {
    value: TurretType.CHIN,
    label: 'Chin Turret (VTOL)',
    description: 'Forward-facing VTOL turret',
  },
];

// =============================================================================
// Types
// =============================================================================

interface VehicleTurretTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Vehicle turret configuration and weapon management tab
 */
export function VehicleTurretTab({
  readOnly = false,
  className = '',
}: VehicleTurretTabProps): React.ReactElement {
  // Get state from store
  const tonnage = useVehicleStore((s) => s.tonnage);
  const motionType = useVehicleStore((s) => s.motionType);
  const turret = useVehicleStore((s) => s.turret);
  const equipment = useVehicleStore((s) => s.equipment);

  // Get actions from store
  const setTurretType = useVehicleStore((s) => s.setTurretType);
  const updateEquipmentLocation = useVehicleStore(
    (s) => s.updateEquipmentLocation,
  );

  // Derived state
  const isVTOL = motionType === GroundMotionType.VTOL;
  const hasTurret = turret !== null;

  // Filter turret options based on vehicle type
  const turretOptions = useMemo(() => {
    if (isVTOL) {
      // VTOLs use chin turrets
      return TURRET_TYPE_OPTIONS.filter(
        (opt) => opt.value === TurretType.NONE || opt.value === TurretType.CHIN,
      );
    }
    // Ground vehicles can have single or dual turrets
    return TURRET_TYPE_OPTIONS.filter((opt) => opt.value !== TurretType.CHIN);
  }, [isVTOL]);

  // Get turret-mounted equipment
  const turretEquipment = useMemo(() => {
    return equipment.filter((e) => e.isTurretMounted);
  }, [equipment]);

  // Get non-turret equipment that could be moved to turret
  const nonTurretEquipment = useMemo(() => {
    return equipment.filter((e) => !e.isTurretMounted);
  }, [equipment]);

  // Calculate turret weight usage (simplified - in real implementation would calculate from equipment data)
  const turretWeightUsed = turretEquipment.length * 0.5; // Placeholder calculation
  const turretMaxWeight = turret?.maxWeight ?? 0;
  const turretWeightPercent =
    turretMaxWeight > 0 ? (turretWeightUsed / turretMaxWeight) * 100 : 0;

  // Handlers
  const handleTurretTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (readOnly) return;
      setTurretType(e.target.value as TurretType);
    },
    [setTurretType, readOnly],
  );

  const handleMoveToTurret = useCallback(
    (instanceId: string) => {
      if (readOnly || !hasTurret) return;
      updateEquipmentLocation(instanceId, VehicleLocation.TURRET, true);
    },
    [updateEquipmentLocation, readOnly, hasTurret],
  );

  const handleRemoveFromTurret = useCallback(
    (instanceId: string) => {
      if (readOnly) return;
      // Move back to body, not turret mounted
      updateEquipmentLocation(instanceId, VehicleLocation.BODY, false);
    },
    [updateEquipmentLocation, readOnly],
  );

  return (
    <div className={`${cs.panel.main} ${className}`}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Turret Configuration Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Turret Configuration</h3>

          {/* Turret Type Selector */}
          <div className="mb-4">
            <label className={cs.text.label}>Turret Type</label>
            <select
              value={turret?.type ?? TurretType.NONE}
              onChange={handleTurretTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
            >
              {turretOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {turret && (
              <p className="text-text-theme-secondary mt-1 text-xs">
                {
                  turretOptions.find((o) => o.value === turret.type)
                    ?.description
                }
              </p>
            )}
          </div>

          {/* Turret Stats (when turret is configured) */}
          {hasTurret && (
            <div className={`${cs.panel.summary} mb-4`}>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className={cs.text.label}>Max Capacity:</span>
                  <span className={`${cs.text.value} ml-2`}>
                    {turretMaxWeight.toFixed(1)} tons
                  </span>
                </div>
                <div>
                  <span className={cs.text.label}>Weight Used:</span>
                  <span
                    className={`ml-2 ${
                      turretWeightUsed > turretMaxWeight
                        ? cs.text.valueNegative
                        : cs.text.value
                    }`}
                  >
                    {turretWeightUsed.toFixed(1)} tons
                  </span>
                </div>
                <div>
                  <span className={cs.text.label}>Rotation Arc:</span>
                  <span className={`${cs.text.value} ml-2`}>
                    {turret.rotationArc}°
                  </span>
                </div>
                <div>
                  <span className={cs.text.label}>Items Mounted:</span>
                  <span className={`${cs.text.value} ml-2`}>
                    {turretEquipment.length}
                  </span>
                </div>
              </div>

              {/* Weight Bar */}
              <div className="mt-3">
                <div className="bg-surface-base h-2 overflow-hidden rounded-full">
                  <div
                    className={`h-full transition-all ${
                      turretWeightPercent > 100
                        ? 'bg-red-500'
                        : turretWeightPercent > 75
                          ? 'bg-amber-500'
                          : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min(100, turretWeightPercent)}%` }}
                  />
                </div>
                <p className="text-text-theme-secondary mt-1 text-right text-xs">
                  {turretWeightPercent.toFixed(0)}% capacity used
                </p>
              </div>
            </div>
          )}

          {/* No Turret Message */}
          {!hasTurret && (
            <div className={cs.panel.empty}>
              <p className="text-text-theme-secondary">No turret configured</p>
              <p className="text-text-theme-secondary/70 mt-1 text-xs">
                Select a turret type above to enable turret weapon mounting
              </p>
            </div>
          )}

          {/* Turret Weight Info */}
          {hasTurret && (
            <div className="text-text-theme-secondary bg-surface-raised/30 rounded p-2 text-xs">
              <p className="text-text-theme-primary mb-1 font-medium">
                Turret Capacity
              </p>
              <p>
                Maximum turret weight is typically 10% of vehicle tonnage (
                {(tonnage * 0.1).toFixed(1)} tons for this {tonnage}-ton
                vehicle).
              </p>
            </div>
          )}
        </section>

        {/* Turret Weapons Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Turret Weapons</h3>

          {!hasTurret ? (
            <div className={cs.panel.empty}>
              <p className="text-text-theme-secondary">
                Configure a turret first
              </p>
            </div>
          ) : turretEquipment.length === 0 ? (
            <div className={cs.panel.empty}>
              <p className="text-text-theme-secondary">No weapons in turret</p>
              <p className="text-text-theme-secondary/70 mt-1 text-xs">
                Move weapons from the list below or add equipment in the
                Equipment tab
              </p>
            </div>
          ) : (
            <div className="mb-4 space-y-2">
              {turretEquipment.map((item) => (
                <TurretEquipmentRow
                  key={item.id}
                  item={item}
                  readOnly={readOnly}
                  onRemove={handleRemoveFromTurret}
                />
              ))}
            </div>
          )}

          {/* Available Equipment to Add to Turret */}
          {hasTurret && nonTurretEquipment.length > 0 && (
            <div className="mt-4">
              <h4 className="text-text-theme-secondary mb-2 text-sm font-medium">
                Available Equipment
              </h4>
              <div className="max-h-40 space-y-1 overflow-auto">
                {nonTurretEquipment.map((item) => (
                  <AvailableEquipmentRow
                    key={item.id}
                    item={item}
                    readOnly={readOnly}
                    onAddToTurret={handleMoveToTurret}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {readOnly && (
        <div className={`${cs.panel.notice} mt-4`}>
          This vehicle is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Turret Equipment Row
// =============================================================================

interface TurretEquipmentRowProps {
  item: IVehicleMountedEquipment;
  readOnly: boolean;
  onRemove: (instanceId: string) => void;
}

function TurretEquipmentRow({
  item,
  readOnly,
  onRemove,
}: TurretEquipmentRowProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2 rounded border border-amber-700/50 bg-amber-900/20 p-2">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white">{item.name}</span>
        {item.isRearMounted && (
          <span className="text-xs text-cyan-400">Rear-facing</span>
        )}
      </div>
      <button
        onClick={() => onRemove(item.id)}
        disabled={readOnly}
        className={`${cs.button.action} bg-slate-600 hover:bg-slate-500`}
        title="Remove from turret"
      >
        Remove
      </button>
    </div>
  );
}

// =============================================================================
// Available Equipment Row
// =============================================================================

interface AvailableEquipmentRowProps {
  item: IVehicleMountedEquipment;
  readOnly: boolean;
  onAddToTurret: (instanceId: string) => void;
}

function AvailableEquipmentRow({
  item,
  readOnly,
  onAddToTurret,
}: AvailableEquipmentRowProps): React.ReactElement {
  return (
    <div className="bg-surface-raised/30 flex items-center gap-2 rounded p-1.5 text-sm">
      <div className="min-w-0 flex-1">
        <span className="text-text-theme-secondary block truncate">
          {item.name}
        </span>
        <span className="text-text-theme-secondary/70 text-xs">
          {item.location}
        </span>
      </div>
      <button
        onClick={() => onAddToTurret(item.id)}
        disabled={readOnly}
        className="rounded bg-amber-700 px-2 py-0.5 text-xs text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        title="Move to turret"
      >
        + Turret
      </button>
    </div>
  );
}

export default VehicleTurretTab;
