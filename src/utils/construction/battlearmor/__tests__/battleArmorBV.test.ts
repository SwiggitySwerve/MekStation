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

// Real sources (mm-data 50f7efef), reduced to their BV tags; UL-16b oracle totals.
// BattleArmorBVCalculator.java:280-326: improved sensors +1, active probe +1,
// the first ECM +1 (Angel +2), plus AMS BV, all before the defensive factor.
const blk = (tags: Record<string, string>) =>
  Object.entries({
    UnitType: 'BattleArmor',
    Name: 'Fixture',
    year: '3132',
    ...tags,
  })
    .map(([tag, value]) => `<${tag}>\n${value}\n</${tag}>`)
    .join('\n');
it.each([
  // battlearmor/XTRs/Republic III/Aegis Point Defense Suit (Sqd4).blk
  [
    'APDS (AMS, not offense)',
    blk({
      type: 'IS Level 3',
      motion_type: 'Leg',
      cruiseMP: '3',
      armor_type: '33',
      armor: '6',
      'Trooper Count': '4',
      weightclass: '2',
      chassis: 'biped',
      'Squad Equipment':
        'BABasicManipulator:LA\nBABasicManipulator:RA\nBAAPMount:LA\nInfantryAssaultRifle:APM\nISBAAPDS:RA',
    }),
    7,
    34.5,
    179,
  ],
  // battlearmor/3145/Marik/Leonidas BA (David LGR) (Sqd4).blk
  [
    'Angel ECM',
    blk({
      type: 'IS Level 2',
      motion_type: 'Leg',
      cruiseMP: '3',
      armor_type: '32',
      armor: '6',
      'Trooper Count': '4',
      weightclass: '2',
      chassis: 'biped',
      'Squad Equipment':
        'BADavidLightGaussRifle:RA\nBAAPMount:RA\nInfantryAssaultRifle:APM:RA\nBAHeavyBattleClaw:LA\nBAISAngelECMSuite:Body',
      slotless_equipment: 'BAJumpJet',
    }),
    2,
    25.2,
    187,
  ],
  // battlearmor/3058Uu/Achileus BA (Sqd 4) [WoB].blk
  [
    'improved sensors and ECM',
    blk({
      type: 'IS Level 3',
      motion_type: 'Jump',
      cruiseMP: '1',
      jumpingMP: '3',
      armor_type: '33',
      armor: '6',
      'Trooper Count': '4',
      weightclass: '1',
      chassis: 'biped',
      'Squad Equipment':
        'BAAPMount:LA\nInfantryAssaultRifle:APM:LA\nISImprovedSensors:Body\nIS BA ECM:Body\nBABasicManipulator:LA\nBABasicManipulator:RA',
      slotless_equipment: 'BAJumpJet',
    }),
    2,
    28.8,
    150,
  ],
  // battlearmor/TRO VA/Resgate PA(L) (Sqd4).blk
  [
    'Clan improved sensors',
    blk({
      type: 'Clan Level 2',
      motion_type: 'Jump',
      cruiseMP: '3',
      jumpingMP: '3',
      armor_type: '35',
      armor: '2',
      'Trooper Count': '4',
      weightclass: '0',
      chassis: 'biped',
      'Point Equipment':
        'BASalvageArm:LA\nBABasicManipulator:RA\nCLImprovedSensors:Body',
      slotless_equipment: 'BAJumpJet',
    }),
    1,
    11.7,
    61,
  ],
])(
  'adds BA defensive systems before the factor: %s',
  (_name, source, equipmentBV, defense, total) => {
    const unit = load(source);
    const b = calculateBattleValueForUnit(unit);
    if (b?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
    expect(b.breakdown.perTrooper.defensive.defensiveEquipmentBV).toBe(
      equipmentBV,
    );
    expect(b.breakdown.defensive).toBeCloseTo(defense, 10);
    expect(b.breakdown.final).toBe(total);
    expect(handler.calculateBV(unit)).toBe(total);
  },
);

it('counts only the first ECM and one bonus per sensor kind', () => {
  // BattleArmorBVCalculator.java:285-304; ISBALightActiveProbe is F_BAP
  // (MiscType.java:10941-10951), not improved sensors.
  const unit = load(
    armedAchileus(
      'IS BA ECM:Body\nBAISAngelECMSuite:Body\nISImprovedSensors:Body\nISImprovedSensors:Body\nISBALightActiveProbe:Body',
    ),
  );
  expect(buildBattleArmorBVInputFromUnit(unit).defensiveEquipmentBV).toBe(3);
});

// Real sources (mm-data 50f7efef) reduced to their BV tags; UL-16b oracle
// values. BV movement: BattleArmor.java:446-567, Infantry.java:301-308 and
// BVCalculator.java:307-343 under MPCalculationSetting.BV_CALCULATION.
const movementSource = (tags: Record<string, string>) =>
  Object.entries({
    UnitType: 'BattleArmor',
    Name: 'Fixture',
    year: '3145',
    armor_type: '28',
    'Trooper Count': '4',
    chassis: 'biped',
    ...tags,
  })
    .map(([tag, value]) => `<${tag}>\n${value}\n</${tag}>`)
    .join('\n');
it.each([
  // battlearmor/3075/Afreet Med BA (JF) (Sqd4).blk: jump booster, jump 3 -> 4.
  [
    'jump booster',
    movementSource({
      type: 'Clan Level 2',
      motion_type: 'Jump',
      cruiseMP: '1',
      jumpingMP: '3',
      armor_type: '35',
      armor: '5',
      weightclass: '2',
      'Point Equipment':
        'CLBAAPGaussRifle:RA\nBABattleClawVibro:LA\nBABattleClawVibro:RA\nBAJumpBooster:Body',
      slotless_equipment: 'BAJumpJet',
    }),
    24.05,
    38.72,
    326,
  ],
  // battlearmor/3058Uu/Kage Light BA (Vibro-Claw) (Sqd4).blk: partial wing.
  [
    'partial wing',
    movementSource({
      type: 'IS Level 2',
      motion_type: 'Jump',
      cruiseMP: '1',
      jumpingMP: '3',
      armor_type: '31',
      armor: '5',
      weightclass: '1',
      'Squad Equipment':
        'BABattleClawVibro:LA\nBABattleClawVibro:RA\nBAPartialWing:Body',
      slotless_equipment: 'BAJumpJet',
    }),
    20.25,
    1.76,
    114,
  ],
  // battlearmor/3145/Clans/Buraq Fast BA (HK) (Sqd4).blk without its improved
  // sensors: medium myomer booster, walk 5 -> 7 (TMM 3, speed 1.24).
  // (18.5 * 1.4 + 4 * 1.24) * 5.2 = 160.472.
  [
    'myomer booster',
    movementSource({
      type: 'Clan Level 3',
      motion_type: 'Leg',
      cruiseMP: '5',
      armor: '7',
      weightclass: '2',
      chassis: 'quad',
      'Point Equipment':
        'CLBAMyomerBooster:Body\nMachine Gun (Bearhunter AC):Body',
    }),
    25.9,
    4.96,
    160,
  ],
  // battlearmor/3145/Davion/Sea Fox Amphibious Armor (Sqd4).blk: UMU motion
  // reads jumpingMP as UMU MP; the mechanical booster adds walk 1 and jump 1.
  [
    'UMU with mechanical jump booster',
    movementSource({
      type: 'Mixed (IS Chassis) Experimental',
      motion_type: 'UMU',
      cruiseMP: '2',
      jumpingMP: '3',
      armor_type: '31',
      armor: '5',
      weightclass: '1',
      'Squad Equipment':
        'BACuttingTorch:RA\nISBASRM1OS:LA\nCLBALightMG:Body\nBAExtendedLifeSupport:Body\nBAMechanicalJumpBooster:Body\nBAArmoredGlove:RA\nBAArmoredGlove:LA\nInfantryAssaultRifle:APM:RA',
      slotless_equipment: 'BAUMU',
    }),
    18.9,
    6.16,
    130,
  ],
])('uses Java BV movement for %s', (_name, source, defense, offense, total) => {
  const unit = load(source);
  const b = calculateBattleValueForUnit(unit);
  if (b?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
  expect(b.breakdown.defensive).toBeCloseTo(defense, 10);
  expect(b.breakdown.offensive).toBeCloseTo(offense, 10);
  expect(b.breakdown.final).toBe(total);
  expect(handler.calculateBV(unit)).toBe(total);
});

it('gives heavy myomer boosters one MP and mechanical boosters none on top', () => {
  // BattleArmor.java:449-455: +1 at heavy or above, +2 below; a mechanical
  // jump booster adds walk MP only without a myomer booster.
  const base = movementSource({
    type: 'Clan Level 3',
    motion_type: 'Leg',
    cruiseMP: '2',
    armor: '0',
    weightclass: '3',
    'Point Equipment': 'CLBAMyomerBooster:Body\nBAMechanicalJumpBooster:Body',
  });
  const input = buildBattleArmorBVInputFromUnit(load(base));
  expect(input.groundMP).toBe(3);
  expect(input.jumpMP).toBe(1);
});

// battlearmor/3058Uu/Fa Shih BA [Flamer] (Sqd4).blk, reduced to its BV tags.
// Each trooper's own ISBAMineDispenser (8 BV) is offensive equipment for that
// trooper only: BattleArmorBVCalculator.java:223-226, BVCalculator.java:978-1043.
const faShih = blk({
  type: 'IS Level 3',
  motion_type: 'Jump',
  cruiseMP: '1',
  jumpingMP: '3',
  armor_type: '28',
  armor: '7',
  'Trooper Count': '4',
  weightclass: '2',
  chassis: 'biped',
  'Squad Equipment':
    'CLBAFlamer:RA\nBA-Magnetic Clamp:Body\nBAAPMount:LA\nInfantryAssaultRifle:APM:LA\nBABasicManipulatorMineClearance:LA\nBABasicManipulatorMineClearance:RA',
  'Trooper 1 Equipment': 'ISBAMineDispenser:Body',
  'Trooper 2 Equipment': 'ISBAMineDispenser:Body',
  'Trooper 3 Equipment': 'ISBAMineDispenser:Body',
  'Trooper 4 Equipment': 'ISBAMineDispenser:Body',
  slotless_equipment: 'BAJumpJet',
});

it('counts trooper-located offensive equipment for its trooper only', () => {
  const unit = load(faShih);
  const b = calculateBattleValueForUnit(unit);
  if (b?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
  // UL-16b: (5 + 5 anti-Mek + 8) * 0.77 = 13.86; total 197.
  expect(b.breakdown.perTrooper.offensive.offensiveEquipmentBV).toBe(8);
  expect(b.breakdown.offensive).toBeCloseTo(13.86, 10);
  expect(b.breakdown.final).toBe(197);
  expect(handler.calculateBV(unit)).toBe(197);
  // The same equipment in the squad location is not this trooper's.
  const squad = faShih
    .replace(
      /<Trooper \d Equipment>\nISBAMineDispenser:Body\n<\/Trooper \d Equipment>\n?/g,
      '',
    )
    .replace(
      'BAJumpJet\n</slotless_equipment>',
      'BAJumpJet\n</slotless_equipment>\n<Squad Equipment>\nISBAMineDispenser:Body\n</Squad Equipment>',
    );
  expect(
    buildBattleArmorBVInputFromUnit(load(squad)).offensiveEquipmentBV,
  ).toBe(0);
});

// battlearmor/3075/Asura Med BA(Sqd4).blk: a body-mounted BA rocket launcher
// is a one-shot missile with linked ammo, so the IS suit is burdened and makes
// no anti-Mek attacks (BattleArmor.java:954-988; ISBARL4.java:72;
// RLWeapon.java:55-69; MissileWeapon.java:69).
it('treats a body-mounted IS BA rocket launcher as a burden', () => {
  const unit = load(
    blk({
      type: 'IS Level 2',
      motion_type: 'Jump',
      cruiseMP: '1',
      jumpingMP: '3',
      armor_type: '30',
      armor: '7',
      'Trooper Count': '4',
      weightclass: '2',
      chassis: 'biped',
      'Squad Equipment':
        'CLBAMedium Recoilless Rifle:RA\nBABattleClaw:LA\nISBARL4:Body',
      slotless_equipment: 'BAJumpJet',
    }),
  );
  expect(unit.canAntiMech).toBe(false);
  const b = calculateBattleValueForUnit(unit);
  if (b?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
  // UL-16b: 24.05 + (19 + 5) * 0.77 = 42.53 per trooper; total 221.
  expect(b.breakdown.offensive).toBeCloseTo(18.48, 10);
  expect(b.breakdown.final).toBe(221);
});
