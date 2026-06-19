/**
 * Aerospace Structure Tab — Structure & Cockpit Section
 *
 * Structural integrity stepper, cockpit type selector, and cockpit options
 * (reinforced cockpit, ejection seat).
 *
 * Extracted from AerospaceStructureTab.tsx during section decomposition.
 */

import React, { useCallback } from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { AerospaceCockpitType } from '@/types/unit/AerospaceInterfaces';

import { customizerStyles as cs } from '../styles';
import { SelectOptions } from '../tabs/SelectOptions';
import { COCKPIT_TYPE_OPTIONS } from './AerospaceStructureTab.constants';

interface CockpitSectionProps {
  readOnly: boolean;
}

export function CockpitSection({
  readOnly,
}: CockpitSectionProps): React.ReactElement {
  const structuralIntegrity = useAerospaceStore((s) => s.structuralIntegrity);
  const cockpitType = useAerospaceStore((s) => s.cockpitType);
  const hasReinforcedCockpit = useAerospaceStore((s) => s.hasReinforcedCockpit);
  const hasEjectionSeat = useAerospaceStore((s) => s.hasEjectionSeat);

  const setStructuralIntegrity = useAerospaceStore(
    (s) => s.setStructuralIntegrity,
  );
  const setCockpitType = useAerospaceStore((s) => s.setCockpitType);
  const setReinforcedCockpit = useAerospaceStore((s) => s.setReinforcedCockpit);
  const setEjectionSeat = useAerospaceStore((s) => s.setEjectionSeat);

  const handleCockpitTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setCockpitType(e.target.value as AerospaceCockpitType);
    },
    [setCockpitType],
  );

  return (
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
          <SelectOptions options={COCKPIT_TYPE_OPTIONS} />
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
  );
}
