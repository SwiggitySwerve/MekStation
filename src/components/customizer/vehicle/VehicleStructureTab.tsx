/**
 * Vehicle Structure Tab Component
 *
 * Configuration of vehicle structural components (tonnage, motion type, engine)
 * and chassis options. Based on StructureTab.tsx patterns for BattleMechs.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.2
 */

import React, { useCallback } from 'react';

import { useVehicleStore } from '@/stores/useVehicleStore';
import { EngineType } from '@/types/construction/EngineType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { computeMinimumCrew } from '@/utils/construction/vehicle/crew';
import { VehicleStructureType } from '@/utils/construction/vehicle/structure';

import { customizerStyles as cs } from '../styles';
import { SelectOptions, toSelectOptions } from '../tabs/SelectOptions';
import { VehicleSpecialFeaturesSection } from './VehicleSpecialFeaturesSection';
import {
  ENGINE_TYPE_OPTIONS,
  MOTION_TYPE_OPTIONS,
  STRUCTURE_TYPE_OPTIONS,
  TURRET_TYPE_OPTIONS,
  VEHICLE_TONNAGE,
} from './vehicleStructureOptions';

// =============================================================================
// =============================================================================
// Types
// =============================================================================

interface VehicleStructureTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Vehicle structure configuration tab
 *
 * Uses useVehicleStore() to access the current vehicle's state.
 */
export function VehicleStructureTab({
  readOnly = false,
  className = '',
}: VehicleStructureTabProps): React.ReactElement {
  // Get vehicle state from context
  const tonnage = useVehicleStore((s) => s.tonnage);
  const motionType = useVehicleStore((s) => s.motionType);
  const engineType = useVehicleStore((s) => s.engineType);
  const engineRating = useVehicleStore((s) => s.engineRating);
  const cruiseMP = useVehicleStore((s) => s.cruiseMP);
  const flankMP = useVehicleStore((s) => s.flankMP);
  const turret = useVehicleStore((s) => s.turret);
  const isOmni = useVehicleStore((s) => s.isOmni);
  const isSuperheavy = useVehicleStore((s) => s.isSuperheavy);

  // Construction fields
  const structureType = useVehicleStore((s) => s.structureType);
  const crewSize = useVehicleStore((s) => s.crewSize);
  const passengerSlots = useVehicleStore((s) => s.passengerSlots);

  // Special features
  const hasEnvironmentalSealing = useVehicleStore(
    (s) => s.hasEnvironmentalSealing,
  );
  const hasFlotationHull = useVehicleStore((s) => s.hasFlotationHull);
  const isAmphibious = useVehicleStore((s) => s.isAmphibious);
  const hasTrailerHitch = useVehicleStore((s) => s.hasTrailerHitch);
  const isTrailer = useVehicleStore((s) => s.isTrailer);

  // Get actions from context
  const setTonnage = useVehicleStore((s) => s.setTonnage);
  const setMotionType = useVehicleStore((s) => s.setMotionType);
  const setEngineType = useVehicleStore((s) => s.setEngineType);
  const setCruiseMP = useVehicleStore((s) => s.setCruiseMP);
  const setTurretType = useVehicleStore((s) => s.setTurretType);
  const setIsOmni = useVehicleStore((s) => s.setIsOmni);
  const setStructureType = useVehicleStore((s) => s.setStructureType);
  const setCrewSize = useVehicleStore((s) => s.setCrewSize);
  const setPassengerSlots = useVehicleStore((s) => s.setPassengerSlots);
  const setEnvironmentalSealing = useVehicleStore(
    (s) => s.setEnvironmentalSealing,
  );
  const setFlotationHull = useVehicleStore((s) => s.setFlotationHull);
  const setAmphibious = useVehicleStore((s) => s.setAmphibious);
  const setTrailerHitch = useVehicleStore((s) => s.setTrailerHitch);
  const setIsTrailer = useVehicleStore((s) => s.setIsTrailer);

  // Derived: minimum crew for current tonnage + motion type
  const minimumCrew = computeMinimumCrew(tonnage, motionType);

  // Get max tonnage for current motion type
  const maxTonnageForMotion =
    MOTION_TYPE_OPTIONS.find((m) => m.value === motionType)?.maxTonnage ?? 200;

  // Handlers
  const handleTonnageChange = useCallback(
    (newTonnage: number) => {
      const max = Math.min(VEHICLE_TONNAGE.max, maxTonnageForMotion);
      const clamped = Math.max(VEHICLE_TONNAGE.min, Math.min(max, newTonnage));
      setTonnage(clamped);
    },
    [setTonnage, maxTonnageForMotion],
  );

  const handleMotionTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMotionType = e.target.value as GroundMotionType;
      setMotionType(newMotionType);

      // Clamp tonnage if needed for new motion type
      const maxTonnage =
        MOTION_TYPE_OPTIONS.find((m) => m.value === newMotionType)
          ?.maxTonnage ?? 200;
      if (tonnage > maxTonnage) {
        setTonnage(maxTonnage);
      }
    },
    [setMotionType, setTonnage, tonnage],
  );

  const handleEngineTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setEngineType(e.target.value as EngineType);
    },
    [setEngineType],
  );

  const handleCruiseMPChange = useCallback(
    (newCruiseMP: number) => {
      const clamped = Math.max(1, Math.min(20, newCruiseMP));
      setCruiseMP(clamped);
    },
    [setCruiseMP],
  );

  const handleTurretTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTurretType(e.target.value as TurretType);
    },
    [setTurretType],
  );

  // Filter turret options based on motion type
  const availableTurretOptions =
    motionType === GroundMotionType.VTOL
      ? TURRET_TYPE_OPTIONS.filter(
          (t) => t.value === TurretType.NONE || t.value === TurretType.CHIN,
        )
      : TURRET_TYPE_OPTIONS.filter((t) => t.value !== TurretType.CHIN);
  const motionSelectOptions = toSelectOptions(
    MOTION_TYPE_OPTIONS.map((option) => option.value),
    (value) => {
      const option = MOTION_TYPE_OPTIONS.find((item) => item.value === value);
      return `${option?.label ?? value} (max ${option?.maxTonnage ?? 200}t)`;
    },
  );

  return (
    <div
      className={`${cs.panel.main} ${className}`}
      data-testid="vehicle-structure-tab"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chassis Section */}
        <section data-testid="vehicle-chassis-section">
          <h3 className={cs.text.sectionTitle}>Chassis</h3>

          {/* Tonnage */}
          <div className="mb-4">
            <label className={cs.text.label}>Tonnage</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={tonnage}
                onChange={(e) => handleTonnageChange(Number(e.target.value))}
                min={VEHICLE_TONNAGE.min}
                max={Math.min(VEHICLE_TONNAGE.max, maxTonnageForMotion)}
                step={VEHICLE_TONNAGE.step}
                disabled={readOnly}
                className={`${cs.input.number} w-20`}
                data-testid="vehicle-tonnage-input"
              />
              <span className={cs.text.secondary}>tons</span>
            </div>
            {isSuperheavy && (
              <p className="mt-1 text-xs text-amber-400">
                Superheavy vehicle (&gt;100 tons)
              </p>
            )}
          </div>

          {/* Motion Type */}
          <div className="mb-4">
            <label className={cs.text.label}>Motion Type</label>
            <select
              value={motionType}
              onChange={handleMotionTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
              data-testid="vehicle-motion-type-select"
            >
              <SelectOptions options={motionSelectOptions} />
            </select>
          </div>

          {/* Turret Configuration */}
          <div className="mb-4">
            <label className={cs.text.label}>Turret</label>
            <select
              value={turret?.type ?? TurretType.NONE}
              onChange={handleTurretTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
            >
              <SelectOptions options={availableTurretOptions} />
            </select>
          </div>

          {/* Internal Structure Type */}
          <div className="mb-4">
            <label className={cs.text.label}>Internal Structure</label>
            <select
              value={structureType}
              onChange={(e) =>
                setStructureType(e.target.value as VehicleStructureType)
              }
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
              data-testid="vehicle-structure-type-select"
            >
              <SelectOptions options={STRUCTURE_TYPE_OPTIONS} />
            </select>
          </div>

          {/* Crew Size */}
          <div className="mb-4">
            <label className={cs.text.label}>
              Crew Size
              <span className="text-text-theme-secondary ml-1 text-xs font-normal">
                (min {minimumCrew})
              </span>
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={crewSize}
                onChange={(e) => setCrewSize(Number(e.target.value))}
                min={minimumCrew}
                max={99}
                step={1}
                disabled={readOnly}
                className={`${cs.input.number} w-16`}
                data-testid="vehicle-crew-size-input"
              />
              <span className={cs.text.secondary}>crew</span>
            </div>
            {crewSize < minimumCrew && crewSize > 0 && (
              <p className="mt-1 text-xs text-red-400">
                Below minimum crew ({minimumCrew})
              </p>
            )}
          </div>

          {/* Passenger Slots */}
          <div className="mb-4">
            <label className={cs.text.label}>Passenger Slots</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={passengerSlots}
                onChange={(e) => setPassengerSlots(Number(e.target.value))}
                min={0}
                max={99}
                step={1}
                disabled={readOnly}
                className={`${cs.input.number} w-16`}
                data-testid="vehicle-passenger-slots-input"
              />
              <span className={cs.text.secondary}>passengers</span>
            </div>
          </div>

          {/* OmniVehicle Toggle */}
          <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isOmni}
                onChange={(e) => setIsOmni(e.target.checked)}
                disabled={readOnly}
                className="border-border-theme bg-surface-raised rounded"
              />
              <span className={cs.text.label}>OmniVehicle</span>
            </label>
          </div>
        </section>

        {/* Engine & Movement Section */}
        <section data-testid="vehicle-engine-section">
          <h3 className={cs.text.sectionTitle}>Engine & Movement</h3>

          {/* Engine Type */}
          <div className="mb-4">
            <label className={cs.text.label}>Engine Type</label>
            <select
              value={engineType}
              onChange={handleEngineTypeChange}
              disabled={readOnly || isTrailer}
              className={`${cs.select.full} mt-1`}
              data-testid="vehicle-engine-type-select"
            >
              <SelectOptions options={ENGINE_TYPE_OPTIONS} />
            </select>
            {isTrailer && (
              <p className={cs.text.secondary}>Trailers have no engine</p>
            )}
          </div>

          {/* Engine Rating (read-only, derived) */}
          <div className="mb-4">
            <label className={cs.text.label}>Engine Rating</label>
            <div
              className={`${cs.text.value} mt-1`}
              data-testid="vehicle-engine-rating"
            >
              {engineRating}
            </div>
          </div>

          {/* Cruise MP */}
          <div className="mb-4">
            <label className={cs.text.label}>Cruise MP</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={cruiseMP}
                onChange={(e) => handleCruiseMPChange(Number(e.target.value))}
                min={1}
                max={20}
                step={1}
                disabled={readOnly || isTrailer}
                className={`${cs.input.number} w-16`}
                data-testid="vehicle-cruise-mp-input"
              />
              <span className={cs.text.secondary}>hexes</span>
            </div>
          </div>

          {/* Flank MP (read-only, derived) */}
          <div className="mb-4">
            <label className={cs.text.label}>Flank MP</label>
            <div
              className={`${cs.text.value} mt-1`}
              data-testid="vehicle-flank-mp"
            >
              {flankMP}
            </div>
          </div>
        </section>

        <VehicleSpecialFeaturesSection
          readOnly={readOnly}
          hasEnvironmentalSealing={hasEnvironmentalSealing}
          hasFlotationHull={hasFlotationHull}
          isAmphibious={isAmphibious}
          hasTrailerHitch={hasTrailerHitch}
          isTrailer={isTrailer}
          setEnvironmentalSealing={setEnvironmentalSealing}
          setFlotationHull={setFlotationHull}
          setAmphibious={setAmphibious}
          setTrailerHitch={setTrailerHitch}
          setIsTrailer={setIsTrailer}
        />
      </div>
    </div>
  );
}

export default VehicleStructureTab;
