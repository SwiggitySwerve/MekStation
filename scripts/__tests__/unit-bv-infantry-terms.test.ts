import { gameUnitSchema } from '../../src/lib/events/replay/CombatLifecycleSharedSchemas';
import personnel from '../../src/services/units/handlers/__tests__/fixtures/personnel-validity.json';
import { INFANTRY_BV_TRACE_FIELDS } from '../../src/types/unit/BVBreakdownTypes';
import { baseInput } from '../../src/utils/construction/infantry/__tests__/infantryBV.test.helpers';
import { calculateInfantryBV } from '../../src/utils/construction/infantry/infantryBV';
import { aggregateDelta } from '../unit-bv-parity';
import { calculateRow } from '../vehicle-aero-bv-delta';

test('infantry exposes pre-movement structure and specialization stages', () => {
  const breakdown = calculateInfantryBV(baseInput());
  expect(breakdown).toMatchObject({
    structureBV: 42,
    defensiveFactor: 1,
    summaryModifier: 1,
  });
  expect(breakdown).not.toHaveProperty('weaponBV');
});

test('strict replay accepts optional trace fields and old payloads but rejects invalid diagnostics', () => {
  const schema = gameUnitSchema.shape.infantryInit
    .unwrap()
    .shape.bvBreakdown.unwrap();
  const breakdown = calculateInfantryBV(baseInput());
  expect(schema.safeParse(breakdown).success).toBe(true);
  expect(schema.safeParse({ ...breakdown, structureBV: NaN }).success).toBe(
    false,
  );
  expect(schema.safeParse({ ...breakdown, unknownTraceField: 1 }).success).toBe(
    false,
  );
  const legacy = { ...breakdown };
  for (const field of INFANTRY_BV_TRACE_FIELDS) delete legacy[field];
  expect(schema.safeParse(legacy).success).toBe(true);
});

test.each(
  personnel.rows.filter((row) => row.path.startsWith('infantry/') && row.valid),
)(
  'source infantry trace reconstructs offense before speed: $path',
  (source) => {
    const row = calculateRow({
      ...source,
      unit: null,
      sourceText: source.content,
    });
    expect(row.reason).toBeUndefined();
    const { weaponBV, ammoBV, speedFactor } = row.figure?.terms ?? {};
    if (
      typeof weaponBV !== 'number' ||
      typeof ammoBV !== 'number' ||
      typeof speedFactor !== 'number' ||
      row.figure?.offensive === undefined
    )
      throw new Error('Missing infantry offensive stages');
    expect(
      aggregateDelta(row.figure.offensive, (weaponBV + ammoBV) * speedFactor)
        .withinTolerance,
    ).toBe(true);
  },
);
