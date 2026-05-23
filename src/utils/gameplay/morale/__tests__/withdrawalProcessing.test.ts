/**
 * Unit tests for the Forced Withdrawal rule, the player withdrawal
 * action, and the withdrawal edge-exit pass.
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/spec.md
 *   — Requirements: Player Withdrawal Declaration / Forced Withdrawal
 *     Rule / Withdrawal Map-Edge Exit / Failed Withdrawal Handling
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md
 *   § 2.4, § 3.5, § 5.2
 */

import { describe, it, expect } from '@jest/globals';

import {
  GameEventType,
  GameSide,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  createMoraleShiftedEvent,
  createUnitDestroyedEvent,
  createUnitEjectedEvent,
} from '@/utils/gameplay/gameEvents';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { appendEvent } from '@/utils/gameplay/gameSessionCore';

import {
  forcedWithdrawalReasonFor,
  isSideMoraleBroken,
  isUnitCrippled,
} from '../forcedWithdrawal';
import {
  applyForcedWithdrawalCheck,
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

function config(forcedWithdrawal = false): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
    forcedWithdrawal,
  };
}

const UNITS: IGameUnit[] = [
  gameUnit('player-1', GameSide.Player),
  gameUnit('player-2', GameSide.Player),
  gameUnit('opponent-1', GameSide.Opponent),
];

function newSession(forcedWithdrawal = false): IGameSession {
  let session = createGameSession(config(forcedWithdrawal), UNITS);
  session = startGame(session, GameSide.Player);
  return session;
}

/** Force a side's morale to BROKEN by appending a MoraleShifted event. */
function breakSideMorale(session: IGameSession, side: GameSide): IGameSession {
  return appendEvent(
    session,
    createMoraleShiftedEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      session.currentState.phase,
      side,
      'STEADY',
      'BROKEN',
      'test',
    ),
  );
}

const nearestEdge = () => 'north' as const;

// ---------------------------------------------------------------------------
// Forced-withdrawal predicates
// ---------------------------------------------------------------------------

describe('isSideMoraleBroken', () => {
  it('is true at BROKEN and ROUTED', () => {
    expect(isSideMoraleBroken('BROKEN')).toBe(true);
    expect(isSideMoraleBroken('ROUTED')).toBe(true);
  });

  it('is false at SHAKEN and above', () => {
    expect(isSideMoraleBroken('SHAKEN')).toBe(false);
    expect(isSideMoraleBroken('STEADY')).toBe(false);
  });
});

describe('isUnitCrippled', () => {
  function unit(partial: Partial<IUnitGameState>): IUnitGameState {
    return {
      id: 'u',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: 0,
      heat: 0,
      movementThisTurn: 'stationary' as IUnitGameState['movementThisTurn'],
      hexesMovedThisTurn: 0,
      armor: {},
      structure: {},
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: 'pending' as IUnitGameState['lockState'],
      ...partial,
    };
  }

  it('is true after an engine crit', () => {
    expect(
      isUnitCrippled(
        unit({
          componentDamage: {
            engineHits: 1,
            gyroHits: 0,
            sensorHits: 0,
            lifeSupport: 0,
            cockpitHit: false,
            actuators: {},
            weaponsDestroyed: [],
            heatSinksDestroyed: 0,
            jumpJetsDestroyed: 0,
          },
        }),
      ),
    ).toBe(true);
  });

  it('is true after more than 50% internal structure loss', () => {
    expect(
      isUnitCrippled(
        unit({
          startingInternalStructure: { CT: 10, LT: 10 },
          structure: { CT: 2, LT: 3 },
        }),
      ),
    ).toBe(true);
  });

  it('is false for an intact unit', () => {
    expect(
      isUnitCrippled(
        unit({
          startingInternalStructure: { CT: 10 },
          structure: { CT: 10 },
        }),
      ),
    ).toBe(false);
  });
});

describe('forcedWithdrawalReasonFor — never re-triggers', () => {
  it('returns null for a unit already withdrawing', () => {
    const u: IUnitGameState = {
      id: 'u',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: 0,
      heat: 0,
      movementThisTurn: 'stationary' as IUnitGameState['movementThisTurn'],
      hexesMovedThisTurn: 0,
      armor: {},
      structure: {},
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: 'pending' as IUnitGameState['lockState'],
      isWithdrawing: true,
    };
    expect(
      forcedWithdrawalReasonFor(u, {
        [GameSide.Player]: 'BROKEN',
        [GameSide.Opponent]: 'STEADY',
      }),
    ).toBeNull();
  });

  it('returns null for an ejected unit', () => {
    const u: IUnitGameState = {
      id: 'u',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: 0,
      heat: 0,
      movementThisTurn: 'stationary' as IUnitGameState['movementThisTurn'],
      hexesMovedThisTurn: 0,
      armor: {},
      structure: {},
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: 'pending' as IUnitGameState['lockState'],
      hasEjected: true,
    };
    expect(
      forcedWithdrawalReasonFor(u, {
        [GameSide.Player]: 'BROKEN',
        [GameSide.Opponent]: 'STEADY',
      }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Forced Withdrawal Rule
// ---------------------------------------------------------------------------

describe('Forced Withdrawal Rule — broken morale', () => {
  it('withdraws every non-withdrawing unit of a broken side', () => {
    let session = newSession(true);
    session = breakSideMorale(session, GameSide.Player);
    session = applyForcedWithdrawalCheck(session, nearestEdge);

    expect(session.currentState.units['player-1'].isWithdrawing).toBe(true);
    expect(session.currentState.units['player-2'].isWithdrawing).toBe(true);
    // The non-broken opponent side is untouched.
    expect(session.currentState.units['opponent-1'].isWithdrawing).toBeFalsy();

    const triggers = session.events.filter(
      (e) => e.type === GameEventType.ForcedWithdrawalTriggered,
    );
    expect(triggers).toHaveLength(2);
    expect(
      triggers.every(
        (e) => (e.payload as { reason: string }).reason === 'morale-broken',
      ),
    ).toBe(true);
  });
});

describe('Forced Withdrawal Rule — disabled', () => {
  it('withdraws nothing and emits no events when the rule is off', () => {
    let session = newSession(false);
    session = breakSideMorale(session, GameSide.Player);
    const before = session.events.length;
    session = applyForcedWithdrawalCheck(session, nearestEdge);

    expect(session.events.length).toBe(before);
    expect(session.currentState.units['player-1'].isWithdrawing).toBeFalsy();
  });
});

describe('Forced Withdrawal Rule — never withdrawn twice', () => {
  it('does not re-trigger a unit already withdrawing', () => {
    let session = newSession(true);
    session = breakSideMorale(session, GameSide.Player);
    session = applyForcedWithdrawalCheck(session, nearestEdge);
    const firstCount = session.events.filter(
      (e) => e.type === GameEventType.ForcedWithdrawalTriggered,
    ).length;

    // A second check with the same broken morale finds the units
    // already withdrawing — no duplicate events.
    session = applyForcedWithdrawalCheck(session, nearestEdge);
    const secondCount = session.events.filter(
      (e) => e.type === GameEventType.ForcedWithdrawalTriggered,
    ).length;
    expect(secondCount).toBe(firstCount);
  });
});

// ---------------------------------------------------------------------------
// Player Withdrawal Declaration
// ---------------------------------------------------------------------------

describe('Player Withdrawal Declaration', () => {
  it('flags the unit and emits a player WithdrawalDeclared event', () => {
    let session = newSession();
    session = declarePlayerWithdrawal(session, 'player-1', 'east');

    const unit = session.currentState.units['player-1'];
    expect(unit.isWithdrawing).toBe(true);
    expect(unit.retreatTargetEdge).toBe('east');

    const declared = session.events.find(
      (e) => e.type === GameEventType.WithdrawalDeclared,
    );
    expect(declared).toBeDefined();
    expect((declared!.payload as { edge: string }).edge).toBe('east');
    expect((declared!.payload as { declaredBy: string }).declaredBy).toBe(
      'player',
    );
  });

  it('is sticky — a second declaration is a no-op', () => {
    let session = newSession();
    session = declarePlayerWithdrawal(session, 'player-1', 'east');
    const afterFirst = session.events.length;
    session = declarePlayerWithdrawal(session, 'player-1', 'west');
    expect(session.events.length).toBe(afterFirst);
    // The original edge is preserved.
    expect(session.currentState.units['player-1'].retreatTargetEdge).toBe(
      'east',
    );
  });

  it('does not declare withdrawal for an already ejected unit', () => {
    let session = newSession();
    session = appendEvent(
      session,
      createUnitEjectedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        session.currentState.phase,
        'player-1',
        'player_declared',
      ),
    );
    const afterEject = session.events.length;

    session = declarePlayerWithdrawal(session, 'player-1', 'east');

    expect(session.events.length).toBe(afterEject);
    expect(session.currentState.units['player-1'].isWithdrawing).toBeFalsy();
    expect(
      session.currentState.units['player-1'].retreatTargetEdge,
    ).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Withdrawal Map-Edge Exit
// ---------------------------------------------------------------------------

describe('Withdrawal Map-Edge Exit', () => {
  it('emits UnitRetreated when a withdrawing unit reaches its edge', () => {
    let session = newSession();
    session = declarePlayerWithdrawal(session, 'player-1', 'north');

    // The unit starts at its deploy hex; the edge-exit check should
    // not fire until the unit is on the edge. Force the position to a
    // north-edge hex by replaying with the unit moved (deploy rows put
    // the player at r=5; mapRadius is 5, so the player deploy row IS
    // the north edge — the exit fires immediately).
    session = applyWithdrawalEdgeExits(session);

    const retreated = session.events.find(
      (e) => e.type === GameEventType.UnitRetreated,
    );
    expect(retreated).toBeDefined();
    expect(session.currentState.units['player-1'].hasRetreated).toBe(true);
  });

  it('does not emit UnitRetreated for a non-withdrawing unit', () => {
    let session = newSession();
    session = applyWithdrawalEdgeExits(session);
    expect(
      session.events.some((e) => e.type === GameEventType.UnitRetreated),
    ).toBe(false);
  });

  it('does not emit UnitRetreated for an ejected withdrawing unit', () => {
    let session = newSession();
    session = declarePlayerWithdrawal(session, 'player-1', 'north');
    session = appendEvent(
      session,
      createUnitEjectedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        session.currentState.phase,
        'player-1',
        'player_declared',
      ),
    );

    session = applyWithdrawalEdgeExits(session);

    expect(session.currentState.units['player-1'].hasEjected).toBe(true);
    expect(session.currentState.units['player-1'].hasRetreated).toBeFalsy();
    expect(
      session.events.some(
        (e) =>
          e.type === GameEventType.UnitRetreated &&
          (e.payload as { unitId: string }).unitId === 'player-1',
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Failed Withdrawal Handling
// ---------------------------------------------------------------------------

describe('Failed Withdrawal Handling', () => {
  it('a withdrawing unit destroyed before its edge is a combat loss', () => {
    let session = newSession();
    session = declarePlayerWithdrawal(session, 'player-2', 'south');
    // player-2 deploys at r=5 (north edge); 'south' is the far edge,
    // so it has NOT reached its edge. Destroy it.
    session = appendEvent(
      session,
      createUnitDestroyedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        session.currentState.phase,
        'player-2',
        'damage',
      ),
    );
    // The edge-exit pass must NOT emit UnitRetreated for a destroyed
    // unit — the first-event-wins discriminator (D7).
    session = applyWithdrawalEdgeExits(session);

    const unit = session.currentState.units['player-2'];
    expect(unit.destroyed).toBe(true);
    expect(unit.hasRetreated).toBeFalsy();
    expect(
      session.events.some(
        (e) =>
          e.type === GameEventType.UnitRetreated &&
          (e.payload as { unitId: string }).unitId === 'player-2',
      ),
    ).toBe(false);
  });
});
