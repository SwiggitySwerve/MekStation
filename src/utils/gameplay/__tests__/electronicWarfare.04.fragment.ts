import { IHexCoordinate } from '@/types/gameplay';

import {
  isInECMBubble,
  getFriendlyECMSources,
  getEnemyECMSources,
  getFriendlyECCMSources,
  calculateECCMCountering,
  getProbeECMCounterRange,
  getBAPCounterSources,
  canBAPCounterECM,
  resolveECMStatus,
  isAttackECMProtected,
  calculateStealthArmorModifier,
  getECMProtectedFlag,
  createEmptyEWState,
  createEWState,
  addECMSuite,
  addActiveProbe,
  setECMMode,
  updateECMPosition,
  destroyEquipment,
  ECM_RADIUS,
  BAP_ECM_COUNTER_RANGE,
  BLOODHOUND_ECM_COUNTER_RANGE,
  CLAN_PROBE_ECM_COUNTER_RANGE,
  LIGHT_PROBE_ECM_COUNTER_RANGE,
  NOVA_CEWS_ECM_COUNTER_RANGE,
  STEALTH_ARMOR_MODIFIERS,
  WATCHDOG_CEWS_ECM_COUNTER_RANGE,
  resolveC3ECMDisruption,
  IECMSuite,
  IActiveProbe,
  IElectronicWarfareState,
} from '../electronicWarfare';

function makeECM(
  overrides: Partial<IECMSuite> & Pick<IECMSuite, 'entityId' | 'teamId'>,
): IECMSuite {
  return {
    type: 'guardian',
    mode: 'ecm',
    operational: true,
    position: { q: 0, r: 0 },
    ...overrides,
  };
}

function makeProbe(
  overrides: Partial<IActiveProbe> & Pick<IActiveProbe, 'entityId' | 'teamId'>,
): IActiveProbe {
  return {
    type: 'beagle',
    operational: true,
    position: { q: 0, r: 0 },
    ...overrides,
  };
}

// =============================================================================
// 14.1: ECM Bubble Tracking
// =============================================================================

describe('EW State Management', () => {
  it('createEmptyEWState should return empty state', () => {
    const state = createEmptyEWState();
    expect(state.ecmSuites).toEqual([]);
    expect(state.activeProbes).toEqual([]);
  });

  it('addECMSuite should append to state immutably', () => {
    const state = createEmptyEWState();
    const ecm = makeECM({ entityId: 'e1', teamId: 'A' });
    const newState = addECMSuite(state, ecm);
    expect(newState.ecmSuites.length).toBe(1);
    expect(state.ecmSuites.length).toBe(0);
  });

  it('addActiveProbe should append to state immutably', () => {
    const state = createEmptyEWState();
    const probe = makeProbe({ entityId: 'p1', teamId: 'A' });
    const newState = addActiveProbe(state, probe);
    expect(newState.activeProbes.length).toBe(1);
    expect(state.activeProbes.length).toBe(0);
  });

  it('setECMMode should toggle mode', () => {
    const state = createEWState(
      [makeECM({ entityId: 'e1', teamId: 'A', mode: 'ecm' })],
      [],
    );
    const newState = setECMMode(state, 'e1', 'eccm');
    expect(newState.ecmSuites[0].mode).toBe('eccm');
    expect(state.ecmSuites[0].mode).toBe('ecm');
  });

  it('updateECMPosition should update position for both ECM and probes', () => {
    const state = createEWState(
      [makeECM({ entityId: 'e1', teamId: 'A', position: { q: 0, r: 0 } })],
      [makeProbe({ entityId: 'e1', teamId: 'A', position: { q: 0, r: 0 } })],
    );
    const newState = updateECMPosition(state, 'e1', { q: 5, r: 5 });
    expect(newState.ecmSuites[0].position).toEqual({ q: 5, r: 5 });
    expect(newState.activeProbes[0].position).toEqual({ q: 5, r: 5 });
  });

  it('destroyEquipment should mark ECM as non-operational', () => {
    const state = createEWState([makeECM({ entityId: 'e1', teamId: 'A' })], []);
    const newState = destroyEquipment(state, 'e1', 'ecm');
    expect(newState.ecmSuites[0].operational).toBe(false);
  });

  it('destroyEquipment should mark probe as non-operational', () => {
    const state = createEWState(
      [],
      [makeProbe({ entityId: 'p1', teamId: 'A' })],
    );
    const newState = destroyEquipment(state, 'p1', 'probe');
    expect(newState.activeProbes[0].operational).toBe(false);
  });

  it('destroyed ECM should not provide protection', () => {
    const state = createEWState(
      [makeECM({ entityId: 'e1', teamId: 'A', operational: false })],
      [],
    );
    const status = resolveECMStatus({ q: 0, r: 0 }, 'A', 'unit1', state);
    expect(status.ecmProtected).toBe(false);
  });
});

describe('Complex Multi-ECM Scenarios', () => {
  it('overlapping friendly + enemy ECM: unit is both protected and disrupted', () => {
    const state = createEWState(
      [
        makeECM({ entityId: 'friend', teamId: 'A', position: { q: 0, r: 0 } }),
        makeECM({ entityId: 'enemy', teamId: 'B', position: { q: 5, r: 0 } }),
      ],
      [],
    );
    const status = resolveECMStatus({ q: 3, r: 0 }, 'A', 'unit1', state);
    expect(status.ecmProtected).toBe(true);
    expect(status.ecmDisrupted).toBe(true);
  });

  it('ECCM + BAP combined should counter multiple ECM sources', () => {
    const state = createEWState(
      [
        makeECM({
          entityId: 'e_ecm1',
          teamId: 'B',
          type: 'guardian',
          position: { q: 10, r: 0 },
        }),
        makeECM({
          entityId: 'e_ecm2',
          teamId: 'B',
          type: 'guardian',
          position: { q: 12, r: 0 },
        }),
        makeECM({
          entityId: 'f_eccm',
          teamId: 'A',
          mode: 'eccm',
          type: 'guardian',
          position: { q: 0, r: 0 },
        }),
      ],
      [
        makeProbe({
          entityId: 'attacker1',
          teamId: 'A',
          type: 'beagle',
          position: { q: 8, r: 0 },
        }),
      ],
    );
    const ecmProtected = isAttackECMProtected(
      { q: 8, r: 0 },
      'A',
      'attacker1',
      { q: 10, r: 0 },
      'B',
      'target1',
      state,
    );
    expect(ecmProtected).toBe(false);
  });

  it('Angel ECM resists Guardian ECCM but falls to Angel ECCM', () => {
    const enemyAngel = makeECM({ entityId: 'e1', teamId: 'B', type: 'angel' });
    const guardianECCM = makeECM({
      entityId: 'f1',
      teamId: 'A',
      mode: 'eccm',
      type: 'guardian',
    });
    const angelECCM = makeECM({
      entityId: 'f2',
      teamId: 'A',
      mode: 'eccm',
      type: 'angel',
    });

    const result1 = calculateECCMCountering([enemyAngel], [guardianECCM]);
    expect(result1.uncounteredEnemyECMs.length).toBe(1);

    const result2 = calculateECCMCountering([enemyAngel], [angelECCM]);
    expect(result2.uncounteredEnemyECMs.length).toBe(0);
  });
});

// =============================================================================
// ECM → C3 Disruption Integration
// =============================================================================

describe('resolveC3ECMDisruption', () => {
  it('should mark members inside enemy ECM as disrupted', () => {
    const ewState = createEWState(
      [
        makeECM({
          entityId: 'enemy_ecm',
          teamId: 'B',
          position: { q: 5, r: 0 },
        }),
      ],
      [],
    );
    const members = [
      {
        entityId: 'c3_1',
        teamId: 'A',
        position: { q: 3, r: 0 } as IHexCoordinate,
      },
      {
        entityId: 'c3_2',
        teamId: 'A',
        position: { q: 20, r: 0 } as IHexCoordinate,
      },
    ];
    const result = resolveC3ECMDisruption(members, ewState);
    expect(result.get('c3_1')).toBe(true);
    expect(result.get('c3_2')).toBe(false);
  });

  it('should return false for all members when no enemy ECM present', () => {
    const ewState = createEmptyEWState();
    const members = [
      {
        entityId: 'c3_1',
        teamId: 'A',
        position: { q: 0, r: 0 } as IHexCoordinate,
      },
      {
        entityId: 'c3_2',
        teamId: 'A',
        position: { q: 5, r: 0 } as IHexCoordinate,
      },
    ];
    const result = resolveC3ECMDisruption(members, ewState);
    expect(result.get('c3_1')).toBe(false);
    expect(result.get('c3_2')).toBe(false);
  });

  it('should mark members carrying iNARC ECM pods as C3-disrupted', () => {
    const ewState = createEmptyEWState();
    const members = [
      {
        entityId: 'c3_1',
        teamId: 'A',
        position: { q: 0, r: 0 } as IHexCoordinate,
        iNarcPods: [{ teamId: 'B', podType: 'ecm' }],
      },
      {
        entityId: 'c3_2',
        teamId: 'A',
        position: { q: 5, r: 0 } as IHexCoordinate,
        iNarcPods: [{ teamId: 'B', podType: 'haywire' }],
      },
      {
        entityId: 'c3_3',
        teamId: 'A',
        position: { q: 6, r: 0 } as IHexCoordinate,
        iNarcPods: [{ teamId: 'B', podType: 'homing' }],
      },
    ];

    const result = resolveC3ECMDisruption(members, ewState);

    expect(result.get('c3_1')).toBe(true);
    expect(result.get('c3_2')).toBe(false);
    expect(result.get('c3_3')).toBe(false);
  });

  it('should account for ECCM countering enemy ECM', () => {
    const ewState = createEWState(
      [
        makeECM({
          entityId: 'enemy_ecm',
          teamId: 'B',
          position: { q: 5, r: 0 },
        }),
        makeECM({
          entityId: 'friendly_eccm',
          teamId: 'A',
          mode: 'eccm',
          position: { q: 3, r: 0 },
        }),
      ],
      [],
    );
    const members = [
      {
        entityId: 'c3_1',
        teamId: 'A',
        position: { q: 3, r: 0 } as IHexCoordinate,
      },
    ];
    const result = resolveC3ECMDisruption(members, ewState);
    expect(result.get('c3_1')).toBe(false);
  });
});
