import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

import { customizerStyles as cs } from '../styles';
import { STRUCTURE_CONTROL_WIDTH } from './StructureTabRowLayout';

/**
 * Number stepper used by every Structure row: 44px minus button, a value box
 * that takes the remaining width, 44px plus button. By default the group spans
 * the 240px control column. Callers own clamping and enable/disable rules.
 */
export function StructureStepper({
  id,
  inputLabel,
  decreaseLabel,
  increaseLabel,
  value,
  min,
  max,
  step,
  disabled,
  decreaseDisabled,
  increaseDisabled,
  describedBy,
  decreaseTestId,
  increaseTestId,
  className = STRUCTURE_CONTROL_WIDTH,
  onDecrease,
  onIncrease,
  onInputChange,
}: {
  readonly id: string;
  readonly inputLabel: string;
  readonly decreaseLabel: string;
  readonly increaseLabel: string;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly disabled: boolean;
  readonly decreaseDisabled: boolean;
  readonly increaseDisabled: boolean;
  readonly describedBy?: string;
  readonly decreaseTestId?: string;
  readonly increaseTestId?: string;
  readonly className?: string;
  readonly onDecrease: () => void;
  readonly onIncrease: () => void;
  readonly onInputChange: (raw: string) => void;
}): React.ReactElement {
  return (
    <div className={`flex shrink-0 items-center ${className}`}>
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled || decreaseDisabled}
        className={cs.button.stepperLeft}
        data-testid={decreaseTestId}
        aria-label={decreaseLabel}
      >
        <AppIcon name="remove" size="inline" aria-hidden="true" />
      </button>
      <input
        id={id}
        type="number"
        aria-label={inputLabel}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onInputChange(e.target.value)}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`flex-1 ${cs.input.number} border-y ${cs.input.noSpinners}`}
      />
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled || increaseDisabled}
        className={cs.button.stepperRight}
        data-testid={increaseTestId}
        aria-label={increaseLabel}
      >
        <AppIcon name="add" size="inline" aria-hidden="true" />
      </button>
    </div>
  );
}
