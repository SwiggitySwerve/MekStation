/**
 * Armor location table
 *
 * Compact list of every location's armor beside the silhouette. It reads the
 * same per-location data the diagram plates use, and the shared face-maximum
 * helper the plates and the location editor use, so the three never disagree.
 * Selecting a row selects the location exactly like clicking its plate.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

import { getArmorFaceMaximums } from './shared/ArmorFaceMaximums';
import { getArmorStatusColor } from './shared/ArmorFills';

export interface IArmorLocationTableRow {
  readonly location: MechLocation;
  readonly front: number;
  readonly frontMax: number;
  /** Undefined for locations without rear armor. */
  readonly rear?: number;
  readonly rearMax?: number;
  /** Whole-location maximum. */
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
    const faces = getArmorFaceMaximums(max, front, rear);
    return {
      location,
      front,
      frontMax: faces.front,
      ...(hasRear ? { rear, rearMax: faces.rear } : {}),
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
  'text-text-theme-secondary px-2 py-1.5 text-xs font-medium tracking-wide uppercase';
const NUMBER_CELL_CLASS =
  'px-2 py-0 text-right text-sm whitespace-nowrap tabular-nums';

function FaceValue({
  value,
  max,
}: {
  readonly value?: number;
  readonly max?: number;
}): React.ReactElement {
  if (value === undefined || max === undefined) {
    return (
      <>
        <span aria-hidden="true" className="text-text-theme-muted">
          &mdash;
        </span>
        <span className="sr-only">No rear armor</span>
      </>
    );
  }
  return (
    <>
      <span className="text-text-theme-primary font-semibold">{value}</span>
      <span className="text-text-theme-secondary">/{max}</span>
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
              Front / max
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Rear / max
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Location max
            </th>
          </tr>
          <tr className="border-border-theme-subtle border-b">
            <td
              colSpan={4}
              data-testid="armor-location-table-note"
              className="text-text-theme-secondary px-2 pt-1 pb-2 text-[13px] leading-snug"
            >
              Front and rear show points placed out of that face&apos;s limit.
              Location max is the whole location.
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
                  <FaceValue value={row.front} max={row.frontMax} />
                </td>
                <td className={NUMBER_CELL_CLASS}>
                  <FaceValue value={row.rear} max={row.rearMax} />
                </td>
                <td
                  className={`${NUMBER_CELL_CLASS} text-text-theme-secondary`}
                >
                  {row.max}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
