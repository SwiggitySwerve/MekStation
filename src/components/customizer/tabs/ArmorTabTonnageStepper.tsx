/**
 * Armor Tonnage stepper: the joined minus | value | plus control the Structure
 * tab uses (same classes as StructureStepper), with the value shown as tonnes
 * ("19.0 t") so it matches the summary bar. While the field has focus it shows
 * what the user is typing; every edit still commits straight away.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React, { useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

import { customizerStyles as cs } from '../styles';

interface ArmorTabTonnageStepperProps {
  readonly value: number;
  readonly max: number;
  readonly disabled: boolean;
  readonly onChange: (tonnage: number) => void;
}

const STEP = 0.5;

export function ArmorTabTonnageStepper({
  value,
  max,
  disabled,
  onChange,
}: ArmorTabTonnageStepperProps): React.ReactElement {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="flex w-full items-center">
      <button
        type="button"
        onClick={() => onChange(value - STEP)}
        disabled={disabled || value <= 0}
        className={cs.button.stepperLeft}
        aria-label="Decrease armor tonnage"
      >
        <AppIcon name="remove" size="inline" aria-hidden="true" />
      </button>
      {/* The value box: "19.0" and its unit centred together; the whole box
          focuses the field. */}
      <label className="border-border-theme hover:border-border-theme-strong focus-within:border-accent flex min-h-11 min-w-0 flex-1 cursor-text items-center justify-center gap-1 border bg-[var(--field-surface,var(--surface-deep))] text-sm transition-colors">
        <input
          type="number"
          aria-label="Armor Tonnage"
          value={draft ?? value.toFixed(1)}
          onFocus={() => setDraft(value.toFixed(1))}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(parseFloat(e.target.value) || 0);
          }}
          disabled={disabled}
          min={0}
          max={max}
          step={STEP}
          className={`text-text-theme-primary w-[4.5ch] rounded-none border-0 bg-transparent p-0 text-right font-semibold tabular-nums focus-visible:outline-none ${cs.input.noSpinners}`}
        />
        <span className="text-text-theme-secondary" aria-hidden="true">
          t
        </span>
      </label>
      <button
        type="button"
        onClick={() => onChange(value + STEP)}
        disabled={disabled || value >= max}
        className={cs.button.stepperRight}
        aria-label="Increase armor tonnage"
      >
        <AppIcon name="add" size="inline" aria-hidden="true" />
      </button>
    </div>
  );
}
