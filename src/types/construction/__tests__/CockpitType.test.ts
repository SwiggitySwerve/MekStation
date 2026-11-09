import {
  parseUnit,
  UnitLoaderService,
} from '@/services/units/unitLoaderService';
import { mapCockpitType } from '@/services/units/unitLoaderService/componentMappers';
import { getUnitLibraryFingerprint } from '@/stores/unit/unitEditSnapshot';
import { createNewUnitStore } from '@/stores/unit/useUnitStore';
import { createDefaultUnitState } from '@/stores/unitState';
import {
  CockpitType,
  COCKPIT_DEFINITIONS,
  getCockpitDefinition,
  getCockpitSystemSlots,
} from '@/types/construction/CockpitType';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import unitSchema from '../../../../public/data/equipment/_schema/unit-schema.json';

// MegaMek 48fcb2f64 Mek.java:192-229, 5612-5838; TestMek.java:225-248.
const standard = [0, 1, 2, 4, 5];
const smallConsole = [0, 1, 2, 3, 4];
const consoleSlots = [0, 1, 2, 3, 4, 5];
const cases = [
  ['STANDARD', 'Standard', 3, standard],
  ['SMALL', 'Small', 2, [0, 1, 2, 3]],
  ['COMMAND_CONSOLE', 'Command Console', 6, consoleSlots],
  ['TORSO_MOUNTED', 'Torso-Mounted', 4, [0, 1]],
  ['DUAL', 'Dual', 4, consoleSlots],
  ['INDUSTRIAL', 'Industrial', 3, standard],
  ['PRIMITIVE', 'Primitive', 5, standard],
  ['PRIMITIVE_INDUSTRIAL', 'Primitive Industrial', 5, standard],
  ['SUPERHEAVY', 'Superheavy', 4, standard],
  ['SUPERHEAVY_TRIPOD', 'Superheavy Tripod', 5, standard],
  ['TRIPOD', 'Tripod', 4, standard],
  ['INTERFACE', 'Interface', 4, consoleSlots],
  ['VRRP', 'Virtual Reality Piloting Pod', 3, [0, 1]],
  ['QUADVEE', 'QuadVee', 4, consoleSlots],
  ['SUPERHEAVY_INDUSTRIAL', 'Superheavy Industrial', 4, standard],
  ['SUPERHEAVY_COMMAND_CONSOLE', 'Superheavy Command Console', 7, consoleSlots],
  ['SMALL_COMMAND_CONSOLE', 'Small Command Console', 5, smallConsole],
  ['TRIPOD_INDUSTRIAL', 'Tripod Industrial', 4, standard],
  ['SUPERHEAVY_TRIPOD_INDUSTRIAL', 'Superheavy Tripod Industrial', 5, standard],
] as const;

it('represents all nineteen pinned cockpit identities exactly once', () => {
  expect(Object.values(CockpitType)).toHaveLength(19);
  expect(
    new Set(COCKPIT_DEFINITIONS.map((definition) => definition.type)).size,
  ).toBe(19);
  expect(
    COCKPIT_DEFINITIONS.map((definition) => definition.sourceTag).sort(),
  ).toEqual([...unitSchema.properties.cockpit.enum].sort());
});

it.each(cases)(
  'preserves %s identity, mass, head topology and save/reopen',
  (source, expected, weight, head) => {
    const type = mapCockpitType(source);
    expect(type).toBe(expected);
    expect(getCockpitDefinition(type)?.weight).toBe(weight);
    expect(
      [...getCockpitSystemSlots(type).head.keys()].sort((a, b) => a - b),
    ).toEqual(head);
    const store = createNewUnitStore({
      name: 'Cockpit contract',
      tonnage: 100,
      techBase: TechBase.INNER_SPHERE,
    });
    const originalFingerprint = getUnitLibraryFingerprint(store.getState());
    store.getState().setCockpitType(type);
    const state = store.getState();
    expect(getUnitLibraryFingerprint(state) === originalFingerprint).toBe(
      type === CockpitType.STANDARD,
    );
    const saved = serializeCustomUnitState(state, {
      id: state.id,
      chassis: 'Cockpit contract',
      variant: source,
      era: Era.DARK_AGE,
    });
    expect(saved.cockpit).toBe(source);
    expect(
      new UnitLoaderService().mapToUnitState(parseUnit(saved), false)
        .cockpitType,
    ).toBe(type);
  },
);

it('retains native names and existing aliases without inferring configuration', () => {
  expect(mapCockpitType('Superheavy Tripod Cockpit')).toBe('Superheavy Tripod');
  expect(mapCockpitType('Small Command Console')).toBe('Small Command Console');
  expect(mapCockpitType('torso cockpit')).toBe(CockpitType.TORSO_MOUNTED);
  expect(mapCockpitType('command')).toBe(CockpitType.COMMAND_CONSOLE);
  expect(mapCockpitType('unrecognized')).toBe(CockpitType.STANDARD);
  const state = {
    ...createDefaultUnitState({
      name: 'Standard tripod',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
    configuration: MechConfiguration.TRIPOD,
  };
  const saved = serializeCustomUnitState(state, {
    id: state.id,
    chassis: 'Standard tripod',
    variant: 'S',
    era: Era.DARK_AGE,
  });
  expect(
    new UnitLoaderService().mapToUnitState(parseUnit(saved), false).cockpitType,
  ).toBe(CockpitType.STANDARD);
});
