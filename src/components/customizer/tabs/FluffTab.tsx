/**
 * Fluff Tab Component
 *
 * Non-mechanical unit information (history, description, manufacturer).
 * Wide editors show the narrative in a reading column beside a compact
 * column holding the role and manufacturing cards; narrower editors stack
 * narrative, role, manufacturing in one column.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useRef } from 'react';

import type { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { FluffManufacturingCard } from '@/components/customizer/fluff/FluffManufacturingCard';
import { FluffNarrativeCard } from '@/components/customizer/fluff/FluffNarrativeCard';
import { FluffSectionIndex } from '@/components/customizer/fluff/FluffSectionIndex';
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

/** Role and manufacturing stay in view beside long narrative text. */
const SIDE_COLUMN =
  'flex min-w-0 flex-col gap-5 @[64rem]:sticky @[64rem]:top-4 @[64rem]:max-h-[calc(100dvh-12rem)] @[64rem]:overflow-y-auto';

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
        <FluffNarrativeCard
          fluff={fluff}
          disabled={isReadOnly || !onFluffChange}
          onFluffChange={onFluffChange}
        />

        <div className={SIDE_COLUMN} data-testid="fluff-side-column">
          <section
            className={cs.panel.main}
            tabIndex={-1}
            aria-labelledby="fluff-role-heading"
          >
            <h3 id="fluff-role-heading" className={cs.text.cardTitle}>
              Battlefield Role
            </h3>
            <p className="text-text-theme-secondary mt-1 mb-3 text-sm">
              A quick classification used in the unit dossier and export.
            </p>
            <label className="block" htmlFor="fluff-role">
              <span className={`${cs.text.label} mb-1.5 block`}>
                Combat Role
              </span>
              <select
                id="fluff-role"
                value={role}
                disabled={isReadOnly || !onRoleChange}
                onChange={(event) => onRoleChange?.(event.target.value)}
                className={`${cs.select.full} min-h-11`}
              >
                <option value="">Select a role</option>
                {!roleIsKnown && <option value={role}>{role}</option>}
                {ROLES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </section>

          <FluffManufacturingCard
            fluff={fluff}
            readOnly={isReadOnly}
            onFluffChange={onFluffChange}
          />
          <FluffSectionIndex fluff={fluff} role={role} onJump={jumpToSection} />
        </div>
      </div>
    </div>
  );
}
