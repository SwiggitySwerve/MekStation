/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { computeTurretWeight, validateTurretWeight } from '../turret';

describe.each([TurretType.SINGLE, TurretType.DUAL, TurretType.CHIN])(
  '%s combat mechanism at default half-ton rounding',
  (type) => {
    // MegaMek 48fcb2f64a1b TestTank:178-226. The 7-ton chin result also
    // matches the original Java verifier on a synthetic PPC-equipped Ferret;
    // that invalid design establishes the mechanism term, not whole-unit parity.
    it.each([
      [0, 0],
      [1, 0.5],
      [2.5, 0.5],
      [5, 0.5],
      [5.0001, 1],
      [7, 1],
      [10, 1],
      [10.0001, 1.5],
    ])(
      '%s tons of qualifying equipment requires %s tons',
      (equipment, mass) => {
        expect(computeTurretWeight(type, equipment)).toBe(mass);
      },
    );
  },
);

it('rounds the two mechanisms separately before totaling them', () => {
  const primary = computeTurretWeight(TurretType.DUAL, 2.5);
  const secondary = computeTurretWeight(TurretType.SINGLE, 2.5);
  expect([primary, secondary, primary + secondary]).toEqual([0.5, 0.5, 1]);
});

it('accepts the independently observed chin mechanism mass', () => {
  expect(validateTurretWeight(TurretType.CHIN, 7, 1)).toEqual([]);
});

it('rejects the former half-weight chin mechanism result', () => {
  expect(validateTurretWeight(TurretType.CHIN, 7, 0.5)).toEqual([
    expect.objectContaining({ ruleId: 'VAL-VEHICLE-TURRET' }),
  ]);
});
