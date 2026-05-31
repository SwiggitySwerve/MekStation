import {
  Facing,
  GameEventType,
  GameSide,
  type IGameSession,
  type IGameUnit,
  type IPSRTriggeredPayload,
  PSRTrigger,
} from '@/types/gameplay';
import {
  advancePhase,
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
  return session;
}

describe('applyInteractiveSessionRuntimeMovementState', () => {
  it('queues a canonical AirMek landing PSR after a required landing-control descent', () => {
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
      },
    });

    const appended = result.events.slice(session.events.length);
    expect(appended.map((event) => event.type)).toEqual([
      GameEventType.RuntimeMovementStateChanged,
      GameEventType.PSRTriggered,
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
    expect(result.currentState.units['lam-1'].lamAirMekAltitude).toBe(0);
    expect(result.currentState.units['lam-1'].pendingPSRs).toEqual([
      {
        entityId: 'lam-1',
        reason: 'landing with gyro or leg damage',
        additionalModifier: 6,
        triggerSource: PSRTrigger.AirMekLanding,
        reasonCode: PSRTrigger.AirMekLanding,
      },
    ]);
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
