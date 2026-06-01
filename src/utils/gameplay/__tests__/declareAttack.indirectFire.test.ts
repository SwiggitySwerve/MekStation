/**
 * Tests for declareAttack indirect-fire dispatch (PR-K4 §5.1)
 *
 * Verifies that when a pre-computed `IIndirectFireResolution` is passed
 * to `declareAttack`, the function:
 *   1. Appends an 'Indirect fire' modifier to the AttackDeclared payload
 *   2. Adds the toHitPenalty to the AttackDeclared toHitNumber
 *   3. Emits IndirectFireSpotterSelected (basis='los') OR
 *      IndirectFireNarcOverride (basis='narc'/'inarc') immediately after
 *      the AttackDeclared event
 *
 * Backward-compat scenario: declareAttack without a resolution behaves
 * identically to the pre-PR-K4 contract (no indirect-fire events emitted).
 */

import type {
  IIndirectFireResolution,
  IIndirectFireForwardObserverPayload,
  IIndirectFireSpotterSelectedPayload,
  IIndirectFireNarcOverridePayload,
} from '@/types/gameplay/IndirectFireInterfaces';

import {
  Facing,
  GameEventType,
  GameSide,
  GamePhase,
  IGameConfig,
  IGameUnit,
  IAttackDeclaredPayload,
  IWeaponAttack,
  RangeBracket,
} from '@/types/gameplay';

import {
  createGameSession,
  declareAttack,
  rollInitiative,
  advancePhase,
  startGame,
} from '../gameSession';

// =============================================================================
// Fixtures
// =============================================================================

function buildConfig(): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  } as IGameConfig;
}

function buildUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'a1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'p1',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 't1',
      name: 'Hunchback',
      side: GameSide.Opponent,
      unitRef: 'hbk-4g',
      pilotRef: 'p2',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 's1',
      name: 'Spotter',
      side: GameSide.Player,
      unitRef: 'spotter-mech',
      pilotRef: 'p3',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

function buildLRMAttack(): readonly IWeaponAttack[] {
  return [
    {
      weaponId: 'lrm-15-1',
      weaponName: 'LRM-15',
      damage: 9,
      heat: 5,
      minRange: 6,
      shortRange: 7,
      mediumRange: 14,
      longRange: 21,
    } as unknown as IWeaponAttack,
  ];
}

function buildDirectAttack(): readonly IWeaponAttack[] {
  return [
    {
      weaponId: 'medium-laser-1',
      weaponName: 'Medium Laser',
      mode: 'Direct',
      damage: 5,
      heat: 3,
      minRange: 0,
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
    } as unknown as IWeaponAttack,
  ];
}

function setupWeaponAttackSession() {
  let s = createGameSession(buildConfig(), buildUnits());
  s = startGame(s, GameSide.Player);
  s = rollInitiative(s);
  s = advancePhase(s); // Movement
  s = advancePhase(s); // WeaponAttack
  return s;
}

// =============================================================================
// Tests
// =============================================================================

describe('declareAttack indirect-fire dispatch (PR-K4 §5.1)', () => {
  it('emits no indirect-fire events when no resolution passed (backward compat)', () => {
    const session = setupWeaponAttackSession();
    const result = declareAttack(
      session,
      'a1',
      't1',
      buildLRMAttack(),
      14,
      RangeBracket.Medium,
    );

    const indirectEvents = result.events.filter(
      (e) =>
        e.type === GameEventType.IndirectFireSpotterSelected ||
        e.type === GameEventType.IndirectFireNarcOverride ||
        e.type === GameEventType.IndirectFireSpotterLost ||
        e.type === GameEventType.IndirectFireForwardObserver,
    );
    expect(indirectEvents.length).toBe(0);
  });

  it('appends Indirect fire modifier + emits IndirectFireSpotterSelected for basis=los', () => {
    const session = setupWeaponAttackSession();
    const resolution: IIndirectFireResolution = {
      permitted: true,
      isIndirect: true,
      spotterId: 's1',
      basis: 'los',
      toHitPenalty: 1,
    };

    const result = declareAttack(
      session,
      'a1',
      't1',
      buildLRMAttack(),
      14,
      RangeBracket.Medium,
      resolution,
    );

    // AttackDeclared event has the indirect modifier in its modifiers list
    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    const indirectMod = declaredPayload.modifiers.find(
      (m) => m.name === 'Indirect fire',
    );
    expect(indirectMod).toBeDefined();
    expect(indirectMod!.value).toBe(1);

    // IndirectFireSpotterSelected event fires immediately after AttackDeclared
    const spotterEvent = result.events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterSelected,
    );
    expect(spotterEvent).toBeDefined();
    const spotterPayload = spotterEvent!
      .payload as IIndirectFireSpotterSelectedPayload;
    expect(spotterPayload.attackerId).toBe('a1');
    expect(spotterPayload.spotterId).toBe('s1');
    expect(spotterPayload.weaponId).toBe('lrm-15-1');
    expect(spotterPayload.basis).toBe('los');
    expect(spotterPayload.toHitPenalty).toBe(1);
  });

  it('emits IndirectFireNarcOverride for basis=narc (no spotter)', () => {
    const session = setupWeaponAttackSession();
    const resolution: IIndirectFireResolution = {
      permitted: true,
      isIndirect: true,
      spotterId: null,
      basis: 'narc',
      toHitPenalty: 1,
    };

    const result = declareAttack(
      session,
      'a1',
      't1',
      buildLRMAttack(),
      14,
      RangeBracket.Medium,
      resolution,
    );

    const narcEvent = result.events.find(
      (e) => e.type === GameEventType.IndirectFireNarcOverride,
    );
    expect(narcEvent).toBeDefined();
    const narcPayload = narcEvent!.payload as IIndirectFireNarcOverridePayload;
    expect(narcPayload.basis).toBe('narc');
    expect(narcPayload.spotterId).toBeNull();
    expect(narcPayload.toHitPenalty).toBe(1);

    // No SpotterSelected event (NARC override has no human spotter)
    const spotterEvent = result.events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterSelected,
    );
    expect(spotterEvent).toBeUndefined();
  });

  it('stacks +2 penalty when spotter walked (basis=los, no FO SPA)', () => {
    const session = setupWeaponAttackSession();
    const resolution: IIndirectFireResolution = {
      permitted: true,
      isIndirect: true,
      spotterId: 's1',
      basis: 'los',
      toHitPenalty: 2, // base+1 + walked+1
    };

    const result = declareAttack(
      session,
      'a1',
      't1',
      buildLRMAttack(),
      14,
      RangeBracket.Medium,
      resolution,
    );

    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    const indirectMod = declaredPayload.modifiers.find(
      (m) => m.name === 'Indirect fire',
    );
    expect(indirectMod!.value).toBe(2);

    const spotterEvent = result.events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterSelected,
    );
    expect(spotterEvent).toBeDefined();
    const spotterPayload = spotterEvent!
      .payload as IIndirectFireSpotterSelectedPayload;
    expect(spotterPayload.toHitPenalty).toBe(2);
  });

  it('emits ForwardObserver event when FO cancels walked spotter penalty', () => {
    const session = setupWeaponAttackSession();
    const resolution: IIndirectFireResolution = {
      permitted: true,
      isIndirect: true,
      spotterId: 's1',
      basis: 'los',
      toHitPenalty: 1,
      forwardObserverApplied: true,
      spotterMovementPenaltyCancelled: 1,
    };

    const result = declareAttack(
      session,
      'a1',
      't1',
      buildLRMAttack(),
      14,
      RangeBracket.Medium,
      resolution,
    );

    const spotterEventIndex = result.events.findIndex(
      (e) => e.type === GameEventType.IndirectFireSpotterSelected,
    );
    const forwardObserverEvent = result.events.find(
      (e) => e.type === GameEventType.IndirectFireForwardObserver,
    );

    expect(spotterEventIndex).toBeGreaterThan(-1);
    expect(forwardObserverEvent).toBeDefined();
    expect(forwardObserverEvent!.sequence).toBe(
      result.events[spotterEventIndex].sequence + 1,
    );
    expect(
      forwardObserverEvent!.payload as IIndirectFireForwardObserverPayload,
    ).toMatchObject({
      attackerId: 'a1',
      spotterId: 's1',
      weaponId: 'lrm-15-1',
      basis: 'los',
      toHitPenalty: 1,
      penaltyCancelled: 1,
    });
  });

  it('adds +1 spotting-fire modifier when the elected spotter fires later that turn', () => {
    const session = setupWeaponAttackSession();
    const resolution: IIndirectFireResolution = {
      permitted: true,
      isIndirect: true,
      spotterId: 's1',
      basis: 'los',
      toHitPenalty: 1,
    };

    const afterIndirect = declareAttack(
      session,
      'a1',
      't1',
      buildLRMAttack(),
      14,
      RangeBracket.Medium,
      resolution,
    );
    const result = declareAttack(
      afterIndirect,
      's1',
      't1',
      buildDirectAttack(),
      3,
      RangeBracket.Short,
    );

    const declaredPayloads = result.events
      .filter((e) => e.type === GameEventType.AttackDeclared)
      .map((e) => e.payload as IAttackDeclaredPayload);
    const spotterAttack = declaredPayloads[declaredPayloads.length - 1];
    const spottingMod = spotterAttack.modifiers.find(
      (modifier) => modifier.name === 'Spotting for indirect fire',
    );

    expect(spottingMod).toMatchObject({ value: 1, source: 'other' });
    expect(spotterAttack.toHitNumber).toBe(5);
  });

  it('does NOT emit indirect events when resolution.permitted is false', () => {
    const session = setupWeaponAttackSession();
    const resolution: IIndirectFireResolution = {
      permitted: false,
      isIndirect: false,
      spotterId: null,
      toHitPenalty: 0,
      reason: 'No eligible spotter',
    };

    const result = declareAttack(
      session,
      'a1',
      't1',
      buildLRMAttack(),
      14,
      RangeBracket.Medium,
      resolution,
    );

    const indirectEvents = result.events.filter(
      (e) =>
        e.type === GameEventType.IndirectFireSpotterSelected ||
        e.type === GameEventType.IndirectFireNarcOverride,
    );
    expect(indirectEvents.length).toBe(0);

    // AttackDeclared still emitted; no Indirect fire modifier
    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    const indirectMod = declaredPayload.modifiers.find(
      (m) => m.name === 'Indirect fire',
    );
    expect(indirectMod).toBeUndefined();
  });
});
