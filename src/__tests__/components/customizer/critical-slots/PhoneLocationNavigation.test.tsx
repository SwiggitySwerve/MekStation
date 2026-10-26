import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { type LocationData } from '@/components/customizer/critical-slots/criticalSlotTypes';
import { PhoneLocationNavigation } from '@/components/customizer/critical-slots/PhoneLocationNavigation';
import { MechLocation } from '@/types/construction';

it('shows displayed used/free occupancy in a single selector, counting paired entries once', () => {
  const head: LocationData = {
    location: MechLocation.HEAD,
    isSuperheavy: false,
    slots: [{ index: 0, type: 'system', name: 'Life Support' }],
    entries: [],
  };
  const torso: LocationData = {
    location: MechLocation.CENTER_TORSO,
    isSuperheavy: true,
    slots: [],
    entries: [
      {
        index: 0,
        isDoubleSlot: true,
        primary: { index: 0, type: 'equipment', name: 'Heat Sink' },
        secondary: { index: 0, type: 'equipment', name: 'Heat Sink' },
      },
    ],
  };
  render(
    <PhoneLocationNavigation
      locations={[MechLocation.HEAD, MechLocation.CENTER_TORSO]}
      getLocationData={(location) =>
        location === MechLocation.HEAD ? head : torso
      }
      getAssignableSlots={() => []}
      renderLocation={(location) => <p>{location} grid</p>}
    />,
  );
  const select = screen.getByRole('combobox', { name: 'Location' });
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(
    screen.getByRole('option', { name: 'Head · 1/6 used, 5 free' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('option', { name: 'Center Torso · 1/12 used, 11 free' }),
  ).toBeInTheDocument();
  fireEvent.change(select, { target: { value: MechLocation.CENTER_TORSO } });
  expect(select).toHaveValue(MechLocation.CENTER_TORSO);
  expect(screen.getByText('Center Torso grid')).toBeVisible();
  fireEvent.change(select, { target: { value: MechLocation.HEAD } });
  expect(screen.getByText('Head grid')).toBeVisible();
});
