import React from 'react';

import { MAX_ENGINE_RATING } from '@/hooks/useMovementCalculations';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  JumpJetType,
  JUMP_JET_DEFINITIONS,
} from '@/utils/construction/movementCalculations';

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
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Movement</h3>

      <div className={cs.layout.formStack}>
        <div className="grid grid-cols-[80px_1fr_60px] items-center gap-2 sm:grid-cols-[140px_112px_1fr]">
          <span></span>
          <span
            className={`${cs.text.secondary} text-center text-xs uppercase sm:text-sm`}
          >
            Base
          </span>
          <span
            className={`${cs.text.secondary} text-center text-xs uppercase sm:text-sm`}
          >
            Final
          </span>
        </div>

        <div className="grid grid-cols-[80px_1fr_60px] items-center gap-2 sm:grid-cols-[140px_112px_1fr]">
          <label className={cs.text.label}>Walk MP</label>
          <div className="flex items-center justify-center">
            <button
              onClick={() => handleWalkMPChange(walkMP - 1)}
              disabled={readOnly || walkMP <= walkMPRange.min}
              className={cs.button.stepperLeft}
            >
              -
            </button>
            <input
              type="number"
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
              +
            </button>
          </div>
          <span className={`text-sm ${cs.text.value} text-center`}>
            {walkMP}
          </span>
        </div>

        <div className="grid grid-cols-[80px_1fr_60px] items-center gap-2 sm:grid-cols-[140px_112px_1fr]">
          <label className={cs.text.label}>Run MP</label>
          <span className={`text-sm ${cs.text.value} text-center`}>
            {runMP}
          </span>
          <div className="flex items-center justify-center gap-1">
            <span className={`text-sm ${cs.text.value}`}>{runMP}</span>
            {maxRunMP && (
              <span
                className="cursor-help text-sm font-bold text-white"
                title={
                  enhancement === MovementEnhancementType.MASC
                    ? `MASC Sprint: Walk ${walkMP} × 2 = ${maxRunMP}`
                    : enhancement === MovementEnhancementType.TSM
                      ? `TSM at 9+ heat: Base Run ${runMP} + 1 = ${maxRunMP} (net +1 from +2 Walk, -1 heat penalty)`
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

        <div className="grid grid-cols-[80px_1fr_60px] items-center gap-2 sm:grid-cols-[140px_112px_1fr]">
          <label className={cs.text.label}>Jump MP</label>
          <div className="flex items-center justify-center">
            <button
              onClick={() => handleJumpMPChange(jumpMP - 1)}
              disabled={readOnly || jumpMP <= 0}
              className={cs.button.stepperLeft}
            >
              -
            </button>
            <input
              type="number"
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
              +
            </button>
          </div>
          <span className={`text-sm ${cs.text.value} text-center`}>
            {jumpMP}
          </span>
        </div>

        <div className="grid grid-cols-[80px_1fr] items-center gap-2 sm:grid-cols-[140px_1fr]">
          <label className={cs.text.label}>Jump Type</label>
          <select
            className={cs.select.inline}
            disabled={readOnly}
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

        <div className="grid grid-cols-[80px_1fr_60px] items-center gap-2 sm:grid-cols-[140px_112px_1fr]">
          <label className={cs.text.label}>Mech. J. Booster MP</label>
          <div className="flex items-center justify-center">
            <input
              type="number"
              value={0}
              disabled={true}
              className={`w-12 ${cs.input.compact} text-center opacity-50 ${cs.input.noSpinners}`}
            />
          </div>
          <span></span>
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
          <h4 className="mb-3 text-sm font-semibold text-slate-300">
            Enhancement
          </h4>
          <div className="grid grid-cols-[80px_1fr] items-center gap-2 sm:grid-cols-[140px_1fr]">
            <label className={cs.text.label}>Type</label>
            <select
              className={cs.select.inline}
              disabled={readOnly}
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
          <div className="grid grid-cols-[80px_1fr] items-center gap-2 sm:grid-cols-[140px_1fr]">
            <label className={cs.text.label}>Motive Type</label>
            <select
              className={cs.select.inline}
              disabled={readOnly}
              value={configuration}
              onChange={handleConfigurationChange}
            >
              {configurationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
