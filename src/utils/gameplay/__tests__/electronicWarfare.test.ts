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
  STEALTH_ARMOR_MODIFIERS,
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

describe('ECM Bubble Tracking', () => {
  it('should detect position inside Guardian ECM 6-hex bubble', () => {
    const ecm = makeECM({
      entityId: 'ecm1',
      teamId: 'A',
      position: { q: 0, r: 0 },
    });
    expect(isInECMBubble({ q: 3, r: 0 }, ecm)).toBe(true);
    expect(isInECMBubble({ q: 6, r: 0 }, ecm)).toBe(true);
  });

  it('should reject position outside ECM bubble', () => {
    const ecm = makeECM({
      entityId: 'ecm1',
      teamId: 'A',
      position: { q: 0, r: 0 },
    });
    expect(isInECMBubble({ q: 7, r: 0 }, ecm)).toBe(false);
  });

  it('should reject inactive ECM suite', () => {
    const ecm = makeECM({ entityId: 'ecm1', teamId: 'A', operational: false });
    expect(isInECMBubble({ q: 0, r: 0 }, ecm)).toBe(false);
  });

  it('should reject ECM in ECCM mode', () => {
    const ecm = makeECM({ entityId: 'ecm1', teamId: 'A', mode: 'eccm' });
    expect(isInECMBubble({ q: 0, r: 0 }, ecm)).toBe(false);
  });

  it('should reject ECM in off mode', () => {
    const ecm = makeECM({ entityId: 'ecm1', teamId: 'A', mode: 'off' });
    expect(isInECMBubble({ q: 0, r: 0 }, ecm)).toBe(false);
  });

  it('Angel ECM should have same 6-hex radius', () => {
    const ecm = makeECM({ entityId: 'ecm1', teamId: 'A', type: 'angel' });
    expect(isInECMBubble({ q: 6, r: 0 }, ecm)).toBe(true);
    expect(isInECMBubble({ q: 7, r: 0 }, ecm)).toBe(false);
  });

  it('Clan ECM should have same 6-hex radius', () => {
    const ecm = makeECM({ entityId: 'ecm1', teamId: 'A', type: 'clan' });
    expect(isInECMBubble({ q: 6, r: 0 }, ecm)).toBe(true);
    expect(isInECMBubble({ q: 7, r: 0 }, ecm)).toBe(false);
  });

  it('should find friendly ECM sources covering a position', () => {
    const state = createEWState(
      [
        makeECM({ entityId: 'e1', teamId: 'A', position: { q: 0, r: 0 } }),
        makeECM({ entityId: 'e2', teamId: 'B', position: { q: 0, r: 0 } }),
        makeECM({ entityId: 'e3', teamId: 'A', position: { q: 20, r: 0 } }),
      ],
      [],
    );
    const friendly = getFriendlyECMSources({ q: 3, r: 0 }, 'A', state);
    expect(friendly.length).toBe(1);
    expect(friendly[0].entityId).toBe('e1');
  });

  it('should find enemy ECM sources affecting a position', () => {
    const state = createEWState(
      [
        makeECM({ entityId: 'e1', teamId: 'A', position: { q: 0, r: 0 } }),
        makeECM({ entityId: 'e2', teamId: 'B', position: { q: 3, r: 0 } }),
      ],
      [],
    );
    const enemy = getEnemyECMSources({ q: 3, r: 0 }, 'A', state);
    expect(enemy.length).toBe(1);
    expect(enemy[0].entityId).toBe('e2');
  });

  it('ECM_RADIUS constant should be 6', () => {
    expect(ECM_RADIUS).toBe(6);
  });
});

// =============================================================================
// 14.2: ECM Effects — nullify Artemis, Narc, TAG, C3, active probes
// =============================================================================

describe('ECM Effects Resolution', () => {
  it('should mark unit as ECM-protected when in friendly ECM bubble', () => {
    const state = createEWState(
      [makeECM({ entityId: 'ecm1', teamId: 'A', position: { q: 0, r: 0 } })],
      [],
    );
    const status = resolveECMStatus({ q: 3, r: 0 }, 'A', 'unit1', state);
    expect(status.ecmProtected).toBe(true);
    expect(status.ecmDisrupted).toBe(false);
  });

  it('should mark unit as ECM-disrupted when in enemy ECM bubble', () => {
    const state = createEWState(
      [makeECM({ entityId: 'ecm1', teamId: 'B', position: { q: 0, r: 0 } })],
      [],
    );
    const status = resolveECMStatus({ q: 3, r: 0 }, 'A', 'unit1', state);
    expect(status.ecmDisrupted).toBe(true);
    expect(status.electronicsNullified).toBe(true);
  });

  it('should nullify electronics for attack when target is in friendly ECM', () => {
    const state = createEWState(
      [makeECM({ entityId: 'ecm1', teamId: 'B', position: { q: 10, r: 0 } })],
      [],
    );
    const ecmProtected = isAttackECMProtected(
      { q: 0, r: 0 },
      'A',
      'attacker1',
      { q: 10, r: 0 },
      'B',
      'target1',
      state,
    );
    expect(ecmProtected).toBe(true);
  });

  it('should NOT nullify electronics when target is NOT in ECM bubble', () => {
    const state = createEWState(
      [makeECM({ entityId: 'ecm1', teamId: 'B', position: { q: 20, r: 0 } })],
      [],
    );
    const ecmProtected = isAttackECMProtected(
      { q: 0, r: 0 },
      'A',
      'attacker1',
      { q: 10, r: 0 },
      'B',
      'target1',
      state,
    );
    expect(ecmProtected).toBe(false);
  });

  it('getECMProtectedFlag should bridge to specialWeaponMechanics pipeline', () => {
    const state = createEWState(
      [makeECM({ entityId: 'ecm1', teamId: 'B', position: { q: 5, r: 0 } })],
      [],
    );
    const flag = getECMProtectedFlag(
      { q: 0, r: 0 },
      'A',
      'attacker1',
      { q: 5, r: 0 },
      'B',
      'target1',
      state,
    );
    expect(flag).toBe(true);
  });
});

// =============================================================================
// 14.3: ECCM Counter
// =============================================================================

describe('ECCM Countering', () => {
  it('should find friendly ECCM sources', () => {
    const state = createEWState(
      [
        makeECM({
          entityId: 'e1',
          teamId: 'A',
          mode: 'eccm',
          position: { q: 0, r: 0 },
        }),
      ],
      [],
    );
    const eccms = getFriendlyECCMSources({ q: 3, r: 0 }, 'A', state);
    expect(eccms.length).toBe(1);
  });

  it('Guardian ECCM should counter Guardian ECM (1:1)', () => {
    const enemyECMs = [
      makeECM({ entityId: 'enemy1', teamId: 'B', type: 'guardian' }),
    ];
    const friendlyECCMs = [
      makeECM({
        entityId: 'friend1',
        teamId: 'A',
        mode: 'eccm',
        type: 'guardian',
      }),
    ];
    const result = calculateECCMCountering(enemyECMs, friendlyECCMs);
    expect(result.counteredEnemyECMs.length).toBe(1);
    expect(result.uncounteredEnemyECMs.length).toBe(0);
  });

  it('Guardian ECCM should NOT counter Angel ECM', () => {
    const enemyECMs = [
      makeECM({ entityId: 'enemy1', teamId: 'B', type: 'angel' }),
    ];
    const friendlyECCMs = [
      makeECM({
        entityId: 'friend1',
        teamId: 'A',
        mode: 'eccm',
        type: 'guardian',
      }),
    ];
    const result = calculateECCMCountering(enemyECMs, friendlyECCMs);
    expect(result.counteredEnemyECMs.length).toBe(0);
    expect(result.uncounteredEnemyECMs.length).toBe(1);
  });

  it('Angel ECCM should counter Angel ECM', () => {
    const enemyECMs = [
      makeECM({ entityId: 'enemy1', teamId: 'B', type: 'angel' }),
    ];
    const friendlyECCMs = [
      makeECM({
        entityId: 'friend1',
        teamId: 'A',
        mode: 'eccm',
        type: 'angel',
      }),
    ];
    const result = calculateECCMCountering(enemyECMs, friendlyECCMs);
    expect(result.counteredEnemyECMs.length).toBe(1);
    expect(result.uncounteredEnemyECMs.length).toBe(0);
  });

  it('Clan ECCM should counter Clan ECM', () => {
    const enemyECMs = [
      makeECM({ entityId: 'enemy1', teamId: 'B', type: 'clan' }),
    ];
    const friendlyECCMs = [
      makeECM({ entityId: 'friend1', teamId: 'A', mode: 'eccm', type: 'clan' }),
    ];
    const result = calculateECCMCountering(enemyECMs, friendlyECCMs);
    expect(result.counteredEnemyECMs.length).toBe(1);
  });

  it('ECCM unit cannot provide ECM simultaneously', () => {
    const ecm = makeECM({ entityId: 'e1', teamId: 'A', mode: 'eccm' });
    expect(isInECMBubble({ q: 0, r: 0 }, ecm)).toBe(false);
  });

  it('multiple ECCMs counter multiple ECMs (1:1 ratio)', () => {
    const enemyECMs = [
      makeECM({ entityId: 'e1', teamId: 'B', type: 'guardian' }),
      makeECM({ entityId: 'e2', teamId: 'B', type: 'guardian' }),
      makeECM({ entityId: 'e3', teamId: 'B', type: 'guardian' }),
    ];
    const friendlyECCMs = [
      makeECM({ entityId: 'f1', teamId: 'A', mode: 'eccm', type: 'guardian' }),
      makeECM({ entityId: 'f2', teamId: 'A', mode: 'eccm', type: 'guardian' }),
    ];
    const result = calculateECCMCountering(enemyECMs, friendlyECCMs);
    expect(result.counteredEnemyECMs.length).toBe(2);
    expect(result.uncounteredEnemyECMs.length).toBe(1);
  });

  it('ECCM resolves in full pipeline — attack not ECM protected after ECCM counter', () => {
    const state = createEWState(
      [
        makeECM({
          entityId: 'target_ecm',
          teamId: 'B',
          position: { q: 10, r: 0 },
        }),
        makeECM({
          entityId: 'attacker_eccm',
          teamId: 'A',
          mode: 'eccm',
          position: { q: 0, r: 0 },
        }),
      ],
      [],
    );
    const ecmProtected = isAttackECMProtected(
      { q: 0, r: 0 },
      'A',
      'attacker1',
      { q: 10, r: 0 },
      'B',
      'target1',
      state,
    );
    expect(ecmProtected).toBe(false);
  });
});

// =============================================================================
// 14.4: Stealth Armor
// =============================================================================

describe('Stealth Armor', () => {
  it('should provide +0 at short range with active ECM', () => {
    const state = createEWState(
      [makeECM({ entityId: 'unit1', teamId: 'A', position: { q: 0, r: 0 } })],
      [],
    );
    const result = calculateStealthArmorModifier(
      true,
      'unit1',
      'A',
      'short',
      state,
    );
    expect(result.modifier).toBe(0);
    expect(result.active).toBe(true);
  });

  it('should provide +1 at medium range with active ECM', () => {
    const state = createEWState(
      [makeECM({ entityId: 'unit1', teamId: 'A', position: { q: 0, r: 0 } })],
      [],
    );
    const result = calculateStealthArmorModifier(
      true,
      'unit1',
      'A',
      'medium',
      state,
    );
    expect(result.modifier).toBe(1);
    expect(result.active).toBe(true);
  });

  it('should provide +2 at long range with active ECM', () => {
    const state = createEWState(
      [makeECM({ entityId: 'unit1', teamId: 'A', position: { q: 0, r: 0 } })],
      [],
    );
    const result = calculateStealthArmorModifier(
      true,
      'unit1',
      'A',
      'long',
      state,
    );
    expect(result.modifier).toBe(2);
    expect(result.active).toBe(true);
  });

  it('should provide +0 when ECM is destroyed', () => {
    const state = createEWState(
      [makeECM({ entityId: 'unit1', teamId: 'A', operational: false })],
      [],
    );
    const result = calculateStealthArmorModifier(
      true,
      'unit1',
      'A',
      'long',
      state,
    );
    expect(result.modifier).toBe(0);
    expect(result.active).toBe(false);
  });

  it('should provide +0 when ECM is in ECCM mode', () => {
    const state = createEWState(
      [makeECM({ entityId: 'unit1', teamId: 'A', mode: 'eccm' })],
      [],
    );
    const result = calculateStealthArmorModifier(
      true,
      'unit1',
      'A',
      'long',
      state,
    );
    expect(result.modifier).toBe(0);
    expect(result.active).toBe(false);
  });

  it('should provide +0 when unit has no stealth armor', () => {
    const state = createEWState([], []);
    const result = calculateStealthArmorModifier(
      false,
      'unit1',
      'A',
      'long',
      state,
    );
    expect(result.modifier).toBe(0);
    expect(result.active).toBe(false);
  });

  it('stealth armor modifiers should match spec constants', () => {
    expect(STEALTH_ARMOR_MODIFIERS.short).toBe(0);
    expect(STEALTH_ARMOR_MODIFIERS.medium).toBe(1);
    expect(STEALTH_ARMOR_MODIFIERS.long).toBe(2);
  });
});

// =============================================================================
// 14.5: BAP / Active Probe Counter
// =============================================================================

describe('BAP / Active Probe Counter', () => {
  it('BAP_ECM_COUNTER_RANGE should be 4', () => {
    expect(BAP_ECM_COUNTER_RANGE).toBe(4);
  });

  it('BLOODHOUND_ECM_COUNTER_RANGE should be 8', () => {
    expect(BLOODHOUND_ECM_COUNTER_RANGE).toBe(8);
  });

  it('CLAN_PROBE_ECM_COUNTER_RANGE should be 5', () => {
    expect(CLAN_PROBE_ECM_COUNTER_RANGE).toBe(5);
  });

  it('should return correct probe ranges', () => {
    expect(getProbeECMCounterRange('beagle')).toBe(4);
    expect(getProbeECMCounterRange('bloodhound')).toBe(8);
    expect(getProbeECMCounterRange('clan-active-probe')).toBe(5);
  });

  it('BAP should counter Guardian ECM within range', () => {
    const probe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      position: { q: 0, r: 0 },
    });
    const ecm = makeECM({
      entityId: 'e1',
      teamId: 'B',
      type: 'guardian',
      position: { q: 3, r: 0 },
    });
    expect(canBAPCounterECM(probe, ecm)).toBe(true);
  });

  it('BAP should NOT counter Guardian ECM beyond range', () => {
    const probe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      position: { q: 0, r: 0 },
    });
    const ecm = makeECM({
      entityId: 'e1',
      teamId: 'B',
      type: 'guardian',
      position: { q: 5, r: 0 },
    });
    expect(canBAPCounterECM(probe, ecm)).toBe(false);
  });

  it('BAP should NOT counter Angel ECM', () => {
    const probe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      position: { q: 0, r: 0 },
    });
    const ecm = makeECM({
      entityId: 'e1',
      teamId: 'B',
      type: 'angel',
      position: { q: 3, r: 0 },
    });
    expect(canBAPCounterECM(probe, ecm)).toBe(false);
  });

  it('Bloodhound should counter Angel ECM within range', () => {
    const probe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      type: 'bloodhound',
      position: { q: 0, r: 0 },
    });
    const ecm = makeECM({
      entityId: 'e1',
      teamId: 'B',
      type: 'angel',
      position: { q: 7, r: 0 },
    });
    expect(canBAPCounterECM(probe, ecm)).toBe(true);
  });

  it('Clan probe should counter Guardian ECM within range', () => {
    const probe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      type: 'clan-active-probe',
      position: { q: 0, r: 0 },
    });
    const ecm = makeECM({
      entityId: 'e1',
      teamId: 'B',
      type: 'guardian',
      position: { q: 5, r: 0 },
    });
    expect(canBAPCounterECM(probe, ecm)).toBe(true);
  });

  it('Clan probe should NOT counter Angel ECM', () => {
    const probe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      type: 'clan-active-probe',
      position: { q: 0, r: 0 },
    });
    const ecm = makeECM({
      entityId: 'e1',
      teamId: 'B',
      type: 'angel',
      position: { q: 3, r: 0 },
    });
    expect(canBAPCounterECM(probe, ecm)).toBe(false);
  });

  it('destroyed probe should NOT counter ECM', () => {
    const probe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      operational: false,
      position: { q: 0, r: 0 },
    });
    const ecm = makeECM({
      entityId: 'e1',
      teamId: 'B',
      type: 'guardian',
      position: { q: 3, r: 0 },
    });
    expect(canBAPCounterECM(probe, ecm)).toBe(false);
  });

  it('BAP counter should integrate into full pipeline', () => {
    const state = createEWState(
      [
        makeECM({
          entityId: 'target_ecm',
          teamId: 'B',
          type: 'guardian',
          position: { q: 10, r: 0 },
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
});

// =============================================================================
// 14.6: Integration & State Management Tests
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
