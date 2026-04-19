/**
 * Battle Armor squad fire resolution tests.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   (Section 4)
 */

import {
  type IBattleArmorSquadWeapon,
  resolveBattleArmorSquadFire,
} from '../squadFire';
import { createBattleArmorCombatState, killTrooper } from '../state';

function makeState(size = 5) {
  return createBattleArmorCombatState({
    unitId: 'ba-squadfire',
    squadSize: size,
    armorPointsPerTrooper: 10,
  });
}

const smallLaser: IBattleArmorSquadWeapon = {
  id: 'small-laser',
  damagePerShot: 3,
};
const tripleMG: IBattleArmorSquadWeapon = {
  id: 'triple-mg',
  damagePerShot: 2,
  shotsPerTrooper: 3,
};

describe('resolveBattleArmorSquadFire', () => {
  it('scales effectiveShots and totalDamage with surviving troopers', () => {
    const s = makeState(5);
    const r = resolveBattleArmorSquadFire(s, [smallLaser]);
    expect(r.survivingTroopers).toBe(5);
    expect(r.effectiveShots).toBe(5);
    expect(r.totalDamage).toBe(15); // 5 × 3
  });

  it('drops effective shots when troopers die', () => {
    const s = killTrooper(killTrooper(makeState(5), 0), 1);
    const r = resolveBattleArmorSquadFire(s, [smallLaser]);
    expect(r.survivingTroopers).toBe(3);
    expect(r.effectiveShots).toBe(3);
    expect(r.totalDamage).toBe(9);
  });

  it('honors shotsPerTrooper > 1', () => {
    const s = makeState(4);
    const r = resolveBattleArmorSquadFire(s, [tripleMG]);
    expect(r.effectiveShots).toBe(12); // 4 × 3
    expect(r.totalDamage).toBe(24); // 12 × 2
  });

  it('sums across multiple weapons', () => {
    const s = makeState(5);
    const r = resolveBattleArmorSquadFire(s, [smallLaser, tripleMG]);
    expect(r.effectiveShots).toBe(5 + 15);
    expect(r.totalDamage).toBe(15 + 30);
  });

  it('heat is always 0 for BA (no heat track)', () => {
    const r = resolveBattleArmorSquadFire(makeState(5), [smallLaser, tripleMG]);
    expect(r.heatGenerated).toBe(0);
  });

  it('0 survivors → 0 shots / 0 damage', () => {
    let s = makeState(2);
    s = killTrooper(killTrooper(s, 0), 1);
    const r = resolveBattleArmorSquadFire(s, [smallLaser]);
    expect(r.survivingTroopers).toBe(0);
    expect(r.effectiveShots).toBe(0);
    expect(r.totalDamage).toBe(0);
  });
});
