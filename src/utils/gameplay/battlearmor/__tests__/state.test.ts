/**
 * Battle Armor Combat State tests.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/battle-armor-unit-system/spec.md
 */

import {
  adjustTrooperArmor,
  createBattleArmorCombatState,
  getSurvivingTrooperIndices,
  getSurvivingTroopers,
  killTrooper,
  setLegAttackCommitted,
  setMimeticActive,
  setSwarmTarget,
} from '../state';

function makeState(squadSize = 5, armorPerTrooper = 10) {
  return createBattleArmorCombatState({
    unitId: 'ba-1',
    squadSize,
    armorPointsPerTrooper: armorPerTrooper,
    stealthKind: 'none',
    hasMagneticClamp: false,
    hasVibroClaws: false,
    vibroClawCount: 0,
  });
}

describe('createBattleArmorCombatState', () => {
  it('creates squad of N troopers all alive at full armor', () => {
    const s = makeState(5, 10);
    expect(s.squadSize).toBe(5);
    expect(s.troopers).toHaveLength(5);
    for (const t of s.troopers) {
      expect(t.alive).toBe(true);
      expect(t.armorRemaining).toBe(10);
      expect(t.equipmentDestroyed).toEqual([]);
    }
    expect(s.destroyed).toBe(false);
    expect(s.swarmingUnitId).toBeUndefined();
    expect(s.legAttackCommitted).toBe(false);
    expect(s.mimeticActiveThisTurn).toBe(false);
  });

  it('applies optional construction flags', () => {
    const s = createBattleArmorCombatState({
      unitId: 'ba-clans',
      squadSize: 5,
      armorPointsPerTrooper: 12,
      stealthKind: 'stealth_improved',
      hasMagneticClamp: true,
      hasVibroClaws: true,
      vibroClawCount: 2,
    });
    expect(s.stealthKind).toBe('stealth_improved');
    expect(s.hasMagneticClamp).toBe(true);
    expect(s.hasVibroClaws).toBe(true);
    expect(s.vibroClawCount).toBe(2);
  });
});

describe('getSurvivingTroopers / getSurvivingTrooperIndices', () => {
  it('counts every alive trooper with armor > 0', () => {
    const s = makeState(5, 10);
    expect(getSurvivingTroopers(s)).toBe(5);
    expect(getSurvivingTrooperIndices(s)).toEqual([0, 1, 2, 3, 4]);
  });

  it('excludes dead troopers', () => {
    const s = killTrooper(killTrooper(makeState(5, 10), 0), 2);
    expect(getSurvivingTroopers(s)).toBe(3);
    expect(getSurvivingTrooperIndices(s)).toEqual([1, 3, 4]);
  });
});

describe('killTrooper', () => {
  it('marks trooper dead, sets armor=0, updates destroyed flag if last', () => {
    let s = makeState(2, 10);
    s = killTrooper(s, 0);
    expect(s.troopers[0].alive).toBe(false);
    expect(s.troopers[0].armorRemaining).toBe(0);
    expect(s.destroyed).toBe(false);
    s = killTrooper(s, 1);
    expect(s.destroyed).toBe(true);
  });

  it('is idempotent on an already-dead trooper', () => {
    const s = killTrooper(makeState(3, 10), 1);
    const s2 = killTrooper(s, 1);
    expect(s).toBe(s2);
  });

  it('ignores out-of-range index', () => {
    const s = makeState(3, 10);
    expect(killTrooper(s, -1)).toBe(s);
    expect(killTrooper(s, 99)).toBe(s);
  });
});

describe('adjustTrooperArmor', () => {
  it('reduces armor by delta (negative), never below 0', () => {
    let s = makeState(3, 10);
    s = adjustTrooperArmor(s, 1, -4);
    expect(s.troopers[1].armorRemaining).toBe(6);
    s = adjustTrooperArmor(s, 1, -99);
    expect(s.troopers[1].armorRemaining).toBe(0);
    expect(s.troopers[1].alive).toBe(false);
  });

  it('ignores out-of-range index', () => {
    const s = makeState(3, 10);
    expect(adjustTrooperArmor(s, -1, -5)).toBe(s);
    expect(adjustTrooperArmor(s, 99, -5)).toBe(s);
  });

  it('marks squad destroyed when last trooper hits 0 armor', () => {
    let s = makeState(1, 5);
    s = adjustTrooperArmor(s, 0, -5);
    expect(s.destroyed).toBe(true);
  });
});

describe('setSwarmTarget / setMimeticActive / setLegAttackCommitted', () => {
  it('setSwarmTarget sets and clears swarm target id', () => {
    const s = makeState(3, 10);
    const attached = setSwarmTarget(s, 'mech-42');
    expect(attached.swarmingUnitId).toBe('mech-42');
    const detached = setSwarmTarget(attached, undefined);
    expect(detached.swarmingUnitId).toBeUndefined();
  });

  it('setMimeticActive toggles flag', () => {
    const s = makeState(3, 10);
    expect(setMimeticActive(s, true).mimeticActiveThisTurn).toBe(true);
    expect(setMimeticActive(s, false).mimeticActiveThisTurn).toBe(false);
  });

  it('setLegAttackCommitted toggles flag', () => {
    const s = makeState(3, 10);
    expect(setLegAttackCommitted(s, true).legAttackCommitted).toBe(true);
    expect(setLegAttackCommitted(s, false).legAttackCommitted).toBe(false);
  });
});
