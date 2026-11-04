import sources from '../../src/utils/construction/protomech/__tests__/fixtures/bv-residual-sources.json';
import { calculateRow } from '../vehicle-aero-bv-delta';

test('ProtoMech trace maps the owned no-op stages without altering the total', () => {
  for (const source of sources) {
    const row = calculateRow({
      path: source.path.replace('data/mekfiles/', ''),
      sha256: source.sha256,
      unit: null,
      sourceText: source.content,
    });
    expect(row.reason).toBeUndefined();
    expect(row.figure?.terms).toMatchObject({
      typeModifier: 1,
      offensiveTypeModifier: 1,
      summaryModifier: 1,
      adjustment: 0,
      weightBV: 0,
    });
    expect(row.figure?.terms?.weightBV).toBe(
      row.figure?.terms?.physicalWeaponBV,
    );
    expect(row.figure?.total).toBe(row.figure?.terms?.final);
    expect(row.figure?.terms?.['weapon.unknown']).toBeUndefined();
  }
});
