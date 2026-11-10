import { BlkParserService } from '../../src/services/conversion/BlkParserService';
import { BattleArmorUnitHandler } from '../../src/services/units/handlers/BattleArmorUnitHandler';
import { baseInput } from '../../src/utils/construction/battlearmor/__tests__/battleArmorBV.test.helpers';
import {
  battleArmorBVTerms,
  battleArmorNativeEquipmentBV,
  battleArmorNativeSectionBV,
  battleArmorNativeWeaponBV,
  calculateBattleArmorBV,
  type BANativeEquipmentMount,
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

// ---------------------------------------------------------------------------
// B3: native section terms
// ---------------------------------------------------------------------------
// The Java probe (java_bv_terms.py:107-108) records `section.<name>` as the
// offensive value one tentative pass adds (BattleArmorBVCalculator.java:122-127),
// for Weapons:, Squad Support: and, only when canMakeAntiMekAttacks, Anti-Mek:
// (:154-160). It records the pass even when it adds 0.

/** `[trooper.N.]section.*` terms keyed by the Java section label. */
const sectionValues = (
  trace: Record<string, number | undefined>,
  prefix = '',
): Record<string, number> => {
  const out: Record<string, number> = {};
  const head = `${prefix}section.`;
  for (const [key, value] of Object.entries(trace))
    if (key.startsWith(head) && value !== undefined)
      out[key.slice(head.length)] = value;
  return out;
};
const sectionKeys = (trace: Record<string, number | undefined>) =>
  Object.keys(trace).filter((key) => /(?:^|\.)section\./.test(key));

test('BA squad weapons project the Weapons and Anti-Mek section values for the squad and every trooper', () => {
  const { trace } = traceOf({
    'Squad Equipment': `${manipulators}\n${DAVID}:RA`,
  });
  const expected = { 'Weapons:': 7, 'Squad Support:': 0, 'Anti-Mek:': 7 };
  expect(sectionValues(trace)).toEqual(expected);
  for (const k of [1, 2, 3, 4])
    expect(sectionValues(trace, `trooper.${k}.`)).toEqual(expected);
  expect(sectionKeys(trace)).toHaveLength(15);
  expect(sectionKeys(trace).filter((key) => key.includes('trooper.5'))).toEqual(
    [],
  );
});

test('BA omits the Anti-Mek section unless the squad may make anti-Mek attacks', () => {
  // BattleArmorBVCalculator.java:158-160.
  const { trace } = traceOf({
    'Squad Equipment': `${manipulators}\n${DAVID}:RA`,
    weightclass: '3',
  });
  expect(sectionValues(trace)).toEqual({ 'Weapons:': 7, 'Squad Support:': 0 });
  expect(sectionKeys(trace)).toHaveLength(10);
});

test('BA records zero-valued sections as real terms', () => {
  // Weapons and Squad Support appear for every unit, Anti-Mek for eligible ones,
  // even when the pass adds nothing (6,743 of 7,085 Squad Support terms are 0).
  const { trace } = traceOf({ 'Squad Equipment': manipulators });
  expect(sectionValues(trace)).toEqual({
    'Weapons:': 0,
    'Squad Support:': 0,
    'Anti-Mek:': 0,
  });
  expect(sectionValues(trace, 'trooper.4.')).toEqual({
    'Weapons:': 0,
    'Squad Support:': 0,
    'Anti-Mek:': 0,
  });
});

test('BA squad-support mounts count only in Squad Support and Anti-Mek, divided by the strength', () => {
  const { trace } = traceOf({
    'Squad Equipment': `${manipulators}\n${DAVID}:RA:SSWM`,
  });
  expect(sectionValues(trace)).toEqual({
    'Weapons:': 0,
    'Squad Support:': 1.75,
    'Anti-Mek:': 1.75,
  });
  expect(sectionValues(trace, 'trooper.3.')).toEqual(sectionValues(trace));
});

test('BA trooper-located weapons add to their own trooper sections only', () => {
  const { trace } = traceOf({
    'Squad Equipment': manipulators,
    'Trooper 2 Equipment': `${DAVID}:RA`,
  });
  expect(sectionValues(trace, 'trooper.2.')).toEqual({
    'Weapons:': 0,
    'Squad Support:': 7,
    'Anti-Mek:': 7,
  });
  for (const k of [1, 3, 4])
    expect(sectionValues(trace, `trooper.${k}.`)).toEqual({
      'Weapons:': 0,
      'Squad Support:': 0,
      'Anti-Mek:': 0,
    });
  // Squad-level terms are trooper 1's snapshot.
  expect(sectionValues(trace)).toEqual(sectionValues(trace, 'trooper.1.'));
});

test('BA vibro claws count only in the Anti-Mek section', () => {
  // BattleArmorBVCalculator.java:135-136,142-144.
  const { trace } = traceOf({ 'Squad Equipment': 'BABattleClawVibro:LA' });
  expect(sectionValues(trace)).toEqual({
    'Weapons:': 0,
    'Squad Support:': 0,
    'Anti-Mek:': 1,
  });
});

test('BA section values add up to the weapon term values of the same trooper', () => {
  const { trace } = traceOf({
    'Squad Equipment': `${manipulators}\n${DAVID}:RA\n${SRM1}:LA\n${DAVID}:Body:SSWM`,
    'Trooper 3 Equipment': `${DAVID}:RA`,
  });
  for (const prefix of ['', 'trooper.1.', 'trooper.3.', 'trooper.4.']) {
    const fromSections = Object.values(sectionValues(trace, prefix)).reduce(
      (sum, value) => sum + value,
      0,
    );
    const fromWeapons = Object.values(weaponValues(trace, prefix))
      .flat()
      .reduce((sum, value) => sum + value, 0);
    expect(fromSections).toBeCloseTo(fromWeapons, 10);
  }
  expect(sectionValues(trace, 'trooper.3.')['Squad Support:']).toBe(7 + 7 / 4);
});

test('BA without complete native weapon facts emits no section terms', () => {
  expect(
    sectionKeys(battleArmorBVTerms(calculateBattleArmorBV(baseInput()))),
  ).toEqual([]);
  const incomplete = calculateBattleArmorBV(baseInput({ nativeWeapons: [] }));
  expect(sectionKeys(battleArmorBVTerms(incomplete))).toEqual([]);
});

test('BA mounts without a native unit location make the native facts incomplete', () => {
  const mount = (equipmentId: string, unitLocation?: string) => ({
    id: 'm',
    equipmentId,
    name: equipmentId,
    unitLocation,
    location: 'Right Arm' as never,
    isAPMount: false,
    isTurretMounted: false,
    isModular: false,
  });
  expect(
    projectBAMounts([mount(`${DAVID}:RA`, 'Squad')], 4).nativeWeaponsComplete,
  ).toBe(true);
  expect(projectBAMounts([mount(`${DAVID}:RA`)], 4).nativeWeaponsComplete).toBe(
    false,
  );
  // Equipment that adds no weapon fact cannot make the section totals wrong.
  expect(
    projectBAMounts([mount('BABasicManipulator:LA')], 4).nativeWeaponsComplete,
  ).toBe(true);
  // An unlocated mount still drops out of the located list, as in B2.
  const mixed = projectBAMounts(
    [mount(`${DAVID}:RA`, 'Squad'), mount(`${SRM1}:LA`)],
    4,
  );
  expect(mixed.nativeWeapons).toHaveLength(1);
  expect(mixed.nativeWeaponsComplete).toBe(false);
});

describe('battleArmorNativeSectionBV owner', () => {
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

  it('sums each pass over the mounts that pass counts', () => {
    const facts = [
      fact({ battleValue: 8, antiMek: true }),
      fact({ battleValue: 4, support: true, antiMek: true }),
      fact({ battleValue: 2, claw: true, antiMek: true }),
    ];
    expect(battleArmorNativeSectionBV(facts, 2, true)).toEqual([
      { 'Weapons:': 8, 'Squad Support:': 2, 'Anti-Mek:': 8 + 2 + 2 },
      { 'Weapons:': 8, 'Squad Support:': 2, 'Anti-Mek:': 8 + 2 + 2 },
    ]);
  });

  it('leaves the Anti-Mek label out when the squad may not make anti-Mek attacks', () => {
    const [trooper] = battleArmorNativeSectionBV(
      [fact({ antiMek: true })],
      1,
      false,
    );
    expect(Object.keys(trooper)).toEqual(['Weapons:', 'Squad Support:']);
  });

  it('keeps infantry weapons out of Squad Support and Anti-Mek', () => {
    expect(
      battleArmorNativeSectionBV([fact({ infantry: true })], 1, true),
    ).toEqual([{ 'Weapons:': 8, 'Squad Support:': 0, 'Anti-Mek:': 0 }]);
  });

  it('counts a trooper-located mount for that trooper only', () => {
    const sections = battleArmorNativeSectionBV(
      [fact({ location: 'Trooper 2', trooper: 2, antiMek: true })],
      3,
      true,
    );
    expect(sections.map((s) => s['Squad Support:'])).toEqual([0, 8, 0]);
    expect(sections.map((s) => s['Anti-Mek:'])).toEqual([0, 8, 0]);
    expect(sections.map((s) => s['Weapons:'])).toEqual([0, 0, 0]);
  });
});

// ---------------------------------------------------------------------------
// B4: native equipment terms
// ---------------------------------------------------------------------------
// The Java probe (java_bv_terms.py:51-54) records
// `equipment.native.<location>.<internalName>` each time
// BVCalculator.processOffensiveEquipment (BVCalculator.java:978-1039) asks for
// the value of a misc mount. BattleArmorBVCalculator.java:223-226 answers 0
// unless the mount sits at the trooper being calculated, so a mount contributes
// its catalog value to its own trooper only. LOC_SQUAD is 0 (BattleArmor.java:274),
// trooper N is N (:276) and LOC_NONE is -1 (Entity.java:254). A misc mount
// carrying one of the flags tested at BVCalculator.java:1000-1017 is skipped
// before the value is requested and creates no term.

// BVCalculator.java:1000-1017 (F_ECM only counts without F_WATCHDOG, which no
// BA misc carries).
const SKIPPED_BEFORE_VALUE = [
  'F_ECM',
  'F_AP_POD',
  'F_VIRAL_JAMMER_DECOY',
  'F_VIRAL_JAMMER_HOMING',
  'F_LIGHT_BRIDGE_LAYER',
  'F_MEDIUM_BRIDGE_LAYER',
  'F_HEAVY_BRIDGE_LAYER',
  'F_CHAFF_POD',
  'F_BULLDOZER',
  'F_BAP',
  'F_TARGETING_COMPUTER',
  'F_SPIKES',
  'F_MINESWEEPER',
  'F_HARJEL_II',
  'F_HARJEL_III',
  'F_MASS',
  'F_MINE',
  'F_SHIELD',
];

/**
 * Every misc name the 1,188 pinned BA sources can reach: `cite` is the line of
 * its internal name in the pinned MegaMek source, `flagsAt` the line that sets
 * its flags, `bv` its `misc.bv` (default 0, EquipmentType.java:186). Whether the
 * probe visits the name is derived from `flags`, not listed.
 */
const BA_MISC_TABLE: readonly {
  name: string;
  cite: string;
  flagsAt: number;
  flags: readonly string[];
  bv: number;
}[] = [
  {
    name: 'BA-Magnetic Clamp',
    cite: 'MiscType.java:11939',
    flagsAt: 11946,
    flags: ['F_MAGNETIC_CLAMP', 'F_BA_EQUIPMENT'],
    bv: 1,
  },
  {
    name: 'BAAPMount',
    cite: 'MiscType.java:12157',
    flagsAt: 12160,
    flags: ['F_BA_EQUIPMENT', 'F_AP_MOUNT'],
    bv: 0,
  },
  {
    name: 'BAArmoredGlove',
    cite: 'MiscType.java:11504',
    flagsAt: 11511,
    flags: [
      'F_BA_EQUIPMENT',
      'F_ARMORED_GLOVE',
      'F_AP_MOUNT',
      'F_BA_MANIPULATOR',
    ],
    bv: 0,
  },
  {
    name: 'BABasicManipulator',
    cite: 'MiscType.java:11529',
    flagsAt: 11536,
    flags: ['F_BA_EQUIPMENT', 'F_BA_MANIPULATOR', 'F_BASIC_MANIPULATOR'],
    bv: 0,
  },
  {
    name: 'BABasicManipulatorMineClearance',
    cite: 'MiscType.java:11740',
    flagsAt: 11748,
    flags: [
      'F_BA_EQUIPMENT',
      'F_TOOLS',
      'F_BASIC_MANIPULATOR',
      'F_BA_MANIPULATOR',
      'S_MINESWEEPER',
    ],
    bv: 0,
  },
  {
    name: 'BABattleClaw',
    cite: 'MiscType.java:11555',
    flagsAt: 11562,
    flags: ['F_BA_EQUIPMENT', 'F_BATTLE_CLAW', 'F_BA_MANIPULATOR'],
    bv: 0,
  },
  {
    name: 'BABattleClawMagnets',
    cite: 'MiscType.java:11685',
    flagsAt: 11692,
    flags: [
      'F_MAGNET_CLAW',
      'F_BA_EQUIPMENT',
      'F_BATTLE_CLAW',
      'F_BA_MANIPULATOR',
    ],
    bv: 1.5,
  },
  {
    name: 'BABattleClawVibro',
    cite: 'MiscType.java:11772',
    flagsAt: 11779,
    flags: [
      'F_VIBROCLAW',
      'F_BA_EQUIPMENT',
      'F_BATTLE_CLAW',
      'F_BA_MANIPULATOR',
    ],
    bv: 1,
  },
  {
    name: 'BABattleMechNIU',
    cite: 'MiscType.java:4983',
    flagsAt: 4989,
    flags: ['F_BATTLEMEK_NIU', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'BACargoLifter',
    cite: 'MiscType.java:11608',
    flagsAt: 11617,
    flags: [
      'F_BA_EQUIPMENT',
      'F_CARGO_LIFTER',
      'F_BA_MANIPULATOR',
      'F_VARIABLE_SIZE',
    ],
    bv: 0,
  },
  {
    name: 'BACuttingTorch',
    cite: 'MiscType.java:11097',
    flagsAt: 11101,
    flags: ['F_CUTTING_TORCH', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'BAExtendedLifeSupport',
    cite: 'MiscType.java:11192',
    flagsAt: 11198,
    flags: ['F_BA_EQUIPMENT', 'F_EXTENDED_LIFE_SUPPORT'],
    bv: 0,
  },
  {
    name: 'BAHeavyBattleClaw',
    cite: 'MiscType.java:11582',
    flagsAt: 11589,
    flags: ['F_BA_EQUIPMENT', 'F_BATTLE_CLAW', 'F_BA_MANIPULATOR'],
    bv: 0,
  },
  {
    name: 'BAHeavyBattleClawVibro',
    cite: 'MiscType.java:11799',
    flagsAt: 11807,
    flags: [
      'F_VIBROCLAW',
      'F_BA_EQUIPMENT',
      'F_BATTLE_CLAW',
      'F_BA_MANIPULATOR',
    ],
    bv: 1,
  },
  {
    name: 'BAIndustrialDrill',
    cite: 'MiscType.java:11635',
    flagsAt: 11640,
    flags: ['F_BA_EQUIPMENT', 'F_BA_MANIPULATOR'],
    bv: 0,
  },
  {
    name: 'BAISAngelECMSuite',
    cite: 'MiscType.java:11007',
    flagsAt: 11014,
    flags: ['F_ECM', 'F_ANGEL_ECM', 'F_BA_EQUIPMENT'],
    bv: 100,
  },
  {
    name: 'BAJumpBooster',
    cite: 'MiscType.java:11910',
    flagsAt: 11917,
    flags: ['F_JUMP_BOOSTER', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'BAJumpJet',
    cite: 'MiscType.java:11852',
    flagsAt: 11856,
    flags: ['F_JUMP_JET', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'BAMEA',
    cite: 'MiscType.java:11827',
    flagsAt: 11832,
    flags: ['F_BA_EQUIPMENT', 'F_BA_MEA'],
    bv: 0,
  },
  {
    name: 'BAMechanicalJumpBooster',
    cite: 'MiscType.java:11971',
    flagsAt: 11977,
    flags: ['F_MECHANICAL_JUMP_BOOSTER', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'BAParafoil',
    cite: 'MiscType.java:11346',
    flagsAt: 11351,
    flags: ['F_PARAFOIL', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'BAPartialWing',
    cite: 'MiscType.java:12027',
    flagsAt: 12031,
    flags: ['F_BA_EQUIPMENT', 'F_PARTIAL_WING'],
    bv: 0,
  },
  {
    name: 'BAPowerpack',
    cite: 'MiscType.java:11371',
    flagsAt: 11375,
    flags: ['F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'BASalvageArm',
    cite: 'MiscType.java:11659',
    flagsAt: 11664,
    flags: ['F_BA_EQUIPMENT', 'F_BA_MANIPULATOR'],
    bv: 0,
  },
  {
    name: 'BASearchlight',
    cite: 'MiscType.java:11425',
    flagsAt: 11430,
    flags: ['F_BA_SEARCHLIGHT', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'BattleArmorC3',
    cite: 'MiscType.java:4642',
    flagsAt: 4649,
    flags: ['F_C3S', 'ANY_C3', 'F_BA_EQUIPMENT', 'F_HEAVY_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'BAUMU',
    cite: 'MiscType.java:11889',
    flagsAt: 11893,
    flags: ['F_UMU', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'BAVTOL',
    cite: 'MiscType.java:11869',
    flagsAt: 11873,
    flags: ['F_BA_EQUIPMENT', 'F_BA_VTOL'],
    bv: 0,
  },
  {
    name: 'Camo System',
    cite: 'MiscType.java:11069',
    flagsAt: 11074,
    flags: ['F_STEALTH', 'F_VISUAL_CAMO', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'CL BA ECM',
    cite: 'MiscType.java:11157',
    flagsAt: 11164,
    flags: ['F_ECM', 'F_SINGLE_HEX_ECM', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'Clan BA Fire Resistant',
    cite: 'ArmorType.java:1519',
    flagsAt: 1523,
    flags: ['F_FIRE_RESISTANT', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'Clan BA Laser Reflective (Reflec/Glazed)',
    cite: 'ArmorType.java:1815',
    flagsAt: 1820,
    flags: ['F_BA_EQUIPMENT', 'F_REFLECTIVE'],
    bv: 0,
  },
  {
    name: 'Clan BA Reactive (Blazer)',
    cite: 'ArmorType.java:1764',
    flagsAt: 1769,
    flags: ['F_BA_EQUIPMENT', 'F_REACTIVE'],
    bv: 0,
  },
  {
    name: 'Clan BA Stealth (Basic)',
    cite: 'ArmorType.java:1592',
    flagsAt: 1596,
    flags: ['F_STEALTH', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'Clan BA Stealth (Improved)',
    cite: 'ArmorType.java:1690',
    flagsAt: 1694,
    flags: ['F_STEALTH', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'Clan BA Stealth (Standard)',
    cite: 'ArmorType.java:1640',
    flagsAt: 1645,
    flags: ['F_STEALTH', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'CLBAMyomerBooster',
    cite: 'MiscType.java:11997',
    flagsAt: 12005,
    flags: ['F_MASC', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'CLImprovedSensors',
    cite: 'MiscType.java:11297',
    flagsAt: 11303,
    flags: ['F_BAP', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'HHSearchlight',
    cite: 'MiscType.java:9169',
    flagsAt: 9174,
    flags: [
      'F_SEARCHLIGHT',
      'F_MEK_EQUIPMENT',
      'F_PROTOMEK_EQUIPMENT',
      'F_TANK_EQUIPMENT',
      'F_SUPPORT_TANK_EQUIPMENT',
      'F_FIGHTER_EQUIPMENT',
      'F_DS_EQUIPMENT',
      'F_BA_EQUIPMENT',
    ],
    bv: 0,
  },
  {
    name: 'IS BA Advanced',
    cite: 'ArmorType.java:1499',
    flagsAt: 1503,
    flags: ['F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'IS BA ECM',
    cite: 'MiscType.java:11121',
    flagsAt: 11129,
    flags: ['F_ECM', 'F_SINGLE_HEX_ECM', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'IS BA Laser Reflective (Reflec/Glazed)',
    cite: 'ArmorType.java:1790',
    flagsAt: 1795,
    flags: ['F_BA_EQUIPMENT', 'F_REFLECTIVE'],
    bv: 0,
  },
  {
    name: 'IS BA Mimetic',
    cite: 'ArmorType.java:1715',
    flagsAt: 1719,
    flags: ['F_STEALTH', 'F_VISUAL_CAMO', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'IS BA Reactive (Blazer)',
    cite: 'ArmorType.java:1739',
    flagsAt: 1744,
    flags: ['F_BA_EQUIPMENT', 'F_REACTIVE'],
    bv: 0,
  },
  {
    name: 'IS BA Stealth (Basic)',
    cite: 'ArmorType.java:1568',
    flagsAt: 1572,
    flags: ['F_STEALTH', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'IS BA Stealth (Improved)',
    cite: 'ArmorType.java:1665',
    flagsAt: 1669,
    flags: ['F_STEALTH', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'IS BA Stealth (Prototype)',
    cite: 'ArmorType.java:1543',
    flagsAt: 1548,
    flags: ['F_STEALTH', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'IS BA Stealth (Standard)',
    cite: 'ArmorType.java:1615',
    flagsAt: 1620,
    flags: ['F_STEALTH', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'ISBAHeatSensor',
    cite: 'MiscType.java:11248',
    flagsAt: 11253,
    flags: ['F_BA_EQUIPMENT', 'F_HEAT_SENSOR'],
    bv: 0,
  },
  {
    name: 'ISBALightActiveProbe',
    cite: 'MiscType.java:10945',
    flagsAt: 10951,
    flags: ['F_BAP', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'ISBAMineDispenser',
    cite: 'MiscType.java:12238',
    flagsAt: 12242,
    flags: ['F_BA_EQUIPMENT', 'F_VEHICLE_MINE_DISPENSER'],
    bv: 8,
  },
  {
    name: 'ISBARemoteSensorDispenser',
    cite: 'MiscType.java:11395',
    flagsAt: 11403,
    flags: ['F_BA_EQUIPMENT', 'F_SENSOR_DISPENSER'],
    bv: 0,
  },
  {
    name: 'ISBASpaceOperationsAdaptation',
    cite: 'MiscType.java:11475',
    flagsAt: 11480,
    flags: ['F_SPACE_ADAPTATION', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'ISBC3i',
    cite: 'MiscType.java:4676',
    flagsAt: 4684,
    flags: ['F_C3I', 'ANY_C3', 'F_BA_EQUIPMENT', 'F_HEAVY_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'ISDetachableWeaponPack',
    cite: 'MiscType.java:12211',
    flagsAt: 12216,
    flags: ['F_BA_EQUIPMENT', 'F_DETACHABLE_WEAPON_PACK'],
    bv: 0,
  },
  {
    name: 'ISImprovedSensors',
    cite: 'MiscType.java:11274',
    flagsAt: 11280,
    flags: ['F_BAP', 'F_BA_EQUIPMENT'],
    bv: 0,
  },
  {
    name: 'Mission Equipment Storage',
    cite: 'MiscType.java:12262',
    flagsAt: 12268,
    flags: ['F_VARIABLE_SIZE', 'F_BA_EQUIPMENT', 'F_BA_MISSION_EQUIPMENT'],
    bv: 0,
  },
];
const MOVEMENT_MISC = ['BAJumpJet', 'BAVTOL', 'BAUMU'];
const visitedMisc = BA_MISC_TABLE.filter(
  (entry) => !entry.flags.some((flag) => SKIPPED_BEFORE_VALUE.includes(flag)),
);
// Movement items come from the slotless block (BLKFile.java:404,469), not an
// equipment location, so they are exercised separately below.
const locatedVisited = visitedMisc.filter(
  (entry) => !MOVEMENT_MISC.includes(entry.name),
);
const equipmentKeys = (trace: Record<string, number | undefined>) =>
  Object.keys(trace).filter((key) => /(?:^|\.)equipment\.native\./.test(key));
const nativeKey = (location: number, name: string, prefix = '') =>
  `${prefix}equipment.native.${location}.${name}`;

test('BA misc table is derived from flags: the probe skips exactly ECM and active probe items', () => {
  const skipped = BA_MISC_TABLE.filter(
    (entry) => !visitedMisc.includes(entry),
  ).map((entry) => entry.name);
  expect(skipped.sort()).toEqual(
    [
      'BAISAngelECMSuite',
      'CL BA ECM',
      'CLImprovedSensors',
      'IS BA ECM',
      'ISBALightActiveProbe',
      'ISImprovedSensors',
    ].sort(),
  );
  expect(visitedMisc).toHaveLength(BA_MISC_TABLE.length - 6);
  // The table is the pinned source of values: only the mine dispenser, the
  // clamp and the claws carry any (MiscType.java:11939,11685,11772,11799,12238).
  expect(
    locatedVisited
      .filter((entry) => entry.bv !== 0)
      .map((entry) => entry.name)
      .sort(),
  ).toEqual(
    [
      'BA-Magnetic Clamp',
      'BABattleClawMagnets',
      'BABattleClawVibro',
      'BAHeavyBattleClawVibro',
      'ISBAMineDispenser',
    ].sort(),
  );
});

test('BA visited misc mounts create a 0-valued term per location for the squad and every trooper', () => {
  const { trace } = traceOf({
    'Squad Equipment': locatedVisited.map((entry) => entry.name).join('\n'),
  });
  for (const entry of locatedVisited) {
    expect(trace[nativeKey(0, entry.name)]).toBe(0);
    for (const k of [1, 2, 3, 4])
      expect(trace[nativeKey(0, entry.name, `trooper.${k}.`)]).toBe(0);
  }
  expect(equipmentKeys(trace)).toHaveLength(locatedVisited.length * 5);
});

test('BA ECM, sensor and probe mounts create no equipment term', () => {
  const skipped = BA_MISC_TABLE.filter((entry) => !visitedMisc.includes(entry));
  const { trace } = traceOf({
    'Squad Equipment': `${manipulators}\n${skipped.map((entry) => entry.name).join('\n')}`,
  });
  for (const entry of skipped)
    expect(trace[nativeKey(0, entry.name)]).toBeUndefined();
  expect(equipmentKeys(trace).map((key) => key.split('.').pop())).not.toEqual(
    expect.arrayContaining(skipped.map((entry) => entry.name)),
  );
});

test('BA trooper-located misc mounts carry their pinned value for that trooper only', () => {
  for (const entry of locatedVisited) {
    const { trace } = traceOf({
      'Squad Equipment': manipulators,
      'Trooper 2 Equipment': entry.name,
    });
    // BattleArmorBVCalculator.java:224-226: the value is requested for the
    // trooper being calculated; every other trooper (and so trooper 1, which
    // the squad level repeats) sees 0.
    expect(trace[nativeKey(2, entry.name, 'trooper.2.')]).toBe(entry.bv);
    for (const k of [1, 3, 4])
      expect(trace[nativeKey(2, entry.name, `trooper.${k}.`)]).toBe(0);
    expect(trace[nativeKey(2, entry.name)]).toBe(0);
  }
});

test('BA squad-level equipment terms equal trooper 1 including its own mounts', () => {
  const { trace } = traceOf({
    'Squad Equipment': manipulators,
    'Trooper 1 Equipment': 'ISBAMineDispenser',
    'Trooper 2 Equipment': 'ISBAMineDispenser',
  });
  expect(trace[nativeKey(1, 'ISBAMineDispenser')]).toBe(8);
  expect(trace[nativeKey(1, 'ISBAMineDispenser', 'trooper.1.')]).toBe(8);
  expect(trace[nativeKey(2, 'ISBAMineDispenser')]).toBe(0);
  expect(trace[nativeKey(2, 'ISBAMineDispenser', 'trooper.2.')]).toBe(8);
});

test('BA Clan Point mounts report location 0 like the squad', () => {
  const { trace } = traceOf({
    type: 'Clan Level 2',
    'Point Equipment': `${manipulators}\nBAArmoredGlove:LA`,
  });
  expect(trace[nativeKey(0, 'BAArmoredGlove')]).toBe(0);
});

test('BA movement misc comes from the slotless block at location -1', () => {
  for (const name of MOVEMENT_MISC) {
    const { trace } = traceOf({
      'Squad Equipment': manipulators,
      slotless_equipment: name,
    });
    expect(trace[nativeKey(-1, name)]).toBe(0);
    for (const k of [1, 2, 3, 4])
      expect(trace[nativeKey(-1, name, `trooper.${k}.`)]).toBe(0);
  }
  // 60 pinned Leg-motion suits list jump jets in the slotless block, so the
  // block alone decides; a duplicate entry is one key (terms.put overwrites).
  const leg = traceOf({
    'Squad Equipment': manipulators,
    motion_type: 'Leg',
    slotless_equipment: 'BAJumpJet\nBAJumpJet',
  }).trace;
  expect(
    equipmentKeys(leg).filter((key) => !key.startsWith('trooper.')),
  ).toEqual([nativeKey(0, 'BABasicManipulator'), nativeKey(-1, 'BAJumpJet')]);
});

test('BA weapons, ammunition and AMS create no equipment term', () => {
  const { trace } = traceOf({
    'Squad Equipment': `${manipulators}\n${DAVID}:RA\n${SRM1}:LA\nBA-SRM1 Ammo:Body:Shots4#\nISBAAPDS:RA\nInfantryAssaultRifle:APM`,
  });
  expect(
    equipmentKeys(trace)
      .filter((key) => !key.startsWith('trooper.'))
      .map((key) => key.split('.').pop())
      .sort(),
  ).toEqual(['BABasicManipulator']);
});

test('BA without native equipment facts keeps the old trace', () => {
  expect(
    equipmentKeys(battleArmorBVTerms(calculateBattleArmorBV(baseInput()))),
  ).toEqual([]);
  const incomplete = calculateBattleArmorBV(baseInput({ nativeEquipment: [] }));
  expect(equipmentKeys(battleArmorBVTerms(incomplete))).toEqual([]);
});

test('BA mean of the per-trooper equipment values equals the averaged offensive equipment BV', () => {
  const { breakdown, trace } = traceOf({
    'Squad Equipment': manipulators,
    'Trooper 1 Equipment': 'ISBAMineDispenser',
    'Trooper 3 Equipment': 'ISBAMineDispenser',
  });
  const sum = [1, 2, 3, 4]
    .flatMap((k) =>
      Object.entries(trace).filter(
        ([key]) =>
          key.startsWith(`trooper.${k}.equipment.native.`) &&
          key.endsWith('ISBAMineDispenser'),
      ),
    )
    .reduce((total, [, value]) => total + (value ?? 0), 0);
  expect(sum / 4).toBe(breakdown.perTrooper.offensive.offensiveEquipmentBV);
});

test('BA misc mounts without a numbered native location add no fact', () => {
  const mount = (equipmentId: string, unitLocation?: string) => ({
    id: 'm',
    equipmentId,
    name: equipmentId,
    unitLocation,
    location: 'Right Arm' as never,
    isAPMount: false,
    isTurretMounted: false,
    isModular: false,
  });
  const facts = (equipmentId: string, unitLocation?: string) =>
    projectBAMounts([mount(equipmentId, unitLocation)], 4).nativeEquipment;
  expect(facts('BASearchlight', 'Squad')).toEqual([
    { id: 'BASearchlight', location: 0, battleValue: 0 },
  ]);
  expect(facts('BASearchlight', 'Trooper 3')).toEqual([
    { id: 'BASearchlight', location: 3, battleValue: 0 },
  ]);
  expect(facts('BAJumpJet', 'NONE')).toEqual([
    { id: 'BAJumpJet', location: -1, battleValue: 0 },
  ]);
  // Without a location, or with one this owner cannot number, only that term
  // is missing; the other terms are independent of it.
  expect(facts('BASearchlight')).toEqual([]);
  expect(facts('BASearchlight', 'Left Arm')).toEqual([]);
  // Weapons, skipped misc and unknown identities are not visited misc mounts.
  expect(facts(`${DAVID}:RA`, 'Squad')).toEqual([]);
  expect(facts('IS BA ECM', 'Squad')).toEqual([]);
  expect(facts('Unknown BA Fixture', 'Squad')).toEqual([]);
});

describe('battleArmorNativeEquipmentBV owner', () => {
  const fact = (
    over: Partial<BANativeEquipmentMount> = {},
  ): BANativeEquipmentMount => ({
    id: 'e',
    location: 0,
    battleValue: 8,
    ...over,
  });

  it('gives a mount its value for its own trooper and 0 for every other', () => {
    const values = battleArmorNativeEquipmentBV([fact({ location: 2 })], 3).map(
      (trooper) => trooper.map((entry) => entry.battleValue),
    );
    expect(values).toEqual([[0], [8], [0]]);
  });

  it('gives squad (0) and detached (-1) mounts 0 for every trooper', () => {
    const values = battleArmorNativeEquipmentBV(
      [fact({ location: 0 }), fact({ id: 'n', location: -1 })],
      2,
    ).map((trooper) => trooper.map((entry) => entry.battleValue));
    expect(values).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it('reports one entry per location and name, as the probe keys overwrite', () => {
    const [trooper] = battleArmorNativeEquipmentBV(
      [fact(), fact(), fact({ location: 1 })],
      1,
    );
    expect(trooper.map((entry) => [entry.location, entry.id])).toEqual([
      [0, 'e'],
      [1, 'e'],
    ]);
  });
});
