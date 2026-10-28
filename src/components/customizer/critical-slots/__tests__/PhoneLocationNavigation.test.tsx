import { fireEvent, render, screen } from '@testing-library/react';

import { MechLocation } from '@/types/construction';

import type { LocationData } from '../criticalSlotTypes';

import { PhoneLocationNavigation } from '../PhoneLocationNavigation';

const locations = [MechLocation.RIGHT_ARM, MechLocation.RIGHT_TORSO];
const grid = [
  MechLocation.RIGHT_ARM,
  MechLocation.RIGHT_TORSO,
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_LEG,
  MechLocation.LEFT_LEG,
];
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

it('shows one location with counts, one full-name heading and no accordion', () => {
  render(<PhoneLocationNavigation {...props} />);
  expect(screen.getByText('Right Arm rows')).toBeVisible();
  expect(screen.getByText('Right Torso rows')).not.toBeVisible();
  expect(screen.getAllByRole('tab')).toHaveLength(2);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.getAllByRole('heading')).toHaveLength(1);
  expect(
    screen.getByRole('heading', { name: 'Right Arm \u2014 1 of 12 used' }),
  ).toBeVisible();
  expect(screen.getByRole('tab', { name: /Right Arm/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(
    screen.getByRole('tab', { name: 'Right Torso, 1 of 12 used' }),
  ).toHaveTextContent('RT 1 / 12');
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

it('lays all eight locations in a two-row grid that arrow keys move through', () => {
  render(<PhoneLocationNavigation {...props} locations={grid} />);
  const tabs = screen.getAllByRole('tab');
  expect(tabs.map((tab) => tab.textContent)).toEqual([
    'RA 1 / 12',
    'RT 1 / 12',
    'HD 1 / 6',
    'CT 1 / 12',
    'LT 1 / 12',
    'LA 1 / 12',
    'RL 1 / 6',
    'LL 1 / 6',
  ]);
  expect(tabs[4]).toHaveAccessibleName('Left Torso, 1 of 12 used');
  tabs[1].focus();
  fireEvent.keyDown(tabs[1], { key: 'ArrowDown' });
  expect(tabs[5]).toHaveFocus();
  expect(tabs[5]).toHaveAttribute('aria-selected', 'true');
  expect(
    screen.getByRole('heading', { name: 'Left Arm \u2014 1 of 12 used' }),
  ).toBeVisible();
  fireEvent.keyDown(tabs[5], { key: 'ArrowDown' });
  expect(tabs[5]).toHaveFocus();
  fireEvent.keyDown(tabs[5], { key: 'ArrowUp' });
  expect(tabs[1]).toHaveFocus();
  fireEvent.keyDown(tabs[1], { key: 'ArrowUp' });
  expect(tabs[1]).toHaveFocus();
});
