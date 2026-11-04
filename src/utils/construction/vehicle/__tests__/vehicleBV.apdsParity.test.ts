import { readFileSync } from 'fs';
import * as path from 'path';

import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import { calculateMountedDefensiveEquipmentBV } from '../../battleValueEquipment';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../../contractBVUnitAdapter';

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// AmmoType.java:12242-12254; BVCalculator.java:570-572,629-635.
describe('APDS defensive ammunition', () => {
  it('matches the unchanged Padilla source and pinned Java oracle', () => {
    const source: IContractBVSource = JSON.parse(
      readFileSync(
        path.join(
          process.cwd(),
          'public/data/units/vehicles/Padilla Anti-Missile Tank.json',
        ),
        'utf8',
      ),
    );
    const result = calculateBattleValueForUnit(contractUnitToBVUnit(source));
    if (result?.kind !== 'vehicle') throw new Error('Expected vehicle BV');
    expect(result.breakdown.defensiveEquipmentBV).toBe(233);
    expect(result.breakdown.defensive).toBeCloseTo(647.36, 10);
    expect(result.breakdown.offensive).toBe(507.5);
    expect(result.breakdown.final).toBe(1155);
  });

  it('caps duplicate APDS bins with the shared AMS/APDS weapon pool', () => {
    const bins = Array.from({ length: 5 }, () => ({ id: 'ISAPDS Ammo' }));
    expect(calculateMountedDefensiveEquipmentBV(bins)).toBe(0);
    expect(
      calculateMountedDefensiveEquipmentBV([{ id: 'ISAPDS' }, ...bins]),
    ).toBe(128);
    expect(calculateMountedDefensiveEquipmentBV([{ id: 'ams' }, ...bins])).toBe(
      64,
    );
  });
});
