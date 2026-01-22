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
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { EngineType } from '@/types/construction/EngineType';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const VEHICLE_TONNAGE = {
  min: 1,
  max: 200,
  step: 1,
  heavyMin: 60,
  superheavyMin: 101,
};

const MOTION_TYPE_OPTIONS: { value: GroundMotionType; label: string; maxTonnage: number }[] = [
  { value: GroundMotionType.TRACKED, label: 'Tracked', maxTonnage: 200 },
  { value: GroundMotionType.WHEELED, label: 'Wheeled', maxTonnage: 80 },
  { value: GroundMotionType.HOVER, label: 'Hover', maxTonnage: 50 },
  { value: GroundMotionType.VTOL, label: 'VTOL', maxTonnage: 30 },
  { value: GroundMotionType.NAVAL, label: 'Naval', maxTonnage: 300 },
  { value: GroundMotionType.HYDROFOIL, label: 'Hydrofoil', maxTonnage: 100 },
  { value: GroundMotionType.SUBMARINE, label: 'Submarine', maxTonnage: 300 },
  { value: GroundMotionType.WIGE, label: 'WiGE', maxTonnage: 80 },
];

const ENGINE_TYPE_OPTIONS: { value: EngineType; label: string }[] = [
  { value: EngineType.STANDARD, label: 'Standard Fusion' },
  { value: EngineType.XL_IS, label: 'XL Engine (IS)' },
  { value: EngineType.XL_CLAN, label: 'XL Engine (Clan)' },
  { value: EngineType.LIGHT, label: 'Light Engine' },
  { value: EngineType.XXL, label: 'XXL Engine' },
  { value: EngineType.COMPACT, label: 'Compact Engine' },
  { value: EngineType.ICE, label: 'ICE (Internal Combustion)' },
  { value: EngineType.FUEL_CELL, label: 'Fuel Cell' },
  { value: EngineType.FISSION, label: 'Fission' },
];

const TURRET_TYPE_OPTIONS: { value: TurretType; label: string }[] = [
  { value: TurretType.NONE, label: 'No Turret' },
  { value: TurretType.SINGLE, label: 'Single Turret' },
  { value: TurretType.DUAL, label: 'Dual Turret' },
  { value: TurretType.CHIN, label: 'Chin Turret (VTOL)' },
];

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

  // Special features
  const hasEnvironmentalSealing = useVehicleStore((s) => s.hasEnvironmentalSealing);
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
  const setEnvironmentalSealing = useVehicleStore((s) => s.setEnvironmentalSealing);
  const setFlotationHull = useVehicleStore((s) => s.setFlotationHull);
  const setAmphibious = useVehicleStore((s) => s.setAmphibious);
  const setTrailerHitch = useVehicleStore((s) => s.setTrailerHitch);
  const setIsTrailer = useVehicleStore((s) => s.setIsTrailer);

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
    [setTonnage, maxTonnageForMotion]
  );

  const handleMotionTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMotionType = e.target.value as GroundMotionType;
      setMotionType(newMotionType);

      // Clamp tonnage if needed for new motion type
      const maxTonnage = MOTION_TYPE_OPTIONS.find((m) => m.value === newMotionType)?.maxTonnage ?? 200;
      if (tonnage > maxTonnage) {
        setTonnage(maxTonnage);
      }
    },
    [setMotionType, setTonnage, tonnage]
  );

  const handleEngineTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setEngineType(e.target.value as EngineType);
    },
    [setEngineType]
  );

  const handleCruiseMPChange = useCallback(
    (newCruiseMP: number) => {
      const clamped = Math.max(1, Math.min(20, newCruiseMP));
      setCruiseMP(clamped);
    },
    [setCruiseMP]
  );

  const handleTurretTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTurretType(e.target.value as TurretType);
    },
    [setTurretType]
  );

  // Filter turret options based on motion type
  const availableTurretOptions =
    motionType === GroundMotionType.VTOL
      ? TURRET_TYPE_OPTIONS.filter((t) => t.value === TurretType.NONE || t.value === TurretType.CHIN)
      : TURRET_TYPE_OPTIONS.filter((t) => t.value !== TurretType.CHIN);

  return (
    <div className={`${cs.panel.main} ${className}`} data-testid="vehicle-structure-tab">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chassis Section */}
        <section data-testid="vehicle-chassis-section">
          <h3 className={cs.text.sectionTitle}>Chassis</h3>

          {/* Tonnage */}
          <div className="mb-4">
            <label className={cs.text.label}>Tonnage</label>
            <div className="flex items-center gap-2 mt-1">
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
              <p className="text-amber-400 text-xs mt-1">Superheavy vehicle (&gt;100 tons)</p>
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
              {MOTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} (max {option.maxTonnage}t)
                </option>
              ))}
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
              {availableTurretOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* OmniVehicle Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOmni}
                onChange={(e) => setIsOmni(e.target.checked)}
                disabled={readOnly}
                className="rounded border-border-theme bg-surface-raised"
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
              {ENGINE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isTrailer && <p className={cs.text.secondary}>Trailers have no engine</p>}
          </div>

          {/* Engine Rating (read-only, derived) */}
          <div className="mb-4">
            <label className={cs.text.label}>Engine Rating</label>
            <div className={`${cs.text.value} mt-1`} data-testid="vehicle-engine-rating">{engineRating}</div>
          </div>

          {/* Cruise MP */}
          <div className="mb-4">
            <label className={cs.text.label}>Cruise MP</label>
            <div className="flex items-center gap-2 mt-1">
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
            <div className={`${cs.text.value} mt-1`} data-testid="vehicle-flank-mp">{flankMP}</div>
          </div>
        </section>

        {/* Special Features Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Special Features</h3>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasEnvironmentalSealing}
                onChange={(e) => setEnvironmentalSealing(e.target.checked)}
                disabled={readOnly}
                className="rounded border-border-theme bg-surface-raised"
              />
              <span className={cs.text.label}>Environmental Sealing</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasFlotationHull}
                onChange={(e) => setFlotationHull(e.target.checked)}
                disabled={readOnly}
                className="rounded border-border-theme bg-surface-raised"
              />
              <span className={cs.text.label}>Flotation Hull</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAmphibious}
                onChange={(e) => setAmphibious(e.target.checked)}
                disabled={readOnly}
                className="rounded border-border-theme bg-surface-raised"
              />
              <span className={cs.text.label}>Amphibious</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasTrailerHitch}
                onChange={(e) => setTrailerHitch(e.target.checked)}
                disabled={readOnly}
                className="rounded border-border-theme bg-surface-raised"
              />
              <span className={cs.text.label}>Trailer Hitch</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTrailer}
                onChange={(e) => setIsTrailer(e.target.checked)}
                disabled={readOnly}
                className="rounded border-border-theme bg-surface-raised"
              />
              <span className={cs.text.label}>Is Trailer (no engine)</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

export default VehicleStructureTab;
