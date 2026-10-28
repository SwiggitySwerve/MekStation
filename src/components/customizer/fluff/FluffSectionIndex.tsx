/** Responsive navigation for the existing Fluff form fields. */
import React from 'react';

import type { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { customizerStyles as cs } from '@/components/customizer/styles';
import { AppIcon } from '@/components/ui/AppIcon';

import { fieldId } from './FluffFields';
import {
  NARRATIVE_FIELDS,
  sectionFilledCount,
  sectionOptionText,
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
      status: sectionFilledCount([
        fluff.manufacturer,
        fluff.primaryFactory,
        ...Object.values(fluff.systemManufacturer ?? {}),
      ]),
    },
  ];

  if (compact) {
    return (
      // Pinned to the top of the scrolling page, right under the tab picker,
      // so it stays in reach on the long narrative. It bleeds over the tab's
      // padding with an opaque page background so text scrolls under it.
      <div
        className="bg-surface-deep border-border-theme-subtle sticky top-0 z-10 -mx-4 -mt-4 flex items-center gap-3 border-b px-4 py-2 @[64rem]:hidden"
        data-testid="fluff-jump-bar"
      >
        {/* The same size as the other field labels. */}
        <label
          htmlFor="fluff-jump"
          className={`${cs.text.label} shrink-0 whitespace-nowrap`}
        >
          Jump to Section
        </label>
        <select
          id="fluff-jump"
          className={`${cs.select.full} min-h-11 min-w-0 flex-1`}
          value=""
          onChange={(event) => onJump(event.target.value)}
        >
          <option value="" disabled>
            Choose a section
          </option>
          {sections.map(({ id, label, status }) => (
            <option key={id} value={id}>
              {sectionOptionText(label, status)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <nav aria-labelledby="fluff-sections-heading" className={cs.panel.main}>
      <h3 id="fluff-sections-heading" className={`${cs.text.cardTitle} mb-3`}>
        Sections
      </h3>
      {/* No row dividers in either column; the two-line rows line up across
          the columns instead. Every row is one pattern: label with its
          detail under it, then the status ("Filled" or a dimmer "Empty") and
          the chevron of a link. */}
      <ul className="@[24rem]:grid @[24rem]:grid-flow-col @[24rem]:grid-rows-4 @[24rem]:gap-x-3">
        {sections.map(({ id, label, status }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                onJump(id);
              }}
              className={`group hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:ring-accent flex min-h-11 min-w-0 items-center gap-2 rounded px-2 text-sm focus-visible:ring-2 focus-visible:outline-none ${
                status.empty
                  ? 'text-text-theme-secondary'
                  : 'text-text-theme-primary'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate group-hover:underline group-focus-visible:underline">
                  {label}
                </span>
                <span
                  title={status.detail}
                  className="text-text-theme-secondary block truncate text-xs leading-4 tabular-nums"
                >
                  {status.detail}
                </span>
              </span>
              <span
                className={`shrink-0 text-xs ${
                  status.empty
                    ? 'text-text-theme-muted'
                    : 'text-text-theme-secondary'
                }`}
              >
                {status.status}
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
