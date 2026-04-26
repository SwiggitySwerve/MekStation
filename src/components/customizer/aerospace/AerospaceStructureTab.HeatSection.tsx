/**
 * Aerospace Structure Tab — Heat Management & Special Section
 *
 * Heat sinks stepper, double-heat-sinks toggle, bomb bay toggle, and
 * (when bomb bay is enabled) bomb capacity input.
 *
 * Extracted from AerospaceStructureTab.tsx during section decomposition.
 */

import React from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';

import { customizerStyles as cs } from '../styles';

interface HeatSectionProps {
  readOnly: boolean;
}

export function HeatSection({
  readOnly,
}: HeatSectionProps): React.ReactElement {
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const heatSinks = useAerospaceStore((s) => s.heatSinks);
  const doubleHeatSinks = useAerospaceStore((s) => s.doubleHeatSinks);
  const hasBombBay = useAerospaceStore((s) => s.hasBombBay);
  const bombCapacity = useAerospaceStore((s) => s.bombCapacity);

  const setHeatSinks = useAerospaceStore((s) => s.setHeatSinks);
  const setDoubleHeatSinks = useAerospaceStore((s) => s.setDoubleHeatSinks);
  const setHasBombBay = useAerospaceStore((s) => s.setHasBombBay);
  const setBombCapacity = useAerospaceStore((s) => s.setBombCapacity);

  return (
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
  );
}
