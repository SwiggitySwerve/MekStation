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
