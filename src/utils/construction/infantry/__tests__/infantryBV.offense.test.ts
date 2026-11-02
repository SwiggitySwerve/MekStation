import { BlkParserService } from '@/services/conversion/BlkParserService';
import { InfantryUnitHandler } from '@/services/units/handlers/InfantryUnitHandler';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

const parser = new BlkParserService();
const handler = new InfantryUnitHandler();
// Gameplay tags from pinned TW/Clan Squads/Clan Motorized Squad (Rifle).blk.
const source = (extra = '', motion = 'Motorized') =>
  `<UnitType>Infantry</UnitType><Name>Clan Motorized Squad</Name><Model>(Rifle)</Model><year>2815</year><type>Clan Level 2</type><motion_type>${motion}</motion_type><squad_size>5</squad_size><squadn>1</squadn><Primary>InfantryAssaultRifle</Primary><Troopers Equipment>Clan Armor Kit (All)</Troopers Equipment>${extra}`;
function offense(text: string) {
  const parsed = parser.parse(text);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const loaded = handler.parse(parsed.data.document);
  if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
  const result = calculateBattleValueForUnit(loaded.data.unit);
  if (result?.kind !== 'infantry') throw new Error('Missing infantry dispatch');
  expect(handler.calculateBV(loaded.data.unit)).toBe(result.breakdown.final);
  return result.breakdown;
}

describe('pinned infantry offensive aggregate', () => {
  it('uses the real motorized squad weapon BV and rounded speed factor', () => {
    expect(offense(source()).platoonBV).toBeCloseTo(12.243, 10);
  });
  it('weights secondary shooters per squad instead of adding a table ratio', () => {
    // StarCorps Jump Assault Infantry: 15 primary, 6 secondary shooters, MP 2.
    const text = source(
      '<Secondary>InfantryHeavyGrenadeLauncherInferno</Secondary><secondn>2</secondn>',
      'Jump',
    )
      .replace('<squad_size>5', '<squad_size>7')
      .replace('<squadn>1', '<squadn>3');
    expect(offense(text).platoonBV).toBeCloseTo(47.463, 10);
  });
  it('does not divide weapon BV by incoming armor protection', () => {
    const text = source().replace(
      '<Troopers Equipment>Clan Armor Kit (All)</Troopers Equipment>',
      '',
    );
    expect(offense(text).platoonBV).toBe(
      offense(text + '<armordivisor>8</armordivisor>').platoonBV,
    );
  });
  it('does not double archaic weapons for anti-mek attacks', () => {
    const text = source(
      '<Secondary>InfantryAssaultRifle</Secondary><secondn>2</secondn>',
      'Leg',
    )
      .replace('<Primary>InfantryAssaultRifle', '<Primary>Blade (Vibro-katana)')
      .replace('<squad_size>5', '<squad_size>7')
      .replace('<squadn>1', '<squadn>4');
    expect(offense(text).platoonBV).toBeCloseTo(16.8696, 10);
  });
  it('encumbering armor disables anti-mek and reduces motorized movement', () => {
    expect(
      offense(
        source().replace('Clan Armor Kit (All)', 'Ballistic Plate, Standard'),
      ).platoonBV,
    ).toBeCloseTo(5 * 1.59 * 0.65, 10);
  });
});
