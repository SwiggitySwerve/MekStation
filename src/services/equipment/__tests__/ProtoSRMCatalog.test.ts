import { WeaponContract } from '@/types/contracts/generated/weapon.zod';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/equipment-services/spec.md */
import srmCatalog from '../../../../public/data/equipment/official/weapons/missile-srm.json';
import { readJsonFile } from '../EquipmentFileReader';
import { EquipmentLoaderService } from '../EquipmentLoaderService';

jest.mock('../EquipmentFileReader', () => ({ readJsonFile: jest.fn() }));

beforeEach(() => {
  jest.mocked(readJsonFile).mockImplementation(async (file) => {
    if (file === 'index.json') {
      return {
        files: {
          weapons: { srm: 'weapons/missile-srm.json' },
          ammunition: {},
          electronics: {},
          miscellaneous: {},
        },
      };
    }
    if (file === 'weapons/missile-srm.json') return srmCatalog;
    return null;
  });
});

// Native runtime values in a ProtoMek context; no ammo or slot-legality claim.
it.each([
  [1, 15, 0.25, 10000],
  [3, 30, 0.75, 30000],
  [5, 47, 1.25, 50000],
] as const)(
  'loads distinct ProtoMek SRM %i with native fields and unit restrictions',
  async (rack, bv, weight, cost) => {
    const id = `clan-srm-${rack}`;
    const raw = srmCatalog.items.find((item) => item.id === id);
    expect(WeaponContract.safeParse(raw).success).toBe(true);
    const loader = new EquipmentLoaderService();
    await loader.loadOfficialEquipment();
    expect(loader.getWeaponById(id)).toMatchObject({
      id,
      weight,
      costCBills: cost,
      battleValue: bv,
      heat: 0,
      criticalSlots: 0,
      damage: '2/missile',
      introductionYear: 3050,
      ranges: { minimum: 0, short: 3, medium: 6, long: 9, extreme: 12 },
      allowedUnitTypes: [UnitType.PROTOMECH],
    });
    for (const unitType of Object.values(UnitType)) {
      const present = loader
        .searchWeapons({ unitType })
        .some((weapon) => weapon.id === id);
      expect(present).toBe(unitType === UnitType.PROTOMECH);
    }
  },
);
