jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string, base: string): Promise<unknown> => {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    return JSON.parse(
      await readFile(join(process.cwd(), 'public', base, file), 'utf8'),
    );
  },
}));
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { resolveEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

import { getAmmunitionEntry, getEquipmentEntry } from '../equipmentBVResolver';

// MegaMek 48fcb2f64 separates WeaponType and AmmoType, including shared names.
describe('weapon and ammunition BV lookup boundaries', () => {
  it.each([
    ['Coolant Pod:OMNI', 'coolant-pod-registry'],
    ['(R) Coolant Pod:OMNI', 'coolant-pod-registry'],
    ['ISC3Sensors:OMNI', 'isc3sensors-registry'],
  ])('preserves qualified native ammunition %s', (name, expected) => {
    expect(getEquipmentEntry(name)?.id).toBe(expected);
  });
  it.each(['coolant-pod-registry', 'isc3sensors-registry'])(
    'retains the explicitly registered native ammo identity %s',
    (id) => expect(getEquipmentEntry(id)?.id).toBe(id),
  );
  it.each([
    ['CLRotaryAC10', 617],
    ['ISMRM1', 9],
  ] as const)(
    '%s never resolves to an ammo entry as a weapon',
    (id, expected) => {
      // Missing weapon identities remain unresolved rather than taking ammo BV.
      const entry = getEquipmentEntry(id);
      if (entry) expect(entry.battleValue).toBe(expected);
      else expect(entry).toBeUndefined();
    },
  );
  it('retains explicitly requested ammunition and represented weapons', () => {
    expect(getAmmunitionEntry('IS MRM 1 Ammo')?.battleValue).toBe(1);
    expect(getEquipmentEntry('ISMRM1')?.battleValue).toBe(9);
    expect(getEquipmentEntry('mrm-20')?.category).toBe('Missile');
    expect(getEquipmentEntry('MRM 20 Ammo')?.category).not.toBe('Missile');
  });
});

it.each([
  ['APGaussRifle', 'apgaussrifle'],
  ['EnhancedLRM10', 'enhancedlrm10'],
  ['RotaryAC2', 'rotaryac2'],
])('retains typed ammunition for the unmarked %s alias', (name, id) => {
  expect(getAmmunitionEntry(name)?.id).toBe(id);
  expect(getEquipmentEntry(name)?.id).toBe(id);
});

beforeAll(async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});
// ISMRM1..5.java:57-63; ISBAMRM1..5.java:67-70; AmmoType.java:15093-15236.
it.each([1, 2, 3, 4, 5])(
  'keeps MRM-%d source names distinct from canonical ammo IDs',
  (rack) => {
    expect(getEquipmentEntry('mrm-' + rack)?.id).toBe('mrm-' + rack);
    for (const [tech, mode] of [
      [TechBase.INNER_SPHERE, TechBaseMode.INNER_SPHERE],
      [TechBase.CLAN, TechBaseMode.CLAN],
      [TechBase.INNER_SPHERE, TechBaseMode.MIXED],
    ] as const) {
      expect(
        resolveEquipmentId('MRM-' + rack, tech, mode, undefined).equipmentDef
          ?.id,
      ).toBe('mrm-' + rack + '-registry');
      expect(
        resolveEquipmentId('ISBAMRM' + rack, tech, mode, undefined).equipmentDef
          ?.id,
      ).toBe('bamrm' + rack);
      expect(
        resolveEquipmentId('IS MRM ' + rack + ' Ammo', tech, mode, undefined)
          .equipmentDef?.category,
      ).toBe(EquipmentCategory.AMMUNITION);
    }
  },
);
