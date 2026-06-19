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

describe('ECM Disrupts C3', () => {
  it('should allow C3 benefit when ECM not affecting attacker', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 8, r: 0 },
        ecmDisrupted: false,
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
        ecmDisrupted: false,
      }),
    ])!;

    const state = addC3Network(createEmptyC3State(), network);
    const result = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      state,
      false,
    );

    expect(result.benefitApplied).toBe(true);
    expect(result.bestBracket).toBe(RangeBracket.Short);
  });

  it('should deny C3 benefit but preserve network when ECM disrupts', () => {
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
      }),
    ])!;

    const state = addC3Network(createEmptyC3State(), network);

    const resultDisrupted = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      state,
      true,
    );
    expect(resultDisrupted.benefitApplied).toBe(false);
    expect(resultDisrupted.denialReason).toBe('C3 Network disrupted by ECM');

    expect(getUnitNetwork(state, 'A')).not.toBeNull();

    const resultUndisrupted = getC3TargetingBenefit(
      'A',
      { q: 0, r: 0 },
      MEDIUM_LASER,
      state,
      false,
    );
    expect(resultUndisrupted.benefitApplied).toBe(true);
  });
});

// =============================================================================
// C3 + toHit Integration
// =============================================================================

describe('calculateToHitWithC3', () => {
  const baseAttacker: IAttackerState = {
    gunnery: 4,
    movementType: MovementType.Stationary,
    heat: 0,
    damageModifiers: [],
  };

  const baseTarget: ITargetState = {
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    prone: false,
    immobile: false,
    partialCover: false,
  };

  it('should reduce range bracket modifier when C3 provides benefit', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'attacker',
        teamId: 'team1',
        role: 'master',
        position: { q: 8, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ])!;

    const c3State = addC3Network(createEmptyC3State(), network);

    const result = calculateToHitWithC3(
      baseAttacker,
      baseTarget,
      RangeBracket.Long,
      8,
      {
        attackerEntityId: 'attacker',
        targetPosition: { q: 0, r: 0 },
        weaponRangeProfile: MEDIUM_LASER,
        c3State,
      },
    );

    expect(result.c3Result.benefitApplied).toBe(true);
    expect(result.c3Result.bestBracket).toBe(RangeBracket.Short);

    const rangeModifier = result.modifiers.find((m) => m.source === 'range');
    expect(rangeModifier?.value).toBe(0);

    const c3Modifier = result.modifiers.find((m) => m.name === 'C3 Network');
    expect(c3Modifier).toBeDefined();
    expect(c3Modifier?.source).toBe('equipment');
  });

  it('should use attacker own bracket when C3 provides no benefit', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'attacker',
        teamId: 'team1',
        role: 'master',
        position: { q: 2, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter',
        teamId: 'team1',
        role: 'slave',
        position: { q: 8, r: 0 },
      }),
    ])!;

    const c3State = addC3Network(createEmptyC3State(), network);

    const result = calculateToHitWithC3(
      baseAttacker,
      baseTarget,
      RangeBracket.Short,
      2,
      {
        attackerEntityId: 'attacker',
        targetPosition: { q: 0, r: 0 },
        weaponRangeProfile: MEDIUM_LASER,
        c3State,
      },
    );

    expect(result.c3Result.benefitApplied).toBe(false);

    const rangeModifier = result.modifiers.find((m) => m.source === 'range');
    expect(rangeModifier?.value).toBe(0);

    const c3Modifier = result.modifiers.find((m) => m.name === 'C3 Network');
    expect(c3Modifier).toBeUndefined();
  });

  it('should use own bracket when ECM disrupts C3', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'attacker',
        teamId: 'team1',
        role: 'master',
        position: { q: 8, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ])!;

    const c3State = addC3Network(createEmptyC3State(), network);

    const result = calculateToHitWithC3(
      baseAttacker,
      baseTarget,
      RangeBracket.Long,
      8,
      {
        attackerEntityId: 'attacker',
        targetPosition: { q: 0, r: 0 },
        weaponRangeProfile: MEDIUM_LASER,
        c3State,
        attackerEcmDisrupted: true,
      },
    );

    expect(result.c3Result.benefitApplied).toBe(false);
    expect(result.c3Result.denialReason).toBe('C3 Network disrupted by ECM');

    const rangeModifier = result.modifiers.find((m) => m.source === 'range');
    expect(rangeModifier?.value).toBe(4);
  });

  it('should use own bracket when iNARC ECM pod state disrupts C3', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'attacker',
        teamId: 'team1',
        role: 'master',
        position: { q: 8, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter',
        teamId: 'team1',
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ])!;

    const disruption = resolveC3ECMDisruption(
      [
        {
          entityId: 'attacker',
          teamId: 'team1',
          position: { q: 8, r: 0 },
          iNarcPods: [{ teamId: 'team2', podType: 'ecm' }],
        },
        {
          entityId: 'spotter',
          teamId: 'team1',
          position: { q: 2, r: 0 },
          iNarcPods: [{ teamId: 'team2', podType: 'haywire' }],
        },
      ],
      createEmptyEWState(),
    );
    let c3State = addC3Network(createEmptyC3State(), network);
    c3State = updateC3UnitECMStatus(
      c3State,
      'attacker',
      disruption.get('attacker') ?? false,
    );
    c3State = updateC3UnitECMStatus(
      c3State,
      'spotter',
      disruption.get('spotter') ?? false,
    );

    const result = calculateToHitWithC3(
      baseAttacker,
      baseTarget,
      RangeBracket.Long,
      8,
      {
        attackerEntityId: 'attacker',
        targetPosition: { q: 0, r: 0 },
        weaponRangeProfile: MEDIUM_LASER,
        c3State,
      },
    );

    expect(result.c3Result.benefitApplied).toBe(false);
    expect(result.c3Result.denialReason).toBe('C3 Network disrupted by ECM');

    const rangeModifier = result.modifiers.find((m) => m.source === 'range');
    expect(rangeModifier?.value).toBe(4);
  });
});

// =============================================================================
// Helper: isBetterBracket
// =============================================================================

describe('isBetterBracket', () => {
  it('should rank Short < Medium < Long < Extreme < OutOfRange', () => {
    expect(isBetterBracket(RangeBracket.Short, RangeBracket.Medium)).toBe(true);
    expect(isBetterBracket(RangeBracket.Medium, RangeBracket.Long)).toBe(true);
    expect(isBetterBracket(RangeBracket.Long, RangeBracket.Extreme)).toBe(true);
    expect(isBetterBracket(RangeBracket.Extreme, RangeBracket.OutOfRange)).toBe(
      true,
    );
  });

  it('should return false for same bracket', () => {
    expect(isBetterBracket(RangeBracket.Short, RangeBracket.Short)).toBe(false);
    expect(isBetterBracket(RangeBracket.Long, RangeBracket.Long)).toBe(false);
  });

  it('should return false for worse bracket', () => {
    expect(isBetterBracket(RangeBracket.Long, RangeBracket.Short)).toBe(false);
    expect(isBetterBracket(RangeBracket.Medium, RangeBracket.Short)).toBe(
      false,
    );
  });
});
