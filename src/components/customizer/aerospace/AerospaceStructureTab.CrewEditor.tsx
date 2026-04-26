/**
 * Aerospace Structure Tab — Crew Editor (Small Craft)
 *
 * Stepper-style editor for crew, passengers, and marines, used only when
 * the unit's sub-type is SMALL_CRAFT.
 *
 * Extracted from AerospaceStructureTab.tsx during section decomposition.
 */

import React from 'react';

import { customizerStyles as cs } from '../styles';

interface CrewEditorProps {
  crewCount: number;
  passengers: number;
  marines: number;
  readOnly: boolean;
  onCrewChange: (crew: number, passengers: number, marines: number) => void;
}

export function CrewEditor({
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
