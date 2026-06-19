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

describe('Nova CEWS Network Formation', () => {
  it('should form a valid 3-unit Nova CEWS network', () => {
    const members = Array.from({ length: 3 }, (_, i) =>
      createC3Unit({ entityId: `nova${i}`, teamId: 'team1', role: 'nova' }),
    );

    const network = createC3NovaNetwork('nova-net', members);

    expect(network).not.toBeNull();
    expect(network!.type).toBe('nova');
    expect(network!.members).toHaveLength(3);
    expect(network!.teamId).toBe('team1');
  });

  it('should reject Nova CEWS networks over the source-backed 3-unit cap', () => {
    const members = Array.from({ length: 4 }, (_, i) =>
      createC3Unit({ entityId: `nova${i}`, teamId: 'team1', role: 'nova' }),
    );

    expect(createC3NovaNetwork('nova-net', members)).toBeNull();
  });

  it('should reject non-Nova roles in a Nova CEWS network', () => {
    const members = [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'nova' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'c3i' }),
    ];

    expect(createC3NovaNetwork('nova-net', members)).toBeNull();
  });

  it('should provide C3-style range sharing for Nova CEWS peers', () => {
    const network = createC3NovaNetwork('nova-net', [
      createC3Unit({
        entityId: 'attacker',
        teamId: 'team1',
        role: 'nova',
        position: { q: 0, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter',
        teamId: 'team1',
        role: 'nova',
        position: { q: 6, r: 0 },
      }),
    ]);

    const result = getC3TargetingBenefit(
      'attacker',
      { q: 8, r: 0 },
      MEDIUM_LASER,
      addC3Network(createEmptyC3State(), network!),
    );

    expect(result).toMatchObject({
      benefitApplied: true,
      bestBracket: RangeBracket.Short,
      spotterId: 'spotter',
      spotterRange: 2,
    });
  });

  it('should enforce max unit constant', () => {
    expect(C3_NOVA_MAX_UNITS).toBe(3);
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

  it('should update unit operational status', () => {
    const network = createC3MasterSlaveNetwork('net1', [
      createC3Unit({ entityId: 'A', teamId: 'team1', role: 'master' }),
      createC3Unit({ entityId: 'B', teamId: 'team1', role: 'slave' }),
    ])!;

    let state = addC3Network(createEmptyC3State(), network);
    state = updateC3UnitOperationalStatus(state, 'A', false);

    const member = getUnitNetwork(state, 'A')!.members.find(
      (m) => m.entityId === 'A',
    )!;
    expect(member.operational).toBe(false);
  });
});

// =============================================================================
// Master Destruction / Network Dissolution
// =============================================================================
