import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

import {
  ArmorLocationTable,
  buildArmorLocationTableRows,
} from '../ArmorLocationTable';

const armorData: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  {
    location: MechLocation.CENTER_TORSO,
    current: 20,
    maximum: 32,
    rear: 8,
    rearMaximum: 12,
  },
  { location: MechLocation.LEFT_ARM, current: 10, maximum: 24 },
];
const locations = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_ARM,
];
const withRear = new Set([MechLocation.CENTER_TORSO]);

describe('buildArmorLocationTableRows', () => {
  it('uses the shared face maximums and leaves rear empty off the torsos', () => {
    const rows = buildArmorLocationTableRows(armorData, locations, withRear);

    expect(
      rows.map((r) => [r.front, r.frontMax, r.rear, r.rearMax, r.max]),
    ).toEqual([
      [9, 9, undefined, undefined, 9],
      [20, 24, 8, 12, 32],
      [10, 24, undefined, undefined, 24],
    ]);
  });

  it('treats a missing location as empty', () => {
    const [row] = buildArmorLocationTableRows(
      [],
      [MechLocation.HEAD],
      new Set(),
    );
    expect(row).toMatchObject({ front: 0, frontMax: 0, max: 0 });
  });
});

describe('ArmorLocationTable', () => {
  const rows = buildArmorLocationTableRows(armorData, locations, withRear);

  it('renders a labelled column header set and one row per location', () => {
    render(
      <ArmorLocationTable
        rows={rows}
        selectedLocation={null}
        onLocationClick={jest.fn()}
      />,
    );

    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual(['Location', 'Front / max', 'Rear / max', 'Location max']);
    // Header row, the note row directly under it, then one row per location.
    expect(screen.getAllByRole('row')).toHaveLength(5);
    const note = screen.getByTestId('armor-location-table-note');
    expect(note.closest('thead')).not.toBeNull();
    expect(note).toHaveClass('text-[13px]');
    expect(note).toHaveTextContent(
      "Front and rear show points placed out of that face's limit. Location max is the whole location.",
    );
    const torso = screen.getByRole('row', { name: /Center Torso/ });
    expect(
      within(torso)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['20/24', '8/12', '32']);
  });

  it('selects through the row button, marks the selection and toggles by click', () => {
    const onLocationClick = jest.fn();
    render(
      <ArmorLocationTable
        rows={rows}
        selectedLocation={MechLocation.LEFT_ARM}
        onLocationClick={onLocationClick}
      />,
    );

    expect(screen.getByRole('button', { name: 'Left Arm' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Head' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Head' }));
    expect(onLocationClick).toHaveBeenCalledTimes(1);
    expect(onLocationClick).toHaveBeenCalledWith(MechLocation.HEAD);
    fireEvent.click(
      screen
        .getByText('Location max', { selector: 'th' })
        .closest('table')!
        .querySelectorAll('tbody tr')[1],
    );
    expect(onLocationClick).toHaveBeenLastCalledWith(MechLocation.CENTER_TORSO);
  });
});
