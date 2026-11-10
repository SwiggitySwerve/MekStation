import type { ReactElement } from 'react';

import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import { useUnitLoadDiagnostics } from '@/hooks/useUnitLoadDiagnostics';

/** The editor and save dialog display the same loader result without classifying cells. */
export function UnrecoveredCriticalSlotsNotice({
  entries,
  unknown = false,
  checking = false,
}: {
  readonly entries?: readonly IUnrecoveredCriticalSlot[];
  readonly unknown?: boolean;
  readonly checking?: boolean;
}): ReactElement | null {
  if (!entries?.length && !unknown) return null;
  return (
    <section
      role="note"
      aria-label="Critical-slot entries lost on save"
      className="border-border-theme bg-surface-base text-text-theme-primary shrink-0 border-b p-3 text-sm"
    >
      <p className="font-medium">
        {unknown
          ? 'This draft predates critical-slot loss tracking and may be missing critical-slot entries. Saving may remove them from this design.'
          : 'These critical-slot entries could not be loaded as equipment and will not be kept if you save. Saving will remove them from this design.'}
      </p>
      <p className="text-text-theme-secondary mt-1">
        {unknown
          ? 'Why? No loader loss list was saved with this older draft.'
          : 'Why? The loader could not place the entries listed below. Slot numbers are zero-based.'}
      </p>
      {checking && (
        <p role="status">
          Checking the original source for missing critical-slot entries…
        </p>
      )}
      {!!entries?.length && (
        <ul
          aria-label="Unrecovered critical-slot entries"
          tabIndex={0}
          className="focus-visible:ring-accent mt-2 max-h-48 list-disc overflow-y-auto pl-5 break-words focus-visible:ring-2"
        >
          {entries.map(({ text, location, slot }) => (
            <li key={`${location}:${slot}`}>
              {text} — {location} [{slot}]
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Mounted once in the editor's existing diagnostics area, on every tab. */
export function EditorLoadDiagnostics(): ReactElement {
  const { entries, isRefreshing } = useUnitLoadDiagnostics();
  return (
    <UnrecoveredCriticalSlotsNotice
      entries={entries}
      unknown={entries === undefined}
      checking={isRefreshing}
    />
  );
}
