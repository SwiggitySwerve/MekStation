import { normalizeEquipmentId as normalizeMTFId } from '@/services/conversion/MTFParser.mapping';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/equipment-services/spec.md */
import { processCritAmmoSlot } from '../../../../scripts/validate-bv-crit-scan-ammo';
import { createEmptyCritScan } from '../../../../scripts/validate-bv-crit-scan-types';
import { baseInput } from '../battlearmor/__tests__/battleArmorBV.test.helpers';
import { calculateBAOffensiveBV } from '../battlearmor/battleArmorBV';
import { AMMUNITION_CATALOG_FILES } from '../equipmentBVCatalogData';
import {
  type EquipmentCatalogEntry,
  getEquipmentEntry,
  initializeCatalog,
  normalizeEquipmentId,
  resetCatalogCache,
  resolveAmmoBV,
  resolveEquipmentBV,
} from '../equipmentBVResolver';

beforeEach(resetCatalogCache);
afterEach(resetCatalogCache);

// Literal local catalog values: distinct ammunition and weapon records share
// these IDs. This boundary test does not establish native quantity/grouping BV.
const collisions = [
  ['clan-lb-2-x-ac', 6, 47],
  ['clan-lb-5-x-ac', 12, 93],
  ['clan-lb-10-x-ac', 19, 148],
  ['clan-lb-20-x-ac', 30, 237],
  ['mrm-10', 7, 56],
  ['mrm-20', 14, 112],
  ['mrm-30', 21, 168],
  ['mrm-40', 28, 224],
  ['ams', 11, 32],
  ['clan-streak-srm-2', 5, 40],
  ['clan-streak-srm-4', 10, 79],
  ['clan-streak-srm-6', 15, 118],
] as const;

it.each(collisions)(
  'resolves ammo %s to %s while preserving weapon BV %s',
  (id, ammoBV, weaponBV) => {
    for (const name of [id, id.toUpperCase(), `  ${id}  `]) {
      expect(resolveAmmoBV(name)).toEqual({
        battleValue: ammoBV,
        weaponType: id,
        resolved: true,
      });
      expect(resolveEquipmentBV(name).battleValue).toBe(weaponBV);
      expect(getEquipmentEntry(name)?.battleValue).toBe(weaponBV);
      expect(normalizeEquipmentId(name)).toBe(id);
      expect(normalizeMTFId(name)).toBe(id);
    }
    const input = baseInput({ weapons: [{ id }], ammo: [{ id }] });
    const before = JSON.stringify(input);
    expect(calculateBAOffensiveBV(input)).toMatchObject({
      weaponBV,
      ammoBV,
      total: weaponBV + ammoBV,
    });
    expect(JSON.stringify(input)).toBe(before);
  },
);

it('resolves every ammunition record including IDs shared with weapons', () => {
  const entries = AMMUNITION_CATALOG_FILES.flatMap((file) => file.items ?? []);
  expect(entries).toHaveLength(289);
  for (const entry of entries) {
    if (typeof entry.id !== 'string' || typeof entry.battleValue !== 'number') {
      throw new Error('Invalid ammunition catalog fixture');
    }
    expect(resolveAmmoBV(entry.id)).toEqual({
      resolved: true,
      battleValue: entry.battleValue,
      weaponType: entry.id.replace(/-ammo$/, '').replace(/^ammo-/, ''),
    });
  }
});

it.each([
  ['LB 2-X AC Ammo', 'clan-lb-2-x-ac', 6],
  ['Streak SRM 2 Ammo', 'clan-streak-srm-2', 5],
] as const)(
  'uses existing aliases for %s without changing normalization',
  (name, id, bv) => {
    for (const spelling of [name, name.toLowerCase(), name.toUpperCase()]) {
      expect(normalizeEquipmentId(spelling)).toBe(id);
      expect(resolveAmmoBV(spelling)).toEqual({
        resolved: true,
        battleValue: bv,
        weaponType: id,
      });
    }
  },
);

it.each([
  'medium-laser',
  'clan-er-small-laser',
  'targeting-computer',
  'not-a-real-ammo',
])('does not reinterpret non-ammunition %s through the BA fallback', (id) => {
  expect(resolveAmmoBV(id)).toEqual({
    battleValue: 0,
    weaponType: '',
    resolved: false,
  });
  expect(calculateBAOffensiveBV(baseInput({ ammo: [{ id }] })).ammoBV).toBe(0);
});

it.each([0, 9])(
  'preserves explicit battle-armor ammo BV override %s',
  (bvOverride) => {
    expect(
      calculateBAOffensiveBV(
        baseInput({ ammo: [{ id: 'medium-laser', bvOverride }] }),
      ).ammoBV,
    ).toBe(bvOverride);
  },
);

const customWeapon: EquipmentCatalogEntry = {
  id: 'context-shared',
  name: 'Context weapon',
  category: 'SRM',
  techBase: 'CLAN',
  battleValue: 91,
};
const customAmmo: EquipmentCatalogEntry = {
  ...customWeapon,
  name: 'Context ammo',
  battleValue: 13,
};

it('requires explicit ammunition entries in a custom catalog and resets both contexts', () => {
  expect(resolveAmmoBV('clan-lb-2-x-ac').battleValue).toBe(6);
  initializeCatalog([customWeapon], {}, [customAmmo]);
  expect(resolveAmmoBV(customWeapon.id)).toEqual({
    resolved: true,
    battleValue: 13,
    weaponType: customWeapon.id,
  });
  expect(resolveEquipmentBV(customWeapon.id).battleValue).toBe(91);
  expect(resolveAmmoBV('clan-lb-2-x-ac').resolved).toBe(false);
  initializeCatalog([customWeapon], {});
  expect(resolveAmmoBV(customWeapon.id).resolved).toBe(false);
  resetCatalogCache();
  expect(resolveAmmoBV(customWeapon.id).resolved).toBe(false);
  expect(resolveAmmoBV('clan-lb-2-x-ac').battleValue).toBe(6);
});

it('makes custom ammo available to the existing normalizer and replaces alias caches', () => {
  initializeCatalog([], { 'Probe Ammo': customAmmo.id }, [customAmmo]);
  expect(resolveAmmoBV('probe ammo').battleValue).toBe(13);
  expect(resolveEquipmentBV('probe ammo').battleValue).toBe(13);
  const replacement = { ...customAmmo, id: 'replacement-ammo', battleValue: 0 };
  initializeCatalog([customWeapon], { 'Probe Ammo': replacement.id }, [
    replacement,
  ]);
  expect(resolveAmmoBV('probe ammo')).toEqual({
    resolved: true,
    battleValue: 0,
    weaponType: 'replacement',
  });
  expect(resolveEquipmentBV('probe ammo').battleValue).toBe(0);
  expect(resolveAmmoBV(customAmmo.id).resolved).toBe(false);
});

it('keeps the critical-slot validator fallback contextual', () => {
  const mappings = { 'Probe Ammo': customAmmo.id };
  initializeCatalog([customWeapon], mappings, [customAmmo]);
  const scan = createEmptyCritScan();
  processCritAmmoSlot({
    r: scan,
    clean: 'Probe Ammo',
    lo: 'probe ammo',
    loc: 'RT',
    ml: null,
    unitTechBase: 'CLAN',
  });
  expect(scan.ammo).toEqual([
    { id: 'Probe Ammo', bv: 13, weaponType: customAmmo.id, location: 'RT' },
  ]);
  initializeCatalog([customWeapon], mappings);
  const withoutAmmo = createEmptyCritScan();
  processCritAmmoSlot({
    r: withoutAmmo,
    clean: 'Probe Ammo',
    lo: 'probe ammo',
    loc: 'RT',
    ml: null,
    unitTechBase: 'CLAN',
  });
  expect(withoutAmmo.ammo).toEqual([]);
});
