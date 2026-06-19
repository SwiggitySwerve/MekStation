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

  it('LIGHT_PROBE_ECM_COUNTER_RANGE should be 3', () => {
    expect(LIGHT_PROBE_ECM_COUNTER_RANGE).toBe(3);
  });

  it('CEWS probe counter ranges should follow MegaMek BAPRange parity', () => {
    expect(WATCHDOG_CEWS_ECM_COUNTER_RANGE).toBe(5);
    expect(NOVA_CEWS_ECM_COUNTER_RANGE).toBe(5);
  });

  it('should return correct probe ranges', () => {
    expect(getProbeECMCounterRange('beagle')).toBe(4);
    expect(getProbeECMCounterRange('bloodhound')).toBe(8);
    expect(getProbeECMCounterRange('clan-active-probe')).toBe(5);
    expect(getProbeECMCounterRange('light-active-probe')).toBe(3);
    expect(getProbeECMCounterRange('watchdog-cews')).toBe(5);
    expect(getProbeECMCounterRange('nova-cews')).toBe(5);
  });

  it('adds the source-backed Eagle Eyes active-probe range bonus without changing base ranges', () => {
    const eagleEyesProbe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      type: 'beagle',
      eagleEyesRangeBonus: true,
    });

    expect(getProbeECMCounterRange('beagle')).toBe(4);
    expect(getProbeECMCounterRange(eagleEyesProbe)).toBe(5);
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

  it('Eagle Eyes extends represented active-probe Guardian ECM countering by one hex', () => {
    const probe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      position: { q: 0, r: 0 },
      eagleEyesRangeBonus: true,
    });
    const ecm = makeECM({
      entityId: 'e1',
      teamId: 'B',
      type: 'guardian',
      position: { q: 5, r: 0 },
    });

    expect(canBAPCounterECM(probe, ecm)).toBe(true);
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

  it('Watchdog CEWS probe should counter Guardian ECM within MegaMek range', () => {
    const probe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      type: 'watchdog-cews',
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

  it('Light active probe should not counter Guardian ECM beyond 3 hexes', () => {
    const probe = makeProbe({
      entityId: 'p1',
      teamId: 'A',
      type: 'light-active-probe',
      position: { q: 0, r: 0 },
    });
    const ecm = makeECM({
      entityId: 'e1',
      teamId: 'B',
      type: 'guardian',
      position: { q: 4, r: 0 },
    });
    expect(canBAPCounterECM(probe, ecm)).toBe(false);
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
