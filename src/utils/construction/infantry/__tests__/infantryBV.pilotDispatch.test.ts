import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { gameUnitSchema } from '@/lib/events/replay/CombatLifecycleSharedSchemas';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { InfantryUnitHandler } from '@/services/units/handlers/InfantryUnitHandler';
import { InfantryMotive } from '@/types/unit/InfantryInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

import { calculateInfantryBV, getInfantryPilotMultiplier } from '../infantryBV';
import { baseInput } from './infantryBV.test.helpers';

describe('Infantry BV Dispatch (spec.md Infantry BV Dispatch)', () => {
  it('calculateInfantryBV returns IInfantryBVBreakdown shape', () => {
    const result = calculateInfantryBV(baseInput());
    expect(result).toHaveProperty('perTrooper');
    expect(result).toHaveProperty('motiveMultiplier');
    expect(result).toHaveProperty('antiMechMultiplier');
    expect(result).toHaveProperty('fieldGunBV');
    expect(result).toHaveProperty('platoonBV');
    expect(result).toHaveProperty('pilotMultiplier');
    expect(result).toHaveProperty('final');
  });
});

describe('Infantry Pilot Multiplier', () => {
  it('defaults to 4/5 gunnery/piloting (= 1.0 baseline)', () => {
    expect(getInfantryPilotMultiplier(undefined, undefined)).toBe(1.0);
  });

  it('uses shared 9x9 matrix - 3/4 gunnery/piloting > 1.0', () => {
    const multiplier = getInfantryPilotMultiplier(3, 4);
    expect(multiplier).toBeGreaterThan(1.0);
  });

  it('final BV includes defensive structure before the pilot multiplier', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-laser-rifle',
        bvOverride: 15,
        damageDivisor: 1,
      },
      gunnery: 3,
      piloting: 4,
    });
    const result = calculateInfantryBV(input);
    const expected = Math.round(
      (42 + result.platoonBV) * result.pilotMultiplier,
    );
    expect(result.final).toBe(expected);
  });
});

const parser = new BlkParserService();
const handler = new InfantryUnitHandler();
// Source tags from mm-data 50f7efef TW/IS Squads/Motorized Squad (Rifle).
const source = (
  extra = '',
) => `<UnitType>Infantry</UnitType><Name>Motorized Squad</Name>
<Model>(Rifle)</Model><year>2025</year><type>IS Level 2</type>
<motion_type>Motorized</motion_type><squad_size>7</squad_size><squadn>1</squadn>
<Primary>InfantryAssaultRifle</Primary>${extra}`;
function load(text: string) {
  const parsed = parser.parse(text);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const loaded = handler.parse(parsed.data.document);
  if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
  return loaded.data.unit;
}

describe('pinned infantry defensive structure (InfantryBVCalculator.java:65-80)', () => {
  it.each([
    ['', 1, 10.5],
    ['<Troopers Equipment>ClanKit</Troopers Equipment>', 2, 21],
    ['<armordivisor>3</armordivisor><InfantryArmor>2</InfantryArmor>', 3, 31.5],
    ['<armorKit>GenericKit</armorKit><armordivisor>3</armordivisor>', 1, 10.5],
    [
      '<armorKit>ClanKit</armorKit><Troopers Equipment>GenericKit</Troopers Equipment>',
      2,
      21,
    ],
    ['<augmentation>tsm_implant</augmentation>', 0.5, 5.25],
    [
      '<augmentation>tsm_implant\ndermal_camo_armor\ndermal_armor</augmentation>',
      2,
      21,
    ],
    ['<augmentation>tsm_implant</augmentation><dest>false</dest>', 1, 10.5],
    ['<augmentation>gas_effuser_pheromone</augmentation>', 1, 10.85],
  ])(
    'retains protection and adds structure for %s',
    (tags, divisor, structure) => {
      const unit = load(source(tags));
      expect(unit).toMatchObject({ damageDivisor: divisor });
      expect(
        gameUnitSchema.shape.infantryInit
          .unwrap()
          .pick({ damageDivisor: true, hasPheromoneEffuser: true })
          .safeParse({
            damageDivisor: unit.damageDivisor,
            hasPheromoneEffuser: unit.hasPheromoneEffuser,
          }).success,
      ).toBe(true);
      const result = calculateBattleValueForUnit(unit);
      expect(result?.kind).toBe('infantry');
      if (result?.kind !== 'infantry')
        throw new Error('Missing infantry dispatch');
      // This motorized fixture has running TMM one; its DEST case adds 0.2.
      const defense = structure * (tags.includes('<dest>') ? 1.3 : 1.1);
      expect(result.breakdown.defensiveBV).toBeCloseTo(defense, 10);
      expect(
        gameUnitSchema.shape.infantryInit
          .unwrap()
          .shape.bvBreakdown.unwrap()
          .safeParse(result.breakdown).success,
      ).toBe(true);
      expect(result.breakdown.final).toBe(
        Math.round(
          (defense + result.breakdown.platoonBV) *
            result.breakdown.pilotMultiplier,
        ),
      );
      expect(handler.calculateBV(unit)).toBe(result.breakdown.final);
    },
  );

  it.each([
    ['Hipposaur', 4],
    ['Elephant', 2],
    ['Horse', 1],
  ])('retains the %s mount divisor', (mount, divisor) => {
    const unit = load(
      source('<armorKit>ClanKit</armorKit>').replace(
        'Motorized</motion_type>',
        `Beast:${mount}</motion_type>`,
      ),
    );
    expect(unit).toMatchObject({ damageDivisor: 2 * divisor });
  });

  it('rejects an invalid incoming damage divisor at the source boundary', () => {
    const parsed = parser.parse(source('<armordivisor>NaN</armordivisor>'));
    if (!parsed.success) throw new Error('Fixture must parse');
    expect(handler.parse(parsed.data.document).success).toBe(false);
  });
});

// Run with INF_BV_PIN and INF_BV_ORACLE to guard every pinned source, including
// the 30 designs rejected by Java construction validation (never filtered out).
const corpus =
  process.env.INF_BV_PIN && process.env.INF_BV_ORACLE ? it : it.skip;
corpus(
  'all 1,820 pinned sources have finite positive BV through both app paths',
  () => {
    const pin = process.env.INF_BV_PIN;
    const oracle = process.env.INF_BV_ORACLE;
    if (!pin || !oracle) throw new Error('Missing pinned corpus paths');
    const rows: Array<{
      concreteFamily: string;
      path: string;
      sha256: string;
      construction: { valid: boolean };
      familyFacts: { damageDivisor: number; shootingStrength: number };
    }> = readFileSync(oracle, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const infantry = rows.filter(
      (row) => row.concreteFamily === 'ConvInfantry',
    );
    expect(infantry).toHaveLength(1820);
    expect(infantry.filter((row) => !row.construction.valid)).toHaveLength(30);
    for (const row of infantry) {
      const text = readFileSync(path.join(pin, row.path), 'utf8').replace(
        /\r\n/g,
        '\n',
      );
      expect(createHash('sha256').update(text).digest('hex')).toBe(row.sha256);
      const unit = load(text);
      expect(unit).toMatchObject({
        damageDivisor: row.familyFacts.damageDivisor,
        platoonStrength: row.familyFacts.shootingStrength,
      });
      const result = calculateBattleValueForUnit(unit);
      if (result?.kind !== 'infantry') throw new Error(row.path);
      expect(Number.isFinite(result.breakdown.final)).toBe(true);
      expect(result.breakdown.final).toBeGreaterThan(0);
      expect(handler.calculateBV(unit)).toBe(result.breakdown.final);
    }
  },
);
