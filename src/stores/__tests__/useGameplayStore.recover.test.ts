import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import type { IAdaptedUnit } from '@/engine/types';
import type { IWeapon } from '@/simulation/ai/types';

jest.mock('@/engine/adapters/CompendiumAdapter', () => {
  const mockAdaptUnit = jest.fn();
  return {
    adaptUnit: mockAdaptUnit,
    __mockAdaptUnit: mockAdaptUnit,
  };
});

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  InteractiveSession,
  recoverInteractiveSession,
} from '@/engine/InteractiveSession';
import {
  INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE,
  INTERACTIVE_SESSION_CORRUPT_MESSAGE,
  INTERACTIVE_SESSION_NOT_FOUND_MESSAGE,
  INTERACTIVE_SESSION_STORAGE_UNAVAILABLE_MESSAGE,
  InteractiveSessionRecoveryCorruptError,
  InteractiveSessionRecoveryNotFoundError,
} from '@/engine/InteractiveSession.persistence';
import {
  flushMatchLogWrites,
  matchLogStorage,
} from '@/lib/p2p/matchLogStorage';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { loadSessionLogic } from '@/stores/useGameplayStore.session';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import {
  Facing,
  FiringArc,
  GameEventType,
  GameSide,
  LockState,
  MovementType,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';
import {
  createQuickGameInstance,
  createQuickGameUnit,
} from '@/types/quickgame';
import { createGameStartedEvent } from '@/utils/gameplay/gameEvents';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const adapterModule = require('@/engine/adapters/CompendiumAdapter') as {
  __mockAdaptUnit: jest.Mock;
};
const mockAdaptUnit = adapterModule.__mockAdaptUnit;
const RECOVERABLE_QUICK_GAME_UNIT_REFS = new Set([
  'atlas-as7-d',
  'marauder-mad-3r',
  'stinger-stg-3r',
]);

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    damage: 5,
    heat: 3,
    minRange: 0,
    shortRange: 6,
    mediumRange: 12,
    longRange: 20,
    extremeRange: 30,
    ammoPerTon: -1,
    destroyed: false,
    mountingArcs: [
      FiringArc.Front,
      FiringArc.Left,
      FiringArc.Right,
      FiringArc.Rear,
    ],
  };
}

function makeAdaptedUnit(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: -2 } : { q: 0, r: 2 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    startingInternalStructure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [makeWeapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    tonnage: 65,
  };
}

function installFreshIndexedDB(): void {
  matchLogStorage.close();
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    writable: true,
    configurable: true,
  });
}

function makeUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'atlas-as7-d',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'marauder-mad-3r',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeBootstrapInteractiveSession(): InteractiveSession {
  return new InteractiveSession(
    7,
    30,
    new SeededRandom(42),
    createMinimalGrid(7),
    [makeAdaptedUnit('atlas-as7-d', GameSide.Player)],
    [makeAdaptedUnit('marauder-mad-3r', GameSide.Opponent)],
    makeUnits(),
  );
}

function installRecoverableQuickGame(): readonly string[] {
  const playerUnit = createQuickGameUnit({
    sourceUnitId: 'atlas-as7-d',
    name: 'Atlas AS7-D',
    chassis: 'Atlas',
    variant: 'AS7-D',
    bv: 1897,
    tonnage: 100,
    gunnery: 4,
    piloting: 5,
    maxArmor: { head: 9, center_torso: 31 },
    maxStructure: { head: 3, center_torso: 21 },
  });
  const opponentUnit = createQuickGameUnit({
    sourceUnitId: 'marauder-mad-3r',
    name: 'Marauder MAD-3R',
    chassis: 'Marauder',
    variant: 'MAD-3R',
    bv: 1363,
    tonnage: 75,
    gunnery: 4,
    piloting: 5,
    maxArmor: { head: 9, center_torso: 31 },
    maxStructure: { head: 3, center_torso: 23 },
  });
  const duplicateOpponentUnit = createQuickGameUnit({
    sourceUnitId: 'marauder-mad-3r',
    name: 'Marauder MAD-3R',
    chassis: 'Marauder',
    variant: 'MAD-3R',
    bv: 1363,
    tonnage: 75,
    gunnery: 4,
    piloting: 5,
    maxArmor: { head: 9, center_torso: 31 },
    maxStructure: { head: 3, center_torso: 23 },
  });
  const lightOpponentUnit = createQuickGameUnit({
    sourceUnitId: 'stinger-stg-3r',
    name: 'Stinger STG-3R',
    chassis: 'Stinger',
    variant: 'STG-3R',
    bv: 359,
    tonnage: 20,
    gunnery: 4,
    piloting: 5,
    maxArmor: { head: 9, center_torso: 18 },
    maxStructure: { head: 3, center_torso: 6 },
  });
  const game = createQuickGameInstance();

  useQuickGameStore.setState({
    game: {
      ...game,
      playerForce: {
        name: 'Player Force',
        units: [playerUnit],
        totalBV: playerUnit.bv,
        totalTonnage: playerUnit.tonnage,
      },
      opponentForce: {
        name: 'Opponent Force',
        units: [opponentUnit, duplicateOpponentUnit, lightOpponentUnit],
        totalBV:
          opponentUnit.bv + duplicateOpponentUnit.bv + lightOpponentUnit.bv,
        totalTonnage:
          opponentUnit.tonnage +
          duplicateOpponentUnit.tonnage +
          lightOpponentUnit.tonnage,
      },
    },
    isLoading: false,
    error: null,
    isDirty: false,
    seedOverride: 42,
  });

  return [
    playerUnit.instanceId,
    opponentUnit.instanceId,
    duplicateOpponentUnit.instanceId,
    lightOpponentUnit.instanceId,
  ];
}

function driveMovementAndAttackHistory(session: InteractiveSession): void {
  session.advancePhase(); // Initiative -> Movement
  session.applyMovement(
    'atlas-as7-d',
    { q: -2, r: 4 },
    Facing.North,
    MovementType.Walk,
    [
      { q: -2, r: 5 },
      { q: -2, r: 4 },
    ],
  );
  session.advancePhase(); // Movement -> WeaponAttack
  session.applyAttack('atlas-as7-d', 'marauder-mad-3r', [
    'atlas-as7-d-medium-laser',
  ]);
}

async function persistSessionLog(session: IGameSession): Promise<void> {
  try {
    const writes = session.events.map((event) =>
      matchLogStorage.appendEvent(session.id, event),
    );
    await flushMatchLogWrites();
    await Promise.all(writes);
  } catch (error) {
    const originalError =
      error instanceof Error && 'originalError' in error
        ? Reflect.get(error, 'originalError')
        : undefined;
    throw new Error(
      `Failed to seed recovery log: ${
        error instanceof Error ? error.message : String(error)
      }; original=${String(originalError)}`,
    );
  }
}

describe('useGameplayStore interactive session recovery', () => {
  beforeEach(() => {
    mockAdaptUnit.mockImplementation(
      async (
        unitRef: string,
        options: { side: GameSide } = { side: GameSide.Player },
      ) =>
        RECOVERABLE_QUICK_GAME_UNIT_REFS.has(unitRef)
          ? makeAdaptedUnit(unitRef, options.side)
          : null,
    );
    installFreshIndexedDB();
    useGameplayStore.getState().reset();
    useQuickGameStore.setState({
      game: null,
      isLoading: false,
      error: null,
      isDirty: false,
      seedOverride: null,
    });
  });

  afterEach(() => {
    useGameplayStore.getState().reset();
    useQuickGameStore.setState({
      game: null,
      isLoading: false,
      error: null,
      isDirty: false,
      seedOverride: null,
    });
    matchLogStorage.close();
  });

  it('cold-recovers the session created by the Quick Game interactive launch action', async () => {
    const expectedUnitIds = installRecoverableQuickGame();

    await useQuickGameStore.getState().startInteractiveSkirmish();

    const launched = useGameplayStore
      .getState()
      .interactiveSession?.getSession();
    if (!launched) {
      throw new Error(
        'Expected interactive launch to adopt an interactive session',
      );
    }
    expect(launched.events[0]?.type).toBe(GameEventType.GameCreated);
    expect(launched.units.map((unit) => unit.id)).toEqual(expectedUnitIds);
    expect(new Set(launched.units.map((unit) => unit.id)).size).toBe(
      expectedUnitIds.length,
    );
    expect(Object.keys(launched.currentState.units)).toHaveLength(
      expectedUnitIds.length,
    );
    expect(launched.units.map((unit) => unit.unitRef)).toEqual([
      'atlas-as7-d',
      'marauder-mad-3r',
      'marauder-mad-3r',
      'stinger-stg-3r',
    ]);

    useGameplayStore.getState().reset();
    await useGameplayStore.getState().loadSession(launched.id);

    const recovered = useGameplayStore.getState();
    expect(recovered.error).toBeNull();
    expect(recovered.session?.id).toBe(launched.id);
    expect(recovered.session?.events).toEqual(launched.events);
    expect(recovered.interactiveSession).not.toBeNull();
    expect(recovered.session?.units.map((unit) => unit.id)).toEqual(
      expectedUnitIds,
    );
    expect(
      Object.keys(recovered.session?.currentState.units ?? {}),
    ).toHaveLength(expectedUnitIds.length);
    for (const unit of recovered.session?.units ?? []) {
      expect(
        recovered.interactiveSession?.getMovementCapability(unit.id),
      ).not.toBeNull();
      expect(
        recovered.interactiveSession?.getUnitWeapons(unit.id),
      ).not.toHaveLength(0);
    }
  });

  it('does not adopt a Quick Game session when launch recovery storage is unavailable', async () => {
    installRecoverableQuickGame();
    const initialGame = useQuickGameStore.getState().game;
    matchLogStorage.close();
    Object.defineProperty(globalThis, 'indexedDB', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    await useQuickGameStore.getState().startInteractiveSkirmish();

    const gameplay = useGameplayStore.getState();
    const quickGame = useQuickGameStore.getState();
    expect(gameplay.session).toBeNull();
    expect(gameplay.interactiveSession).toBeNull();
    expect(quickGame.game?.status).toBe(initialGame?.status);
    expect(quickGame.game?.step).toBe(initialGame?.step);
    expect(quickGame.error).toBe(
      INTERACTIVE_SESSION_LAUNCH_STORAGE_UNAVAILABLE_MESSAGE,
    );
    expect(quickGame.isLoading).toBe(false);
  });

  it('cold-recovers the spectator session with duplicate catalog variants intact', async () => {
    const expectedUnitIds = installRecoverableQuickGame();

    await useQuickGameStore.getState().startSpectatorMode();

    const spectator = useGameplayStore.getState();
    const launched = spectator.interactiveSession?.getSession();
    if (!launched) {
      throw new Error(
        'Expected spectator launch to adopt an interactive session',
      );
    }

    expect(spectator.error).toBeNull();
    expect(launched.events.map((event) => event.type)).toEqual([
      GameEventType.GameCreated,
      GameEventType.GameStarted,
    ]);
    expect(launched.units.map((unit) => unit.id)).toEqual(expectedUnitIds);
    expect(Object.keys(launched.currentState.units)).toHaveLength(
      expectedUnitIds.length,
    );
    for (const unitId of expectedUnitIds) {
      expect(
        spectator.interactiveSession?.getMovementCapability(unitId),
      ).not.toBeNull();
      expect(
        spectator.interactiveSession?.getUnitWeapons(unitId),
      ).not.toHaveLength(0);
    }

    useGameplayStore.getState().reset();
    await useGameplayStore.getState().loadSession(launched.id);

    const recovered = useGameplayStore.getState();
    expect(recovered.error).toBeNull();
    expect(recovered.session?.events).toEqual(launched.events);
    expect(recovered.session?.units.map((unit) => unit.id)).toEqual(
      expectedUnitIds,
    );
    expect(recovered.interactiveSession).not.toBeNull();
  });

  it('recovers a persisted real session id from the match log into a drivable interactive session', async () => {
    const source = makeBootstrapInteractiveSession();
    driveMovementAndAttackHistory(source);
    const sourceSession = source.getSession();
    expect(sourceSession.events[0]?.type).toBe(GameEventType.GameCreated);
    expect(
      sourceSession.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(true);
    expect(
      sourceSession.events.some(
        (event) => event.type === GameEventType.AttackDeclared,
      ),
    ).toBe(true);
    await persistSessionLog(sourceSession);

    useGameplayStore.getState().reset();
    await useGameplayStore.getState().loadSession(sourceSession.id);

    const recovered = useGameplayStore.getState();
    expect(recovered.error).toBeNull();
    expect(recovered.session?.currentState).toEqual(sourceSession.currentState);
    expect(recovered.interactiveSession).not.toBeNull();
    expect(
      recovered.interactiveSession?.getMovementCapability('atlas-as7-d'),
    ).not.toBeNull();

    const beforeFurtherAction =
      recovered.interactiveSession?.getSession().events.length ?? 0;
    recovered.interactiveSession?.applyAttack(
      'marauder-mad-3r',
      'atlas-as7-d',
      ['marauder-mad-3r-medium-laser'],
    );
    const afterFurtherAction =
      recovered.interactiveSession?.getSession().events ?? [];
    expect(afterFurtherAction.length).toBeGreaterThan(beforeFurtherAction);
    expect(afterFurtherAction.slice(beforeFurtherAction)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: GameEventType.AttackDeclared,
        }),
      ]),
    );
  });

  it('classifies an empty match log as not found', async () => {
    await expect(recoverInteractiveSession('sess_missing')).rejects.toThrow(
      InteractiveSessionRecoveryNotFoundError,
    );

    await useGameplayStore.getState().loadSession('sess_missing');

    expect(useGameplayStore.getState().error).toBe(
      INTERACTIVE_SESSION_NOT_FOUND_MESSAGE,
    );
    expect(useGameplayStore.getState().interactiveSession).toBeNull();
  });

  it('classifies a non-empty log without GameCreated as corrupt and never falls back to demo', async () => {
    const corrupt = createGameStartedEvent('sess_corrupt', 0, GameSide.Player);
    expect(corrupt.type).toBe(GameEventType.GameStarted);
    const write = matchLogStorage.appendEvent('sess_corrupt', corrupt);
    await flushMatchLogWrites();
    await write;

    await expect(recoverInteractiveSession('sess_corrupt')).rejects.toThrow(
      InteractiveSessionRecoveryCorruptError,
    );

    await useGameplayStore.getState().loadSession('sess_corrupt');

    const state = useGameplayStore.getState();
    expect(state.error).toBe(INTERACTIVE_SESSION_CORRUPT_MESSAGE);
    expect(state.session?.id).not.toBe('demo');
    expect(state.interactiveSession).toBeNull();
  });

  it('surfaces unavailable IndexedDB as a non-crashing recovery error', async () => {
    matchLogStorage.close();
    Object.defineProperty(globalThis, 'indexedDB', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    await useGameplayStore.getState().loadSession('sess_storage_unavailable');

    const state = useGameplayStore.getState();
    expect(state.error).toBe(INTERACTIVE_SESSION_STORAGE_UNAVAILABLE_MESSAGE);
    expect(state.interactiveSession).toBeNull();
  });

  it('keeps the demo fast-path without consulting match-log recovery', async () => {
    const get = jest.fn(() => ({ session: null }));
    const set = jest.fn();
    const loadDemo = jest.fn();
    const recover = jest.fn();

    await loadSessionLogic(
      'demo',
      get as never,
      set as never,
      loadDemo,
      recover,
    );

    expect(loadDemo).toHaveBeenCalledTimes(1);
    expect(recover).not.toHaveBeenCalled();
  });

  it('keeps already-loaded sessions idempotent without rebuilding from storage', async () => {
    const get = jest.fn(() => ({
      session: { id: 'sess_loaded' } as IGameSession,
    }));
    const set = jest.fn();
    const loadDemo = jest.fn();
    const recover = jest.fn();

    await loadSessionLogic(
      'sess_loaded',
      get as never,
      set as never,
      loadDemo,
      recover,
    );

    expect(set).toHaveBeenCalledWith({ isLoading: false, error: null });
    expect(loadDemo).not.toHaveBeenCalled();
    expect(recover).not.toHaveBeenCalled();
  });
});
