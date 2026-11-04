import { readFileSync } from 'fs';
import { join } from 'path';

import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';

import { calculateUnitBV } from '../bvAdapter';

describe('unsupported runtime BV types', () => {
  // MegaMek 48fcb2f64 BVCalculator.java:103-139 requires a recognized entity family.
  it('rejects the unindexed flat legacy BA shape instead of returning zero', () => {
    const legacy: unknown = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/battlearmor/clan-sylph-sqd5.json',
        ),
        'utf8',
      ),
    );
    expect(() => calculateUnitBV(legacy)).toThrow(
      /Unsupported BV unitType.*BATTLEARMOR/,
    );
  });
  it('names an unknown type explicitly', () => {
    expect(() =>
      calculateUnitBV({ unitType: 'FutureUnitType', bv: 155 }),
    ).toThrow('Unsupported BV unitType: FutureUnitType');
  });
  it('keeps a recognized native BA contract on its family owner', () => {
    const unit = getNodeCanonicalUnitService().getByIdSync(
      'battlearmor:achileus-light-battle-armor-wobsqd4',
    );
    expect(calculateUnitBV(unit)).toBe(150);
  });
});
