/**
 * Aerospace Structure Tab Component
 *
 * Configuration of aerospace chassis, engine, thrust, and cockpit settings.
 * Includes sub-type selector, aerospace-canonical engine type, fuel tonnage,
 * crew editor (small craft), and live validation error display.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4.2.1
 */

import React, { useCallback, useMemo } from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { EngineType } from '@/types/construction/EngineType';
import { TechBase } from '@/types/enums/TechBase';
import {
  AerospaceCockpitType,
  AerospaceEngineType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceArc } from '@/types/unit/AerospaceInterfaces';
import { makeSmallCraftCrew } from '@/utils/construction/aerospace/crewCalculations';
import { validateAerospaceUnit } from '@/utils/construction/aerospace/validationRules';

import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const TONNAGE_OPTIONS = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
  100,
];

const SMALL_CRAFT_TONNAGE_OPTIONS = [
  100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
];

const SUBTYPE_OPTIONS: { value: AerospaceSubType; label: string }[] = [
  {
    value: AerospaceSubType.AEROSPACE_FIGHTER,
    label: 'Aerospace Fighter (ASF)',
  },
  {
    value: AerospaceSubType.CONVENTIONAL_FIGHTER,
    label: 'Conventional Fighter',
  },
  { value: AerospaceSubType.SMALL_CRAFT, label: 'Small Craft' },
];

const AEROSPACE_ENGINE_TYPE_OPTIONS: {
  value: AerospaceEngineType;
  label: string;
}[] = [
  { value: AerospaceEngineType.FUSION, label: 'Fusion (Standard)' },
  { value: AerospaceEngineType.XL, label: 'XL Fusion' },
  { value: AerospaceEngineType.COMPACT_FUSION, label: 'Compact Fusion' },
  { value: AerospaceEngineType.ICE, label: 'ICE (Combustion)' },
  { value: AerospaceEngineType.FUEL_CELL, label: 'Fuel Cell' },
];

const LEGACY_ENGINE_TYPE_OPTIONS: { value: EngineType; label: string }[] = [
  { value: EngineType.STANDARD, label: 'Standard Fusion' },
  { value: EngineType.XL_IS, label: 'XL Engine (IS)' },
  { value: EngineType.XL_CLAN, label: 'XL Engine (Clan)' },
  { value: EngineType.LIGHT, label: 'Light Engine' },
  { value: EngineType.COMPACT, label: 'Compact Engine' },
];

const COCKPIT_TYPE_OPTIONS: { value: AerospaceCockpitType; label: string }[] = [
  { value: AerospaceCockpitType.STANDARD, label: 'Standard' },
  { value: AerospaceCockpitType.SMALL, label: 'Small' },
  { value: AerospaceCockpitType.PRIMITIVE, label: 'Primitive' },
  { value: AerospaceCockpitType.COMMAND_CONSOLE, label: 'Command Console' },
];

// =============================================================================
// Types
// =============================================================================

interface AerospaceStructureTabProps {
  readOnly?: boolean;
  className?: string;
}

// =============================================================================
// Validation Errors Panel
// =============================================================================

interface ValidationPanelProps {
  errors: { ruleId: string; message: string }[];
}

function ValidationPanel({
  errors,
}: ValidationPanelProps): React.ReactElement | null {
  if (errors.length === 0) return null;

  return (
    <div
      className="mt-4 rounded border border-red-500/40 bg-red-900/20 p-3"
      data-testid="aerospace-validation-errors"
    >
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-red-400 uppercase">
        Construction Errors
      </h4>
      <ul className="space-y-1">
        {errors.map((err) => (
          <li
            key={err.ruleId}
            className="flex items-start gap-2 text-xs text-red-300"
          >
            <span className="shrink-0 font-mono text-red-500">
              [{err.ruleId}]
            </span>
            <span>{err.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================================
// Crew Editor (small craft only)
// =============================================================================

interface CrewEditorProps {
  crewCount: number;
  passengers: number;
  marines: number;
  readOnly: boolean;
  onCrewChange: (crew: number, passengers: number, marines: number) => void;
}

function CrewEditor({
  crewCount,
  passengers,
  marines,
  readOnly,
  onCrewChange,
}: CrewEditorProps): React.ReactElement {
  return (
    <section data-testid="aerospace-crew-section">
      <h3 className={cs.text.sectionTitle}>Crew & Quarters (Small Craft)</h3>

      {/* Crew */}
      <div className="mb-4">
        <label className={cs.text.label}>Crew Members</label>
        <div className="mt-1 flex items-center gap-2">
          <button
            onClick={() =>
              onCrewChange(Math.max(0, crewCount - 1), passengers, marines)
            }
            disabled={readOnly || crewCount <= 0}
            className={cs.button.stepperLeft}
            data-testid="aerospace-crew-decrease"
          >
            -
          </button>
          <input
            type="number"
            value={crewCount}
            readOnly
            className={`${cs.input.number} w-16`}
            data-testid="aerospace-crew-input"
          />
          <button
            onClick={() => onCrewChange(crewCount + 1, passengers, marines)}
            disabled={readOnly}
            className={cs.button.stepperRight}
            data-testid="aerospace-crew-increase"
          >
            +
          </button>
          <span className={cs.text.secondary}>× 5t each</span>
        </div>
      </div>

      {/* Passengers */}
      <div className="mb-4">
        <label className={cs.text.label}>Passengers</label>
        <div className="mt-1 flex items-center gap-2">
          <button
            onClick={() =>
              onCrewChange(crewCount, Math.max(0, passengers - 1), marines)
            }
            disabled={readOnly || passengers <= 0}
            className={cs.button.stepperLeft}
            data-testid="aerospace-passengers-decrease"
          >
            -
          </button>
          <input
            type="number"
            value={passengers}
            readOnly
            className={`${cs.input.number} w-16`}
            data-testid="aerospace-passengers-input"
          />
          <button
            onClick={() => onCrewChange(crewCount, passengers + 1, marines)}
            disabled={readOnly}
            className={cs.button.stepperRight}
            data-testid="aerospace-passengers-increase"
          >
            +
          </button>
          <span className={cs.text.secondary}>× 3t each</span>
        </div>
      </div>

      {/* Marines */}
      <div className="mb-4">
        <label className={cs.text.label}>Marines</label>
        <div className="mt-1 flex items-center gap-2">
          <button
            onClick={() =>
              onCrewChange(crewCount, passengers, Math.max(0, marines - 1))
            }
            disabled={readOnly || marines <= 0}
            className={cs.button.stepperLeft}
            data-testid="aerospace-marines-decrease"
          >
            -
          </button>
          <input
            type="number"
            value={marines}
            readOnly
            className={`${cs.input.number} w-16`}
            data-testid="aerospace-marines-input"
          />
          <button
            onClick={() => onCrewChange(crewCount, passengers, marines + 1)}
            disabled={readOnly}
            className={cs.button.stepperRight}
            data-testid="aerospace-marines-increase"
          >
            +
          </button>
          <span className={cs.text.secondary}>× 3t each</span>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Component
// =============================================================================

export function AerospaceStructureTab({
  readOnly = false,
  className = '',
}: AerospaceStructureTabProps): React.ReactElement {
  // Get state from store
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const techBase = useAerospaceStore((s) => s.techBase);
  const aerospaceSubType = useAerospaceStore((s) => s.aerospaceSubType);
  const engineType = useAerospaceStore((s) => s.engineType);
  const aerospaceEngineType = useAerospaceStore((s) => s.aerospaceEngineType);
  const engineRating = useAerospaceStore((s) => s.engineRating);
  const safeThrust = useAerospaceStore((s) => s.safeThrust);
  const maxThrust = useAerospaceStore((s) => s.maxThrust);
  const fuel = useAerospaceStore((s) => s.fuel);
  const fuelTons = useAerospaceStore((s) => s.fuelTons);
  const fuelPoints = useAerospaceStore((s) => s.fuelPoints);
  const structuralIntegrity = useAerospaceStore((s) => s.structuralIntegrity);
  const cockpitType = useAerospaceStore((s) => s.cockpitType);
  const heatSinks = useAerospaceStore((s) => s.heatSinks);
  const doubleHeatSinks = useAerospaceStore((s) => s.doubleHeatSinks);
  const isOmni = useAerospaceStore((s) => s.isOmni);
  const hasBombBay = useAerospaceStore((s) => s.hasBombBay);
  const bombCapacity = useAerospaceStore((s) => s.bombCapacity);
  const hasReinforcedCockpit = useAerospaceStore((s) => s.hasReinforcedCockpit);
  const hasEjectionSeat = useAerospaceStore((s) => s.hasEjectionSeat);
  const crew = useAerospaceStore((s) => s.crew);
  const armorAllocation = useAerospaceStore((s) => s.armorAllocation);

  // Get actions
  const setTonnage = useAerospaceStore((s) => s.setTonnage);
  const setAerospaceSubType = useAerospaceStore((s) => s.setAerospaceSubType);
  const setEngineType = useAerospaceStore((s) => s.setEngineType);
  const setAerospaceEngineType = useAerospaceStore(
    (s) => s.setAerospaceEngineType,
  );
  const setSafeThrust = useAerospaceStore((s) => s.setSafeThrust);
  const setFuel = useAerospaceStore((s) => s.setFuel);
  const setFuelTons = useAerospaceStore((s) => s.setFuelTons);
  const setStructuralIntegrity = useAerospaceStore(
    (s) => s.setStructuralIntegrity,
  );
  const setCockpitType = useAerospaceStore((s) => s.setCockpitType);
  const setHeatSinks = useAerospaceStore((s) => s.setHeatSinks);
  const setDoubleHeatSinks = useAerospaceStore((s) => s.setDoubleHeatSinks);
  const setIsOmni = useAerospaceStore((s) => s.setIsOmni);
  const setHasBombBay = useAerospaceStore((s) => s.setHasBombBay);
  const setBombCapacity = useAerospaceStore((s) => s.setBombCapacity);
  const setReinforcedCockpit = useAerospaceStore((s) => s.setReinforcedCockpit);
  const setEjectionSeat = useAerospaceStore((s) => s.setEjectionSeat);
  const setCrew = useAerospaceStore((s) => s.setCrew);

  // Determine if small craft mode for crew editor
  const isSmallCraft = aerospaceSubType === AerospaceSubType.SMALL_CRAFT;

  // Crew values with safe defaults for the sub-components
  const crewCount = crew?.crew ?? 0;
  const passengerCount = crew?.passengers ?? 0;
  const marineCount = crew?.marines ?? 0;
  const quartersTons = crew?.quartersTons ?? 0;

  // Build arc allocation map for validation (convert from AerospaceLocation to AerospaceArc)
  const arcAllocationForValidation = useMemo(() => {
    // armorAllocation uses AerospaceLocation keys which match AerospaceArc string values
    return armorAllocation as unknown as Partial<Record<AerospaceArc, number>>;
  }, [armorAllocation]);

  // Compute live validation errors for display
  const validationErrors = useMemo(
    () =>
      validateAerospaceUnit({
        tonnage,
        subType: aerospaceSubType,
        engineType: aerospaceEngineType,
        safeThrust,
        structuralIntegrity,
        fuelTons,
        arcArmor: arcAllocationForValidation,
        quartersTons,
        crewCount,
      }),
    [
      tonnage,
      aerospaceSubType,
      aerospaceEngineType,
      safeThrust,
      structuralIntegrity,
      fuelTons,
      arcAllocationForValidation,
      quartersTons,
      crewCount,
    ],
  );

  // Which tonnage options to show based on sub-type
  const tonnageOptions = useMemo(
    () => (isSmallCraft ? SMALL_CRAFT_TONNAGE_OPTIONS : TONNAGE_OPTIONS),
    [isSmallCraft],
  );

  // Handlers
  const handleTonnageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTonnage(Number(e.target.value));
    },
    [setTonnage],
  );

  const handleSubTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setAerospaceSubType(e.target.value as AerospaceSubType);
    },
    [setAerospaceSubType],
  );

  const handleAerospaceEngineTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setAerospaceEngineType(e.target.value as AerospaceEngineType);
    },
    [setAerospaceEngineType],
  );

  const handleLegacyEngineTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setEngineType(e.target.value as EngineType);
    },
    [setEngineType],
  );

  const handleThrustChange = useCallback(
    (delta: number) => {
      const newThrust = Math.max(1, Math.min(12, safeThrust + delta));
      setSafeThrust(newThrust);
    },
    [safeThrust, setSafeThrust],
  );

  const handleCockpitTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setCockpitType(e.target.value as AerospaceCockpitType);
    },
    [setCockpitType],
  );

  const handleFuelTonsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      setFuelTons(val);
      // Keep legacy fuel field in sync for backward compatibility
      setFuel(val);
    },
    [setFuelTons, setFuel],
  );

  const handleCrewChange = useCallback(
    (newCrew: number, newPassengers: number, newMarines: number) => {
      setCrew(makeSmallCraftCrew(newCrew, newPassengers, newMarines));
    },
    [setCrew],
  );

  return (
    <div
      className={`${cs.panel.main} ${className}`}
      data-testid="aerospace-structure-tab"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chassis Section */}
        <section data-testid="aerospace-chassis-section">
          <h3 className={cs.text.sectionTitle}>Chassis</h3>

          {/* Sub-Type */}
          <div className="mb-4">
            <label className={cs.text.label}>Unit Sub-Type</label>
            <select
              value={aerospaceSubType}
              onChange={handleSubTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
              data-testid="aerospace-subtype-select"
            >
              {SUBTYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tonnage */}
          <div className="mb-4">
            <label className={cs.text.label}>Tonnage</label>
            <select
              value={tonnage}
              onChange={handleTonnageChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
              data-testid="aerospace-tonnage-select"
            >
              {tonnageOptions.map((t) => (
                <option key={t} value={t}>
                  {t} tons
                </option>
              ))}
            </select>
          </div>

          {/* Tech Base (read-only display) */}
          <div className="mb-4">
            <label className={cs.text.label}>Tech Base</label>
            <div
              className={`${cs.input.full} bg-surface-base mt-1 cursor-not-allowed`}
            >
              {techBase === TechBase.INNER_SPHERE ? 'Inner Sphere' : 'Clan'}
            </div>
          </div>

          {/* OmniFighter Toggle */}
          <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isOmni}
                onChange={(e) => setIsOmni(e.target.checked)}
                disabled={readOnly}
                className="h-4 w-4"
                data-testid="aerospace-omni-checkbox"
              />
              <span className={cs.text.label}>OmniFighter</span>
            </label>
            <p className="text-text-theme-secondary mt-1 text-xs">
              OmniFighters can swap pod-mounted equipment between missions
            </p>
          </div>
        </section>

        {/* Engine & Movement Section */}
        <section data-testid="aerospace-engine-section">
          <h3 className={cs.text.sectionTitle}>Engine & Movement</h3>

          {/* Aerospace Engine Type (construction-canonical) */}
          <div className="mb-4">
            <label className={cs.text.label}>Engine Type</label>
            <select
              value={aerospaceEngineType}
              onChange={handleAerospaceEngineTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
              data-testid="aerospace-engine-type-select"
            >
              {AEROSPACE_ENGINE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-text-theme-secondary mt-1 text-xs">
              Conventional fighters: ICE or Fuel Cell only
            </p>
          </div>

          {/* Legacy Engine Type (for UI compatibility with existing toolchain) */}
          <div className="mb-4">
            <label className={cs.text.label}>Engine Profile (Legacy)</label>
            <select
              value={engineType}
              onChange={handleLegacyEngineTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
              data-testid="aerospace-legacy-engine-select"
            >
              {LEGACY_ENGINE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Safe Thrust */}
          <div className="mb-4">
            <label className={cs.text.label}>Safe Thrust</label>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => handleThrustChange(-1)}
                disabled={readOnly || safeThrust <= 1}
                className={cs.button.stepperLeft}
                data-testid="aerospace-thrust-decrease"
              >
                -
              </button>
              <input
                type="number"
                value={safeThrust}
                readOnly
                className={`${cs.input.number} w-16`}
                data-testid="aerospace-safe-thrust-input"
              />
              <button
                onClick={() => handleThrustChange(1)}
                disabled={readOnly || safeThrust >= 12}
                className={cs.button.stepperRight}
                data-testid="aerospace-thrust-increase"
              >
                +
              </button>
              <span
                className={cs.text.secondary}
                data-testid="aerospace-max-thrust"
              >
                (Max: {maxThrust})
              </span>
            </div>
          </div>

          {/* Engine Rating (calculated) */}
          <div className="mb-4">
            <label className={cs.text.label}>Engine Rating</label>
            <div
              className={`${cs.input.full} bg-surface-base mt-1 cursor-not-allowed`}
            >
              {engineRating}
            </div>
          </div>

          {/* Fuel Tonnage */}
          <div className="mb-4">
            <label className={cs.text.label}>Fuel Tonnage</label>
            <input
              type="number"
              value={fuelTons}
              onChange={handleFuelTonsChange}
              min={0}
              max={tonnage}
              step={0.5}
              disabled={readOnly}
              className={`${cs.input.full} mt-1`}
              data-testid="aerospace-fuel-tons-input"
            />
            <p className="text-text-theme-secondary mt-1 text-xs">
              {fuelPoints} fuel points ({aerospaceEngineType})
            </p>
          </div>

          {/* Legacy Fuel Points field */}
          <div className="mb-4">
            <label className={cs.text.label}>Fuel Points (Legacy)</label>
            <input
              type="number"
              value={fuel}
              onChange={(e) => setFuel(Number(e.target.value))}
              min={0}
              max={tonnage * 10}
              disabled={readOnly}
              className={`${cs.input.full} mt-1`}
              data-testid="aerospace-fuel-input"
            />
          </div>
        </section>

        {/* Structure & Cockpit Section */}
        <section data-testid="aerospace-cockpit-section">
          <h3 className={cs.text.sectionTitle}>Structure & Cockpit</h3>

          {/* Structural Integrity */}
          <div className="mb-4">
            <label className={cs.text.label}>Structural Integrity</label>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => setStructuralIntegrity(structuralIntegrity - 1)}
                disabled={readOnly || structuralIntegrity <= 1}
                className={cs.button.stepperLeft}
                data-testid="aerospace-si-decrease"
              >
                -
              </button>
              <input
                type="number"
                value={structuralIntegrity}
                readOnly
                className={`${cs.input.number} w-16`}
                data-testid="aerospace-si-input"
              />
              <button
                onClick={() => setStructuralIntegrity(structuralIntegrity + 1)}
                disabled={readOnly}
                className={cs.button.stepperRight}
                data-testid="aerospace-si-increase"
              >
                +
              </button>
            </div>
          </div>

          {/* Cockpit Type */}
          <div className="mb-4">
            <label className={cs.text.label}>Cockpit Type</label>
            <select
              value={cockpitType}
              onChange={handleCockpitTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
              data-testid="aerospace-cockpit-type-select"
            >
              {COCKPIT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cockpit Options */}
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={hasReinforcedCockpit}
                onChange={(e) => setReinforcedCockpit(e.target.checked)}
                disabled={readOnly}
                className="h-4 w-4"
              />
              <span className={cs.text.label}>Reinforced Cockpit</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={hasEjectionSeat}
                onChange={(e) => setEjectionSeat(e.target.checked)}
                disabled={readOnly}
                className="h-4 w-4"
              />
              <span className={cs.text.label}>Ejection Seat</span>
            </label>
          </div>
        </section>

        {/* Heat Sinks & Special Section */}
        <section data-testid="aerospace-heat-section">
          <h3 className={cs.text.sectionTitle}>Heat Management & Special</h3>

          {/* Heat Sinks */}
          <div className="mb-4">
            <label className={cs.text.label}>Heat Sinks</label>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => setHeatSinks(heatSinks - 1)}
                disabled={readOnly || heatSinks <= 0}
                className={cs.button.stepperLeft}
                data-testid="aerospace-heatsinks-decrease"
              >
                -
              </button>
              <input
                type="number"
                value={heatSinks}
                readOnly
                className={`${cs.input.number} w-16`}
                data-testid="aerospace-heatsinks-input"
              />
              <button
                onClick={() => setHeatSinks(heatSinks + 1)}
                disabled={readOnly}
                className={cs.button.stepperRight}
                data-testid="aerospace-heatsinks-increase"
              >
                +
              </button>
            </div>
          </div>

          {/* Double Heat Sinks */}
          <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={doubleHeatSinks}
                onChange={(e) => setDoubleHeatSinks(e.target.checked)}
                disabled={readOnly}
                className="h-4 w-4"
                data-testid="aerospace-double-heatsinks-checkbox"
              />
              <span className={cs.text.label}>Double Heat Sinks</span>
            </label>
            <p
              className="text-text-theme-secondary mt-1 text-xs"
              data-testid="aerospace-heat-dissipation"
            >
              {doubleHeatSinks
                ? `${heatSinks * 2} heat dissipation`
                : `${heatSinks} heat dissipation`}
            </p>
          </div>

          {/* Bomb Bay */}
          <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={hasBombBay}
                onChange={(e) => setHasBombBay(e.target.checked)}
                disabled={readOnly}
                className="h-4 w-4"
                data-testid="aerospace-bombbay-checkbox"
              />
              <span className={cs.text.label}>Bomb Bay</span>
            </label>
          </div>

          {/* Bomb Capacity */}
          {hasBombBay && (
            <div className="mb-4">
              <label className={cs.text.label}>Bomb Capacity (tons)</label>
              <input
                type="number"
                value={bombCapacity}
                onChange={(e) => setBombCapacity(Number(e.target.value))}
                min={0}
                max={tonnage / 2}
                disabled={readOnly}
                className={`${cs.input.full} mt-1`}
              />
            </div>
          )}
        </section>

        {/* Crew Editor — small craft only */}
        {isSmallCraft && (
          <CrewEditor
            crewCount={crewCount}
            passengers={passengerCount}
            marines={marineCount}
            readOnly={readOnly}
            onCrewChange={handleCrewChange}
          />
        )}

        {/* Crew Quarters Summary — small craft only */}
        {isSmallCraft && quartersTons > 0 && (
          <div
            className={`${cs.panel.summary} col-span-1 lg:col-span-2`}
            data-testid="aerospace-quarters-summary"
          >
            <span className={cs.text.label}>Quarters Tonnage:</span>
            <span className={`${cs.text.value} ml-2`}>{quartersTons}t</span>
          </div>
        )}
      </div>

      {/* Validation Errors — spans full width */}
      <ValidationPanel errors={validationErrors} />
    </div>
  );
}

export default AerospaceStructureTab;
