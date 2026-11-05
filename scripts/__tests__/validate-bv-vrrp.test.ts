import { execFileSync } from 'node:child_process';
import path from 'node:path';

import type { UnitData } from '../validate-bv-types';

import { UnitContract } from '../../src/types/contracts/generated/unit.zod';
import { getCockpitModifier } from '../../src/utils/construction/battleValueTotals';
import { calculateUnitBV } from '../validate-bv-calculator';
import { mapCockpitType } from '../validate-bv-unit-derived';

// MekBVCalculator.java:469-473 (48fcb2f64): VRRP summary multiplier is 1.4.
it.each(['VRRP', 'Virtual Reality Piloting Pod'])(
  'preserves the native summary modifier for %s',
  (cockpit) => {
    expect(getCockpitModifier(mapCockpitType(cockpit))).toBe(1.4);
    const unit: UnitData = {
      id: 'vrrp',
      chassis: 'Test',
      model: 'VRRP',
      unitType: 'BattleMech',
      configuration: 'Biped',
      techBase: 'INNER_SPHERE',
      tonnage: 50,
      engine: { type: 'FUSION', rating: 200 },
      gyro: { type: 'STANDARD' },
      cockpit: 'STANDARD',
      structure: { type: 'STANDARD' },
      armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
      heatSinks: { type: 'SINGLE', count: 10 },
      movement: { walk: 4, jump: 0 },
      equipment: [],
    };
    const before = calculateUnitBV(unit).breakdown!;
    const after = calculateUnitBV({ ...unit, cockpit });
    expect(after.breakdown?.defensiveBV).toBe(before.defensiveBV);
    expect(after.breakdown?.offensiveBV).toBe(before.offensiveBV);
    expect(after.bv).toBe(
      Math.round((before.defensiveBV + before.offensiveBV) * 1.4),
    );
  },
);

it.each([
  ['STANDARD', 1],
  ['INTERFACE', 1.3],
  ['SMALL', 0.95],
] as const)('retains %s cockpit BV', (name, expected) =>
  expect(getCockpitModifier(mapCockpitType(name))).toBe(expected),
);

it('retains VRRP through source conversion and the generated unit contract', () => {
  const code = [
    'import json,sys',
    'sys.path.insert(0,"scripts/megameklab-conversion")',
    'from mtf_converter import MTFParser,dataclass_to_dict',
    'unit=dataclass_to_dict(MTFParser()._parse_lines(["chassis:Wildfire","model:Test","cockpit:Virtual Reality Piloting Pod"],"source.mtf"))',
    'print(json.dumps(unit["cockpit"]))',
  ].join('\n');
  const cockpit: unknown = JSON.parse(
    execFileSync('python', ['-B', '-c', code], {
      cwd: path.resolve(__dirname, '../..'),
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    }),
  );
  expect(cockpit).toBe('VRRP');
  expect(UnitContract.options[0].shape.cockpit.parse(cockpit)).toBe('VRRP');
});
