import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameSession,
} from '@/types/gameplay';

import { createPSRResolvedEvent } from '../gameEvents';
import { serializeEvents } from '../gameEvents/serialization';
import { createGameSession, startGame } from '../gameSession';
import { attemptStandUp, resolvePendingPSRs } from '../gameSessionPSR';
import { createDefaultComponentDamage } from '../gameSessionPSRResolution';
import { createDamagePSR } from '../pilotingSkillRolls';

function damagedSession(): IGameSession {
  const session = startGame(
    createGameSession(
      {
        mapRadius: 4,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      [
        {
          id: 'mek',
          name: 'Mek',
          side: GameSide.Player,
          unitRef: 'mek',
          pilotRef: 'pilot',
          gunnery: 4,
          piloting: 5,
        },
      ],
    ),
    GameSide.Player,
  );
  return {
    ...session,
    currentState: {
      ...session.currentState,
      phase: GamePhase.Movement,
      units: {
        ...session.currentState.units,
        mek: {
          ...session.currentState.units.mek,
          prone: true,
          componentDamage: { ...createDefaultComponentDamage(), gyroHits: 2 },
          pendingPSRs: [createDamagePSR('mek')],
        },
      },
    },
  };
}

const dice = () => ({
  dice: [3, 3] as const,
  total: 6,
  isSnakeEyes: false,
  isBoxcars: false,
});

describe('session PSR automatic failure writers', () => {
  it('preserves the existing finite PSR payload bytes, including key order', () => {
    const event = createPSRResolvedEvent(
      'game',
      1,
      1,
      GamePhase.End,
      'mek',
      5,
      6,
      0,
      true,
      'Damage',
    );
    expect(JSON.stringify(event.payload)).toBe(
      '{"unitId":"mek","targetNumber":5,"roll":6,"modifiers":0,"passed":true,"reason":"Damage"}',
    );
  });

  it('records each destroyed-gyro pending PSR with an explicit automatic failure', () => {
    const next = resolvePendingPSRs(damagedSession(), dice);
    const resolved = next.events.filter(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved).toHaveLength(1);
    expect(resolved[0].payload).toMatchObject({
      automaticFailure: true,
      roll: 0,
      modifiers: 0,
      passed: false,
    });
    expect(resolved[0].payload).not.toHaveProperty('targetNumber');
    expect(() => serializeEvents(next.events)).not.toThrow();
    expect(
      next.events.some((event) => event.type === GameEventType.UnitFell),
    ).toBe(true);
  });

  it('records an impossible stand without rolling or storing a target', () => {
    const roller = jest.fn(dice);
    const next = attemptStandUp(damagedSession(), 'mek', roller);
    const resolved = next.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved?.payload).toMatchObject({
      automaticFailure: true,
      roll: 0,
      passed: false,
    });
    expect(resolved?.payload).not.toHaveProperty('targetNumber');
    expect(roller).not.toHaveBeenCalled();
    expect(() => serializeEvents(next.events)).not.toThrow();
    expect(
      next.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(false);
  });
});
