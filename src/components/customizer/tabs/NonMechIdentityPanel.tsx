/**
 * NonMechIdentityPanel — shared, store-free Overview editor for non-mech units
 *
 * Every non-mech store (Vehicle / Aerospace / BattleArmor / Infantry /
 * ProtoMech) exposes the same unit-identity surface: `chassis`, `model`,
 * `mulId`, `year`, `rulesLevel` and `techBase`, plus `tonnage` on the
 * weight-bearing types. This component is the single presentational editor
 * for that surface — it takes plain values and change callbacks as props and
 * holds NO store reference, so it can be unit-tested in isolation and reused
 * by every per-type Overview wrapper.
 *
 * `techBase` is rendered read-only: only BattleArmor and Infantry stores have
 * a `setTechBase` action, and editing tech base after construction is a
 * deeper change than this panel covers. `tonnage` renders only when an
 * `onTonnageChange` callback is supplied (BattleArmor / Infantry have no
 * tonnage concept).
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useCallback } from 'react';

import { ALL_RULES_LEVELS, RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';

import { customizerStyles as cs } from '../styles';

// =============================================================================
// Types
// =============================================================================

export interface NonMechIdentityPanelProps {
  /** Human label for the unit-type family (e.g. "Vehicle", "Infantry"). */
  unitTypeLabel: string;

  // --- Identity values ---
  /** Unit chassis name. */
  chassis: string;
  /** Unit model designation. */
  model: string;
  /** Master Unit List id (string so the `-1` custom-unit sentinel survives). */
  mulId: string;
  /** Introduction year. */
  year: number;
  /** Rules / tech level. */
  rulesLevel: RulesLevel;
  /** Tech base — rendered read-only (see file header). */
  techBase: TechBase;
  /** Tonnage — when omitted the tonnage field is not rendered. */
  tonnage?: number;

  // --- Change callbacks ---
  onChassisChange: (chassis: string) => void;
  onModelChange: (model: string) => void;
  onMulIdChange: (mulId: string) => void;
  onYearChange: (year: number) => void;
  onRulesLevelChange: (rulesLevel: RulesLevel) => void;
  /** When supplied the tonnage field renders and is editable. */
  onTonnageChange?: (tonnage: number) => void;

  /** Read-only mode — disables every input. */
  readOnly?: boolean;
  /** Optional extra CSS classes. */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the shared "Basic Information" panel for a non-mech unit. Purely
 * presentational — every value and setter is a prop.
 */
export function NonMechIdentityPanel({
  unitTypeLabel,
  chassis,
  model,
  mulId,
  year,
  rulesLevel,
  techBase,
  tonnage,
  onChassisChange,
  onModelChange,
  onMulIdChange,
  onYearChange,
  onRulesLevelChange,
  onTonnageChange,
  readOnly = false,
  className = '',
}: NonMechIdentityPanelProps): React.ReactElement {
  const handleChassis = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChassisChange(e.target.value),
    [onChassisChange],
  );

  const handleModel = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onModelChange(e.target.value),
    [onModelChange],
  );

  const handleMulId = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Numbers and hyphens only; empty input collapses to the `-1` sentinel
      // used everywhere for non-canonical custom units.
      const value = e.target.value.replace(/[^0-9-]/g, '');
      onMulIdChange(value === '' ? '-1' : value);
    },
    [onMulIdChange],
  );

  const handleYear = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value > 0) {
        onYearChange(value);
      }
    },
    [onYearChange],
  );

  const handleRulesLevel = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      onRulesLevelChange(e.target.value as RulesLevel),
    [onRulesLevelChange],
  );

  const handleTonnage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onTonnageChange) return;
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value > 0) {
        onTonnageChange(value);
      }
    },
    [onTonnageChange],
  );

  return (
    <div
      className={`space-y-6 p-4 ${className}`}
      data-testid="non-mech-identity-panel"
    >
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Basic Information</h3>

        <div className={cs.layout.formStack}>
          {/* Chassis / Model / MUL ID */}
          <div className={cs.layout.threeColumn}>
            <div className={cs.layout.field}>
              <label className={cs.text.label} htmlFor="nonMechChassis">
                Chassis
              </label>
              <input
                id="nonMechChassis"
                type="text"
                value={chassis}
                onChange={handleChassis}
                disabled={readOnly}
                className={cs.input.full}
                placeholder="New"
              />
            </div>

            <div className={cs.layout.field}>
              <label className={cs.text.label} htmlFor="nonMechModel">
                Model
              </label>
              <input
                id="nonMechModel"
                type="text"
                value={model}
                onChange={handleModel}
                disabled={readOnly}
                className={cs.input.full}
                placeholder={unitTypeLabel}
              />
            </div>

            <div className={cs.layout.field}>
              <label className={cs.text.label} htmlFor="nonMechMulId">
                MUL ID
              </label>
              <input
                id="nonMechMulId"
                type="text"
                value={mulId}
                onChange={handleMulId}
                disabled={readOnly}
                className={cs.input.full}
                placeholder="-1"
              />
            </div>
          </div>

          {/* Year / Tech Level / Tonnage-or-TechBase */}
          <div className={cs.layout.threeColumn}>
            <div className={cs.layout.field}>
              <label className={cs.text.label} htmlFor="nonMechYear">
                Year
              </label>
              <input
                id="nonMechYear"
                type="number"
                value={year}
                onChange={handleYear}
                disabled={readOnly}
                min={2000}
                max={3200}
                className={`${cs.input.full} ${cs.input.noSpinners}`}
              />
            </div>

            <div className={cs.layout.field}>
              <label className={cs.text.label} htmlFor="nonMechRulesLevel">
                Tech Level
              </label>
              <select
                id="nonMechRulesLevel"
                value={rulesLevel}
                onChange={handleRulesLevel}
                disabled={readOnly}
                className={cs.select.full}
              >
                {ALL_RULES_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {onTonnageChange ? (
              <div className={cs.layout.field}>
                <label className={cs.text.label} htmlFor="nonMechTonnage">
                  Tonnage
                </label>
                <input
                  id="nonMechTonnage"
                  type="number"
                  value={tonnage ?? 0}
                  onChange={handleTonnage}
                  disabled={readOnly}
                  min={1}
                  max={200}
                  className={`${cs.input.full} ${cs.input.noSpinners}`}
                />
              </div>
            ) : (
              <div className={cs.layout.field}>
                <span className={cs.text.label}>Tech Base</span>
                <p className={cs.text.value} data-testid="non-mech-tech-base">
                  {techBase}
                </p>
              </div>
            )}
          </div>

          {/* Tech Base read-only line — only when tonnage took the 3rd slot */}
          {onTonnageChange && (
            <div className={cs.layout.field}>
              <span className={cs.text.label}>Tech Base</span>
              <p className={cs.text.value} data-testid="non-mech-tech-base">
                {techBase}
              </p>
            </div>
          )}
        </div>
      </div>

      {readOnly && (
        <div className={cs.panel.notice}>
          This unit is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}
