import { readFileSync } from 'fs';
import * as path from 'path';

import {
  calculateAmmoBVWithExcessiveCap,
  getNativeAmmoBVGroup,
} from '../battleValueAmmo';
import { calculateUnitBV } from '../mechBV/calculator';
import { baseInput } from '../vehicle/__tests__/vehicleBV.test.helpers';
import { calculateVehicleOffensiveBV } from '../vehicle/vehicleBV';

// MegaMek 48fcb2f64: LongTomCannon.java:69-72;
// BVCalculator.java:1189-1240 keys weapons and bins by AmmoType/rack.
it.each(['long-tom', 'long-tom-cannon', 'ISLongTomCannon'])(
  '%s retains its Long Tom Cannon ammunition pool',
  (id) => {
    expect(getNativeAmmoBVGroup(id)).toBe('LONG_TOM_CANNON:20');
    expect(
      calculateAmmoBVWithExcessiveCap(
        [{ id, bv: 329 }],
        [{ id: 'ISLongTomCannonAmmo', bv: 41, weaponType: 'long-tom' }],
      ),
    ).toBe(41);
    expect(
      calculateAmmoBVWithExcessiveCap(
        [{ id, bv: 329 }],
        [{ id: 'ISLongTomAmmo', bv: 27, weaponType: 'long-tom' }],
      ),
    ).toBe(0);
  },
);

it('preserves native Long Tom artillery as a separate pool', () => {
  expect(getNativeAmmoBVGroup('ISLongTom')).toBe('LONG_TOM:25');
  expect(
    calculateAmmoBVWithExcessiveCap(
      [{ id: 'ISLongTom', bv: 368 }],
      [{ id: 'ISLongTomAmmo', bv: 27, weaponType: 'long-tom' }],
    ),
  ).toBe(27);
  expect(
    calculateAmmoBVWithExcessiveCap(
      [{ id: 'ISLongTom', bv: 368 }],
      [{ id: 'ISLongTomCannonAmmo', bv: 41, weaponType: 'long-tom' }],
    ),
  ).toBe(0);
});

it('uses the same canonical cannon identity in the vehicle ammo consumer', () => {
  expect(
    calculateVehicleOffensiveBV(
      baseInput({
        weapons: [{ id: 'long-tom', location: 'Front', bvOverride: 329 }],
        ammo: [{ id: 'ISLongTomCannonAmmo', location: 'Body', bvOverride: 41 }],
      }),
    ).ammoBV,
  ).toBe(41);
});

it('keeps Pillager PLG-4x Anvil at Java 1927 when saved with equivalent IDs', () => {
  const index: { units: { id: string; path: string }[] } = JSON.parse(
    readFileSync(
      path.join(process.cwd(), 'public/data/units/battlemechs/index.json'),
      'utf8',
    ),
  );
  const entry = index.units.find((unit) => unit.id === 'pillager-plg-4x-anvil');
  if (!entry) throw new Error('Missing Pillager fixture');
  const source: Parameters<typeof calculateUnitBV>[0] = JSON.parse(
    readFileSync(
      path.join(process.cwd(), 'public/data/units/battlemechs', entry.path),
      'utf8',
    ),
  );
  const equipment = source.equipment.map((mount) =>
    mount.id === 'long-tom-cannon' ? { ...mount, id: 'long-tom' } : mount,
  );
  expect(calculateUnitBV(source, source.id).bv).toBe(1927);
  expect(calculateUnitBV({ ...source, equipment }, source.id).bv).toBe(1927);
});

// Native LongTom.java:57-74 is a separate 368-BV / LONG_TOM:25 weapon.
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { resolveEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

import { resolveEquipmentBV } from '../equipmentBVResolver';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

beforeAll(async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

it.each([
  'ISLongTom',
  'islongtom',
  'ISLongTomArtillery',
  'IS Long Tom',
  'CLLongTom',
  'CLLongTomArtillery',
  'Clan Long Tom',
  'Long Tom',
])(
  '%s retains exact native artillery identity through editor loading',
  (id) => {
    const { resolvedId } = resolveEquipmentId(
      id,
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      undefined,
    );
    expect(resolvedId).toBe('islongtom-registry');
    expect(getNativeAmmoBVGroup(resolvedId)).toBe('LONG_TOM:25');
    expect(resolveEquipmentBV(resolvedId).battleValue).toBe(368);
  },
);

it('keeps the explicit canonical cannon ID stable during editor loading', () => {
  expect(
    resolveEquipmentId(
      'long-tom',
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      undefined,
    ).resolvedId,
  ).toBe('long-tom');
});
