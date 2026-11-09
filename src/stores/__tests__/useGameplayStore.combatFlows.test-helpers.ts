/**
 * Tests for the `add-combat-phase-ui-flows` additions to
 * `useGameplayStore`: `plannedMovement` and `attackPlan` state plus the
 * setter / commit actions.
 *
 * Covers:
 *  - setPlannedMovement / clearPlannedMovement update state
 *  - commitPlannedMovement calls applyMovement on the interactive
 *    session and clears the plan
 *  - togglePlannedWeapon adds + removes ids from selectedWeapons
 *  - setAttackTarget syncs attackPlan + ui.targetUnitId
 *  - clearAttackPlan resets both fields
 *  - commitAttack calls applyAttack on the session and clears the plan
 *
 * @spec openspec/changes/add-combat-phase-ui-flows/tasks.md
 */

import type { InteractiveSession } from '@/engine/GameEngine';
import type {
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

jest.mock('@/components/shared/Toast', () => ({
  toast: jest.fn(),
}));

import { toast } from '@/components/shared/Toast';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import { InteractivePhase } from '@/stores/useGameplayStore.helpers';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameSession,
  type IINarcPodState,
  type IPhysicalAttackDeclaredPayload,
} from '@/types/gameplay';
import {
  declarePhysicalAttack,
  type IPhysicalAttackContext,
} from '@/utils/gameplay/gameSession';

interface FakeSessionCalls {
  movement: Array<{
    unitId: string;
    to: { q: number; r: number };
    facing: Facing;
    type: MovementType;
    path?: readonly { q: number; r: number }[];
  }>;
  attacks: Array<{
    attackerId: string;
    targetId: string;
    weaponIds: readonly string[];
  }>;
}

/**
 * Build a minimal fake `InteractiveSession` that records the calls
 * made to `applyMovement` / `applyAttack` and returns a stable
 * snapshot from `getSession()` so the store's `set({ session: ... })`
 * has something to land on.
 */
function buildFakeSession(phase: GamePhase = GamePhase.Movement): {
  session: InteractiveSession;
  calls: FakeSessionCalls;
} {
  const calls: FakeSessionCalls = { movement: [], attacks: [] };

  let sessionSnapshot: IGameSession = {
    id: 'fake-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [],
    events: [],
    currentState: {
      gameId: 'fake-session',
      status: GameStatus.Active,
      turn: 1,
      phase,
      activationIndex: 0,
      units: {},
      turnEvents: [],
    },
  };

  const fake = {
    applyMovement: (
      unitId: string,
      to: { q: number; r: number },
      facing: Facing,
      type: MovementType,
      path?: readonly { q: number; r: number }[],
    ) => {
      calls.movement.push({
        unitId,
        to,
        facing,
        type,
        ...(path !== undefined ? { path } : {}),
      });
      sessionSnapshot = {
        ...sessionSnapshot,
        events: [
          ...sessionSnapshot.events,
          {
            id: `movement-event-${sessionSnapshot.events.length}`,
            gameId: sessionSnapshot.id,
            sequence: sessionSnapshot.events.length,
            timestamp: '2026-04-29T00:00:00.000Z',
            type: GameEventType.MovementDeclared,
            turn: 1,
            phase: GamePhase.Movement,
            actorId: unitId,
            payload: {
              unitId,
              from: { q: 0, r: 0 },
              to,
              facing,
              movementType: type,
              path,
              mpUsed: path?.length ?? 0,
              heatGenerated: 0,
            },
          },
        ],
      };
    },
    applyAttack: (
      attackerId: string,
      targetId: string,
      weaponIds: readonly string[],
    ) => {
      calls.attacks.push({ attackerId, targetId, weaponIds });
    },
    getSession: () => sessionSnapshot,
    getState: () => sessionSnapshot.currentState,
    isGameOver: () => false,
    getResult: () => null,
    advancePhase: () => undefined,
    runAITurn: () => undefined,
    getAvailableActions: () => ({ validMoves: [], validTargets: [] }),
    concede: () => undefined,
  };

  return {
    session: fake as unknown as InteractiveSession,
    calls,
  };
}

describe('C15 composer context lifecycle', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useAnimationQueue.getState().reset();
  });

  afterEach(() => useGameplayStore.getState().reset());

  function prepareDraft(phase = GamePhase.WeaponAttack) {
    const { session } = buildFakeSession(phase);
    session.applyMovement(
      'attacker',
      { q: 0, r: 0 },
      Facing.North,
      MovementType.Stationary,
    );
    const unit =
      buildMovementAnimationSession().session.getState().units['unit-a'];
    const snapshot = {
      ...session.getSession(),
      currentState: {
        ...session.getState(),
        units: {
          attacker: { ...unit, id: 'attacker' },
          other: { ...unit, id: 'other' },
          'enemy-new': { ...unit, id: 'enemy-new', side: GameSide.Opponent },
        },
      },
    };
    session.getSession = () => snapshot;
    session.getState = () => snapshot.currentState;
    useGameplayStore.getState().setInteractiveSession(session);
    useGameplayStore.getState().selectUnit('attacker');
    useGameplayStore.getState().focusAttackTarget('enemy-1');
    useGameplayStore.getState().toggleWeaponAssignment('laser');
    useGameplayStore.getState().setComposedTwist(Facing.South);
    useGameplayStore.getState().setAttackTarget('enemy-1');
    useGameplayStore.getState().togglePlannedWeapon('laser');
    useGameplayStore.getState().toggleWeapon('laser');
    useGameplayStore.getState().addPostureAction('GO_PRONE', 1);
    useGameplayStore.getState().lockIn(MovementType.Walk);
    useGameplayStore.getState().setPlannedMovement({
      destination: { q: 1, r: 0 },
      facing: Facing.South,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });
    useGameplayStore.setState({
      validMovementHexes: [{ q: 1, r: 0 }],
      validTargetIds: ['enemy-1'],
      hitChance: 80,
      attackPlan: {
        ...useGameplayStore.getState().attackPlan,
        weaponModeError: 'old',
      },
    });
    return session;
  }

  function expectEmptyDraft() {
    expect(useGameplayStore.getState()).toMatchObject({
      movementIntent: { items: [], lockedMode: null },
      plannedMovement: null,
      attackIntent: {
        focusedTargetId: null,
        assignments: [],
        composedTwist: null,
      },
      attackPlan: {
        targetUnitId: null,
        selectedWeapons: [],
        weaponModeError: null,
      },
      hitChance: null,
      ui: { targetUnitId: null, queuedWeaponIds: [] },
    });
  }

  it.each(['other', null])(
    'clears drafts when selection changes to %s',
    (unitId) => {
      prepareDraft();
      useGameplayStore.getState().selectUnit(unitId);
      expectEmptyDraft();
      expect(useGameplayStore.getState().ui.selectedUnitId).toBe(unitId);
    },
  );

  it('clears drafts through movement selection and preserves the new movement overlay', () => {
    const session = prepareDraft(GamePhase.Movement);
    const newMoves = [{ q: 3, r: 0 }];
    session.getAvailableActions = jest
      .fn()
      .mockReturnValue({ validMoves: newMoves });
    useGameplayStore.getState().selectUnitForMovement('other');
    expectEmptyDraft();
    expect(useGameplayStore.getState().validMovementHexes).toEqual(newMoves);
    expect(useGameplayStore.getState().interactivePhase).toBe(
      InteractivePhase.SelectMovement,
    );
  });

  it('clears drafts through attacker token selection and preserves new target overlays', () => {
    prepareDraft();
    useGameplayStore.setState({
      interactivePhase: InteractivePhase.SelectUnit,
    });
    useGameplayStore.getState().handleInteractiveTokenClick('other');
    expectEmptyDraft();
    expect(useGameplayStore.getState().ui.selectedUnitId).toBe('other');
    expect(useGameplayStore.getState().interactivePhase).toBe(
      InteractivePhase.SelectTarget,
    );
    expect(useGameplayStore.getState().validTargetIds).toEqual(['enemy-new']);
  });

  it.each([
    GamePhase.Movement,
    GamePhase.WeaponAttack,
    GamePhase.PhysicalAttack,
    GamePhase.Heat,
  ])('clears both composers when setSession changes phase to %s', (phase) => {
    const session = prepareDraft(
      phase === GamePhase.WeaponAttack
        ? GamePhase.Movement
        : GamePhase.WeaponAttack,
    );
    const snapshot = session.getSession();
    useGameplayStore.getState().setSession({
      ...snapshot,
      currentState: { ...snapshot.currentState, phase },
    });
    expectEmptyDraft();
    expect(useGameplayStore.getState().validMovementHexes).toEqual([]);
    expect(useGameplayStore.getState().validTargetIds).toEqual([]);
  });

  it.each(['advanceInteractivePhase', 'skipPhase', 'runAITurn'] as const)(
    'clears drafts after %s publishes a new phase',
    (action) => {
      const session = prepareDraft(GamePhase.Movement);
      let snapshot = session.getSession();
      session.getSession = () => snapshot;
      session.getState = () => snapshot.currentState;
      session.advancePhase = () => {
        snapshot = {
          ...snapshot,
          currentState: {
            ...snapshot.currentState,
            phase: GamePhase.PhysicalAttack,
          },
        };
      };
      useGameplayStore.getState()[action]();
      expectEmptyDraft();
    },
  );

  it('clears drafts on a different session with the same phase and selected unit', () => {
    const session = prepareDraft();
    useGameplayStore
      .getState()
      .setSession({ ...session.getSession(), id: 'replacement' });
    expectEmptyDraft();
  });

  it('preserves drafts on same-unit reselection and same-phase session refresh', () => {
    const session = prepareDraft();
    const before = useGameplayStore.getState();
    useGameplayStore.getState().selectUnit('attacker');
    useGameplayStore
      .getState()
      .setSession({ ...session.getSession(), updatedAt: 'refreshed' });
    const after = useGameplayStore.getState();
    expect(after.attackIntent).toBe(before.attackIntent);
    expect(after.attackPlan).toBe(before.attackPlan);
    expect(after.movementIntent).toBe(before.movementIntent);
    expect(after.plannedMovement).toBe(before.plannedMovement);
  });

  it('local cancel clears drafts and overlays without touching session, history or selection', () => {
    prepareDraft(GamePhase.Movement);
    const before = useGameplayStore.getState();
    const events = [...before.session!.events];
    expect(events.length).toBeGreaterThan(0);
    useGameplayStore.getState().handleAction('cancel');
    expectEmptyDraft();
    expect(useGameplayStore.getState().session).toBe(before.session);
    expect(useGameplayStore.getState().session!.events).toEqual(events);
    expect(useGameplayStore.getState().ui.selectedUnitId).toBe('attacker');
    expect(useGameplayStore.getState().validMovementHexes).toEqual([]);
    expect(useGameplayStore.getState().validTargetIds).toEqual([]);
  });
});

describe('tactical turn cleanup', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useAnimationQueue.getState().reset();
  });

  afterEach(() => {
    useAnimationQueue.getState().reset();
    useGameplayStore.getState().reset();
  });

  const attackActions = [
    'commitAttack',
    'commitComposedVolley',
    'fireWeapons',
    'holdFire',
  ] as const;

  function prepareAttack(phase = GamePhase.WeaponAttack, gameOver = false) {
    const { session } = buildFakeSession(phase);
    session.applyAttack = jest.fn();
    session.applyVolley = jest.fn();
    session.torsoTwist = jest.fn();
    session.isGameOver = () => gameOver;
    // Adopt the context before composing, as production callers do.
    useGameplayStore.getState().setSession(session.getSession());
    useGameplayStore.getState().selectUnit('attacker');
    useGameplayStore.setState({
      session: session.getSession(),
      interactiveSession: session,
      interactivePhase: InteractivePhase.SelectWeapons,
      attackPlan: {
        targetUnitId: 'enemy-1',
        selectedWeapons: ['laser'],
        weaponModeError: 'stale error',
      },
      attackIntent: {
        focusedTargetId: 'enemy-1',
        assignments: [{ targetId: 'enemy-1', weaponId: 'laser' }],
        composedTwist: Facing.South,
      },
      validTargetIds: ['enemy-1'],
      hitChance: 80,
      ui: {
        ...useGameplayStore.getState().ui,
        selectedUnitId: 'attacker',
        targetUnitId: 'enemy-1',
        queuedWeaponIds: ['laser'],
        errorMessage: 'unrelated message',
      },
    });
    return session;
  }

  it.each(attackActions)(
    '%s preserves its declaration and clears selection on success',
    (action) => {
      const session = prepareAttack();

      useGameplayStore.getState()[action]();

      if (action === 'commitAttack') {
        expect(session.applyAttack).toHaveBeenCalledWith(
          'attacker',
          'enemy-1',
          ['laser'],
          {},
        );
      } else if (action === 'fireWeapons') {
        expect(session.applyAttack).toHaveBeenCalledWith(
          'attacker',
          'enemy-1',
          ['laser'],
        );
      } else {
        expect(session.applyVolley).toHaveBeenCalledWith(
          'attacker',
          action === 'holdFire'
            ? []
            : [
                {
                  targetId: 'enemy-1',
                  weaponIds: ['laser'],
                  modesByWeaponId: {},
                },
              ],
        );
        expect(session.torsoTwist).toHaveBeenCalledTimes(
          action === 'holdFire' ? 0 : 1,
        );
      }
      expect(useGameplayStore.getState()).toMatchObject({
        session: session.getSession(),
        interactivePhase: InteractivePhase.SelectUnit,
        ui: {
          selectedUnitId: null,
          targetUnitId: null,
          queuedWeaponIds: [],
          errorMessage: 'unrelated message',
        },
      });
    },
  );

  it.each(attackActions)(
    '%s clears both attack plans and targeting previews',
    (action) => {
      prepareAttack();

      useGameplayStore.getState()[action]();

      expect(useGameplayStore.getState()).toMatchObject({
        attackPlan: {
          targetUnitId: null,
          selectedWeapons: [],
          weaponModeError: null,
        },
        attackIntent: {
          focusedTargetId: null,
          assignments: [],
          composedTwist: null,
        },
        validTargetIds: [],
        hitChance: null,
      });
    },
  );

  it.each(attackActions)('%s adopts a terminal session', (action) => {
    prepareAttack(GamePhase.WeaponAttack, true);
    useGameplayStore.getState()[action]();
    expect(useGameplayStore.getState().interactivePhase).toBe(
      InteractivePhase.GameOver,
    );
  });

  it.each(attackActions)(
    '%s preserves the draft outside the attack phase',
    (action) => {
      const session = prepareAttack(GamePhase.Movement);
      const before = useGameplayStore.getState();
      useGameplayStore.getState()[action]();
      expect(useGameplayStore.getState()).toBe(before);
      expect(session.applyAttack).not.toHaveBeenCalled();
      expect(session.applyVolley).not.toHaveBeenCalled();
    },
  );

  it.each(attackActions)(
    '%s does not declare when no attacker is selected',
    (action) => {
      const session = prepareAttack();
      useGameplayStore.setState((state) => ({
        ui: { ...state.ui, selectedUnitId: null },
      }));
      const before = useGameplayStore.getState();

      useGameplayStore.getState()[action]();

      expect(useGameplayStore.getState()).toBe(before);
      expect(session.applyAttack).not.toHaveBeenCalled();
      expect(session.applyVolley).not.toHaveBeenCalled();
    },
  );

  it.each(attackActions)(
    '%s preserves the draft when declaration throws',
    (action) => {
      const session = prepareAttack();
      const failure = new Error('declaration failed');
      const fail = () => {
        throw failure;
      };
      session.applyAttack = fail;
      session.applyVolley = fail;
      const before = useGameplayStore.getState();
      expect(() => useGameplayStore.getState()[action]()).toThrow(failure);
      expect(useGameplayStore.getState()).toBe(before);
    },
  );

  it.each(['advanceInteractivePhase', 'skipPhase'] as const)(
    '%s can wait again after the previous queue was reset',
    (action) => {
      const { session, calls } = buildMovementAnimationSession();
      useGameplayStore.setState({
        session: session.getSession(),
        interactiveSession: session,
      });
      useAnimationQueue.getState().enqueue({ id: 'old', mapId: 'old-map' });
      useGameplayStore.getState()[action]();
      useGameplayStore.getState()[action]();
      expect(calls.advancePhase).toBe(0);

      useAnimationQueue.getState().reset();
      expect(calls.advancePhase).toBe(0);
      useAnimationQueue.getState().complete('old');
      expect(calls.advancePhase).toBe(0);

      useAnimationQueue.getState().enqueue({ id: 'new', mapId: 'new-map' });
      useGameplayStore.getState()[action]();
      useGameplayStore.getState()[action]();
      expect(calls.advancePhase).toBe(0);
      useAnimationQueue.getState().complete('new');
      expect(calls.advancePhase).toBe(1);
      useAnimationQueue.getState().reset();
      expect(calls.advancePhase).toBe(1);
    },
  );
});

describe('useGameplayStore — combat-phase planning actions', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useAnimationQueue.getState().reset();
    (toast as jest.MockedFunction<typeof toast>).mockClear();
  });

  afterEach(() => {
    useAnimationQueue.getState().reset();
  });

  describe('plannedMovement', () => {
    it('starts as null', () => {
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
    });

    it('setPlannedMovement stores the plan verbatim', () => {
      const plan = {
        destination: { q: 1, r: 2 },
        facing: Facing.Northeast,
        movementType: MovementType.Walk,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 1 },
          { q: 1, r: 2 },
        ],
      };
      useGameplayStore.getState().setPlannedMovement(plan);
      expect(useGameplayStore.getState().plannedMovement).toEqual(plan);
    });

    it('clearPlannedMovement resets to null', () => {
      useGameplayStore.getState().setPlannedMovement({
        destination: { q: 1, r: 1 },
        facing: Facing.North,
        movementType: MovementType.Run,
        path: [],
      });
      useGameplayStore.getState().clearPlannedMovement();
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
    });

    it('commitPlannedMovement is a no-op without session/plan/selectedUnit', () => {
      const fake = buildFakeSession();
      // No session set — should not throw, no calls made.
      useGameplayStore.getState().commitPlannedMovement();
      expect(fake.calls.movement).toHaveLength(0);
    });

    it('commitPlannedMovement calls applyMovement and clears the plan', () => {
      const fake = buildFakeSession();
      useGameplayStore.getState().selectUnit('unit-a');
      useGameplayStore.setState({
        interactiveSession: fake.session,
        plannedMovement: {
          destination: { q: 3, r: -1 },
          facing: Facing.Southeast,
          movementType: MovementType.Run,
          path: [
            { q: 0, r: 0 },
            { q: 3, r: -1 },
          ],
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });
      useGameplayStore.getState().commitPlannedMovement();

      expect(fake.calls.movement).toHaveLength(1);
      expect(fake.calls.movement[0]).toEqual({
        unitId: 'unit-a',
        to: { q: 3, r: -1 },
        facing: Facing.Southeast,
        type: MovementType.Run,
        path: [
          { q: 0, r: 0 },
          { q: 3, r: -1 },
        ],
      });
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
      expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    });

    it('rejects movement commits outside Movement without mutating the store', () => {
      const fake = buildFakeSession(GamePhase.Initiative);
      const originalSession = fake.session.getSession();
      useGameplayStore.getState().setSession(originalSession);
      useGameplayStore.getState().selectUnit('unit-a');
      const originalPlan = {
        destination: { q: 3, r: -1 },
        facing: Facing.Southeast,
        movementType: MovementType.Run,
        path: [
          { q: 0, r: 0 },
          { q: 3, r: -1 },
        ],
      };
      useGameplayStore.setState({
        session: originalSession,
        interactiveSession: fake.session,
        plannedMovement: originalPlan,
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      expect(() =>
        useGameplayStore.getState().commitPlannedMovement(),
      ).not.toThrow();

      expect(fake.calls.movement).toHaveLength(0);
      expect(useGameplayStore.getState().session).toBe(originalSession);
      expect(useGameplayStore.getState().plannedMovement).toEqual(originalPlan);
      expect(useGameplayStore.getState().ui.selectedUnitId).toBe('unit-a');
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'Movement is unavailable during Initiative',
          ),
          variant: 'info',
        }),
      );
    });

    it('commitPlannedMovement enqueues a 4-hex walk animation that holds phase advancement', () => {
      const { session, calls } = buildMovementAnimationSession();
      useGameplayStore.getState().selectUnit('unit-a');
      useGameplayStore.setState({
        interactiveSession: session,
        plannedMovement: {
          destination: { q: 4, r: 0 },
          facing: Facing.South,
          movementType: MovementType.Walk,
          path: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 2, r: 0 },
            { q: 3, r: 0 },
            { q: 4, r: 0 },
          ],
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().commitPlannedMovement();

      expect(useAnimationQueue.getState().active).toHaveLength(1);
      expect(useAnimationQueue.getState().active[0]).toMatchObject({
        mapId: 'movement-session',
        unitId: 'unit-a',
        kind: 'movement',
        mode: MovementType.Walk,
        eventSequence: 0,
        initialFacing: Facing.North,
        finalFacing: Facing.South,
      });
      expect(useAnimationQueue.getState().active[0].path).toHaveLength(5);

      useGameplayStore.getState().advanceInteractivePhase();

      expect(calls.advancePhase).toBe(0);

      useAnimationQueue
        .getState()
        .complete(useAnimationQueue.getState().active[0].id);

      expect(calls.advancePhase).toBe(1);
    });
  });

  describe('attackPlan', () => {
    it('starts with null target and empty weapons', () => {
      expect(useGameplayStore.getState().attackPlan).toEqual({
        targetUnitId: null,
        selectedWeapons: [],
        weaponModeError: null,
      });
    });

    it('setAttackTarget sets both attackPlan.targetUnitId and ui.targetUnitId', () => {
      useGameplayStore.getState().setAttackTarget('enemy-1');
      expect(useGameplayStore.getState().attackPlan.targetUnitId).toBe(
        'enemy-1',
      );
      expect(useGameplayStore.getState().ui.targetUnitId).toBe('enemy-1');
    });

    it('togglePlannedWeapon adds an id, then removes it on second toggle', () => {
      useGameplayStore.getState().togglePlannedWeapon('med-laser');
      expect(useGameplayStore.getState().attackPlan.selectedWeapons).toEqual([
        'med-laser',
      ]);
      useGameplayStore.getState().togglePlannedWeapon('ac20');
      expect(useGameplayStore.getState().attackPlan.selectedWeapons).toEqual([
        'med-laser',
        'ac20',
      ]);
      useGameplayStore.getState().togglePlannedWeapon('med-laser');
      expect(useGameplayStore.getState().attackPlan.selectedWeapons).toEqual([
        'ac20',
      ]);
    });

    it('clearAttackPlan resets target and weapons', () => {
      useGameplayStore.getState().setAttackTarget('enemy-1');
      useGameplayStore.getState().togglePlannedWeapon('med-laser');
      useGameplayStore.getState().clearAttackPlan();
      expect(useGameplayStore.getState().attackPlan).toEqual({
        targetUnitId: null,
        selectedWeapons: [],
        weaponModeError: null,
      });
      expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    });

    it('commitAttack is a no-op without session/target/weapons', () => {
      const fake = buildFakeSession();
      useGameplayStore.setState({
        interactiveSession: fake.session,
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'attacker',
        },
      });
      useGameplayStore.getState().commitAttack();
      expect(fake.calls.attacks).toHaveLength(0);
    });

    it('commitAttack calls applyAttack with attacker/target/weapons and clears the plan', () => {
      const fake = buildFakeSession(GamePhase.WeaponAttack);
      useGameplayStore.getState().selectUnit('attacker');
      useGameplayStore.setState({
        interactiveSession: fake.session,
        attackPlan: {
          targetUnitId: 'enemy-1',
          selectedWeapons: ['med-laser', 'ac20'],
          weaponModeError: null,
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'attacker',
        },
      });
      useGameplayStore.getState().commitAttack();

      expect(fake.calls.attacks).toHaveLength(1);
      expect(fake.calls.attacks[0]).toEqual({
        attackerId: 'attacker',
        targetId: 'enemy-1',
        weaponIds: ['med-laser', 'ac20'],
      });
      expect(useGameplayStore.getState().attackPlan).toEqual({
        targetUnitId: null,
        selectedWeapons: [],
        weaponModeError: null,
      });
    });
  });
});

function buildMovementAnimationSession(): {
  session: InteractiveSession;
  calls: { advancePhase: number };
} {
  const calls = { advancePhase: 0 };
  let sessionSnapshot: IGameSession = {
    id: 'movement-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [
      {
        id: 'unit-a',
        name: 'Unit A',
        side: GameSide.Player,
        unitRef: 'unit-a',
        pilotRef: 'pilot-a',
        gunnery: 4,
        piloting: 5,
      },
    ],
    events: [],
    currentState: {
      gameId: 'movement-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'unit-a': {
          id: 'unit-a',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: Facing.North,
          heat: 0,
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: LockState.Planning,
        },
      },
      turnEvents: [],
    },
  };

  const fake = {
    applyMovement: (
      unitId: string,
      to: { q: number; r: number },
      facing: Facing,
      movementType: MovementType,
      path?: readonly { q: number; r: number }[],
    ) => {
      const event = {
        id: 'movement-event-1',
        gameId: sessionSnapshot.id,
        sequence: sessionSnapshot.events.length,
        timestamp: '2026-04-29T00:00:00.000Z',
        type: GameEventType.MovementDeclared,
        turn: 1,
        phase: GamePhase.Movement,
        actorId: unitId,
        payload: {
          unitId,
          from: { q: 0, r: 0 },
          to,
          facing,
          movementType,
          ...(movementType !== MovementType.Stationary
            ? { mode: movementType }
            : {}),
          path,
          mpUsed: 4,
          heatGenerated: 0,
        },
      };
      sessionSnapshot = {
        ...sessionSnapshot,
        events: [...sessionSnapshot.events, event],
        currentState: {
          ...sessionSnapshot.currentState,
          units: {
            ...sessionSnapshot.currentState.units,
            [unitId]: {
              ...sessionSnapshot.currentState.units[unitId],
              position: to,
              facing,
              movementThisTurn: movementType,
              hexesMovedThisTurn: (path?.length ?? 1) - 1,
              lockState: LockState.Locked,
            },
          },
        },
      };
    },
    getSession: () => sessionSnapshot,
    getState: () => sessionSnapshot.currentState,
    isGameOver: () => false,
    advancePhase: () => {
      calls.advancePhase += 1;
    },
  };

  return {
    session: fake as unknown as InteractiveSession,
    calls,
  };
}

// ---------------------------------------------------------------------------
// usePhysicalAttackPlanStore — per add-physical-attack-phase-ui
// ---------------------------------------------------------------------------

/**
 * Build a minimal `IGameSession` snapshot the fake `InteractiveSession`
 * returns from `getSession()`. The standalone
 * `gameSessionPhysical.declarePhysicalAttack` only needs to read
 * `currentState.units[attackerId]` (heat / prone / componentDamage)
 * and the events list — everything else is filler typed via
 * `unknown` to avoid duplicating every field of `IUnitGameState`.
 */
function buildPhysicalSession(
  overrides: {
    readonly attackerAbilities?: readonly string[];
    readonly defenderINarcPods?: readonly IINarcPodState[];
  } = {},
): IGameSession {
  return {
    id: 'fake-physical-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [],
    events: [],
    currentState: {
      gameId: 'fake-physical-session',
      status: 'active',
      turn: 1,
      phase: GamePhase.PhysicalAttack,
      activationIndex: 0,
      units: {
        'phys-attacker': {
          id: 'phys-attacker',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: 0,
          heat: 0,
          movementThisTurn: 'walk',
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: 'unlocked',
          ...(overrides.attackerAbilities !== undefined
            ? { abilities: overrides.attackerAbilities }
            : {}),
        },
        'phys-defender': {
          id: 'phys-defender',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
          facing: 0,
          heat: 0,
          movementThisTurn: 'walk',
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: 'unlocked',
          ...(overrides.defenderINarcPods !== undefined
            ? { iNarcPods: overrides.defenderINarcPods }
            : {}),
        },
      },
      turnEvents: [],
    },
  } as unknown as IGameSession;
}

function buildPhysicalFakeSession(
  sessionOverride?: IGameSession,
): InteractiveSession {
  let snapshot = sessionOverride ?? buildPhysicalSession();
  return {
    getSession: () => snapshot,
    getState: () => snapshot.currentState,
    isGameOver: () => false,
    getResult: () => null,
    advancePhase: () => undefined,
    runAITurn: () => undefined,
    getAvailableActions: () => ({ validMoves: [], validTargets: [] }),
    concede: () => undefined,
    applyMovement: () => undefined,
    applyAttack: () => undefined,
    applyPhysicalAttack: (
      attackerId: string,
      targetId: string,
      attackType: PhysicalAttackType,
      limb?: PhysicalAttackLimb,
      options?: Partial<IPhysicalAttackContext>,
    ) => {
      const attackerState = snapshot.currentState.units[attackerId] ?? null;
      snapshot = declarePhysicalAttack(
        snapshot,
        attackerId,
        targetId,
        attackType,
        {
          attackerTonnage: 50,
          targetTonnage: 50,
          pilotingSkill: 4,
          hexesMoved: attackerState?.hexesMovedThisTurn ?? 0,
          ...options,
          limb,
        },
      );
    },
    __setSession: (s: IGameSession) => {
      snapshot = s;
    },
  } as unknown as InteractiveSession;
}

describe('usePhysicalAttackPlanStore', () => {
  beforeEach(() => {
    usePhysicalAttackPlanStore.getState().clearPhysicalAttackPlan();
  });

  it('starts with an empty plan', () => {
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
      limb: null,
      twoHandedZweihander: false,
    });
  });

  it('setPhysicalAttackTarget sets the target id', () => {
    usePhysicalAttackPlanStore
      .getState()
      .setPhysicalAttackTarget('phys-defender');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan.targetUnitId,
    ).toBe('phys-defender');
  });

  it('setPhysicalAttackType sets the attack type and selected limb', () => {
    usePhysicalAttackPlanStore
      .getState()
      .setPhysicalAttackType('punch', 'leftArm');
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: 'punch',
      limb: 'leftArm',
      twoHandedZweihander: false,
    });
  });

  it('stores two-handed Zweihander only for punch declarations', () => {
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackType('punch', 'leftArm');
    store.setPhysicalAttackTwoHandedZweihander(true);
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan,
    ).toMatchObject({
      attackType: 'punch',
      limb: 'leftArm',
      twoHandedZweihander: true,
    });

    usePhysicalAttackPlanStore.getState().setPhysicalAttackType('kick');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan,
    ).toMatchObject({
      attackType: 'kick',
      limb: null,
      twoHandedZweihander: false,
    });

    usePhysicalAttackPlanStore
      .getState()
      .setPhysicalAttackTwoHandedZweihander(true);
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan,
    ).toMatchObject({
      attackType: 'kick',
      twoHandedZweihander: false,
    });
  });

  it('stores selected iNARC pod identity only for Brush-Off declarations', () => {
    const selectedINarcPod = {
      teamId: GameSide.Player,
      podType: 'ecm' as const,
      location: 'left_torso' as const,
    };
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackINarcPod(selectedINarcPod);
    store.setPhysicalAttackType('brush-off');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan,
    ).toMatchObject({
      attackType: 'brush-off',
      selectedINarcPod,
    });

    store.setPhysicalAttackType('punch');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan,
    ).toMatchObject({
      attackType: 'punch',
    });
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan,
    ).not.toHaveProperty('selectedINarcPod');
  });

  it('clearPhysicalAttackPlan resets target + type', () => {
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('phys-defender');
    store.setPhysicalAttackType('kick');
    store.clearPhysicalAttackPlan();
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
      limb: null,
      twoHandedZweihander: false,
    });
  });

  it('commitPhysicalAttack returns null when target / type are missing', () => {
    const fake = buildPhysicalFakeSession();
    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fake,
      attackerId: 'phys-attacker',
      attackerPiloting: 4,
    });
    expect(next).toBeNull();
  });

  it('commitPhysicalAttack pushes a PhysicalAttackDeclared event onto the session', () => {
    const fake = buildPhysicalFakeSession();
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('phys-defender');
    store.setPhysicalAttackType('punch');

    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fake,
      attackerId: 'phys-attacker',
      attackerPiloting: 4,
      attackerTonnage: 50,
      targetTonnage: 50,
    });

    expect(next).not.toBeNull();
    const declared = next!.events.find(
      (e) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackerId).toBe('phys-attacker');
    expect(payload.targetId).toBe('phys-defender');
    expect(payload.attackType).toBe('punch');
    expect(payload.limb).toBe('rightArm');
  });

  it('commitPhysicalAttack preserves explicit two-handed Zweihander punch declarations', () => {
    const fake = buildPhysicalFakeSession(
      buildPhysicalSession({ attackerAbilities: ['zweihander'] }),
    );
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('phys-defender');
    store.setPhysicalAttackType('punch');
    store.setPhysicalAttackTwoHandedZweihander(true);

    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fake,
      attackerId: 'phys-attacker',
      attackerPiloting: 4,
      attackerTonnage: 50,
      targetTonnage: 50,
    });

    expect(next).not.toBeNull();
    const declared = next!.events.find(
      (e) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackType).toBe('punch');
    expect(payload.twoHandedZweihander).toBe(true);
  });

  it('commitPhysicalAttack preserves selected iNARC pod identity for Brush-Off', () => {
    const selectedINarcPod = {
      teamId: GameSide.Player,
      podType: 'haywire' as const,
      location: 'right_torso' as const,
    };
    const fake = buildPhysicalFakeSession(
      buildPhysicalSession({ defenderINarcPods: [selectedINarcPod] }),
    );
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('phys-defender');
    store.setPhysicalAttackINarcPod(selectedINarcPod);
    store.setPhysicalAttackType('brush-off');

    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fake,
      attackerId: 'phys-attacker',
      attackerPiloting: 4,
      attackerTonnage: 50,
      targetTonnage: 50,
    });

    expect(next).not.toBeNull();
    const declared = next!.events.find(
      (e) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackType).toBe('brush-off');
    expect(payload.selectedINarcPod).toEqual(selectedINarcPod);
  });

  it('commitPhysicalAttack clears the plan after a successful commit', () => {
    const fake = buildPhysicalFakeSession();
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('phys-defender');
    store.setPhysicalAttackType('kick');
    usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fake,
      attackerId: 'phys-attacker',
      attackerPiloting: 4,
    });
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
      limb: null,
      twoHandedZweihander: false,
    });
  });
});
