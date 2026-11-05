import type { UnitData } from '../validate-bv-types';

import {
  getDefensiveEquipmentKind,
  isMechDefensiveEquipment,
} from '../../src/utils/construction/battleValueEquipment';
import { calculateUnitBV } from '../../src/utils/construction/mechBV/calculator';
import { scanCrits } from '../validate-bv-crit-scan';
import hachiwara from './fixtures/hachiwara-mpod.pinned.json';

// MegaMek 48fcb2f64: BVCalculator.java:522-526,936-946 puts M-Pods in
// defense, not weapon BV. EquipmentType.java:448-460 and
// CoreRulesExplosions.java:241-247 exclude their explosion deduction.
describe('construction M-Pod defensive role and explosion eligibility', () => {
  it.each([
    ['CLAN', 'not-a-legacy-unit', 0],
    ['INNER_SPHERE', 'alpha-wolf-a', 7],
  ] as const)(
    'uses explicit %s chassis CASE before legacy names',
    (chassis, id, penalty) => {
      const unit = {
        ...hachiwara,
        techBase: 'MIXED',
        componentTechBases: { chassis },
        engine: { type: 'FUSION', rating: 200 },
        equipment: [],
        criticalSlots: { LEFT_ARM: Array<string>(7).fill('ISGaussRifle') },
      };
      expect(calculateUnitBV(unit, id).breakdown?.totalExplosivePenalty).toBe(
        penalty,
      );
    },
  );

  it.each(['M-Pod', 'ISMPod', 'm-pod'])(
    'keeps raw %s consistent with the canonical defensive role',
    (id) => {
      expect(getDefensiveEquipmentKind(id)).toBe('equipment');
      expect(isMechDefensiveEquipment(id)).toBe(true);
      const unit: UnitData = {
        ...hachiwara,
        criticalSlots: { HEAD: [id] },
        equipment: [{ id, location: 'HEAD' }],
      };
      const scan = scanCrits(unit);
      expect(scan.defEquipIds).toEqual([id]);
      expect(scan.explosive).toEqual([]);
      const result = calculateUnitBV(unit);
      expect(result.breakdown?.defEquipBV).toBe(5);
      expect(result.breakdown?.weaponBV).toBe(0);
    },
  );

  // mm-data 50f7efef, meks/3055U/Hachiwara HCA-3T.mtf:
  // only non-BV metadata removed; all native mounts and critical slots retained.
  it('matches Hachiwara HCA-3T without its compensating pod errors', () => {
    const result = calculateUnitBV(hachiwara, hachiwara.id);
    expect(result.breakdown?.defEquipBV).toBe(20);
    expect(result.breakdown?.totalExplosivePenalty).toBe(45);
    expect(result.breakdown?.defensiveBV).toBeCloseTo(826.35, 10);
    expect(result.breakdown?.offensiveBV).toBeCloseTo(824.78, 10);
    expect(result.bv).toBe(1651);
  });
});
