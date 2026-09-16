import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';

import autocannon from '../../../public/data/equipment/official/ammunition/autocannon.json';
import gauss from '../../../public/data/equipment/official/ammunition/gauss.json';
import lrm from '../../../public/data/equipment/official/ammunition/lrm.json';
import srm from '../../../public/data/equipment/official/ammunition/srm.json';

/** @spec openspec/specs/equipment-browser/spec.md */
type CatalogItem = IEquipmentItem & {
  compatibleWeaponIds?: readonly string[];
};

const ammunition: CatalogItem[] = [autocannon, gauss, lrm, srm].flatMap(
  (file) =>
    file.items.map((item) => ({
      ...item,
      category: EquipmentCategory.AMMUNITION,
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.STANDARD,
      costCBills: item.costPerTon,
    })),
);
const electronics: CatalogItem = {
  id: 'beagle-probe',
  name: 'Active Probe (Beagle)',
  category: EquipmentCategory.ELECTRONICS,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 1.5,
  criticalSlots: 2,
  costCBills: 200000,
  battleValue: 10,
  introductionYear: 3048,
};
const misc: CatalogItem = {
  ...electronics,
  id: 'case',
  name: 'CASE',
  category: EquipmentCategory.MISC_EQUIPMENT,
};
const store = () => useEquipmentStore.getState();
const ids = () =>
  store()
    .getFilteredEquipment()
    .map((item) => item.id);

beforeEach(() => {
  store().clearFilters();
  store().toggleHideUnavailable();
  store().setUnitContext(null, null, []);
  store().setEquipment([...ammunition, electronics, misc]);
});

it.each([
  ['srm-6', 'srm-ammo'],
  ['clan-srm-6', 'srm-ammo'],
  ['lrm-20', 'lrm-ammo'],
  ['clan-lrm-20', 'lrm-ammo'],
  ['gauss-rifle', 'gauss-ammo'],
  ['ac-2', 'ac-2-ap-ammo'],
])('keeps declared compatible ammunition for %s', (weaponId, ammoId) => {
  store().setUnitContext(3150, TechBase.INNER_SPHERE, [weaponId]);
  store().toggleHideAmmoWithoutWeapon();
  expect(ids()).toContain(ammoId);
  expect(ids()).toContain(electronics.id);
});

it('does not confuse AC/2 and AC/20 or override explicit declarations', () => {
  store().setUnitContext(3150, TechBase.INNER_SPHERE, ['ac-2']);
  store().toggleHideAmmoWithoutWeapon();
  expect(ids()).toContain('ac-2-ammo');
  expect(ids()).not.toContain('ac-20-ammo');
  store().setEquipment([
    { ...ammunition[0], name: 'AC/2 Ammo', compatibleWeaponIds: ['ac-20'] },
  ]);
  expect(ids()).toEqual([]);
});

it('uses exact imported identities when compatibility declarations are absent', () => {
  store().setUnitContext(3150, TechBase.INNER_SPHERE, ['srm-2']);
  store().toggleHideAmmoWithoutWeapon();
  expect(ids()).toContain('ammo-srm-2');
  expect(ids()).not.toContain('ammo-srm-6');
});

it('distinguishes an empty loadout from standalone browsing', () => {
  store().toggleHideAmmoWithoutWeapon();
  expect(ids()).toContain('srm-ammo');
  store().setUnitContext(3150, TechBase.INNER_SPHERE, []);
  expect(ids()).toEqual([electronics.id, misc.id]);
});

it('keeps Electronics independent of Other and ammunition visibility', () => {
  store().selectCategory(EquipmentCategory.MISC_EQUIPMENT, false);
  expect(ids()).toEqual([misc.id]);
  store().selectCategory(EquipmentCategory.ELECTRONICS, false);
  expect(ids()).toEqual([electronics.id]);
  store().toggleHideAmmoWithoutWeapon();
  expect(ids()).toEqual([electronics.id]);
  store().selectCategory(EquipmentCategory.MISC_EQUIPMENT, true);
  expect(ids()).toEqual([electronics.id, misc.id]);
});

it('clears legacy category restrictions on category selection and Show All', () => {
  store().setCategoryFilter(EquipmentCategory.AMMUNITION);
  store().selectCategory(EquipmentCategory.ELECTRONICS, false);
  expect(ids()).toEqual([electronics.id]);
  store().setCategoryFilter(EquipmentCategory.AMMUNITION);
  store().showAllCategories();
  expect(ids()).toContain(electronics.id);
});

it('represents deselecting the last category consistently as All', () => {
  store().selectCategory(EquipmentCategory.ELECTRONICS, false);
  store().selectCategory(EquipmentCategory.ELECTRONICS, true);
  expect(store().filters.showAllCategories).toBe(true);
  expect(ids()).toContain(misc.id);
});

it('recognizes one-shot catalog names without hiding standard launchers', () => {
  store().setEquipment(
    ['SRM 2', 'SRM 2 (OS)', 'SRM 2 (I-OS)', 'One-Shot SRM 2'].map(
      (name, index) => ({ ...electronics, id: `launcher-${index}`, name }),
    ),
  );
  store().toggleHideOneShot();
  expect(ids()).toEqual(['launcher-0']);
});

it('preserves secondary classifications for legacy and category-button selection', () => {
  const ams = {
    ...misc,
    id: 'ams',
    name: 'Anti-Missile System',
    category: EquipmentCategory.BALLISTIC_WEAPON,
    additionalCategories: [EquipmentCategory.MISC_EQUIPMENT],
  };
  store().setEquipment([ams, electronics, misc]);
  store().setCategoryFilter(EquipmentCategory.MISC_EQUIPMENT);
  expect(ids()).toEqual(['ams', 'case']);
  store().selectCategory(EquipmentCategory.MISC_EQUIPMENT, false);
  expect(ids()).toEqual(['ams', 'case']);
});

it('keeps the current page for unchanged context and resets it when the catalog changes', () => {
  store().setUnitContext(3150, TechBase.INNER_SPHERE, ['ac-10']);
  store().setPage(3);
  store().setUnitContext(3150, TechBase.INNER_SPHERE, ['ac-10']);
  expect(store().pagination.currentPage).toBe(3);
  store().setEquipment([electronics]);
  expect(store().pagination.currentPage).toBe(1);
});
