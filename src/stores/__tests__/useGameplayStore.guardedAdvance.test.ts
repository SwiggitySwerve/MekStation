/**
 * Wave 4 C3 PR3 — the store's Skip, Next Turn and Advance actions must go
 * through the interactive session's guarded phase advance.
 *
 * Before this change `handleSkipAction` and `handleNextTurnAction` called the
 * raw `advancePhase` on the store's session copy. That flipped the phase with
 * a bare PhaseChanged: declared weapon attacks were never resolved, queued
 * PSRs were never drained, the morale pass and the End-phase game-over guard
 * never ran, and the store's session diverged from the InteractiveSession's.
 * `advanceInteractivePhaseLogic` also treated PhysicalAttack as not
 * advanceable, so the UI's Physical advance was a silent no-op.
 *
 * Rules: MegaMek 48fcb2f64 has no way to leave a phase without resolving it
 * (`TWGameManager.skipCurrentTurn` skips one entity's turn; the phase only
 * ends via `endCurrentPhase` -> `TWPhaseEndManager`, which resolves attacks).
 *
 * Real engine, no mocks: the store handlers are driven against a real
 * `InteractiveSession`.
 */

import type { IAdaptedUnit } from '@/engine/types';
import type { IWeapon } from '@/simulation/ai/types';
import type { IGameSession, IGameplayUIState } from '@/types/gameplay';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameUnit,
} from '@/types/gameplay';
import { defaultD6Roller } from '@/utils/gameplay/diceTypes';
import { createUnitDestroyedEvent } from '@/utils/gameplay/gameEvents';
import { createEventBase } from '@/utils/gameplay/gameEvents/base';
import { declareMovement } from '@/utils/gameplay/gameSession';

import { handleActionLogic } from '../useGameplayStore.actionHandlers';
import {
  advanceInteractivePhaseLogic,
  InteractivePhase,
} from '../useGameplayStore.helpers';

const MAP_RADIUS = 5;
const PLAYER = 'unit-player';
const OPPONENT = 'unit-opponent';

const UI = {
  selectedUnitId: null,
  targetUnitId: null,
  queuedWeaponIds: [],
} as unknown as IGameplayUIState;

function weapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    // Long brackets: the units deploy wherever the engine puts them, and this
    // suite is about the phase advance, not range math.
    shortRange: 20,
    mediumRange: 30,
    longRange: 40,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function adapted(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    // Adjacent hexes: in range for weapons and for physical attacks.
    position:
      side === GameSide.Player
        ? { q: 0, r: MAP_RADIUS }
        : { q: 0, r: MAP_RADIUS - 1 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { center_torso: 31 },
    structure: { center_torso: 21 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [weapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function gameUnits(): IGameUnit[] {
  return [
    {
      id: PLAYER,
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: OPPONENT,
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeSession(): InteractiveSession {
  return new InteractiveSession(
    MAP_RADIUS,
    30,
    new SeededRandom(42),
    createMinimalGrid(MAP_RADIUS),
    [adapted(PLAYER, GameSide.Player)],
    [adapted(OPPONENT, GameSide.Opponent)],
    gameUnits(),
    {},
    defaultD6Roller,
  );
}

interface IStoreSlice {
  session?: IGameSession;
  interactivePhase?: InteractivePhase;
}

/** Drive the real store action handler; `set` merges patches like zustand. */
function dispatch(actionId: string, interactive: InteractiveSession) {
  let state: IStoreSlice = {};
  const set = (arg: unknown): void => {
    const patch =
      typeof arg === 'function'
        ? (arg as (s: IStoreSlice) => IStoreSlice)(state)
        : (arg as IStoreSlice);
    state = { ...state, ...patch };
  };
  handleActionLogic(
    actionId,
    interactive.getSession(),
    UI,
    set as never,
    interactive,
  );
  return state;
}

function eventsOf(session: IGameSession, type: GameEventType) {
  return session.events.filter((event) => event.type === type);
}

function toWeaponAttackWithAllLockedAndDeclared(
  session: InteractiveSession,
): void {
  session.advancePhase(); // Initiative -> Movement
  session.advancePhase(); // Movement -> WeaponAttack
  // Activation order depends on initiative, so offer each declaration twice;
  // one that is not that unit's turn yet is ignored by the engine.
  for (let round = 0; round < 2; round++) {
    session.applyAttack(PLAYER, OPPONENT, [`${PLAYER}-medium-laser`]);
    session.applyAttack(OPPONENT, PLAYER, [`${OPPONENT}-medium-laser`]);
  }
}

/** Both mechs moved next to each other, so a punch is in reach. */
function makeAdjacentSessionInPhysicalAttack(): InteractiveSession {
  const base = makeSession();
  base.advancePhase(); // Initiative -> Movement
  let replayable = base.getSession();
  const destinations = [
    [PLAYER, { q: -2, r: 0 }],
    [OPPONENT, { q: -2, r: -1 }],
  ] as const;
  for (const [unitId, destination] of destinations) {
    const unit = replayable.currentState.units[unitId];
    replayable = declareMovement(
      replayable,
      unitId,
      unit.position,
      destination,
      unit.facing,
      MovementType.Run,
      unitId === PLAYER ? 5 : 4,
      2,
      [unit.position, destination],
    );
  }
  const session = InteractiveSession.fromSession(replayable, defaultD6Roller);
  session.advancePhase(); // Movement -> WeaponAttack
  session.advancePhase(); // WeaponAttack -> PhysicalAttack
  return session;
}

/** Seed 20 damage so the weapon-phase close queues a damage PSR. */
function seedPhaseDamage(session: InteractiveSession): void {
  const before = session.getSession();
  session.appendEvent({
    ...createEventBase(
      before.id,
      before.events.length,
      GameEventType.DamageApplied,
      before.currentState.turn,
      before.currentState.phase,
      PLAYER,
    ),
    payload: {
      unitId: PLAYER,
      location: 'center_torso',
      damage: 20,
      armorRemaining: 10,
      structureRemaining: 10,
      locationDestroyed: false,
    },
  });
}

function toEndPhaseWithQueuedPsr(session: InteractiveSession): void {
  session.advancePhase(); // Initiative -> Movement
  session.advancePhase(); // Movement -> WeaponAttack
  seedPhaseDamage(session);
  session.advancePhase(); // WeaponAttack -> PhysicalAttack (queues the PSR)
  session.advancePhase(); // PhysicalAttack -> Heat
  session.advancePhase(); // Heat -> End
}

describe('store Skip and Next Turn use the guarded phase advance (B1)', () => {
  it('Skip with every unit locked in WeaponAttack resolves the declared attacks before the phase flips', () => {
    const interactive = makeSession();
    toWeaponAttackWithAllLockedAndDeclared(interactive);

    const declared = eventsOf(
      interactive.getSession(),
      GameEventType.AttackDeclared,
    );
    expect(declared.length).toBeGreaterThan(0);
    expect(interactive.getState().phase).toBe(GamePhase.WeaponAttack);
    expect(
      eventsOf(interactive.getSession(), GameEventType.AttackResolved),
    ).toHaveLength(0);

    const after = dispatch('skip', interactive);

    expect(after.session?.currentState.phase).toBe(GamePhase.PhysicalAttack);
    expect(
      eventsOf(after.session as IGameSession, GameEventType.AttackResolved)
        .length,
    ).toBe(declared.length);
    // The store and the interactive session stay one and the same session.
    expect(after.session).toBe(interactive.getSession());
    expect(after.interactivePhase).toBe(InteractivePhase.SelectUnit);
  });

  it('Skip in End drains the queued PSR through the interactive session', () => {
    const interactive = makeSession();
    toEndPhaseWithQueuedPsr(interactive);
    expect(interactive.getState().phase).toBe(GamePhase.End);
    expect(interactive.getState().units[PLAYER].pendingPSRs?.length).toBe(1);

    const after = dispatch('skip', interactive);

    expect(
      eventsOf(after.session as IGameSession, GameEventType.PSRResolved).length,
    ).toBeGreaterThanOrEqual(1);
    expect(after.session?.currentState.phase).toBe(GamePhase.Initiative);
    expect(after.session).toBe(interactive.getSession());
  });

  it('Skip in End does not advance past a finished game, and finalizes it', () => {
    const interactive = makeSession();
    toEndPhaseWithQueuedPsr(interactive);
    const before = interactive.getSession();
    interactive.appendEvent(
      createUnitDestroyedEvent(
        before.id,
        before.events.length,
        before.currentState.turn,
        GamePhase.End,
        OPPONENT,
        'damage',
      ),
    );
    expect(interactive.isGameOver()).toBe(true);

    const after = dispatch('skip', interactive);

    expect(after.session?.currentState.phase).not.toBe(GamePhase.Initiative);
    expect(after.session?.currentState.status).toBe(GameStatus.Completed);
    expect(after.interactivePhase).toBe(InteractivePhase.GameOver);
    expect(
      eventsOf(after.session as IGameSession, GameEventType.GameEnded),
    ).toHaveLength(1);
  });

  it('Next Turn in End drains the PSR, then rolls initiative into Movement', () => {
    const interactive = makeSession();
    toEndPhaseWithQueuedPsr(interactive);

    const after = dispatch('next-turn', interactive);

    expect(
      eventsOf(after.session as IGameSession, GameEventType.PSRResolved).length,
    ).toBeGreaterThanOrEqual(1);
    expect(after.session?.currentState.phase).toBe(GamePhase.Movement);
    expect(after.session).toBe(interactive.getSession());
  });

  it('keeps the raw advance only where there is no interactive session', () => {
    // Heat is not lock-gated, so Skip is allowed. With no interactive session
    // (the store-only demo/test path) the store advances its own session.
    const source = makeSession();
    for (let i = 0; i < 4; i++) source.advancePhase(); // -> Heat
    expect(source.getState().phase).toBe(GamePhase.Heat);
    let state: IStoreSlice = {};
    const set = (arg: unknown): void => {
      state = { ...state, ...(arg as IStoreSlice) };
    };

    handleActionLogic('skip', source.getSession(), UI, set as never, null);

    expect(state.session?.currentState.phase).toBe(GamePhase.End);
  });
});

describe('store Advance in PhysicalAttack runs the guarded advance (B3)', () => {
  it('resolves the declared physical attack and flips the phase', () => {
    const interactive = makeAdjacentSessionInPhysicalAttack();
    expect(interactive.getState().phase).toBe(GamePhase.PhysicalAttack);
    if (interactive.getState().firstMover === GameSide.Opponent) {
      interactive.completePhysicalAttack(OPPONENT);
    }
    interactive.applyPhysicalAttack(PLAYER, OPPONENT, 'punch');
    expect(
      eventsOf(interactive.getSession(), GameEventType.PhysicalAttackDeclared),
    ).toHaveLength(1);
    expect(
      eventsOf(interactive.getSession(), GameEventType.PhysicalAttackResolved),
    ).toHaveLength(0);

    let state: IStoreSlice = {};
    const set = (arg: unknown): void => {
      state = { ...state, ...(arg as IStoreSlice) };
    };
    const get = () =>
      ({
        session: interactive.getSession(),
        ui: UI,
        interactivePhase: InteractivePhase.SelectUnit,
      }) as never;

    advanceInteractivePhaseLogic(interactive, get, set as never);

    expect(interactive.getState().phase).toBe(GamePhase.Heat);
    expect(
      eventsOf(interactive.getSession(), GameEventType.PhysicalAttackResolved)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(state.session).toBe(interactive.getSession());
  });
});
