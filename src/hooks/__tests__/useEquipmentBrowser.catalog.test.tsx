import { act, renderHook } from '@testing-library/react';
import React from 'react';

import { getUnitEditHistory } from '@/stores/unit/unitEditHistory';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';

import { useEquipmentBrowser } from '../useEquipmentBrowser';

/** @spec openspec/specs/equipment-browser/spec.md */
const weapon: IEquipmentItem = {
  id: 'ac-10',
  name: 'AC/10',
  category: EquipmentCategory.BALLISTIC_WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 12,
  criticalSlots: 7,
  costCBills: 200000,
  battleValue: 123,
  introductionYear: 2460,
};
const ammo = {
  ...weapon,
  id: 'ac-10-ammo',
  name: 'AC/10 Ammo',
  category: EquipmentCategory.AMMUNITION,
  compatibleWeaponIds: ['ac-10'],
};
const otherAmmo = {
  ...ammo,
  id: 'ac-5-ammo',
  name: 'AC/5 Ammo',
  compatibleWeaponIds: ['ac-5'],
};
const makeUnit = () =>
  createNewUnitStore({
    name: 'Catalog test',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });

beforeEach(() => {
  localStorage.clear();
  const store = useEquipmentStore.getState();
  store.clearFilters();
  store.toggleHideUnavailable();
  store.toggleHideAmmoWithoutWeapon();
  store.setUnitContext(null, null, []);
  store.setEquipment([weapon, ammo, otherAmmo]);
});

it('refreshes filtered results and pagination immediately after real weapon edits and undo/redo', () => {
  const unit = makeUnit();
  const { result } = renderHook(() => useEquipmentBrowser(), {
    wrapper: ({ children }) => (
      <UnitStoreContext.Provider value={unit}>
        {children}
      </UnitStoreContext.Provider>
    ),
  });
  const visibleAmmo = () =>
    result.current.paginatedEquipment
      .filter((item) => item.category === EquipmentCategory.AMMUNITION)
      .map((item) => item.id);
  let instanceId = '';
  act(() => {
    instanceId = unit.getState().addEquipment(weapon);
  });
  expect(visibleAmmo()).toEqual([ammo.id]);
  expect(result.current.totalItems).toBe(2);
  act(() => unit.getState().removeEquipment(instanceId));
  expect(visibleAmmo()).toEqual([]);
  act(() => getUnitEditHistory(unit).getState().undo());
  expect(visibleAmmo()).toEqual([ammo.id]);
  act(() => getUnitEditHistory(unit).getState().redo());
  expect(visibleAmmo()).toEqual([]);
});

it('updates the selected unit and availability without an extra filter interaction', () => {
  const one = makeUnit(),
    two = makeUnit();
  one.getState().addEquipment(weapon);
  two.getState().addEquipment({ ...weapon, id: 'ac-5', name: 'AC/5' });
  let active = one;
  const { result, rerender } = renderHook(() => useEquipmentBrowser(), {
    wrapper: ({ children }) => (
      <UnitStoreContext.Provider value={active}>
        {children}
      </UnitStoreContext.Provider>
    ),
  });
  expect(result.current.filteredEquipment.map((item) => item.id)).toContain(
    ammo.id,
  );
  active = two;
  rerender();
  expect(result.current.filteredEquipment.map((item) => item.id)).toContain(
    otherAmmo.id,
  );
  expect(result.current.filteredEquipment.map((item) => item.id)).not.toContain(
    ammo.id,
  );
  act(() => {
    useEquipmentStore.getState().toggleHideUnavailable();
    two.getState().setYear(2400);
  });
  expect(result.current.totalItems).toBe(0);
  expect(result.current.paginatedEquipment).toEqual([]);
});

it('updates numeric constraints and keeps row counts and pages in agreement', () => {
  const { result } = renderHook(() => useEquipmentBrowser());
  act(() => useEquipmentStore.getState().setMaxWeight(1));
  expect(result.current.filteredEquipment).toEqual([]);
  expect(result.current.paginatedEquipment).toEqual([]);
  expect(result.current.totalItems).toBe(0);
  act(() => result.current.goToLastPage());
  expect(result.current.currentPage).toBe(1);
  act(() => useEquipmentStore.getState().setMaxWeight(null));
  expect(result.current.totalItems).toBe(3);
});
