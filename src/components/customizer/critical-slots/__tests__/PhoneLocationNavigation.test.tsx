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
  expect(screen.getAllByRole('tab')).toHaveLength(2);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /Right Arm/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(
    screen.getByRole('tab', { name: 'Right Torso · 1/12 used, 11 free' }),
  ).toHaveTextContent('RT 1/12');
});

it('switches the visible location and keeps keyboard focus in the selector', () => {
  render(<PhoneLocationNavigation {...props} />);
  const first = screen.getByRole('tab', { name: /Right Arm/ });
  first.focus();
  fireEvent.keyDown(first, { key: 'ArrowRight' });
  const torso = screen.getByRole('tab', { name: /Right Torso/ });
  expect(torso).toHaveAttribute('aria-selected', 'true');
  expect(torso).toHaveFocus();
  expect(screen.getByText('Right Torso rows')).toBeVisible();
  expect(screen.getByText('Right Arm rows')).not.toBeVisible();
  fireEvent.keyDown(torso, { key: 'ArrowRight' });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'End' });
  expect(torso).toHaveFocus();
  fireEvent.keyDown(torso, { key: 'Home' });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'ArrowLeft' });
  expect(torso).toHaveFocus();
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
  expect(screen.getByRole('tab', { name: /Right Torso/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(screen.getByText('Right Torso rows')).toBe(rows);
  expect(screen.getByText('Right Arm rows')).not.toBeVisible();
});
