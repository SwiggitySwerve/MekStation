/**
 * Vehicle Equipment Tab Component
 *
 * Equipment browser and management for vehicles.
 * Wraps the shared EquipmentBrowser and displays mounted equipment
 * with vehicle-specific options (turret mounting, location selection).
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.3
 */

import React, { useCallback, useMemo } from 'react';
import { useVehicleStore } from '@/stores/useVehicleStore';
import { EquipmentBrowser } from '../equipment/EquipmentBrowser';
import { IEquipmentItem } from '@/types/equipment';
import { VehicleLocation, VTOLLocation } from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { IVehicleMountedEquipment } from '@/types/unit/VehicleInterfaces';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const VEHICLE_LOCATION_OPTIONS: { value: VehicleLocation; label: string }[] = [
  { value: VehicleLocation.FRONT, label: 'Front' },
  { value: VehicleLocation.LEFT, label: 'Left' },
  { value: VehicleLocation.RIGHT, label: 'Right' },
  { value: VehicleLocation.REAR, label: 'Rear' },
  { value: VehicleLocation.TURRET, label: 'Turret' },
  { value: VehicleLocation.BODY, label: 'Body' },
];

const VTOL_LOCATION_OPTIONS: { value: VehicleLocation | VTOLLocation; label: string }[] = [
  { value: VehicleLocation.FRONT, label: 'Front' },
  { value: VehicleLocation.LEFT, label: 'Left' },
  { value: VehicleLocation.RIGHT, label: 'Right' },
  { value: VehicleLocation.REAR, label: 'Rear' },
  { value: VehicleLocation.TURRET, label: 'Chin Turret' },
  { value: VehicleLocation.BODY, label: 'Body' },
  { value: VTOLLocation.ROTOR, label: 'Rotor' },
];

// =============================================================================
// Types
// =============================================================================

interface VehicleEquipmentTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Vehicle equipment management tab
 */
export function VehicleEquipmentTab({
  readOnly = false,
  className = '',
}: VehicleEquipmentTabProps): React.ReactElement {
  // Get state from store
  const motionType = useVehicleStore((s) => s.motionType);
  const turret = useVehicleStore((s) => s.turret);
  const equipment = useVehicleStore((s) => s.equipment);

  // Get actions from store
  const addEquipment = useVehicleStore((s) => s.addEquipment);
  const removeEquipment = useVehicleStore((s) => s.removeEquipment);
  const updateEquipmentLocation = useVehicleStore((s) => s.updateEquipmentLocation);
  const setEquipmentRearMounted = useVehicleStore((s) => s.setEquipmentRearMounted);
  const clearAllEquipment = useVehicleStore((s) => s.clearAllEquipment);

  // Derived state
  const isVTOL = motionType === GroundMotionType.VTOL;
  const hasTurret = turret !== null;

  // Build location options based on vehicle type
  const locationOptions = useMemo(() => {
    const baseOptions = isVTOL ? VTOL_LOCATION_OPTIONS : VEHICLE_LOCATION_OPTIONS;
    // Filter out turret if no turret configured
    return baseOptions.filter(
      (opt) =>
        opt.value !== VehicleLocation.TURRET || hasTurret
    );
  }, [isVTOL, hasTurret]);

  // Handlers
  const handleAddEquipment = useCallback(
    (item: IEquipmentItem) => {
      if (readOnly) return;
      // Add to BODY by default, not turret mounted
      addEquipment(item, VehicleLocation.BODY, false);
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
    (instanceId: string, newLocation: VehicleLocation | VTOLLocation) => {
      if (readOnly) return;
      // If moving to turret, mark as turret mounted
      const isTurretMounted = newLocation === VehicleLocation.TURRET;
      updateEquipmentLocation(instanceId, newLocation, isTurretMounted);
    },
    [updateEquipmentLocation, readOnly]
  );

  const handleRearMountedChange = useCallback(
    (instanceId: string, isRearMounted: boolean) => {
      if (readOnly) return;
      setEquipmentRearMounted(instanceId, isRearMounted);
    },
    [setEquipmentRearMounted, readOnly]
  );

  const handleClearAll = useCallback(() => {
    if (readOnly) return;
    clearAllEquipment();
  }, [clearAllEquipment, readOnly]);

  return (
    <div className={`flex flex-col h-full gap-4 ${className}`} data-testid="vehicle-equipment-tab">
      {/* Equipment Browser Section */}
      <div className="flex-1 min-h-0" data-testid="vehicle-equipment-browser">
        <EquipmentBrowser
          onAddEquipment={handleAddEquipment}
          className="h-full"
        />
      </div>

      {/* Mounted Equipment Section */}
      <div className={cs.panel.main} data-testid="vehicle-mounted-equipment">
        <div className="flex items-center justify-between mb-3">
          <h3 className={cs.text.sectionTitle.replace('mb-4', 'mb-0')}>
            Mounted Equipment ({equipment.length})
          </h3>
          {equipment.length > 0 && !readOnly && (
            <button
              onClick={handleClearAll}
              className={`${cs.button.action} bg-red-600 hover:bg-red-500`}
            >
              Clear All
            </button>
          )}
        </div>

        {equipment.length === 0 ? (
          <div className={cs.panel.empty}>
            <p className="text-text-theme-secondary">No equipment mounted</p>
            <p className="text-xs text-text-theme-secondary/70 mt-1">
              Add equipment from the browser above
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {equipment.map((item) => (
              <MountedEquipmentRow
                key={item.id}
                item={item}
                locationOptions={locationOptions}
                hasTurret={hasTurret}
                readOnly={readOnly}
                onLocationChange={handleLocationChange}
                onRearMountedChange={handleRearMountedChange}
                onRemove={handleRemoveEquipment}
              />
            ))}
          </div>
        )}
      </div>

      {readOnly && (
        <div className={cs.panel.notice}>
          This vehicle is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Mounted Equipment Row
// =============================================================================

interface MountedEquipmentRowProps {
  item: IVehicleMountedEquipment;
  locationOptions: { value: VehicleLocation | VTOLLocation; label: string }[];
  hasTurret: boolean;
  readOnly: boolean;
  onLocationChange: (instanceId: string, location: VehicleLocation | VTOLLocation) => void;
  onRearMountedChange: (instanceId: string, isRearMounted: boolean) => void;
  onRemove: (instanceId: string) => void;
}

function MountedEquipmentRow({
  item,
  locationOptions,
  hasTurret,
  readOnly,
  onLocationChange,
  onRearMountedChange,
  onRemove,
}: MountedEquipmentRowProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2 p-2 bg-surface-raised/50 rounded border border-border-theme-subtle">
      {/* Equipment Name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white truncate block">{item.name}</span>
        <div className="flex items-center gap-2 text-xs text-text-theme-secondary">
          {item.isTurretMounted && hasTurret && (
            <span className="text-amber-400">Turret</span>
          )}
          {item.isRearMounted && (
            <span className="text-cyan-400">Rear-facing</span>
          )}
        </div>
      </div>

      {/* Location Selector */}
      <select
        value={item.location}
        onChange={(e) => onLocationChange(item.id, e.target.value as VehicleLocation | VTOLLocation)}
        disabled={readOnly}
        className={`${cs.select.inline} w-24`}
      >
        {locationOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Rear Mounted Toggle (for weapons) */}
      <label className="flex items-center gap-1 text-xs text-text-theme-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={item.isRearMounted}
          onChange={(e) => onRearMountedChange(item.id, e.target.checked)}
          disabled={readOnly}
          className="w-3 h-3"
        />
        <span>Rear</span>
      </label>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(item.id)}
        disabled={readOnly}
        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
        title="Remove"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default VehicleEquipmentTab;
