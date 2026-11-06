import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mapCockpitType as convertCockpit } from '@/services/conversion/ValueMappings';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getCockpitDefinition } from '@/types/construction/CockpitType';
import { Era } from '@/types/temporal/Era';
import { COCKPIT_COSTS } from '@/utils/construction/costCalculations';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import lumberjack from '../../../../../public/data/units/battlemechs/1-age-of-war/standard/Lumberjack LM1-A.json';
import { mapCockpitType } from '../componentMappers';
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

// MegaMek 48fcb2f64 Mek.java:3785-3793; TestMek.java:238-242;
// MekCostCalculator.java:66. Native identity, earliest date, mass and cost.
it.each([mapCockpitType, convertCockpit])(
  'preserves the Primitive Industrial definition',
  (map) => {
    const type = map('PRIMITIVE_INDUSTRIAL');
    expect(type).toBe('Primitive Industrial');
    expect(getCockpitDefinition(type)).toMatchObject({
      introductionYear: 2295,
      weight: 5,
      headSlots: 5,
      otherSlots: 0,
    });
    expect(COCKPIT_COSTS[type]).toBe(100000);
  },
);

it('retains Lumberjack cockpit identity through custom save and reload', () => {
  const loader = new UnitLoaderService();
  const state = loader.mapToUnitState(lumberjack, true);
  expect(state.cockpitType).toBe('Primitive Industrial');
  const saved = serializeCustomUnitState(state, {
    id: 'lumberjack-cockpit',
    chassis: 'Lumberjack',
    variant: 'LM1A',
    era: Era.AGE_OF_WAR,
  });
  expect(saved.cockpit).toBe('PRIMITIVE_INDUSTRIAL');
  expect(loader.mapToUnitState(parseUnit(saved), false).cockpitType).toBe(
    'Primitive Industrial',
  );
});
