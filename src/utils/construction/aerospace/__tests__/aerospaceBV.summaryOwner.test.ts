import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

import { calculateAerospaceBV } from '../aerospaceBV';
import { calculateAerospaceFinalBV } from '../aerospaceBVCalculations';
import { aerospaceBVTerms } from '../bvTrace';
import { calculateDropShipFinalBV } from '../dropShipComplete';

const breakdown = () =>
  calculateAerospaceBV({
    subType: AerospaceSubType.AEROSPACE_FIGHTER,
    tonnage: 20,
    structuralIntegrity: 1,
    safeThrust: 0,
    maxThrust: 0,
    totalArmorPoints: 400,
    armorType: 'standard',
    equipment: [],
  });

// Java 48fcb2f64: BVCalculator.java:1252-1294,1307-1313;
// AeroBVCalculator.java:162-180. Shared owner preserves the old formula.
const cases: [
  { cockpit?: string; hasDroneOperatingSystem?: boolean },
  number,
][] = [
  [{ cockpit: 'SMALL' }, 0.95],
  [{ cockpit: 'COMMAND_CONSOLE' }, 0.95],
  [{ hasDroneOperatingSystem: true }, 0.9025],
];
it.each(cases)(
  'exports the existing summary through the pure shared owner: %j',
  (options, factor) => {
    const result = calculateAerospaceFinalBV(1000, 0, options);
    expect(result).toEqual(calculateDropShipFinalBV(1000, 0, options));
    expect(result.summaryModifier).toBeCloseTo(factor, 12);
    expect(result.final).toBe(Math.round(1000 * factor));
    const b = breakdown();
    const actual = calculateAerospaceFinalBV(b.defensive, b.offensive, options);
    const trace = aerospaceBVTerms({ ...b, final: actual.final }, actual);
    expect(trace.summaryModifier).toBeCloseTo(factor, 12);
    expect(trace.adjustment).toBe(0);
  },
);

it('preserves default trace compatibility when actual summary is omitted', () => {
  const result = breakdown();
  expect(aerospaceBVTerms(result)).toEqual(result);
  expect(result.final).toBe(1202);
});
