import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { VTOLUnitHandler } from '@/services/units/handlers/VTOLUnitHandler';

import { createVehicleSession } from '../createVehicleSession';
import {
  mapToVehicleState,
  normalizeVehicleConfiguration,
} from '../vehicleMapping';
import fixtures from './fixtures/vehicles.pinned.json';

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

it.each(fixtures.rows.filter((row) => !['NONE', 'STEAM'].includes(row.kind)))(
  'agrees with the BLK handler mount flags for pinned $kind',
  (row) => {
    const parsed = new BlkParserService().parse(row.content);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const doc = parsed.data.document;
    const handler =
      doc.mappedUnitType === 'VTOL'
        ? new VTOLUnitHandler()
        : doc.mappedUnitType === 'Support Vehicle'
          ? new SupportVehicleUnitHandler()
          : new VehicleUnitHandler();
    const result = handler.parse(doc);
    if (!result.success) throw new Error(JSON.stringify(result.error));
    const project = (
      equipment: ReturnType<typeof mapToVehicleState>['equipment'],
    ) =>
      equipment
        .map((item) =>
          JSON.stringify([
            item.location,
            item.isRearMounted,
            item.isTurretMounted,
            item.isSponsonMounted,
            item.isChinTurretMounted ?? false,
            item.isPintleTurretMounted ?? false,
            item.isOmniPodMounted ?? false,
          ]),
        )
        .sort();
    expect(project(mapToVehicleState(row.definition).equipment)).toEqual(
      project(result.data.unit.equipment),
    );
  },
);

const definition = (kind: string) => {
  const row = fixtures.rows.find((row) => row.kind === kind);
  if (!row) throw new Error(kind);
  return row.definition;
};

it.each([
  ['Medium Laser (ST):OMNI', 'isSponsonMounted'],
  ['Medium Laser (PT):OMNI', 'isPintleTurretMounted'],
  ['(R) Medium Laser:OMNI', 'isRearMounted'],
] as const)('shares native mount-token resolution for %s', (id, flag) => {
  const state = mapToVehicleState({
    ...definition('Tank'),
    equipment: [{ id, location: 'FRONT' }],
  });
  expect(state.equipment[0]).toMatchObject({
    equipmentId: 'medium-laser',
    isOmniPodMounted: true,
    [flag]: true,
  });
});

it('hydrates tank identities, ammunition, dual turrets and source mount markers', () => {
  const state = mapToVehicleState({
    ...definition('dual turret'),
    equipment: [
      { id: 'medium-laser', location: 'FRONT' },
      { id: 'r-medium-laser', name: '(R) Medium Laser', location: 'REAR' },
      { id: 'medium-laser-st', name: 'Medium Laser (ST)', location: 'LEFT' },
      { id: 'medium-laser-pt', name: 'Medium Laser (PT)', location: 'RIGHT' },
      { id: 'is-ammo-mg-full', location: 'BODY', linkedAmmo: 'bin' },
      { id: 'medium-laser', location: 'TURRET' },
      { id: 'medium-laser', location: 'TURRET_2' },
    ],
  });
  expect(state.equipment.map((item) => item.location)).toEqual([
    'Front',
    'Rear',
    'Left',
    'Right',
    'Body',
    'Turret',
    'Turret 2',
  ]);
  expect(state.equipment[0]).toMatchObject({
    equipmentId: 'medium-laser',
    name: 'Medium Laser',
  });
  expect(state.equipment[1].isRearMounted).toBe(true);
  expect(state.equipment[2].isSponsonMounted).toBe(true);
  expect(state.equipment[3]).toMatchObject({
    equipmentId: 'medium-laser',
    isPintleTurretMounted: true,
  });
  expect(state.equipment[4]).toMatchObject({
    equipmentId: 'ammo-mg-full',
    linkedAmmoId: 'bin',
  });
  expect(
    state.equipment
      .slice(5)
      .every((item) => item.isTurretMounted && !item.isRearMounted),
  ).toBe(true);
});

it('preserves VTOL chin and rotor mounts', () => {
  const state = mapToVehicleState({
    ...definition('VTOL chin'),
    equipment: [
      { id: 'medium-laser', location: 'TURRET' },
      { id: 'missing-rotor-part', location: 'ROTOR' },
    ],
  });
  expect(state.equipment[0]).toMatchObject({
    location: 'Turret',
    isTurretMounted: true,
    isChinTurretMounted: true,
  });
  expect(state.equipment[1]).toMatchObject({
    location: 'Rotor',
    isTurretMounted: false,
  });
});

it('keeps all six SuperHeavy hull sides distinct', () => {
  const locations = [
    'FRONT',
    'FRONT_RIGHT',
    'FRONT_LEFT',
    'REAR_RIGHT',
    'REAR_LEFT',
    'REAR',
  ];
  const state = mapToVehicleState({
    ...definition('SuperHeavy'),
    equipment: locations.map((location) => ({ id: 'medium-laser', location })),
  });
  expect(state.equipment.map((item) => item.location)).toEqual([
    'Front',
    'Front Right',
    'Front Left',
    'Rear Right',
    'Rear Left',
    'Rear',
  ]);
});

it('maps Omni tank fixed and pod equipment independently of chassis identity', () => {
  const state = mapToVehicleState({
    ...definition('Tank'),
    isOmni: true,
    equipment: [
      {
        id: 'medium-laser:omni',
        name: 'Medium Laser:OMNI',
        location: 'TURRET',
      },
      { id: 'medium-laser', location: 'FRONT', isOmniPodMounted: true },
      { id: 'medium-laser', location: 'BODY' },
    ],
  });
  expect(state.isOmni).toBe(true);
  expect(state.equipment.map((item) => item.isOmniPodMounted)).toEqual([
    true,
    true,
    false,
  ]);
  expect(
    state.equipment.every((item) => item.equipmentId === 'medium-laser'),
  ).toBe(true);
});

it('retains unresolved support equipment with its source identity and typed warning', () => {
  const state = mapToVehicleState({
    ...definition('SupportTank'),
    equipment: [
      {
        id: 'missing-support-tool',
        name: 'Unknown tool(PT):OMNI:SIZE:1.0',
        location: 'BODY',
      },
    ],
  });
  expect(state.equipment).toHaveLength(1);
  expect(state.equipment[0]).toMatchObject({
    equipmentId: 'missing-support-tool',
    name: 'Unknown tool(PT):OMNI:SIZE:1.0',
    location: 'Body',
    isOmniPodMounted: true,
    isPintleTurretMounted: true,
    resolutionWarning: {
      code: 'unresolved-equipment',
      sourceId: 'missing-support-tool',
    },
  });
});

it('normalizes deterministically and gives each session independent mount identities', () => {
  const source = {
    ...definition('Tank'),
    equipment: [{ id: 'medium-laser', location: 'FRONT' }],
  };
  const configuration = normalizeVehicleConfiguration(source);
  expect(configuration).toEqual(normalizeVehicleConfiguration(source));
  const one = createVehicleSession(configuration, { id: 'one', createdAt: 1 });
  const two = createVehicleSession(configuration, { id: 'two', createdAt: 2 });
  expect(one.equipment[0]).not.toBe(two.equipment[0]);
  expect(one.equipment[0].id).not.toBe(two.equipment[0].id);
  expect(() =>
    mapToVehicleState({
      ...source,
      equipment: [{ id: 'medium-laser', location: 'INVALID' }],
    }),
  ).toThrow('Unknown');
});
