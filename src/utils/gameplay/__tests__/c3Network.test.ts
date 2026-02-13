import { RangeBracket } from '@/types/gameplay';
import { MovementType, IAttackerState, ITargetState } from '@/types/gameplay';

import {
  createC3MasterSlaveNetwork,
  createC3iNetwork,
  createEmptyC3State,
  addC3Network,
  removeC3Network,
  getUnitNetwork,
  updateC3UnitPosition,
  updateC3UnitECMStatus,
  destroyC3Unit,
  getC3TargetingBenefit,
  isBetterBracket,
  createC3Unit,
  C3_MASTER_SLAVE_MAX_UNITS,
  C3I_MAX_UNITS,
  IC3NetworkUnit,
  IC3Network,
} from '../c3Network';
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

describe('C3 Master/Slave Network Formation', () => {
  it('should form a valid 4-unit C3 network with 1 master + 3 slaves', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'C', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'D', teamId: 'team1', role: 'slave' }),
    ];

    const network = createC3MasterSlaveNetwork('net1', members);
    expect(network).not.toBeNull();
    expect(network!.type).toBe('master-slave');
    expect(network!.members).toHaveLength(4);
    expect(network!.teamId).toBe('team1');
  });

  it('should form a valid 2-unit C3 network (1 master + 1 slave)', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
    ];

    const network = createC3MasterSlaveNetwork('net1', members);
    expect(network).not.toBeNull();
    expect(network!.members).toHaveLength(2);
  });

  it('should reject network without master', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'C', teamId: 'team1', role: 'slave' }),
    ];

    expect(createC3MasterSlaveNetwork('net1', members)).toBeNull();
  });

  it('should reject network with 2 masters', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'C', teamId: 'team1', role: 'slave' }),
    ];

    expect(createC3MasterSlaveNetwork('net1', members)).toBeNull();
  });

  it('should reject network exceeding 4-unit limit', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'C', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'D', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'E', teamId: 'team1', role: 'slave' }),
    ];

    expect(createC3MasterSlaveNetwork('net1', members)).toBeNull();
  });

  it('should reject empty member list', () => {
    expect(createC3MasterSlaveNetwork('net1', [])).toBeNull();
  });

  it('should reject mixed-team members', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team2', role: 'slave' }),
    ];

    expect(createC3MasterSlaveNetwork('net1', members)).toBeNull();
  });

  it('should reject c3i roles in master/slave network', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'c3i' }),
    ];

    expect(createC3MasterSlaveNetwork('net1', members)).toBeNull();
  });

  it('should enforce max unit constant', () => {
    expect(C3_MASTER_SLAVE_MAX_UNITS).toBe(4);
  });
});

describe('C3i Network Formation', () => {
  it('should form a valid 6-unit C3i network', () => {
    const members = Array.from({ length: 6 }, (_, i) =>
      createC3Unit({ entityId: `unit${i}`, teamId: 'team1', role: 'c3i' }),
    );

    const network = createC3iNetwork('net1', members);
    expect(network).not.toBeNull();
    expect(network!.type).toBe('improved');
    expect(network!.members).toHaveLength(6);
  });

  it('should form a valid 2-unit C3i network', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'c3i' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'c3i' }),
    ];

    const network = createC3iNetwork('net1', members);
    expect(network).not.toBeNull();
  });

  it('should reject C3i network exceeding 6-unit limit', () => {
    const members = Array.from({ length: 7 }, (_, i) =>
      createC3Unit({ entityId: `unit${i}`, teamId: 'team1', role: 'c3i' }),
    );

    expect(createC3iNetwork('net1', members)).toBeNull();
  });

  it('should reject non-c3i roles', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'c3i' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'master' }),
    ];

    expect(createC3iNetwork('net1', members)).toBeNull();
  });

  it('should reject mixed-team C3i members', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'c3i' }),
      createC3Unit({ entityId: 'B', teamId: 'team2', role: 'c3i' }),
    ];

    expect(createC3iNetwork('net1', members)).toBeNull();
  });

  it('should enforce max unit constant', () => {
    expect(C3I_MAX_UNITS).toBe(6);
  });
});

// =============================================================================
// Network State Management
// =============================================================================

describe('C3 Network State Management', () => {
  it('should create empty state', () => {
    const state = createEmptyC3State();
    expect(state.networks).toHaveLength(0);
  });

  it('should add a network to state', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
    ])!;

    const state = addC3Network(createEmptyC3State(), network);
    expect(state.networks).toHaveLength(1);
    expect(state.networks[0].networkId).toBe('net1');
  });

  it('should remove a network from state', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
    ])!;

    let state = addC3Network(createEmptyC3State(), network);
    state = removeC3Network(state, 'net1');
    expect(state.networks).toHaveLength(0);
  });

  it('should find the network a unit belongs to', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
    ])!;

    const state = addC3Network(createEmptyC3State(), network);
    expect(getUnitNetwork(state, 'A')?.networkId).toBe('net1');
    expect(getUnitNetwork(state, 'B')?.networkId).toBe('net1');
    expect(getUnitNetwork(state, 'C')).toBeNull();
  });

  it('should update unit position', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({
        entityId: 'A',
        teamId: 'team1',
        role: 'master',
        position: { q: 0, r: 0 },
      }),
      createC3Unit({
        entityId: 'B',
        teamId: 'team1',
        role: 'slave',
        position: { q: 1, r: 0 },
      }),
    ])!;

    let state = addC3Network(createEmptyC3State(), network);
    state = updateC3UnitPosition(state, 'A', { q: 5, r: 5 });

    const member = getUnitNetwork(state, 'A')!.members.find(
      (m) => m.entityId === 'A',
    )!;
    expect(member.position).toEqual({ q: 5, r: 5 });
  });

  it('should update unit ECM disruption status', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
    ])!;

    let state = addC3Network(createEmptyC3State(), network);
    state = updateC3UnitECMStatus(state, 'A', true);

    const member = getUnitNetwork(state, 'A')!.members.find(
      (m) => m.entityId === 'A',
    )!;
    expect(member.ecmDisrupted).toBe(true);
  });
});

// =============================================================================
// Master Destruction / Network Dissolution
// =============================================================================

describe('C3 Master Destruction', () => {
  it('should dissolve entire network when master is destroyed', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'C', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'D', teamId: 'team1', role: 'slave' }),
    ])!;

    let state = addC3Network(createEmptyC3State(), network);
    state = destroyC3Unit(state, 'A');

    expect(state.networks).toHaveLength(0);
    expect(getUnitNetwork(state, 'B')).toBeNull();
    expect(getUnitNetwork(state, 'C')).toBeNull();
    expect(getUnitNetwork(state, 'D')).toBeNull();
  });

  it('should remove slave but keep network when slave is destroyed', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'C', teamId: 'team1', role: 'slave' }),
      createC3Unit({ entityId: 'D', teamId: 'team1', role: 'slave' }),
    ])!;

    let state = addC3Network(createEmptyC3State(), network);
    state = destroyC3Unit(state, 'B');

    expect(state.networks).toHaveLength(1);
    expect(state.networks[0].members).toHaveLength(3);
    expect(getUnitNetwork(state, 'B')).toBeNull();
    expect(getUnitNetwork(state, 'A')).not.toBeNull();
  });

  it('should dissolve C3 network when only master + 1 slave remains and slave is destroyed', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
    ])!;

    let state = addC3Network(createEmptyC3State(), network);
    state = destroyC3Unit(state, 'B');

    expect(state.networks).toHaveLength(0);
  });
});

describe('C3i Peer Loss', () => {
  it('should keep C3i network alive after losing one peer', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'c3i' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'c3i' }),
      createC3Unit({ entityId: 'C', teamId: 'team1', role: 'c3i' }),
      createC3Unit({ entityId: 'D', teamId: 'team1', role: 'c3i' }),
    ];
    const network = createC3iNetwork('net1', members)!;

    let state = addC3Network(createEmptyC3State(), network);
    state = destroyC3Unit(state, 'A');

    expect(state.networks).toHaveLength(1);
    expect(state.networks[0].members).toHaveLength(3);
    expect(getUnitNetwork(state, 'B')).not.toBeNull();
  });

  it('should dissolve C3i network when only 1 peer remains', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'c3i' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'c3i' }),
    ];
    const network = createC3iNetwork('net1', members)!;

    let state = addC3Network(createEmptyC3State(), network);
    state = destroyC3Unit(state, 'A');

    expect(state.networks).toHaveLength(0);
  });

  it('should handle destroying unit not in any network', () => {
    const state = createEmptyC3State();
    const updated = destroyC3Unit(state, 'nonexistent');
    expect(updated.networks).toHaveLength(0);
  });
});

// =============================================================================
// C3 Targeting Benefit (Range Bracket Sharing)
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
