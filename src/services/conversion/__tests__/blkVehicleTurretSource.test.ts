import { BlkParserService } from '@/services/conversion/BlkParserService';
import { projectCombatVehicleTurretSource } from '@/services/conversion/blkVehicleTurretSource';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

const parsed = (tags = '', family = 'Tank') => {
  const result = new BlkParserService().parse(
    `<UnitType>${family}</UnitType><Name>Allowance source</Name><year>3050</year><type>IS Level 2</type><tonnage>60</tonnage><motion_type>${family === 'VTOL' ? 'VTOL' : 'Tracked'}</motion_type><cruiseMP>4</cruiseMP><armor>0\n0\n0\n0${family === 'VTOL' ? '\n0' : ''}</armor>${tags}`,
  );
  if (!result.success) throw new Error(JSON.stringify(result.error));
  return result.data.document;
};

it.each(['', 'false', '0'])(
  'uses mixed-case Omni presence with payload %s',
  (payload) => {
    const doc = parsed(
      `<OmNi>${payload}</OmNi><BASECHASSISTURRETWEIGHT>0.5</BASECHASSISTURRETWEIGHT><baseChassisTurret2Weight>0</baseChassisTurret2Weight>`,
    );
    expect(projectCombatVehicleTurretSource(doc)).toMatchObject({
      success: true,
      document: doc,
      facts: {
        isOmni: true,
        baseChassisTurretWeight: 0.5,
        baseChassisSecondaryTurretWeight: 0,
      },
    });
  },
);
it('keeps absence independent of legacy capacity and mounted-weight fields', () => {
  const doc = parsed(
    '<maxWeight>99</maxWeight><currentWeight>42</currentWeight>',
  );
  const result = projectCombatVehicleTurretSource(doc);
  if (!result.success) throw new Error(result.errors.join('; '));
  expect(result.facts).toEqual({
    isOmni: false,
    baseChassisTurretWeight: undefined,
    baseChassisSecondaryTurretWeight: undefined,
  });
});
it.each([
  ['0', 0],
  ['-1', -1],
  ['.125', 0.125],
  ['+2.5', 2.5],
  ['1.25e2', 125],
  ['2.5\n3.5', 2.5],
] as const)('preserves raw decimal %s exactly', (raw, expected) => {
  const doc = parsed(
    `<baseChassisTurretWeight>${raw}</baseChassisTurretWeight>`,
  );
  const result = projectCombatVehicleTurretSource(doc);
  if (!result.success) throw new Error(result.errors.join('; '));
  expect(result.facts.baseChassisTurretWeight).toBe(expected);
  expect(result.facts.isOmni).toBe(false);
  expect(result.document).toBe(doc);
});
it.each([
  '',
  'NaN',
  'Infinity',
  '-Infinity',
  '1e999',
  '4junk',
  '0x10',
  '2\nbad',
  '2\n\n3',
])('rejects malformed primary allowance %s without mutating input', (raw) => {
  const doc = parsed(
    `<baseChassisTurretWeight>${raw}</baseChassisTurretWeight>`,
  );
  const before = JSON.stringify(doc);
  const result = projectCombatVehicleTurretSource(doc);
  expect(result.success).toBe(false);
  if (result.success) throw new Error('malformed allowance accepted');
  expect(result.errors.join('; ')).toMatch(/strict finite decimal.*Java/i);
  expect(result.document).toBe(doc);
  expect(JSON.stringify(doc)).toBe(before);
});
it('rejects duplicate case variants of a consumed scalar', () => {
  const result = projectCombatVehicleTurretSource(
    parsed(
      '<baseChassisTurretWeight>1</baseChassisTurretWeight><BASECHASSISTURRETWEIGHT>2</BASECHASSISTURRETWEIGHT>',
    ),
  );
  expect(result.success).toBe(false);
  if (result.success) throw new Error('ambiguous scalar accepted');
  expect(result.errors.join('; ')).toMatch(
    /ambiguous.*baseChassisTurretWeight.*strict finite decimal.*Java/i,
  );
});
it('validates Tank secondary values, but ignores an unusable VTOL secondary tag', () => {
  const tags =
    '<baseChassisTurretWeight>0.5</baseChassisTurretWeight><baseChassisTurret2Weight>bad</baseChassisTurret2Weight>';
  expect(projectCombatVehicleTurretSource(parsed(tags)).success).toBe(false);
  const doc = parsed(tags, 'VTOL');
  const result = projectCombatVehicleTurretSource(doc);
  expect(result).toMatchObject({
    success: true,
    facts: {
      baseChassisTurretWeight: 0.5,
      baseChassisSecondaryTurretWeight: undefined,
    },
  });
  expect(result.warnings.join('; ')).toMatch(/VTOL ignores/);
  expect(result.document.rawTags.baseChassisTurret2Weight).toBe('bad');
});
it('diagnoses unsupported families without changing current normalization', () => {
  const doc = parsed('', 'SupportTank');
  const result = projectCombatVehicleTurretSource(doc);
  expect(result.success).toBe(false);
  expect(result.document).toBe(doc);
});

it('uses established family normalization without rebuilding superheavy geometry', () => {
  const doc = {
    ...parsed('<baseChassisTurretWeight>0</baseChassisTurretWeight>'),
    unitType: 'Surface',
    mappedUnitType: UnitType.VEHICLE,
    tonnage: 500,
    motionType: 'Naval',
    armor: [0, 0, 0, 0, 0, 0, 0, 0],
  };
  expect(projectCombatVehicleTurretSource(doc)).toMatchObject({
    success: true,
    facts: { baseChassisTurretWeight: 0 },
  });
});

it('rejects an explicitly present empty allowance array', () => {
  const base = parsed();
  const doc = {
    ...base,
    rawTags: { ...base.rawTags, baseChassisTurretWeight: [] },
  };
  const result = projectCombatVehicleTurretSource(doc);
  expect(result.success).toBe(false);
  expect(result.document).toBe(doc);
});
