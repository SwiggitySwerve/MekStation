import { readFileSync } from 'node:fs';
import path from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { InfantryUnitHandler } from '@/services/units/handlers/InfantryUnitHandler';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
const parser = new BlkParserService(),
  handler = new InfantryUnitHandler();
function calculate(text: string, gunnery = 4, piloting = 5) {
  const parsed = parser.parse(text);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const loaded = handler.parse(parsed.data.document);
  if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
  const result = calculateBattleValueForUnit(loaded.data.unit, {
    gunnery,
    piloting,
  });
  if (result?.kind !== 'infantry') throw new Error('Missing infantry dispatch');
  if (gunnery === 4 && piloting === 5)
    expect(handler.calculateBV(loaded.data.unit)).toBe(result.breakdown.final);
  return result.breakdown;
}
const source = (tags = '', motion = 'Leg') =>
  `<UnitType>Infantry</UnitType><Name>Foot Platoon</Name><year>2025</year><type>IS Level 2</type><motion_type>${motion}</motion_type><squad_size>7</squad_size><squadn>4</squadn><Primary>InfantryAssaultRifle</Primary>${tags}`;
it.each([
  ['', 'Leg', 42],
  ['', 'Motorized', 46.2],
  ['', 'Jump', 50.4],
  ['', 'Submarine', 46.2],
  [
    '<Troopers Equipment>Sneak Suit (Camo/IR/ECM)</Troopers Equipment>',
    'Jump',
    71.4,
  ],
  ['<dest>false</dest><sneakecm>false</sneakecm>', 'Leg', 54.6],
  [
    '<augmentation>dermal_camo_armor</augmentation><armordivisor>3</armordivisor>',
    'Leg',
    163.8,
  ],
  [
    '<augmentation>dermal_camo_armor</augmentation><armorKit>GenericKit</armorKit>',
    'Leg',
    42,
  ],
  ['<augmentation>dermal_camo_armor</augmentation>', 'Motorized', 46.2],
])(
  'applies pinned defensive factors for %s, %s',
  (tags, motion, defensiveBV) => {
    expect(calculate(source(tags, motion)).defensiveBV).toBeCloseTo(
      defensiveBV,
      10,
    );
  },
);
it.each([
  [1, 1.1],
  [3, 1.1],
  [64, 1.3],
  [128, 1.2],
  [512, 1.1],
  [4096, 1.1],
  [2048, 1.1],
  [6851, 1.9],
  [256, 1],
])('applies specialization %s once to the sum', (mask, modifier) => {
  const result = calculate(source(`<specialization>${mask}</specialization>`));
  expect(result.final).toBe(
    Math.round((result.defensiveBV + result.platoonBV) * modifier),
  );
});
it('infers SCUBA unless explicit zero overrides it', () => {
  expect(calculate(source('', 'Submarine')).final).toBe(89);
  const result = calculate(
    source('<specialization>0</specialization>', 'Submarine'),
  );
  expect(result.final).toBe(Math.round(result.defensiveBV + result.platoonBV));
});
it('rounds source base BV before the pilot multiplier', () => {
  const text = source('<armorKit>ClanKit</armorKit>')
    .replace('<squad_size>7', '<squad_size>1')
    .replace('<squadn>4', '<squadn>1');
  const result = calculate(text, 0, 0);
  expect(result.final).toBe(Math.round(5 * result.pilotMultiplier));
});
const pin = process.env.INF_BV_PIN;
(pin ? it : it.skip).each([
  ['infantry/TW/Clan Squads/Clan Motorized Squad (Rifle).blk', 16.5, 29],
  [
    'infantry/3085/Davion/SpecOps Paratrooper MI6 Extraction Team.blk',
    47.25,
    119,
  ],
  [
    'infantry/AFFS/Mechanized Tracked Platoon (AFFS) (Combat Engineers 3067+).blk',
    42,
    49,
  ],
  [
    'infantry/3085/Word of Blake/Tau Zombie Manei Domini Attack Squad.blk',
    27,
    123,
  ],
])('matches pinned Java on %s', (file, defense, total) => {
  if (!pin) throw new Error('Missing source pin');
  const result = calculate(readFileSync(path.join(pin, file), 'utf8'));
  expect(result.defensiveBV).toBeCloseTo(defense, 10);
  expect(result.final).toBe(total);
  if (file.includes('Tau Zombie'))
    expect(result.platoonBV).toBeCloseTo(95.86512, 10);
});
