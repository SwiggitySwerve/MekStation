/**
 * ProtoMech combat dispatch tests — end-to-end pipeline.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement protomech-combat-dispatch
 */

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import { dispatchProtoCombat } from '../dispatch';
import { ProtoEventType } from '../events';
import { determineProtoHitLocationFromRoll } from '../hitLocation';
import { createProtoMechCombatState } from '../state';

function mkBiped() {
  return createProtoMechCombatState({
    unitId: 'proto-1',
    chassisType: ProtoChassis.BIPED,
    hasMainGun: true,
    armorByLocation: {
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 8,
      [ProtoLocation.LEFT_ARM]: 3,
      [ProtoLocation.RIGHT_ARM]: 3,
      [ProtoLocation.LEGS]: 5,
      [ProtoLocation.MAIN_GUN]: 2,
    },
    structureByLocation: {
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 4,
      [ProtoLocation.LEFT_ARM]: 2,
      [ProtoLocation.RIGHT_ARM]: 2,
      [ProtoLocation.LEGS]: 3,
      [ProtoLocation.MAIN_GUN]: 1,
    },
  });
}

function mkGlider(altitude: number) {
  return createProtoMechCombatState({
    unitId: 'glider-1',
    chassisType: ProtoChassis.GLIDER,
    hasMainGun: false,
    armorByLocation: {
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 4,
      [ProtoLocation.LEFT_ARM]: 2,
      [ProtoLocation.RIGHT_ARM]: 2,
      [ProtoLocation.LEGS]: 3,
    },
    structureByLocation: {
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 2,
      [ProtoLocation.LEFT_ARM]: 1,
      [ProtoLocation.RIGHT_ARM]: 1,
      [ProtoLocation.LEGS]: 2,
    },
    altitude,
  });
}

describe('dispatchProtoCombat — armor-only hit', () => {
  it('5 damage to front torso (8 armor) → no structure exposed, no crit, no events', () => {
    const s = mkBiped();
    const hit = determineProtoHitLocationFromRoll('front', [3, 4], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    const r = dispatchProtoCombat({
      state: s,
      hit,
      damage: 5,
    });
    expect(r.state.armorByLocation[ProtoLocation.TORSO]).toBe(3);
    expect(r.damageResult.locationDamage.structureExposed).toBe(false);
    expect(r.critResult).toBeUndefined();
    expect(r.fallResult).toBeUndefined();
    expect(r.unitDestroyed).toBe(false);
    expect(r.events).toHaveLength(0);
  });
});

describe('dispatchProtoCombat — structure-exposing hit triggers crit', () => {
  it('10 damage to torso → armor gone, structure hit, crit rolled', () => {
    const s = mkBiped();
    const hit = determineProtoHitLocationFromRoll('front', [3, 4], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    // Torso has 8 armor + 4 structure; 10 damage leaves structure at 2.
    const r = dispatchProtoCombat({
      state: s,
      hit,
      damage: 10,
      // Force crit roll = 3 (none) for determinism
      critDiceRoller: () => 1,
    });
    expect(r.damageResult.locationDamage.structureExposed).toBe(true);
    expect(r.damageResult.locationDamage.destroyed).toBe(false);
    expect(r.critResult).toBeDefined();
    expect(r.critResult?.applied.kind).toBe('none');
  });

  it('TAC (natural 2) triggers crit even on armor-only hit', () => {
    const s = mkBiped();
    const hit = determineProtoHitLocationFromRoll('front', [1, 1], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    // damage 1 won't break armor, but TAC should still fire crit
    const r = dispatchProtoCombat({
      state: s,
      hit,
      damage: 1,
      critDiceRoller: () => 4, // 2d6 = 8 → equipment crit
    });
    expect(r.damageResult.locationDamage.structureExposed).toBe(false);
    expect(r.critResult).toBeDefined();
    expect(r.critResult?.applied.kind).toBe('equipment');
  });
});

describe('dispatchProtoCombat — Glider fall check', () => {
  it('airborne Glider + structure exposed → fall check fires', () => {
    const s = mkGlider(3);
    const hit = determineProtoHitLocationFromRoll('front', [3, 4], {
      chassisType: ProtoChassis.GLIDER,
      hasMainGun: false,
    });
    const r = dispatchProtoCombat({
      state: s,
      hit,
      damage: 5, // 4 armor + 1 structure exposed, torso not destroyed
      critDiceRoller: () => 1, // no crit
      fallDiceRoller: () => 5, // 2d6 = 10 → pass
    });
    expect(r.fallResult).toBeDefined();
    expect(r.fallResult?.fell).toBe(false);
    expect(
      r.events.find((e) => e.type === ProtoEventType.GLIDER_FALL_CHECK),
    ).toBeDefined();
  });

  it('airborne Glider + fall check fails → altitude resets to 0', () => {
    const s = mkGlider(3);
    const hit = determineProtoHitLocationFromRoll('front', [3, 4], {
      chassisType: ProtoChassis.GLIDER,
      hasMainGun: false,
    });
    const r = dispatchProtoCombat({
      state: s,
      hit,
      damage: 5, // armor gone + 1 structure, not destroyed
      critDiceRoller: () => 1,
      fallDiceRoller: () => 1, // 2d6 = 2 → fail
    });
    expect(r.fallResult?.fell).toBe(true);
    expect(r.state.altitude).toBe(0);
    expect(
      r.events.find((e) => e.type === ProtoEventType.GLIDER_FALL),
    ).toBeDefined();
  });

  it('grounded Glider — no fall check even with structure exposed', () => {
    const s = mkGlider(0);
    const hit = determineProtoHitLocationFromRoll('front', [3, 4], {
      chassisType: ProtoChassis.GLIDER,
      hasMainGun: false,
    });
    const r = dispatchProtoCombat({
      state: s,
      hit,
      damage: 5, // structure exposed, not destroyed
      critDiceRoller: () => 1,
    });
    expect(r.damageResult.locationDamage.structureExposed).toBe(true);
    expect(r.fallResult).toBeUndefined();
  });

  it('Biped chassis never triggers fall check', () => {
    const s = mkBiped();
    const hit = determineProtoHitLocationFromRoll('front', [3, 4], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    const r = dispatchProtoCombat({
      state: s,
      hit,
      damage: 10,
      critDiceRoller: () => 1,
    });
    expect(r.fallResult).toBeUndefined();
  });
});

describe('dispatchProtoCombat — head destruction ends pipeline', () => {
  it('massive damage to head → destroyed, no crit or fall check', () => {
    const s = mkBiped();
    const hit = determineProtoHitLocationFromRoll('front', [6, 6], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    const r = dispatchProtoCombat({
      state: s,
      hit,
      damage: 100,
      critDiceRoller: () => 6,
    });
    expect(r.unitDestroyed).toBe(true);
    // Crit/fall should be skipped after destruction
    expect(r.critResult).toBeUndefined();
    expect(r.fallResult).toBeUndefined();
    expect(
      r.events.find((e) => e.type === ProtoEventType.PROTO_UNIT_DESTROYED),
    ).toBeDefined();
  });
});

describe('dispatchProtoCombat — events aggregated in order', () => {
  it('damage → fall → crit events stack in correct order', () => {
    const s = mkGlider(3);
    const hit = determineProtoHitLocationFromRoll('front', [3, 4], {
      chassisType: ProtoChassis.GLIDER,
      hasMainGun: false,
    });
    const r = dispatchProtoCombat({
      state: s,
      hit,
      damage: 5, // 4 armor + 1 structure — not destroyed
      critDiceRoller: () => 4, // 8 → equipment
      fallDiceRoller: () => 5, // pass, no fall
    });
    // Expect at least the fall-check event followed by the equipment-crit event.
    const types = r.events.map((e) => e.type);
    const fallIdx = types.indexOf(ProtoEventType.GLIDER_FALL_CHECK);
    const critIdx = types.indexOf(ProtoEventType.PROTO_COMPONENT_DESTROYED);
    expect(fallIdx).toBeGreaterThanOrEqual(0);
    expect(critIdx).toBeGreaterThan(fallIdx);
  });
});
