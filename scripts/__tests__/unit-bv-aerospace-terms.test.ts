import { calculateRow } from '../vehicle-aero-bv-delta';
import fixture from './fixtures/vehicle_aero_contract_bv.json';

test.each([
  ['fighters/', 1.2],
  ['smallcraft/', 1],
  ['convfighter/', 1.1],
] as const)(
  '%s exposes its separate aircraft type stage',
  (prefix, typeModifier) => {
    const source = fixture.units.find((row) => row.path.startsWith(prefix));
    const row = calculateRow({ ...source, sha256: 'a'.repeat(64) });
    expect(row.reason).toBeUndefined();
    expect(row.figure?.terms).toMatchObject({
      typeModifier,
      weightBV: 0,
      offensiveTypeModifier: 1,
      summaryModifier: 1,
      adjustment: 0,
    });
  },
);
