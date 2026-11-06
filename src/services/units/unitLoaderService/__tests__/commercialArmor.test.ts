import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  decodeBlkArmorType,
  encodeBlkArmorType,
} from '@/services/conversion/BlkArmorCodes';
import { mapArmorType as convertArmor } from '@/services/conversion/ValueMappings';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import lumberjack from '../../../../../public/data/units/battlemechs/1-age-of-war/standard/Lumberjack LM1-A.json';
import { mapArmorType } from '../componentMappers';
import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

// MegaMek 48fcb2f64 ArmorType.java:669-688: Commercial, 24 points/t, 2285.
it.each([mapArmorType, convertArmor])(
  'preserves Commercial in both loader paths',
  (map) => {
    const type = map('COMMERCIAL', TechBase.INNER_SPHERE);
    expect(type).toBe('Commercial');
    expect(getArmorDefinition(type)).toMatchObject({
      pointsPerTon: 24,
      introductionYear: 2285,
      criticalSlots: 0,
    });
  },
);

it('retains Lumberjack Commercial armor through save and reload', () => {
  const loader = new UnitLoaderService();
  const state = loader.mapToUnitState(lumberjack, true);
  expect(state.armorType).toBe('Commercial');
  const saved = serializeCustomUnitState(state, {
    id: 'lumberjack-commercial',
    chassis: 'Lumberjack',
    variant: 'LM1A',
    era: Era.AGE_OF_WAR,
  });
  expect(saved.armor.type).toBe('COMMERCIAL');
  expect(loader.mapToUnitState(parseUnit(saved), false).armorType).toBe(
    'Commercial',
  );
});

// EquipmentType.java:95 identifies Commercial as BLK armor code 10.
it('round-trips the native BLK code', () => {
  expect(decodeBlkArmorType(10, false)).toBe('Commercial');
  expect(encodeBlkArmorType(ArmorTypeEnum.COMMERCIAL)).toBe(10);
});
