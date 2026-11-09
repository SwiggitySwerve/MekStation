import { act, renderHook } from '@testing-library/react';

import { useUnitEditorLoadout } from '@/components/customizer/UnitEditorWithRoutingLoadout';
import { createNewUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction';
import { CockpitType } from '@/types/construction/CockpitType';
import { TechBase, RulesLevel } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment';

const laser = {
  id: 'small-laser',
  name: 'Small Laser',
  category: EquipmentCategory.ENERGY_WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 0.5,
  criticalSlots: 1,
  costCBills: 11250,
  battleValue: 9,
  introductionYear: 2300,
};

test.each([
  [CockpitType.SMALL, 4],
  [CockpitType.TORSO_MOUNTED, 2],
  [CockpitType.SMALL_COMMAND_CONSOLE, 5],
] as const)('quick assign honors the %s cockpit head', (cockpit, slot) => {
  const store = createNewUnitStore({
    name: 'Cockpit placement',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  store.getState().setCockpitType(cockpit);
  const id = store.getState().addEquipment(laser);
  const { result } = renderHook(() =>
    useUnitEditorLoadout({ ...store.getState(), unitId: store.getState().id }),
  );
  act(() => result.current.handleQuickAssign(id, MechLocation.HEAD));
  expect(store.getState().equipment[0].slots).toEqual([slot]);
});

test('biped quick assign only offers its eight actual locations', () => {
  const store = createNewUnitStore({
    name: 'Placement test',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const id = store.getState().addEquipment(laser);
  const { result } = renderHook(() =>
    useUnitEditorLoadout({
      ...store.getState(),
      unitId: store.getState().id,
    }),
  );
  act(() => result.current.handleSelectEquipment(id));
  expect(
    result.current.availableLocations.map((item) => item.location),
  ).toEqual(
    expect.arrayContaining([
      MechLocation.HEAD,
      MechLocation.CENTER_TORSO,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
      MechLocation.LEFT_ARM,
      MechLocation.RIGHT_ARM,
      MechLocation.LEFT_LEG,
      MechLocation.RIGHT_LEG,
    ]),
  );
  expect(result.current.availableLocations).toHaveLength(8);
});

test('location-only imported equipment stays visible as needing placement', () => {
  const store = createNewUnitStore({
    name: 'Placement test',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const id = store.getState().addEquipment(laser);
  store.setState({
    equipment: store.getState().equipment.map((item) => ({
      ...item,
      location: MechLocation.LEFT_ARM,
      slots: undefined,
    })),
  });
  const { result } = renderHook(() =>
    useUnitEditorLoadout({
      ...store.getState(),
      unitId: store.getState().id,
    }),
  );
  expect(
    result.current.loadoutEquipment.find((item) => item.instanceId === id)
      ?.isAllocated,
  ).toBe(false);
});

test('selection clears when the active unit changes even if the instance id is shared', () => {
  const store = createNewUnitStore({
    name: 'First unit',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const id = store.getState().addEquipment(laser);
  const sharedOptions = store.getState();
  const { result, rerender } = renderHook(
    ({ unitId }) =>
      useUnitEditorLoadout({
        ...sharedOptions,
        unitId,
      }),
    { initialProps: { unitId: 'unit-a' } },
  );

  act(() => result.current.handleSelectEquipment(id));
  expect(result.current.selectedEquipmentId).toBe(id);

  rerender({ unitId: 'unit-b' });

  expect(result.current.selectedEquipmentId).toBeNull();
});
