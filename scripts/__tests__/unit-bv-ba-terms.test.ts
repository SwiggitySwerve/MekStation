import { BlkParserService } from '../../src/services/conversion/BlkParserService';
import { BattleArmorUnitHandler } from '../../src/services/units/handlers/BattleArmorUnitHandler';
import { baseInput } from '../../src/utils/construction/battlearmor/__tests__/battleArmorBV.test.helpers';
import {
  battleArmorBVTerms,
  calculateBattleArmorBV,
} from '../../src/utils/construction/battlearmor/battleArmorBV';
import { calculateBattleValueForUnit } from '../../src/utils/construction/battleValueCalculations';

test('BA exposes movement factors even on empty pools and the native squad factor', () => {
  const b = calculateBattleArmorBV(
    baseInput({
      armorPointsPerTrooper: 0,
      groundMP: 0,
      jumpMP: 0,
      squadSize: 4,
    }),
  );
  expect(b).toMatchObject({
    squadFactor: 5.2,
    perTrooper: {
      defensive: { defensiveFactor: 1.1 },
      offensive: { speedFactor: 0.44 },
    },
  });
});

test('BA trace carries each modeled trooper without inventing native mount identities', () => {
  const b = calculateBattleArmorBV(baseInput({ squadSize: 4 }));
  const trace = battleArmorBVTerms(b);
  expect(trace).toMatchObject({
    'squad.strength': 4,
    'trooper.4.baseBV': b.perTrooper.total,
    'trooper.4.armorBV': b.perTrooper.defensive.armorBV,
  });
  expect(trace['trooper.5.baseBV']).toBeUndefined();
  expect(trace['weapon.unknown']).toBeUndefined();
});

// battlearmor/3058Uu/Cavalier BA [SRM] (Sqd4).blk, reduced to its BV tags (see
// battleArmorBV.test.ts). Pinned Java trace (L-ORC2b run-1, MegaMek 48fcb2f64):
// ammo.available.SRM:1 = 0.08, ammo.cap.SRM:1 = 15, identical for trooper.1..4.
const handler = new BattleArmorUnitHandler();
const blk = (tags: Record<string, string>) =>
  Object.entries({
    UnitType: 'BattleArmor',
    Name: 'Fixture',
    year: '3132',
    ...tags,
  })
    .map(([tag, value]) => `<${tag}>\n${value}\n</${tag}>`)
    .join('\n');
const cavalierTrace = (squad: string) => {
  const parsed = new BlkParserService().parse(
    blk({
      type: 'IS Level 2',
      motion_type: 'Jump',
      cruiseMP: '1',
      jumpingMP: '3',
      armor_type: '28',
      armor: '9',
      'Trooper Count': '4',
      weightclass: '2',
      chassis: 'biped',
      'Squad Equipment': squad,
      slotless_equipment: 'BAJumpJet',
    }),
  );
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const loaded = handler.parse(parsed.data.document);
  if (!loaded.success) throw new Error(loaded.error.errors.join('; '));
  const result = calculateBattleValueForUnit(loaded.data.unit);
  if (result?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
  return {
    breakdown: result.breakdown,
    trace: battleArmorBVTerms(result.breakdown),
  };
};
const ammoKeys = (trace: Record<string, number | undefined>) =>
  Object.keys(trace)
    .filter((key) => /(?:^|\.)ammo\.(?:available|cap)\./.test(key))
    .sort();

test('BA ammo pools project the Java available and cap terms for the squad and every trooper', () => {
  const { trace } = cavalierTrace(
    'ISBASRM1:RA\nBA-SRM1 Ammo:Body:Shots4#\nBABattleClaw:LA',
  );
  expect(trace['ammo.available.SRM:1']).toBeCloseTo(0.08, 10);
  expect(trace['ammo.cap.SRM:1']).toBe(15);
  for (const trooper of [1, 2, 3, 4]) {
    expect(trace[`trooper.${trooper}.ammo.available.SRM:1`]).toBeCloseTo(
      0.08,
      10,
    );
    expect(trace[`trooper.${trooper}.ammo.cap.SRM:1`]).toBe(15);
  }
  expect(trace['trooper.5.ammo.cap.SRM:1']).toBeUndefined();
  expect(ammoKeys(trace)).toHaveLength(10);
});

test('BA ammo.available is the pre-cap pool even when the cap trims ammoBV', () => {
  // 10 kg * 1000 shots / 1000 * 2 BV per ton = 20 > the 15 launcher cap.
  const { breakdown, trace } = cavalierTrace(
    'ISBASRM1:RA\nBA-SRM1 Ammo:Body:Shots1000#\nBABattleClaw:LA',
  );
  expect(breakdown.perTrooper.offensive.ammoBV).toBe(15);
  expect(trace['ammo.available.SRM:1']).toBe(20);
  expect(trace['ammo.cap.SRM:1']).toBe(15);
});

test('BA ammo terms follow Java presence: a bare launcher has a cap only, bare ammo has availability only', () => {
  // BVCalculator.java:1189-1243 assembleAmmo builds the two maps independently.
  const launcher = cavalierTrace('ISBASRM1:RA\nBABattleClaw:LA').trace;
  expect(launcher['ammo.cap.SRM:1']).toBe(15);
  expect(launcher['ammo.available.SRM:1']).toBeUndefined();
  const bare = cavalierTrace(
    'BA-SRM1 Ammo:Body:Shots4#\nBABattleClaw:LA',
  ).trace;
  expect(bare['ammo.available.SRM:1']).toBeCloseTo(0.08, 10);
  expect(bare['ammo.cap.SRM:1']).toBeUndefined();
  // A one-shot launcher is excluded from the cap map (BVCalculator.java:1225-1232).
  const oneShot = cavalierTrace(
    'ISBASRM1OS:RA\nBA-SRM1 Ammo:Body:Shots4#\nBABattleClaw:LA',
  ).trace;
  expect(oneShot['ammo.cap.SRM:1']).toBeUndefined();
  expect(oneShot['ammo.available.SRM:1']).toBeCloseTo(0.08, 10);
});

test('BA weapons without a capping ammo type create no cap term', () => {
  // BAMGWeapon.java:61 and ISBAPlasmaRifle.java:64 are ammoType NA; the Taser is
  // intrinsically one-shot (ISBATaser.java:84). assembleAmmo skips all three.
  const machineGun = cavalierTrace('CLBAMG:RA\nBABattleClaw:LA');
  expect(ammoKeys(machineGun.trace)).toEqual([]);
  const taser = cavalierTrace('ISBATaser:RA\nBABattleClaw:LA');
  expect(ammoKeys(taser.trace)).toEqual([]);
  // Reporting only: the launcher still caps the pool of a missile suit.
  const missile = cavalierTrace(
    'ISBASRM1:RA\nCLBAMG:LA\nBA-SRM1 Ammo:Body:Shots4#',
  );
  expect(ammoKeys(missile.trace).sort()).toEqual(
    [1, 2, 3, 4]
      .flatMap((i) => [
        `trooper.${i}.ammo.available.SRM:1`,
        `trooper.${i}.ammo.cap.SRM:1`,
      ])
      .concat(['ammo.available.SRM:1', 'ammo.cap.SRM:1'])
      .sort(),
  );
});

test('BA without ammo pools or launchers emits no ammo terms', () => {
  expect(ammoKeys(cavalierTrace('BABattleClaw:LA').trace)).toEqual([]);
  expect(
    ammoKeys(battleArmorBVTerms(calculateBattleArmorBV(baseInput()))),
  ).toEqual([]);
});
