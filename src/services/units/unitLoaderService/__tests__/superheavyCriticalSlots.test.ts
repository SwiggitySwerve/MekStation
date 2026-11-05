import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { getFixedSlotNames } from '@/utils/construction/slotOperations/topology';

import omega from '../../../../../public/data/units/battlemechs/6-dark-age/experimental/Omega SHP-5R.json';
import { restoreCriticalSlotEquipment } from '../criticalSlotEquipment';
import { mapEquipment } from '../equipmentMapping';
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

// MegaMek 48fcb2f64: Mek.java:3484-3492 halves critical entries (round up);
// TestMek.java:438-477 checks the mounted equipment's complete allocation.
it('restores Omega SHP-5R weapons into their native superheavy entries', () => {
  const state = new UnitLoaderService().mapToUnitState(omega, true);
  const cannons = state.equipment.filter(
    (item) => item.equipmentId === 'lb-10-x-ac',
  );
  expect(cannons).toHaveLength(2);
  for (const item of cannons) {
    expect(item.criticalSlots).toBe(3);
    expect(item.slots).toEqual([3, 4, 5]);
    expect(item.weight).toBe(11);
  }
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    ),
  ).toEqual([]);
});

it.each([
  [100, 6],
  [105, 3],
])('uses native critical demand at %i tons', (tonnage, count) => {
  const slots = Array.from({ length: count }, (_, i) => i + 4);
  const [item] = mapEquipment(
    [{ id: 'lb-10-x-ac', location: 'LEFT_ARM', slots, isRearMounted: true }],
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    undefined,
    tonnage,
  );
  expect(item.criticalSlots).toBe(count);
  expect(item.slots).toEqual(slots);
  expect(item.isRearMounted).toBe(true);
  expect(item.weight).toBe(11);
});

it('rounds an odd seven-critical Gauss rifle up to four entries', () => {
  const [item] = mapEquipment(
    [{ id: 'gauss-rifle', location: 'RIGHT_TORSO' }],
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    { RIGHT_TORSO: Array(4).fill('ISGaussRifle') },
    150,
  );
  expect(item.criticalSlots).toBe(4);
  expect(item.slots).toEqual([0, 1, 2, 3]);
  expect(item.weight).toBe(15);
});

it('recovers a superheavy double heat sink in two entries', () => {
  const slots = { LEFT_TORSO: ['ISDoubleHeatSink', 'ISDoubleHeatSink'] };
  const items = restoreCriticalSlotEquipment(
    [],
    [],
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    slots,
    105,
  );
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({
    criticalSlots: 2,
    slots: [0, 1],
    weight: 1,
  });
  expect(
    restoreCriticalSlotEquipment(
      [],
      [],
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      slots,
      100,
    ),
  ).toEqual([]);
});

it('uses the same entries for recovered variable physical mounts', () => {
  const items = restoreCriticalSlotEquipment(
    [],
    [],
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    { LEFT_ARM: Array(6).fill('Mace') },
    105,
  );
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({
    equipmentId: 'mace',
    criticalSlots: 6,
    slots: [0, 1, 2, 3, 4, 5],
    weight: 11,
  });
});

// Engine.java:609-641,653-696 and Mek.java:5940-5949 reserve three CT engine
// entries and two superheavy gyro entries; XL side-torso demand is paired too.
it('reserves native superheavy system entries while retaining standard systems', () => {
  expect([
    ...getFixedSlotNames(
      MechLocation.CENTER_TORSO,
      EngineType.XL_IS,
      GyroType.SUPERHEAVY,
    ).keys(),
  ]).toEqual([0, 1, 2, 3, 4]);
  expect([
    ...getFixedSlotNames(
      MechLocation.LEFT_TORSO,
      EngineType.XL_IS,
      GyroType.SUPERHEAVY,
    ).keys(),
  ]).toEqual([0, 1]);
  expect([
    ...getFixedSlotNames(
      MechLocation.LEFT_TORSO,
      EngineType.XL_CLAN,
      GyroType.SUPERHEAVY,
    ).keys(),
  ]).toEqual([0]);
  expect([
    ...getFixedSlotNames(
      MechLocation.CENTER_TORSO,
      EngineType.XL_IS,
      GyroType.STANDARD,
    ).keys(),
  ]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
