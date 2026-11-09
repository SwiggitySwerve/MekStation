import { translateIntentToEvents } from '@/lib/p2p/intentTranslation';
/**
 * C11 exit latches. A unit leaves the battle once: destroyed, ejected or
 * retreated, whichever event lands first. The retreat and withdrawal
 * latches share `retreatTargetEdge`, so the first latch fixes the edge.
 * The reducer enforces this; P2P translation and the non-interactive
 * store eject do not guard, so the reducer is the backstop for them.
 */
import {
  buildEjectIntent,
  buildWithdrawIntent,
} from '@/lib/p2p/intentTranslationBuilders';
import {
  GameSide,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  createRetreatTriggeredEvent,
  createUnitDestroyedEvent,
  createUnitEjectedEvent,
  createUnitRetreatedEvent,
  createWithdrawalDeclaredEvent,
} from '@/utils/gameplay/gameEvents';
import { createPhysicalAttackResolvedEvent } from '@/utils/gameplay/gameEvents/statusPhysical';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { appendEvent } from '@/utils/gameplay/gameSessionCore';
import { declarePlayerWithdrawal } from '@/utils/gameplay/morale/withdrawalProcessing';

import { deriveState } from '../gameStateReducer';

const HOST_PEER = 'host-peer';
const GUEST_PEER = 'guest-peer';
const UNIT = 'guest-0';

const UNITS: readonly IGameUnit[] = [
  {
    id: 'host-0',
    name: 'Wasp',
    side: GameSide.Player,
    unitRef: 'wsp-1a',
    pilotRef: 'p-host',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: UNIT,
    name: 'Cicada',
    side: GameSide.Opponent,
    unitRef: 'cda-2a',
    pilotRef: 'p-guest',
    gunnery: 4,
    piloting: 5,
  },
];

function newSession(): IGameSession {
  const session = createGameSession(
    {
      mapRadius: 8,
      turnLimit: 30,
      victoryConditions: ['destroy_all'],
      optionalRules: [],
    },
    UNITS,
    {
      id: 'c11-match',
      createdAt: '2026-11-08T00:00:00.000Z',
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: {
        [GameSide.Player]: HOST_PEER,
        [GameSide.Opponent]: GUEST_PEER,
      },
    },
  );
  return startGame(session, GameSide.Player);
}

type EventFactory = (session: IGameSession) => IGameEvent;

const at = (session: IGameSession) =>
  [
    session.id,
    session.events.length,
    session.currentState.turn,
    session.currentState.phase,
  ] as const;

const destroyed: EventFactory = (s) =>
  createUnitDestroyedEvent(...at(s), UNIT, 'damage');
const ejected: EventFactory = (s) =>
  createUnitEjectedEvent(...at(s), UNIT, 'player_declared');
const retreated: EventFactory = (s) =>
  createUnitRetreatedEvent(...at(s), UNIT, 'north');
const retreatTriggered =
  (edge: 'north' | 'south'): EventFactory =>
  (s) =>
    createRetreatTriggeredEvent(...at(s), UNIT, edge, 'structural_threshold');
const withdrawalDeclared =
  (edge: 'north' | 'south'): EventFactory =>
  (s) =>
    createWithdrawalDeclaredEvent(...at(s), UNIT, edge, 'forced');

function play(...factories: EventFactory[]): IGameSession {
  let session = newSession();
  for (const factory of factories) {
    session = appendEvent(session, factory(session));
  }
  return session;
}

function unitAfter(...factories: EventFactory[]): IUnitGameState {
  const session = play(...factories);
  // Live fold and replay fold must agree.
  expect(deriveState(session.id, session.events).units[UNIT]).toEqual(
    session.currentState.units[UNIT],
  );
  return session.currentState.units[UNIT];
}

function exitFlags(unit: IUnitGameState) {
  return {
    destroyed: unit.destroyed,
    hasEjected: unit.hasEjected ?? false,
    hasRetreated: unit.hasRetreated ?? false,
  };
}

describe('C11: the first latch fixes the target edge', () => {
  it('a withdrawal after a bot retreat keeps the retreat edge', () => {
    const unit = unitAfter(
      retreatTriggered('north'),
      withdrawalDeclared('south'),
    );
    expect(unit.isRetreating).toBe(true);
    expect(unit.isWithdrawing).toBe(true);
    expect(unit.retreatTargetEdge).toBe('north');
  });

  it('a bot retreat after a forced withdrawal keeps the withdrawal edge', () => {
    const unit = unitAfter(
      withdrawalDeclared('south'),
      retreatTriggered('north'),
    );
    expect(unit.isWithdrawing).toBe(true);
    expect(unit.isRetreating).toBe(true);
    expect(unit.retreatTargetEdge).toBe('south');
  });
});

describe('C11: a unit exits the battle only once', () => {
  it.each([
    ['destroyed then ejected', [destroyed, ejected], 'destroyed'],
    ['destroyed then retreated', [destroyed, retreated], 'destroyed'],
    ['ejected then retreated', [ejected, retreated], 'hasEjected'],
    ['retreated then ejected', [retreated, ejected], 'hasRetreated'],
  ] as const)('%s keeps only the first exit', (_label, events, first) => {
    const flags = exitFlags(unitAfter(...events));
    expect(flags).toEqual({
      destroyed: first === 'destroyed',
      hasEjected: first === 'hasEjected',
      hasRetreated: first === 'hasRetreated',
    });
  });

  it.each([
    ['destroyed', destroyed],
    ['ejected', ejected],
    ['retreated', retreated],
  ] as const)(
    'retreat and withdrawal latches are ignored once the unit is %s',
    (_label, exit) => {
      const unit = unitAfter(
        exit,
        retreatTriggered('north'),
        withdrawalDeclared('south'),
      );
      expect(unit.isRetreating ?? false).toBe(false);
      expect(unit.isWithdrawing ?? false).toBe(false);
      expect(unit.retreatTargetEdge).toBeUndefined();
    },
  );
});

describe('C11: unguarded entry paths fall back on the reducer', () => {
  function applyIntent(
    session: IGameSession,
    intent: Parameters<typeof translateIntentToEvents>[0],
  ): IGameSession {
    const result = translateIntentToEvents(intent, session);
    if (!result.ok) throw new Error(`intent rejected: ${result.reason}`);
    return result.events.reduce(appendEvent, session);
  }

  it('a P2P eject on a destroyed unit leaves it destroyed, not ejected', () => {
    const session = applyIntent(
      play(destroyed),
      buildEjectIntent(GUEST_PEER, { unitId: UNIT }),
    );
    expect(exitFlags(session.currentState.units[UNIT])).toEqual({
      destroyed: true,
      hasEjected: false,
      hasRetreated: false,
    });
  });

  it('a P2P withdrawal on a retreating unit keeps the retreat edge', () => {
    const session = applyIntent(
      play(retreatTriggered('north')),
      buildWithdrawIntent(GUEST_PEER, { unitId: UNIT, edge: 'south' }),
    );
    expect(session.currentState.units[UNIT].retreatTargetEdge).toBe('north');
  });

  it('declarePlayerWithdrawal on a retreating unit appends nothing', () => {
    const before = play(retreatTriggered('north'));
    const after = declarePlayerWithdrawal(before, UNIT, 'south');
    expect(after.events).toHaveLength(before.events.length);
  });
});

it('C9: P2P ejection releases both grapple participants through the canonical fold', () => {
  let session = newSession();
  session = appendEvent(
    session,
    createPhysicalAttackResolvedEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      UNIT,
      'host-0',
      'grapple',
      12,
      2,
      true,
      0,
    ),
  );
  const translated = translateIntentToEvents(
    buildEjectIntent(GUEST_PEER, { unitId: UNIT }),
    session,
  );
  if (!translated.ok) throw new Error('expected owned eject');
  session = translated.events.reduce(appendEvent, session);
  expect(session.currentState.units['host-0'].grappledUnitId).toBeUndefined();
  expect(deriveState(session.id, session.events).units).toEqual(
    session.currentState.units,
  );
});
