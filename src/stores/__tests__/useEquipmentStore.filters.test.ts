import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';

import type { EquipmentFilters } from '../useEquipmentStore';

import { filterEquipment } from '../useEquipmentStore.filters';

const FILTERS: EquipmentFilters = {
  search: '',
  techBase: null,
  category: null,
  activeCategories: new Set<EquipmentCategory>(),
  showAllCategories: true,
  hidePrototype: false,
  hideOneShot: false,
  hideUnavailable: false,
  hideAmmoWithoutWeapon: false,
  maxWeight: null,
  maxCriticalSlots: null,
  maxYear: null,
};
const UNIT = { unitYear: null, unitTechBase: null, unitWeaponIds: [] };

function item(name: string, weight = 1): IEquipmentItem {
  return {
    id: name.toLowerCase().replaceAll(/\W+/g, '-'),
    name,
    category: EquipmentCategory.BALLISTIC_WEAPON,
    techBase: TechBase.INNER_SPHERE,
    weight,
    criticalSlots: 1,
  } as IEquipmentItem;
}

const names = (
  sort: Parameters<typeof filterEquipment>[3],
  items: IEquipmentItem[],
) => filterEquipment(items, FILTERS, UNIT, sort).map((entry) => entry.name);

describe('catalog name sort', () => {
  const items = [
    item('AC/20'),
    item('AC/10'),
    item('AC/15 Ammo'),
    item('AC/2'),
    item('AC/5'),
    item('Active Probe'),
  ];

  it('compares numbers numerically in the presentation key', () => {
    expect(names({ column: 'name', direction: 'asc' }, items)).toEqual([
      'AC/2',
      'AC/5',
      'AC/10',
      'AC/15 Ammo',
      'AC/20',
      'Active Probe',
    ]);
  });

  it('reverses the natural order for descending', () => {
    expect(names({ column: 'name', direction: 'desc' }, items)).toEqual([
      'Active Probe',
      'AC/20',
      'AC/15 Ammo',
      'AC/10',
      'AC/5',
      'AC/2',
    ]);
  });

  it('leaves numeric columns comparing by value', () => {
    expect(
      names({ column: 'weight', direction: 'asc' }, [
        item('B', 10),
        item('A', 2),
        item('C', 5),
      ]),
    ).toEqual(['A', 'C', 'B']);
  });
});
