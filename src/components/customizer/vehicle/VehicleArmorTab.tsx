/**
 * Vehicle Armor Tab Component
 *
 * Configuration of vehicle armor type, tonnage, and per-location allocation.
 * Vehicles have simpler armor distribution: Front, Left, Right, Rear, Turret (optional), Rotor (VTOL).
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.2
 */

import React, { useCallback, useMemo } from 'react';
import { useVehicleStore } from '@/stores/useVehicleStore';
import { ArmorTypeEnum, getArmorDefinition } from '@/types/construction/ArmorType';
import { VehicleLocation, VTOLLocation } from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { getTotalVehicleArmor } from '@/stores/vehicleState';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const ARMOR_TYPE_OPTIONS: { value: ArmorTypeEnum; label: string }[] = [
  { value: ArmorTypeEnum.STANDARD, label: 'Standard' },
  { value: ArmorTypeEnum.FERRO_FIBROUS_IS, label: 'Ferro-Fibrous (IS)' },
  { value: ArmorTypeEnum.FERRO_FIBROUS_CLAN, label: 'Ferro-Fibrous (Clan)' },
  { value: ArmorTypeEnum.LIGHT_FERRO, label: 'Light Ferro-Fibrous' },
  { value: ArmorTypeEnum.HEAVY_FERRO, label: 'Heavy Ferro-Fibrous' },
  { value: ArmorTypeEnum.STEALTH, label: 'Stealth' },
  { value: ArmorTypeEnum.HARDENED, label: 'Hardened' },
  { value: ArmorTypeEnum.REACTIVE, label: 'Reactive' },
  { value: ArmorTypeEnum.REFLECTIVE, label: 'Reflective (Laser)' },
];

// Vehicle armor locations with labels
const VEHICLE_LOCATIONS: { location: VehicleLocation | VTOLLocation; label: string }[] = [
  { location: VehicleLocation.FRONT, label: 'Front' },
  { location: VehicleLocation.LEFT, label: 'Left Side' },
  { location: VehicleLocation.RIGHT, label: 'Right Side' },
  { location: VehicleLocation.REAR, label: 'Rear' },
  { location: VehicleLocation.TURRET, label: 'Turret' },
];

// =============================================================================
// Types
// =============================================================================

interface VehicleArmorTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate armor points from tonnage
 */
function calculateArmorPoints(tonnage: number, armorType: ArmorTypeEnum): number {
  const def = getArmorDefinition(armorType);
  const pointsPerTon = def?.pointsPerTon ?? 16;
  return Math.floor(tonnage * pointsPerTon);
}

/**
 * Get max armor for a vehicle location based on tonnage
 * Vehicles use different formulas than mechs
 */
function getMaxVehicleArmorForLocation(
  tonnage: number,
  location: VehicleLocation | VTOLLocation,
  hasTurret: boolean,
  isVTOL: boolean
): number {
  // Vehicle armor maximums are based on tonnage and location
  // These are simplified approximations - real values depend on internal structure
  const baseStructure = Math.floor(tonnage / 10) + 1;

  switch (location) {
    case VehicleLocation.FRONT:
      return baseStructure * 4; // Front gets most protection
    case VehicleLocation.LEFT:
    case VehicleLocation.RIGHT:
      return baseStructure * 3;
    case VehicleLocation.REAR:
      return baseStructure * 2;
    case VehicleLocation.TURRET:
      return hasTurret ? baseStructure * 2 : 0;
    case VTOLLocation.ROTOR:
      return isVTOL ? 2 : 0; // Rotors have fixed max of 2
    default:
      return 0;
  }
}

/**
 * Get max total armor for a vehicle
 */
function getMaxVehicleArmor(tonnage: number, hasTurret: boolean, isVTOL: boolean): number {
  let total = 0;
  total += getMaxVehicleArmorForLocation(tonnage, VehicleLocation.FRONT, hasTurret, isVTOL);
  total += getMaxVehicleArmorForLocation(tonnage, VehicleLocation.LEFT, hasTurret, isVTOL);
  total += getMaxVehicleArmorForLocation(tonnage, VehicleLocation.RIGHT, hasTurret, isVTOL);
  total += getMaxVehicleArmorForLocation(tonnage, VehicleLocation.REAR, hasTurret, isVTOL);
  if (hasTurret) {
    total += getMaxVehicleArmorForLocation(tonnage, VehicleLocation.TURRET, hasTurret, isVTOL);
  }
  if (isVTOL) {
    total += getMaxVehicleArmorForLocation(tonnage, VTOLLocation.ROTOR, hasTurret, isVTOL);
  }
  return total;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Vehicle armor configuration tab
 */
export function VehicleArmorTab({
  readOnly = false,
  className = '',
}: VehicleArmorTabProps): React.ReactElement {
  // Get vehicle state from context
  const tonnage = useVehicleStore((s) => s.tonnage);
  const motionType = useVehicleStore((s) => s.motionType);
  const turret = useVehicleStore((s) => s.turret);
  const armorType = useVehicleStore((s) => s.armorType);
  const armorTonnage = useVehicleStore((s) => s.armorTonnage);
  const armorAllocation = useVehicleStore((s) => s.armorAllocation);

  // Get actions from context
  const setArmorType = useVehicleStore((s) => s.setArmorType);
  const setArmorTonnage = useVehicleStore((s) => s.setArmorTonnage);
  const setLocationArmor = useVehicleStore((s) => s.setLocationArmor);
  const autoAllocateArmor = useVehicleStore((s) => s.autoAllocateArmor);
  const clearAllArmor = useVehicleStore((s) => s.clearAllArmor);

  // Derived state
  const isVTOL = motionType === GroundMotionType.VTOL;
  const hasTurret = turret !== null;

  // Calculate derived values
  const armorDef = useMemo(() => getArmorDefinition(armorType), [armorType]);
  const pointsPerTon = armorDef?.pointsPerTon ?? 16;
  const availablePoints = useMemo(
    () => calculateArmorPoints(armorTonnage, armorType),
    [armorTonnage, armorType]
  );
  const allocatedPoints = useMemo(
    () => getTotalVehicleArmor(armorAllocation, hasTurret),
    [armorAllocation, hasTurret]
  );
  const maxTotalArmor = useMemo(
    () => getMaxVehicleArmor(tonnage, hasTurret, isVTOL),
    [tonnage, hasTurret, isVTOL]
  );

  // Calculate max useful tonnage
  const maxUsefulTonnage = useMemo(
    () => ceilToHalfTon(maxTotalArmor / pointsPerTon),
    [maxTotalArmor, pointsPerTon]
  );

  // Points status
  const unallocatedPoints = availablePoints - allocatedPoints;
  const wastedPoints = Math.max(0, availablePoints - maxTotalArmor);

  // Handlers
  const handleArmorTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setArmorType(e.target.value as ArmorTypeEnum);
    },
    [setArmorType]
  );

  const handleArmorTonnageChange = useCallback(
    (newTonnage: number) => {
      const clamped = Math.max(0, Math.min(maxUsefulTonnage, newTonnage));
      setArmorTonnage(clamped);
    },
    [setArmorTonnage, maxUsefulTonnage]
  );

  const handleLocationArmorChange = useCallback(
    (location: VehicleLocation | VTOLLocation, points: number) => {
      const max = getMaxVehicleArmorForLocation(tonnage, location, hasTurret, isVTOL);
      const clamped = Math.max(0, Math.min(max, points));
      setLocationArmor(location, clamped);
    },
    [setLocationArmor, tonnage, hasTurret, isVTOL]
  );

  const handleMaximizeArmor = useCallback(() => {
    setArmorTonnage(maxUsefulTonnage);
  }, [setArmorTonnage, maxUsefulTonnage]);

  // Build location list based on vehicle type
  const locations = useMemo(() => {
    const locs = [...VEHICLE_LOCATIONS];
    // Filter out turret if no turret
    const filtered = locs.filter(
      (l) => l.location !== VehicleLocation.TURRET || hasTurret
    );
    // Add rotor for VTOLs
    if (isVTOL) {
      filtered.push({ location: VTOLLocation.ROTOR, label: 'Rotor' });
    }
    return filtered;
  }, [hasTurret, isVTOL]);

  return (
    <div className={`${cs.panel.main} ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Armor Configuration Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Armor Configuration</h3>

          {/* Armor Type */}
          <div className="mb-4">
            <label className={cs.text.label}>Armor Type</label>
            <select
              value={armorType}
              onChange={handleArmorTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
            >
              {ARMOR_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Armor Tonnage */}
          <div className="mb-4">
            <label className={cs.text.label}>Armor Tonnage</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={armorTonnage}
                onChange={(e) => handleArmorTonnageChange(Number(e.target.value))}
                min={0}
                max={maxUsefulTonnage}
                step={0.5}
                disabled={readOnly}
                className={`${cs.input.number} w-20`}
              />
              <span className={cs.text.secondary}>/ {maxUsefulTonnage} tons max</span>
            </div>
          </div>

          {/* Points Summary */}
          <div className={`${cs.panel.summary} mb-4`}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className={cs.text.label}>Available Points:</span>
                <span className={`${cs.text.value} ml-2`}>{availablePoints}</span>
              </div>
              <div>
                <span className={cs.text.label}>Allocated:</span>
                <span
                  className={`ml-2 ${
                    allocatedPoints > availablePoints
                      ? cs.text.valueNegative
                      : cs.text.value
                  }`}
                >
                  {allocatedPoints}
                </span>
              </div>
              <div>
                <span className={cs.text.label}>Unallocated:</span>
                <span
                  className={`ml-2 ${
                    unallocatedPoints < 0
                      ? cs.text.valueNegative
                      : unallocatedPoints > 0
                      ? cs.text.valueWarning
                      : cs.text.value
                  }`}
                >
                  {unallocatedPoints}
                </span>
              </div>
              <div>
                <span className={cs.text.label}>Max Armor:</span>
                <span className={`${cs.text.value} ml-2`}>{maxTotalArmor}</span>
              </div>
            </div>
            {wastedPoints > 0 && (
              <p className="text-amber-400 text-xs mt-2">
                {wastedPoints} points wasted (exceeds maximum)
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={autoAllocateArmor}
              disabled={readOnly || availablePoints === 0}
              className={cs.button.action}
            >
              Auto-Allocate
            </button>
            <button
              onClick={handleMaximizeArmor}
              disabled={readOnly}
              className={cs.button.action}
            >
              Maximize
            </button>
            <button
              onClick={clearAllArmor}
              disabled={readOnly}
              className={`${cs.button.action} bg-red-600 hover:bg-red-500`}
            >
              Clear
            </button>
          </div>
        </section>

        {/* Location Allocation Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Location Allocation</h3>

          <div className="space-y-3">
            {locations.map(({ location, label }) => {
              const currentValue = armorAllocation[location] ?? 0;
              const maxValue = getMaxVehicleArmorForLocation(
                tonnage,
                location,
                hasTurret,
                isVTOL
              );

              return (
                <div key={location} className="flex items-center gap-3">
                  <span className={`${cs.text.label} w-24`}>{label}</span>
                  <input
                    type="range"
                    value={currentValue}
                    onChange={(e) =>
                      handleLocationArmorChange(location, Number(e.target.value))
                    }
                    min={0}
                    max={maxValue}
                    disabled={readOnly || maxValue === 0}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 w-20">
                    <input
                      type="number"
                      value={currentValue}
                      onChange={(e) =>
                        handleLocationArmorChange(location, Number(e.target.value))
                      }
                      min={0}
                      max={maxValue}
                      disabled={readOnly || maxValue === 0}
                      className={`${cs.input.number} w-12`}
                    />
                    <span className={cs.text.secondary}>/{maxValue}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple Vehicle Diagram */}
          <div className="mt-6 p-4 bg-surface-raised/30 rounded-lg">
            <VehicleArmorDiagramSimple
              allocation={armorAllocation}
              hasTurret={hasTurret}
              isVTOL={isVTOL}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// =============================================================================
// Simple Vehicle Armor Diagram
// =============================================================================

interface VehicleArmorDiagramSimpleProps {
  allocation: Record<string, number>;
  hasTurret: boolean;
  isVTOL: boolean;
}

/**
 * Simple text-based vehicle armor diagram
 * A visual diagram component will be created separately
 */
function VehicleArmorDiagramSimple({
  allocation,
  hasTurret,
  isVTOL,
}: VehicleArmorDiagramSimpleProps): React.ReactElement {
  return (
    <div className="text-center text-sm font-mono">
      {/* Front */}
      <div className="mb-2">
        <span className="text-text-theme-secondary">FRONT</span>
        <div className="text-lg font-bold text-cyan-400">
          {allocation[VehicleLocation.FRONT] ?? 0}
        </div>
      </div>

      {/* Middle row: Left - Turret/Body - Right */}
      <div className="flex justify-center items-center gap-8 mb-2">
        <div>
          <span className="text-text-theme-secondary">LEFT</span>
          <div className="text-lg font-bold text-cyan-400">
            {allocation[VehicleLocation.LEFT] ?? 0}
          </div>
        </div>

        {hasTurret && (
          <div className="px-4 py-2 border border-border-theme rounded">
            <span className="text-text-theme-secondary">TURRET</span>
            <div className="text-lg font-bold text-amber-400">
              {allocation[VehicleLocation.TURRET] ?? 0}
            </div>
          </div>
        )}

        {isVTOL && (
          <div className="px-4 py-2 border border-border-theme rounded">
            <span className="text-text-theme-secondary">ROTOR</span>
            <div className="text-lg font-bold text-sky-400">
              {allocation[VTOLLocation.ROTOR] ?? 0}
            </div>
          </div>
        )}

        <div>
          <span className="text-text-theme-secondary">RIGHT</span>
          <div className="text-lg font-bold text-cyan-400">
            {allocation[VehicleLocation.RIGHT] ?? 0}
          </div>
        </div>
      </div>

      {/* Rear */}
      <div>
        <span className="text-text-theme-secondary">REAR</span>
        <div className="text-lg font-bold text-cyan-400">
          {allocation[VehicleLocation.REAR] ?? 0}
        </div>
      </div>
    </div>
  );
}

export default VehicleArmorTab;
