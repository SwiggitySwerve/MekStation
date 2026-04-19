/**
 * ProtoMech critical-hit tests.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement protomech-critical-hit-table
 */

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import {
  applyProtoCritEffect,
  protoCritFromRoll,
  protoCritShouldTrigger,
  protoMechResolveCriticalHit,
} from '../criticalHits';
import { ProtoEventType } from '../events';
import { createProtoMechCombatState } from '../state';

function mkBiped() {
  return createProtoMechCombatState({
    unitId: 'proto-1',
    chassisType: ProtoChassis.BIPED,
    hasMainGun: true,
    armorByLocation: {
      [ProtoLocation.TORSO]: 8,
      [ProtoLocation.LEGS]: 5,
    },
    structureByLocation: {
      [ProtoLocation.TORSO]: 4,
      [ProtoLocation.LEGS]: 3,
    },
  });
}

describe('protoCritFromRoll', () => {
  it.each([
    [[1, 1], 2, 'none'],
    [[2, 2], 4, 'none'],
    [[3, 4], 7, 'none'],
    [[4, 4], 8, 'equipment'],
    [[5, 4], 9, 'equipment'],
    [[5, 5], 10, 'engine_hit'],
    [[6, 5], 11, 'engine_hit'],
    [[6, 6], 12, 'pilot_killed'],
  ] as Array<[[number, number], number, string]>)(
    'dice %j (roll %i) → %s',
    (dice, roll, kind) => {
      const r = protoCritFromRoll(dice);
      expect(r.roll).toBe(roll);
      expect(r.kind).toBe(kind);
    },
  );
});

describe('protoCritShouldTrigger', () => {
  it('true on TAC', () => {
    expect(
      protoCritShouldTrigger({ isTAC: true, structureExposed: false }),
    ).toBe(true);
  });
  it('true on structureExposed', () => {
    expect(
      protoCritShouldTrigger({ isTAC: false, structureExposed: true }),
    ).toBe(true);
  });
  it('true on both', () => {
    expect(
      protoCritShouldTrigger({ isTAC: true, structureExposed: true }),
    ).toBe(true);
  });
  it('false on neither', () => {
    expect(
      protoCritShouldTrigger({ isTAC: false, structureExposed: false }),
    ).toBe(false);
  });
});

describe('applyProtoCritEffect', () => {
  it("'none' returns state unchanged", () => {
    const s = mkBiped();
    const r = applyProtoCritEffect(
      s,
      { dice: [1, 1], roll: 2, kind: 'none' },
      { location: ProtoLocation.TORSO },
    );
    expect(r.state).toBe(s);
    expect(r.events).toHaveLength(0);
  });

  it("'equipment' emits ComponentDestroyed event with hit location", () => {
    const s = mkBiped();
    const r = applyProtoCritEffect(
      s,
      { dice: [4, 4], roll: 8, kind: 'equipment' },
      { location: ProtoLocation.LEGS },
    );
    expect(r.events).toHaveLength(1);
    const e = r.events[0];
    expect(e.type).toBe(ProtoEventType.PROTO_COMPONENT_DESTROYED);
    if (e.type === ProtoEventType.PROTO_COMPONENT_DESTROYED) {
      expect(e.location).toBe(ProtoLocation.LEGS);
      expect(e.component).toBe('equipment');
    }
  });

  it("first 'engine_hit' increments engineHits to 1, mpPenalty to 1, not destroyed", () => {
    const s = mkBiped();
    const r = applyProtoCritEffect(
      s,
      { dice: [5, 5], roll: 10, kind: 'engine_hit' },
      { location: ProtoLocation.TORSO },
    );
    expect(r.state.engineHits).toBe(1);
    expect(r.state.mpPenalty).toBe(1);
    expect(r.state.destroyed).toBe(false);
    const hit = r.events.find(
      (e) => e.type === ProtoEventType.PROTO_ENGINE_HIT,
    );
    expect(hit).toBeDefined();
    if (hit && hit.type === ProtoEventType.PROTO_ENGINE_HIT) {
      expect(hit.engineHits).toBe(1);
      expect(hit.engineDestroyed).toBe(false);
    }
  });

  it("second 'engine_hit' destroys proto", () => {
    const s0 = mkBiped();
    const r1 = applyProtoCritEffect(
      s0,
      { dice: [5, 5], roll: 10, kind: 'engine_hit' },
      { location: ProtoLocation.TORSO },
    );
    const r2 = applyProtoCritEffect(
      r1.state,
      { dice: [5, 5], roll: 10, kind: 'engine_hit' },
      { location: ProtoLocation.TORSO },
    );
    expect(r2.state.engineHits).toBe(2);
    expect(r2.state.destroyed).toBe(true);
    expect(r2.state.destructionCause).toBe('engine_destroyed');
    expect(
      r2.events.find((e) => e.type === ProtoEventType.PROTO_UNIT_DESTROYED),
    ).toBeDefined();
  });

  it("'pilot_killed' destroys proto + emits both events", () => {
    const s = mkBiped();
    const r = applyProtoCritEffect(
      s,
      { dice: [6, 6], roll: 12, kind: 'pilot_killed' },
      { location: ProtoLocation.TORSO },
    );
    expect(r.state.destroyed).toBe(true);
    expect(r.state.destructionCause).toBe('pilot_killed');
    expect(
      r.events.find((e) => e.type === ProtoEventType.PROTO_PILOT_KILLED),
    ).toBeDefined();
    expect(
      r.events.find((e) => e.type === ProtoEventType.PROTO_UNIT_DESTROYED),
    ).toBeDefined();
  });

  it('no-op when proto already destroyed', () => {
    const s0 = mkBiped();
    const s = {
      ...s0,
      destroyed: true,
      destructionCause: 'pilot_killed' as const,
    };
    const r = applyProtoCritEffect(
      s,
      { dice: [6, 6], roll: 12, kind: 'pilot_killed' },
      { location: ProtoLocation.TORSO },
    );
    expect(r.state).toBe(s);
    expect(r.events).toHaveLength(0);
  });
});

describe('protoMechResolveCriticalHit — roller integration', () => {
  it('uses injected roller to pick kind', () => {
    const rolls = [6, 6];
    const roller = () => rolls.shift() ?? 1;
    const r = protoMechResolveCriticalHit(
      mkBiped(),
      { location: ProtoLocation.TORSO },
      roller,
    );
    expect(r.applied.roll).toBe(12);
    expect(r.applied.kind).toBe('pilot_killed');
    expect(r.state.destroyed).toBe(true);
  });
});
