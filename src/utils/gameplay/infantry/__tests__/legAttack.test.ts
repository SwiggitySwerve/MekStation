/**
 * Anti-mech leg attack tests.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/tasks.md §9 (Anti-Mech Leg / Swarm)
 */

import { InfantryArmorKit } from '../../../../types/unit/PersonnelInterfaces';
import { InfantryEventType } from '../events';
import {
  LEG_ATTACK_DAMAGE_PER_TROOPER,
  MECH_PILOTING_LEG_ATTACK_BONUS,
  clearAntiMechCommitted,
  declareLegAttack,
  legAttackDenyReason,
} from '../legAttack';
import { createInfantryCombatState } from '../state';

const fixedRoller = (v: number) => () => v;

function antiMechState() {
  return createInfantryCombatState({
    startingTroopers: 28,
    armorKit: InfantryArmorKit.NONE,
    hasAntiMechTraining: true,
  });
}

describe('constants', () => {
  it('MECH_PILOTING_LEG_ATTACK_BONUS = 4', () => {
    expect(MECH_PILOTING_LEG_ATTACK_BONUS).toBe(4);
  });

  it('LEG_ATTACK_DAMAGE_PER_TROOPER = 2', () => {
    expect(LEG_ATTACK_DAMAGE_PER_TROOPER).toBe(2);
  });
});

describe('legAttackDenyReason', () => {
  it('null for healthy anti-mech platoon', () => {
    expect(legAttackDenyReason(antiMechState())).toBeNull();
  });

  it("'no_training' when training flag false", () => {
    const s = { ...antiMechState(), hasAntiMechTraining: false };
    expect(legAttackDenyReason(s)).toBe('no_training');
  });

  it("'destroyed' when destroyed", () => {
    const s = { ...antiMechState(), destroyed: true, survivingTroopers: 0 };
    expect(legAttackDenyReason(s)).toBe('destroyed');
  });

  it("'destroyed' when survivors reach 0", () => {
    const s = { ...antiMechState(), survivingTroopers: 0 };
    expect(legAttackDenyReason(s)).toBe('destroyed');
  });

  it("'routed' when routed", () => {
    const s = { ...antiMechState(), routed: true };
    expect(legAttackDenyReason(s)).toBe('routed');
  });

  it("'pinned' when pinned", () => {
    const s = { ...antiMechState(), pinned: true };
    expect(legAttackDenyReason(s)).toBe('pinned');
  });

  it("'already_committed' when committed this turn", () => {
    const s = { ...antiMechState(), antiMechCommitted: true };
    expect(legAttackDenyReason(s)).toBe('already_committed');
  });
});

describe('declareLegAttack — success path', () => {
  it('dice 6+6 + pilot 3 = 15 vs mech pilot 4+4=8 → success, dmg = 28×2', () => {
    const s = antiMechState();
    const r = declareLegAttack({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      platoonPiloting: 3,
      mechPiloting: 4,
      diceRoller: fixedRoller(6),
    });
    expect(r.declared).toBe(true);
    if (r.declared) {
      expect(r.success).toBe(true);
      expect(r.rollTotal).toBe(6 + 6 + 3);
      expect(r.targetNumber).toBe(4 + 4);
      expect(r.damage).toBe(28 * 2);
      expect(r.counterCasualties).toBe(0);
      expect(r.state.antiMechCommitted).toBe(true);
      expect(r.state.survivingTroopers).toBe(28); // no casualties on success
      const ev = r.events.find(
        (e) => e.type === InfantryEventType.ANTI_MECH_LEG_ATTACK,
      );
      expect(ev).toBeDefined();
      if (ev && ev.type === InfantryEventType.ANTI_MECH_LEG_ATTACK) {
        expect(ev.success).toBe(true);
        expect(ev.damage).toBe(56);
      }
    }
  });

  it('exactly meeting TN is a success', () => {
    const s = antiMechState();
    // roll 4+4 + 0 = 8, TN = 4+4 = 8 → success
    const r = declareLegAttack({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      platoonPiloting: 0,
      mechPiloting: 4,
      diceRoller: fixedRoller(4),
    });
    expect(r.declared).toBe(true);
    if (r.declared) expect(r.success).toBe(true);
  });
});

describe('declareLegAttack — failure path', () => {
  it('dice 1+1 + 0 = 2 vs TN 8 → fail, counter 1d6 casualties', () => {
    const s = antiMechState();
    // d1 = 1, d2 = 1 (fail), counter d6 = 1
    let call = 0;
    const seq = [1, 1, 1];
    const roller = () => seq[call++] ?? 1;
    const r = declareLegAttack({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      platoonPiloting: 0,
      mechPiloting: 4,
      diceRoller: roller,
    });
    expect(r.declared).toBe(true);
    if (r.declared) {
      expect(r.success).toBe(false);
      expect(r.damage).toBe(0);
      expect(r.counterCasualties).toBe(1);
      expect(r.state.survivingTroopers).toBe(27);
      expect(r.state.destroyed).toBe(false);
    }
  });

  it('counter casualties wipe out the platoon → destroyed', () => {
    const s = { ...antiMechState(), survivingTroopers: 3 };
    // fail (1+1=2 vs TN 8), counter = 6, but only 3 left
    let call = 0;
    const seq = [1, 1, 6];
    const roller = () => seq[call++] ?? 1;
    const r = declareLegAttack({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      platoonPiloting: 0,
      mechPiloting: 4,
      diceRoller: roller,
    });
    expect(r.declared).toBe(true);
    if (r.declared) {
      expect(r.success).toBe(false);
      expect(r.counterCasualties).toBe(3);
      expect(r.state.survivingTroopers).toBe(0);
      expect(r.state.destroyed).toBe(true);
      expect(r.state.fieldGunOperational).toBe(false);
    }
  });
});

describe('declareLegAttack — denial', () => {
  it('platoon without training returns declared=false', () => {
    const s = { ...antiMechState(), hasAntiMechTraining: false };
    const r = declareLegAttack({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      platoonPiloting: 3,
      mechPiloting: 4,
      diceRoller: fixedRoller(6),
    });
    expect(r.declared).toBe(false);
    if (!r.declared) {
      expect(r.reason).toBe('no_training');
      expect(r.events.length).toBe(0);
      expect(r.state).toBe(s);
    }
  });

  it('pinned platoon denied', () => {
    const s = { ...antiMechState(), pinned: true };
    const r = declareLegAttack({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      platoonPiloting: 3,
      mechPiloting: 4,
      diceRoller: fixedRoller(6),
    });
    expect(r.declared).toBe(false);
    if (!r.declared) expect(r.reason).toBe('pinned');
  });

  it('already-committed platoon denied', () => {
    const s = { ...antiMechState(), antiMechCommitted: true };
    const r = declareLegAttack({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      platoonPiloting: 3,
      mechPiloting: 4,
      diceRoller: fixedRoller(6),
    });
    expect(r.declared).toBe(false);
    if (!r.declared) expect(r.reason).toBe('already_committed');
  });
});

describe('clearAntiMechCommitted', () => {
  it('clears committed flag', () => {
    const s = { ...antiMechState(), antiMechCommitted: true };
    const out = clearAntiMechCommitted(s);
    expect(out.antiMechCommitted).toBe(false);
  });

  it('no-op when not committed', () => {
    const s = antiMechState();
    expect(clearAntiMechCommitted(s)).toBe(s);
  });
});
