import {
  Facing,
  GameEventType,
  GameSide,
  type IDamageAppliedPayload,
  type IComponentDestroyedPayload,
  type ICriticalHitPayload,
  type ICriticalHitResolvedPayload,
  type IGameSession,
  type IGameUnit,
  type ILocationDestroyedPayload,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitFellPayload,
  type IUnitDestroyedPayload,
  GamePhase,
  PSRTrigger,
} from '@/types/gameplay';
import { createDamageAppliedEvent } from '@/utils/gameplay/gameEvents';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSession';

import { applyInteractiveSessionRuntimeMovementState } from '../InteractiveSession.actions';

function makeUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  };
}

function setupSessionAtMovement(
  armorByLocation: Readonly<Record<string, number>> = { center_torso: 10 },
  structureByLocation: Readonly<Record<string, number>> = { center_torso: 12 },
): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 4,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    [makeUnit('lam-1', GameSide.Player)],
  );
  session = startGame(session, GameSide.Player);
  session = advancePhase(session);
  session.currentState.units['lam-1'] = {
    ...session.currentState.units['lam-1'],
    position: { q: 0, r: 0 },
    facing: Facing.North,
    lamAirMekAltitude: 1,
  };
  for (const [location, armor] of Object.entries(armorByLocation)) {
    session = appendEvent(
      session,
      createDamageAppliedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        'lam-1',
        location,
        0,
        armor,
        structureByLocation[location] ?? 0,
        false,
        undefined,
        GamePhase.Movement,
      ),
    );
  }
  return session;
}

function d6Sequence(rolls: readonly number[]): () => number {
  const queue = [...rolls];
  return () => queue.shift() ?? 1;
}

describe('applyInteractiveSessionRuntimeMovementState', () => {
  it('resolves a passing AirMek landing PSR during the landing-control descent', () => {
    const session = setupSessionAtMovement();

    const result = applyInteractiveSessionRuntimeMovementState({
      session,
      unitId: 'lam-1',
      patch: {
        source: 'altitude_control_action',
        lamAirMekAltitude: 0,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
        lamAirMekLandingControlRequired: true,
        lamAirMekLandingControlReason: 'landing with gyro or leg damage',
        lamAirMekLandingControlModifier: 6,
        lamAirMekLandingControlModifierDetails: [
          '+5 destroyed leg',
          '+1 foot actuator',
        ],
        lamAirMekLandingControlFallHeight: 1,
      },
      diceRoller: d6Sequence([6, 6]),
    });

    const appended = result.events.slice(session.events.length);
    expect(appended.map((event) => event.type)).toEqual([
      GameEventType.RuntimeMovementStateChanged,
      GameEventType.PSRTriggered,
      GameEventType.PSRResolved,
    ]);

    const trigger = appended[1].payload as IPSRTriggeredPayload;
    expect(trigger).toMatchObject({
      unitId: 'lam-1',
      reason: 'landing with gyro or leg damage',
      additionalModifier: 6,
      triggerSource: PSRTrigger.AirMekLanding,
      reasonCode: PSRTrigger.AirMekLanding,
      basePilotingSkill: 5,
    });
    const resolved = appended[2].payload as IPSRResolvedPayload;
    expect(resolved).toMatchObject({
      unitId: 'lam-1',
      targetNumber: 11,
      roll: 12,
      modifiers: 6,
      passed: true,
      reason: 'landing with gyro or leg damage',
      reasonCode: PSRTrigger.AirMekLanding,
    });
    expect(result.currentState.units['lam-1'].lamAirMekAltitude).toBe(0);
    expect(result.currentState.units['lam-1'].pendingPSRs).toEqual([]);
  });

  it('turns a failed AirMek landing PSR into an elevated fall consequence', () => {
    const session = setupSessionAtMovement();

    const result = applyInteractiveSessionRuntimeMovementState({
      session,
      unitId: 'lam-1',
      patch: {
        source: 'altitude_control_action',
        lamAirMekAltitude: 0,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
        lamAirMekLandingControlRequired: true,
        lamAirMekLandingControlReason: 'landing with gyro or leg damage',
        lamAirMekLandingControlModifier: 6,
        lamAirMekLandingControlModifierDetails: [
          '+5 destroyed leg',
          '+1 foot actuator',
        ],
        lamAirMekLandingControlFallHeight: 1,
      },
      diceRoller: d6Sequence([1, 1, 1, 3, 4, 3, 4, 3, 4, 3, 4]),
      tonnageByUnit: new Map([['lam-1', 80]]),
    });

    const appended = result.events.slice(session.events.length);
    expect(appended.map((event) => event.type)).toEqual([
      GameEventType.RuntimeMovementStateChanged,
      GameEventType.PSRTriggered,
      GameEventType.PSRResolved,
      GameEventType.UnitFell,
      GameEventType.DamageApplied,
      GameEventType.DamageApplied,
      GameEventType.DamageApplied,
      GameEventType.DamageApplied,
      GameEventType.PilotHit,
    ]);

    expect(appended[2].payload as IPSRResolvedPayload).toMatchObject({
      unitId: 'lam-1',
      targetNumber: 11,
      roll: 2,
      modifiers: 6,
      passed: false,
      reasonCode: PSRTrigger.AirMekLanding,
    });
    expect(appended[3].payload as IUnitFellPayload).toMatchObject({
      unitId: 'lam-1',
      fallDamage: 16,
      newFacing: Facing.North,
      pilotDamage: 1,
      reason: 'landing with gyro or leg damage',
      reasonCode: PSRTrigger.AirMekLanding,
    });
    const fallDamageEvents = appended.slice(4, 8);
    expect(
      fallDamageEvents.map(
        (event) => (event.payload as IDamageAppliedPayload).damage,
      ),
    ).toEqual([5, 5, 5, 1]);
    expect(
      fallDamageEvents.map(
        (event) => (event.payload as IDamageAppliedPayload).location,
      ),
    ).toEqual(['center_torso', 'center_torso', 'center_torso', 'center_torso']);
    expect(result.currentState.units['lam-1']).toMatchObject({
      lamAirMekAltitude: 0,
      prone: true,
      pilotWounds: 1,
      pendingPSRs: [],
      damageThisPhase: 16,
      armor: expect.objectContaining({ center_torso: 0 }),
      structure: expect.objectContaining({ center_torso: 6 }),
    });
  });

  it('fans out failed AirMek landing fall destruction before the pilot hit', () => {
    const session = setupSessionAtMovement(
      { center_torso: 1 },
      { center_torso: 4 },
    );

    const result = applyInteractiveSessionRuntimeMovementState({
      session,
      unitId: 'lam-1',
      patch: {
        source: 'altitude_control_action',
        lamAirMekAltitude: 0,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
        lamAirMekLandingControlRequired: true,
        lamAirMekLandingControlReason: 'landing with gyro or leg damage',
        lamAirMekLandingControlModifier: 6,
        lamAirMekLandingControlModifierDetails: [
          '+5 destroyed leg',
          '+1 foot actuator',
        ],
        lamAirMekLandingControlFallHeight: 1,
      },
      diceRoller: d6Sequence([1, 1, 1, 3, 4]),
      tonnageByUnit: new Map([['lam-1', 80]]),
    });

    const appended = result.events.slice(session.events.length);
    expect(appended.map((event) => event.type)).toEqual([
      GameEventType.RuntimeMovementStateChanged,
      GameEventType.PSRTriggered,
      GameEventType.PSRResolved,
      GameEventType.UnitFell,
      GameEventType.DamageApplied,
      GameEventType.LocationDestroyed,
      GameEventType.UnitDestroyed,
      GameEventType.PilotHit,
    ]);

    expect(appended[4].payload as IDamageAppliedPayload).toMatchObject({
      unitId: 'lam-1',
      location: 'center_torso',
      damage: 5,
      armorRemaining: 0,
      structureRemaining: 0,
      locationDestroyed: true,
    });
    expect(appended[4].phase).toBe(GamePhase.Movement);
    expect(appended[5].payload as ILocationDestroyedPayload).toMatchObject({
      unitId: 'lam-1',
      location: 'center_torso',
      viaTransfer: false,
    });
    expect(appended[5].phase).toBe(GamePhase.Movement);
    expect(appended[6].payload as IUnitDestroyedPayload).toMatchObject({
      unitId: 'lam-1',
      cause: 'ct_destroyed',
    });
    expect(appended[6].phase).toBe(GamePhase.Movement);
    expect(result.currentState.units['lam-1']).toMatchObject({
      destroyed: true,
      destroyedLocations: ['center_torso'],
      pilotWounds: 1,
      armor: expect.objectContaining({ center_torso: 0 }),
      structure: expect.objectContaining({ center_torso: 0 }),
    });
  });

  it('resolves failed AirMek landing fall critical hits in movement phase', () => {
    const session = setupSessionAtMovement(
      { center_torso: 0 },
      { center_torso: 12 },
    );

    const result = applyInteractiveSessionRuntimeMovementState({
      session,
      unitId: 'lam-1',
      patch: {
        source: 'altitude_control_action',
        lamAirMekAltitude: 0,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
        lamAirMekLandingControlRequired: true,
        lamAirMekLandingControlReason: 'landing with gyro or leg damage',
        lamAirMekLandingControlModifier: 6,
        lamAirMekLandingControlModifierDetails: [
          '+5 destroyed leg',
          '+1 foot actuator',
        ],
        lamAirMekLandingControlFallHeight: 1,
      },
      diceRoller: d6Sequence([1, 1, 1, 3, 4, 4, 4, 1]),
      tonnageByUnit: new Map([['lam-1', 10]]),
    });

    const appended = result.events.slice(session.events.length);
    expect(appended.map((event) => event.type)).toEqual([
      GameEventType.RuntimeMovementStateChanged,
      GameEventType.PSRTriggered,
      GameEventType.PSRResolved,
      GameEventType.UnitFell,
      GameEventType.DamageApplied,
      GameEventType.CriticalHit,
      GameEventType.CriticalHitResolved,
      GameEventType.ComponentDestroyed,
      GameEventType.PSRTriggered,
      GameEventType.PilotHit,
    ]);

    expect(appended[4].payload as IDamageAppliedPayload).toMatchObject({
      unitId: 'lam-1',
      location: 'center_torso',
      damage: 2,
      armorRemaining: 0,
      structureRemaining: 10,
      locationDestroyed: false,
    });
    expect(appended[4].phase).toBe(GamePhase.Movement);
    expect(appended[5].payload as ICriticalHitPayload).toMatchObject({
      unitId: 'lam-1',
      sourceUnitId: 'lam-1',
      location: 'center_torso',
      component: 'engine',
      count: 1,
    });
    expect(appended[5].phase).toBe(GamePhase.Movement);
    expect(appended[6].payload as ICriticalHitResolvedPayload).toMatchObject({
      unitId: 'lam-1',
      location: 'center_torso',
      slotIndex: 0,
      componentType: 'engine',
      componentName: 'Engine',
      destroyed: true,
    });
    expect(
      (appended[6].payload as ICriticalHitResolvedPayload).effect,
    ).toContain('+5 heat/turn');
    expect(appended[6].phase).toBe(GamePhase.Movement);
    expect(appended[7].payload as IComponentDestroyedPayload).toMatchObject({
      unitId: 'lam-1',
      location: 'center_torso',
      componentType: 'engine',
      slotIndex: 0,
      componentName: 'Engine',
    });
    expect(appended[7].phase).toBe(GamePhase.Movement);
    expect(result.currentState.units['lam-1']).toMatchObject({
      componentDamage: expect.objectContaining({ engineHits: 1 }),
      damageThisPhase: 2,
      armor: expect.objectContaining({ center_torso: 0 }),
      structure: expect.objectContaining({ center_torso: 10 }),
    });
  });

  it('does not queue a PSR for a clean AirMek landing-control descent', () => {
    const session = setupSessionAtMovement();

    const result = applyInteractiveSessionRuntimeMovementState({
      session,
      unitId: 'lam-1',
      patch: {
        source: 'altitude_control_action',
        lamAirMekAltitude: 0,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
        lamAirMekLandingControlRequired: false,
        lamAirMekLandingControlReason: 'Check not required for landing',
        lamAirMekLandingControlModifier: 0,
        lamAirMekLandingControlModifierDetails: [],
        lamAirMekLandingControlFallHeight: 1,
      },
    });

    const appended = result.events.slice(session.events.length);
    expect(appended.map((event) => event.type)).toEqual([
      GameEventType.RuntimeMovementStateChanged,
    ]);
    expect(result.currentState.units['lam-1'].lamAirMekAltitude).toBe(0);
    expect(result.currentState.units['lam-1'].pendingPSRs).toEqual([]);
  });
});
