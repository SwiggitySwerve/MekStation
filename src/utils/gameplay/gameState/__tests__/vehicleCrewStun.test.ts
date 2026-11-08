import { GameEventType, GamePhase, type IGameEvent } from '@/types/gameplay';
import { createPhaseChangedEvent } from '@/utils/gameplay/gameEvents';
import {
  appendEvent,
  hydrateGameSessionFromEvents,
} from '@/utils/gameplay/gameSession';
import { advanceVehicleCrewStun } from '@/utils/gameplay/vehicleCrewStun';

import { applyEvent } from '..';
import {
  crewStunEvent,
  stunnedRounds,
  stunnedVehicleSession,
} from './vehicleCrewStun.helpers';

describe('vehicle crew stun round lifecycle (MegaMek 48fcb2f64 Tank.newRound)', () => {
  it('changes only the vehicle stun counter and leaves nonvehicles untouched', () => {
    const { currentState } = stunnedVehicleSession();
    const vehicle = currentState.units.target;
    const before = JSON.stringify(vehicle);
    const next = advanceVehicleCrewStun(vehicle);
    const originalCombat = vehicle.combatState;
    const nextCombat = next.combatState;
    if (originalCombat?.kind !== 'vehicle' || nextCombat?.kind !== 'vehicle')
      throw new Error('Expected vehicle');
    expect(next).toEqual({
      ...vehicle,
      combatState: {
        kind: 'vehicle',
        state: {
          ...originalCombat.state,
          motive: { ...originalCombat.state.motive, crewStunnedPhases: 1 },
        },
      },
    });
    expect(JSON.stringify(vehicle)).toBe(before);
    expect(advanceVehicleCrewStun(currentState.units.attacker)).toBe(
      currentState.units.attacker,
    );
  });
  it.each([GameEventType.TurnStarted, GameEventType.PhaseChanged])(
    '%s counts down once per new round and floors at zero',
    (type) => {
      let session = stunnedVehicleSession();
      expect(stunnedRounds(session)).toBe(2);
      const original = JSON.stringify(session.currentState);
      for (const expected of [1, 0, 0]) {
        const before = session.currentState;
        const event: IGameEvent = {
          ...createPhaseChangedEvent(
            session.id,
            session.events.length,
            before.turn + 1,
            GamePhase.End,
            GamePhase.Initiative,
          ),
          type,
          payload:
            type === GameEventType.TurnStarted
              ? {}
              : { fromPhase: GamePhase.End, toPhase: GamePhase.Initiative },
        };
        const snapshot = JSON.stringify(before);
        session = appendEvent(session, event);
        expect(stunnedRounds(session)).toBe(expected);
        expect(JSON.stringify(before)).toBe(snapshot);
        expect(
          applyEvent(session.currentState, event).units.target.combatState,
        ).toEqual(session.currentState.units.target.combatState);
        expect(
          hydrateGameSessionFromEvents(session.id, session.events).currentState,
        ).toEqual(session.currentState);
      }
      expect(
        JSON.parse(original).units.target.combatState.state.motive
          .crewStunnedPhases,
      ).toBe(2);
    },
  );

  it('preserves stun through every intra-round phase and preserves existing repeated-stun increments', () => {
    let session = stunnedVehicleSession();
    for (const phase of [
      GamePhase.Movement,
      GamePhase.WeaponAttack,
      GamePhase.PhysicalAttack,
      GamePhase.Heat,
      GamePhase.End,
    ]) {
      session = appendEvent(
        session,
        createPhaseChangedEvent(
          session.id,
          session.events.length,
          session.currentState.turn,
          session.currentState.phase,
          phase,
        ),
      );
      expect(stunnedRounds(session)).toBe(2);
    }
    session = appendEvent(session, crewStunEvent(session));
    expect(stunnedRounds(session)).toBe(4);
  });
});
