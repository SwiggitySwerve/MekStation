/**
 * ProtoMech AI behavior tests.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §10
 */

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import {
  PROTO_PREFERRED_RANGE_MAX,
  PROTO_PREFERRED_RANGE_MIN,
  PROTO_RETREAT_ARMOR_FRACTION,
  classifyProtoMove,
  protoRangeScore,
  protoShouldRetreat,
  sumProtoArmor,
} from '../aiBehavior';
import { createProtoMechCombatState } from '../state';

function mkState(armorByLocation: Partial<Record<ProtoLocation, number>>) {
  return createProtoMechCombatState({
    unitId: 'p-1',
    chassisType: ProtoChassis.BIPED,
    hasMainGun: false,
    armorByLocation,
    structureByLocation: {},
  });
}

describe('constants', () => {
  it('preferred range 7-12', () => {
    expect(PROTO_PREFERRED_RANGE_MIN).toBe(7);
    expect(PROTO_PREFERRED_RANGE_MAX).toBe(12);
  });
  it('retreat fraction 0.5', () => {
    expect(PROTO_RETREAT_ARMOR_FRACTION).toBe(0.5);
  });
});

describe('protoRangeScore', () => {
  it('1.0 inside preferred band', () => {
    expect(protoRangeScore(7)).toBe(1.0);
    expect(protoRangeScore(10)).toBe(1.0);
    expect(protoRangeScore(12)).toBe(1.0);
  });
  it('decays below min', () => {
    expect(protoRangeScore(6)).toBeCloseTo(0.85);
    expect(protoRangeScore(5)).toBeCloseTo(0.7);
    expect(protoRangeScore(1)).toBeCloseTo(0.1, 5);
  });
  it('decays above max', () => {
    expect(protoRangeScore(13)).toBeCloseTo(0.88);
    expect(protoRangeScore(20)).toBeCloseTo(0.04, 5);
  });
  it('0 at extreme distance', () => {
    expect(protoRangeScore(100)).toBe(0);
  });
});

describe('sumProtoArmor', () => {
  it('sums present keys', () => {
    expect(
      sumProtoArmor({
        [ProtoLocation.HEAD]: 1,
        [ProtoLocation.TORSO]: 8,
        [ProtoLocation.LEGS]: 5,
      }),
    ).toBe(14);
  });
  it('treats undefined/missing as 0', () => {
    expect(sumProtoArmor({})).toBe(0);
  });
});

describe('protoShouldRetreat', () => {
  it('true when <= 50% remaining', () => {
    const s = mkState({
      [ProtoLocation.TORSO]: 5,
      [ProtoLocation.LEGS]: 5,
    });
    // remaining = 10; starting = 20 → 50% → retreat
    expect(protoShouldRetreat(s, 20)).toBe(true);
  });
  it('false when > 50% remaining', () => {
    const s = mkState({
      [ProtoLocation.TORSO]: 8,
      [ProtoLocation.LEGS]: 5,
    });
    expect(protoShouldRetreat(s, 20)).toBe(false);
  });
  it('false when startingTotalArmor <= 0', () => {
    const s = mkState({});
    expect(protoShouldRetreat(s, 0)).toBe(false);
  });
});

describe('classifyProtoMove', () => {
  it('retreat when armor fraction <= retreat threshold', () => {
    expect(
      classifyProtoMove({
        distanceToEnemy: 10,
        startingTotalArmor: 20,
        currentTotalArmor: 10,
        flankingScore: 0.9,
      }),
    ).toBe('retreat');
  });

  it('flank when flankingScore >= 0.6 + armor > threshold', () => {
    expect(
      classifyProtoMove({
        distanceToEnemy: 10,
        startingTotalArmor: 20,
        currentTotalArmor: 18,
        flankingScore: 0.8,
      }),
    ).toBe('flank');
  });

  it('engage when inside preferred range + low flank score + armor OK', () => {
    expect(
      classifyProtoMove({
        distanceToEnemy: 9,
        startingTotalArmor: 20,
        currentTotalArmor: 18,
        flankingScore: 0.2,
      }),
    ).toBe('engage');
  });

  it('none when outside preferred range + no flank + armor OK', () => {
    expect(
      classifyProtoMove({
        distanceToEnemy: 3,
        startingTotalArmor: 20,
        currentTotalArmor: 18,
        flankingScore: 0.2,
      }),
    ).toBe('none');
  });

  it('handles startingTotalArmor=0 gracefully (treats as full armor)', () => {
    expect(
      classifyProtoMove({
        distanceToEnemy: 9,
        startingTotalArmor: 0,
        currentTotalArmor: 0,
        flankingScore: 0.1,
      }),
    ).toBe('engage');
  });
});
