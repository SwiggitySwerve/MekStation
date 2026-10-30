import { WeaponContract } from '@/types/contracts/generated/weapon.zod';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/equipment-services/spec.md */
import electronics from '../../../../public/data/equipment/official/electronics/other.json';
import machineguns from '../../../../public/data/equipment/official/weapons/ballistic-machinegun.json';
import lasers from '../../../../public/data/equipment/official/weapons/energy-laser.json';
import { readJsonFile } from '../EquipmentFileReader';
import { EquipmentLoaderService } from '../EquipmentLoaderService';
import { nativeClanWeapons } from './NativeClanWeapons.test.helpers';

jest.mock('../EquipmentFileReader', () => ({ readJsonFile: jest.fn() }));

beforeEach(() => {
  jest.mocked(readJsonFile).mockImplementation(async (file) => {
    if (file === 'index.json') {
      return {
        files: {
          weapons: {
            lasers: 'weapons/energy-laser.json',
            machineguns: 'weapons/ballistic-machinegun.json',
          },
          electronics: { other: 'electronics/other.json' },
          ammunition: {},
          miscellaneous: {},
        },
      };
    }
    if (file === 'weapons/energy-laser.json') return lasers;
    if (file === 'weapons/ballistic-machinegun.json') return machineguns;
    if (file === 'electronics/other.json') return electronics;
    return null;
  });
});

it.each(nativeClanWeapons)(
  'loads native fields for $native',
  async ({ expected, native }) => {
    const raw = [
      ...lasers.items,
      ...machineguns.items,
      ...electronics.items,
    ].find((item) => item.id === expected.id);
    expect(raw).toMatchObject(expected);
    if (native !== 'CLLightTAG')
      expect(WeaponContract.safeParse(raw).success).toBe(true);
    const loader = new EquipmentLoaderService();
    await loader.loadOfficialEquipment();
    expect(loader.getById(expected.id)).toMatchObject({
      ...expected,
      techBase: TechBase.CLAN,
      rulesLevel: RulesLevel.STANDARD,
    });
  },
);
