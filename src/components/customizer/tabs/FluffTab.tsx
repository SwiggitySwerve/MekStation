/**
 * Fluff Tab Component
 *
 * Non-mechanical unit information (history, description, manufacturer).
 * Wide editors show the history narrative in a reading column beside a column
 * holding the Sections index, Variants and Notable Units, role and
 * manufacturing cards at their natural height, so the two columns end near
 * each other; narrower editors stack them in one column, in that order, under
 * a "Jump to section" select.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useRef } from 'react';

import type { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { SIDE_LABEL_ROW } from '@/components/customizer/fluff/FluffFields';
import { FluffManufacturingCard } from '@/components/customizer/fluff/FluffManufacturingCard';
import {
  FluffNarrativeCard,
  RELATED_FIELDS,
} from '@/components/customizer/fluff/FluffNarrativeCard';
import { FluffSectionIndex } from '@/components/customizer/fluff/FluffSectionIndex';
import { FluffSideColumn } from '@/components/customizer/fluff/FluffSideColumn';
import { customizerStyles as cs } from '@/components/customizer/styles';

export interface FluffTabProps {
  role?: string;
  fluff?: ISerializedFluff;
  readOnly?: boolean;
  className?: string;
  onRoleChange?: (role: string) => void;
  onFluffChange?: (patch: Partial<ISerializedFluff>) => void;
}

const ROLES = [
  'Ambusher',
  'Brawler',
  'Fire Support',
  'Juggernaut',
  'Missile Boat',
  'Scout',
  'Skirmisher',
  'Sniper',
  'Striker',
] as const;

/**
 * Cards share one reading width (about 75 characters of 16px text plus card
 * padding) while stacked, left-aligned with the workspace. On a wide
 * container the grid spans the workspace: narrative column capped at that
 * width, the remainder (never under 20rem) for role and manufacturing.
 */
const PAGE_GRID =
  'grid grid-cols-1 items-start gap-5 max-w-[calc(75ch+2.125rem)] @[64rem]:max-w-none @[64rem]:grid-cols-[minmax(0,calc(75ch+2.125rem))_minmax(20rem,1fr)] @[64rem]:gap-6';

/** Controlled role and lore form shared across unit types. */
export function FluffTab({
  role = '',
  fluff = {},
  readOnly = false,
  className = '',
  onRoleChange,
  onFluffChange,
}: FluffTabProps): React.ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const isReadOnly = readOnly || (!onRoleChange && !onFluffChange);
  const roleIsKnown =
    role === '' || ROLES.some((candidate) => candidate === role);

  const jumpToSection = (id: string): void => {
    const field = rootRef.current?.querySelector<HTMLElement>(`#${id}`);
    if (!field) return;
    const target = field.matches(':disabled')
      ? field.closest<HTMLElement>('[tabindex="-1"]')
      : field;
    target?.focus({ preventScroll: true });
    field.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  return (
    <div
      ref={rootRef}
      className={`@container flex flex-col gap-5 p-4 ${className}`}
    >
      {isReadOnly && (
        <div className={cs.panel.notice} role="status">
          This unit&apos;s descriptive details are view only.
        </div>
      )}

      <FluffSectionIndex
        fluff={fluff}
        role={role}
        compact
        onJump={jumpToSection}
      />

      <div className={PAGE_GRID} data-testid="fluff-grid">
        {/* Stretches to the grid row, so when the side column runs longer the
            two columns still end on one line. */}
        <FluffNarrativeCard
          fluff={fluff}
          disabled={isReadOnly || !onFluffChange}
          onFluffChange={onFluffChange}
          className="@[64rem]:self-stretch"
        />

        <FluffSideColumn
          sections={
            <FluffSectionIndex
              fluff={fluff}
              role={role}
              onJump={jumpToSection}
            />
          }
        >
          <FluffNarrativeCard
            fluff={fluff}
            disabled={isReadOnly || !onFluffChange}
            onFluffChange={onFluffChange}
            fields={RELATED_FIELDS}
            title="Variants and Notable Units"
            headingId="fluff-related-heading"
            testId="fluff-related"
          />

          <section
            className={cs.panel.main}
            tabIndex={-1}
            aria-labelledby="fluff-role-heading"
          >
            <h3 id="fluff-role-heading" className={cs.text.cardTitle}>
              Battlefield Role
            </h3>
            {/* The same 12px subtitle as other cards' helper lines. */}
            <p className={`${cs.text.secondary} mt-1 mb-3`}>
              Shown in the unit dossier and export.
            </p>
            {/* Side label, like the Manufacturing rows below. */}
            <div className={SIDE_LABEL_ROW}>
              <label className={cs.text.label} htmlFor="fluff-role">
                Combat Role
              </label>
              <select
                id="fluff-role"
                value={role}
                disabled={isReadOnly || !onRoleChange}
                onChange={(event) => onRoleChange?.(event.target.value)}
                className={`${cs.select.full} min-h-11 scroll-mt-20`}
              >
                <option value="">Select a role</option>
                {!roleIsKnown && <option value={role}>{role}</option>}
                {ROLES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </section>

          <FluffManufacturingCard
            fluff={fluff}
            readOnly={isReadOnly}
            onFluffChange={onFluffChange}
          />
        </FluffSideColumn>
      </div>
    </div>
  );
}
