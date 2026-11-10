import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { slotsToCritEntries } from '@/components/customizer/critical-slots/criticalSlotTypes';
import { handleEquipmentDropAction } from '@/components/customizer/tabs/CriticalSlotsTab.slotActions';
import { buildLocationSlots } from '@/components/customizer/tabs/CriticalSlotsTab.slotBuilders';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { getLocationsForConfig } from '@/types/construction/MechConfigurationSystem';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { createMountedEquipment } from '@/types/equipment/MountedEquipment';
import vocabulary from '@/types/formats/mtf-component-vocabulary.json';
import { Era } from '@/types/temporal/Era';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { getAvailableSlotIndices } from '@/utils/construction/slotOperations/queries';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import crewSaveLosses from '../../../../../e2e/fixtures/mech-crew-save-losses.json';
import crab from '../../../../../public/data/units/battlemechs/2-star-league/advanced/King Crab KGC-000.json';
import {
  getCriticalSlotsForLocation,
  recognizeCriticalSlotEntries,
} from '../criticalSlotEquipment';
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
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});
afterEach(() => localStorage.clear());

const loader = new UnitLoaderService();
const L = MechLocation;

/** Otherwise fully represented source: fourteen material cells and one laser. */
function fixture(marker: string) {
  return parseUnit({
    ...crab,
    equipment: [{ id: 'medium-laser', location: 'HEAD', slots: [3] }],
    armor: {
      ...crab.armor,
      type: marker === 'IS Ferro-Fibrous' ? 'FERRO_FIBROUS' : 'STANDARD',
    },
    structure: { type: marker === 'IS Endo Steel' ? 'ENDO_STEEL' : 'STANDARD' },
    engine: { type: 'FUSION', rating: 300 },
    criticalSlots: {
      HEAD: [null, null, null, 'ISMediumLaser'],
      LEFT_ARM: [null, null, null, null, ...Array<string>(8).fill(marker)],
      RIGHT_ARM: [null, null, null, null, ...Array<string>(6).fill(marker)],
    },
  });
}

it.each(['IS Ferro-Fibrous', 'IS Endo Steel'])(
  'occupies all native %s cells on open and cannot over-fill a fully represented design',
  (marker) => {
    const source = fixture(marker);
    const state = loader.mapToUnitState(source, true);
    expect(state.unrecoveredCriticalSlots).toEqual([]);
    const allocations = state.equipment.filter(
      (item) => item.category === EquipmentCategory.STRUCTURAL,
    );
    expect(allocations).toHaveLength(14);
    expect(allocations.reduce((mass, item) => mass + item.weight, 0)).toBe(0);
    for (const item of allocations) {
      expect(item).toMatchObject({
        name: marker,
        isRemovable: false,
        isOmniPodMounted: false,
        criticalSlots: 1,
      });
      const location = item.location!;
      const slots = buildLocationSlots(
        location,
        state.engineType,
        state.gyroType,
        state.equipment,
        state.armActuators,
        state.cockpitType,
      );
      const available = getAvailableSlotIndices(
        location,
        state.engineType,
        state.gyroType,
        state.equipment,
        state.armActuators,
        state.cockpitType,
      );
      expect(slots[item.slots![0]]).toMatchObject({
        type: 'equipment',
        name: marker,
      });
      expect(available).not.toContain(item.slots![0]);
    }
    const definition = getEquipmentLookupService().getById('medium-laser');
    if (!definition) throw new Error('Missing filler definition');
    const filler = { ...definition, id: 'slot-capacity-fixture', weight: 0 };
    const target = allocations[0];
    const updateEquipmentLocation = jest.fn();
    handleEquipmentDropAction({
      readOnly: false,
      equipment: [
        ...state.equipment,
        createMountedEquipment(filler, 'drop-control'),
      ],
      location: target.location!,
      slotIndex: target.slots![0],
      equipmentId: 'drop-control',
      getLocationData: (location) => {
        const slots = buildLocationSlots(
          location,
          state.engineType,
          state.gyroType,
          state.equipment,
          state.armActuators,
          state.cockpitType,
        );
        return {
          location,
          slots,
          entries: slotsToCritEntries(slots),
          isSuperheavy: false,
        };
      },
      unitIsSuperheavy: false,
      updateEquipmentLocation,
    });
    expect(updateEquipmentLocation).not.toHaveBeenCalled();
    const store = createUnitStore(state);
    for (const location of getLocationsForConfig(state.configuration)) {
      const capacity = getAvailableSlotIndices(
        location,
        state.engineType,
        state.gyroType,
        state.equipment,
        state.armActuators,
        state.cockpitType,
      ).length;
      for (let index = 0; index < capacity; index++)
        expect(
          store.getState().addEquipmentAtLocation(filler, location).success,
        ).toBe(true);
      const before = store.getState();
      expect(before.addEquipmentAtLocation(filler, location).success).toBe(
        false,
      );
      expect(store.getState()).toBe(before);
    }
    expect(
      getEquipmentSlotIssues(
        store.getState().equipment,
        state.configuration,
        state.engineType,
        state.gyroType,
        state.armActuators,
        state.cockpitType,
      ),
    ).toEqual([]);
  },
);

it.each(Object.keys(vocabulary.criticalSlotMarkers))(
  'keeps native %s identity, occupancy and zero equipment mass through two cold JSON round trips',
  (marker) => {
    const source = parseUnit({
      ...fixture('IS Ferro-Fibrous'),
      criticalSlots: { LEFT_TORSO: [marker] },
      equipment: [],
    });
    let state = loader.mapToUnitState(source, true);
    for (let round = 0; round <= 2; round++) {
      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0]).toMatchObject({
        name: marker,
        category: EquipmentCategory.STRUCTURAL,
        weight: 0,
        criticalSlots: 1,
        location: L.LEFT_TORSO,
        slots: [0],
        isRemovable: false,
        isOmniPodMounted: false,
      });
      expect(state.unrecoveredCriticalSlots).toEqual([]);
      if (round === 2) break;
      const saved = serializeCustomUnitState(state, {
        id: 'marker-round-trip',
        chassis: state.chassis,
        variant: state.model,
        era: Era.LATE_SUCCESSION_WARS,
      });
      expect(
        getCriticalSlotsForLocation(saved.criticalSlots, L.LEFT_TORSO)?.[0],
      ).toBe(marker);
      state = loader.mapToUnitState(
        parseUnit(JSON.parse(JSON.stringify(saved))),
        false,
      );
    }
  },
);

it('removes only the King Crab markers from the notice and retains both CASE cells', () => {
  const source = parseUnit(crab);
  const before = recognizeCriticalSlotEntries({
    criticalSlots: source.criticalSlots,
    equipment: [],
    unitTechBase: TechBase.INNER_SPHERE,
    unitTechBaseMode: TechBaseMode.INNER_SPHERE,
  });

  expect(
    before.missing.filter((cell) => cell.kind === 'armor-marker'),
  ).toHaveLength(14);
  const state = loader.mapToUnitState(source, true);
  expect(state.unrecoveredCriticalSlots).toEqual([
    { text: 'ISCASE', location: L.LEFT_TORSO, slot: 7 },
    { text: 'ISCASE', location: L.RIGHT_TORSO, slot: 5 },
  ]);
});

it('retains malformed marker placement diagnostics rather than creating allocations over systems or beyond a location', () => {
  const source = parseUnit({
    ...fixture('IS Endo Steel'),
    equipment: [],
    criticalSlots: {
      HEAD: ['IS Endo Steel', null, null, null, null, null, 'IS Endo Steel'],
    },
  });
  const state = loader.mapToUnitState(source, true);
  expect(state.equipment).toEqual([]);
  expect(state.unrecoveredCriticalSlots).toEqual([
    { text: 'IS Endo Steel', location: L.HEAD, slot: 0 },
    { text: 'IS Endo Steel', location: L.HEAD, slot: 6 },
  ]);
});

it('hydrates a listed native marker once and preserves explicit saved pod false', () => {
  const source = parseUnit({
    ...fixture('IS Endo Steel'),
    isOmni: true,
    equipment: [
      {
        id: 'IS Endo Steel',
        location: 'LEFT_TORSO',
        slots: [1],
        isOmniPodMounted: false,
      },
    ],
    criticalSlots: { LEFT_TORSO: [null, 'IS Endo Steel (OMNIPOD)'] },
  });
  const state = loader.mapToUnitState(source, true);
  expect(state.equipment).toHaveLength(1);
  expect(state.equipment[0]).toMatchObject({
    name: 'IS Endo Steel',
    category: EquipmentCategory.STRUCTURAL,
    criticalSlots: 1,
    slots: [1],
    isOmniPodMounted: false,
  });
  expect(state.unrecoveredCriticalSlots).toEqual([]);
});

it('binds listed but unplaced native markers before creating missing rows', () => {
  const source = parseUnit({
    ...fixture('IS Endo Steel'),
    equipment: [
      { id: 'IS Endo Steel', location: 'LEFT_TORSO' },
      { id: 'IS Endo Steel', location: 'LEFT_TORSO' },
    ],
    criticalSlots: { LEFT_TORSO: ['IS Endo Steel', 'IS Endo Steel'] },
  });
  const state = loader.mapToUnitState(source, true);
  expect(state.equipment).toHaveLength(2);
  expect(state.equipment.map((item) => item.slots)).toEqual([[0], [1]]);
  expect(state.unrecoveredCriticalSlots).toEqual([]);
});

it.each(Object.values(crewSaveLosses.units))(
  'pins the crew journey residual after marker recovery: $sourcePath',
  (unit) => {
    const source = parseUnit(
      JSON.parse(readFileSync(join(process.cwd(), unit.sourcePath), 'utf8')),
    );
    expect(
      loader.mapToUnitState(source, true).unrecoveredCriticalSlots,
    ).toEqual(unit.entries);
  },
);
