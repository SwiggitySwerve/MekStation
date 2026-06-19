/**
 * Aerospace Structure Tab — Engine & Movement Section
 *
 * Engine type (canonical + legacy), safe thrust, max thrust, engine rating,
 * and fuel tonnage. The legacy `fuel` points field was removed in PR2
 * cluster K (hard-cutover): `fuelPoints` is computed from `fuelTons` and
 * the engine type's points-per-ton rate.
 *
 * Extracted from AerospaceStructureTab.tsx during section decomposition.
 */

import React, { useCallback } from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { EngineType } from '@/types/construction/EngineType';
import { AerospaceEngineType } from '@/types/unit/AerospaceInterfaces';

import { customizerStyles as cs } from '../styles';
import { SelectOptions } from '../tabs/SelectOptions';
import {
  AEROSPACE_ENGINE_TYPE_OPTIONS,
  LEGACY_ENGINE_TYPE_OPTIONS,
} from './AerospaceStructureTab.constants';

interface EngineSectionProps {
  readOnly: boolean;
}

export function EngineSection({
  readOnly,
}: EngineSectionProps): React.ReactElement {
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const engineType = useAerospaceStore((s) => s.engineType);
  const aerospaceEngineType = useAerospaceStore((s) => s.aerospaceEngineType);
  const engineRating = useAerospaceStore((s) => s.engineRating);
  const safeThrust = useAerospaceStore((s) => s.safeThrust);
  const maxThrust = useAerospaceStore((s) => s.maxThrust);
  const fuelTons = useAerospaceStore((s) => s.fuelTons);
  const fuelPoints = useAerospaceStore((s) => s.fuelPoints);

  const setEngineType = useAerospaceStore((s) => s.setEngineType);
  const setAerospaceEngineType = useAerospaceStore(
    (s) => s.setAerospaceEngineType,
  );
  const setSafeThrust = useAerospaceStore((s) => s.setSafeThrust);
  const setFuelTons = useAerospaceStore((s) => s.setFuelTons);

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

  const handleFuelTonsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      setFuelTons(val);
    },
    [setFuelTons],
  );

  return (
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
          <SelectOptions options={AEROSPACE_ENGINE_TYPE_OPTIONS} />
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
          <SelectOptions options={LEGACY_ENGINE_TYPE_OPTIONS} />
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
    </section>
  );
}
