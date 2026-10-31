import { createDefaultBattleArmorState } from '@/stores/battleArmorState';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { createBattleArmorStore } from '@/stores/useBattleArmorStore';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { WeaponContract } from '@/types/contracts/generated/weapon.zod';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/equipment-services/spec.md */
import lrmCatalog from '../../../../public/data/equipment/official/weapons/missile-lrm.json';
import { readJsonFile } from '../EquipmentFileReader';
import {
  EquipmentLoaderService,
  resetEquipmentLoader,
} from '../EquipmentLoaderService';
import { EquipmentLookupService } from '../EquipmentLookupService';
import { nativeProtoLRMs } from './ProtoLRMCatalog.test.helpers';

jest.mock('../EquipmentFileReader', () => ({ readJsonFile: jest.fn() }));

beforeEach(() => {
  resetEquipmentLoader();
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

afterEach(resetEquipmentLoader);

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

it.each([1, 2, 3, 4])(
  'keeps distinct LRM %i catalog names through real store writers',
  async (rack) => {
    const service = new EquipmentLookupService();
    await service.initialize();
    expect(service.getDataSource()).toBe('json');
    const ba = service.getById(`balrm${rack}`);
    const proto = service.getById(`clan-lrm-${rack}`);
    if (!ba || !proto) throw new Error('Missing LRM catalog records');
    const baStore = createBattleArmorStore(
      createDefaultBattleArmorState({ id: `ba-${rack}` }),
    );
    const protoStore = createProtoMechStore(
      createDefaultProtoMechState({ id: `proto-${rack}` }),
    );
    baStore.getState().addEquipment(ba);
    protoStore.getState().addEquipment(proto);
    expect(baStore.getState().equipment[0]).toMatchObject({
      equipmentId: `balrm${rack}`,
      name: `LRM ${rack}`,
    });
    const protoMount = protoStore.getState().equipment[0];
    expect(protoMount).toMatchObject({
      equipmentId: `clan-lrm-${rack}`,
      name: `LRM ${rack} (Clan)`,
    });
    expect(getEquipmentEntry(protoMount.name)?.id).toBe(protoMount.equipmentId);
    expect(getEquipmentEntry(ba.id)?.id).toBe(ba.id);
  },
);
