import type { ReactElement } from 'react';

import type { IArmorSaveLoss } from '@/services/units/unitLoaderService/armorSaveLoss';

/** Shared by the existing editor diagnostics and every targeted save dialog. */
export function ArmorSaveLossNotice({
  loss,
}: {
  readonly loss?: IArmorSaveLoss;
}): ReactElement | null {
  if (!loss) return null;
  return (
    <section
      role="note"
      aria-label="Armor configuration lost on save"
      className="border-border-theme bg-surface-base text-text-theme-primary shrink-0 border-b p-3 text-sm"
    >
      <h3 className="font-medium">Armor configuration loss (1)</h3>
      <p>{loss.message}</p>
      <p className="text-text-theme-secondary mt-1">{loss.consequence}</p>
      {!!loss.locations.length && (
        <>
          <p className="mt-1">
            Per-location armor types that will not be kept:
          </p>
          <ul
            aria-label="Armor types lost by location"
            className="list-disc pl-5"
          >
            {loss.locations.map(({ location, type }) => (
              <li key={location}>
                {location}: {type}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
