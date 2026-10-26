/** Responsive navigation for the existing Fluff form fields. */
import React from 'react';

import type { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { customizerStyles as cs } from '@/components/customizer/styles';

import { fieldId } from './FluffFields';
import { NARRATIVE_FIELDS, sectionWordCount } from './fluffSections';

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
      status: sectionWordCount(role),
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
              {label} · {status}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <nav
      aria-labelledby="fluff-sections-heading"
      className={`${cs.panel.main} hidden @[64rem]:block`}
    >
      <h3 id="fluff-sections-heading" className={`${cs.text.cardTitle} mb-2`}>
        Sections
      </h3>
      <ul>
        {sections.map(({ id, label, status }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                onJump(id);
              }}
              className="text-text-theme-secondary hover:bg-surface-raised focus-visible:ring-accent flex min-h-11 min-w-0 items-center justify-between gap-3 rounded px-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="min-w-0">{label}</span>
              <span className="text-text-theme-muted shrink-0 text-xs tabular-nums">
                {status}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
