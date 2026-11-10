import { createHash } from 'crypto';
import { readFileSync } from 'fs';

import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { calculateUnitBV } from '@/utils/construction/bvAdapter';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';

// MegaMek 48fcb2f64 CLBASRM3.java:66 sets bv = 30.
describe('pinned Clan BA SRM-3 value', () => {
  it('uses BV 30 in the catalog and its exact CAT-Q2 frozen baseline row', () => {
    expect(getEquipmentEntry('CLBASRM3')?.battleValue).toBe(30);
    const baseline: {
      id: string;
      item: { battleValue: number };
      sha256: string;
    }[] = JSON.parse(
      readFileSync('scripts/equipment-catalog/baseline.json', 'utf8'),
    );
    const row = baseline.find((item) => item.id === 'basrm3');
    expect(row?.item.battleValue).toBe(30);
    expect(row?.sha256).toBe(
      createHash('sha256').update(JSON.stringify(row?.item)).digest('hex'),
    );
  });
  it.each([
    ['rogue-bear-heavy-battle-armor-sqd4', 346],
    // Pinned Java 48fcb2f64 reference: BV 285. Keeping the BA Clan chassis
    // restores anti-Mek eligibility (BattleArmor.java:953-987).
    ['gray-death-strike-suit-harjelsqd4', 285],
  ])('%s includes the corrected weapon value', (id, expected) => {
    const unit = getNodeCanonicalUnitService().getByIdSync(`battlearmor:${id}`);
    expect(unit).not.toBeNull();
    expect(calculateUnitBV(unit)).toBe(expected);
  });
});
