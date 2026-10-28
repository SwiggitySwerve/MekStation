/**
 * Fluff narrative card
 *
 * The long-form unit text, stacked in one reading column. Text is 16px on a
 * 24px line height and the card is capped near 75 characters per line. Every
 * field grows to show its full text. The tab renders two of these: the main
 * history card, and a shorter Variants and Notable Units card in the side
 * column so the two columns end near each other.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React from 'react';

import type { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { customizerStyles as cs } from '@/components/customizer/styles';

import { AutoSizeTextarea, fieldId, FieldLabel } from './FluffFields';
import { NARRATIVE_FIELDS, type NarrativeField } from './fluffSections';

/** Hints for the sections that are usually empty on a new design. */
const NARRATIVE_PLACEHOLDERS: Partial<Record<NarrativeField, string>> = {
  variants: 'e.g. Model name and what changes from this design, one per line.',
  notableUnits: 'e.g. A famous pilot, or one named unit of this design.',
};

/**
 * 16px text on a 24px (1.5) line height, at least 3 lines. The frame around
 * the textarea supplies the box. The scroll margin keeps a jumped-to field
 * clear of the pinned phone "Jump to Section" bar.
 */
const NARRATIVE_TEXTAREA =
  'min-h-18 scroll-mt-20 text-base leading-6 placeholder:text-text-theme-muted';

/** The history card's sections; the rest go in the side-column card. */
export const HISTORY_FIELDS: readonly NarrativeField[] = [
  'overview',
  'capabilities',
  'history',
  'deployment',
];

/** The side-column card's sections. */
export const RELATED_FIELDS: readonly NarrativeField[] = [
  'variants',
  'notableUnits',
];

interface FluffNarrativeCardProps {
  fluff: ISerializedFluff;
  disabled: boolean;
  onFluffChange?: (patch: Partial<ISerializedFluff>) => void;
  /** Sections shown, in `NARRATIVE_FIELDS` order. */
  fields?: readonly NarrativeField[];
  title?: string;
  headingId?: string;
  testId?: string;
  className?: string;
}

export function FluffNarrativeCard({
  fluff,
  disabled,
  onFluffChange,
  fields = HISTORY_FIELDS,
  title = 'Unit History and Description',
  headingId = 'fluff-history-heading',
  testId = 'fluff-narrative',
  className = '',
}: FluffNarrativeCardProps): React.ReactElement {
  const shown = NARRATIVE_FIELDS.filter(([field]) => fields.includes(field));
  return (
    <section
      className={`${cs.panel.main} text-base ${className}`}
      aria-labelledby={headingId}
    >
      {/* Every Fluff card title: the card title style, 12px below it. */}
      <h3 id={headingId} className={`${cs.text.cardTitle} mb-3`}>
        {title}
      </h3>
      <div className="flex flex-col gap-5" data-testid={testId}>
        {shown.map(([field, label]) => {
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
                id={fieldId(field)}
                rows={3}
                value={value}
                placeholder={NARRATIVE_PLACEHOLDERS[field]}
                disabled={disabled}
                onChange={(event) =>
                  onFluffChange?.({ [field]: event.target.value })
                }
                className={NARRATIVE_TEXTAREA}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
