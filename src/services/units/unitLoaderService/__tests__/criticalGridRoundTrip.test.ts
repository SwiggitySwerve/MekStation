import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { UnitState } from '@/stores/unitState';

import { mapStructureType } from '@/services/conversion/ValueMappings';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getCriticalSlotsForLocation } from '@/services/units/unitLoaderService/criticalSlotEquipment';
import { getUnitLibraryFingerprint } from '@/stores/unit/unitEditSnapshot';
import { createUnitStore } from '@/stores/unit/useUnitStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  getLocationsForConfig,
  MechConfiguration,
} from '@/types/construction/MechConfigurationSystem';
import { Era } from '@/types/temporal/Era';
import { fillUnhittableSlots } from '@/utils/construction/slotOperations/filling';
import { getSlotParts } from '@/utils/construction/slotOperations/parts';
import { getFixedSlotNames } from '@/utils/construction/slotOperations/topology';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import { parseUnit, UnitLoaderService } from '../index';

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
beforeEach(() => localStorage.clear());
const loader = new UnitLoaderService();
const save = (state: UnitState) =>
  serializeCustomUnitState(state, {
    id: state.id,
    chassis: state.chassis,
    variant: state.model,
    era: Era.DARK_AGE,
  });
const read = (path: string) =>
  parseUnit(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', path),
        'utf8',
      ),
    ),
  );
const crab = () => read('3-succession-wars/standard/King Crab KGC-0000.json');

it.each([
  '1-age-of-war/advanced/DemolitionMech WI-DM.json',
  '2-star-league/advanced/Screamer LAM SCR-1X-LAM.json',
  '3-succession-wars/standard/Daedalus GTX2 (Militarized).json',
  '5-civil-war/standard/Omega SHP-4X.json',
  "6-dark-age/experimental/'Scout Tripod' R-H3L-1X.json",
  '6-dark-age/experimental/Arion Unknown.json',
])(
  'retains every native location and token through a real-store save/reopen: %s',
  (path) => {
    const raw = read(path);
    const store = createUnitStore(loader.mapToUnitState(raw, true));
    const saved = save(store.getState());
    const reopened = loader.mapToUnitState(parseUnit(saved), false);
    for (const location of getLocationsForConfig(
      store.getState().configuration,
    )) {
      const original = getCriticalSlotsForLocation(raw.criticalSlots, location);
      const expected =
        original ??
        Array.from(
          { length: 6 },
          (_, index) =>
            getFixedSlotNames(
              location,
              store.getState().engineType,
              store.getState().gyroType,
              store.getState().armActuators,
              store.getState().cockpitType,
            ).get(index) ?? null,
        );
      expect(
        getCriticalSlotsForLocation(saved.criticalSlots, location),
      ).toEqual(expected);
      expect(
        getCriticalSlotsForLocation(
          reopened.bvContext?.source.criticalSlots,
          location,
        ),
      ).toEqual(expected);
    }
  },
);

it('retains unmapped native tokens and empty-but-explicit locations', () => {
  const raw = crab();
  const source = {
    ...raw,
    criticalSlots: {
      ...raw.criticalSlots,
      HEAD: [
        'Life Support',
        'Sensors',
        null,
        'Cockpit',
        'Sensors',
        'Life Support',
      ],
      LEFT_LEG: [
        'Hip',
        'Upper Leg Actuator',
        'Lower Leg Actuator',
        'Foot Actuator',
        'Native AP Pod',
        null,
      ],
      RIGHT_LEG: [null, null, null, null, null, null],
    },
  };
  const state = createUnitStore(loader.mapToUnitState(source, true)).getState();
  const serialized = save(state);
  expect(
    getCriticalSlotsForLocation(
      serialized.criticalSlots,
      MechLocation.LEFT_LEG,
    ),
  ).toEqual(source.criticalSlots.LEFT_LEG);
  expect(
    getCriticalSlotsForLocation(
      serialized.criticalSlots,
      MechLocation.RIGHT_LEG,
    ),
  ).toEqual(source.criticalSlots.RIGHT_LEG);
});

it('materializes fixed systems when a new mount creates a missing source location', () => {
  const state = loader.mapToUnitState(crab(), true);
  const { LEFT_ARM: omitted, ...criticalSlots } =
    state.bvContext!.source.criticalSlots!;
  expect(omitted).toBeDefined();
  const store = createUnitStore({
    ...state,
    equipment: [],
    bvContext: {
      ...state.bvContext!,
      equipment: [],
      source: { ...state.bvContext!.source, criticalSlots },
    },
  });
  const item = {
    ...state.equipment[0],
    equipmentId: 'medium-laser',
    name: 'Medium Laser',
    criticalSlots: 1,
    location: MechLocation.LEFT_ARM,
    slots: [4],
    splitSlots: undefined,
  };
  store.setState({ equipment: [item] });
  const saved = save(store.getState());
  expect(
    getCriticalSlotsForLocation(saved.criticalSlots, MechLocation.LEFT_ARM),
  ).toEqual([
    'Shoulder',
    'Upper Arm',
    'Lower Arm',
    'Hand',
    'Medium Laser',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
});

it('writes explicit empty cells when a cockpit edit extends an empty native array', () => {
  const raw = crab();
  const store = createUnitStore(
    loader.mapToUnitState(
      { ...raw, criticalSlots: { ...raw.criticalSlots, HEAD: [] } },
      true,
    ),
  );
  store.getState().setCockpitType(CockpitType.SMALL);
  const slots = getCriticalSlotsForLocation(
    save(store.getState()).criticalSlots,
    MechLocation.HEAD,
  )!;
  expect(Array.from(slots)).not.toContain(undefined);
  const reopened = loader.mapToUnitState(
    parseUnit(save(store.getState())),
    false,
  );
  expect(reopened.cockpitType).toBe(CockpitType.SMALL);
});

it.each(Object.values(CockpitType))(
  'current %s systems replace stale source without erasing live allocations',
  (cockpit) => {
    const store = createUnitStore(loader.mapToUnitState(crab(), true));
    store.getState().setCockpitType(cockpit);
    const state = store.getState(),
      serialized = save(state);
    const reopened = loader.mapToUnitState(parseUnit(serialized), false);
    expect(reopened.cockpitType).toBe(cockpit);
    for (const location of [
      MechLocation.HEAD,
      MechLocation.CENTER_TORSO,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
    ]) {
      const slots = getCriticalSlotsForLocation(
        serialized.criticalSlots,
        location,
      );
      getFixedSlotNames(
        location,
        state.engineType,
        state.gyroType,
        state.armActuators,
        cockpit,
      ).forEach((name, index) => {
        // An unchanged Standard layout keeps its original native tokens.
        const occupied = state.equipment
          .flatMap(getSlotParts)
          .some(
            (part) => part.location === location && part.slots.includes(index),
          );
        const expected =
          cockpit === CockpitType.STANDARD || occupied
            ? getCriticalSlotsForLocation(crab().criticalSlots, location)?.[
                index
              ]
            : name;
        expect(slots?.[index]).toBe(expected);
      });
    }
  },
);

it('current engine, gyro and arm actuator topology wins without stale fixed cells', () => {
  const store = createUnitStore(loader.mapToUnitState(crab(), true));
  store.getState().setEngineType(EngineType.COMPACT);
  store.getState().setGyroType(GyroType.COMPACT);
  const state = {
    ...store.getState(),
    armActuators: { [MechLocation.LEFT_ARM]: { lowerArm: false, hand: false } },
  };
  const serialized = save(state);
  for (const location of [MechLocation.CENTER_TORSO, MechLocation.LEFT_ARM]) {
    const slots = getCriticalSlotsForLocation(
      serialized.criticalSlots,
      location,
    );
    getFixedSlotNames(
      location,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    ).forEach((name, index) =>
      expect(slots?.[index]).toBe(
        location === MechLocation.LEFT_ARM
          ? getCriticalSlotsForLocation(crab().criticalSlots, location)?.[index]
          : name,
      ),
    );
  }
  expect(
    getCriticalSlotsForLocation(
      serialized.criticalSlots,
      MechLocation.CENTER_TORSO,
    )?.slice(5, 10),
  ).toEqual(Array(5).fill(null));
  expect(
    getCriticalSlotsForLocation(
      serialized.criticalSlots,
      MechLocation.LEFT_ARM,
    )?.slice(2, 4),
  ).toEqual([null, null]);
});

it('clears source-only structure, armor and sinks when selected components change', () => {
  const raw = crab();
  const source = {
    ...raw,
    structure: { type: 'ENDO_STEEL' },
    armor: { ...raw.armor, type: 'FERRO_FIBROUS' },
    criticalSlots: {
      ...raw.criticalSlots,
      LEFT_LEG: [
        'Hip',
        'Upper Leg Actuator',
        'Lower Leg Actuator',
        'Foot Actuator',
        'Endo Steel',
        'Ferro-Fibrous',
      ],
      RIGHT_LEG: [
        'Hip',
        'Upper Leg Actuator',
        'Lower Leg Actuator',
        'Foot Actuator',
        'Heat Sink',
        null,
      ],
    },
  };
  const store = createUnitStore(loader.mapToUnitState(source, true));
  store.getState().setInternalStructureType(InternalStructureType.STANDARD);
  store.getState().setArmorType(ArmorTypeEnum.STANDARD);
  store.getState().setHeatSinkType(HeatSinkType.DOUBLE_IS);
  const saved = save(store.getState());
  expect(
    getCriticalSlotsForLocation(
      saved.criticalSlots,
      MechLocation.LEFT_LEG,
    )?.slice(4),
  ).toEqual([null, null]);
  expect(
    getCriticalSlotsForLocation(
      saved.criticalSlots,
      MechLocation.RIGHT_LEG,
    )?.slice(4),
  ).toEqual([null, null]);
});

it('removes every split portion through the actual store', () => {
  const store = createUnitStore(loader.mapToUnitState(crab(), true));
  const cannon = store
    .getState()
    .equipment.find(
      (e) => e.location === MechLocation.LEFT_TORSO && e.splitSlots,
    )!;
  store.getState().removeEquipment(cannon.instanceId);
  const saved = save(store.getState());
  expect(
    getCriticalSlotsForLocation(
      saved.criticalSlots,
      MechLocation.LEFT_TORSO,
    )?.slice(0, 2),
  ).toEqual([null, null]);
  expect(
    getCriticalSlotsForLocation(
      saved.criticalSlots,
      MechLocation.LEFT_ARM,
    )?.slice(4),
  ).toEqual(Array(8).fill(null));
});

it('auto-fill replaces source-only structure cells without duplicating them', () => {
  const raw = crab();
  const source = {
    ...raw,
    structure: { type: 'ENDO_STEEL' },
    criticalSlots: {
      ...raw.criticalSlots,
      LEFT_LEG: [
        'Hip',
        'Upper Leg Actuator',
        'Lower Leg Actuator',
        'Foot Actuator',
        'Endo Steel',
        'Endo Steel',
      ],
    },
  };
  const store = createUnitStore(loader.mapToUnitState(source, true));
  store
    .getState()
    .setInternalStructureType(InternalStructureType.ENDO_STEEL_IS);
  const state = store.getState();
  const allocation = fillUnhittableSlots(
    state.equipment,
    state.engineType,
    state.gyroType,
    state.configuration,
    state.armActuators,
    state.cockpitType,
  );
  expect(allocation.unassigned).toEqual([]);
  expect(allocation.assignments).toHaveLength(14);
  state.bulkUpdateEquipmentLocations(allocation.assignments);
  const saved = save(store.getState());
  const structural = Object.values(saved.criticalSlots)
    .flat()
    .filter(
      (token) =>
        token && mapStructureType(token) !== InternalStructureType.STANDARD,
    );
  expect(structural).toHaveLength(14);
  const reopened = loader.mapToUnitState(parseUnit(saved), false);
  expect(reopened.internalStructureType).toBe(
    InternalStructureType.ENDO_STEEL_IS,
  );
  expect(save(reopened).criticalSlots).toEqual(saved.criticalSlots);
});

it('clears source-only heat sinks when the count changes without a type change', () => {
  const raw = crab();
  // A source with no summary historically has no recovered heat-sink mounts.
  const source = {
    ...raw,
    equipment: [],
    criticalSlots: {
      ...raw.criticalSlots,
      LEFT_LEG: [
        'Hip',
        'Upper Leg Actuator',
        'Lower Leg Actuator',
        'Foot Actuator',
        'Heat Sink',
        null,
      ],
    },
  };
  const store = createUnitStore(loader.mapToUnitState(source, true));
  store.getState().setHeatSinkCount(0);
  expect(
    getCriticalSlotsForLocation(
      save(store.getState()).criticalSlots,
      MechLocation.LEFT_LEG,
    )?.[4],
  ).toBeNull();
});

it('drops locations from an old configuration without losing active legs', () => {
  const store = createUnitStore(loader.mapToUnitState(crab(), true));
  store.getState().setConfiguration(MechConfiguration.QUAD);
  const saved = save(store.getState());
  expect(
    getCriticalSlotsForLocation(saved.criticalSlots, MechLocation.LEFT_ARM),
  ).toBeUndefined();
  for (const location of getLocationsForConfig(MechConfiguration.QUAD))
    expect(saved.criticalSlots[location]).toBeDefined();
});

it('library fingerprint ignores temporary mount ids with native source context', () => {
  const state = loader.mapToUnitState(crab(), true);
  const first = getUnitLibraryFingerprint(state);
  expect(
    getUnitLibraryFingerprint({
      ...state,
      equipment: state.equipment.map((item, index) => ({
        ...item,
        instanceId: `temporary-${index}`,
      })),
    }),
  ).toBe(first);
  expect(
    getUnitLibraryFingerprint({
      ...state,
      bvContext: {
        ...state.bvContext!,
        source: {
          ...state.bvContext!.source,
          criticalSlots: {
            ...state.bvContext!.source.criticalSlots,
            HEAD: ['Changed native evidence'],
          },
        },
      },
    }),
  ).not.toBe(first);
});
