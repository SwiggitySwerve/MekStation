import { buildLocationSlots } from '@/components/customizer/tabs/CriticalSlotsTab.slotBuilders';
import { buildPreviewUnitConfig } from '@/components/customizer/tabs/PreviewTab.builders';
import { extractCriticals } from '@/services/printing/recordsheet/dataExtractors';
import { createUnitStore } from '@/stores/unit/useUnitStore';
import { MechLocation } from '@/types/construction';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { Era } from '@/types/temporal/Era';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { createHeatSinkEquipmentList } from '@/utils/equipment/heatSinkEquipmentUtils';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import warhammer from '../../../../../public/data/units/battlemechs/1-age-of-war/standard/Warhammer WHM-6R.json';
import { createUnitSession } from '../createUnitSession';
import { normalizeUnitConfiguration } from '../normalizeUnitConfiguration';
import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

function loadedWarhammer() {
  const sinks = createHeatSinkEquipmentList(HeatSinkType.SINGLE, 2).map(
    (sink, index) => ({
      ...sink,
      location: index === 0 ? MechLocation.LEFT_ARM : MechLocation.RIGHT_ARM,
      slots: [3],
    }),
  );
  return createUnitSession(
    normalizeUnitConfiguration(parseUnit(warhammer), sinks),
    {
      id: 'warhammer-actuator-regression',
      createdAt: 1,
    },
  );
}

beforeEach(() => localStorage.clear());

it('loads the canonical Warhammer arm heat sinks without inventing hand actuators', () => {
  expect(warhammer.criticalSlots.LEFT_ARM[3]).toBe('Heat Sink');
  expect(warhammer.criticalSlots.RIGHT_ARM[3]).toBe('Heat Sink');
  const state = loadedWarhammer();
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
    ),
  ).toEqual([]);
  for (const location of [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM]) {
    expect(
      buildLocationSlots(
        location,
        state.engineType,
        state.gyroType,
        state.equipment,
        state.armActuators,
      )[3],
    ).toMatchObject({ type: 'equipment', name: 'Single Heat Sink' });
  }
});

it('still rejects a heat sink overlapping an installed hand actuator', () => {
  const state = loadedWarhammer();
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: expect.stringContaining('overlaps a fixed system'),
      }),
    ]),
  );
});

it('keeps omitted hands and exact heat-sink slots through library serialization and browser draft reload', () => {
  const state = loadedWarhammer();
  const saved = serializeCustomUnitState(state, {
    id: 'custom-warhammer-actuators',
    chassis: 'Warhammer',
    variant: 'Regression',
    era: Era.AGE_OF_WAR,
  });
  const loaded = new UnitLoaderService().mapToUnitState(
    parseUnit(JSON.parse(JSON.stringify(saved))),
    false,
  );
  expect(loaded.armActuators).toEqual(state.armActuators);
  expect(
    loaded.equipment.map(({ equipmentId, location, slots }) => ({
      equipmentId,
      location,
      slots,
    })),
  ).toEqual(
    state.equipment.map(({ equipmentId, location, slots }) => ({
      equipmentId,
      location,
      slots,
    })),
  );
  expect(saved.criticalSlots?.[MechLocation.LEFT_ARM]?.[3]).toBe(
    'Single Heat Sink',
  );
  expect(
    getEquipmentSlotIssues(
      loaded.equipment,
      loaded.configuration,
      loaded.engineType,
      loaded.gyroType,
      loaded.armActuators,
    ),
  ).toEqual([]);
  const store = createUnitStore(state);
  store.setState({ name: 'Browser persisted Warhammer' });
  const persisted = JSON.parse(
    localStorage.getItem(`megamek-unit-${state.id}`) ?? '{}',
  );
  expect(persisted.state.armActuators).toEqual(state.armActuators);
});

it('extracts the final record-sheet table from the saved and reloaded missing-hand design', () => {
  const state = loadedWarhammer();
  const saved = serializeCustomUnitState(state, {
    id: 'custom-print-warhammer',
    chassis: 'Warhammer',
    variant: 'Print',
    era: Era.AGE_OF_WAR,
  });
  const reloaded = new UnitLoaderService().mapToUnitState(
    parseUnit(saved),
    false,
  );
  const config = buildPreviewUnitConfig(reloaded, 4, 6, 1334, 0);
  const rows = extractCriticals(config);
  for (const location of [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM]) {
    expect(
      rows.find((row) => row.location === location)?.slots[3],
    ).toMatchObject({ content: 'Single Heat Sink', isSystem: false });
  }
  const legacy = extractCriticals({ ...config, criticalSlots: {} });
  expect(
    legacy.find((row) => row.location === MechLocation.LEFT_ARM)?.slots[3],
  ).toMatchObject({ content: 'Hand Actuator', isSystem: true });
});

it('does not create arm critical grids for a non-arm configuration', () => {
  const saved = serializeCustomUnitState(
    {
      ...loadedWarhammer(),
      configuration: MechConfiguration.QUAD,
      equipment: [],
    },
    {
      id: 'custom-quad',
      chassis: 'Quad',
      variant: 'Test',
      era: Era.AGE_OF_WAR,
    },
  );
  expect(saved.criticalSlots?.[MechLocation.LEFT_ARM]).toBeUndefined();
  expect(saved.criticalSlots?.[MechLocation.RIGHT_ARM]).toBeUndefined();
});
