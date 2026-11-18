import { act, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';

import { useEquipmentValidation } from '@/hooks/validation/useEquipmentValidation';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { UnitStoreContext, createUnitStore } from '@/stores/useUnitStore';
import {
  COCKPIT_DEFINITIONS,
  CockpitType,
  getCockpitDefinition,
  getCockpitSystemSlots,
} from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { getFixedSlotNames } from '@/utils/construction/slotOperations/topology';

import crab from '../../../../../public/data/units/battlemechs/5-civil-war/advanced/King Crab KGC-008.json';
import turtle from '../../../../../public/data/units/battlemechs/5-civil-war/standard/Great Turtle GTR-2.json';
import { parseCriticalSlotToken } from '../equipmentResolution';
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

// MegaMek 48fcb2f64 MtfFile.java:952-956 strips (ARMORED) before the
// OmniPod and rear markers (:1010-1020); identity qualifiers stay.
it.each([
  ['ISERPPC (ARMORED)', 'ISERPPC', false],
  ['ISERPPC (R) (ARMORED)', 'ISERPPC', true],
  ['ISERPPC (R) (OMNIPOD) (ARMORED)', 'ISERPPC', true],
  ['CLStreakSRM4 (OS) (ARMORED)', 'CLStreakSRM4 (OS)', false],
  ['ISERPPC (R) (OMNIPOD)', 'ISERPPC', true],
] as const)(
  '%s keeps identity and rear mounting',
  (token, lookupToken, isRearMounted) => {
    expect(parseCriticalSlotToken(token)).toMatchObject({
      lookupToken,
      isRearMounted,
    });
  },
);

it.each([
  ['ISERPPC', false],
  ['ISERPPC (ARMORED)', true],
  ['ISERPPC (R) (OMNIPOD) (ARMORED)', true],
  ['ISERPPC (ARMORED) suffix', false],
] as const)(
  '%s exposes its native armored suffix as %s',
  (token, isArmored) => {
    expect(parseCriticalSlotToken(token).isArmored).toBe(isArmored);
  },
);

it('recovers Great Turtle GTR-2 armored weapon slots', () => {
  const state = new UnitLoaderService().mapToUnitState(turtle, true);
  const ids = ['medium-x-pulse-laser', 'er-medium-laser', 'er-ppc'];
  const weapons = state.equipment.filter((item) =>
    ids.includes(item.equipmentId),
  );
  expect(weapons).toHaveLength(4);
  for (const item of weapons)
    expect(item.slots).toHaveLength(item.criticalSlots);
});

// Mek.java:5692-5702 (small), 5719-5727 (console), 5797-5838 (torso).
it.each([
  [CockpitType.STANDARD, [0, 1, 2, 4, 5]],
  [CockpitType.SMALL, [0, 1, 2, 3]],
  [CockpitType.TORSO_MOUNTED, [0, 1]],
  [CockpitType.COMMAND_CONSOLE, [0, 1, 2, 3, 4, 5]],
] as const)('%s reserves its actual head positions', (cockpit, expected) => {
  const fixed = getFixedSlotNames(
    MechLocation.HEAD,
    EngineType.STANDARD,
    GyroType.STANDARD,
    undefined,
    cockpit,
  );
  expect([...fixed.keys()].sort((a, b) => a - b)).toEqual(expected);
});

it.each(COCKPIT_DEFINITIONS.map((definition) => [definition.type]))(
  '%s slot counts match its fixed positions',
  (type) => {
    const slots = getCockpitSystemSlots(type);
    expect(getCockpitDefinition(type)).toMatchObject({
      headSlots: slots.head.size,
      otherSlots: slots.centerTorso.length + 2 * slots.sideTorso.length,
    });
  },
);

it('places torso cockpit systems and derives its slot counts', () => {
  expect(getCockpitDefinition(CockpitType.TORSO_MOUNTED)).toMatchObject({
    headSlots: 2,
    otherSlots: 4,
  });
  const ct = getFixedSlotNames(
    MechLocation.CENTER_TORSO,
    EngineType.COMPACT,
    GyroType.COMPACT,
    undefined,
    CockpitType.TORSO_MOUNTED,
  );
  expect([ct.get(5), ct.get(6)]).toEqual(['Torso-Mounted Cockpit', 'Sensors']);
  const side = getFixedSlotNames(
    MechLocation.LEFT_TORSO,
    EngineType.LIGHT,
    GyroType.STANDARD,
    undefined,
    CockpitType.TORSO_MOUNTED,
  );
  expect([...side.entries()]).toEqual([
    [0, 'Life Support'],
    [1, 'Engine'],
    [2, 'Engine'],
  ]);
});

it.each([crab, turtle])(
  'validates $chassis $model with its own cockpit and refreshes on edit',
  (source) => {
    const store = createUnitStore(
      new UnitLoaderService().mapToUnitState(source, true),
    );
    const { result } = renderHook(() => useEquipmentValidation(), {
      wrapper: ({ children }) =>
        createElement(UnitStoreContext.Provider, { value: store }, children),
    });
    const headErrors = () =>
      result.current.equipmentSlotIssues.filter(
        (issue) => issue.location === MechLocation.HEAD,
      );
    expect(headErrors()).toEqual([]);
    act(() => store.setState({ cockpitType: CockpitType.STANDARD }));
    expect(headErrors().length).toBeGreaterThan(0);
  },
);
