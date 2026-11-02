/**
 * Battle Armor BV unit tests.
 *
 * Covers the formula tables, defensive/offensive component math, squad scaling,
 * pilot multiplier application, and public breakdown shape. Canonical archetype
 * scenarios live in battleArmorBV.archetypes.test.ts.
 *
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { BattleArmorUnitHandler } from '@/services/units/handlers/BattleArmorUnitHandler';
import {
  BAArmorType,
  BAManipulator,
  BAWeightClass,
} from '@/types/unit/BattleArmorInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

import {
  calculateBADefensiveBV,
  calculateBAOffensiveBV,
  calculateBattleArmorBV,
  getBAArmorBVMultiplier,
  getBAManipulatorMeleeBV,
  getBAMoveClassMultiplier,
} from '../battleArmorBV';
import { baseInput } from './battleArmorBV.test.helpers';

describe('getBAArmorBVMultiplier', () => {
  it('maps BA armor types to their BV multipliers', () => {
    expect(getBAArmorBVMultiplier(BAArmorType.STANDARD)).toBe(1.0);
    expect(getBAArmorBVMultiplier(BAArmorType.STEALTH_BASIC)).toBe(1.0);
    expect(getBAArmorBVMultiplier(BAArmorType.STEALTH_IMPROVED)).toBe(1.0);
    expect(getBAArmorBVMultiplier(BAArmorType.STEALTH_PROTOTYPE)).toBe(1.0);
    expect(getBAArmorBVMultiplier(BAArmorType.MIMETIC)).toBe(1.0);
    expect(getBAArmorBVMultiplier(BAArmorType.REACTIVE)).toBe(1.4);
    expect(getBAArmorBVMultiplier(BAArmorType.REFLECTIVE)).toBe(1.4);
    expect(getBAArmorBVMultiplier(BAArmorType.FIRE_RESISTANT)).toBe(1.4);
  });
});

describe('getBAMoveClassMultiplier', () => {
  it('maps BA weight classes to move BV multipliers', () => {
    expect(getBAMoveClassMultiplier(BAWeightClass.PA_L)).toBe(0.5);
    expect(getBAMoveClassMultiplier(BAWeightClass.LIGHT)).toBe(0.5);
    expect(getBAMoveClassMultiplier(BAWeightClass.MEDIUM)).toBe(0.75);
    expect(getBAMoveClassMultiplier(BAWeightClass.HEAVY)).toBe(1.0);
    expect(getBAMoveClassMultiplier(BAWeightClass.ASSAULT)).toBe(1.5);
  });
});

describe('getBAManipulatorMeleeBV', () => {
  it('maps melee manipulators to BV and ignores utility manipulators', () => {
    expect(getBAManipulatorMeleeBV(BAManipulator.VIBRO_CLAW)).toBe(3);
    expect(getBAManipulatorMeleeBV(BAManipulator.HEAVY_CLAW)).toBe(2);
    expect(getBAManipulatorMeleeBV(BAManipulator.BATTLE_CLAW)).toBe(1);
    expect(getBAManipulatorMeleeBV(BAManipulator.BASIC_CLAW)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.NONE)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.CARGO_LIFTER)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.INDUSTRIAL_DRILL)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.MAGNET)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.MINE_CLEARANCE)).toBe(0);
  });
});

describe('calculateBADefensiveBV', () => {
  it('reports armor/internal BV and the movement premiums', () => {
    const b = calculateBADefensiveBV(baseInput({ jumpMP: 3 }));
    expect(b.armorBV).toBe(13.5);
    expect(b.moveBV).toBeCloseTo(1.35, 10);
    expect(b.jumpBV).toBeCloseTo(2.7, 10);
    expect(b.total).toBeCloseTo(17.55, 10);
    expect(b.total).toBeCloseTo(b.armorBV + b.moveBV + b.jumpBV, 10);
  });
  it('uses the highest movement TMM and ignores clamps and weight class', () => {
    const b = calculateBADefensiveBV(baseInput({ umuMP: 4 }));
    expect(b.total).toBeCloseTo(16.2, 10);
    expect(
      calculateBADefensiveBV(
        baseInput({
          jumpMP: 2,
          umuMP: 4,
          hasMagneticClamp: true,
          weightClass: BAWeightClass.ASSAULT,
        }),
      ).total,
    ).toBeCloseTo(b.total, 10);
  });
});

describe('calculateBAOffensiveBV', () => {
  it('sums manipulator BV from both arms', () => {
    expect(
      calculateBAOffensiveBV(
        baseInput({
          manipulators: {
            left: BAManipulator.VIBRO_CLAW,
            right: BAManipulator.VIBRO_CLAW,
          },
        }),
      ).manipulatorBV,
    ).toBe(6);

    expect(
      calculateBAOffensiveBV(
        baseInput({
          manipulators: {
            left: BAManipulator.BATTLE_CLAW,
            right: BAManipulator.HEAVY_CLAW,
          },
        }),
      ).manipulatorBV,
    ).toBe(3);
  });

  it('sums weapon, ammo, and manipulator BV', () => {
    const weaponOnly = calculateBAOffensiveBV(
      baseInput({ weapons: [{ id: 'srm-2', bvOverride: 21 }] }),
    );
    expect(weaponOnly.weaponBV).toBe(21);

    const ammo = calculateBAOffensiveBV(
      baseInput({
        weapons: [{ id: 'srm-2', bvOverride: 21 }],
        ammo: [{ id: 'srm-2-ammo', bvOverride: 3 }],
      }),
    );
    expect(ammo.ammoBV).toBe(3);

    const total = calculateBAOffensiveBV(
      baseInput({
        weapons: [
          { id: 'srm-2', bvOverride: 21 },
          { id: 'flamer', bvOverride: 6 },
        ],
        ammo: [{ id: 'srm-2-ammo', bvOverride: 3 }],
        manipulators: {
          left: BAManipulator.BATTLE_CLAW,
          right: BAManipulator.BATTLE_CLAW,
        },
      }),
    );
    expect(total.weaponBV).toBe(27);
    expect(total.ammoBV).toBe(3);
    expect(total.manipulatorBV).toBe(2);
    expect(total.total).toBe(32);
  });
});

describe('calculateBattleArmorBV squad scaling', () => {
  it('scales per-trooper BV by squad size before pilot multiplier', () => {
    const clan = calculateBattleArmorBV(
      baseInput({
        squadSize: 5,
        armorPointsPerTrooper: 20,
        armorType: BAArmorType.STANDARD,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 48 }],
      }),
    );
    expect(clan.perTrooper.total).toBeCloseTo(104.1, 10);
    expect(clan.squadSize).toBe(5);
    expect(clan.squadTotal).toBeCloseTo(520.5, 10);

    const innerSphere = calculateBattleArmorBV(
      baseInput({
        squadSize: 4,
        armorPointsPerTrooper: 10,
        armorType: BAArmorType.STANDARD,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 53 }],
      }),
    );
    expect(innerSphere.perTrooper.total).toBeCloseTo(81.6, 10);
    expect(innerSphere.squadSize).toBe(4);
    expect(innerSphere.squadTotal).toBeCloseTo(326.4, 10);
  });

  it('applies pilot multiplier at the end and clamps squad size', () => {
    const elite = calculateBattleArmorBV(
      baseInput({
        squadSize: 5,
        armorPointsPerTrooper: 20,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 48 }],
        gunnery: 3,
        piloting: 4,
      }),
    );
    expect(elite.pilotMultiplier).toBe(1.32);
    expect(elite.final).toBe(687);

    const baseline = calculateBattleArmorBV(
      baseInput({
        squadSize: 5,
        armorPointsPerTrooper: 20,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 48 }],
      }),
    );
    expect(baseline.pilotMultiplier).toBe(1.0);
    expect(baseline.final).toBe(521);

    expect(calculateBattleArmorBV(baseInput({ squadSize: 0 })).squadSize).toBe(
      1,
    );
  });
});

describe('IBABreakdown shape', () => {
  it('exposes per-trooper, squad, pilot, and final fields', () => {
    const b = calculateBattleArmorBV(baseInput());
    expect(b).toHaveProperty('perTrooper');
    expect(b.perTrooper).toHaveProperty('defensive');
    expect(b.perTrooper).toHaveProperty('offensive');
    expect(b).toHaveProperty('squadTotal');
    expect(b).toHaveProperty('pilotMultiplier');
    expect(b).toHaveProperty('final');
    expect(typeof b.final).toBe('number');
    expect(Number.isInteger(b.final)).toBe(true);
  });

  it('offensive increases when an SRM-2 is added to each trooper', () => {
    const before =
      calculateBattleArmorBV(baseInput()).perTrooper.offensive.total;
    const after = calculateBattleArmorBV(
      baseInput({ weapons: [{ id: 'srm-2', bvOverride: 21 }] }),
    ).perTrooper.offensive.total;
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBe(21);
  });
});

const handler = new BattleArmorUnitHandler();
function load(source: string) {
  const parsed = new BlkParserService().parse(source);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const loaded = handler.parse(parsed.data.document);
  if (!loaded.success) throw new Error(loaded.error.errors.join('; '));
  return loaded.data.unit;
}

// Real source tag set: battlearmor/3058Uu/Achileus BA (Sqd 4) [David].blk,
// mm-data 50f7efef. Equipment/fluff omitted: this regression isolates defense.
const achileus = `<UnitType>\nBattleArmor\n</UnitType>
<Name>\nAchileus Light Battle Armor\n</Name>
<Model>\n[David](Sqd4)\n</Model>
<year>\n3064\n</year>
<type>\nIS Level 2\n</type>
<motion_type>\nJump\n</motion_type>
<cruiseMP>\n1\n</cruiseMP>
<jumpingMP>\n3\n</jumpingMP>
<armor_type>\n33\n</armor_type>
<armor>\n6\n</armor>
<Trooper Count>\n4\n</Trooper Count>
<weightclass>\n1\n</weightclass>
<chassis>\nbiped\n</chassis>`;

it('dispatches loaded BA and shares the handler calculator', () => {
  const unit = load(achileus);
  const result = calculateBattleValueForUnit(unit);
  expect(result?.kind).toBe('battlearmor');
  expect(result?.breakdown.final).toBe(handler.calculateBV(unit));
});

it('matches the pinned Achileus defensive aggregate, independent of weapons', () => {
  const result = calculateBattleValueForUnit(load(achileus));
  expect(result?.kind).toBe('battlearmor');
  if (result?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
  // BattleArmorBVCalculator.java:84-111,257-278: (1 + 6*2.5) * 1.6.
  expect(result.breakdown.perTrooper.defensive.total).toBeCloseTo(25.6, 10);
});

it.each([
  [0, 400],
  [1, 750],
  [2, 1000],
  [3, 1500],
  [4, 2000],
])(
  'derives tonnageless class %s trooper weight from the Java class limit',
  (code, kg) => {
    const source = achileus.replace(
      '<weightclass>\n1',
      `<weightclass>\n${code}`,
    );
    expect(load(source).weightPerTrooper).toBe(kg);
    expect(load(source.replace('biped', 'quad')).weightPerTrooper).toBe(kg);
  },
);

it.each([
  [BAArmorType.STANDARD, 0, 0, 1.1],
  [BAArmorType.STANDARD, 6, 3, 20.8],
  [BAArmorType.STEALTH_IMPROVED, 6, 3, 25.6],
  [BAArmorType.STEALTH_BASIC, 6, 3, 24],
  [BAArmorType.REACTIVE, 6, 0, 24.2],
])(
  'prices armor and defensive mobility for %s',
  (armorType, armor, jump, expected) => {
    expect(
      calculateBADefensiveBV(
        baseInput({
          armorType,
          armorPointsPerTrooper: armor,
          jumpMP: jump,
        }),
      ).total,
    ).toBeCloseTo(expected, 10);
  },
);

it('adds camouflage independently of stealth and preserves the movement maximum', () => {
  const b = calculateBADefensiveBV(
    baseInput({
      armorPointsPerTrooper: 6,
      armorType: BAArmorType.STEALTH_IMPROVED,
      jumpMP: 3,
      umuMP: 4,
      hasCamoSystem: true,
    }),
  );
  expect(b.total).toBeCloseTo(28.8, 10);
});

interface OracleRow {
  concreteFamily: string;
  path: string;
  sha256: string;
  construction: { valid: boolean };
}
const corpus = process.env.BA_BV_CORPUS;
const oracle = process.env.BA_BV_ORACLE;
(corpus && oracle ? it : it.skip)(
  'all 1,188 pinned BA sources produce positive finite BV through both paths',
  () => {
    if (!oracle || !corpus) throw new Error('Missing pinned corpus paths');
    const rows: OracleRow[] = readFileSync(oracle, 'utf8')
      .trim()
      .split('\n')
      .map((line: string) => JSON.parse(line));
    const ba = rows.filter((row) => row.concreteFamily === 'BattleArmor');
    expect(ba).toHaveLength(1188);
    expect(ba.filter((row) => row.construction.valid)).toHaveLength(1184);
    for (const row of ba) {
      const bytes = readFileSync(join(corpus, row.path));
      // Oracle hashes LF-normalized source bytes, as the pinned exporter does.
      expect(
        createHash('sha256')
          .update(bytes.toString('utf8').replace(/\r\n/g, '\n'))
          .digest('hex'),
      ).toBe(row.sha256);
      const unit = load(bytes.toString('utf8'));
      const dispatched = calculateBattleValueForUnit(unit);
      const bv = handler.calculateBV(unit);
      expect({ path: row.path, kind: dispatched?.kind }).toEqual({
        path: row.path,
        kind: 'battlearmor',
      });
      expect(dispatched?.breakdown.final).toBe(bv);
      expect(Number.isFinite(bv)).toBe(true);
      expect(bv).toBeGreaterThan(0);
    }
  },
);
