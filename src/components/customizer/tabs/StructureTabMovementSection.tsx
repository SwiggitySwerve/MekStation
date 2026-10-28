import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { MAX_ENGINE_RATING } from '@/hooks/useMovementCalculations';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import {
  JumpJetType,
  JUMP_JET_DEFINITIONS,
} from '@/utils/construction/movementCalculations';
import { formatTons } from '@/utils/formatting';
import {
  calculateRunMP,
  getEffectiveWalkMP,
} from '@/utils/gameplay/movement/calculations';

import type {
  StructureEnhancementOption,
  StructureTabCalculations,
} from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';
import {
  STRUCTURE_CARD,
  STRUCTURE_HELP,
  STRUCTURE_META,
  STRUCTURE_READONLY_FIELD,
  STRUCTURE_READONLY_ROW,
  STRUCTURE_READONLY_SPACER,
  STRUCTURE_ROW_GRID,
  STRUCTURE_ROW_LABEL,
  STRUCTURE_ROW_STACK,
  STRUCTURE_SELECT,
} from './StructureTabRowLayout';
import { StructureStepper } from './StructureTabStepper';

/**
 * Jump Type stays usable with no jump jets, but reads as secondary until a
 * Jump MP is set.
 */
const JUMP_TYPE_IDLE_SELECT = STRUCTURE_SELECT.replace(
  'text-text-theme-primary',
  'text-text-theme-secondary',
).replace('border-border-theme', 'border-border-theme-subtle');

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
    <StructureStepper
      id={id}
      inputLabel={name}
      decreaseLabel={`Decrease ${name}`}
      increaseLabel={`Increase ${name}`}
      value={value}
      min={min}
      max={max}
      disabled={readOnly}
      decreaseDisabled={value <= min}
      increaseDisabled={value >= max}
      describedBy={describedBy}
      onDecrease={() => onChange(value - 1)}
      onIncrease={() => onChange(value + 1)}
      onInputChange={(raw) => onChange(parseInt(raw, 10) || min)}
    />
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
  tonnage,
  calculations,
  handleWalkMPChange,
  handleJumpMPChange,
  handleJumpJetTypeChange,
  handleEnhancementChange,
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
    <div className={`${cs.panel.main} ${STRUCTURE_CARD}`}>
      <div className="border-border-theme mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b pb-3">
        <h3 className={cs.text.cardTitle}>Mobility</h3>
        <p className={`${cs.text.secondary} m-0`}>
          Base settings and derived movement limits
        </p>
      </div>

      <div className={STRUCTURE_ROW_STACK}>
        <div className={STRUCTURE_ROW_GRID}>
          <label className={STRUCTURE_ROW_LABEL} htmlFor="walk-mp">
            Walk MP
          </label>
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
          <div className={STRUCTURE_META}>
            <FinalValue name="Walk MP">{walkMP}</FinalValue>
          </div>
          <p id="walk-mp-help" className={`${STRUCTURE_HELP} m-0`}>
            {`Range ${walkMPRange.min}–${walkMPRange.max} for a ${formatTons(tonnage, 0)} 'Mech (max engine ${MAX_ENGINE_RATING}).`}
          </p>
        </div>

        <div className={STRUCTURE_ROW_GRID}>
          <span className={STRUCTURE_ROW_LABEL}>Run MP</span>
          {/* Derived, not editable: a locked, recessed read-only well the
              size of a stepper's value field, with no - and + buttons. */}
          <div className={STRUCTURE_READONLY_ROW}>
            <span aria-hidden="true" className={STRUCTURE_READONLY_SPACER} />
            <output
              aria-label="Run MP"
              aria-describedby="run-mp-help"
              className={STRUCTURE_READONLY_FIELD}
            >
              <AppIcon
                name="lock"
                size="inline"
                aria-hidden="true"
                className="text-text-theme-secondary"
              />
              {runMP}
            </output>
            <span aria-hidden="true" className={STRUCTURE_READONLY_SPACER} />
          </div>
          <div className={STRUCTURE_META}>
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
          <p id="run-mp-help" className={`${STRUCTURE_HELP} m-0`}>
            Follows Walk MP; it is not set directly.
          </p>
        </div>

        <div className={STRUCTURE_ROW_GRID}>
          <label className={STRUCTURE_ROW_LABEL} htmlFor="jump-mp">
            Jump MP
          </label>
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
          <div className={STRUCTURE_META}>
            <FinalValue name="Jump MP">{jumpMP}</FinalValue>
          </div>
          <p id="jump-mp-help" className={`${STRUCTURE_HELP} m-0`}>
            Max {maxJumpMP} (
            {jumpJetType === JumpJetType.IMPROVED ? 'run speed' : 'walk speed'}
            ).
            {jumpMP > 0 &&
              ` Jump jets: ${formatTons(calculations.jumpJetWeight)} / ${calculations.jumpJetSlots} slots.`}
          </p>
        </div>

        <div className={STRUCTURE_ROW_GRID}>
          <label className={STRUCTURE_ROW_LABEL} htmlFor="jump-type">
            Jump Type
          </label>
          <select
            id="jump-type"
            className={jumpMP === 0 ? JUMP_TYPE_IDLE_SELECT : STRUCTURE_SELECT}
            disabled={readOnly}
            aria-label="Jump Type"
            aria-describedby={jumpMP === 0 ? 'jump-type-help' : undefined}
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
          {jumpMP === 0 && (
            <p id="jump-type-help" className={`${STRUCTURE_HELP} m-0`}>
              No jump jets installed
            </p>
          )}
        </div>

        <div className={STRUCTURE_ROW_GRID}>
          <label className={STRUCTURE_ROW_LABEL} htmlFor="movement-enhancement">
            Enhancement
          </label>
          <select
            className={STRUCTURE_SELECT}
            disabled={readOnly}
            id="movement-enhancement"
            aria-label="Movement Enhancement"
            value={enhancement ?? ''}
            onChange={handleEnhancementChange}
          >
            {enhancementOptions.map((opt) => (
              <option key={opt.value ?? 'none'} value={opt.value ?? ''}>
                {opt.label}
              </option>
            ))}
          </select>
          {enhancement && (
            <p className={`${STRUCTURE_HELP} m-0`}>
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
      </div>
    </div>
  );
}
