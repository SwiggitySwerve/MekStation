/**
 * Field gun firing tests.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 *       #requirement Field Gun Firing
 */

import { InfantryArmorKit } from '../../../../types/unit/PersonnelInterfaces';
import { InfantryEventType } from '../events';
import { fieldGunCannotFireReason, fireFieldGun } from '../fieldGun';
import { createInfantryCombatState } from '../state';

function armedState() {
  return createInfantryCombatState({
    startingTroopers: 20,
    armorKit: InfantryArmorKit.NONE,
    hasAntiMechTraining: false,
    fieldGunCrew: 3,
    fieldGunAmmo: 5,
  });
}

describe('fieldGunCannotFireReason', () => {
  it('returns null for a healthy armed platoon', () => {
    expect(fieldGunCannotFireReason(armedState())).toBeNull();
  });

  it("returns 'destroyed' when the platoon is destroyed", () => {
    const s = { ...armedState(), destroyed: true, survivingTroopers: 0 };
    expect(fieldGunCannotFireReason(s)).toBe('destroyed');
  });

  it("returns 'destroyed' when survivingTroopers reaches 0", () => {
    const s = { ...armedState(), survivingTroopers: 0 };
    expect(fieldGunCannotFireReason(s)).toBe('destroyed');
  });

  it("returns 'routed' when platoon routed (before pinned check)", () => {
    const s = { ...armedState(), routed: true, pinned: true };
    expect(fieldGunCannotFireReason(s)).toBe('routed');
  });

  it("returns 'pinned' when platoon pinned", () => {
    const s = { ...armedState(), pinned: true };
    expect(fieldGunCannotFireReason(s)).toBe('pinned');
  });

  it("returns 'no_crew' when all crew lost", () => {
    const s = { ...armedState(), fieldGunCrew: 0 };
    expect(fieldGunCannotFireReason(s)).toBe('no_crew');
  });

  it("returns 'out_of_ammo' when ammo = 0", () => {
    const s = { ...armedState(), fieldGunAmmo: 0, fieldGunOperational: false };
    // ammo check happens after crew check; with crew>0 but ammo=0
    const s2 = { ...armedState(), fieldGunAmmo: 0 };
    expect(fieldGunCannotFireReason(s2)).toBe('out_of_ammo');
    expect(fieldGunCannotFireReason(s)).toBe('out_of_ammo');
  });

  it("returns 'inoperable' when fieldGunOperational=false but crew+ammo>0", () => {
    const s = { ...armedState(), fieldGunOperational: false };
    expect(fieldGunCannotFireReason(s)).toBe('inoperable');
  });
});

describe('fireFieldGun', () => {
  it('fires successfully, decrements ammo, emits FieldGunFired', () => {
    const s = armedState();
    const r = fireFieldGun({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      damage: 10,
      rangeBand: 'short',
    });
    expect(r.fired).toBe(true);
    if (r.fired) {
      expect(r.damageDealt).toBe(10);
      expect(r.ammoRemaining).toBe(4);
      expect(r.state.fieldGunAmmo).toBe(4);
      expect(r.state.fieldGunOperational).toBe(true);
      const ev = r.events.find(
        (e) => e.type === InfantryEventType.FIELD_GUN_FIRED,
      );
      expect(ev).toBeDefined();
      if (ev && ev.type === InfantryEventType.FIELD_GUN_FIRED) {
        expect(ev.targetUnitId).toBe('mech-1');
        expect(ev.damage).toBe(10);
        expect(ev.rangeBand).toBe('short');
        expect(ev.ammoRemaining).toBe(4);
      }
    }
  });

  it('firing the last round drops operational flag to false', () => {
    const s = { ...armedState(), fieldGunAmmo: 1 };
    const r = fireFieldGun({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      damage: 10,
      rangeBand: 'medium',
    });
    expect(r.fired).toBe(true);
    if (r.fired) {
      expect(r.ammoRemaining).toBe(0);
      expect(r.state.fieldGunOperational).toBe(false);
    }
  });

  it('denies firing when damage ≤ 0', () => {
    const s = armedState();
    const r = fireFieldGun({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      damage: 0,
      rangeBand: 'short',
    });
    expect(r.fired).toBe(false);
    if (!r.fired) {
      expect(r.reason).toBe('no_damage');
      expect(r.events.length).toBe(0);
      expect(r.state).toBe(s);
    }
  });

  it('denies firing when pinned', () => {
    const s = { ...armedState(), pinned: true };
    const r = fireFieldGun({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      damage: 10,
      rangeBand: 'long',
    });
    expect(r.fired).toBe(false);
    if (!r.fired) {
      expect(r.reason).toBe('pinned');
      expect(r.state.fieldGunAmmo).toBe(5); // unchanged
    }
  });

  it('denies firing when routed', () => {
    const s = { ...armedState(), routed: true };
    const r = fireFieldGun({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      damage: 10,
      rangeBand: 'short',
    });
    expect(r.fired).toBe(false);
    if (!r.fired) expect(r.reason).toBe('routed');
  });

  it('denies firing when crew = 0', () => {
    const s = { ...armedState(), fieldGunCrew: 0 };
    const r = fireFieldGun({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      damage: 10,
      rangeBand: 'short',
    });
    expect(r.fired).toBe(false);
    if (!r.fired) expect(r.reason).toBe('no_crew');
  });

  it('denies firing when ammo = 0', () => {
    const s = { ...armedState(), fieldGunAmmo: 0 };
    const r = fireFieldGun({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      damage: 10,
      rangeBand: 'short',
    });
    expect(r.fired).toBe(false);
    if (!r.fired) expect(r.reason).toBe('out_of_ammo');
  });

  it('denies firing when destroyed', () => {
    const s = { ...armedState(), destroyed: true, survivingTroopers: 0 };
    const r = fireFieldGun({
      unitId: 'pl-1',
      targetUnitId: 'mech-1',
      state: s,
      damage: 10,
      rangeBand: 'short',
    });
    expect(r.fired).toBe(false);
    if (!r.fired) expect(r.reason).toBe('destroyed');
  });
});
