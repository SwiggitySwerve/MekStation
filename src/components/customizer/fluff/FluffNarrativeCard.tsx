/**
 * Fluff narrative card
 *
 * The long-form unit text, stacked in one reading column. Text is 16px on a
 * 24px line height and the card is capped near 75 characters per line.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React from 'react';

import type { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { customizerStyles as cs } from '@/components/customizer/styles';

import {
  AutoSizeTextarea,
  disabledClasses,
  fieldId,
  FieldLabel,
} from './FluffFields';
import { NARRATIVE_FIELDS, type NarrativeField } from './fluffSections';

/** Hints for the sections that are usually empty on a new design. */
const NARRATIVE_PLACEHOLDERS: Partial<Record<NarrativeField, string>> = {
  variants: 'e.g. Model name and what changes from this design, one per line.',
  notableUnits: 'e.g. A famous pilot, or one named unit of this design.',
};

/**
 * 16px text on a 24px (1.5) line height, at least 3 rows; the textarea grows
 * with its content up to the collapsed line cap.
 */
const NARRATIVE_TEXTAREA = `${cs.input.full.replace('text-sm', 'text-base')} min-h-[6.5rem] w-full resize-none overflow-y-auto leading-6 placeholder:text-text-theme-muted placeholder:italic [--fluff-line-cap:10] @[64rem]:[--fluff-line-cap:14]`;

interface FluffNarrativeCardProps {
  fluff: ISerializedFluff;
  disabled: boolean;
  onFluffChange?: (patch: Partial<ISerializedFluff>) => void;
}

export function FluffNarrativeCard({
  fluff,
  disabled,
  onFluffChange,
}: FluffNarrativeCardProps): React.ReactElement {
  return (
    <section
      className={`${cs.panel.main} text-base`}
      aria-labelledby="fluff-history-heading"
    >
      <h3 id="fluff-history-heading" className={`${cs.text.cardTitle} mb-4`}>
        Unit History and Description
      </h3>
      <div className="flex flex-col gap-5" data-testid="fluff-narrative">
        {NARRATIVE_FIELDS.map(([field, label]) => {
          const value = fluff[field] ?? '';
          return (
            <div key={field} tabIndex={-1} data-testid={`fluff-field-${field}`}>
              <FieldLabel
                htmlFor={fieldId(field)}
                label={label}
                variant="section"
                showOptional={!disabled && value === ''}
              />
              <AutoSizeTextarea
                fieldLabel={label}
                id={fieldId(field)}
                rows={3}
                value={value}
                placeholder={NARRATIVE_PLACEHOLDERS[field]}
                disabled={disabled}
                onChange={(event) =>
                  onFluffChange?.({ [field]: event.target.value })
                }
                className={`${NARRATIVE_TEXTAREA} ${disabledClasses(disabled)}`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
