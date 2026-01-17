/**
 * Aerospace Structure Tab Component
 *
 * Configuration of aerospace chassis, engine, thrust, and cockpit settings.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4.2.1
 */

import React, { useCallback } from 'react';
import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { EngineType } from '@/types/construction/EngineType';
import { AerospaceCockpitType } from '@/types/unit/AerospaceInterfaces';
import { TechBase } from '@/types/enums/TechBase';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const TONNAGE_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

const ENGINE_TYPE_OPTIONS: { value: EngineType; label: string }[] = [
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
// Component
// =============================================================================

export function AerospaceStructureTab({
  readOnly = false,
  className = '',
}: AerospaceStructureTabProps): React.ReactElement {
  // Get state from store
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const techBase = useAerospaceStore((s) => s.techBase);
  const engineType = useAerospaceStore((s) => s.engineType);
  const engineRating = useAerospaceStore((s) => s.engineRating);
  const safeThrust = useAerospaceStore((s) => s.safeThrust);
  const maxThrust = useAerospaceStore((s) => s.maxThrust);
  const fuel = useAerospaceStore((s) => s.fuel);
  const structuralIntegrity = useAerospaceStore((s) => s.structuralIntegrity);
  const cockpitType = useAerospaceStore((s) => s.cockpitType);
  const heatSinks = useAerospaceStore((s) => s.heatSinks);
  const doubleHeatSinks = useAerospaceStore((s) => s.doubleHeatSinks);
  const isOmni = useAerospaceStore((s) => s.isOmni);
  const hasBombBay = useAerospaceStore((s) => s.hasBombBay);
  const bombCapacity = useAerospaceStore((s) => s.bombCapacity);
  const hasReinforcedCockpit = useAerospaceStore((s) => s.hasReinforcedCockpit);
  const hasEjectionSeat = useAerospaceStore((s) => s.hasEjectionSeat);

  // Get actions
  const setTonnage = useAerospaceStore((s) => s.setTonnage);
  const setEngineType = useAerospaceStore((s) => s.setEngineType);
  const setSafeThrust = useAerospaceStore((s) => s.setSafeThrust);
  const setFuel = useAerospaceStore((s) => s.setFuel);
  const setStructuralIntegrity = useAerospaceStore((s) => s.setStructuralIntegrity);
  const setCockpitType = useAerospaceStore((s) => s.setCockpitType);
  const setHeatSinks = useAerospaceStore((s) => s.setHeatSinks);
  const setDoubleHeatSinks = useAerospaceStore((s) => s.setDoubleHeatSinks);
  const setIsOmni = useAerospaceStore((s) => s.setIsOmni);
  const setHasBombBay = useAerospaceStore((s) => s.setHasBombBay);
  const setBombCapacity = useAerospaceStore((s) => s.setBombCapacity);
  const setReinforcedCockpit = useAerospaceStore((s) => s.setReinforcedCockpit);
  const setEjectionSeat = useAerospaceStore((s) => s.setEjectionSeat);

  // Handlers
  const handleTonnageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTonnage(Number(e.target.value));
    },
    [setTonnage]
  );

  const handleEngineTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setEngineType(e.target.value as EngineType);
    },
    [setEngineType]
  );

  const handleThrustChange = useCallback(
    (delta: number) => {
      const newThrust = Math.max(1, Math.min(12, safeThrust + delta));
      setSafeThrust(newThrust);
    },
    [safeThrust, setSafeThrust]
  );

  const handleCockpitTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setCockpitType(e.target.value as AerospaceCockpitType);
    },
    [setCockpitType]
  );

  return (
    <div className={`${cs.panel.main} ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chassis Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Chassis</h3>

          {/* Tonnage */}
          <div className="mb-4">
            <label className={cs.text.label}>Tonnage</label>
            <select
              value={tonnage}
              onChange={handleTonnageChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
            >
              {TONNAGE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t} tons
                </option>
              ))}
            </select>
          </div>

          {/* Tech Base (read-only display) */}
          <div className="mb-4">
            <label className={cs.text.label}>Tech Base</label>
            <div className={`${cs.input.full} mt-1 bg-surface-base cursor-not-allowed`}>
              {techBase === TechBase.INNER_SPHERE ? 'Inner Sphere' : 'Clan'}
            </div>
          </div>

          {/* OmniFighter Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOmni}
                onChange={(e) => setIsOmni(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4"
              />
              <span className={cs.text.label}>OmniFighter</span>
            </label>
            <p className="text-xs text-text-theme-secondary mt-1">
              OmniFighters can swap pod-mounted equipment between missions
            </p>
          </div>
        </section>

        {/* Engine & Movement Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Engine & Movement</h3>

          {/* Engine Type */}
          <div className="mb-4">
            <label className={cs.text.label}>Engine Type</label>
            <select
              value={engineType}
              onChange={handleEngineTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
            >
              {ENGINE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Safe Thrust */}
          <div className="mb-4">
            <label className={cs.text.label}>Safe Thrust</label>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => handleThrustChange(-1)}
                disabled={readOnly || safeThrust <= 1}
                className={cs.button.stepperLeft}
              >
                -
              </button>
              <input
                type="number"
                value={safeThrust}
                readOnly
                className={`${cs.input.number} w-16`}
              />
              <button
                onClick={() => handleThrustChange(1)}
                disabled={readOnly || safeThrust >= 12}
                className={cs.button.stepperRight}
              >
                +
              </button>
              <span className={cs.text.secondary}>
                (Max: {maxThrust})
              </span>
            </div>
          </div>

          {/* Engine Rating (calculated) */}
          <div className="mb-4">
            <label className={cs.text.label}>Engine Rating</label>
            <div className={`${cs.input.full} mt-1 bg-surface-base cursor-not-allowed`}>
              {engineRating}
            </div>
          </div>

          {/* Fuel */}
          <div className="mb-4">
            <label className={cs.text.label}>Fuel Points</label>
            <input
              type="number"
              value={fuel}
              onChange={(e) => setFuel(Number(e.target.value))}
              min={0}
              max={tonnage * 10}
              disabled={readOnly}
              className={`${cs.input.full} mt-1`}
            />
          </div>
        </section>

        {/* Structure & Cockpit Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Structure & Cockpit</h3>

          {/* Structural Integrity */}
          <div className="mb-4">
            <label className={cs.text.label}>Structural Integrity</label>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setStructuralIntegrity(structuralIntegrity - 1)}
                disabled={readOnly || structuralIntegrity <= 1}
                className={cs.button.stepperLeft}
              >
                -
              </button>
              <input
                type="number"
                value={structuralIntegrity}
                readOnly
                className={`${cs.input.number} w-16`}
              />
              <button
                onClick={() => setStructuralIntegrity(structuralIntegrity + 1)}
                disabled={readOnly}
                className={cs.button.stepperRight}
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasReinforcedCockpit}
                onChange={(e) => setReinforcedCockpit(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4"
              />
              <span className={cs.text.label}>Reinforced Cockpit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasEjectionSeat}
                onChange={(e) => setEjectionSeat(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4"
              />
              <span className={cs.text.label}>Ejection Seat</span>
            </label>
          </div>
        </section>

        {/* Heat Sinks & Special Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Heat Management & Special</h3>

          {/* Heat Sinks */}
          <div className="mb-4">
            <label className={cs.text.label}>Heat Sinks</label>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setHeatSinks(heatSinks - 1)}
                disabled={readOnly || heatSinks <= 0}
                className={cs.button.stepperLeft}
              >
                -
              </button>
              <input
                type="number"
                value={heatSinks}
                readOnly
                className={`${cs.input.number} w-16`}
              />
              <button
                onClick={() => setHeatSinks(heatSinks + 1)}
                disabled={readOnly}
                className={cs.button.stepperRight}
              >
                +
              </button>
            </div>
          </div>

          {/* Double Heat Sinks */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={doubleHeatSinks}
                onChange={(e) => setDoubleHeatSinks(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4"
              />
              <span className={cs.text.label}>Double Heat Sinks</span>
            </label>
            <p className="text-xs text-text-theme-secondary mt-1">
              {doubleHeatSinks ? `${heatSinks * 2} heat dissipation` : `${heatSinks} heat dissipation`}
            </p>
          </div>

          {/* Bomb Bay */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasBombBay}
                onChange={(e) => setHasBombBay(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4"
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
      </div>
    </div>
  );
}

export default AerospaceStructureTab;
