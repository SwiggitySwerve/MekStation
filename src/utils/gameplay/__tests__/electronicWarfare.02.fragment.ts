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
