import type { ReactElement } from 'react';

import type { IArmorSaveLoss } from '@/services/units/unitLoaderService/armorSaveLoss';
import type { IRawSerializedUnit } from '@/services/units/unitLoaderService/types';
import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import { useUnitLoadDiagnostics } from '@/hooks/useUnitLoadDiagnostics';
import { groupCriticalSlotNoticeEntries } from '@/services/units/unitLoaderService/criticalSlotNoticeGroups';

import { ArmorSaveLossNotice } from './ArmorSaveLossNotice';

interface INoticeProps {
  readonly entries?: readonly IUnrecoveredCriticalSlot[];
  readonly source?: IRawSerializedUnit;
  readonly unknown?: boolean;
  readonly checking?: boolean;
  readonly armorSaveLoss?: IArmorSaveLoss;
}

export function UnrecoveredCriticalSlotsNotice(
  props: INoticeProps,
): ReactElement {
  return (
    <>
      <ArmorSaveLossNotice loss={props.armorSaveLoss} />
      <CriticalSlotEntriesNotice {...props} />
    </>
  );
}

/** Both notices display the domain-owned grouping of the same loader list. */
function CriticalSlotEntriesNotice({
  entries,
  source,
  unknown = false,
  checking = false,
}: INoticeProps): ReactElement | null {
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
        <div
          role="region"
          aria-label="Unrecovered critical-slot entries"
          tabIndex={0}
          className="focus-visible:ring-accent mt-2 max-h-64 overflow-y-auto break-words focus-visible:ring-2"
        >
          {groupCriticalSlotNoticeEntries(entries, source).map((group) => (
            <section key={group.title} className="mt-2">
              <h3 className="font-medium">
                {group.title} ({group.count})
              </h3>
              {group.kinds.map((kind) => (
                <section key={kind.kind} className="mt-2">
                  <h4 className="font-medium">
                    {kind.title} ({kind.entries.length})
                  </h4>
                  {kind.effects.map(({ effect, entries: affected }) => (
                    <div key={effect.id}>
                      <p className="text-text-theme-secondary mt-1">
                        {effect.title !== kind.title &&
                          `${effect.title} (${affected.length}): `}
                        {effect.consequence}
                      </p>
                      <ul
                        aria-label={`${effect.title} critical-slot entries`}
                        className="list-disc pl-5"
                      >
                        {affected.map(({ text, location, slot }) => (
                          <li key={`${location}:${slot}`}>
                            {text} — {location} [{slot}]
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ))}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

/** Mounted once in the editor's existing diagnostics area, on every tab. */
export function EditorLoadDiagnostics(): ReactElement {
  const { entries, isRefreshing, source, armorSaveLoss } =
    useUnitLoadDiagnostics();
  return (
    <UnrecoveredCriticalSlotsNotice
      entries={entries}
      source={source}
      armorSaveLoss={armorSaveLoss}
      unknown={entries === undefined}
      checking={isRefreshing}
    />
  );
}
