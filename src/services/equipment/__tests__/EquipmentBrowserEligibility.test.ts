import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EquipmentCategory } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  convertWeapon,
  convertPhysicalWeapon,
  convertAmmunition,
  convertElectronics,
  convertMiscEquipment,
} from '../EquipmentConverters';
import { getEquipmentLoader } from '../EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '../EquipmentLookupService';
import { filterEquipmentByCriteria } from '../EquipmentSearch';

jest.mock('../EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

const base = {
  id: 'eligibility',
  name: 'Eligibility',
  techBase: 'Inner Sphere',
  rulesLevel: 'Standard',
  weight: 1,
  criticalSlots: 1,
  costCBills: 0,
  battleValue: 0,
  introductionYear: 2300,
};
const converters = [
  {
    name: 'weapon',
    convert: (allowedUnitTypes?: string[]) =>
      convertWeapon({
        ...base,
        category: 'Energy',
        subType: 'Laser',
        damage: 5,
        heat: 3,
        allowedUnitTypes,
      }),
  },
  {
    name: 'physical',
    convert: (allowedUnitTypes?: string[]) =>
      convertPhysicalWeapon({ ...base, type: 'Hatchet', allowedUnitTypes }),
  },
  {
    name: 'ammunition',
    convert: (allowedUnitTypes?: string[]) =>
      convertAmmunition({
        ...base,
        category: 'Other',
        variant: 'Standard',
        compatibleWeaponIds: [],
        shotsPerTon: 10,
        costPerTon: 0,
        isExplosive: true,
        allowedUnitTypes,
      }),
  },
  {
    name: 'electronics',
    convert: (allowedUnitTypes?: string[]) =>
      convertElectronics({ ...base, category: 'ECM', allowedUnitTypes }),
  },
  {
    name: 'misc',
    convert: (allowedUnitTypes?: string[]) =>
      convertMiscEquipment({
        ...base,
        category: 'Miscellaneous',
        allowedUnitTypes,
      }),
  },
];

describe.each(converters)('$name unit-type metadata', ({ convert }) => {
  it.each([undefined, [], [UnitType.BATTLE_ARMOR]])(
    'preserves %j and its loader-search meaning',
    (types) => {
      const item = convert(types);
      expect(item.allowedUnitTypes).toEqual(types);
      expect(Object.hasOwn(item, 'allowedUnitTypes')).toBe(types !== undefined);
      for (const unitType of Object.values(UnitType)) {
        const expected =
          types === undefined
            ? [
                UnitType.BATTLEMECH,
                UnitType.VEHICLE,
                UnitType.AEROSPACE,
              ].includes(unitType)
            : types.includes(unitType);
        expect(filterEquipmentByCriteria([item], { unitType })).toHaveLength(
          expected ? 1 : 0,
        );
      }
    },
  );
});

beforeEach(() => {
  getEquipmentLoader().clear();
  resetEquipmentLookupService();
});
afterEach(() => jest.restoreAllMocks());

it('maps all metadata states, including ammunition, without changing default inventory membership', async () => {
  const loader = getEquipmentLoader();
  await loader.loadOfficialEquipment();
  const lists = [undefined, [], [UnitType.PROTOMECH]];
  jest.spyOn(loader, 'getAllWeapons').mockReturnValue(
    lists.map((types, i) => ({
      ...converters[0].convert(types),
      id: `weapon-${i}`,
    })) as ReturnType<typeof loader.getAllWeapons>,
  );
  jest.spyOn(loader, 'getAllAmmunition').mockReturnValue(
    lists.map((allowedUnitTypes, i) =>
      convertAmmunition({
        ...base,
        id: `ammo-${i}`,
        category: 'Other',
        variant: 'Standard',
        compatibleWeaponIds: [],
        shotsPerTon: 10,
        costPerTon: 0,
        isExplosive: true,
        allowedUnitTypes,
      }),
    ),
  );
  const service = getEquipmentLookupService();
  for (const prefix of ['weapon', 'ammo']) {
    for (const [i, types] of lists.entries())
      expect(service.getById(`${prefix}-${i}`)?.allowedUnitTypes).toEqual(
        types,
      );
  }
  const original = service.getAllEquipment();
  expect(
    service
      .getBrowserEquipment(UnitType.BATTLEMECH)
      .some((item) => item.id === 'weapon-0'),
  ).toBe(true);
  expect(
    service
      .getBrowserEquipment(UnitType.BATTLEMECH)
      .some((item) => item.id === 'weapon-1'),
  ).toBe(false);
  expect(
    service
      .getBrowserEquipment(UnitType.BATTLEMECH)
      .some((item) => item.id === 'weapon-2'),
  ).toBe(false);
  expect(
    service
      .getBrowserEquipment(UnitType.PROTOMECH)
      .filter((item) => /^(weapon|ammo)-2$/.test(item.id)),
  ).toHaveLength(2);
  expect(service.getAllEquipment()).toBe(original);
  expect(
    original.filter((item) => /^(weapon|ammo)-/.test(item.id)),
  ).toHaveLength(6);
});

it('opts matching pinned Miscellaneous/Unknown records into only their family, preserving shared IDs and default queries', async () => {
  const loader = getEquipmentLoader();
  await loader.loadOfficialEquipment();
  const originalMisc = loader.getAllMiscEquipment();
  const misc = [
    {
      ...base,
      id: 'proto-only-misc',
      category: 'Miscellaneous',
      allowedUnitTypes: [UnitType.PROTOMECH],
    },
    {
      ...base,
      id: 'mech-only-misc',
      category: 'Future category',
      allowedUnitTypes: [UnitType.BATTLEMECH],
    },
    { ...base, id: 'unknown-misc', category: 'Miscellaneous' },
    {
      ...base,
      id: 'empty-misc',
      category: 'Miscellaneous',
      allowedUnitTypes: [],
    },
  ].map(convertMiscEquipment);
  jest
    .spyOn(loader, 'getAllMiscEquipment')
    .mockReturnValue([...originalMisc, ...misc]);
  const service = getEquipmentLookupService();
  const inventory = service.getAllEquipment();
  for (const unitType of Object.values(UnitType)) {
    const shown = service.getBrowserEquipment(unitType);
    expect(
      shown
        .filter((item) => misc.some((candidate) => candidate.id === item.id))
        .map((item) => item.id),
    ).toEqual(
      unitType === UnitType.PROTOMECH
        ? ['proto-only-misc']
        : unitType === UnitType.BATTLEMECH
          ? ['mech-only-misc']
          : [],
    );
    expect(
      shown.every(
        (item) =>
          item.allowedUnitTypes === undefined ||
          item.allowedUnitTypes.includes(unitType),
      ),
    ).toBe(true);
  }
  expect(
    service
      .getBrowserEquipment(UnitType.BATTLEMECH)
      .some(
        (item) =>
          item.id === 'hatchet' &&
          item.category === EquipmentCategory.PHYSICAL_WEAPON,
      ),
  ).toBe(true);
  expect(service.getAllEquipment()).toBe(inventory);
  expect(inventory.some((item) => item.id.endsWith('-misc'))).toBe(false);
  expect(service.query({})).toEqual(
    expect.arrayContaining(
      misc.map((item) => expect.objectContaining({ id: item.id })),
    ),
  );
});
