/**
 * Infantry combat-state tests.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/infantry-unit-system/spec.md
 */

import { InfantryArmorKit } from '../../../../types/unit/PersonnelInterfaces';
import {
  InfantryMorale,
  createInfantryCombatState,
  isPlatoonDestroyed,
  moraleThreshold,
  shouldTriggerMoraleCheck,
} from '../state';

describe('createInfantryCombatState', () => {
  it('initialises a 28-trooper Foot platoon to full strength + normal morale', () => {
    const s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    expect(s.survivingTroopers).toBe(28);
    expect(s.startingTroopers).toBe(28);
    expect(s.morale).toBe(InfantryMorale.NORMAL);
    expect(s.pinned).toBe(false);
    expect(s.routed).toBe(false);
    expect(s.antiMechCommitted).toBe(false);
    expect(s.fieldGunOperational).toBe(false);
  });

  it('marks field gun operational when crew > 0 AND ammo > 0', () => {
    const s = createInfantryCombatState({
      startingTroopers: 20,
      armorKit: InfantryArmorKit.FLAK,
      hasAntiMechTraining: false,
      fieldGunCrew: 3,
      fieldGunAmmo: 10,
    });
    expect(s.fieldGunOperational).toBe(true);
    expect(s.fieldGunCrew).toBe(3);
    expect(s.fieldGunAmmo).toBe(10);
  });

  it('leaves field gun inoperable when ammo is 0', () => {
    const s = createInfantryCombatState({
      startingTroopers: 20,
      armorKit: InfantryArmorKit.FLAK,
      hasAntiMechTraining: false,
      fieldGunCrew: 3,
      fieldGunAmmo: 0,
    });
    expect(s.fieldGunOperational).toBe(false);
  });
});

describe('moraleThreshold', () => {
  it('returns floor(starting × 0.25)', () => {
    const s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    // 28 × 0.25 = 7
    expect(moraleThreshold(s)).toBe(7);
  });
});

describe('shouldTriggerMoraleCheck', () => {
  it('returns true when surviving troopers drop below the threshold', () => {
    let s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    s = { ...s, survivingTroopers: 6 }; // below 7
    expect(shouldTriggerMoraleCheck(s)).toBe(true);
  });

  it('returns false when surviving troopers equal the threshold', () => {
    let s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    s = { ...s, survivingTroopers: 7 };
    expect(shouldTriggerMoraleCheck(s)).toBe(false);
  });

  it('returns false when already routed even if under threshold', () => {
    let s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    s = { ...s, survivingTroopers: 3, routed: true };
    expect(shouldTriggerMoraleCheck(s)).toBe(false);
  });
});

describe('isPlatoonDestroyed', () => {
  it('true when survivingTroopers reaches 0', () => {
    let s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    s = { ...s, survivingTroopers: 0 };
    expect(isPlatoonDestroyed(s)).toBe(true);
  });

  it('true when routed even with troopers alive', () => {
    let s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    s = { ...s, survivingTroopers: 10, routed: true };
    expect(isPlatoonDestroyed(s)).toBe(true);
  });

  it('false when healthy', () => {
    const s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    expect(isPlatoonDestroyed(s)).toBe(false);
  });
});
