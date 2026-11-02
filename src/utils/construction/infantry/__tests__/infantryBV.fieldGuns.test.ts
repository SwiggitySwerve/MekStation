import { readFileSync } from 'node:fs';
import path from 'node:path';

import { gameUnitSchema } from '@/lib/events/replay/CombatLifecycleSharedSchemas';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { InfantryUnitHandler } from '@/services/units/handlers/InfantryUnitHandler';
import { NodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { calculateUnitBV } from '@/utils/construction/bvAdapter';
const parser = new BlkParserService(),
  handler = new InfantryUnitHandler();
function load(text: string) {
  const parsed = parser.parse(text);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const loaded = handler.parse(parsed.data.document);
  if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
  return loaded.data.unit;
}
function calculate(text: string) {
  const unit = load(text),
    result = calculateBattleValueForUnit(unit);
  if (result?.kind !== 'infantry') throw new Error('Missing infantry BV');
  expect(handler.calculateBV(unit)).toBe(result.breakdown.final);
  return result.breakdown;
}
const source = (mounts: string) =>
  `<UnitType>Infantry</UnitType><Name>Field Gun Platoon</Name><year>3067</year><type>IS Level 2</type><motion_type>Leg</motion_type><squad_size>7</squad_size><squadn>4</squadn><Primary>InfantryAssaultRifle</Primary><Field Guns Equipment>${mounts}</Field Guns Equipment>`;
it('uses actual weapons and ammo before speed without subtracting gun crew', () => {
  const b = calculate(source('Autocannon/5\nIS Ammo AC/5'));
  expect(load(source('Autocannon/5\nIS Ammo AC/5')).fieldGuns).toMatchObject([
    { equipmentId: 'ac-5', crew: 8 },
  ]);
  expect(b.defensiveBV).toBe(42);
  expect(b.platoonBV).toBeCloseTo(66.7008, 10);
  expect(b.final).toBe(109);
});
it('does not invent ammunition for a source gun', () => {
  expect(calculate(source('Autocannon/5')).platoonBV).toBeCloseTo(61.8408, 10);
});
it('caps real ammo against matching weapons', () => {
  expect(
    calculate(
      source(
        ['Autocannon/5', ...Array<string>(20).fill('IS Ammo AC/5')].join('\n'),
      ),
    ).platoonBV,
  ).toBeCloseTo(99.6408, 10);
});
it('ignores orphan ammo and allows anti-mek when no active gun exists', () => {
  expect(calculate(source('IS Ammo AC/5')).final).toBe(90);
});
const pin = process.env.INF_BV_PIN,
  oracle = process.env.INF_BV_ORACLE;
(pin && oracle ? it : it.skip)('matches Java on real field-gun sources', () => {
  if (!pin || !oracle) throw new Error('Missing pins');
  const rows: Array<{
    concreteFamily: string;
    path: string;
    battleValue: { total: number; aggregates: { offensiveValue: number } };
  }> = readFileSync(oracle, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  for (const file of [
    'infantry/Clan/Clan Field Gun Point (Motorized AC5 Basic).blk',
    'infantry/3085/Liao/Missile Artillery Infantry Kommando Special Forces.blk',
    'infantry/3085/Taurian/Field Gun Infantry Motorized Batteries.blk',
  ]) {
    const row = rows.find((r) => r.path === file);
    if (!row) throw new Error(file);
    const b = calculate(readFileSync(path.join(pin, file), 'utf8'));
    expect(b.platoonBV).toBeCloseTo(
      row.battleValue.aggregates.offensiveValue,
      8,
    );
    expect(b.final).toBe(row.battleValue.total);
  }
});
// Minimal native facts from these real mm-data 50f7efef sources; no pin needed in CI.
it.each([
  [
    'clan-field-gun-point-motorized-ac5-basic',
    'Motorized',
    5,
    5,
    'Generic Infantry Kit',
    '',
    'Autocannon/5\nIS Ammo AC/5\nAutocannon/5\nIS Ammo AC/5\nAutocannon/5\nIS Ammo AC/5',
  ],
  [
    'aa-jump-infantry-292nd-league-regulars',
    'Jump',
    7,
    3,
    'Flak, Standard',
    '<Secondary>AA Weapon (Mk. 2, Man-Portable)</Secondary><secondn>2</secondn>',
    '',
  ],
  [
    'clan-foot-point-rifle-advanced',
    'Leg',
    5,
    5,
    'Clan Armor Kit (All)',
    '',
    '',
  ],
] as const)(
  'loads real catalog infantry %s through the library BV path',
  (id, motion, size, squads, kit, secondary, mounts) => {
    const unit = new NodeCanonicalUnitService().getByIdSync(id, {
      family: 'infantry',
      strict: true,
    });
    if (!unit) throw new Error(id);
    const text =
      source(mounts)
        .replace('>Leg<', `>${motion}<`)
        .replace('>7<', `>${size}<`)
        .replace('>4<', `>${squads}<`) +
      `<Troopers Equipment>${kit}</Troopers Equipment>${secondary}`;
    expect(calculateUnitBV(unit)).toBe(handler.calculateBV(load(text)));
  },
);

it.each(['Clan LB 2-X AC Ammo', 'Clan LB 2-X Cluster Ammo'])(
  'uses the ammo namespace for %s',
  (bin) => {
    const b = calculate(source(`CLLBXAC2\n${bin}`));
    expect(b.fieldGunWeaponBV).toBe(47);
    expect(b.fieldGunAmmoBV).toBe(6);
  },
);
it('does not match a bin to another rack size', () => {
  expect(calculate(source('Autocannon/5\nIS Ammo AC/20')).fieldGunAmmoBV).toBe(
    0,
  );
});
it('counts source bins at their native BV regardless of positive shot count', () => {
  expect(
    calculate(source('Autocannon/5\nIS Ammo AC/5:Shots1#')).fieldGunAmmoBV,
  ).toBe(9);
});

it('retains exact source mount names in replay facts', () => {
  const facts = load(source('Autocannon/5\nIS Ammo AC/5')).bvOffense;
  const parsed = gameUnitSchema.shape.infantryInit
    .unwrap()
    .shape.bvOffense.unwrap()
    .safeParse(facts);
  expect(parsed.success && parsed.data.fieldGunEquipment).toEqual([
    'Autocannon/5',
    'IS Ammo AC/5',
  ]);
});
