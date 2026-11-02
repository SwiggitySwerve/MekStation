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
import { buildBattleArmorBVInputFromUnit } from '../battleArmorBVAdapter';
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
    expect(getBAManipulatorMeleeBV(BAManipulator.VIBRO_CLAW)).toBe(1);
    expect(getBAManipulatorMeleeBV(BAManipulator.HEAVY_CLAW)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.BATTLE_CLAW)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.BASIC_CLAW)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.NONE)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.CARGO_LIFTER)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.INDUSTRIAL_DRILL)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.MAGNET)).toBe(1);
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
          canAntiMek: true,
          manipulators: {
            left: BAManipulator.VIBRO_CLAW,
            right: BAManipulator.VIBRO_CLAW,
          },
        }),
      ).manipulatorBV,
    ).toBe(2);

    expect(
      calculateBAOffensiveBV(
        baseInput({
          canAntiMek: true,
          manipulators: {
            left: BAManipulator.BATTLE_CLAW,
            right: BAManipulator.HEAVY_CLAW,
          },
        }),
      ).manipulatorBV,
    ).toBe(0);
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
    expect(total.manipulatorBV).toBe(0);
    expect(total.total).toBeCloseTo(16.2, 10);
  });
});

describe('calculateBattleArmorBV squad metadata', () => {
  it('preserves pilot and squad metadata independently of valuation', () => {
    const elite = calculateBattleArmorBV(
      baseInput({ squadSize: 5, gunnery: 3, piloting: 4 }),
    );
    expect(elite.squadSize).toBe(5);
    expect(elite.pilotMultiplier).toBe(1.32);
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
    expect(after - before).toBeCloseTo(11.34, 10); // 21 * speed factor 0.54 at MP 1.
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
  expect(result.breakdown.defensive).toBeCloseTo(25.6, 10);
  expect(result.breakdown.offensive).toBe(0);
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

// MegaMek 48fcb2f64 BattleArmorBVCalculator.java:193-204.
it.each([
  [1, 10.25],
  [4, 53.3],
  [5, 71.75],
  [6, 92.25],
])(
  'uses shooting-strength scaling for %s troopers without intermediate rounding',
  (squadSize, expected) => {
    // At ground MP 5 the zero-armor defense is 1.3 and offensive speed is 1.
    const b = calculateBattleArmorBV(
      baseInput({
        squadSize,
        armorPointsPerTrooper: 0,
        groundMP: 5,
        jumpMP: 0,
        weapons: [{ id: 'fixture', bvOverride: 8.95 }],
      }),
    );
    expect(b.perTrooper.total).toBeCloseTo(10.25, 10);
    expect(b.squadTotal).toBeCloseTo(expected, 10);
    expect(b.final).toBe(Math.round(expected));
  },
);

function armedAchileus(weapon: string, extra = ''): string {
  return (
    achileus +
    `
<Squad Equipment>
BABasicManipulator:LA
BABasicManipulator:RA
${weapon}
</Squad Equipment>
${extra}`
  );
}

// MegaMek 48fcb2f64 BattleArmorBVCalculator.java:133-160,334-337;
// real Achileus [David] oracle: 7 BV weapon, doubled anti-Mek, speed .77.
it.each([
  ['BADavidLightGaussRifle:RA', 10.78, 189],
  ['BADavidLightGaussRifle:Body', 5.39, 161],
  ['BADavidLightGaussRifle:RA:SSWM', 2.695, 147],
])(
  'values native BA mount %s through the existing resolver',
  (weapon, offense, total) => {
    const unit = load(armedAchileus(String(weapon)));
    const b = calculateBattleValueForUnit(unit);
    if (b?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
    expect(b.breakdown.offensive).toBeCloseTo(Number(offense), 10);
    expect(b.breakdown.final).toBe(total);
    expect(handler.calculateBV(unit)).toBe(total);
  },
);

it('averages a weapon carried by only one trooper without copying it to the squad', () => {
  const unit = load(
    armedAchileus(
      '',
      '<Trooper 2 Equipment>\nBADavidLightGaussRifle:RA\n</Trooper 2 Equipment>',
    ),
  );
  const b = calculateBattleValueForUnit(unit);
  if (b?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
  expect(b.breakdown.offensive).toBeCloseTo(2.695, 10);
  expect(b.breakdown.final).toBe(147);
});

it.each(['quad', 'heavy', 'umu'])(
  'disallows anti-Mek offense for %s',
  (caseName) => {
    let source = armedAchileus('BADavidLightGaussRifle:RA');
    if (caseName === 'quad') source = source.replace('biped', 'quad');
    if (caseName === 'heavy')
      source = source.replace('<weightclass>\n1', '<weightclass>\n3');
    if (caseName === 'umu')
      source = source.replace('<motion_type>\nJump', '<motion_type>\nUMU');
    const b = calculateBattleValueForUnit(load(source));
    if (b?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
    expect(b.breakdown.offensive).toBeCloseTo(5.39, 10);
  },
);

it('keeps native ammo without per-shot mass and unknown identities explicit', () => {
  const input = buildBattleArmorBVInputFromUnit(
    load(armedAchileus('IS MRM 1 Ammo:Shots10#\nUnknown BA Fixture:RA')),
  );
  expect(input.unresolvedEquipment).toEqual(
    expect.arrayContaining([
      expect.stringContaining('kgPerShot'),
      expect.stringContaining('Unknown BA Fixture'),
    ]),
  );
  expect(calculateBAOffensiveBV(input).ammoBV).toBe(0);
});

it.each([
  [0, 0, 4.4],
  [1, 3, 7.7],
  [5, 0, 10],
])(
  'uses max movement for the BA offensive speed factor (%s/%s)',
  (groundMP, jumpMP, expected) => {
    expect(
      calculateBAOffensiveBV(
        baseInput({
          groundMP,
          jumpMP,
          weapons: [{ id: 'valued-fixture', bvOverride: 10 }],
        }),
      ).total,
    ).toBeCloseTo(expected, 10);
  },
);

it('counts native vibro claws only in eligible anti-Mek offense', () => {
  const source =
    achileus + '\n<Squad Equipment>\nBABattleClawVibro:LA\n</Squad Equipment>';
  const b = calculateBattleValueForUnit(load(source));
  if (b?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
  expect(b.breakdown.perTrooper.offensive.weaponBV).toBe(0);
  expect(b.breakdown.perTrooper.offensive.manipulatorBV).toBe(1);
  expect(b.breakdown.offensive).toBeCloseTo(0.77, 10);
});

it('applies fresh IS body-missile burden without burdening Clan suits', () => {
  const source = armedAchileus(
    'BADavidLightGaussRifle:RA\nISBASRM1:Body\nBA-SRM1 Ammo:Body:Shots10#',
  );
  expect(load(source).canAntiMech).toBe(false);
  const clan = source
    .replace('<type>\nIS Level 2', '<type>\nClan Level 2')
    .replaceAll('Squad Equipment', 'Point Equipment');
  expect(load(clan).canAntiMech).toBe(true);
});

it('does not duplicate missile or APM weapons in the anti-Mek pool', () => {
  const missile = calculateBattleValueForUnit(
    load(armedAchileus('CLBASRM1:RA')),
  );
  if (missile?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
  expect(missile.breakdown.perTrooper.offensive.weaponBV).toBe(15);
  const apm = buildBattleArmorBVInputFromUnit(
    load(armedAchileus('Machine Gun (Bearhunter AC):RA:APM')),
  );
  expect(apm.weapons[0].antiMek).toBe(false);
  expect(
    buildBattleArmorBVInputFromUnit(
      load(armedAchileus('InfantryAssaultRifle:APM')),
    ).unresolvedEquipment,
  ).toEqual([]);
});

it('requires a mechanized-BA grip for anti-Mek attacks', () => {
  const unit = load(
    achileus +
      '\n<Squad Equipment>\nBADavidLightGaussRifle:RA\n</Squad Equipment>',
  );
  expect(unit.canAntiMech).toBe(false);
});

it('reports unsupported mount qualifiers and never treats native ammo as a ton bin', () => {
  const input = buildBattleArmorBVInputFromUnit(
    load(armedAchileus('BADavidLightGaussRifle:UNKNOWN')),
  );
  expect(input.weapons).toHaveLength(0);
  expect(input.unresolvedEquipment).toEqual(
    expect.arrayContaining([expect.stringContaining('unsupported qualifier')]),
  );
  expect(
    calculateBAOffensiveBV(baseInput({ ammo: [{ id: 'IS MRM 1 Ammo' }] }))
      .ammoBV,
  ).toBe(0);
});

it('uses two armored gloves only for light or PA(L) anti-Mek grips', () => {
  const one =
    achileus + '\n<Squad Equipment>\nBAArmoredGlove:LA\n</Squad Equipment>';
  const two = one.replace(
    'BAArmoredGlove:LA',
    'BAArmoredGlove:LA\nBAArmoredGlove:RA',
  );
  expect(load(one).canAntiMech).toBe(false);
  expect(load(two).canAntiMech).toBe(true);
  expect(
    load(two.replace('<weightclass>\n1', '<weightclass>\n2')).canAntiMech,
  ).toBe(false);
});

it.each(['Trooper 2', 'Squad'])(
  'excludes infantry weapons from the personal/support section at %s',
  (location) => {
    const source =
      achileus +
      `\n<${location} Equipment>\nMachine Gun (Bearhunter AC):RA:APM${location === 'Squad' ? ':SSWM' : ''}\n</${location} Equipment>`;
    const b = calculateBattleValueForUnit(load(source));
    if (b?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
    expect(b.breakdown.offensive).toBe(0);
  },
);
