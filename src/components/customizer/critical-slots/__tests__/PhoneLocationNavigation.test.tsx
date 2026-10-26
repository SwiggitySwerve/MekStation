import { fireEvent, render, screen } from '@testing-library/react';

import { MechLocation } from '@/types/construction';

import type { LocationData } from '../criticalSlotTypes';

import { PhoneLocationNavigation } from '../PhoneLocationNavigation';

const locations = [MechLocation.RIGHT_ARM, MechLocation.RIGHT_TORSO];
const props = {
  locations,
  getLocationData: (location: MechLocation): LocationData => ({
    location,
    slots: [{ index: 0, type: 'system', name: 'Shoulder' }],
    entries: [],
    isSuperheavy: false,
  }),
  getAssignableSlots: () => [] as number[],
  renderLocation: (location: MechLocation) => <div>{location} rows</div>,
};

it('shows one location with counts and no duplicate heading or accordion', () => {
  render(<PhoneLocationNavigation {...props} />);
  expect(screen.getByText('Right Arm rows')).toBeVisible();
  expect(screen.getByText('Right Torso rows')).not.toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Location' })).toHaveValue(
    MechLocation.RIGHT_ARM,
  );
  expect(
    screen.getByRole('option', { name: 'Right Torso \u00b7 1/12 used' }),
  ).toBeInTheDocument();
});

it('switches the visible location and keeps keyboard focus in the selector', () => {
  render(<PhoneLocationNavigation {...props} />);
  const selector = screen.getByRole('combobox', { name: 'Location' });
  selector.focus();
  fireEvent.change(selector, { target: { value: MechLocation.RIGHT_TORSO } });
  expect(selector).toHaveValue(MechLocation.RIGHT_TORSO);
  expect(selector).toHaveFocus();
  expect(screen.getByText('Right Torso rows')).toBeVisible();
  expect(screen.getByText('Right Arm rows')).not.toBeVisible();
});

it('reveals an assignable location on a new selection without remounting rows', () => {
  const view = render(<PhoneLocationNavigation {...props} />);
  const rows = screen.getByText('Right Torso rows');
  view.rerender(
    <PhoneLocationNavigation
      {...props}
      selectedEquipmentId="laser"
      getAssignableSlots={(location) =>
        location === MechLocation.RIGHT_TORSO ? [1] : []
      }
    />,
  );
  expect(rows).toBeVisible();
  expect(screen.getByRole('combobox', { name: 'Location' })).toHaveValue(
    MechLocation.RIGHT_TORSO,
  );
  expect(screen.getByText('Right Torso rows')).toBe(rows);
  expect(screen.getByText('Right Arm rows')).not.toBeVisible();
});
