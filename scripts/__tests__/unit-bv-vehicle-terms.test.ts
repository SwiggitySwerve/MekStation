import { calculateRow } from '../vehicle-aero-bv-delta';
import fixture from './fixtures/vehicle_aero_contract_bv.json';

test('vehicle adapter exposes type, penalty and weight without folding them into TMM', () => {
  const source = fixture.units[0];
  const row = calculateRow({ ...source, sha256: 'a'.repeat(64) });
  expect(row.reason).toBeUndefined();
  expect(row.figure?.terms).toMatchObject({
    typeModifier: 0.7,
    explosivePenalty: 0,
    weightBV: 10,
    offensiveTypeModifier: 1,
    adjustment: 0,
  });
});
