/**
 * Armor location table
 *
 * Compact list of every location's armor beside the silhouette. It reads the
 * same per-location data the diagram plates use. Front and rear are plain
 * counts and the Total column carries the one maximum: front and rear share
 * the location's cap, so there is no separate per-side maximum to misread.
 * Selecting a row selects the location exactly like clicking its plate.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

import { getArmorStatusColor } from './shared/ArmorFills';

export interface IArmorLocationTableRow {
  readonly location: MechLocation;
  readonly front: number;
  /** Undefined for locations without rear armor. */
  readonly rear?: number;
  /** Front plus rear armor allocated. */
  readonly total: number;
  /** Whole-location maximum, shared by front and rear. */
  readonly max: number;
  /** Same health color the silhouette plate uses. */
  readonly statusColor: string;
}

/**
 * Project the diagram's armor data into table rows.
 *
 * @param locationsWithRear - Locations that show a rear face (the plates that
 *   carry one in the diagram)
 */
export function buildArmorLocationTableRows(
  armorData: readonly LocationArmorData[],
  locations: readonly MechLocation[],
  locationsWithRear: ReadonlySet<MechLocation>,
): IArmorLocationTableRow[] {
  return locations.map((location) => {
    const data = armorData.find((item) => item.location === location);
    const front = data?.current ?? 0;
    const max = data?.maximum ?? 0;
    const hasRear = locationsWithRear.has(location);
    const rear = hasRear ? (data?.rear ?? 0) : 0;
    return {
      location,
      front,
      ...(hasRear ? { rear } : {}),
      total: front + rear,
      max,
      statusColor: getArmorStatusColor(front + rear, max),
    };
  });
}

interface ArmorLocationTableProps {
  readonly rows: readonly IArmorLocationTableRow[];
  readonly selectedLocation: MechLocation | null;
  readonly onLocationClick: (location: MechLocation) => void;
  readonly className?: string;
}

const HEADER_CLASS =
  'text-text-theme-secondary px-2 py-1.5 text-xs font-medium tracking-wide whitespace-nowrap uppercase';
const NUMBER_CELL_CLASS =
  'px-2 py-0 text-right text-sm whitespace-nowrap tabular-nums';
/** The last column keeps the card's 16px padding so a selected row never touches the card edge. */
const LAST_COLUMN_PAD = 'pr-4!';

function FaceValue({ value }: { readonly value?: number }): React.ReactElement {
  if (value === undefined) {
    return (
      <>
        <span aria-hidden="true" className="text-text-theme-muted">
          &mdash;
        </span>
        <span className="sr-only">No rear armor</span>
      </>
    );
  }
  return <span className="text-text-theme-primary">{value}</span>;
}

function TotalValue({
  total,
  max,
}: {
  readonly total: number;
  readonly max: number;
}): React.ReactElement {
  return (
    <>
      <span className="text-text-theme-primary font-semibold">{total}</span>
      <span className="text-text-theme-secondary"> / {max}</span>
    </>
  );
}

export function ArmorLocationTable({
  rows,
  selectedLocation,
  onLocationClick,
  className = '',
}: ArmorLocationTableProps): React.ReactElement {
  return (
    <div className={className} data-testid="armor-location-table">
      <table className="w-full border-collapse">
        <caption className="sr-only">Armor by location</caption>
        <thead>
          <tr className="border-border-theme-subtle border-b">
            <th scope="col" className={`${HEADER_CLASS} text-left`}>
              Location
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Front
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Rear
            </th>
            <th
              scope="col"
              className={`${HEADER_CLASS} ${LAST_COLUMN_PAD} text-right`}
            >
              Total
            </th>
          </tr>
          <tr className="border-border-theme-subtle border-b">
            <td
              colSpan={4}
              data-testid="armor-location-table-note"
              className="text-text-theme-secondary px-2 pt-1 pb-2 text-[13px] leading-snug whitespace-nowrap"
            >
              Front + rear share the location max.
            </td>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedLocation === row.location;
            return (
              <tr
                key={row.location}
                onClick={() => onLocationClick(row.location)}
                data-selected={selected ? 'true' : undefined}
                className={`border-border-theme-subtle cursor-pointer border-b transition-colors last:border-b-0 ${
                  selected ? 'bg-accent/15' : 'hover:bg-surface-raised/60'
                }`}
              >
                <th
                  scope="row"
                  className={`p-0 text-left font-normal ${
                    selected
                      ? 'shadow-[inset_3px_0_0_var(--accent-primary)]'
                      : ''
                  }`}
                >
                  {/* The click bubbles to the row, so mouse and keyboard
                      (Enter/Space on this button) select the same way. */}
                  <button
                    type="button"
                    aria-pressed={selected}
                    className="text-text-theme-primary focus-visible:ring-accent flex min-h-11 w-full items-center gap-2 px-2 text-left text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: row.statusColor }}
                    />
                    <span className={selected ? 'font-semibold' : ''}>
                      {row.location}
                    </span>
                  </button>
                </th>
                <td className={NUMBER_CELL_CLASS}>
                  <FaceValue value={row.front} />
                </td>
                <td className={NUMBER_CELL_CLASS}>
                  <FaceValue value={row.rear} />
                </td>
                <td className={`${NUMBER_CELL_CLASS} ${LAST_COLUMN_PAD}`}>
                  <TotalValue total={row.total} max={row.max} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
