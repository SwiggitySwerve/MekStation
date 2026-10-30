import { WeaponContract } from '@/types/contracts/generated/weapon.zod';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/equipment-services/spec.md */
import lrmCatalog from '../../../../public/data/equipment/official/weapons/missile-lrm.json';
import { readJsonFile } from '../EquipmentFileReader';
import { EquipmentLoaderService } from '../EquipmentLoaderService';
import { nativeProtoLRMs } from './ProtoLRMCatalog.test.helpers';

jest.mock('../EquipmentFileReader', () => ({ readJsonFile: jest.fn() }));

beforeEach(() => {
  jest.mocked(readJsonFile).mockImplementation(async (file) => {
    if (file === 'index.json')
      return {
        files: {
          weapons: { lrm: 'weapons/missile-lrm.json' },
          ammunition: {},
          electronics: {},
          miscellaneous: {},
        },
      };
    if (file === 'weapons/missile-lrm.json') return lrmCatalog;
    return null;
  });
});

it.each(nativeProtoLRMs)(
  'loads $native with native fields and restrictions',
  async ({ expected }) => {
    const raw = lrmCatalog.items.find((item) => item.id === expected.id);
    expect(WeaponContract.safeParse(raw).success).toBe(true);
    expect(raw).toMatchObject(expected);
    const loader = new EquipmentLoaderService();
    await loader.loadOfficialEquipment();
    expect(loader.getWeaponById(expected.id)).toMatchObject({
      ...expected,
      techBase: TechBase.CLAN,
      rulesLevel: RulesLevel.STANDARD,
    });
    for (const unitType of Object.values(UnitType)) {
      expect(
        loader.searchWeapons({ unitType }).some((w) => w.id === expected.id),
      ).toBe(unitType === UnitType.PROTOMECH);
    }
  },
);

it.each([5, 10, 15, 20])(
  'keeps ordinary Clan LRM %i available to BattleMechs',
  async (rack) => {
    const loader = new EquipmentLoaderService();
    await loader.loadOfficialEquipment();
    expect(
      loader
        .searchWeapons({ unitType: UnitType.BATTLEMECH })
        .some((w) => w.id === `clan-lrm-${rack}`),
    ).toBe(true);
  },
);
