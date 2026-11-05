import { BlkParserService } from '@/services/conversion/BlkParserService';
import { TechBase } from '@/types/enums';
import { calculateBattleArmorBVFromUnit } from '@/utils/construction/battlearmor/battleArmorBVAdapter';

import { BattleArmorUnitHandler } from '../BattleArmorUnitHandler';
import fixtures from './fixtures/ba-harjel-parity.json';

function load(source: string, type?: string) {
  const parsed = new BlkParserService().parse(source);
  if (!parsed.success || !parsed.data)
    throw new Error('Invalid source fixture');
  const document = parsed.data.document;
  const result = new BattleArmorUnitHandler().parse({
    ...document,
    type: type ?? document.type,
  });
  if (!result.success || !result.data)
    throw new Error('Could not load fixture');
  return result.data.unit;
}

// Pin 48fcb2f64: BLKFile.java:720-734; BattleArmor.java:953-984;
// BattleArmorBVCalculator.java:146-160; ISBAFiredrakeNeedler.java:61-72.
describe('mixed Clan-chassis battle armor', () => {
  it.each(fixtures)(
    'matches the native HarJel trace $path',
    ({ sourceText, expected }) => {
      const unit = load(sourceText);
      const bv = calculateBattleArmorBVFromUnit(unit);
      expect(bv.final).toBe(expected.total);
      expect(unit.techBase).toBe(TechBase.CLAN);
      expect(unit.metadata).toMatchObject({ techBase: TechBase.CLAN });
      expect(unit.canAntiMech).toBe(true);
      expect(bv.perTrooper.defensive.total).toBeCloseTo(expected.defense, 10);
      expect(bv.perTrooper.offensive.total).toBeCloseTo(expected.offense, 10);
      expect(bv.perTrooper.offensive.weaponBV).toBe(expected.weaponBV);
    },
  );

  it.each([
    ['Clan Level 2', TechBase.CLAN, true],
    ['IS Level 2', TechBase.INNER_SPHERE, false],
    ['Mixed (Clan Chassis)', TechBase.CLAN, true],
    ['Mixed (Clan Chassis) Advanced', TechBase.CLAN, true],
    ['Mixed (Clan Chassis) Experimental', TechBase.CLAN, true],
    ['Mixed (IS Chassis) Advanced', TechBase.INNER_SPHERE, false],
  ] as const)(
    'uses the %s chassis for loaded missile burden',
    (type, techBase, antiMek) => {
      const unit = load(fixtures[0].sourceText, type);
      expect(unit.techBase).toBe(techBase);
      expect(unit.metadata).toMatchObject({ techBase });
      expect(unit.canAntiMech).toBe(antiMek);
      const bv = calculateBattleArmorBVFromUnit(unit);
      expect(bv.perTrooper.offensive.weaponBV).toBe(antiMek ? 34 : 32);
    },
  );
});
