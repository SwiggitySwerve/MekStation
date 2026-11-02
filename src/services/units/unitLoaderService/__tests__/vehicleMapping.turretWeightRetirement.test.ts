/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { Era } from '@/types/temporal/Era';
import { TurretType } from '@/types/unit/VehicleInterfaces';
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
