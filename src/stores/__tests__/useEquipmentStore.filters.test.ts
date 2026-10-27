import { RulesLevel } from '@/types/enums/RulesLevel';
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
    introductionYear: 2300,
    rulesLevel: RulesLevel.STANDARD,
    costCBills: 0,
    battleValue: 0,
  };
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

describe('catalog-compatible ammunition', () => {
  const ac10 = item('AC/10', 12);
  const ammo = (
    name: string,
    compatibleWeaponIds?: string[],
  ): IEquipmentItem => ({
    ...item(name),
    category: EquipmentCategory.AMMUNITION,
    compatibleWeaponIds,
  });
  const ac10Ammo = ammo('AC/10 Ammo', [ac10.id]);
  const ac15Ammo = ammo('AC/15 Ammo');
  const sort = { column: 'name', direction: 'asc' } as const;
  const filtered = (
    equipment: IEquipmentItem[],
    overrides: Partial<EquipmentFilters> = {},
    year: number | null = null,
  ) =>
    filterEquipment(
      equipment,
      { ...FILTERS, ...overrides },
      { ...UNIT, unitYear: year },
      sort,
    ).map((entry) => entry.id);

  it('hides orphan bins without deleting them, including exact fallback identities', () => {
    const catalog = [ac10, ac10Ammo, ac15Ammo, ammo('AC/20 Ammo')];
    expect(filtered(catalog)).toEqual([ac10.id, ac10Ammo.id]);
    expect(catalog).toHaveLength(4);
    expect(filtered([...catalog, item('AC/15')])).toContain(ac15Ammo.id);
  });

  it('keeps ammo-only search, category, weight and slot browsing independent of weapon presentation', () => {
    expect(
      filtered([ac10, ac10Ammo], {
        search: 'Ammo',
        category: EquipmentCategory.AMMUNITION,
        maxWeight: 1,
        maxCriticalSlots: 1,
      }),
    ).toEqual([ac10Ammo.id]);
    expect(
      filtered([{ ...ac10, criticalSlots: 7 }, ac10Ammo], {
        activeCategories: new Set([EquipmentCategory.AMMUNITION]),
        showAllCategories: false,
        maxCriticalSlots: 1,
      }),
    ).toEqual([ac10Ammo.id]);
  });

  it('hides ammunition during its compatible weapon extinction and restores it at reintroduction', () => {
    const lostech = { ...ac10, extinctionYear: 2900, reintroductionYear: 3040 };
    const catalog = [lostech, ac10Ammo];
    expect(filtered(catalog, { hideUnavailable: true }, 3028)).not.toContain(
      ac10Ammo.id,
    );
    expect(filtered(catalog, { hideUnavailable: true }, 3040)).toContain(
      ac10Ammo.id,
    );
    expect(filtered(catalog, { maxYear: 3028 })).not.toContain(ac10Ammo.id);
    expect(filtered(catalog, { hideUnavailable: false }, 3028)).toContain(
      ac10Ammo.id,
    );
  });

  it('checks explicit tech base, prototypes and one-shot restrictions on compatible weapons', () => {
    const clanWeapon = { ...ac10, techBase: TechBase.CLAN };
    expect(
      filtered([clanWeapon, ac10Ammo], { techBase: TechBase.INNER_SPHERE }),
    ).toEqual([]);
    const prototype = { ...ac10, rulesLevel: RulesLevel.EXPERIMENTAL };
    expect(filtered([prototype, ac10Ammo], { hidePrototype: true })).toEqual(
      [],
    );
    expect(
      filtered([{ ...ac10, name: 'AC/10 (OS)' }, ac10Ammo], {
        hideOneShot: true,
      }),
    ).toEqual([]);
    expect(
      filtered([clanWeapon, ac10, ac10Ammo], {
        techBase: TechBase.INNER_SPHERE,
      }),
    ).toContain(ac10Ammo.id);
  });

  it('also checks the unit tech base and does not accept mounted IDs absent from the catalog', () => {
    const clanWeapon = { ...ac10, techBase: TechBase.CLAN };
    const context = {
      unitYear: 3028,
      unitTechBase: TechBase.INNER_SPHERE,
      unitWeaponIds: [ac10.id],
    };
    const filters = {
      ...FILTERS,
      hideUnavailable: true,
      hideAmmoWithoutWeapon: true,
    };
    expect(
      filterEquipment([clanWeapon, ac10Ammo], filters, context, sort),
    ).toEqual([]);
    expect(filterEquipment([ac10Ammo], filters, context, sort)).toEqual([]);
  });

  it('keeps the mounted-weapon restriction independent and honors declared compatibility', () => {
    const catalog = [
      ac10,
      ac10Ammo,
      ammo('AC/10 Ammo (wrong declaration)', ['different-weapon']),
    ];
    const filters = { ...FILTERS, hideAmmoWithoutWeapon: true };
    expect(
      filterEquipment(catalog, filters, { ...UNIT, unitYear: 3028 }, sort).map(
        (entry) => entry.id,
      ),
    ).toEqual([ac10.id]);
    expect(
      filterEquipment(
        catalog,
        filters,
        { ...UNIT, unitWeaponIds: [ac10.id] },
        sort,
      ).map((entry) => entry.id),
    ).toEqual([ac10.id, ac10Ammo.id]);
  });
});
