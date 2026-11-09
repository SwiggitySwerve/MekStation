import { act, renderHook } from '@testing-library/react';

import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';

import { useEquipmentBrowser } from '../useEquipmentBrowser';

/** @spec openspec/specs/equipment-browser/spec.md */
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
  introductionYear: 2470,
};
const protoLaser: IEquipmentItem = {
  ...laser,
  id: 'proto-micro-laser',
  name: 'Proto Micro Laser',
  allowedUnitTypes: ['ProtoMech'],
};

beforeEach(() => {
  localStorage.clear();
  const store = useEquipmentStore.getState();
  store.clearFilters();
  store.toggleHideUnavailable();
  store.toggleHideAmmoWithoutWeapon();
  store.setUnitContext(null, null, []);
  store.setEquipment([laser, protoLaser]);
});

const ids = (items: readonly IEquipmentItem[]) => items.map((i) => i.id).sort();

it('lists the whole catalog for a caller that passes no filter', () => {
  const { result } = renderHook(() => useEquipmentBrowser());
  expect(ids(result.current.filteredEquipment)).toEqual([
    'medium-laser',
    'proto-micro-laser',
  ]);
  expect(result.current.totalItems).toBe(2);
});

it('narrows list, paging and totals to the items the filter accepts', () => {
  const { result } = renderHook(() =>
    useEquipmentBrowser({
      catalogFilter: (item) =>
        item.allowedUnitTypes?.includes('ProtoMech') ?? false,
    }),
  );
  expect(ids(result.current.filteredEquipment)).toEqual(['proto-micro-laser']);
  expect(ids(result.current.paginatedEquipment)).toEqual(['proto-micro-laser']);
  expect(result.current.totalItems).toBe(1);
});

it('still applies the browser filters on top of the catalog filter', () => {
  const { result } = renderHook(() =>
    useEquipmentBrowser({ catalogFilter: () => true }),
  );
  act(() => result.current.setSearch('proto'));
  expect(ids(result.current.filteredEquipment)).toEqual(['proto-micro-laser']);
});
