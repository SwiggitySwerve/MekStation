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
        <div className="grid grid-cols-[minmax(5.5rem,1fr)_minmax(0,1.35fr)_minmax(4rem,0.75fr)] items-center gap-3">
          <span></span>
          <span className={`${cs.text.subsection} text-center`}>Base</span>
          <span className={`${cs.text.subsection} text-center`}>Final</span>
        </div>

        <div className="grid grid-cols-[minmax(5.5rem,1fr)_minmax(0,1.35fr)_minmax(4rem,0.75fr)] items-center gap-3">
          <label className={`${cs.text.label} font-medium`} htmlFor="walk-mp">
            Walk MP
          </label>
          <div className="flex items-center justify-center">
            <button
              onClick={() => handleWalkMPChange(walkMP - 1)}
              disabled={readOnly || walkMP <= walkMPRange.min}
              className={cs.button.stepperLeft}
            >
              <AppIcon name="remove" size="inline" aria-hidden="true" />{' '}
            </button>
            <input
              id="walk-mp"
              type="number"
              aria-label="Walk MP"
              value={walkMP}
              onChange={(e) =>
                handleWalkMPChange(
                  parseInt(e.target.value, 10) || walkMPRange.min,
                )
              }
              disabled={readOnly}
              min={walkMPRange.min}
              max={walkMPRange.max}
              className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
            />
            <button
              onClick={() => handleWalkMPChange(walkMP + 1)}
              disabled={readOnly || walkMP >= walkMPRange.max}
              className={cs.button.stepperRight}
            >
              {' '}
              <AppIcon name="add" size="inline" aria-hidden="true" />
            </button>
          </div>
          <span className={`text-sm tabular-nums ${cs.text.value} text-center`}>
            {walkMP}
          </span>
        </div>

        <div className="grid grid-cols-[minmax(5.5rem,1fr)_minmax(0,1.35fr)_minmax(4rem,0.75fr)] items-center gap-3">
          <span className={`${cs.text.label} font-medium`}>Run MP</span>
          <span className={`text-sm tabular-nums ${cs.text.value} text-center`}>
            {runMP}
          </span>
          <div className="flex items-center justify-center gap-1">
            <span className={`text-sm tabular-nums ${cs.text.value}`}>
              {runMP}
            </span>
            {maxRunMP && (
              <span
                className="text-text-theme-primary cursor-help text-sm font-bold"
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
          </div>
        </div>

        <div className="grid grid-cols-[minmax(5.5rem,1fr)_minmax(0,1.35fr)_minmax(4rem,0.75fr)] items-center gap-3">
          <label className={`${cs.text.label} font-medium`} htmlFor="jump-mp">
            Jump MP
          </label>
          <div className="flex items-center justify-center">
            <button
              onClick={() => handleJumpMPChange(jumpMP - 1)}
              disabled={readOnly || jumpMP <= 0}
              className={cs.button.stepperLeft}
            >
              <AppIcon name="remove" size="inline" aria-hidden="true" />{' '}
            </button>
            <input
              id="jump-mp"
              type="number"
              aria-label="Jump MP"
              value={jumpMP}
              onChange={(e) =>
                handleJumpMPChange(parseInt(e.target.value, 10) || 0)
              }
              disabled={readOnly}
              min={0}
              max={maxJumpMP}
              className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
            />
            <button
              onClick={() => handleJumpMPChange(jumpMP + 1)}
              disabled={readOnly || jumpMP >= maxJumpMP}
              className={cs.button.stepperRight}
            >
              {' '}
              <AppIcon name="add" size="inline" aria-hidden="true" />
            </button>
          </div>
          <span className={`text-sm tabular-nums ${cs.text.value} text-center`}>
            {jumpMP}
          </span>
        </div>

        <div className="grid grid-cols-[minmax(5.5rem,1fr)_minmax(0,1fr)] items-center gap-3">
          <label className={`${cs.text.label} font-medium`} htmlFor="jump-type">
            Jump Type
          </label>
          <select
            id="jump-type"
            className={cs.select.full}
            disabled={readOnly}
            aria-label="Jump type"
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
        </div>

        <div className="grid grid-cols-[minmax(5.5rem,1fr)_minmax(0,1.35fr)_minmax(4rem,0.75fr)] items-center gap-3">
          <label
            className={`${cs.text.label} font-medium`}
            htmlFor="mechanical-jump-booster-mp"
          >
            Jump booster
          </label>
          <div className="flex items-center justify-center">
            <input
              id="mechanical-jump-booster-mp"
              type="number"
              aria-label="Mechanical jump booster MP"
              value={0}
              disabled={true}
              className={`w-12 ${cs.input.compact} text-center opacity-50 ${cs.input.noSpinners}`}
            />
          </div>
          <span className={`${cs.text.secondary} text-right`}>
            Not editable
          </span>
        </div>

        <div className={`${cs.layout.divider} mt-3`}>
          <p className={cs.text.secondary}>
            Walk MP range: {walkMPRange.min}-{walkMPRange.max} (for {tonnage}t
            mech, max engine {MAX_ENGINE_RATING})
          </p>
          <p className={cs.text.secondary}>
            Max Jump MP: {maxJumpMP} (
            {jumpJetType === JumpJetType.IMPROVED ? 'run speed' : 'walk speed'})
          </p>
          {jumpMP > 0 && (
            <p className={cs.text.secondary}>
              Jump Jets: {calculations.jumpJetWeight}t /{' '}
              {calculations.jumpJetSlots} slots
            </p>
          )}
        </div>

        <div className={`${cs.layout.divider} mt-2`}>
          <h4 className={`${cs.text.subsection} mb-3`}>Enhancement</h4>
          <div className="grid grid-cols-[minmax(5.5rem,1fr)_minmax(0,1fr)] items-center gap-3">
            <label className={cs.text.label}>Type</label>
            <select
              className={cs.select.inline}
              disabled={readOnly}
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
          <div className="grid grid-cols-[minmax(5.5rem,1fr)_minmax(0,1fr)] items-center gap-3">
            <label className={cs.text.label}>Motive Type</label>
            <select
              className={cs.select.inline}
              disabled={readOnly}
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
              className="text-text-theme-secondary col-span-full text-xs"
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
