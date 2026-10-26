/** Responsive navigation for the existing Fluff form fields. */
import React from 'react';

import type { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { customizerStyles as cs } from '@/components/customizer/styles';
import { AppIcon } from '@/components/ui/AppIcon';

import { fieldId } from './FluffFields';
import {
  NARRATIVE_FIELDS,
  sectionRoleValue,
  sectionWordCount,
} from './fluffSections';

interface FluffSectionIndexProps {
  fluff: ISerializedFluff;
  role: string;
  compact?: boolean;
  onJump: (id: string) => void;
}

export function FluffSectionIndex({
  fluff,
  role,
  compact = false,
  onJump,
}: FluffSectionIndexProps): React.ReactElement {
  const sections = [
    ...NARRATIVE_FIELDS.map(([field, label]) => ({
      id: fieldId(field),
      label,
      status: sectionWordCount(fluff[field] ?? ''),
    })),
    {
      id: 'fluff-role',
      label: 'Battlefield Role',
      status: sectionRoleValue(role),
    },
    {
      id: 'fluff-manufacturer',
      label: 'Manufacturing',
      status: sectionWordCount(
        [
          fluff.manufacturer,
          fluff.primaryFactory,
          ...Object.values(fluff.systemManufacturer ?? {}),
        ]
          .filter(Boolean)
          .join(' '),
      ),
    },
  ];

  if (compact) {
    return (
      <div className="@[64rem]:hidden">
        <label htmlFor="fluff-jump" className={`${cs.text.label} mb-1.5 block`}>
          Jump to section
        </label>
        <select
          id="fluff-jump"
          className={`${cs.select.full} min-h-11`}
          value=""
          onChange={(event) => onJump(event.target.value)}
        >
          <option value="" disabled>
            Choose a section
          </option>
          {sections.map(({ id, label, status }) => (
            <option key={id} value={id}>
              {label} · {status.text}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <nav aria-labelledby="fluff-sections-heading" className={cs.panel.main}>
      <h3 id="fluff-sections-heading" className={`${cs.text.cardTitle} mb-2`}>
        Sections
      </h3>
      <ul className="@[24rem]:grid @[24rem]:grid-flow-col @[24rem]:grid-rows-4 @[24rem]:gap-x-3">
        {sections.map(({ id, label, status }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                onJump(id);
              }}
              className="group text-text-theme-primary hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:ring-accent flex min-h-11 min-w-0 items-center gap-2 rounded px-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="min-w-0 flex-1 group-hover:underline group-focus-visible:underline">
                {label}
              </span>
              <span
                title={status.text}
                className={`max-w-[9rem] truncate text-xs tabular-nums ${
                  status.empty
                    ? 'text-text-theme-muted/70'
                    : 'text-text-theme-secondary'
                }`}
              >
                {status.text}
              </span>
              <AppIcon
                name="chevron-right"
                size="inline"
                aria-hidden="true"
                className="text-text-theme-muted group-hover:text-accent group-focus-visible:text-accent shrink-0"
              />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
