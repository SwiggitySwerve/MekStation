import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { IUnitIndexEntry } from '@/types/unit/UnitIndex';
import type { ISkirmishUnitSelection } from '@/utils/gameplay/preBattleSessionBuilder';

import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { UnitPicker } from '../UnitPicker';

const mockGetIndex = jest.fn();
jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: () => ({
    getIndex: (...args: unknown[]) => mockGetIndex(...args),
  }),
}));

const entry = (
  family: IUnitIndexEntry['family'],
  id = 'tomahawk-c',
): IUnitIndexEntry => ({
  id,
  family,
  chassis: family === 'vehicles' ? 'Schrek' : 'Tomahawk',
  variant: 'C',
  name: `${family} ${id}`,
  tonnage: 50,
  bv: 1000,
  filePath: '',
  techBase: TechBase.INNER_SPHERE,
  weightClass: WeightClass.MEDIUM,
  unitType:
    family === 'vehicles'
      ? UnitType.VEHICLE
      : family === 'aerospace'
        ? UnitType.AEROSPACE
        : UnitType.BATTLEMECH,
});
beforeEach(() =>
  mockGetIndex.mockImplementation(
    async (options?: { family?: IUnitIndexEntry['family'] }) => [
      entry(options?.family ?? 'battlemechs'),
    ],
  ),
);

it('selects aerospace despite an identically named selected Mech and keeps the family on the selection', async () => {
  const selected: ISkirmishUnitSelection = {
    unitId: 'tomahawk-c',
    designation: 'Tomahawk C',
    tonnage: 50,
    bv: 1000,
    pilot: null,
  };
  const onAdd = jest.fn();
  render(
    <UnitPicker
      side="player"
      title="Roster"
      maxUnits={4}
      selectedUnits={[selected]}
      onAdd={onAdd}
      onRemove={jest.fn()}
    />,
  );
  fireEvent.change(screen.getByRole('combobox', { name: /unit family/i }), {
    target: { value: 'aerospace' },
  });
  fireEvent.click(
    await screen.findByRole('button', { name: /Add Tomahawk C/ }),
  );
  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ unitId: 'aerospace:tomahawk-c' }),
  );
  expect(mockGetIndex).toHaveBeenLastCalledWith({ family: 'aerospace' });
  expect(screen.getByText(/capital ships.*read.only/i)).toBeInTheDocument();
});

it('changes families without showing stale catalog rows', async () => {
  const onAdd = jest.fn();
  render(
    <UnitPicker
      side="player"
      title="Roster"
      maxUnits={4}
      selectedUnits={[]}
      onAdd={onAdd}
      onRemove={jest.fn()}
    />,
  );
  await screen.findByRole('button', { name: /Add Tomahawk C/ });
  fireEvent.click(screen.getByRole('button', { name: /Add Tomahawk C/ }));
  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ unitId: 'tomahawk-c' }),
  );
  fireEvent.change(screen.getByRole('combobox', { name: /unit family/i }), {
    target: { value: 'vehicles' },
  });
  fireEvent.click(await screen.findByRole('button', { name: /Add Schrek C/ }));
  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ unitId: 'vehicles:tomahawk-c' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: /Add Tomahawk C/ }),
    ).not.toBeInTheDocument(),
  );
});

it('does not expose an unsupported family supplied by the catalog', async () => {
  mockGetIndex.mockResolvedValue([
    entry('battlemechs'),
    { ...entry('capital'), chassis: 'Leopard', variant: 'CV' },
  ]);
  render(
    <UnitPicker
      side="player"
      title="Roster"
      maxUnits={4}
      selectedUnits={[]}
      onAdd={jest.fn()}
      onRemove={jest.fn()}
    />,
  );
  await screen.findByRole('button', { name: /Add Tomahawk C/ });
  expect(
    screen.queryByRole('button', { name: /Add Leopard CV/ }),
  ).not.toBeInTheDocument();
});

it('recovers from a failed catalog when switching to another family', async () => {
  mockGetIndex.mockRejectedValueOnce(new Error('Catalog unavailable'));
  render(
    <UnitPicker
      side="player"
      title="Roster"
      maxUnits={4}
      selectedUnits={[]}
      onAdd={jest.fn()}
      onRemove={jest.fn()}
    />,
  );
  await screen.findByText(/Catalog error: Catalog unavailable/);
  fireEvent.change(screen.getByRole('combobox', { name: /unit family/i }), {
    target: { value: 'vehicles' },
  });
  expect(
    await screen.findByRole('button', { name: /Add Schrek C/ }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Catalog error:/)).not.toBeInTheDocument();
});
