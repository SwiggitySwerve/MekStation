import type { VehicleStore } from '@/stores/vehicleState';
import type { ITurretConfiguration } from '@/types/unit/VehicleInterfaces';

import { createVehicleStore } from '@/stores/useVehicleStore';
import * as actions from '@/stores/useVehicleStore.actions';
/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { Era } from '@/types/temporal/Era';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { getSecondaryVehicleTurretConfiguration } from '@/utils/construction/vehicle/equipmentMounts';
import { serializeCustomVehicleState } from '@/utils/serialization/CustomUnitSerializer';

import { mapToVehicleState, vehicleEditorSchema } from '../vehicleMapping';
import fixtures from './fixtures/vehicles.pinned.json';

const base = () =>
  mapToVehicleState(
    fixtures.rows.find((row) => row.kind === 'dual turret')!.definition,
  );
const config = { type: TurretType.SINGLE, rotationArc: 360 };

it('saves and reopens independent turret configuration without cached weight', () => {
  const state = {
    ...base(),
    turret: { ...config },
    secondaryTurret: { ...config },
  };
  const saved = serializeCustomVehicleState(state, {
    id: 'weightless-turret',
    chassis: state.chassis,
    variant: state.model,
    era: Era.DARK_AGE,
  });
  expect(saved.vehicleEditor.turret).toEqual(config);
  expect(saved.vehicleEditor.secondaryTurret).toEqual(config);
  const reopened = mapToVehicleState(saved);
  expect(reopened.turret).toEqual(config);
  expect(reopened.secondaryTurret).toEqual(config);
  expect(reopened.baseChassisTurretWeight).toBe(state.baseChassisTurretWeight);
  expect(reopened.baseChassisSecondaryTurretWeight).toBe(
    state.baseChassisSecondaryTurretWeight,
  );
});

it('continues accepting valid saved legacy turret objects', () => {
  const state = base();
  const editor = {
    ...state,
    mounts: [],
    turret: { ...config, currentWeight: 42 },
    secondaryTurret: null,
  };
  expect(vehicleEditorSchema.safeParse(editor).success).toBe(true);
});

it.each([
  { ...config, type: 'invalid' },
  { ...config, rotationArc: -1 },
])('keeps invalid live configuration rejected', (turret) => {
  expect(
    vehicleEditorSchema.safeParse({
      ...base(),
      mounts: [],
      turret,
      secondaryTurret: null,
    }).success,
  ).toBe(false);
});

it('retires cached mass and its setter from the public store and action module', () => {
  const store = createVehicleStore(base());
  store.getState().setTurretType(TurretType.SINGLE);
  store.getState().setHasSecondaryTurret(true);
  expect(store.getState()).not.toHaveProperty('setTurretWeight');
  expect(actions).not.toHaveProperty('setTurretWeightLogic');
  expect(store.getState().turret).not.toHaveProperty('currentWeight');
  expect(store.getState().secondaryTurret).not.toHaveProperty('currentWeight');
  // Both declarations are public contracts checked by the root compiler gate.
  const exposesCachedMass: 'currentWeight' extends keyof ITurretConfiguration
    ? true
    : false = false;
  const exposesSetter: 'setTurretWeight' extends keyof VehicleStore
    ? true
    : false = false;
  expect(exposesCachedMass || exposesSetter).toBe(false);
});

it.each([0, 42, -1, 'stale', NaN])(
  'ignores legacy saved currentWeight %s while keeping live turret facts',
  (legacy) => {
    const state = base();
    const saved = serializeCustomVehicleState(state, {
      id: 'legacy-weight',
      chassis: state.chassis,
      variant: state.model,
      era: Era.DARK_AGE,
    });
    const reopened = mapToVehicleState({
      ...saved,
      vehicleEditor: {
        ...saved.vehicleEditor,
        turret: { ...config, currentWeight: legacy },
        secondaryTurret: { ...config, currentWeight: legacy },
      },
    });
    expect(reopened.turret).toEqual(config);
    expect(reopened.secondaryTurret).toEqual(config);
  },
);

it('projects only live configuration facts when editing legacy turret objects', () => {
  const legacy = { ...config, rotationArc: 180, currentWeight: 42 };
  const store = createVehicleStore({
    ...base(),
    turret: legacy,
    secondaryTurret: legacy,
  });
  store.getState().setTurretType(TurretType.DUAL);
  store.getState().setSecondaryTurretType(TurretType.SINGLE);
  expect(store.getState().turret).toEqual({
    type: TurretType.DUAL,
    rotationArc: 180,
  });
  expect(store.getState().secondaryTurret).toEqual({
    type: TurretType.SINGLE,
    rotationArc: 180,
  });
});

it('projects only live facts into a separate imported secondary configuration', () => {
  const legacy = { ...config, currentWeight: 42 };
  expect(
    getSecondaryVehicleTurretConfiguration(legacy, { 'Turret 2': 0 }),
  ).toEqual(config);
});
