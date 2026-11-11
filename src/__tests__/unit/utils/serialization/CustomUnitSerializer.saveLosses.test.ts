import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IRawSerializedUnit } from '@/services/units/unitLoaderService/types';
import type { UnitState } from '@/stores/unitState';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  parseUnit,
  UnitLoaderService,
} from '@/services/units/unitLoaderService';
import { getCriticalSlotsForLocation } from '@/services/units/unitLoaderService/criticalSlotEquipment';
import { parseCriticalSlotToken } from '@/services/units/unitLoaderService/equipmentResolution';
import { CockpitType } from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { Era } from '@/types/temporal/Era';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';
import { getMountedRearSuffix } from '@/utils/serialization/CustomUnitSerializer.sourceCells';

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

const LOCUST = '6-dark-age/standard/Locust IIC 9.json';
const TURTLE = '5-civil-war/standard/Great Turtle GTR-2.json';
const ATLAS = '2-star-league/standard/Atlas AS7-D.json';

function source(path: string): IRawSerializedUnit {
  return parseUnit(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', path),
        'utf8',
      ),
    ),
  );
}

function load(path: string): UnitState {
  return new UnitLoaderService().mapToUnitState(source(path), true);
}

function loadExplicitRearAtlas(): UnitState {
  const atlas = source(ATLAS);
  return new UnitLoaderService().mapToUnitState(
    {
      ...atlas,
      equipment: atlas.equipment?.map((mount) =>
        mount.id === 'medium-laser' && mount.location === 'CENTER_TORSO'
          ? { ...mount, isRearMounted: true }
          : mount,
      ),
    },
    true,
  );
}

function save(state: UnitState) {
  return serializeCustomUnitState(state, {
    id: 'custom-save-loss-test',
    chassis: state.chassis,
    variant: state.model,
    era: Era.DARK_AGE,
  });
}

function coldReopen(document: unknown): UnitState {
  return new UnitLoaderService().mapToUnitState(
    parseUnit(JSON.parse(JSON.stringify(document))),
    false,
  );
}

function cells(
  document: Pick<IRawSerializedUnit, 'criticalSlots'>,
  location: MechLocation,
) {
  return getCriticalSlotsForLocation(document.criticalSlots, location) ?? [];
}

function reopenedSource(document: unknown): IRawSerializedUnit {
  const raw = coldReopen(document).bvContext?.source;
  if (!raw) throw new Error('Cold reopen must retain the saved source');
  return raw;
}

function expectLocustEngineCells(
  document: Pick<IRawSerializedUnit, 'criticalSlots'>,
) {
  for (const location of [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO]) {
    expect(cells(document, location).slice(0, 4)).toEqual(
      Array(4).fill('Fusion Engine'),
    );
  }
  expect(cells(document, MechLocation.CENTER_TORSO).slice(0, 3)).toEqual(
    Array(3).fill('Fusion Engine'),
  );
  expect(cells(document, MechLocation.CENTER_TORSO).slice(9, 12)).toEqual(
    Array(3).fill('Fusion Engine'),
  );
}

function expectTurtleArmor(
  document: Pick<IRawSerializedUnit, 'criticalSlots'>,
) {
  for (const location of [
    MechLocation.FRONT_LEFT_LEG,
    MechLocation.FRONT_RIGHT_LEG,
    MechLocation.REAR_LEFT_LEG,
    MechLocation.REAR_RIGHT_LEG,
  ]) {
    expect(cells(document, location)[0]).toBe('Hip (ARMORED)');
  }
  for (const location of [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO]) {
    expect(cells(document, location)[0]).toBe('Life Support (ARMORED)');
  }
  expect(cells(document, MechLocation.CENTER_TORSO).slice(0, 7)).toEqual([
    'Fusion Engine (ARMORED)',
    'Fusion Engine (ARMORED)',
    'Fusion Engine (ARMORED)',
    'Gyro (ARMORED)',
    'Gyro (ARMORED)',
    'Cockpit (ARMORED)',
    'Sensors (ARMORED)',
  ]);
  expect(cells(document, MechLocation.HEAD).slice(0, 2)).toEqual([
    'Sensors (ARMORED)',
    'Sensors (ARMORED)',
  ]);
  for (const slot of [5, 6, 7]) {
    expect(cells(document, MechLocation.RIGHT_TORSO)[slot]).toMatch(
      / \(ARMORED\)$/,
    );
  }
  expect(cells(document, MechLocation.LEFT_TORSO)[8]).toMatch(/ \(ARMORED\)$/);
  expect(cells(document, MechLocation.LEFT_TORSO)[9]).toMatch(/ \(ARMORED\)$/);
  expect(cells(document, MechLocation.HEAD)[5]).toMatch(/ \(ARMORED\)$/);
}

it('cold saves and reopens the Locust IIC 9 native engine cells', () => {
  const document = save(load(LOCUST));
  expectLocustEngineCells(document);
  expectLocustEngineCells(reopenedSource(document));
});

it('rejects an engine-dropping writer mutant through the same cold boundary', () => {
  const document = save(load(LOCUST));
  const mutant = {
    ...document,
    criticalSlots: {
      ...document.criticalSlots,
      [MechLocation.LEFT_TORSO]: document.criticalSlots[
        MechLocation.LEFT_TORSO
      ].map((token, slot) => (slot < 4 ? null : token)),
    },
  };
  expect(() => expectLocustEngineCells(reopenedSource(mutant))).toThrow();
});

it.each([
  { engineType: EngineType.STANDARD },
  { engineRating: 300 },
  { engineRating: 0 },
  { tonnage: 30 },
  { configuration: MechConfiguration.QUAD },
  { gyroType: GyroType.COMPACT },
  { cockpitType: CockpitType.TORSO_MOUNTED },
])('does not inherit old engine cells after configuration edit %j', (patch) => {
  const document = save({ ...load(LOCUST), ...patch });
  expect(Object.values(document.criticalSlots).flat()).not.toContain(
    'Fusion Engine',
  );
});

it('requires an exact engine system identity, never an engine substring', () => {
  const state = load(LOCUST);
  if (!state.bvContext) throw new Error('Fixture must have source context');
  const document = save({
    ...state,
    bvContext: {
      ...state.bvContext,
      source: {
        ...state.bvContext.source,
        criticalSlots: { LEFT_TORSO: ['Fusion Engine Repair Kit'] },
      },
    },
  });
  expect(cells(document, MechLocation.LEFT_TORSO)[0] ?? null).toBeNull();
});

it('keeps a current mounted cell instead of overwriting it with source engine evidence', () => {
  const state = load(LOCUST);
  const mount = state.equipment[0];
  expect(mount).toBeDefined();
  const document = save({
    ...state,
    equipment: [
      {
        ...mount,
        location: MechLocation.LEFT_TORSO,
        slots: [0],
        name: 'Current Mount',
      },
    ],
  });
  expect(cells(document, MechLocation.LEFT_TORSO)[0]).toBe('Current Mount');
});

it('cold saves and reopens Great Turtle armored mounts and systems', () => {
  const document = save(load(TURTLE));
  expectTurtleArmor(document);
  expectTurtleArmor(reopenedSource(document));
});

it.each(['Mad Cat Mk IV A.json', 'Mad Cat Mk IV (Prime).json'])(
  'preserves the armored gyro on A2-only %s',
  (file) => {
    const state = load(`6-dark-age/experimental/${file}`);
    const document = save(state);
    for (const raw of [document, reopenedSource(document)]) {
      expect(cells(raw, MechLocation.CENTER_TORSO).slice(3, 7)).toEqual(
        Array(4).fill('Gyro (ARMORED)'),
      );
    }
  },
);

it('rejects an armor-dropping writer mutant through the same cold boundary', () => {
  const document = save(load(TURTLE));
  const mutant = {
    ...document,
    criticalSlots: Object.fromEntries(
      Object.entries(document.criticalSlots).map(([location, entries]) => [
        location,
        entries.map((token) => token?.replace(/ \(ARMORED\)$/, '') ?? null),
      ]),
    ),
  };
  expect(() => expectTurtleArmor(reopenedSource(mutant))).toThrow();
});

it('does not transfer source armor to a replacement mounted identity', () => {
  const state = load(TURTLE);
  const weapon = state.equipment.find(
    (item) =>
      item.location === MechLocation.LEFT_TORSO && item.slots?.includes(9),
  );
  expect(weapon).toBeDefined();
  const document = save({
    ...state,
    equipment: state.equipment.map((item) =>
      item === weapon
        ? { ...item, equipmentId: 'medium-laser', name: 'Medium Laser' }
        : item,
    ),
  });
  expect(cells(document, MechLocation.LEFT_TORSO)[9]).toBe('Medium Laser');
});

it('does not transfer armored cockpit/gyro source cells to changed systems', () => {
  const document = save({
    ...load(TURTLE),
    cockpitType: CockpitType.STANDARD,
    gyroType: GyroType.STANDARD,
  });
  const torso = cells(document, MechLocation.CENTER_TORSO);
  expect(torso[3] ?? null).toBeNull();
  expect(torso[5] ?? null).toBeNull();
  expect(cells(document, MechLocation.LEFT_TORSO)[0] ?? null).toBeNull();
});

it('cold reopens each Atlas rear mount with its boolean and cell marker', () => {
  const state = loadExplicitRearAtlas();
  const rear = state.equipment.filter((mount) => mount.isRearMounted);
  expect(rear).toHaveLength(2);
  const document = save(state);
  const reopened = coldReopen(document);
  expect(
    reopened.equipment.filter((mount) => mount.isRearMounted),
  ).toHaveLength(2);
  for (const mount of rear) {
    if (!mount.location) throw new Error('Rear fixture must be allocated');
    for (const slot of mount.slots ?? []) {
      expect(cells(document, mount.location)[slot]).toMatch(/ \(R\)$/);
    }
  }
});

it('keeps canonical Atlas source rear markers through the current load-side false fallback', () => {
  const document = save(load(ATLAS));
  for (const raw of [document, reopenedSource(document)]) {
    expect(cells(raw, MechLocation.CENTER_TORSO).slice(10, 12)).toEqual(
      Array(2).fill('Medium Laser (R)'),
    );
  }
});

it.each(['moved', 'replaced', 'removed'] as const)(
  'rejects a stale rear marker for a %s mount',
  (edit) => {
    const state = load(ATLAS);
    const original = state.equipment.find(
      (mount) =>
        mount.location === MechLocation.CENTER_TORSO &&
        mount.slots?.includes(10),
    );
    if (!original) throw new Error('Expected Atlas center torso laser');
    const mount =
      edit === 'moved'
        ? { ...original, location: MechLocation.LEFT_ARM, slots: [4] }
        : edit === 'replaced'
          ? { ...original, equipmentId: 'small-laser', name: 'Small Laser' }
          : { ...original, instanceId: 'replacement-instance' };
    if (!mount.location) throw new Error('Expected allocated mount');
    const location = mount.location;
    const slot = mount.slots?.[0] ?? 0;
    const assertGuard = (suffix: string) => expect(suffix).toBe('');
    assertGuard(
      getMountedRearSuffix(state, mount, location, slot, 'Medium Laser (R)'),
    );
    // Deliberately drop source-identity/position/instance guards from the writer.
    const unguardedMutant = parseCriticalSlotToken('Medium Laser (R)')
      .isRearMounted
      ? ' (R)'
      : '';
    expect(() => assertGuard(unguardedMutant)).toThrow();
  },
);

it('honors an explicit live rear=false edit over a previously rear=true source', () => {
  const state = loadExplicitRearAtlas();
  const document = save({
    ...state,
    equipment: state.equipment.map((mount) => ({
      ...mount,
      isRearMounted: false,
    })),
  });
  expect(cells(document, MechLocation.CENTER_TORSO).slice(10, 12)).toEqual(
    Array(2).fill('Medium Laser'),
  );
  expect(
    coldReopen(document).equipment.some((mount) => mount.isRearMounted),
  ).toBe(false);
});

it('rejects a rear-dropping writer mutant through the same cold boundary', () => {
  const document = save(loadExplicitRearAtlas());
  const mutant = {
    ...document,
    equipment: document.equipment.map((mount) => ({
      ...mount,
      isRearMounted: false,
    })),
    criticalSlots: Object.fromEntries(
      Object.entries(document.criticalSlots).map(([location, entries]) => [
        location,
        entries.map((token) => token?.replace(/ \(R\)$/, '') ?? null),
      ]),
    ),
  };
  expect(() =>
    expect(
      coldReopen(mutant).equipment.filter((mount) => mount.isRearMounted),
    ).toHaveLength(2),
  ).toThrow();
});

it.each([true, false])(
  'writes the current rear flag %s even when source cells differ',
  (isRearMounted) => {
    const state = load(TURTLE);
    const weapon = state.equipment.find(
      (item) =>
        item.location === MechLocation.LEFT_TORSO && item.slots?.includes(9),
    );
    if (!weapon) throw new Error('Expected mounted Turtle laser');
    const changed = { ...weapon, isRearMounted };
    const document = save({
      ...state,
      equipment: state.equipment.map((item) =>
        item === weapon ? changed : item,
      ),
    });
    expect(cells(document, MechLocation.LEFT_TORSO)[9]).toBe(
      `${weapon.name}${isRearMounted ? ' (R)' : ''} (ARMORED)`,
    );
    const reopened = coldReopen(document).equipment.find(
      (item) => item.location === weapon.location && item.slots?.includes(9),
    );
    expect(reopened?.isRearMounted).toBe(isRearMounted);
  },
);

it('does not rebuild missing engine cells or armored state when opening an old save', () => {
  const original = source(LOCUST);
  const legacy = {
    ...original,
    criticalSlots: {
      LEFT_ARM: [
        'Shoulder',
        'Upper Arm',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    },
  };
  expect(reopenedSource(legacy).criticalSlots).toEqual(legacy.criticalSlots);
  expect(cells(reopenedSource(legacy), MechLocation.LEFT_TORSO)).toEqual([]);
  const turtle = source(TURTLE);
  const unarmoredLegacy = {
    ...turtle,
    criticalSlots: Object.fromEntries(
      Object.entries(turtle.criticalSlots ?? {}).map(([location, entries]) => [
        location,
        entries.map((token) => token?.replace(/ \(ARMORED\)$/, '') ?? null),
      ]),
    ),
  };
  expect(reopenedSource(unarmoredLegacy).criticalSlots).toEqual(
    unarmoredLegacy.criticalSlots,
  );
});
