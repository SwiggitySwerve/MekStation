import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IEquipmentItem } from '@/types/equipment';
import type { IVehicleMountedEquipment } from '@/types/unit/VehicleInterfaces';

import {
  mapVehicleTurretContext,
  serializeVehicleTurretContext,
} from '@/services/conversion/vehicleTurretContext';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { VehicleLocation as L } from '@/types/construction/UnitLocation';
import { RulesLevel, TechBase } from '@/types/enums';
import { EquipmentCategory as C } from '@/types/equipment/EquipmentCategory';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { computeVehicleMountedWeightFigures } from '../mountedWeight';
import { computeVehicleWeightBreakdown } from '../weightComposition';

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
const mechanism = 'vehicular-sponson-turret';
const item = (
  id: string,
  weight: number,
  category = C.MISC_EQUIPMENT,
): IEquipmentItem => ({
  id,
  name: id,
  weight,
  category,
  heat: 0,
  criticalSlots: 0,
  costCBills: 0,
  battleValue: 0,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  introductionYear: 3079,
});
const definitions = new Map([
  [mechanism, item(mechanism, 0)],
  ['weapon', item('weapon', 2.5, C.BALLISTIC_WEAPON)],
  ['misc', item('misc', 0.1)],
  ['hull', item('hull', 20)],
  ['ammo', item('ammo', 20, C.AMMUNITION)],
  ['single-heat-sink', item('single-heat-sink', 20)],
  ['reactive-armor', item('reactive-armor', 20)],
]);
const mount = (
  equipmentId: string,
  sponson = false,
  location = L.BODY,
): IVehicleMountedEquipment => ({
  id: equipmentId + location,
  name: equipmentId,
  equipmentId,
  location,
  isSponsonMounted: sponson,
  isRearMounted: false,
  isTurretMounted: false,
});
const base = createDefaultVehicleState({
  name: 'Sponson rule',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
});
const payload = [
  mount('weapon', true, L.LEFT),
  mount('weapon', true, L.RIGHT),
  mount('misc', true),
];
const figures = (count: number, options = {}) =>
  computeVehicleMountedWeightFigures(
    {
      ...base,
      ...options,
      equipment: [
        ...payload,
        ...Array.from({ length: count }, (_, i) => ({
          ...mount(mechanism),
          id: 'mechanism-' + i,
        })),
      ],
    },
    (id) => definitions.get(id),
  );

// MegaMek 48fcb2f64 MiscType.java:563-591: round the aggregate /10, then split.
it.each([1, 2, 3])(
  'charges the aggregate mechanism once with %s records',
  (count) => {
    expect(figures(count).equipment).toBeCloseTo(6.1, 12);
    expect(figures(count).turret).toBe(0);
  },
);
it('keeps a pair at half a ton when each share is a quarter ton', () => {
  const result = computeVehicleMountedWeightFigures(
    {
      ...base,
      equipment: [
        mount('weapon', true),
        mount(mechanism),
        { ...mount(mechanism), id: 'second' },
      ],
    },
    (id) => definitions.get(id),
  );
  expect(result.equipment).toBe(3);
});
it('uses kilogram component rounding for small support vehicles', () => {
  expect(
    figures(1, { tonnage: 2, unitType: UnitType.SUPPORT_VEHICLE }).equipment,
  ).toBeCloseTo(5.61, 12);
});
it('excludes ammo, heat sinks and armor from the sponson basis', () => {
  const excluded = ['ammo', 'single-heat-sink', 'reactive-armor'].map((id) =>
    mount(id, true),
  );
  const result = computeVehicleMountedWeightFigures(
    {
      ...base,
      equipment: [...payload, ...excluded, mount('hull'), mount(mechanism)],
    },
    (id) => definitions.get(id),
  );
  expect(result.equipment).toBeCloseTo(86.1, 12);
});
it.each([0, 0.75, 4])(
  'uses an assigned Omni chassis total of %s without re-rounding it',
  (allowance) => {
    expect(
      figures(2, { isOmni: true, baseChassisSponsonPintleWeight: allowance })
        .equipment,
    ).toBeCloseTo(5.1 + allowance, 12);
  },
);
it('ignores non-Omni assignments and falls back for negative Omni sentinels', () => {
  expect(
    figures(1, { baseChassisSponsonPintleWeight: NaN }).equipment,
  ).toBeCloseTo(6.1, 12);
  expect(
    figures(1, { isOmni: true, baseChassisSponsonPintleWeight: -1 }).equipment,
  ).toBeCloseTo(6.1, 12);
});
it('keeps nonfinite Omni assignments and unresolved sponson equipment unavailable', () => {
  const invalid = figures(1, {
    isOmni: true,
    baseChassisSponsonPintleWeight: Infinity,
  });
  expect(invalid.equipment).toBeNull();
  expect(invalid.issues.join('; ')).toMatch(/sponson/i);
  const unknown = computeVehicleMountedWeightFigures(
    { ...base, equipment: [mount('missing', true), mount(mechanism)] },
    (id) => definitions.get(id),
  );
  expect(unknown.equipment).toBeNull();
  expect(unknown.issues.join('; ')).toMatch(/sponson/i);
});
it('preserves the explicit Omni sponson allowance through the shared mapper and serializer', () => {
  const context = mapVehicleTurretContext(true, false, (tag) =>
    tag === 'baseChassisSponsonPintleWeight' ? 0.75 : undefined,
  );
  expect(context).toHaveProperty('baseChassisSponsonPintleWeight', 0.75);
  expect(serializeVehicleTurretContext(context)).toHaveProperty(
    'baseChassisSponsonPintleWeight',
    0.75,
  );
  expect(
    createDefaultVehicleState({
      name: 'Omni',
      tonnage: 50,
      techBase: TechBase.CLAN,
      ...context,
    }),
  ).toHaveProperty('baseChassisSponsonPintleWeight', 0.75);
});
it.each([
  ['Ballista Artillery Trailer', 99.5, 100],
  ['Condor Heavy Hover Tank (Fission)', 49, 49.5],
])('charges the native %s mechanism at Java mass', (name, without, java) => {
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', name + '.json'),
        'utf8',
      ),
    ),
  );
  const resolve = (id: string, isAmmo?: boolean) =>
    getEquipmentLookupService().getMountedById(id, isAmmo === true);
  const result = computeVehicleWeightBreakdown(state, resolve);
  const noMechanism = computeVehicleWeightBreakdown(
    {
      ...state,
      equipment: state.equipment.filter((m) => m.equipmentId !== mechanism),
    },
    resolve,
  );
  expect(state.tonnage - (noMechanism.remaining ?? NaN)).toBe(without);
  expect(state.tonnage - (result.remaining ?? NaN)).toBe(java);
});
