import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expectJavaCatalogAddition } from '@/__tests__/helpers/equipmentJavaAdditions.test-helpers';
import { EquipmentNameResolver } from '@/services/conversion/EquipmentNameResolver';
import {
  lookupWeapon,
  lookupAmmoShots,
} from '@/services/printing/recordsheet/equipmentUtils';
import { resolveEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import {
  buildWeaponLookupFromCatalogFiles,
  buildAmmoLookupFromCatalogFiles,
} from '@/simulation/runner/UnitHydrationCatalogLookup';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { normalizeEquipmentId } from '@/utils/construction/equipmentBV/normalization';
import {
  WEAPON_CATALOG_FILES,
  AMMUNITION_CATALOG_FILES,
} from '@/utils/construction/equipmentBVCatalogData';

import { getEquipmentLoader } from '../EquipmentLoaderService';
import { getEquipmentLookupService } from '../EquipmentLookupService';
import { EquipmentNameMapper } from '../EquipmentNameMapper';
import { getEquipmentRegistry } from '../EquipmentRegistry';

jest.mock('../EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
// Pinned MegaMek 48fcb2f6: lookup ownership from EquipmentType registry.
const cases = [
  ['CLERFlamer', 'clan-er-flamer'],
  ['IS Heavy Machine Gun Ammo', 'heavy-machine-gun-ammo-full'],
  ['IS Light Machine Gun Ammo', 'light-machine-gun-ammo-full'],
  ['IS Machine Gun Ammo', 'ammo-mg-full'],
  ['IS Narc Beacon', 'narc'],
  ['ISERFlamer', 'er-flamer'],
  ['ISNarcBeacon', 'narc'],
  ['NovaCEWS', 'nova-combined-electronic-warfare-system-cews'],
  ['Small VSP Laser', 'small-vsp-laser'],
  ['IS LB 10-X AC Ammo', 'lb-10-x-ammo'],
  ['IS LB 2-X AC Ammo', 'is-lb-2-x-ac-ammo-registry'],
  ['IS LB 20-X AC Ammo', 'lb-20-x-ammo'],
  ['IS LB 5-X AC Ammo', 'is-lb-5-x-ac-ammo-registry'],
  ['IS Streak SRM 2 Ammo', 'streak-srm-ammo'],
];
const loader = getEquipmentLoader();
const registry = getEquipmentRegistry();
const mapper = new EquipmentNameMapper();
const conversion = new EquipmentNameResolver();
const weapons = buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES);
const ammo = buildAmmoLookupFromCatalogFiles(AMMUNITION_CATALOG_FILES);
beforeAll(async () => {
  await registry.initialize();
  await getEquipmentLookupService().initialize();
});
it.each(cases)('%s retains its Java identity (%s)', (name, target) => {
  // CAT-Q2's five approved routes: pinned java-registry.json IS LB 2/5-X AC Ammo;
  // full Java values/citation live in scripts/equipment-catalog/java-additions.json.
  if (target.endsWith('-registry'))
    expectJavaCatalogAddition(
      AMMUNITION_CATALOG_FILES.flatMap((file) => file.items ?? []).find(
        (item) => (item as { id?: string }).id === target,
      ),
    );
  expect(normalizeEquipmentId(name)).toBe(target);
  expect(registry.lookup(name).equipment?.id).toBe(target);
  for (const tech of [undefined, TechBase.INNER_SPHERE, TechBase.CLAN]) {
    expect(mapper.mapName(name, tech).equipmentId).toBe(target);
    expect(conversion.resolve(name, name, tech).equipmentId).toBe(target);
  }
  for (const mode of Object.values(TechBaseMode)) {
    expect(
      resolveEquipmentId(name, TechBase.INNER_SPHERE, mode, [name]).equipmentDef
        ?.id,
    ).toBe(target);
  }
  if (loader.getWeaponById(target)) {
    expect(weapons(name)?.id).toBe(target);
    expect(lookupWeapon(loader.getAllWeapons(), name)?.id).toBe(target);
  }
  if (loader.getAmmunitionById(target)) {
    expect(ammo(name)?.id).toBe(target);
    expect(lookupAmmoShots(loader.getAllAmmunition(), name)).toBe(
      loader.getAmmunitionById(target)?.shotsPerTon,
    );
  }
});
it.each([
  'clan-flamer',
  'flamer',
  'watchdog-cews',
  'gauss-ammo',
  'lb-2-x-ammo',
])('preserves exact catalog ID %s', (id) => {
  expect(normalizeEquipmentId(id)).toBe(id);
});

it.each(['NovaCEWS:OMNI', 'ISERFlamer:OMNI', 'CLERFlamer:OMNI'])(
  'retains native identity after mount qualifiers: %s',
  (name) => {
    expect(normalizeEquipmentId(name)).toBe(
      normalizeEquipmentId(name.split(':')[0]),
    );
  },
);

it('preserves an explicitly registered custom mapping', () => {
  const custom = new EquipmentNameMapper();
  custom.addMapping('ISERFlamer', 'custom-er-flamer');
  expect(custom.mapName('ISERFlamer').equipmentId).toBe('custom-er-flamer');
});

it('preserves custom mappings loaded from a file', async () => {
  const saved = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ 'IS Machine Gun Ammo': 'custom-ammo' }),
  });
  try {
    const custom = new EquipmentNameMapper();
    expect(await custom.loadMappings('/custom-aliases.json')).toBe(1);
    expect(custom.mapName('IS Machine Gun Ammo').equipmentId).toBe(
      'custom-ammo',
    );
  } finally {
    global.fetch = saved;
  }
});
