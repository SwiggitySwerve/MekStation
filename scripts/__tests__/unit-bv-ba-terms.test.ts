import { BlkParserService } from '../../src/services/conversion/BlkParserService';
import { BattleArmorUnitHandler } from '../../src/services/units/handlers/BattleArmorUnitHandler';
import { baseInput } from '../../src/utils/construction/battlearmor/__tests__/battleArmorBV.test.helpers';
import {
  battleArmorBVTerms,
  battleArmorNativeWeaponBV,
  calculateBattleArmorBV,
  type BANativeWeaponMount,
} from '../../src/utils/construction/battlearmor/battleArmorBV';
import { projectBAMounts } from '../../src/utils/construction/battlearmor/battleArmorMounts';
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

// ---------------------------------------------------------------------------
// B2: native per-mount weapon terms
// ---------------------------------------------------------------------------
// Java (java_bv_terms.py) keys each processed weapon
// `weapon.<equipmentNum>.<locationAbbr>.<internalName>` and snapshots every
// trooper. The comparator folds a location to a count plus a descending value
// list, so these tests pin values per native location, not equipment numbers.
// Section order follows BattleArmorBVCalculator.java:133-160: Weapons, Squad
// Support, Anti-Mek; a mount that qualifies for several passes reports their sum.

const DAVID = 'BADavidLightGaussRifle'; // 7 BV (Achileus [David] oracle).
const SRM1 = 'ISBASRM1'; // 15 BV (Cavalier oracle).
const achileusTags = {
  type: 'IS Level 2',
  motion_type: 'Jump',
  cruiseMP: '1',
  jumpingMP: '3',
  armor_type: '33',
  armor: '6',
  'Trooper Count': '4',
  weightclass: '1',
  chassis: 'biped',
};
const manipulators = 'BABasicManipulator:LA\nBABasicManipulator:RA';
const traceOf = (tags: Record<string, string>) => {
  const parsed = new BlkParserService().parse(
    blk({ ...achileusTags, ...tags }),
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
/** Folded per-location values of `[trooper.N.]weapon.*` terms, descending. */
const weaponValues = (
  trace: Record<string, number | undefined>,
  prefix = '',
): Record<string, number[]> => {
  const out: Record<string, number[]> = {};
  const pattern = new RegExp(
    `^${prefix.replace('.', '\\.')}weapon\\.\\d+\\.([^.]+)\\.`,
  );
  for (const [key, value] of Object.entries(trace)) {
    const location = pattern.exec(key)?.[1];
    if (location !== undefined && value !== undefined)
      (out[location] ??= []).push(value);
  }
  for (const values of Object.values(out)) values.sort((a, b) => b - a);
  return out;
};
const weaponKeys = (trace: Record<string, number | undefined>) =>
  Object.keys(trace).filter((key) => /(?:^|\.)weapon\./.test(key));

test('BA squad weapons project weapon.<n>.Squad terms for the squad and every trooper', () => {
  // Weapons pass 7 + Anti-Mek pass 7: the Java Achileus [David] trace value is 14.
  const { trace } = traceOf({
    'Squad Equipment': `${manipulators}\n${DAVID}:RA`,
  });
  expect(weaponValues(trace)).toEqual({ Squad: [14] });
  for (const k of [1, 2, 3, 4])
    expect(weaponValues(trace, `trooper.${k}.`)).toEqual({ Squad: [14] });
  expect(weaponKeys(trace).filter((key) => key.includes('trooper.5'))).toEqual(
    [],
  );
  expect(weaponKeys(trace)).toHaveLength(5);
});

test('BA without anti-Mek eligibility, body mounts and missiles take the Weapons pass only', () => {
  const squad = (equipment: string, tags: Record<string, string> = {}) =>
    weaponValues(
      traceOf({ 'Squad Equipment': `${manipulators}\n${equipment}`, ...tags })
        .trace,
    );
  expect(squad(`${DAVID}:RA`, { weightclass: '3' })).toEqual({ Squad: [7] });
  expect(squad(`${DAVID}:Body`)).toEqual({ Squad: [7] });
  expect(squad(`${SRM1}:RA`)).toEqual({ Squad: [15] });
});

test('BA squad-support mounts divide by the shooting strength in each pass', () => {
  // Support 7 / 4 + Anti-Mek 7 / 4: the pinned 2.695 offense is 3.5 * 0.77.
  const { trace } = traceOf({
    'Squad Equipment': `${manipulators}\n${DAVID}:RA:SSWM`,
  });
  expect(weaponValues(trace)).toEqual({ Squad: [3.5] });
  expect(weaponValues(trace, 'trooper.3.')).toEqual({ Squad: [3.5] });
});

test('BA trooper-located weapons appear only in their own trooper list', () => {
  const { trace } = traceOf({
    'Squad Equipment': manipulators,
    'Trooper 2 Equipment': `${DAVID}:RA`,
  });
  // Support pass 7 + Anti-Mek pass 7 for trooper 2 alone; trooper 1 has none.
  expect(weaponValues(trace, 'trooper.2.')).toEqual({ 'Trooper 2': [14] });
  for (const k of [1, 3, 4])
    expect(weaponValues(trace, `trooper.${k}.`)).toEqual({});
  // Squad-level terms are trooper 1's snapshot.
  expect(weaponValues(trace)).toEqual({});
});

test('BA squad-level terms equal trooper 1 including its own mounts', () => {
  const { trace } = traceOf({
    'Squad Equipment': manipulators,
    'Trooper 1 Equipment': `${DAVID}:RA`,
    'Trooper 2 Equipment': `${DAVID}:RA`,
  });
  expect(weaponValues(trace)).toEqual({ 'Trooper 1': [14] });
  expect(weaponValues(trace, 'trooper.1.')).toEqual({ 'Trooper 1': [14] });
  expect(weaponValues(trace, 'trooper.2.')).toEqual({ 'Trooper 2': [14] });
});

test('BA support mounts reach every trooper under their own native location', () => {
  // Java supportFilter matches isSquadSupportWeapon at any location, so trooper 1
  // lists trooper 2's support mount at 7 / 4 (support pass only: not its trooper).
  const { trace } = traceOf({
    'Squad Equipment': manipulators,
    'Trooper 2 Equipment': `${DAVID}:RA:SSWM`,
  });
  expect(weaponValues(trace, 'trooper.1.')).toEqual({ 'Trooper 2': [1.75] });
  expect(weaponValues(trace, 'trooper.2.')).toEqual({ 'Trooper 2': [3.5] });
});

test('BA vibro claws are Anti-Mek only and need eligibility', () => {
  const claw = (tags: Record<string, string> = {}) =>
    weaponValues(
      traceOf({ 'Squad Equipment': 'BABattleClawVibro:LA', ...tags }).trace,
    );
  expect(claw()).toEqual({ Squad: [1] });
  expect(claw({ weightclass: '3' })).toEqual({});
});

test('BA keeps the Clan Point location label and distinct keys for equal weapons', () => {
  const { trace } = traceOf({
    type: 'Clan Level 2',
    'Point Equipment': `${manipulators}\n${DAVID}:RA\n${SRM1.replace('IS', 'CL')}:LA`,
  });
  expect(weaponValues(trace)).toEqual({ Point: [15, 14] });
  expect(
    weaponKeys(trace).filter((key) => !key.startsWith('trooper.')),
  ).toEqual(
    expect.arrayContaining([expect.stringMatching(/^weapon\.\d+\.Point\./)]),
  );
  expect(new Set(weaponKeys(trace)).size).toBe(weaponKeys(trace).length);
});

test('BA non-weapons create no weapon terms', () => {
  // Aegis suit: AMS is defensive, the assault rifle is an APM and sensors/ECM
  // are not offense (BVCalculator.java:943; BattleArmorBVCalculator.java:115-120).
  const { trace } = traceOf({
    'Squad Equipment': `${manipulators}\nBAAPMount:LA\nInfantryAssaultRifle:APM\nISBAAPDS:RA\nISImprovedSensors:Body\nIS BA ECM:Body\n${SRM1}:RA\nBA-SRM1 Ammo:Body:Shots4#\nUnknown BA Fixture:RA`,
  });
  expect(weaponValues(trace)).toEqual({ Squad: [15] });
  expect(
    weaponKeys(trace).filter((key) => !key.startsWith('trooper.')),
  ).toHaveLength(1);
});

test('BA without native weapon facts keeps the old trace', () => {
  expect(
    weaponKeys(battleArmorBVTerms(calculateBattleArmorBV(baseInput()))),
  ).toEqual([]);
  const empty = calculateBattleArmorBV(baseInput({ nativeWeapons: [] }));
  expect(weaponKeys(battleArmorBVTerms(empty))).toEqual([]);
});

test('BA mounts without a native unit location contribute no native weapon facts', () => {
  const mount = (unitLocation?: string) => ({
    id: 'm',
    equipmentId: `${DAVID}:RA`,
    name: DAVID,
    unitLocation,
    location: 'Right Arm' as never,
    isAPMount: false,
    isTurretMounted: false,
    isModular: false,
  });
  const located = projectBAMounts([mount('Squad')], 4);
  expect(located.nativeWeapons).toHaveLength(1);
  const unlocated = projectBAMounts([mount(undefined)], 4);
  expect(unlocated.nativeWeapons).toEqual([]);
  expect(unlocated.weapons).toHaveLength(1);
});

describe('battleArmorNativeWeaponBV owner', () => {
  const fact = (over: Partial<BANativeWeaponMount>): BANativeWeaponMount => ({
    id: 'w',
    location: 'Squad',
    battleValue: 8,
    support: false,
    claw: false,
    infantry: false,
    antiMek: false,
    ...over,
  });
  const values = (facts: BANativeWeaponMount[], squad: number, anti: boolean) =>
    battleArmorNativeWeaponBV(facts, squad, anti).map((trooper) =>
      trooper.map((entry) => entry.battleValue),
    );

  it('divides support mounts by the shooting strength in the support and anti-Mek passes', () => {
    expect(values([fact({ support: true, antiMek: true })], 4, true)).toEqual([
      [4],
      [4],
      [4],
      [4],
    ]);
  });

  it('adds the Anti-Mek pass only when the squad may make anti-Mek attacks', () => {
    const facts = [fact({ antiMek: true })];
    expect(values(facts, 2, true)).toEqual([[16], [16]]);
    expect(values(facts, 2, false)).toEqual([[8], [8]]);
  });

  it('keeps infantry weapons out of the support and anti-Mek passes', () => {
    expect(values([fact({ infantry: true })], 2, true)).toEqual([[8], [8]]);
    expect(
      values(
        [fact({ infantry: true, location: 'Trooper 1', trooper: 1 })],
        2,
        true,
      ),
    ).toEqual([[], []]);
  });

  it('leaves out mounts that no pass counts and keeps mount indexes stable', () => {
    const entries = battleArmorNativeWeaponBV(
      [fact({ location: 'Trooper 2', trooper: 2, id: 'a' }), fact({ id: 'b' })],
      2,
      false,
    );
    expect(entries[0].map((e) => [e.index, e.id])).toEqual([[1, 'b']]);
    expect(entries[1].map((e) => [e.index, e.id])).toEqual([
      [0, 'a'],
      [1, 'b'],
    ]);
  });
});
