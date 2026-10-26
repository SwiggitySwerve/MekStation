import { act, renderHook } from '@testing-library/react';
import React from 'react';

import { slotsToCritEntries } from '@/components/customizer/critical-slots';
import { useCriticalSlotsTabLogic } from '@/components/customizer/tabs/CriticalSlotsTab.logic';
import { getEquipmentNeedingPlacement } from '@/components/customizer/tabs/CriticalSlotsTab.placement';
import {
  buildAssignableSlots,
  handleEquipmentDropAction,
} from '@/components/customizer/tabs/CriticalSlotsTab.slotActions';
import { buildLocationSlots } from '@/components/customizer/tabs/CriticalSlotsTab.slotBuilders';
import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction';
import { TechBase, RulesLevel } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';

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

test('inline placement blocks relocation and unassign of a fixed Omni mount', () => {
  const store = createNewUnitStore({
    name: 'Fixed Omni',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const selected = store.getState().addEquipment(laser);
  store
    .getState()
    .updateEquipmentLocation(selected, MechLocation.LEFT_ARM, [4]);
  store.setState({ isOmni: true, isModified: false });
  const before = store.getState().equipment;
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(UnitStoreContext.Provider, { value: store }, children);
  const { result } = renderHook(
    () =>
      useCriticalSlotsTabLogic({
        readOnly: false,
        selectedEquipmentId: selected,
      }),
    { wrapper },
  );
  expect(
    result.current.placementOptions.every((option) => !option.canFit),
  ).toBe(true);
  expect(result.current.placementOptions[0].reason).toBe(
    'Fixed OmniMech equipment',
  );
  result.current.handleUnassignSelected();
  result.current.handlePlaceInLocation(MechLocation.RIGHT_ARM);
  expect(store.getState().equipment).toEqual(before);
  expect(store.getState().isModified).toBe(false);
});

test('a selected item can be repaired in its current full location', () => {
  const store = createNewUnitStore({
    name: 'Repair',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const selected = store.getState().addEquipment({
    ...laser,
    id: 'two-slot-item',
    name: 'Two Slot Item',
    criticalSlots: 2,
  });
  const blocker = store.getState().addEquipment({
    ...laser,
    id: 'six-slot-item',
    name: 'Six Slot Item',
    criticalSlots: 6,
  });
  store
    .getState()
    .updateEquipmentLocation(selected, MechLocation.LEFT_ARM, [4, 5]);
  store
    .getState()
    .updateEquipmentLocation(
      blocker,
      MechLocation.LEFT_ARM,
      [6, 7, 8, 9, 10, 11],
    );
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(UnitStoreContext.Provider, { value: store }, children);
  const { result } = renderHook(
    () =>
      useCriticalSlotsTabLogic({
        readOnly: false,
        selectedEquipmentId: selected,
      }),
    { wrapper },
  );

  expect(
    result.current.placementOptions.find(
      (option) => option.location === MechLocation.LEFT_ARM,
    ),
  ).toMatchObject({ canFit: true, start: 4 });
});

test('superheavy occupied slots are not offered as unwired pairing targets', () => {
  const store = createNewUnitStore({
    name: 'Superheavy',
    tonnage: 150,
    techBase: TechBase.INNER_SPHERE,
  });
  const first = store.getState().addEquipment(laser);
  const second = store.getState().addEquipment(laser);
  store.getState().updateEquipmentLocation(first, MechLocation.LEFT_ARM, [4]);
  const state = store.getState();
  const getLocationData = (location: MechLocation) => {
    const slots = buildLocationSlots(
      location,
      state.engineType,
      state.gyroType,
      state.equipment,
    );
    return {
      location,
      slots,
      entries: slotsToCritEntries(slots, true),
      isSuperheavy: true,
    };
  };
  const selectedEquipment = state.equipment.find(
    (item) => item.instanceId === second,
  )!;
  expect(
    buildAssignableSlots({
      selectedEquipment,
      readOnly: false,
      location: MechLocation.LEFT_ARM,
      getLocationData,
      unitIsSuperheavy: true,
    }),
  ).not.toContain(4);
  const updateEquipmentLocation = jest.fn();
  handleEquipmentDropAction({
    equipment: state.equipment,
    readOnly: false,
    location: MechLocation.LEFT_ARM,
    slotIndex: 4,
    equipmentId: second,
    getLocationData,
    unitIsSuperheavy: true,
    updateEquipmentLocation,
  });
  expect(updateEquipmentLocation).not.toHaveBeenCalled();
});

test('projection exposes missing slots, fixed-system collisions and both overlapping instances', () => {
  const store = createNewUnitStore({
    name: 'Conflicts',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const first = store.getState().addEquipment(laser);
  const second = store.getState().addEquipment(laser);
  let state = store.getState();
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
    ),
  ).toHaveLength(2);
  store.getState().updateEquipmentLocation(first, MechLocation.LEFT_ARM, [0]);
  store.getState().updateEquipmentLocation(second, MechLocation.LEFT_ARM, [0]);
  state = store.getState();
  const issues = getEquipmentSlotIssues(
    state.equipment,
    state.configuration,
    state.engineType,
    state.gyroType,
  );
  expect(
    issues.filter((issue) => issue.message.includes('fixed system')),
  ).toHaveLength(2);
  expect(
    issues
      .filter((issue) => issue.message.includes('and Small Laser overlap'))
      .map((issue) => issue.instanceId),
  ).toEqual(expect.arrayContaining([first, second]));
  store.getState().updateEquipmentLocation(first, MechLocation.LEFT_ARM, [4]);
  store.getState().updateEquipmentLocation(second, MechLocation.RIGHT_ARM, [4]);
  state = store.getState();
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
    ),
  ).toEqual([]);
  store.getState().clearEquipmentLocation(first);
  store.getState().removeEquipment(second);
  state = store.getState();
  expect(state.equipment).toHaveLength(1);
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
    )[0].message,
  ).toContain('needs a location');
});

test('manual compaction moves pod equipment around fixed Omni slots', () => {
  const store = createNewUnitStore({
    name: 'Omni compact',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const fixed = store.getState().addEquipment(laser);
  const pod = store.getState().addEquipment(laser);
  store.getState().updateEquipmentLocation(fixed, MechLocation.LEFT_ARM, [5]);
  store.getState().updateEquipmentLocation(pod, MechLocation.LEFT_ARM, [6]);
  store.setState({
    isOmni: true,
    equipment: store.getState().equipment.map((item) => ({
      ...item,
      isOmniPodMounted: item.instanceId === pod,
    })),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(UnitStoreContext.Provider, { value: store }, children);
  const { result } = renderHook(
    () => useCriticalSlotsTabLogic({ readOnly: false }),
    { wrapper },
  );
  act(() => result.current.handleCompact());
  expect(
    store.getState().equipment.find((item) => item.instanceId === fixed)?.slots,
  ).toEqual([5]);
  expect(
    store.getState().equipment.find((item) => item.instanceId === pod)?.slots,
  ).toEqual([4]);
});

test('equipment needing placement matches what the tab banner lists', () => {
  const store = createNewUnitStore({
    name: 'Banner',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const placed = store.getState().addEquipment(laser);
  const loose = store.getState().addEquipment({ ...laser, name: 'Loose' });
  store.getState().updateEquipmentLocation(placed, MechLocation.LEFT_ARM, [4]);
  const { equipment, configuration, engineType, gyroType, armActuators } =
    store.getState();
  const needing = getEquipmentNeedingPlacement(
    equipment,
    configuration,
    engineType,
    gyroType,
    armActuators,
  );
  expect(needing.map((item) => item.instanceId)).toEqual([loose]);
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(UnitStoreContext.Provider, { value: store }, children);
  const { result } = renderHook(
    () => useCriticalSlotsTabLogic({ readOnly: false }),
    { wrapper },
  );
  expect(result.current.unassignedEquipment).toEqual(needing);
});
