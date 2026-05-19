/**
 * Integration tests for combat morale + withdrawal.
 *
 * Exercises the end-to-end flows across the morale pass, the Forced
 * Withdrawal check, the edge-exit pass, and the victory check:
 *
 *   - A side loses two units, morale breaks, and the Forced Withdrawal
 *     rule withdraws a third (tasks § 6.1).
 *   - A player declares withdrawal, the unit exits the map, and the
 *     game-over check resolves correctly (tasks § 6.2).
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md § 6
 */

import { describe, it, expect } from '@jest/globals';

import {
  GameEventType,
  GameSide,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';
import { createUnitDestroyedEvent } from '@/utils/gameplay/gameEvents';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { appendEvent } from '@/utils/gameplay/gameSessionCore';
import { checkVictoryConditions } from '@/utils/gameplay/gameState';

import {
  applyForcedWithdrawalCheck,
  applyMoralePass,
  applyWithdrawalEdgeExits,
  declarePlayerWithdrawal,
} from '../withdrawalProcessing';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function gameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: 'atlas-as7-d',
    pilotRef: `pilot-${id}`,
    gunnery: 4,
    piloting: 5,
  };
}

function config(forcedWithdrawal: boolean): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
    forcedWithdrawal,
  };
}

/** Edge resolver mirroring the engine's nearest-edge wiring. */
const nearestEdge = () => 'north' as const;

/** Run the engine-style end-of-phase morale + withdrawal pass. */
function runMoraleAndWithdrawalPass(session: IGameSession): IGameSession {
  let next = applyMoralePass(session);
  next = applyForcedWithdrawalCheck(next, nearestEdge);
  next = applyWithdrawalEdgeExits(next);
  return next;
}

function destroy(session: IGameSession, unitId: string): IGameSession {
  return appendEvent(
    session,
    createUnitDestroyedEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      session.currentState.phase,
      unitId,
      'damage',
    ),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration — morale break drives Forced Withdrawal', () => {
  it('two losses break morale and the rule withdraws the third unit', () => {
    const units: IGameUnit[] = [
      gameUnit('player-1', GameSide.Player),
      gameUnit('player-2', GameSide.Player),
      gameUnit('player-3', GameSide.Player),
      gameUnit('opponent-1', GameSide.Opponent),
    ];
    let session = createGameSession(config(true), units);
    session = startGame(session, GameSide.Player);

    // The player side loses two units in combat.
    session = destroy(session, 'player-1');
    session = destroy(session, 'player-2');

    // End-of-phase pass: morale folds the two losses (STEADY − 2 →
    // BROKEN), then the Forced Withdrawal check withdraws the surviving
    // player-3, then the edge-exit pass fires (player units deploy on
    // the north edge with mapRadius 5).
    session = runMoraleAndWithdrawalPass(session);

    expect(session.currentState.battleMorale?.[GameSide.Player]).toBe('BROKEN');

    // player-3 was forced to withdraw.
    const forced = session.events.filter(
      (e) => e.type === GameEventType.ForcedWithdrawalTriggered,
    );
    expect(forced.some((e) => e.actorId === 'player-3')).toBe(true);
    expect(session.currentState.units['player-3'].isWithdrawing).toBe(true);

    // It then reached its (north) edge and emitted UnitRetreated.
    expect(session.currentState.units['player-3'].hasRetreated).toBe(true);
  });

  it('with the rule off, a routed side fights on — no withdrawal', () => {
    const units: IGameUnit[] = [
      gameUnit('player-1', GameSide.Player),
      gameUnit('player-2', GameSide.Player),
      gameUnit('player-3', GameSide.Player),
      gameUnit('opponent-1', GameSide.Opponent),
    ];
    let session = createGameSession(config(false), units);
    session = startGame(session, GameSide.Player);

    session = destroy(session, 'player-1');
    session = destroy(session, 'player-2');
    session = runMoraleAndWithdrawalPass(session);

    expect(
      session.events.some(
        (e) => e.type === GameEventType.ForcedWithdrawalTriggered,
      ),
    ).toBe(false);
    expect(session.currentState.units['player-3'].isWithdrawing).toBeFalsy();
  });
});

describe('Integration — player withdrawal resolves the game-over check', () => {
  it('a withdrawn unit is excluded from the victory check', () => {
    const cfg = config(false);
    const units: IGameUnit[] = [
      gameUnit('player-1', GameSide.Player),
      gameUnit('player-2', GameSide.Player),
      gameUnit('opponent-1', GameSide.Opponent),
    ];
    let session = createGameSession(cfg, units);
    session = startGame(session, GameSide.Player);

    // The player declares withdrawal for player-1 toward the north
    // edge (where player units deploy on a radius-5 map).
    session = declarePlayerWithdrawal(session, 'player-1', 'north');
    session = runMoraleAndWithdrawalPass(session);

    // player-1 exited the map.
    expect(session.currentState.units['player-1'].hasRetreated).toBe(true);

    // The game is not yet over — player-2 still fights.
    expect(checkVictoryConditions(session.currentState, cfg)).toBeNull();

    // Destroy the remaining player unit; the opponent now wins because
    // the withdrawn player-1 does not count toward the player's force.
    session = destroy(session, 'player-2');
    expect(checkVictoryConditions(session.currentState, cfg)).toBe(
      GameSide.Opponent,
    );
  });

  it('emits a WithdrawalDeclared event with the player as author', () => {
    const units: IGameUnit[] = [
      gameUnit('player-1', GameSide.Player),
      gameUnit('opponent-1', GameSide.Opponent),
    ];
    let session = createGameSession(config(false), units);
    session = startGame(session, GameSide.Player);
    session = declarePlayerWithdrawal(session, 'player-1', 'north');

    const declared = session.events.find(
      (e) => e.type === GameEventType.WithdrawalDeclared,
    );
    expect(declared).toBeDefined();
    expect((declared!.payload as { declaredBy: string }).declaredBy).toBe(
      'player',
    );
  });
});
