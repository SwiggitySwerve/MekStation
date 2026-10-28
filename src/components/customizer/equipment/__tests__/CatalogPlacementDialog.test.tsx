import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';
import { createMountedEquipment } from '@/types/equipment/MountedEquipment';

import { CatalogPlacementDialog } from '../CatalogPlacementDialog';

const laser: IEquipmentItem = {
  id: 'medium-laser',
  name: 'Medium Laser',
  category: EquipmentCategory.ENERGY_WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 1,
  criticalSlots: 1,
  costCBills: 40000,
  battleValue: 46,
  introductionYear: 2300,
};
function setup(readOnly = false) {
  const unit = createNewUnitStore({
    name: 'Dialog test',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const onClose = jest.fn(),
    onPlaced = jest.fn();
  render(
    <UnitStoreContext.Provider value={unit}>
      <CatalogPlacementDialog
        equipment={laser}
        readOnly={readOnly}
        onClose={onClose}
        onPlaced={onPlaced}
      />
    </UnitStoreContext.Provider>,
  );
  return { unit, onClose, onPlaced, user: userEvent.setup() };
}
beforeEach(() => localStorage.clear());

it('requires a location and cancellation never adds a copy', async () => {
  const { unit, onClose, user } = setup();
  const before = unit.getState();
  expect(screen.getByRole('button', { name: 'Add and Place' })).toBeDisabled();
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Equipment location' }),
    MechLocation.LEFT_ARM,
  );
  expect(unit.getState()).toBe(before);
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(unit.getState()).toBe(before);
});

it('adds the equipment in the selected location and reports the result', async () => {
  const { unit, onPlaced, user } = setup();
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Equipment location' }),
    MechLocation.RIGHT_ARM,
  );
  await user.click(screen.getByRole('button', { name: 'Add and Place' }));
  expect(unit.getState().equipment.at(-1)).toMatchObject({
    location: MechLocation.RIGHT_ARM,
    slots: [4],
  });
  expect(onPlaced).toHaveBeenCalledWith(expect.stringContaining('Right Arm'));
});

it('disables a selected location if another edit fills it before confirmation', async () => {
  const { unit, user } = setup();
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Equipment location' }),
    MechLocation.HEAD,
  );
  act(() =>
    unit.setState({
      equipment: [
        {
          ...createMountedEquipment(laser, 'occupied'),
          location: MechLocation.HEAD,
          slots: [3],
        },
      ],
    }),
  );
  expect(screen.getByRole('button', { name: 'Add and Place' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('No contiguous space');
  expect(unit.getState().equipment).toHaveLength(1);
});

it('cannot confirm a read-only unit', () => {
  const { unit } = setup(true);
  expect(screen.getByRole('alert')).toHaveTextContent('read-only');
  expect(screen.getByRole('button', { name: 'Add and Place' })).toBeDisabled();
  expect(unit.getState().equipment).toEqual([]);
});
