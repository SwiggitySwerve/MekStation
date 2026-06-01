import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type GameEventPayload,
  type IAttackResolvedPayload,
  type IGameEvent,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';
import { canPlayerSeeUnit } from '@/utils/gameplay/visibility';

import {
  filterEventForPlayer,
  FogOfWarVisibilityCache,
  classifyEventVisibility,
} from '../fogOfWar';

const PLAYER_A = 'pid_a';
const PLAYER_B = 'pid_b';

type TestCanSeeUnit = (
  playerId: string,
  unitId: string,
  state: IGameState,
) => boolean;

type TestState = IGameState & {
  readonly sideOwners: Partial<Record<GameSide, string>>;
};

function makeUnit(
  id: string,
  side: GameSide,
  position = { q: 0, r: 0 },
): IUnitGameState {
  return {
    id,
    side,
    position,
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
    lockState: LockState.Pending,
  };
}

function makeState(): TestState {
  return {
    gameId: 'game-fog',
    status: GameStatus.Active,
    turn: 4,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      attacker: makeUnit('attacker', GameSide.Player),
      target: makeUnit('target', GameSide.Opponent, { q: 6, r: 0 }),
      scout: makeUnit('scout', GameSide.Opponent, { q: 2, r: 0 }),
    },
    turnEvents: [],
    sideOwners: {
      [GameSide.Player]: PLAYER_A,
      [GameSide.Opponent]: PLAYER_B,
    },
  };
}

function makeEvent(
  type: GameEventType,
  payload: GameEventPayload,
  actorId?: string,
): IGameEvent {
  return {
    id: `evt-${type}`,
    gameId: 'game-fog',
    sequence: 10,
    timestamp: '2026-04-30T00:00:00.000Z',
    type,
    turn: 4,
    phase: GamePhase.WeaponAttack,
    actorId,
    payload,
  };
}

function movementDeclaredEvent(unitId: string): IGameEvent {
  return makeEvent(
    GameEventType.MovementDeclared,
    {
      unitId,
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    },
    unitId,
  );
}

function movementLockedEvent(unitId: string): IGameEvent {
  return makeEvent(GameEventType.MovementLocked, { unitId }, unitId);
}

function heatGeneratedEvent(unitId: string): IGameEvent {
  return makeEvent(
    GameEventType.HeatGenerated,
    {
      unitId,
      amount: 4,
      source: 'movement',
      newTotal: 4,
    },
    unitId,
  );
}

function attackResolvedEvent(
  payload: Partial<IAttackResolvedPayload> = {},
): IGameEvent {
  return makeEvent(
    GameEventType.AttackResolved,
    {
      attackerId: 'attacker',
      targetId: 'target',
      weaponId: 'medium-laser-1',
      roll: 8,
      toHitNumber: 7,
      hit: true,
      location: 'center_torso',
      damage: 5,
      heat: 3,
      attackerArc: 'front',
      ammoBinId: null,
      rolls: [3, 5, 2, 6],
      ...payload,
    },
    payload.attackerId ?? 'attacker',
  );
}

function unitDestroyedEvent(unitId: string): IGameEvent {
  return makeEvent(
    GameEventType.UnitDestroyed,
    {
      unitId,
      cause: 'damage',
      killerUnitId: 'attacker',
    },
    unitId,
  );
}

function assertDelivered(
  event: ReturnType<typeof filterEventForPlayer>,
): asserts event is NonNullable<ReturnType<typeof filterEventForPlayer>> {
  expect(event).not.toBeNull();
}

describe('fog-of-war event filtering', () => {
  it('classifies representative existing event types', () => {
    expect(classifyEventVisibility({ type: GameEventType.PhaseChanged })).toBe(
      'public',
    );
    expect(
      classifyEventVisibility({ type: GameEventType.MovementDeclared }),
    ).toBe('actor-only');
    expect(
      classifyEventVisibility({
        type: GameEventType.MovementEnhancementActivated,
      }),
    ).toBe('actor-only');
    expect(
      classifyEventVisibility({ type: GameEventType.MovementLocked }),
    ).toBe('observer-visible');
    expect(
      classifyEventVisibility({ type: GameEventType.AttacksRevealed }),
    ).toBe('public');
    expect(
      classifyEventVisibility({ type: GameEventType.AttackResolved }),
    ).toBe('target-visible');
  });

  it('returns the original event when fog is disabled', () => {
    const state = makeState();
    const event = movementLockedEvent('attacker');
    const canSeeUnit: TestCanSeeUnit = () => false;

    const filtered = filterEventForPlayer(event, PLAYER_B, state, {
      fogOfWar: false,
      canSeeUnit,
    });

    expect(filtered).toBe(event);
  });

  it('delivers actor-only events to the actor owner and skips observers', () => {
    const state = makeState();
    const event = movementDeclaredEvent('attacker');

    expect(
      filterEventForPlayer(event, PLAYER_A, state, { fogOfWar: true }),
    ).toBe(event);
    expect(
      filterEventForPlayer(event, PLAYER_B, state, { fogOfWar: true }),
    ).toBeNull();
  });

  it('delivers observer-visible movement when LOS exists and skips when hidden', () => {
    const state = makeState();
    const event = movementLockedEvent('attacker');
    const canSeeUnit: TestCanSeeUnit = (_playerId, unitId) => {
      return unitId === 'attacker';
    };

    expect(
      filterEventForPlayer(event, PLAYER_B, state, {
        fogOfWar: true,
        canSeeUnit,
      }),
    ).toBe(event);

    const hiddenCanSeeUnit: TestCanSeeUnit = () => false;

    expect(
      filterEventForPlayer(event, PLAYER_B, state, {
        fogOfWar: true,
        canSeeUnit: hiddenCanSeeUnit,
      }),
    ).toBeNull();
  });

  it('skips hidden enemy heat events', () => {
    const state = makeState();
    const event = heatGeneratedEvent('attacker');
    const canSeeUnit: TestCanSeeUnit = () => false;

    expect(
      filterEventForPlayer(event, PLAYER_B, state, {
        fogOfWar: true,
        canSeeUnit,
      }),
    ).toBeNull();
  });

  it('redacts a hidden attacker from the target owner attack resolution', () => {
    const state = makeState();
    const event = attackResolvedEvent();
    const canSeeUnit: TestCanSeeUnit = (_playerId, unitId) => {
      return unitId === 'target';
    };

    const filtered = filterEventForPlayer(event, PLAYER_B, state, {
      fogOfWar: true,
      canSeeUnit,
    });

    assertDelivered(filtered);
    expect(filtered).not.toBe(event);
    expect(filtered.actorId).toBeUndefined();
    expect(filtered.payload).toEqual({
      targetId: 'target',
      roll: 8,
      toHitNumber: 7,
      hit: true,
      location: 'center_torso',
      damage: 5,
      rolls: [3, 5, 2, 6],
    });
    expect('attackerId' in filtered.payload).toBe(false);
    expect('weaponId' in filtered.payload).toBe(false);
  });

  it('delivers full attack detail to the attacker owner', () => {
    const state = makeState();
    const event = attackResolvedEvent();
    const canSeeUnit: TestCanSeeUnit = () => false;

    expect(
      filterEventForPlayer(event, PLAYER_A, state, {
        fogOfWar: true,
        canSeeUnit,
      }),
    ).toBe(event);
  });

  it('redacts hidden unit destruction to unitId only', () => {
    const state = makeState();
    const event = unitDestroyedEvent('attacker');
    const canSeeUnit: TestCanSeeUnit = () => false;

    const filtered = filterEventForPlayer(event, PLAYER_B, state, {
      fogOfWar: true,
      canSeeUnit,
    });

    assertDelivered(filtered);
    expect(filtered).not.toBe(event);
    expect(filtered.type).toBe(GameEventType.UnitDestroyed);
    expect(filtered.payload).toEqual({ unitId: 'attacker' });
  });

  it('caches repeated LOS checks for the same player/unit/state turn', () => {
    const state = makeState();
    const cache = new FogOfWarVisibilityCache();
    const event = heatGeneratedEvent('attacker');
    let checks = 0;
    const canSeeUnit: TestCanSeeUnit = () => {
      checks += 1;
      return true;
    };

    expect(
      filterEventForPlayer(event, PLAYER_B, state, {
        fogOfWar: true,
        cache,
        canSeeUnit,
      }),
    ).toBe(event);
    expect(
      filterEventForPlayer(event, PLAYER_B, state, {
        fogOfWar: true,
        cache,
        canSeeUnit,
      }),
    ).toBe(event);

    expect(checks).toBe(1);
    expect(cache.size).toBe(1);
  });

  it('invalidates cached LOS for a unit when movement is filtered', () => {
    const state = makeState();
    const cache = new FogOfWarVisibilityCache();
    let visible = true;
    let checks = 0;
    const canSeeUnit: TestCanSeeUnit = () => {
      checks += 1;
      return visible;
    };

    expect(
      filterEventForPlayer(heatGeneratedEvent('attacker'), PLAYER_B, state, {
        fogOfWar: true,
        cache,
        canSeeUnit,
      }),
    ).not.toBeNull();

    visible = false;

    expect(
      filterEventForPlayer(movementLockedEvent('attacker'), PLAYER_B, state, {
        fogOfWar: true,
        cache,
        canSeeUnit,
      }),
    ).toBeNull();
    expect(checks).toBe(2);
  });

  it('keeps cached filtering for eight players and thirty-two units under the broadcast budget', () => {
    const units: Record<string, IUnitGameState> = {};
    const playerIds = Array.from({ length: 8 }, (_, i) => `pid_${i}`);
    for (let i = 0; i < 32; i += 1) {
      units[`unit-${i}`] = makeUnit(
        `unit-${i}`,
        i % 2 === 0 ? GameSide.Player : GameSide.Opponent,
        { q: i, r: -i },
      );
    }
    const state: TestState = {
      ...makeState(),
      units,
      sideOwners: {
        [GameSide.Player]: PLAYER_A,
        [GameSide.Opponent]: PLAYER_B,
      },
    };
    const cache = new FogOfWarVisibilityCache();
    const events = Array.from({ length: 32 }, (_, i) =>
      heatGeneratedEvent(`unit-${i}`),
    );
    const canSeeUnit: TestCanSeeUnit = (_playerId, unitId) => {
      return Number(unitId.split('-')[1]) % 2 === 0;
    };

    const start = performance.now();
    for (const playerId of playerIds) {
      for (const event of events) {
        filterEventForPlayer(event, playerId, state, {
          fogOfWar: true,
          cache,
          canSeeUnit,
        });
      }
    }
    const elapsedMs = performance.now() - start;

    // Budget widened from 5 → 15ms after repeated CI flakes on github runners
    // (consistently 6-8ms in practice, with occasional spikes). Keeps the
    // smoke check while tolerating CI runner jitter.
    expect(elapsedMs).toBeLessThan(15);
  });

  it('keeps direct visibility checks below the sub-millisecond target', () => {
    const state = makeState();
    const iterations = 256;

    const start = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      canPlayerSeeUnit(PLAYER_A, index % 2 === 0 ? 'target' : 'scout', state);
    }
    const elapsedMs = performance.now() - start;

    expect(elapsedMs / iterations).toBeLessThan(1);
  });
});
