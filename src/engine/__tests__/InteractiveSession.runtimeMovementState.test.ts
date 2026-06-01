import {
  Facing,
  GameEventType,
  GameSide,
  type IDamageAppliedPayload,
  type IGameSession,
  type IGameUnit,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitFellPayload,
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

function setupSessionAtMovement(): IGameSession {
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
  return appendEvent(
    session,
    createDamageAppliedEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      'lam-1',
      'center_torso',
      0,
      10,
      12,
      false,
      undefined,
      GamePhase.Movement,
    ),
  );
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
