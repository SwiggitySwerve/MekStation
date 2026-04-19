/**
 * Infantry damage resolver tests.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 *       #requirement Infantry Casualties from Effective Damage
 *       #requirement Infantry Damage Divisor
 * @spec openspec/changes/add-infantry-combat-behavior/specs/infantry-unit-system/spec.md
 *       #requirement Field Gun Crew Damage
 */

import { InfantryArmorKit } from '../../../../types/unit/PersonnelInterfaces';
import { applyFlakReduction, infantryResolveDamage } from '../damage';
import { InfantryEventType } from '../events';
import { createInfantryCombatState } from '../state';

describe('applyFlakReduction', () => {
  it('halves ballistic damage when kit === FLAK', () => {
    expect(applyFlakReduction(10, InfantryArmorKit.FLAK, true)).toBe(5);
  });

  it('does nothing for non-ballistic damage even with FLAK', () => {
    expect(applyFlakReduction(10, InfantryArmorKit.FLAK, false)).toBe(10);
  });

  it('does nothing for ballistic damage with non-FLAK kit', () => {
    expect(applyFlakReduction(10, InfantryArmorKit.STANDARD, true)).toBe(10);
  });
});

describe('infantryResolveDamage — simple casualty math', () => {
  it('28-trooper platoon with resilience 1: 5 effective damage kills 5 troopers', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 5,
      weaponCategory: 'energy', // ×1 multiplier
    });
    expect(r.casualties).toBe(5);
    expect(r.state.survivingTroopers).toBe(23);
    expect(r.destroyedThisHit).toBe(false);
    const casEv = r.events.find(
      (e) => e.type === InfantryEventType.INFANTRY_CASUALTIES,
    );
    expect(casEv).toBeDefined();
  });

  it('Flamer doubles damage → 2 raw × 2 = 4 casualties', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 2,
      weaponCategory: 'flamer',
    });
    expect(r.effectiveDamage).toBe(4);
    expect(r.casualties).toBe(4);
    expect(r.state.survivingTroopers).toBe(24);
  });

  it('MG doubles damage → 2 raw × 2 = 4 casualties', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 2,
      weaponCategory: 'mg',
    });
    expect(r.effectiveDamage).toBe(4);
    expect(r.casualties).toBe(4);
  });

  it('PPC baseline: 10 raw × 1 = 10 casualties', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 10,
      weaponCategory: 'energy',
    });
    expect(r.effectiveDamage).toBe(10);
    expect(r.casualties).toBe(10);
  });
});

describe('infantryResolveDamage — Flak reduction', () => {
  it('10 ballistic effective × Flak kit → 5 casualties', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.FLAK,
      hasAntiMechTraining: false,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 10,
      weaponCategory: 'ballistic',
      isBallistic: true,
    });
    expect(r.effectiveDamage).toBe(5);
    expect(r.casualties).toBe(5);
  });

  it('10 ballistic effective × STANDARD kit → 10 casualties (no reduction)', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.STANDARD,
      hasAntiMechTraining: false,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 10,
      weaponCategory: 'ballistic',
      isBallistic: true,
    });
    expect(r.casualties).toBe(10);
  });
});

describe('infantryResolveDamage — morale trigger', () => {
  it('28-trooper platoon reduced to 6 (below 7 threshold) queues morale check', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    // 22 damage → 22 casualties → survivors = 6, below 7
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 22,
      weaponCategory: 'energy',
    });
    expect(r.state.survivingTroopers).toBe(6);
    expect(r.moraleCheckQueued).toBe(true);
    expect(r.state.moraleCheckPending).toBe(true);
  });

  it('reducing to exactly 7 (25%) does NOT queue morale — strict below', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 21,
      weaponCategory: 'energy',
    });
    expect(r.state.survivingTroopers).toBe(7);
    expect(r.moraleCheckQueued).toBe(false);
  });
});

describe('infantryResolveDamage — destruction', () => {
  it('damage ≥ surviving troopers destroys the platoon', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 50,
      weaponCategory: 'energy',
    });
    expect(r.destroyedThisHit).toBe(true);
    expect(r.state.destroyed).toBe(true);
    expect(r.state.survivingTroopers).toBe(0);
    expect(
      r.events.find((e) => e.type === InfantryEventType.INFANTRY_DESTROYED),
    ).toBeDefined();
  });

  it('damaging an already-destroyed platoon is a no-op', () => {
    let state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    state = { ...state, destroyed: true, survivingTroopers: 0 };
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 50,
      weaponCategory: 'energy',
    });
    expect(r.casualties).toBe(0);
    expect(r.events.length).toBe(0);
  });

  it('raw damage ≤ 0 is a no-op', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 0,
      weaponCategory: 'energy',
    });
    expect(r.casualties).toBe(0);
    expect(r.events.length).toBe(0);
  });
});

describe('infantryResolveDamage — field gun crew damage', () => {
  it('4 effective dmg to field-gun hex kills 2 crew, leaves gun operational at 1 crew', () => {
    const state = createInfantryCombatState({
      startingTroopers: 20,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
      fieldGunCrew: 3,
      fieldGunAmmo: 10,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 4,
      weaponCategory: 'energy',
      affectsFieldGunCrew: true,
    });
    expect(r.fieldGunCrewLost).toBe(2);
    expect(r.state.fieldGunCrew).toBe(1);
    expect(r.state.fieldGunOperational).toBe(true);
    expect(r.fieldGunDestroyedThisHit).toBe(false);
  });

  it('all crew dying fires FieldGunDestroyed event', () => {
    const state = createInfantryCombatState({
      startingTroopers: 20,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
      fieldGunCrew: 3,
      fieldGunAmmo: 10,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 6,
      weaponCategory: 'energy',
      affectsFieldGunCrew: true,
    });
    expect(r.fieldGunCrewLost).toBe(3);
    expect(r.state.fieldGunCrew).toBe(0);
    expect(r.state.fieldGunOperational).toBe(false);
    expect(r.fieldGunDestroyedThisHit).toBe(true);
    expect(
      r.events.find((e) => e.type === InfantryEventType.FIELD_GUN_DESTROYED),
    ).toBeDefined();
  });

  it('non-field-gun hex does not affect crew', () => {
    const state = createInfantryCombatState({
      startingTroopers: 20,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
      fieldGunCrew: 3,
      fieldGunAmmo: 10,
    });
    const r = infantryResolveDamage({
      unitId: 'pl-1',
      state,
      rawDamage: 10,
      weaponCategory: 'energy',
      affectsFieldGunCrew: false,
    });
    expect(r.fieldGunCrewLost).toBe(0);
    expect(r.state.fieldGunCrew).toBe(3);
  });
});
