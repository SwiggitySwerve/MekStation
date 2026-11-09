/**
 * Wave 4 C3 — the one GamePhase order table and the guard every live
 * driver derives its edge from.
 *
 * Phase strings are persisted in `event_json`, journals and the replay
 * schema, so the enum values are pinned here and must never be renamed.
 */

import { GamePhase, GameSide } from '@/types/gameplay';
import {
  GAME_PHASE_ORDER,
  isLegalPhaseTransition,
  isTurnBoundary,
  nextPhase,
} from '@/utils/gameplay/gamePhaseTransitions';
import {
  advancePhase,
  createGameSession,
  getNextPhase,
  startGame,
} from '@/utils/gameplay/gameSession';

describe('gamePhaseTransitions', () => {
  it('pins the persisted phase strings (never rename)', () => {
    expect(Object.values(GamePhase).sort()).toEqual(
      [
        'end',
        'heat',
        'initiative',
        'movement',
        'physical_attack',
        'weapon_attack',
      ].sort(),
    );
  });

  it('orders every GamePhase exactly once, Initiative first', () => {
    expect([...GAME_PHASE_ORDER]).toEqual([
      GamePhase.Initiative,
      GamePhase.Movement,
      GamePhase.WeaponAttack,
      GamePhase.PhysicalAttack,
      GamePhase.Heat,
      GamePhase.End,
    ]);
    expect([...GAME_PHASE_ORDER].sort()).toEqual(
      Object.values(GamePhase).sort(),
    );
  });

  it.each([
    [GamePhase.Initiative, GamePhase.Movement],
    [GamePhase.Movement, GamePhase.WeaponAttack],
    [GamePhase.WeaponAttack, GamePhase.PhysicalAttack],
    [GamePhase.PhysicalAttack, GamePhase.Heat],
    [GamePhase.Heat, GamePhase.End],
    [GamePhase.End, GamePhase.Initiative],
  ])('nextPhase(%s) is %s', (from, to) => {
    expect(nextPhase(from)).toBe(to);
    expect(getNextPhase(from)).toBe(to);
  });

  it('keeps the legacy fallback: a value outside the enum restarts at Initiative', () => {
    expect(nextPhase('not_a_phase' as GamePhase)).toBe(GamePhase.Initiative);
    expect(getNextPhase('not_a_phase' as GamePhase)).toBe(GamePhase.Initiative);
  });

  it('accepts only the table edge as a legal transition', () => {
    for (const from of GAME_PHASE_ORDER) {
      for (const to of GAME_PHASE_ORDER) {
        expect(isLegalPhaseTransition(from, to)).toBe(nextPhase(from) === to);
      }
    }
    expect(isLegalPhaseTransition(GamePhase.Movement, GamePhase.Heat)).toBe(
      false,
    );
    expect(isLegalPhaseTransition(GamePhase.Initiative, GamePhase.End)).toBe(
      false,
    );
  });

  it('starts a new turn only when leaving a non-Initiative phase for Initiative', () => {
    expect(isTurnBoundary(GamePhase.End, GamePhase.Initiative)).toBe(true);
    expect(isTurnBoundary(GamePhase.Initiative, GamePhase.Initiative)).toBe(
      false,
    );
    expect(isTurnBoundary(GamePhase.Initiative, GamePhase.Movement)).toBe(
      false,
    );
    expect(isTurnBoundary(GamePhase.Heat, GamePhase.End)).toBe(false);
  });

  it('advancePhase walks the table and bumps the turn only at End -> Initiative', () => {
    let session = startGame(
      createGameSession(
        {
          mapRadius: 5,
          turnLimit: 10,
          victoryConditions: ['destruction'],
          optionalRules: [],
        },
        [
          {
            id: 'unit-1',
            name: 'Atlas',
            side: GameSide.Player,
            unitRef: 'atlas-as7d',
            pilotRef: 'pilot-1',
            gunnery: 4,
            piloting: 5,
          },
        ],
      ),
      GameSide.Player,
    );
    expect(session.currentState.phase).toBe(GamePhase.Initiative);
    const startTurn = session.currentState.turn;

    const visited: GamePhase[] = [];
    for (let i = 0; i < GAME_PHASE_ORDER.length; i++) {
      session = advancePhase(session);
      visited.push(session.currentState.phase);
      const expectedTurn = i === GAME_PHASE_ORDER.length - 1 ? 1 : 0;
      expect(session.currentState.turn).toBe(startTurn + expectedTurn);
    }

    expect(visited).toEqual([
      GamePhase.Movement,
      GamePhase.WeaponAttack,
      GamePhase.PhysicalAttack,
      GamePhase.Heat,
      GamePhase.End,
      GamePhase.Initiative,
    ]);
  });
});
