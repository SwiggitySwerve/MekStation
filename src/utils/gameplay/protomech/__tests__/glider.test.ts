/**
 * Glider ProtoMech tests.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement glider-protomech-fall-rule
 */

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import { ProtoEventType } from '../events';
import {
  GLIDER_FALL_TN,
  applyGliderFall,
  gliderAttackerToHitBonus,
  gliderFallCheckRequired,
  resolveGliderFallCheck,
  resolveGliderFallCheckFromRoll,
} from '../glider';
import { createProtoMechCombatState } from '../state';

function mkGlider(altitude: number) {
  return createProtoMechCombatState({
    unitId: 'glider-1',
    chassisType: ProtoChassis.GLIDER,
    hasMainGun: false,
    armorByLocation: {
      [ProtoLocation.TORSO]: 4,
      [ProtoLocation.HEAD]: 1,
    },
    structureByLocation: {
      [ProtoLocation.TORSO]: 2,
      [ProtoLocation.HEAD]: 1,
    },
    altitude,
  });
}

function mkBiped() {
  return createProtoMechCombatState({
    unitId: 'biped-1',
    chassisType: ProtoChassis.BIPED,
    hasMainGun: false,
    armorByLocation: { [ProtoLocation.TORSO]: 4 },
    structureByLocation: { [ProtoLocation.TORSO]: 2 },
  });
}

describe('GLIDER_FALL_TN', () => {
  it('is 7', () => {
    expect(GLIDER_FALL_TN).toBe(7);
  });
});

describe('gliderAttackerToHitBonus', () => {
  it('+1 for airborne glider', () => {
    expect(gliderAttackerToHitBonus(mkGlider(3))).toBe(1);
  });
  it('0 for grounded glider (altitude 0)', () => {
    expect(gliderAttackerToHitBonus(mkGlider(0))).toBe(0);
  });
  it('0 for non-glider chassis', () => {
    expect(gliderAttackerToHitBonus(mkBiped())).toBe(0);
  });
});

describe('gliderFallCheckRequired', () => {
  it('true for airborne glider + structure exposed', () => {
    expect(
      gliderFallCheckRequired({
        chassisType: ProtoChassis.GLIDER,
        altitude: 3,
        structureExposed: true,
      }),
    ).toBe(true);
  });
  it('false when grounded (altitude 0)', () => {
    expect(
      gliderFallCheckRequired({
        chassisType: ProtoChassis.GLIDER,
        altitude: 0,
        structureExposed: true,
      }),
    ).toBe(false);
  });
  it('false when no structure exposed', () => {
    expect(
      gliderFallCheckRequired({
        chassisType: ProtoChassis.GLIDER,
        altitude: 3,
        structureExposed: false,
      }),
    ).toBe(false);
  });
  it('false for non-glider chassis', () => {
    expect(
      gliderFallCheckRequired({
        chassisType: ProtoChassis.BIPED,
        altitude: 3,
        structureExposed: true,
      }),
    ).toBe(false);
  });
  it('treats undefined altitude as 0', () => {
    expect(
      gliderFallCheckRequired({
        chassisType: ProtoChassis.GLIDER,
        altitude: undefined,
        structureExposed: true,
      }),
    ).toBe(false);
  });
});

describe('resolveGliderFallCheckFromRoll', () => {
  it('passes on roll >= 7', () => {
    const r = resolveGliderFallCheckFromRoll(mkGlider(3), [4, 3]);
    expect(r.rollTotal).toBe(7);
    expect(r.passed).toBe(true);
  });
  it('fails on roll < 7', () => {
    const r = resolveGliderFallCheckFromRoll(mkGlider(3), [3, 3]);
    expect(r.rollTotal).toBe(6);
    expect(r.passed).toBe(false);
  });
});

describe('resolveGliderFallCheck (with roller)', () => {
  it('uses injected diceRoller', () => {
    const rolls = [5, 4];
    const roller = () => rolls.shift() ?? 1;
    const r = resolveGliderFallCheck(mkGlider(2), roller);
    expect(r.dice).toEqual([5, 4]);
    expect(r.rollTotal).toBe(9);
    expect(r.passed).toBe(true);
  });
});

describe('applyGliderFall — pass', () => {
  it('no damage, no altitude change, emits check event only', () => {
    const s = mkGlider(3);
    const check = resolveGliderFallCheckFromRoll(s, [4, 4]);
    const r = applyGliderFall(s, check);
    expect(r.fell).toBe(false);
    expect(r.fallDamage).toBe(0);
    expect(r.state.altitude).toBe(3);
    expect(r.events).toHaveLength(1);
    expect(r.events[0].type).toBe(ProtoEventType.GLIDER_FALL_CHECK);
  });
});

describe('applyGliderFall — fail', () => {
  it('fell at altitude 3 → fallDamage 30 + altitude reset to 0', () => {
    const s = mkGlider(3);
    const check = resolveGliderFallCheckFromRoll(s, [2, 2]);
    const r = applyGliderFall(s, check);
    expect(r.fell).toBe(true);
    expect(r.fallDamage).toBe(30);
    expect(r.altitudeAtFall).toBe(3);
    expect(r.state.altitude).toBe(0);
    expect(r.events[0].type).toBe(ProtoEventType.GLIDER_FALL_CHECK);
    expect(r.events[1].type).toBe(ProtoEventType.GLIDER_FALL);
    if (r.events[1].type === ProtoEventType.GLIDER_FALL) {
      expect(r.events[1].altitudeAtFall).toBe(3);
      expect(r.events[1].fallDamage).toBe(30);
    }
  });

  it('altitude 1 → fallDamage 10', () => {
    const s = mkGlider(1);
    const check = resolveGliderFallCheckFromRoll(s, [1, 1]);
    const r = applyGliderFall(s, check);
    expect(r.fallDamage).toBe(10);
  });

  it('altitude 0 → fallDamage 0 even on fail', () => {
    const s = mkGlider(0);
    const check = resolveGliderFallCheckFromRoll(s, [1, 1]);
    const r = applyGliderFall(s, check);
    expect(r.fallDamage).toBe(0);
    expect(r.state.altitude).toBe(0);
  });
});
