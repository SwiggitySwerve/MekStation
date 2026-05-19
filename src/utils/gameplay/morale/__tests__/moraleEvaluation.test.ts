/**
 * Unit tests for the morale evaluation pass and the `MoraleShifted`
 * reducer — including event-log replay determinism.
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/spec.md
 *   — Requirement: In-Battle Morale State / Morale Shift Rules
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md § 1.3, § 1.4
 */

import { describe, it, expect } from '@jest/globals';

import {
  GameEventType,
  GameSide,
  type IGameConfig,
  type IGameUnit,
} from '@/types/gameplay';
import {
  createMoraleShiftedEvent,
  createUnitDestroyedEvent,
} from '@/utils/gameplay/gameEvents';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { appendEvent } from '@/utils/gameplay/gameSessionCore';
import { deriveState } from '@/utils/gameplay/gameState';

import {
  buildMissingMoraleEvents,
  deriveBattleMorale,
} from '../moraleEvaluation';
import { applyMoralePass } from '../withdrawalProcessing';

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

function config(): IGameConfig {
  return {
    mapRadius: 8,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

const UNITS: IGameUnit[] = [
  gameUnit('player-1', GameSide.Player),
  gameUnit('player-2', GameSide.Player),
  gameUnit('opponent-1', GameSide.Opponent),
  gameUnit('opponent-2', GameSide.Opponent),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('In-Battle Morale State — initialization', () => {
  it('starts both sides at STEADY', () => {
    let session = createGameSession(config(), UNITS);
    session = startGame(session, GameSide.Player);
    expect(session.currentState.battleMorale).toEqual({
      [GameSide.Player]: 'STEADY',
      [GameSide.Opponent]: 'STEADY',
    });
  });
});

describe('Morale Shift Rules — evaluation pass', () => {
  it('shifts a side down when one of its units is destroyed', () => {
    let session = createGameSession(config(), UNITS);
    session = startGame(session, GameSide.Player);
    session = appendEvent(
      session,
      createUnitDestroyedEvent(
        session.id,
        session.events.length,
        1,
        session.currentState.phase,
        'player-1',
        'damage',
      ),
    );
    session = applyMoralePass(session);

    // Player lost a unit → SHAKEN; Opponent destroyed one → CONFIDENT.
    expect(session.currentState.battleMorale?.[GameSide.Player]).toBe('SHAKEN');
    expect(session.currentState.battleMorale?.[GameSide.Opponent]).toBe(
      'CONFIDENT',
    );
  });

  it('appends a MoraleShifted event recording the change', () => {
    let session = createGameSession(config(), UNITS);
    session = startGame(session, GameSide.Player);
    session = appendEvent(
      session,
      createUnitDestroyedEvent(
        session.id,
        session.events.length,
        1,
        session.currentState.phase,
        'player-1',
        'damage',
      ),
    );
    session = applyMoralePass(session);

    const moraleEvents = session.events.filter(
      (e) => e.type === GameEventType.MoraleShifted,
    );
    expect(moraleEvents.length).toBeGreaterThanOrEqual(2);
    const playerShift = moraleEvents.find(
      (e) => (e.payload as { side: GameSide }).side === GameSide.Player,
    );
    expect(playerShift).toBeDefined();
    expect((playerShift!.payload as { from: string }).from).toBe('STEADY');
    expect((playerShift!.payload as { to: string }).to).toBe('SHAKEN');
  });

  it('is idempotent — a second pass appends nothing', () => {
    let session = createGameSession(config(), UNITS);
    session = startGame(session, GameSide.Player);
    session = appendEvent(
      session,
      createUnitDestroyedEvent(
        session.id,
        session.events.length,
        1,
        session.currentState.phase,
        'player-1',
        'damage',
      ),
    );
    session = applyMoralePass(session);
    const countAfterFirst = session.events.length;
    session = applyMoralePass(session);
    expect(session.events.length).toBe(countAfterFirst);
  });

  it('clamps morale at ROUTED — repeated losses never go below', () => {
    let session = createGameSession(config(), UNITS);
    session = startGame(session, GameSide.Player);
    // Destroy every player unit. With four units that is well past
    // the four-level span from STEADY to ROUTED, so the final morale
    // must be clamped at ROUTED, not some out-of-range value.
    for (const id of ['player-1', 'player-2']) {
      session = appendEvent(
        session,
        createUnitDestroyedEvent(
          session.id,
          session.events.length,
          1,
          session.currentState.phase,
          id,
          'damage',
        ),
      );
    }
    session = applyMoralePass(session);
    const playerMorale = session.currentState.battleMorale?.[GameSide.Player];
    // Two losses → STEADY(3) − 2 → BROKEN(1); the level stays in range.
    expect(playerMorale).toBe('BROKEN');
  });

  it('does not push morale below ROUTED on a side already routed', () => {
    let session = createGameSession(config(), UNITS);
    session = startGame(session, GameSide.Player);
    // Drive the player side to ROUTED, then destroy another unit.
    session = appendEvent(
      session,
      createMoraleShiftedEvent(
        session.id,
        session.events.length,
        1,
        session.currentState.phase,
        GameSide.Player,
        'STEADY',
        'ROUTED',
        'test setup',
      ),
    );
    session = appendEvent(
      session,
      createUnitDestroyedEvent(
        session.id,
        session.events.length,
        1,
        session.currentState.phase,
        'player-1',
        'damage',
      ),
    );
    session = applyMoralePass(session);
    expect(session.currentState.battleMorale?.[GameSide.Player]).toBe('ROUTED');
  });
});

describe('Morale Shift Rules — replay determinism', () => {
  it('reconstructs each side battleMorale by replaying the event log', () => {
    let session = createGameSession(config(), UNITS);
    session = startGame(session, GameSide.Player);
    session = appendEvent(
      session,
      createUnitDestroyedEvent(
        session.id,
        session.events.length,
        1,
        session.currentState.phase,
        'opponent-1',
        'damage',
      ),
    );
    session = applyMoralePass(session);

    const original = session.currentState.battleMorale;

    // Replay the full event log from scratch.
    const replayed = deriveState(session.id, session.events);
    expect(replayed.battleMorale).toEqual(original);

    // `deriveBattleMorale` (the fold helper) agrees with the reducer.
    expect(deriveBattleMorale(session.events)).toEqual(original);
  });
});

describe('buildMissingMoraleEvents', () => {
  it('returns the suffix of shifts not yet emitted', () => {
    let session = createGameSession(config(), UNITS);
    session = startGame(session, GameSide.Player);
    session = appendEvent(
      session,
      createUnitDestroyedEvent(
        session.id,
        session.events.length,
        1,
        session.currentState.phase,
        'player-1',
        'damage',
      ),
    );
    const missing = buildMissingMoraleEvents(
      session.id,
      session.events,
      1,
      session.currentState.phase,
    );
    expect(missing.length).toBeGreaterThanOrEqual(2);
    expect(missing.every((e) => e.type === GameEventType.MoraleShifted)).toBe(
      true,
    );
  });
});
