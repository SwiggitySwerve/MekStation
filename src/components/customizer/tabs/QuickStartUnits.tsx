/**
 * Quick-start units for the customizer's empty state.
 *
 * Offers a few well-known canonical BattleMechs (light to assault) so a new
 * user can open something real in one click. The units come from the canonical
 * unit index the Add unit dialog already uses and open through the same load
 * path as a catalog selection; a unit missing from the index is simply not
 * shown.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import React, { useEffect, useState } from 'react';

import type { LoadUnitSource } from '@/components/customizer/dialogs/UnitLoadDialog';

import { IUnitIndexEntry } from '@/services/common/types';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { formatTons } from '@/utils/formatting';

/** Chassis and variant of each quick-start unit, light to assault. */
export const QUICK_START_UNITS: ReadonlyArray<{
  readonly chassis: string;
  readonly variant: string;
}> = [
  { chassis: 'Locust', variant: 'LCT-1V' },
  { chassis: 'Hunchback', variant: 'HBK-4G' },
  { chassis: 'Marauder', variant: 'MAD-3R' },
  { chassis: 'Atlas', variant: 'AS7-D' },
];

/** Picks the quick-start units that exist in the canonical index. */
export function resolveQuickStartUnits(
  index: readonly IUnitIndexEntry[],
): IUnitIndexEntry[] {
  return QUICK_START_UNITS.flatMap(({ chassis, variant }) => {
    const match = index.find(
      (unit) => unit.chassis === chassis && unit.variant === variant,
    );
    return match ? [match] : [];
  });
}

interface QuickStartUnitsProps {
  readonly isLoadingUnit: boolean;
  readonly onLoadUnit: (
    unit: IUnitIndexEntry,
    source: LoadUnitSource,
  ) => Promise<void>;
}

export function QuickStartUnits({
  isLoadingUnit,
  onLoadUnit,
}: QuickStartUnitsProps): React.ReactElement | null {
  const [units, setUnits] = useState<IUnitIndexEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    getCanonicalUnitService()
      .getIndex()
      .then((index) => {
        if (active) setUnits(resolveQuickStartUnits(index));
      })
      .catch(() => {
        if (active) setUnits([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Index unavailable or none of the units found: leave the buttons alone.
  if (units !== null && units.length === 0) return null;

  return (
    <section
      aria-labelledby="quick-start-units-title"
      className="border-border-theme-subtle mt-8 min-h-[9.5rem] border-t pt-5"
      data-testid="quick-start-units"
    >
      <h3
        id="quick-start-units-title"
        className="text-text-theme-secondary mb-3 text-xs font-semibold tracking-wider uppercase"
      >
        Or Start from a Classic
      </h3>
      {units !== null && (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
          {units.map((unit) => (
            <li key={unit.id} className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  void onLoadUnit(unit, 'canonical');
                }}
                disabled={isLoadingUnit}
                className="bg-surface-raised hover:bg-surface-base border-border-theme-subtle text-text-theme-primary focus-visible:outline-text-theme-primary flex min-h-11 w-full min-w-0 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              >
                <span className="w-full truncate text-sm font-medium">
                  {unit.chassis} {unit.variant}
                </span>
                <span className="text-text-theme-secondary text-xs tabular-nums">
                  {formatTons(unit.tonnage, 0)} · {unit.weightClass}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
