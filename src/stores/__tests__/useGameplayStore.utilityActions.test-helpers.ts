import type { InteractiveSession } from '@/engine/GameEngine';

import { InteractivePhase, useGameplayStore } from '@/stores/useGameplayStore';
import {
  DEFAULT_UI_STATE,
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IFacingChangedPayload,
  type IGameSession,
  type IGameUnit,
  type IMovementEnhancementActivatedPayload,
  type IMovementDeclaredPayload,
  type ISpottingDeclaredPayload,
} from '@/types/gameplay';
import { createUnitFellEvent } from '@/utils/gameplay/gameEvents';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';

function makeGameUnits(): IGameUnit[] {
  return [
    {
      id: 'player-a',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-a',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'player-b',
      name: 'Hunchback',
      side: GameSide.Player,
      unitRef: 'hunchback-hbk-4g',
      pilotRef: 'pilot-b',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'opponent-a',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-c',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeSession(): IGameSession {
  const session = createGameSession(
    {
      mapRadius: 5,
      turnLimit: 30,
      victoryConditions: [],
      optionalRules: [],
    },
    makeGameUnits(),
    {
      id: 'utility-session',
      createdAt: '2026-05-22T00:00:00.000Z',
    },
  );
  return startGame(session, GameSide.Player);
}

function forceWeaponAttackState(session: IGameSession): IGameSession {
  return {
    ...session,
    currentState: {
      ...session.currentState,
      status: GameStatus.Active,
      phase: GamePhase.WeaponAttack,
      units: {
        ...session.currentState.units,
        'player-a': {
          ...session.currentState.units['player-a'],
          lockState: LockState.Pending,
        },
        'opponent-a': {
          ...session.currentState.units['opponent-a'],
          lockState: LockState.Pending,
        },
      },
    },
  };
}

function forceHeatState(session: IGameSession): IGameSession {
  return {
    ...session,
    currentState: {
      ...session.currentState,
      status: GameStatus.Active,
      phase: GamePhase.Heat,
    },
  };
}

function forceMovementState(session: IGameSession): IGameSession {
  let movementSession = session;
  if (movementSession.currentState.phase === GamePhase.Initiative) {
    movementSession = rollInitiative(movementSession, GameSide.Player, () => 6);
    movementSession = advancePhase(movementSession);
  }

  return {
    ...movementSession,
    currentState: {
      ...movementSession.currentState,
      status: GameStatus.Active,
      phase: GamePhase.Movement,
      units: {
        ...movementSession.currentState.units,
        'player-a': {
          ...movementSession.currentState.units['player-a'],
          facing: Facing.North,
          lockState: LockState.Pending,
        },
      },
    },
  };
}

function forceProneMovementState(session: IGameSession): IGameSession {
  return {
    ...session,
    units: session.units.map((unit) =>
      unit.id === 'player-a' ? { ...unit, piloting: 2 } : unit,
    ),
    currentState: {
      ...session.currentState,
      status: GameStatus.Active,
      phase: GamePhase.Movement,
      units: {
        ...session.currentState.units,
        'player-a': {
          ...session.currentState.units['player-a'],
          prone: true,
          pilotWounds: 0,
          destroyed: false,
        },
      },
    },
  };
}

describe('useGameplayStore utility actions', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
  });

  it('turns the eject action into UnitEjected state for local sessions', () => {
    const session = makeSession();
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
        targetUnitId: 'opponent-a',
        queuedWeaponIds: ['medium-laser'],
      },
    });

    useGameplayStore.getState().handleAction('eject');

    const updated = useGameplayStore.getState().session!;
    const event = updated.events.find(
      (entry) => entry.type === GameEventType.UnitEjected,
    );
    expect(event).toBeDefined();
    expect(event!.payload).toMatchObject({
      unitId: 'player-a',
      reason: 'player_declared',
    });
    expect(updated.currentState.units['player-a'].hasEjected).toBe(true);
    expect(updated.currentState.units['player-a'].destroyed).toBe(false);
    expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.queuedWeaponIds).toEqual([]);
  });

  it('delegates eject to InteractiveSession when one is active', () => {
    let snapshot = makeSession();
    const ejectedUnitIds: string[] = [];
    const fake = {
      ejectUnit: (unitId: string) => {
        ejectedUnitIds.push(unitId);
        snapshot = {
          ...snapshot,
          currentState: {
            ...snapshot.currentState,
            units: {
              ...snapshot.currentState.units,
              [unitId]: {
                ...snapshot.currentState.units[unitId],
                hasEjected: true,
                lockState: LockState.Resolved,
              },
            },
          },
        };
      },
      getSession: () => snapshot,
    } as unknown as InteractiveSession;

    useGameplayStore.setState({
      session: snapshot,
      interactiveSession: fake,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
        targetUnitId: 'opponent-a',
        queuedWeaponIds: ['medium-laser'],
      },
    });

    useGameplayStore.getState().handleAction('eject');

    expect(ejectedUnitIds).toEqual(['player-a']);
    expect(
      useGameplayStore.getState().session!.currentState.units['player-a']
        .hasEjected,
    ).toBe(true);
    expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.queuedWeaponIds).toEqual([]);
  });

  it('turns the stand action into a local stand-up PSR attempt', () => {
    const session = forceProneMovementState(makeSession());
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
        targetUnitId: 'opponent-a',
        queuedWeaponIds: ['medium-laser'],
      },
    });

    useGameplayStore.getState().handleAction('stand');

    const updated = useGameplayStore.getState().session!;
    expect(
      updated.events.some((entry) => entry.type === GameEventType.PSRTriggered),
    ).toBe(true);
    expect(
      updated.events.some((entry) => entry.type === GameEventType.PSRResolved),
    ).toBe(true);
    expect(
      updated.events.some((entry) => entry.type === GameEventType.UnitStood),
    ).toBe(true);
    expect(updated.currentState.units['player-a'].prone).toBe(false);
    expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.queuedWeaponIds).toEqual([]);
  });

  it('delegates stand to InteractiveSession when one is active', () => {
    let snapshot = forceProneMovementState(makeSession());
    const standUnitIds: string[] = [];
    const fake = {
      attemptStandUp: (unitId: string) => {
        standUnitIds.push(unitId);
        snapshot = {
          ...snapshot,
          currentState: {
            ...snapshot.currentState,
            units: {
              ...snapshot.currentState.units,
              [unitId]: {
                ...snapshot.currentState.units[unitId],
                prone: false,
              },
            },
          },
        };
      },
      getSession: () => snapshot,
    } as unknown as InteractiveSession;

    useGameplayStore.setState({
      session: snapshot,
      interactiveSession: fake,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
        targetUnitId: 'opponent-a',
        queuedWeaponIds: ['medium-laser'],
      },
    });

    useGameplayStore.getState().handleAction('stand');

    expect(standUnitIds).toEqual(['player-a']);
    expect(
      useGameplayStore.getState().session!.currentState.units['player-a'].prone,
    ).toBe(false);
    expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.queuedWeaponIds).toEqual([]);
  });

  it('rolls real stand-up PSR dice locally so a failing roll keeps the unit prone', () => {
    // Audit A-4: the reconciliation merge hardcoded a boxcars (12) roll into
    // the local stand path, so stand-up could never fail. Pin the real
    // behavior: piloting 5 => TN 5, and a forced snake-eyes roll (2) through
    // the engine's default dice seam must FAIL the PSR and leave the unit
    // prone. Seed prone through a real UnitFell event (not a hand-edited
    // currentState) because appendEvent re-derives state from the event log.
    const base = makeSession();
    const session = appendEvent(
      base,
      createUnitFellEvent(
        base.id,
        base.events.length,
        base.currentState.turn,
        GamePhase.Movement,
        'player-a',
        0,
        Facing.North,
        0,
      ),
    );
    expect(session.currentState.units['player-a'].prone).toBe(true);
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
      },
    });

    // Force both d6 to roll 1 (total 2) via the production roller's
    // Math.random source. A hardcoded dice result ignores this mock.
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      useGameplayStore.getState().handleAction('stand');
    } finally {
      randomSpy.mockRestore();
    }

    const updated = useGameplayStore.getState().session!;
    const resolved = updated.events.find(
      (entry) => entry.type === GameEventType.PSRResolved,
    );
    expect(resolved).toBeDefined();
    expect(resolved!.payload).toMatchObject({
      unitId: 'player-a',
      targetNumber: 5,
      roll: 2,
      passed: false,
    });
    expect(
      updated.events.some((entry) => entry.type === GameEventType.UnitStood),
    ).toBe(false);
    expect(updated.currentState.units['player-a'].prone).toBe(true);
  });

  it('turns go-prone into same-hex movement and locks the local unit', () => {
    const session = forceMovementState(makeSession());
    const start = session.currentState.units['player-a'].position;
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
        targetUnitId: 'opponent-a',
        queuedWeaponIds: ['medium-laser'],
      },
    });

    useGameplayStore.getState().handleAction('go-prone');

    const updated = useGameplayStore.getState().session!;
    const movement = updated.events.find(
      (entry) => entry.type === GameEventType.MovementDeclared,
    );
    expect(movement?.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'player-a',
      from: start,
      to: start,
      facing: Facing.North,
      movementType: MovementType.Stationary,
      mpUsed: 1,
      heatGenerated: 0,
      hexesMoved: 0,
      steps: [{ kind: 'goProne', index: 0, at: start, mpCost: 1 }],
    });
    expect(
      updated.events.some(
        (entry) => entry.type === GameEventType.MovementLocked,
      ),
    ).toBe(true);
    expect(updated.currentState.units['player-a'].prone).toBe(true);
    expect(updated.currentState.units['player-a'].hexesMovedThisTurn).toBe(0);
    expect(updated.currentState.units['player-a'].lockState).toBe(
      LockState.Locked,
    );
    expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.queuedWeaponIds).toEqual([]);
  });

  it('delegates go-prone to InteractiveSession when one is active', () => {
    let snapshot = forceMovementState(makeSession());
    const proneUnitIds: string[] = [];
    const fake = {
      goProne: (unitId: string) => {
        proneUnitIds.push(unitId);
        snapshot = {
          ...snapshot,
          currentState: {
            ...snapshot.currentState,
            units: {
              ...snapshot.currentState.units,
              [unitId]: {
                ...snapshot.currentState.units[unitId],
                prone: true,
                lockState: LockState.Locked,
              },
            },
          },
        };
      },
      getSession: () => snapshot,
    } as unknown as InteractiveSession;

    useGameplayStore.setState({
      session: snapshot,
      interactiveSession: fake,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
        targetUnitId: 'opponent-a',
        queuedWeaponIds: ['medium-laser'],
      },
    });

    useGameplayStore.getState().handleAction('go-prone');

    expect(proneUnitIds).toEqual(['player-a']);
    expect(
      useGameplayStore.getState().session!.currentState.units['player-a'].prone,
    ).toBe(true);
    expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.queuedWeaponIds).toEqual([]);
  });

  it('activates MASC through a replayable local movement enhancement event', () => {
    const base = forceMovementState(makeSession());
    const session = {
      ...base,
      currentState: {
        ...base.currentState,
        units: {
          ...base.currentState.units,
          'player-a': {
            ...base.currentState.units['player-a'],
            hasMASC: true,
          },
        },
      },
    };
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
      },
    });

    useGameplayStore.getState().handleAction('activate-masc');

    const updated = useGameplayStore.getState().session!;
    const event = updated.events.find(
      (entry) => entry.type === GameEventType.MovementEnhancementActivated,
    );
    expect(event?.payload as IMovementEnhancementActivatedPayload).toEqual({
      unitId: 'player-a',
      enhancement: 'MASC',
    });
    expect(updated.currentState.units['player-a'].activeMASC).toBe(true);
    expect(updated.currentState.units['player-a'].lockState).toBe(
      LockState.Pending,
    );
    expect(useGameplayStore.getState().ui.selectedUnitId).toBe('player-a');
  });

  it('delegates Supercharger activation to InteractiveSession when one is active', () => {
    let snapshot = forceMovementState(makeSession());
    const activations: Array<{
      unitId: string;
      enhancement: 'MASC' | 'Supercharger';
    }> = [];
    const fake = {
      activateMovementEnhancement: (
        unitId: string,
        enhancement: 'MASC' | 'Supercharger',
      ) => {
        activations.push({ unitId, enhancement });
        snapshot = {
          ...snapshot,
          currentState: {
            ...snapshot.currentState,
            units: {
              ...snapshot.currentState.units,
              [unitId]: {
                ...snapshot.currentState.units[unitId],
                activeSupercharger: enhancement === 'Supercharger',
              },
            },
          },
        };
      },
      getSession: () => snapshot,
    } as unknown as InteractiveSession;

    useGameplayStore.setState({
      session: snapshot,
      interactiveSession: fake,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
      },
    });

    useGameplayStore.getState().handleAction('activate-supercharger');

    expect(activations).toEqual([
      { unitId: 'player-a', enhancement: 'Supercharger' },
    ]);
    expect(
      useGameplayStore.getState().session!.currentState.units['player-a']
        .activeSupercharger,
    ).toBe(true);
    expect(useGameplayStore.getState().ui.selectedUnitId).toBe('player-a');
  });

  it('turns facing-right into a same-hex movement declaration for local sessions', () => {
    const session = forceMovementState(makeSession());
    const start = session.currentState.units['player-a'].position;
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
      },
    });

    useGameplayStore.getState().handleAction('facing-right');

    const updated = useGameplayStore.getState().session!;
    const movement = updated.events.find(
      (entry) => entry.type === GameEventType.MovementDeclared,
    );
    expect(movement?.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'player-a',
      from: start,
      to: start,
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 1,
    });
    expect(
      updated.events.some(
        (entry) => entry.type === GameEventType.MovementLocked,
      ),
    ).toBe(true);
    expect(updated.currentState.units['player-a'].facing).toBe(
      Facing.Northeast,
    );
    expect(updated.currentState.units['player-a'].lockState).toBe(
      LockState.Locked,
    );
  });

  it('delegates facing-left to InteractiveSession as a same-hex movement', () => {
    let snapshot = forceMovementState(makeSession());
    const movements: Array<{
      readonly unitId: string;
      readonly facing: Facing;
      readonly movementType: MovementType;
      readonly path: readonly { readonly q: number; readonly r: number }[];
    }> = [];
    const fake = {
      applyMovement: (
        unitId: string,
        _to: { q: number; r: number },
        facing: Facing,
        movementType: MovementType,
        path: readonly { readonly q: number; readonly r: number }[],
      ) => {
        movements.push({ unitId, facing, movementType, path });
        snapshot = {
          ...snapshot,
          currentState: {
            ...snapshot.currentState,
            units: {
              ...snapshot.currentState.units,
              [unitId]: {
                ...snapshot.currentState.units[unitId],
                facing,
              },
            },
          },
        };
      },
      getSession: () => snapshot,
    } as unknown as InteractiveSession;

    useGameplayStore.setState({
      session: snapshot,
      interactiveSession: fake,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
      },
    });

    useGameplayStore.getState().handleAction('facing-left');

    expect(movements).toEqual([
      {
        unitId: 'player-a',
        facing: Facing.Northwest,
        movementType: MovementType.Walk,
        path: [snapshot.currentState.units['player-a'].position],
      },
    ]);
    expect(
      useGameplayStore.getState().session!.currentState.units['player-a']
        .facing,
    ).toBe(Facing.Northwest);
  });

  it('turns torso-twist into a local secondary-facing event', () => {
    const session = forceWeaponAttackState(makeSession());
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
      },
    });

    useGameplayStore
      .getState()
      .handleAction('torso-twist', { direction: 'left' });

    const updated = useGameplayStore.getState().session!;
    const event = updated.events.find(
      (entry) => entry.type === GameEventType.FacingChanged,
    );
    expect(event?.payload as IFacingChangedPayload).toMatchObject({
      unitId: 'player-a',
      secondaryFacing: Facing.Northeast,
      torsoTwist: 'left',
    });
    expect(updated.currentState.units['player-a'].facing).toBe(Facing.North);
    expect(updated.currentState.units['player-a'].secondaryFacing).toBe(
      Facing.Northeast,
    );
  });

  it('delegates torso-twist to InteractiveSession when one is active', () => {
    let snapshot = forceWeaponAttackState(makeSession());
    const twists: Array<{
      readonly unitId: string;
      readonly secondaryFacing: Facing;
    }> = [];
    const fake = {
      torsoTwist: (unitId: string, secondaryFacing: Facing) => {
        twists.push({ unitId, secondaryFacing });
        snapshot = {
          ...snapshot,
          currentState: {
            ...snapshot.currentState,
            units: {
              ...snapshot.currentState.units,
              [unitId]: {
                ...snapshot.currentState.units[unitId],
                secondaryFacing,
              },
            },
          },
        };
      },
      getSession: () => snapshot,
    } as unknown as InteractiveSession;

    useGameplayStore.setState({
      session: snapshot,
      interactiveSession: fake,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
      },
    });

    useGameplayStore
      .getState()
      .handleAction('torso-twist', { secondaryFacing: Facing.Northwest });

    expect(twists).toEqual([
      { unitId: 'player-a', secondaryFacing: Facing.Northwest },
    ]);
    expect(
      useGameplayStore.getState().session!.currentState.units['player-a']
        .secondaryFacing,
    ).toBe(Facing.Northwest);
  });

  it('turns request-spot into SpottingDeclared state for local sessions', () => {
    const session = forceWeaponAttackState(makeSession());
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
        targetUnitId: 'opponent-a',
        queuedWeaponIds: ['medium-laser'],
      },
    });

    useGameplayStore.getState().handleAction('request-spot', {
      unitId: 'player-a',
      targetUnitId: 'opponent-a',
    });

    const updated = useGameplayStore.getState().session!;
    const event = updated.events.find(
      (entry) => entry.type === GameEventType.SpottingDeclared,
    );
    expect(event?.payload as ISpottingDeclaredPayload).toMatchObject({
      unitId: 'player-a',
      targetId: 'opponent-a',
      turn: updated.currentState.turn,
    });
    expect(updated.currentState.units['player-a'].isSpotting).toBe(true);
    expect(updated.currentState.units['player-a'].spotTargetId).toBe(
      'opponent-a',
    );
    expect(updated.currentState.units['player-a'].lockState).toBe(
      LockState.Locked,
    );
    expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.queuedWeaponIds).toEqual([]);
  });

  it('delegates request-spot to InteractiveSession when one is active', () => {
    let snapshot = forceWeaponAttackState(makeSession());
    const spottingCalls: Array<readonly [string, string]> = [];
    const fake = {
      requestSpot: (unitId: string, targetId: string) => {
        spottingCalls.push([unitId, targetId]);
        snapshot = {
          ...snapshot,
          currentState: {
            ...snapshot.currentState,
            units: {
              ...snapshot.currentState.units,
              [unitId]: {
                ...snapshot.currentState.units[unitId],
                isSpotting: true,
                spotTargetId: targetId,
                lockState: LockState.Locked,
              },
            },
          },
        };
      },
      getSession: () => snapshot,
    } as unknown as InteractiveSession;

    useGameplayStore.setState({
      session: snapshot,
      interactiveSession: fake,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
        targetUnitId: 'opponent-a',
        queuedWeaponIds: ['medium-laser'],
      },
    });

    useGameplayStore.getState().handleAction('request-spot');

    expect(spottingCalls).toEqual([['player-a', 'opponent-a']]);
    expect(
      useGameplayStore.getState().session!.currentState.units['player-a']
        .isSpotting,
    ).toBe(true);
    expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    expect(useGameplayStore.getState().ui.queuedWeaponIds).toEqual([]);
  });

  it('no-ops request-spot when the spotter is already spotting', () => {
    // Audit A-12: the reconciliation merge dropped the store-level
    // eligibility guard chain, so ineligible requests surfaced the
    // reducer's Error ("Unit ... is already spotting") uncaught in the UI.
    const base = forceWeaponAttackState(makeSession());
    const session: IGameSession = {
      ...base,
      currentState: {
        ...base.currentState,
        units: {
          ...base.currentState.units,
          'player-a': {
            ...base.currentState.units['player-a'],
            isSpotting: true,
            spotTargetId: 'opponent-a',
          },
        },
      },
    };
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
        targetUnitId: 'opponent-a',
      },
    });

    expect(() =>
      useGameplayStore.getState().handleAction('request-spot', {
        unitId: 'player-a',
        targetUnitId: 'opponent-a',
      }),
    ).not.toThrow();

    const updated = useGameplayStore.getState().session!;
    // Ineligible request is a pure no-op: no event appended.
    expect(updated.events).toHaveLength(session.events.length);
    expect(
      updated.events.some(
        (entry) => entry.type === GameEventType.SpottingDeclared,
      ),
    ).toBe(false);
  });

  it('no-ops request-spot against a friendly target', () => {
    // Audit A-12: spotting a same-side unit must no-op instead of
    // throwing "Cannot spot a friendly target" from the reducer.
    const session = forceWeaponAttackState(makeSession());
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
      },
    });

    expect(() =>
      useGameplayStore.getState().handleAction('request-spot', {
        unitId: 'player-a',
        targetUnitId: 'player-b',
      }),
    ).not.toThrow();

    const updated = useGameplayStore.getState().session!;
    expect(updated.events).toHaveLength(session.events.length);
    expect(updated.currentState.units['player-a'].isSpotting).toBeFalsy();
  });

  it('no-ops request-spot outside the weapon-attack phase', () => {
    // Audit A-12: spotting is only legal during the weapon-attack phase;
    // a movement-phase request must no-op instead of throwing
    // "Not in weapon attack phase".
    const session = forceMovementState(makeSession());
    useGameplayStore.setState({
      session,
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'player-a',
        targetUnitId: 'opponent-a',
      },
    });

    expect(() =>
      useGameplayStore.getState().handleAction('request-spot', {
        unitId: 'player-a',
        targetUnitId: 'opponent-a',
      }),
    ).not.toThrow();

    const updated = useGameplayStore.getState().session!;
    expect(
      updated.events.some(
        (entry) => entry.type === GameEventType.SpottingDeclared,
      ),
    ).toBe(false);
  });

  it('excludes ejected targets when selecting a weapon-attack target', () => {
    const base = forceWeaponAttackState(makeSession());
    const session = {
      ...base,
      currentState: {
        ...base.currentState,
        units: {
          ...base.currentState.units,
          'opponent-a': {
            ...base.currentState.units['opponent-a'],
            hasEjected: true,
          },
          'opponent-b': {
            id: 'opponent-b',
            side: GameSide.Opponent,
            position: { q: 1, r: 0 },
            facing: Facing.South,
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
            lockState: LockState.Pending,
            hasRetreated: false,
            hasEjected: false,
          },
        },
      },
    } satisfies IGameSession;
    const fake = {
      getState: () => session.currentState,
    } as unknown as InteractiveSession;

    useGameplayStore.setState({
      session,
      interactiveSession: fake,
      interactivePhase: InteractivePhase.SelectUnit,
      ui: DEFAULT_UI_STATE,
    });

    useGameplayStore.getState().handleInteractiveTokenClick('player-a');

    expect(useGameplayStore.getState().validTargetIds).toEqual(['opponent-b']);
  });

  it('turns the heat continue action into an interactive heat phase advance', () => {
    let snapshot = forceHeatState(makeSession());
    const advancedFrom: GamePhase[] = [];
    const fake = {
      advancePhase: () => {
        advancedFrom.push(snapshot.currentState.phase);
        snapshot = {
          ...snapshot,
          currentState: {
            ...snapshot.currentState,
            phase: GamePhase.End,
          },
        };
      },
      getSession: () => snapshot,
    } as unknown as InteractiveSession;

    useGameplayStore.setState({
      session: snapshot,
      interactiveSession: fake,
      ui: DEFAULT_UI_STATE,
    });

    useGameplayStore.getState().handleAction('continue');

    expect(advancedFrom).toEqual([GamePhase.Heat]);
    expect(useGameplayStore.getState().session!.currentState.phase).toBe(
      GamePhase.End,
    );
  });

  it('keeps heat continue inert outside the Heat phase', () => {
    const session = forceWeaponAttackState(makeSession());
    const advancedFrom: GamePhase[] = [];
    const fake = {
      advancePhase: () => {
        advancedFrom.push(session.currentState.phase);
      },
      getSession: () => session,
    } as unknown as InteractiveSession;

    useGameplayStore.setState({
      session,
      interactiveSession: fake,
      ui: DEFAULT_UI_STATE,
    });

    useGameplayStore.getState().handleAction('continue');

    expect(advancedFrom).toEqual([]);
    expect(useGameplayStore.getState().session!.currentState.phase).toBe(
      GamePhase.WeaponAttack,
    );
  });

  it('advances the heat phase through the local reducer when no interactive session exists', () => {
    // Audit A-15: the reconciliation merge dropped the non-interactive
    // advancePhase fallback, so the dock's heat.continue command no-oped
    // in local event-sourced sessions.
    const session = forceHeatState(makeSession());
    useGameplayStore.setState({
      session,
      ui: DEFAULT_UI_STATE,
    });

    useGameplayStore.getState().handleAction('continue');

    const updated = useGameplayStore.getState().session!;
    expect(updated.currentState.phase).toBe(GamePhase.End);
    // The fallback goes through the event-sourced reducer, so the phase
    // change must be recorded as a replayable event.
    expect(updated.events[updated.events.length - 1]!.type).toBe(
      GameEventType.PhaseChanged,
    );
  });
});
