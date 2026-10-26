import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { type LocationData } from '@/components/customizer/critical-slots/criticalSlotTypes';
import { PhoneLocationNavigation } from '@/components/customizer/critical-slots/PhoneLocationNavigation';
import { MechLocation } from '@/types/construction';

it('reuses displayed occupancy for free-slot shortcuts and keeps selector and buttons in sync', () => {
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
  const headButton = screen.getByRole('button', { name: 'Head, 5 free slots' });
  const torsoButton = screen.getByRole('button', {
    name: 'Center Torso, 11 free slots',
  });
  expect(headButton).toHaveTextContent('HD 5 free');
  expect(torsoButton).toHaveTextContent('CT 11 free');
  expect(headButton).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(torsoButton);
  expect(select).toHaveValue(MechLocation.CENTER_TORSO);
  expect(torsoButton).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Center Torso grid')).toBeVisible();
  fireEvent.change(select, { target: { value: MechLocation.HEAD } });
  expect(headButton).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Head grid')).toBeVisible();
});
