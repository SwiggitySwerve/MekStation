import { RangeBracket } from '@/types/gameplay';
import { MovementType, IAttackerState, ITargetState } from '@/types/gameplay';

import {
  createC3MasterSlaveNetwork,
  createC3iNetwork,
  createC3NovaNetwork,
  createEmptyC3State,
  addC3Network,
  removeC3Network,
  getUnitNetwork,
  updateC3UnitPosition,
  updateC3UnitECMStatus,
  updateC3UnitOperationalStatus,
  destroyC3Unit,
  getC3TargetingBenefit,
  isBetterBracket,
  createC3Unit,
  C3_MASTER_SLAVE_MAX_UNITS,
  C3I_MAX_UNITS,
  C3_NOVA_MAX_UNITS,
  IC3NetworkUnit,
  IC3Network,
} from '../c3Network';
import {
  createEmptyEWState,
  resolveC3ECMDisruption,
} from '../electronicWarfare';
import { IWeaponRangeProfile } from '../range';
import { calculateToHitWithC3 } from '../toHit';

const MEDIUM_LASER: IWeaponRangeProfile = {
  short: 3,
  medium: 6,
  long: 9,
};

// =============================================================================
// Network Formation
// =============================================================================

describe('C3 Targeting Benefit', () => {
  function makeC3State(network: IC3Network) {
    return addC3Network(createEmptyC3State(), network);
  }

  it('should use best range bracket from networked spotter', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 15, r: 0 },
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ])!;

    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      makeC3State(network),
    );

    expect(result.benefitApplied).toBe(true);
    expect(result.bestBracket).toBe(RangeBracket.Short);
    expect(result.spotterId).toBe('B');
    expect(result.spotterRange).toBe(2);
    expect(result.denialReason).toBeNull();
  });

  it('should deny range sharing when optional spotter LOS gating excludes the only spotter', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 15, r: 0 },
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ])!;

    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      makeC3State(network),
      undefined,
      {
        requireSpotterTargetLineOfSight: true,
        spotterHasTargetLineOfSight: (spotter) => spotter.entityId !== 'B',
      },
    );

    expect(result.benefitApplied).toBe(false);
    expect(result.denialReason).toBe('No C3 spotter has target line of sight');
  });

  it('should still use a C3 spotter when optional LOS gating passes', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 15, r: 0 },
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ])!;

    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      makeC3State(network),
      undefined,
      {
        requireSpotterTargetLineOfSight: true,
        spotterHasTargetLineOfSight: (spotter) => spotter.entityId === 'B',
      },
    );

    expect(result.benefitApplied).toBe(true);
    expect(result.spotterId).toBe('B');
  });

  it('should not apply benefit when all units at same bracket', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 4, r: 0 },
      }),
    ])!;

    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      makeC3State(network),
    );

    expect(result.benefitApplied).toBe(false);
    expect(result.denialReason).toBeNull();
  });

  it('should not apply benefit to unit not in any network', () => {
    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      createEmptyC3State(),
    );

    expect(result.benefitApplied).toBe(false);
    expect(result.denialReason).toBe('Unit is not in a C3 network');
  });

  it('should deny benefit when attacker is ECM-disrupted (per-unit flag)', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 15, r: 0 },
        ecmDisrupted: true,
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ])!;

    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      makeC3State(network),
    );

    expect(result.benefitApplied).toBe(false);
    expect(result.denialReason).toBe('C3 Network disrupted by ECM');
  });

  it('should deny benefit when attacker ECM disrupted via override param', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 15, r: 0 },
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ])!;

    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      makeC3State(network),
      true,
    );

    expect(result.benefitApplied).toBe(false);
    expect(result.denialReason).toBe('C3 Network disrupted by ECM');
  });

  it('should exclude ECM-disrupted spotters from benefit calculation', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 8, r: 0 },
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
        ecmDisrupted: true,
      }),
      createC3Unit({
        entityId: 'C',
        teamId: 'team1',
        role: 'slave',
        position: { q: 5, r: 0 },
      }),
    ])!;

    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      makeC3State(network),
    );

    expect(result.benefitApplied).toBe(true);
    expect(result.bestBracket).toBe(RangeBracket.Medium);
    expect(result.spotterId).toBe('C');
  });

  it('should exclude destroyed units from benefit calculation', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 8, r: 0 },
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
        operational: false,
      }),
    ])!;

    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      makeC3State(network),
    );

    expect(result.benefitApplied).toBe(false);
    expect(result.denialReason).toBe('Not enough active units in network');
  });

  it('should work with C3i networks identically', () => {
    const network = createC3iNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'c3i',
        position: { q: 9, r: 0 },
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'c3i',
        position: { q: 1, r: 0 },
      }),
    ])!;

    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      addC3Network(createEmptyC3State(), network),
    );

    expect(result.benefitApplied).toBe(true);
    expect(result.bestBracket).toBe(RangeBracket.Short);
    expect(result.spotterId).toBe('B');
  });

  it('should handle target out of range for all network members', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 20, r: 0 },
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 15, r: 0 },
      }),
    ])!;

    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      makeC3State(network),
    );

    expect(result.benefitApplied).toBe(false);
    expect(result.denialReason).toBe('No networked unit has target in range');
  });
});

// =============================================================================
// ECM Disruption — C3 Network Benefit Denied
// =============================================================================
