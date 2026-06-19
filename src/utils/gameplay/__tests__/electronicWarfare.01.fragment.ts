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
