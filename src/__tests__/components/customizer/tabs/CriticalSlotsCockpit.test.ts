import { act, renderHook } from '@testing-library/react';
import React from 'react';

import { useCriticalSlotsTabLogic } from '@/components/customizer/tabs/CriticalSlotsTab.logic';
import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { CockpitType } from '@/types/construction/CockpitType';
import { MechLocation as L } from '@/types/construction/CriticalSlotAllocation';
import { getLocationsForConfig } from '@/types/construction/MechConfigurationSystem';
import { RulesLevel, TechBase } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment';
import { getAvailableSlotIndices } from '@/utils/construction/slotOperations';

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

const createStore = () =>
  createNewUnitStore({
    name: 'Cockpit grid',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
function openGrid(
  store: ReturnType<typeof createStore>,
  selectedEquipmentId?: string,
) {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(UnitStoreContext.Provider, { value: store }, children);
  return renderHook(
    () => useCriticalSlotsTabLogic({ readOnly: false, selectedEquipmentId }),
    { wrapper },
  );
}

beforeEach(() => useCustomizerStore.getState().resetSettings());
afterEach(() => {
  useCustomizerStore.getState().resetSettings();
  jest.useRealTimers();
});

it('updates grid, placement options and warnings when the cockpit changes', () => {
  const store = createStore();
  store.getState().setCockpitType(CockpitType.SMALL);
  const id = store.getState().addEquipment(laser);
  store.getState().updateEquipmentLocation(id, L.HEAD, [4]);
  const { result } = openGrid(store, id);
  expect(result.current.getLocationData(L.HEAD).slots[3]).toMatchObject({
    type: 'system',
    name: 'Sensors',
  });
  expect(result.current.getLocationData(L.HEAD).slots[4]).toMatchObject({
    type: 'equipment',
  });
  expect(result.current.placementIssues).toEqual([]);
  expect(
    result.current.placementOptions.find((option) => option.location === L.HEAD)
      ?.canFit,
  ).toBe(true);

  act(() => store.getState().setCockpitType(CockpitType.COMMAND_CONSOLE));
  expect(
    result.current
      .getLocationData(L.HEAD)
      .slots.every((slot) => slot.type === 'system'),
  ).toBe(true);
  expect(
    result.current.placementIssues.some((issue) => issue.instanceId === id),
  ).toBe(true);
  expect(
    result.current.placementOptions.find((option) => option.location === L.HEAD)
      ?.canFit,
  ).toBe(false);

  act(() => store.getState().setCockpitType(CockpitType.TORSO_MOUNTED));
  expect(
    result.current
      .getLocationData(L.CENTER_TORSO)
      .slots.slice(10)
      .map((slot) => slot.name),
  ).toEqual(['Torso-Mounted Cockpit', 'Sensors']);
  expect(result.current.getLocationData(L.LEFT_TORSO).slots[0]).toMatchObject({
    type: 'system',
    name: 'Life Support',
  });
  expect(result.current.placementIssues).toEqual([]);
});

it.each(['handleCompact', 'handleSort'] as const)(
  '%s uses the selected small cockpit',
  (action) => {
    const store = createStore();
    store.getState().setCockpitType(CockpitType.SMALL);
    const id = store.getState().addEquipment(laser);
    store.getState().updateEquipmentLocation(id, L.HEAD, [5]);
    const { result } = openGrid(store);
    act(() => result.current[action]());
    expect(store.getState().equipment[0].slots).toEqual([4]);
    expect(result.current.placementIssues).toEqual([]);
  },
);

it.each(['autoCompact', 'autoSort'] as const)(
  '%s uses the selected torso cockpit',
  (mode) => {
    jest.useFakeTimers();
    const store = createStore();
    store.getState().setCockpitType(CockpitType.TORSO_MOUNTED);
    const id = store.getState().addEquipment(laser);
    store.getState().updateEquipmentLocation(id, L.HEAD, [5]);
    useCustomizerStore.setState({
      autoModeSettings: {
        ...useCustomizerStore.getState().autoModeSettings,
        [mode]: true,
      },
    });
    const { result } = openGrid(store);
    act(() => jest.advanceTimersByTime(100));
    expect(store.getState().equipment[0].slots).toEqual([2]);
    expect(result.current.placementIssues).toEqual([]);
  },
);

it.each(['manual', 'auto'] as const)(
  '%s fill respects small cockpit sensors and both free head cells',
  (mode) => {
    jest.useFakeTimers();
    const store = createStore();
    store.getState().setCockpitType(CockpitType.SMALL);
    const state = store.getState();
    for (const location of getLocationsForConfig(state.configuration)) {
      if (location === L.HEAD) continue;
      for (const slot of getAvailableSlotIndices(
        location,
        state.engineType,
        state.gyroType,
        [],
        state.armActuators,
        state.cockpitType,
      )) {
        const id = store.getState().addEquipment(laser);
        store.getState().updateEquipmentLocation(id, location, [slot]);
      }
    }
    const ids = Array.from({ length: 3 }, () =>
      store
        .getState()
        .addEquipment({ ...laser, id: 'endo-steel-is', name: 'Endo Steel' }),
    );
    if (mode === 'auto')
      useCustomizerStore.getState().toggleAutoFillUnhittables();
    const { result } = openGrid(store);
    act(() => {
      if (mode === 'manual') result.current.handleFill();
      else jest.advanceTimersByTime(100);
    });
    expect(
      store
        .getState()
        .equipment.filter((item) => ids.includes(item.instanceId))
        .map((item) => ({ location: item.location, slots: item.slots })),
    ).toEqual([
      { location: L.HEAD, slots: [4] },
      { location: L.HEAD, slots: [5] },
      { location: undefined, slots: undefined },
    ]);
  },
);
