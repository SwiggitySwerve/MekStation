/**
 * Vehicle Armor Tab Component
 *
 * Configuration of vehicle armor type, tonnage, and per-location allocation.
 * Vehicles have simpler armor distribution: Front, Left, Right, Rear, Turret (optional), Rotor (VTOL).
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.2
 */

import React, { useCallback, useMemo } from "react";

import { useVehicleStore } from "@/stores/useVehicleStore";
import { getTotalVehicleArmor } from "@/stores/vehicleState";
import {
  ArmorTypeEnum,
  getArmorDefinition,
} from "@/types/construction/ArmorType";
import {
  VehicleLocation,
  VTOLLocation,
} from "@/types/construction/UnitLocation";
import { GroundMotionType } from "@/types/unit/BaseUnitInterfaces";
import { ceilToHalfTon } from "@/utils/physical/weightUtils";

import { customizerStyles as cs } from "../styles";
import { VehicleArmorDiagram } from "./VehicleArmorDiagram";
import {
  ARMOR_TYPE_OPTIONS,
  BASE_VEHICLE_LOCATIONS,
} from "./VehicleArmorTab.constants";
import {
  calculateArmorPoints,
  getMaxVehicleArmor,
  getMaxVehicleArmorForLocation,
  type VehicleArmorLocation,
} from "./VehicleArmorTab.utils";

interface VehicleArmorTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Vehicle armor configuration tab
 */
export function VehicleArmorTab({
  readOnly = false,
  className = "",
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
    [armorTonnage, armorType],
  );
  const allocatedPoints = useMemo(
    () => getTotalVehicleArmor(armorAllocation, hasTurret),
    [armorAllocation, hasTurret],
  );
  const maxTotalArmor = useMemo(
    () => getMaxVehicleArmor(tonnage, hasTurret, isVTOL),
    [tonnage, hasTurret, isVTOL],
  );

  // Calculate max useful tonnage
  const maxUsefulTonnage = useMemo(
    () => ceilToHalfTon(maxTotalArmor / pointsPerTon),
    [maxTotalArmor, pointsPerTon],
  );

  // Points status
  const unallocatedPoints = availablePoints - allocatedPoints;
  const wastedPoints = Math.max(0, availablePoints - maxTotalArmor);

  // Handlers
  const handleArmorTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setArmorType(e.target.value as ArmorTypeEnum);
    },
    [setArmorType],
  );

  const handleArmorTonnageChange = useCallback(
    (newTonnage: number) => {
      const clamped = Math.max(0, Math.min(maxUsefulTonnage, newTonnage));
      setArmorTonnage(clamped);
    },
    [setArmorTonnage, maxUsefulTonnage],
  );

  const handleLocationArmorChange = useCallback(
    (location: VehicleArmorLocation, points: number) => {
      const max = getMaxVehicleArmorForLocation(
        tonnage,
        location,
        hasTurret,
        isVTOL,
      );
      const clamped = Math.max(0, Math.min(max, points));
      setLocationArmor(location, clamped);
    },
    [setLocationArmor, tonnage, hasTurret, isVTOL],
  );

  const handleMaximizeArmor = useCallback(() => {
    setArmorTonnage(maxUsefulTonnage);
  }, [setArmorTonnage, maxUsefulTonnage]);

  // Build location list based on vehicle type
  const locations = useMemo(() => {
    const locs = [...BASE_VEHICLE_LOCATIONS];
    // Filter out turret if no turret
    const filtered = locs.filter(
      (l) => l.location !== VehicleLocation.TURRET || hasTurret,
    );
    // Add rotor for VTOLs
    if (isVTOL) {
      filtered.push({ location: VTOLLocation.ROTOR, label: "Rotor" });
    }
    return filtered;
  }, [hasTurret, isVTOL]);

  return (
    <div
      className={`${cs.panel.main} ${className}`}
      data-testid="vehicle-armor-tab"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Armor Configuration Section */}
        <section data-testid="vehicle-armor-config-section">
          <h3 className={cs.text.sectionTitle}>Armor Configuration</h3>

          {/* Armor Type */}
          <div className="mb-4">
            <label className={cs.text.label}>Armor Type</label>
            <select
              value={armorType}
              onChange={handleArmorTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
              data-testid="vehicle-armor-type-select"
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
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={armorTonnage}
                onChange={(e) =>
                  handleArmorTonnageChange(Number(e.target.value))
                }
                min={0}
                max={maxUsefulTonnage}
                step={0.5}
                disabled={readOnly}
                className={`${cs.input.number} w-20`}
                data-testid="vehicle-armor-tonnage-input"
              />
              <span className={cs.text.secondary}>
                / {maxUsefulTonnage} tons max
              </span>
            </div>
          </div>

          {/* Points Summary */}
          <div
            className={`${cs.panel.summary} mb-4`}
            data-testid="vehicle-armor-summary"
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className={cs.text.label}>Available Points:</span>
                <span className={`${cs.text.value} ml-2`}>
                  {availablePoints}
                </span>
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
              <p className="mt-2 text-xs text-amber-400">
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
        <section data-testid="vehicle-armor-allocation-section">
          <h3 className={cs.text.sectionTitle}>Location Allocation</h3>

          <div className="space-y-3">
            {locations.map(({ location, label }) => {
              const currentValue = armorAllocation[location] ?? 0;
              const maxValue = getMaxVehicleArmorForLocation(
                tonnage,
                location,
                hasTurret,
                isVTOL,
              );

              return (
                <div key={location} className="flex items-center gap-3">
                  <span className={`${cs.text.label} w-24`}>{label}</span>
                  <input
                    type="range"
                    value={currentValue}
                    onChange={(e) =>
                      handleLocationArmorChange(
                        location,
                        Number(e.target.value),
                      )
                    }
                    min={0}
                    max={maxValue}
                    disabled={readOnly || maxValue === 0}
                    className="flex-1"
                  />
                  <div className="flex w-20 items-center gap-1">
                    <input
                      type="number"
                      value={currentValue}
                      onChange={(e) =>
                        handleLocationArmorChange(
                          location,
                          Number(e.target.value),
                        )
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

          {/* Vehicle Armor Diagram */}
          <div className="mt-6">
            <VehicleArmorDiagram />
          </div>
        </section>
      </div>
    </div>
  );
}

export default VehicleArmorTab;
