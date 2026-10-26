import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { MAX_ENGINE_RATING } from '@/hooks/useMovementCalculations';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  JumpJetType,
  JUMP_JET_DEFINITIONS,
} from '@/utils/construction/movementCalculations';
import {
  calculateRunMP,
  getEffectiveWalkMP,
} from '@/utils/gameplay/movement/calculations';

import type {
  StructureConfigurationOption,
  StructureEnhancementOption,
  StructureTabCalculations,
} from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';

/**
 * Shared Mobility grid: label | one control column. Steppers, derived values and
 * selects all start at the same left edge; helper text sits under its control.
 */
const MOBILITY_GRID =
  'grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1';

/** Row label, vertically centred on the 44px control beside it. */
const MOBILITY_LABEL = `${cs.text.label} flex min-h-11 items-center font-medium`;

/** One stepper group is exactly 44 + 48 + 44px wide. */
const STEPPER_WIDTH = 'w-[8.5rem] shrink-0';

/**
 * Jump Type stays usable with no jump jets, but reads as secondary until a
 * Jump MP is set.
 */
const JUMP_TYPE_IDLE_SELECT = cs.select.full
  .replace('text-text-theme-primary', 'text-text-theme-secondary')
  .replace('border-border-theme', 'border-border-theme-subtle');

function MobilityStepper({
  id,
  name,
  value,
  min,
  max,
  readOnly,
  describedBy,
  onChange,
}: {
  readonly id: string;
  readonly name: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly readOnly: boolean;
  readonly describedBy?: string;
  readonly onChange: (next: number) => void;
}): React.ReactElement {
  return (
    <div className={`flex items-center ${STEPPER_WIDTH}`}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={readOnly || value <= min}
        className={cs.button.stepperLeft}
        aria-label={`Decrease ${name}`}
      >
        <AppIcon name="remove" size="inline" aria-hidden="true" />
      </button>
      <input
        id={id}
        type="number"
        aria-label={name}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || min)}
        disabled={readOnly}
        min={min}
        max={max}
        className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={readOnly || value >= max}
        className={cs.button.stepperRight}
        aria-label={`Increase ${name}`}
      >
        <AppIcon name="add" size="inline" aria-hidden="true" />
      </button>
    </div>
  );
}

/** "→ 3 final": the resulting value after the base setting is applied. */
function FinalValue({
  name,
  children,
}: {
  readonly name: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <span
      className="inline-flex items-baseline gap-1.5 tabular-nums"
      title={`Final ${name}`}
    >
      <span className="text-text-theme-muted" aria-hidden="true">
        →
      </span>
      <span className={`text-sm font-semibold ${cs.text.value}`}>
        {children}
      </span>
      <span className={cs.text.secondary}>final</span>
    </span>
  );
}

interface StructureTabMovementSectionProps {
  readonly readOnly: boolean;
  readonly walkMP: number;
  readonly runMP: number;
  readonly walkMPRange: { min: number; max: number };
  readonly maxJumpMP: number;
  readonly maxRunMP?: number;
  readonly jumpMP: number;
  readonly jumpJetType: JumpJetType;
  readonly enhancement: MovementEnhancementType | null;
  readonly enhancementOptions: readonly StructureEnhancementOption[];
  readonly configuration: MechConfiguration;
  readonly configurationOptions: readonly StructureConfigurationOption[];
  readonly tonnage: number;
  readonly calculations: StructureTabCalculations;
  readonly handleWalkMPChange: (newWalkMP: number) => void;
  readonly handleJumpMPChange: (newJumpMP: number) => void;
  readonly handleJumpJetTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleEnhancementChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleConfigurationChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
}

export function StructureTabMovementSection({
  readOnly,
  walkMP,
  runMP,
  walkMPRange,
  maxJumpMP,
  maxRunMP,
  jumpMP,
  jumpJetType,
  enhancement,
  enhancementOptions,
  configuration,
  configurationOptions,
  tonnage,
  calculations,
  handleWalkMPChange,
  handleJumpMPChange,
  handleJumpJetTypeChange,
  handleEnhancementChange,
  handleConfigurationChange,
}: StructureTabMovementSectionProps): React.ReactElement {
  // Compute the canonical TSM-active walk / run preview for the tooltip.
  // `getEffectiveWalkMP` is the single source of truth for the combined
  // TSM bonus + heat-induced movement penalty (per the heat-management
  // spec's "TSM Walk-MP Combined With Heat Penalty" requirement). Sample
  // at heat 9 — the TSM activation threshold — so the tooltip surfaces
  // the canonical "TSM active" walk MP rather than embedding the
  // arithmetic inline.
  const tsmEffectiveWalkMP = getEffectiveWalkMP(walkMP, 9, true);
  const tsmEffectiveRunMP = calculateRunMP(tsmEffectiveWalkMP);

  return (
    <div className={cs.panel.main}>
      <div className="border-border-theme mb-4 border-b pb-3">
        <h3 className={cs.text.cardTitle}>Mobility</h3>
        <p className={`${cs.text.secondary} mt-0.5`}>
          Base settings and derived movement limits
        </p>
      </div>

      <div className="space-y-5">
        <div className={MOBILITY_GRID}>
          <label className={MOBILITY_LABEL} htmlFor="walk-mp">
            Walk MP
          </label>
          <div>
            <div className="flex items-center gap-3">
              <MobilityStepper
                id="walk-mp"
                name="Walk MP"
                value={walkMP}
                min={walkMPRange.min}
                max={walkMPRange.max}
                readOnly={readOnly}
                describedBy="walk-mp-help"
                onChange={handleWalkMPChange}
              />
              <FinalValue name="Walk MP">{walkMP}</FinalValue>
            </div>
            <p id="walk-mp-help" className={`${cs.text.secondary} mt-1`}>
              Range {walkMPRange.min}-{walkMPRange.max} for a {tonnage}t mech
              (max engine {MAX_ENGINE_RATING}).
            </p>
          </div>
        </div>

        <div className={MOBILITY_GRID}>
          <span className={MOBILITY_LABEL}>Run MP</span>
          <div className="flex min-h-11 items-center gap-1.5">
            {/* Derived, not editable: plain text, so nobody tries to type in it. */}
            <output
              aria-label="Run MP"
              className={`text-sm font-semibold tabular-nums ${cs.text.value}`}
            >
              {runMP}
            </output>
            <FinalValue name="Run MP">
              {runMP}
              {maxRunMP && (
                <span
                  className="text-text-theme-primary ml-1.5 cursor-help font-bold"
                  title={
                    enhancement === MovementEnhancementType.MASC
                      ? `MASC Sprint: Walk ${walkMP} × 2 = ${maxRunMP}`
                      : enhancement === MovementEnhancementType.TSM
                        ? `TSM at 9+ heat: effective Walk ${tsmEffectiveWalkMP} (base ${walkMP} + 2 TSM − 1 heat), Run ${tsmEffectiveRunMP}`
                        : enhancement === MovementEnhancementType.SUPERCHARGER
                          ? `Supercharger Sprint: Walk ${walkMP} × 2 = ${maxRunMP}`
                          : `Enhanced max: ${maxRunMP}`
                  }
                >
                  [{maxRunMP}]
                </span>
              )}
            </FinalValue>
          </div>
        </div>

        <div className={MOBILITY_GRID}>
          <label className={MOBILITY_LABEL} htmlFor="jump-mp">
            Jump MP
          </label>
          <div>
            <div className="flex items-center gap-3">
              <MobilityStepper
                id="jump-mp"
                name="Jump MP"
                value={jumpMP}
                min={0}
                max={maxJumpMP}
                readOnly={readOnly}
                describedBy="jump-mp-help"
                onChange={handleJumpMPChange}
              />
              <FinalValue name="Jump MP">{jumpMP}</FinalValue>
            </div>
            <p id="jump-mp-help" className={`${cs.text.secondary} mt-1`}>
              Max {maxJumpMP} (
              {jumpJetType === JumpJetType.IMPROVED
                ? 'run speed'
                : 'walk speed'}
              ).
              {jumpMP > 0 &&
                ` Jump jets: ${calculations.jumpJetWeight}t / ${calculations.jumpJetSlots} slots.`}
            </p>
          </div>
        </div>

        <div className={MOBILITY_GRID}>
          <label className={MOBILITY_LABEL} htmlFor="jump-type">
            Jump Type
          </label>
          <div>
            <select
              id="jump-type"
              className={jumpMP === 0 ? JUMP_TYPE_IDLE_SELECT : cs.select.full}
              disabled={readOnly}
              aria-label="Jump type"
              aria-describedby="jump-type-help"
              value={jumpJetType}
              onChange={handleJumpJetTypeChange}
            >
              {JUMP_JET_DEFINITIONS.filter(
                (def) => def.type !== JumpJetType.MECHANICAL,
              ).map((def) => (
                <option key={def.type} value={def.type}>
                  {def.name}
                </option>
              ))}
            </select>
            <div id="jump-type-help" className="mt-1 space-y-0.5">
              {jumpMP === 0 && (
                <p className={cs.text.secondary}>No jump jets installed</p>
              )}
              <p className={cs.text.secondary}>
                Mechanical jump boosters are not supported yet.
              </p>
            </div>
          </div>
        </div>

        <div className={`${cs.layout.divider} mt-2`}>
          <h4 className={`${cs.text.subsection} mb-3`}>Enhancement</h4>
          <div className={MOBILITY_GRID}>
            <label className={MOBILITY_LABEL} htmlFor="movement-enhancement">
              Type
            </label>
            <select
              className={cs.select.full}
              disabled={readOnly}
              id="movement-enhancement"
              aria-label="Movement enhancement"
              value={enhancement ?? ''}
              onChange={handleEnhancementChange}
            >
              {enhancementOptions.map((opt) => (
                <option key={opt.value ?? 'none'} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {enhancement && (
            <p className={`${cs.text.secondary} mt-2`}>
              {enhancement === MovementEnhancementType.MASC &&
                'Sprint = Walk × 2 when activated. Risk of leg damage on failed roll.'}
              {enhancement === MovementEnhancementType.TSM && (
                <>
                  Activates at 9+ heat: +2 Walk MP, but -1 from heat penalty =
                  net +1 MP.
                  <br />
                  <span className="text-accent">
                    Doubles physical attack damage.
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        <div className={`${cs.layout.divider} mt-2`}>
          <div className={MOBILITY_GRID}>
            <label className={MOBILITY_LABEL} htmlFor="motive-type">
              Motive Type
            </label>
            <select
              className={cs.select.full}
              disabled={readOnly}
              id="motive-type"
              aria-label="Motive type"
              aria-describedby="configuration-change-help"
              value={configuration}
              onChange={handleConfigurationChange}
            >
              {configurationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p
              id="configuration-change-help"
              className="text-text-theme-secondary col-span-full mt-1 text-xs"
            >
              Changing configuration clears armor in removed locations and
              returns their equipment to unassigned.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
