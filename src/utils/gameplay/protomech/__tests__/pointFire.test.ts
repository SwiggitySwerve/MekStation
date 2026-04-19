/**
 * ProtoMech point-fire tests.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §7
 */

import { ProtoEventType } from '../events';
import {
  DEFAULT_PROTO_POINT_FIRE_ENABLED,
  resolveProtoPointAttack,
  resolveProtoPointAttackFromRoll,
} from '../pointFire';

const FIVE_PROTOS = ['a', 'b', 'c', 'd', 'e'];

describe('DEFAULT_PROTO_POINT_FIRE_ENABLED', () => {
  it('off by default (MVP)', () => {
    expect(DEFAULT_PROTO_POINT_FIRE_ENABLED).toBe(false);
  });
});

describe('resolveProtoPointAttackFromRoll', () => {
  it('even 20-20-20-20-20 on roll 7', () => {
    const r = resolveProtoPointAttackFromRoll(
      {
        pointId: 'pt-1',
        protoIds: FIVE_PROTOS,
        totalDamage: 100,
      },
      [3, 4],
    );
    expect(r.roll).toBe(7);
    expect(r.distribution).toHaveLength(5);
    for (const d of r.distribution) {
      expect(d.damage).toBe(20);
    }
  });

  it('distribution sums exactly to totalDamage', () => {
    const r = resolveProtoPointAttackFromRoll(
      {
        pointId: 'pt-1',
        protoIds: FIVE_PROTOS,
        totalDamage: 37,
      },
      [3, 4],
    );
    const sum = r.distribution.reduce((acc, d) => acc + d.damage, 0);
    expect(sum).toBe(37);
  });

  it('preserves proto ordering', () => {
    const r = resolveProtoPointAttackFromRoll(
      {
        pointId: 'pt-1',
        protoIds: FIVE_PROTOS,
        totalDamage: 100,
      },
      [3, 4],
    );
    expect(r.distribution.map((d) => d.protoId)).toEqual(FIVE_PROTOS);
  });

  it('emits exactly one PROTO_POINT_ATTACK event', () => {
    const r = resolveProtoPointAttackFromRoll(
      {
        pointId: 'pt-42',
        protoIds: FIVE_PROTOS,
        totalDamage: 50,
      },
      [3, 4],
    );
    expect(r.events).toHaveLength(1);
    const e = r.events[0];
    expect(e.type).toBe(ProtoEventType.PROTO_POINT_ATTACK);
    if (e.type === ProtoEventType.PROTO_POINT_ATTACK) {
      expect(e.pointId).toBe('pt-42');
      expect(e.totalDamage).toBe(50);
      expect(e.distribution).toHaveLength(5);
    }
  });

  it('handles roll 12 (40-20-20-20-0 — last proto gets 0)', () => {
    const r = resolveProtoPointAttackFromRoll(
      {
        pointId: 'pt-1',
        protoIds: FIVE_PROTOS,
        totalDamage: 100,
      },
      [6, 6],
    );
    expect(r.roll).toBe(12);
    // First proto should get the most damage
    expect(r.distribution[0].damage).toBeGreaterThanOrEqual(40);
    // Last proto gets 0
    expect(r.distribution[4].damage).toBe(0);
  });

  it('handles roll 2 (20-20-20-20-20)', () => {
    const r = resolveProtoPointAttackFromRoll(
      {
        pointId: 'pt-1',
        protoIds: FIVE_PROTOS,
        totalDamage: 100,
      },
      [1, 1],
    );
    expect(r.roll).toBe(2);
    for (const d of r.distribution) {
      expect(d.damage).toBe(20);
    }
  });

  it('handles fewer than 5 survivors by normalising percentages', () => {
    const r = resolveProtoPointAttackFromRoll(
      {
        pointId: 'pt-1',
        protoIds: ['a', 'b', 'c'], // only 3 survivors
        totalDamage: 30,
      },
      [3, 4],
    );
    expect(r.distribution).toHaveLength(3);
    const sum = r.distribution.reduce((acc, d) => acc + d.damage, 0);
    expect(sum).toBe(30);
  });
});

describe('resolveProtoPointAttack — with injected roller', () => {
  it('uses provided D6 roller', () => {
    const rolls = [3, 4];
    const roller = () => rolls.shift() ?? 1;
    const r = resolveProtoPointAttack(
      {
        pointId: 'pt-1',
        protoIds: FIVE_PROTOS,
        totalDamage: 100,
      },
      roller,
    );
    expect(r.dice).toEqual([3, 4]);
    expect(r.roll).toBe(7);
  });
});
