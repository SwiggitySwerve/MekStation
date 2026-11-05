import type { UnitData } from '../validate-bv-types';

import { calculateUnitBV } from '../../src/utils/construction/mechBV/calculator';
import { scanCrits } from '../validate-bv-crit-scan';

function unitWith(criticalSlots: UnitData['criticalSlots']): UnitData {
  return {
    id: 'bpod-eligibility',
    chassis: 'Test',
    model: 'B-Pod',
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
    criticalSlots,
  };
}

// MegaMek 48fcb2f64: EquipmentType.java:448-460 checks the active rules;
// CoreRulesExplosions.java:241-247 excludes pods despite their explosive flag.
describe('construction B-Pod explosion eligibility', () => {
  it.each(['B-Pod', 'ISBPod', 'CLBPod', 'Anti-BattleArmor Pods (B-Pods)'])(
    'excludes an unprotected %s without dropping its defensive identity',
    (name) => {
      const scan = scanCrits(unitWith({ HEAD: [name] }));

      expect(scan.explosive).toEqual([]);
      expect(scan.defEquipIds).toEqual([name]);
    },
  );

  it('retains neighboring ammo and reduced weapon deductions', () => {
    const scan = scanCrits(
      unitWith({ HEAD: ['ISBPod', 'IS Ammo AC/10', 'Mek Taser'] }),
    );

    expect(scan.explosive).toEqual([
      { location: 'HD', slots: 1, penaltyCategory: 'standard' },
      { location: 'HD', slots: 1, penaltyCategory: 'reduced' },
    ]);
  });

  it('keeps two B-Pods worth four defensive BV with no explosion penalty', () => {
    const result = calculateUnitBV(
      unitWith({ LEFT_LEG: ['ISBPod'], RIGHT_LEG: ['ISBPod'] }),
    );

    expect(result.breakdown?.defEquipBV).toBe(4);
    expect(result.breakdown?.totalExplosivePenalty).toBe(0);
  });
});
