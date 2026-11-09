import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { getUnitEditHistory } from '@/stores/unit/unitEditHistory';
import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import { CrewCard } from '../overview/CrewCard';

jest.mock('@/stores/utils/clientSafeStorage', () => ({
  ...jest.requireActual<typeof import('@/stores/utils/clientSafeStorage')>(
    '@/stores/utils/clientSafeStorage',
  ),
  clientSafeStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
}));

function storeFor(configuration: MechConfiguration, tonnage: number) {
  const store = createNewUnitStore({
    name: 'Crew Card Fixture',
    tonnage,
    techBase: TechBase.INNER_SPHERE,
  });
  store.setState({ configuration });
  return store;
}
function show(store: ReturnType<typeof storeFor>, readOnly = false) {
  return (
    <UnitStoreContext.Provider value={store}>
      <CrewCard readOnly={readOnly} />
    </UnitStoreContext.Provider>
  );
}
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

afterEach(cleanup);

describe('CrewCard', () => {
  it('is absent for a configuration without native crew seats', () => {
    const store = storeFor(MechConfiguration.BIPED, 50);
    render(show(store));
    expect(screen.queryByTestId('overview-crew')).toBeNull();
  });

  it.each([
    [MechConfiguration.TRIPOD, 100, ['Pilot', 'Gunner']],
    [MechConfiguration.TRIPOD, 105, ['Pilot', 'Gunner', 'Tech Officer']],
    [MechConfiguration.QUADVEE, 30, ['Pilot', 'Gunner']],
  ] as const)('lists the native seats of %s at %s tons', (config, t, roles) => {
    render(show(storeFor(config, t)));
    const seats = screen
      .getAllByTestId(/^crew-seat-\d$/)
      .map((row) => row.getAttribute('data-role'));
    expect(seats).toEqual(roles);
  });

  it('assigns seats with unequal skills and leaves an unassigned seat blank', () => {
    const store = storeFor(MechConfiguration.TRIPOD, 100);
    render(show(store));
    type('Pilot Name', 'Pat');
    type('Pilot Gunnery', '3');
    expect(store.getState().crewSeats).toBeUndefined();
    type('Pilot Piloting', '4');
    expect(store.getState().crewSeats).toEqual([
      { slotIndex: 0, name: 'Pat', gunnery: 3, piloting: 4 },
    ]);
    type('Gunner Name', 'Pat');
    type('Gunner Gunnery', '2');
    type('Gunner Piloting', '6');
    expect(store.getState().crewSeats).toEqual([
      { slotIndex: 0, name: 'Pat', gunnery: 3, piloting: 4 },
      { slotIndex: 1, name: 'Pat', gunnery: 2, piloting: 6 },
    ]);
  });

  it('does not commit a skill outside 0 to 8 and marks the field invalid', () => {
    const store = storeFor(MechConfiguration.QUADVEE, 30);
    render(show(store));
    type('Pilot Name', 'Pat');
    type('Pilot Gunnery', '9');
    type('Pilot Piloting', '4');
    expect(store.getState().crewSeats).toBeUndefined();
    expect(screen.getByLabelText('Pilot Gunnery')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    type('Pilot Gunnery', '8');
    expect(store.getState().crewSeats).toEqual([
      { slotIndex: 0, name: 'Pat', gunnery: 8, piloting: 4 },
    ]);
  });

  it('clears the seat when the name is emptied and keeps the typed skills', () => {
    const store = storeFor(MechConfiguration.TRIPOD, 100);
    render(show(store));
    type('Pilot Name', 'Pat');
    type('Pilot Gunnery', '3');
    type('Pilot Piloting', '4');
    type('Pilot Name', '');
    expect(store.getState().crewSeats).toBeUndefined();
    expect(screen.getByLabelText('Pilot Gunnery')).toHaveValue(3);
    type('Pilot Name', 'Pam');
    expect(store.getState().crewSeats).toEqual([
      { slotIndex: 0, name: 'Pam', gunnery: 3, piloting: 4 },
    ]);
  });

  it('follows undo of a seat assignment', () => {
    const store = storeFor(MechConfiguration.TRIPOD, 100);
    render(show(store));
    type('Pilot Name', 'Pat');
    type('Pilot Gunnery', '3');
    type('Pilot Piloting', '4');
    React.act(() => getUnitEditHistory(store).getState().undo());
    expect(store.getState().crewSeats).toBeUndefined();
    expect(screen.getByLabelText('Pilot Name')).toHaveValue('');
    expect(screen.getByLabelText('Pilot Gunnery')).toHaveValue(null);
  });

  it('shows a saved seat when the unit is reopened', () => {
    const store = storeFor(MechConfiguration.QUADVEE, 30);
    store.setState({
      crewSeats: [{ slotIndex: 1, name: 'Gil', gunnery: 2, piloting: 7 }],
    });
    render(show(store));
    expect(screen.getByLabelText('Gunner Name')).toHaveValue('Gil');
    expect(screen.getByLabelText('Gunner Gunnery')).toHaveValue(2);
    expect(screen.getByLabelText('Pilot Name')).toHaveValue('');
  });

  it('keeps a stored Tech Officer visible as not printed at 100 tons or less', () => {
    const store = storeFor(MechConfiguration.TRIPOD, 100);
    store.setState({
      crewSeats: [{ slotIndex: 2, name: 'Tess', gunnery: 5, piloting: 6 }],
    });
    render(show(store));
    expect(screen.queryByLabelText('Tech Officer Name')).toBeNull();
    expect(screen.getByTestId('crew-stored-seat-note')).toHaveTextContent(
      'Tech Officer',
    );
  });

  it('disables every seat field when read-only', () => {
    render(show(storeFor(MechConfiguration.TRIPOD, 100), true));
    for (const label of ['Pilot Name', 'Gunner Gunnery', 'Gunner Piloting'])
      expect(screen.getByLabelText(label)).toBeDisabled();
  });
});
