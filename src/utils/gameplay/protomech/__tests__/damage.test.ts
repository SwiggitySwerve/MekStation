/**
 * ProtoMech damage-chain tests.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement protomech-damage-chain
 */

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import {
  applyProtoDamageToLocation,
  applyProtoDestructionSideEffects,
  protoMechResolveDamage,
} from '../damage';
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

function mkQuad() {
  return createProtoMechCombatState({
    unitId: 'quad-1',
    chassisType: ProtoChassis.QUAD,
    hasMainGun: false,
    armorByLocation: {
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 6,
      [ProtoLocation.FRONT_LEGS]: 4,
      [ProtoLocation.REAR_LEGS]: 4,
    },
    structureByLocation: {
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 3,
      [ProtoLocation.FRONT_LEGS]: 2,
      [ProtoLocation.REAR_LEGS]: 2,
    },
  });
}

describe('applyProtoDamageToLocation', () => {
  it('absorbs damage entirely into armor when armor >= damage', () => {
    const s = mkBiped();
    const { state, result } = applyProtoDamageToLocation(
      s,
      ProtoLocation.TORSO,
      5,
    );
    expect(state.armorByLocation[ProtoLocation.TORSO]).toBe(3);
    expect(result.armorDamage).toBe(5);
    expect(result.structureDamage).toBe(0);
    expect(result.structureExposed).toBe(false);
    expect(result.destroyed).toBe(false);
    expect(result.excessDiscarded).toBe(0);
  });

  it('overflows armor into structure, flags structureExposed', () => {
    const s = mkBiped();
    const { state, result } = applyProtoDamageToLocation(
      s,
      ProtoLocation.TORSO,
      10,
    );
    expect(state.armorByLocation[ProtoLocation.TORSO]).toBe(0);
    expect(state.structureByLocation[ProtoLocation.TORSO]).toBe(2);
    expect(result.armorDamage).toBe(8);
    expect(result.structureDamage).toBe(2);
    expect(result.structureExposed).toBe(true);
    expect(result.destroyed).toBe(false);
  });

  it('discards excess damage past structure (no transfer)', () => {
    const s = mkBiped();
    const { state, result } = applyProtoDamageToLocation(
      s,
      ProtoLocation.HEAD,
      50,
    );
    expect(state.armorByLocation[ProtoLocation.HEAD]).toBe(0);
    expect(state.structureByLocation[ProtoLocation.HEAD]).toBe(0);
    expect(result.armorDamage).toBe(1);
    expect(result.structureDamage).toBe(1);
    expect(result.destroyed).toBe(true);
    // 50 - 1 (armor) - 1 (structure) = 48 discarded
    expect(result.excessDiscarded).toBe(48);
  });

  it('flags destroyed + adds to destroyedLocations when structure hits 0', () => {
    const s = mkBiped();
    const { state, result } = applyProtoDamageToLocation(
      s,
      ProtoLocation.LEFT_ARM,
      100,
    );
    expect(result.destroyed).toBe(true);
    expect(state.destroyedLocations).toContain(ProtoLocation.LEFT_ARM);
  });

  it('no-op on already destroyed location (damage fully discarded)', () => {
    const s0 = mkBiped();
    const { state: s1 } = applyProtoDamageToLocation(
      s0,
      ProtoLocation.LEFT_ARM,
      100,
    );
    const { state: s2, result } = applyProtoDamageToLocation(
      s1,
      ProtoLocation.LEFT_ARM,
      5,
    );
    expect(result.armorDamage).toBe(0);
    expect(result.structureDamage).toBe(0);
    expect(result.excessDiscarded).toBe(5);
    expect(s2.armorByLocation[ProtoLocation.LEFT_ARM]).toBe(0);
  });
});

describe('applyProtoDestructionSideEffects', () => {
  it('emits LocationDestroyed event for any destruction', () => {
    const s = mkBiped();
    const { events } = applyProtoDestructionSideEffects(
      s,
      ProtoLocation.LEFT_ARM,
    );
    expect(events[0].type).toBe(ProtoEventType.PROTO_LOCATION_DESTROYED);
  });

  it('MainGun destruction sets mainGunRemoved + emits event', () => {
    const s = mkBiped();
    const { state, events } = applyProtoDestructionSideEffects(
      s,
      ProtoLocation.MAIN_GUN,
    );
    expect(state.mainGunRemoved).toBe(true);
    expect(
      events.find((e) => e.type === ProtoEventType.PROTO_MAIN_GUN_REMOVED),
    ).toBeDefined();
  });

  it('Biped LEGS destruction immobilizes', () => {
    const s0 = mkBiped();
    const s1 = {
      ...s0,
      destroyedLocations: [...s0.destroyedLocations, ProtoLocation.LEGS],
    };
    const { state } = applyProtoDestructionSideEffects(s1, ProtoLocation.LEGS);
    expect(state.immobilized).toBe(true);
  });

  it('Quad needs BOTH FrontLegs AND RearLegs destroyed to immobilize', () => {
    const s0 = mkQuad();
    // Step 1: destroy FrontLegs only.
    const s1 = {
      ...s0,
      destroyedLocations: [...s0.destroyedLocations, ProtoLocation.FRONT_LEGS],
    };
    const { state: afterFront } = applyProtoDestructionSideEffects(
      s1,
      ProtoLocation.FRONT_LEGS,
    );
    expect(afterFront.immobilized).toBe(false);

    // Step 2: also destroy RearLegs.
    const s2 = {
      ...afterFront,
      destroyedLocations: [
        ...afterFront.destroyedLocations,
        ProtoLocation.REAR_LEGS,
      ],
    };
    const { state: afterBoth } = applyProtoDestructionSideEffects(
      s2,
      ProtoLocation.REAR_LEGS,
    );
    expect(afterBoth.immobilized).toBe(true);
  });

  it("Head destruction sets destroyed + 'head_destroyed' cause", () => {
    const s = mkBiped();
    const { state, events } = applyProtoDestructionSideEffects(
      s,
      ProtoLocation.HEAD,
    );
    expect(state.destroyed).toBe(true);
    expect(state.destructionCause).toBe('head_destroyed');
    expect(
      events.find((e) => e.type === ProtoEventType.PROTO_UNIT_DESTROYED),
    ).toBeDefined();
  });

  it("Torso destruction sets destroyed + 'torso_destroyed' cause", () => {
    const s = mkBiped();
    const { state } = applyProtoDestructionSideEffects(s, ProtoLocation.TORSO);
    expect(state.destroyed).toBe(true);
    expect(state.destructionCause).toBe('torso_destroyed');
  });

  it('Arm destruction does NOT destroy the proto', () => {
    const s = mkBiped();
    const { state } = applyProtoDestructionSideEffects(
      s,
      ProtoLocation.LEFT_ARM,
    );
    expect(state.destroyed).toBe(false);
  });
});

describe('protoMechResolveDamage (orchestrator)', () => {
  it('front torso hit of 5 leaves armor at 3, no events', () => {
    const s = mkBiped();
    const hit = determineProtoHitLocationFromRoll('front', [3, 4], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    const r = protoMechResolveDamage(s, hit, 5);
    expect(r.state.armorByLocation[ProtoLocation.TORSO]).toBe(3);
    expect(r.locationDamage.structureExposed).toBe(false);
    expect(r.events).toHaveLength(0);
    expect(r.unitDestroyed).toBe(false);
  });

  it('head destruction destroys proto + emits two events', () => {
    const s = mkBiped();
    const hit = determineProtoHitLocationFromRoll('front', [6, 6], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    const r = protoMechResolveDamage(s, hit, 50);
    expect(r.unitDestroyed).toBe(true);
    expect(
      r.events.find((e) => e.type === ProtoEventType.PROTO_LOCATION_DESTROYED),
    ).toBeDefined();
    expect(
      r.events.find((e) => e.type === ProtoEventType.PROTO_UNIT_DESTROYED),
    ).toBeDefined();
  });

  it('forcedLocation overrides the hit-location result', () => {
    const s = mkBiped();
    const hit = determineProtoHitLocationFromRoll('front', [1, 1], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    const r = protoMechResolveDamage(s, hit, 2, {
      forcedLocation: ProtoLocation.LEGS,
    });
    expect(r.locationDamage.location).toBe(ProtoLocation.LEGS);
    expect(r.state.armorByLocation[ProtoLocation.LEGS]).toBe(3);
    expect(r.state.armorByLocation[ProtoLocation.TORSO]).toBe(8);
  });
});
