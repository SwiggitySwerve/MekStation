import { act, render, screen } from '@testing-library/react';

import { createEditorLibrarySaveReceipt } from '@/stores/unitSaveStateAdapters';
import { createNewVehicleStore } from '@/stores/useVehicleStore';
import { registerVehicleStore } from '@/stores/vehicleStoreRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  clearSaveFamilies,
  SAVE_TEST_ID,
  saveFamilies,
} from '../../tabs/__tests__/saveStateFamilies.test-support';
import { UnitSaveStatus } from '../UnitSaveStatus';
import { UnitSaveDetails } from '../UnitSaveSummary';

beforeEach(clearSaveFamilies);
afterEach(clearSaveFamilies);

it.each(saveFamilies)(
  'reads and subscribes to $family receipts, including same-ID collisions',
  ({ setup, unitType }) => {
    const decoy = saveFamilies[0].setup();
    decoy.store.setState({
      librarySave: createEditorLibrarySaveReceipt(decoy.editor(), {
        id: 'decoy',
        version: 9,
      }),
    });
    const session = setup();
    session.store.setState({
      librarySave: createEditorLibrarySaveReceipt(session.editor(), {
        id: 'actual',
        version: 4,
      }),
      isModified: false,
    });
    const original = session.store.getState();
    render(
      <>
        <UnitSaveStatus unitId={SAVE_TEST_ID} unitType={unitType} />
        <UnitSaveDetails unitId={SAVE_TEST_ID} unitType={unitType} />
      </>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('In Library v4');
    expect(screen.getByTestId('unit-save-details')).toHaveTextContent(
      'In Library v4',
    );
    act(() => session.store.setState({ lastModifiedAt: 123 }));
    expect(screen.getByRole('status')).toHaveTextContent('In Library v4');
    act(session.editNested);
    expect(screen.getByRole('status')).toHaveTextContent('Changed Since v4');
    expect(screen.getByTestId('unit-save-details')).toHaveTextContent(
      'Changed Since v4',
    );
    act(() => session.store.setState(original));
    expect(screen.getByRole('status')).toHaveTextContent('In Library v4');
  },
);

it('switches the same ID between family subscriptions without using a mech receipt', () => {
  const vehicle = saveFamilies[1].setup();
  vehicle.store.setState({
    librarySave: createEditorLibrarySaveReceipt(vehicle.editor(), {
      id: 'vehicle',
      version: 2,
    }),
  });
  const infantry = saveFamilies[3].setup();
  infantry.store.setState({
    librarySave: createEditorLibrarySaveReceipt(infantry.editor(), {
      id: 'infantry',
      version: 5,
    }),
  });
  const { rerender } = render(
    <UnitSaveStatus unitId={SAVE_TEST_ID} unitType={UnitType.VEHICLE} />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('In Library v2');
  rerender(
    <UnitSaveStatus unitId={SAVE_TEST_ID} unitType={UnitType.INFANTRY} />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('In Library v5');
  act(vehicle.editNested);
  expect(screen.getByRole('status')).toHaveTextContent('In Library v5');
});

it('reports a changed receipt rather than crashing on an invalid intermediate native draft', () => {
  const store = createNewVehicleStore({
    id: SAVE_TEST_ID,
    name: 'Vehicle',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  registerVehicleStore(store);
  store.setState({
    librarySave: createEditorLibrarySaveReceipt(
      { store: 'vehicle', state: store.getState() },
      { id: 'vehicle', version: 2 },
    ),
  });
  render(<UnitSaveStatus unitId={SAVE_TEST_ID} unitType={UnitType.VEHICLE} />);
  expect(screen.getByRole('status')).toHaveTextContent('In Library v2');
  act(() => store.setState({ crewSize: -1 }));
  expect(screen.getByRole('status')).toHaveTextContent('Changed Since v2');
});
