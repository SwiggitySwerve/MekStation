/**
 * useHexMapStateFromEvents — unit tests covering all 7 spec scenarios
 * from `add-replay-viewer-from-ndjson` (combat-analytics delta — Replay
 * State-From-Events Reducer Contract) plus edge cases (idempotence,
 * backward seek, mid-cursor exclusion, multi-unit damage isolation).
 *
 * Tests target the pure `deriveHexMapStateFromEvents` function so the
 * assertions don't have to render a React tree. The hook wrapper
 * `useHexMapStateFromEvents` is just `useMemo(() => derive(...))`, so
 * coverage on `derive` is the load-bearing regression net.
 */

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  ArmorPipState,
  IDamageAppliedPayload,
  IGameCreatedPayload,
  IGameEvent,
  IGameUnit,
  IHexTerrain,
  ILocationDestroyedPayload,
  IMechToken,
  IMovementDeclaredPayload,
  ITerrainChangedPayload,
  IUnitToken,
  IUnitDestroyedPayload,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { logger } from '@/utils/logger';

import { deriveHexMapStateFromEvents } from '../useHexMapStateFromEvents';

// =============================================================================
// Fixture helpers
// =============================================================================

/**
 * Build a synthetic `IGameUnit` for `GameCreated` payloads. Defaults to
 * a generic mech-like unit so tests that don't care about variant get a
 * Mech token by default.
 */
function makeUnit(
  overrides: Partial<IGameUnit> & Pick<IGameUnit, 'id' | 'name' | 'side'>,
): IGameUnit {
  return {
    unitRef: 'atlas-as7-d',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

/**
 * Build a sequenced game event with sensible envelope defaults.
 */
function makeEvent(
  overrides: Partial<IGameEvent> &
    Pick<IGameEvent, 'type' | 'payload' | 'sequence'>,
): IGameEvent {
  return {
    id: `evt-${overrides.sequence}`,
    gameId: 'test-game',
    timestamp: '2026-05-07T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.Movement,
    side: GameSide.Player,
    ...overrides,
  };
}

/**
 * Standard `GameCreated` event with a 2-unit roster (one player + one
 * opponent) and `mapRadius: 17`. Used as the seed for most scenarios.
 */
function makeStandardGameCreatedEvent(): IGameEvent {
  const payload: IGameCreatedPayload = {
    config: {
      mapRadius: 17,
      turnLimit: 0,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    units: [
      makeUnit({ id: 'player-1', name: 'Atlas AS7-D', side: GameSide.Player }),
      makeUnit({
        id: 'opponent-2',
        name: 'Stalker STK-3F',
        side: GameSide.Opponent,
      }),
    ],
  };
  return makeEvent({
    sequence: 0,
    type: GameEventType.GameCreated,
    payload,
  });
}

function requireMechToken(
  token: IUnitToken | undefined,
  unitId: string,
): IMechToken {
  expect(token?.unitType).toBe(TokenUnitType.Mech);

  if (token?.unitType !== TokenUnitType.Mech) {
    throw new Error(`Expected ${unitId} to be a Mech token`);
  }

  return token;
}

function requireHumanoidArmorPipState(
  state: ArmorPipState | undefined,
): Extract<ArmorPipState, { readonly archetype: 'humanoid' }> {
  expect(state?.archetype).toBe('humanoid');

  if (state?.archetype !== 'humanoid') {
    throw new Error('Expected humanoid armor pip state');
  }

  return state;
}

// =============================================================================
// Spec scenarios
// =============================================================================

describe('deriveHexMapStateFromEvents', () => {
  describe('spec scenario: GameCreated seeds tokens and mapRadius', () => {
    it('seeds one token per unit and reads mapRadius from payload.config', () => {
      const events: IGameEvent[] = [makeStandardGameCreatedEvent()];

      const state = deriveHexMapStateFromEvents(events, 0);

      expect(state.tokens).toHaveLength(2);
      expect(state.tokens[0].unitId).toBe('player-1');
      expect(state.tokens[1].unitId).toBe('opponent-2');
      expect(state.mapRadius).toBe(17);
    });

    it('defaults each fresh token to Mech variant when unitType is unset', () => {
      const events: IGameEvent[] = [makeStandardGameCreatedEvent()];
      const state = deriveHexMapStateFromEvents(events, 0);
      expect(state.tokens[0].unitType).toBe(TokenUnitType.Mech);
    });

    it('places fresh tokens at origin with Facing.North until corrected', () => {
      const events: IGameEvent[] = [makeStandardGameCreatedEvent()];
      const state = deriveHexMapStateFromEvents(events, 0);
      expect(state.tokens[0].position).toEqual({ q: 0, r: 0 });
      expect(state.tokens[0].facing).toBe(Facing.North);
    });

    it('seeds initial terrain and elevation from payload.hexTerrain', () => {
      const hexTerrain: readonly IHexTerrain[] = [
        {
          coordinate: { q: 1, r: 0 },
          elevation: 2,
          features: [{ type: TerrainType.HeavyWoods, level: 1 }],
        },
      ];
      const gameCreated = makeStandardGameCreatedEvent();
      const payload = gameCreated.payload as IGameCreatedPayload;
      const events: IGameEvent[] = [
        {
          ...gameCreated,
          payload: { ...payload, hexTerrain },
        },
      ];

      const state = deriveHexMapStateFromEvents(events, 0);

      expect(state.hexTerrain).toEqual(hexTerrain);
    });
  });

  describe('spec scenario: MovementDeclared updates position and facing for the actor', () => {
    it('updates position to payload.to and facing to payload.facing on the actor token', () => {
      const movementPayload: IMovementDeclaredPayload = {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 3, r: 5 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        mpUsed: 3,
        heatGenerated: 0,
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.MovementDeclared,
          payload: movementPayload,
          actorId: 'player-1',
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 1);

      const playerToken = state.tokens.find((t) => t.unitId === 'player-1');
      expect(playerToken?.position).toEqual({ q: 3, r: 5 });
      expect(playerToken?.facing).toBe(Facing.Southeast);
    });

    it("does not affect other units' positions", () => {
      const movementPayload: IMovementDeclaredPayload = {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 3, r: 5 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        mpUsed: 3,
        heatGenerated: 0,
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.MovementDeclared,
          payload: movementPayload,
          actorId: 'player-1',
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 1);

      const opponentToken = state.tokens.find((t) => t.unitId === 'opponent-2');
      expect(opponentToken?.position).toEqual({ q: 0, r: 0 });
      expect(opponentToken?.facing).toBe(Facing.North);
    });
  });

  describe('spec scenario: UnitDestroyed flips isDestroyed', () => {
    it('flips isDestroyed for the destroyed unit only', () => {
      const destroyPayload: IUnitDestroyedPayload = {
        unitId: 'player-1',
        cause: 'damage',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.UnitDestroyed,
          payload: destroyPayload,
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 1);

      expect(
        state.tokens.find((t) => t.unitId === 'player-1')?.isDestroyed,
      ).toBe(true);
      expect(
        state.tokens.find((t) => t.unitId === 'opponent-2')?.isDestroyed,
      ).toBe(false);
    });
  });

  describe('spec scenario: TerrainChanged projects hexTerrain', () => {
    it('adds terrain at or before the cursor and excludes it before the event sequence', () => {
      const terrainPayload: ITerrainChangedPayload = {
        hex: { q: 2, r: -1 },
        terrain: TerrainType.Rough,
        elevation: 1,
        previousTerrain: TerrainType.Clear,
        previousElevation: 0,
        reason: 'battlefield_wreckage',
        sourceEventId: 'destroyed-event',
        sourceUnitId: 'player-1',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.TerrainChanged,
          payload: terrainPayload,
        }),
      ];

      const beforeTerrain = deriveHexMapStateFromEvents(events, 0);
      const afterTerrain = deriveHexMapStateFromEvents(events, 1);

      expect(beforeTerrain.hexTerrain).toEqual([]);
      expect(afterTerrain.hexTerrain).toEqual([
        {
          coordinate: { q: 2, r: -1 },
          elevation: 1,
          features: [{ type: TerrainType.Rough, level: 1 }],
        },
      ]);
    });
  });

  describe('spec scenario: LocationDestroyed on CT flips isDestroyed', () => {
    it("flips isDestroyed when payload.location === 'CT'", () => {
      const ctPayload: ILocationDestroyedPayload = {
        unitId: 'player-1',
        location: 'CT',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.LocationDestroyed,
          payload: ctPayload,
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 1);

      expect(
        state.tokens.find((t) => t.unitId === 'player-1')?.isDestroyed,
      ).toBe(true);
    });

    it('does NOT flip isDestroyed for non-CT locations', () => {
      const armPayload: ILocationDestroyedPayload = {
        unitId: 'player-1',
        location: 'LA',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.LocationDestroyed,
          payload: armPayload,
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 1);

      expect(
        state.tokens.find((t) => t.unitId === 'player-1')?.isDestroyed,
      ).toBe(false);
    });
  });

  describe('spec scenario: Cursor truncation excludes events beyond currentSequence', () => {
    it('applies movement at sequence 1 but not destruction at sequence 2', () => {
      const movementPayload: IMovementDeclaredPayload = {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 2, r: 2 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        mpUsed: 2,
        heatGenerated: 0,
      };
      const destroyPayload: IUnitDestroyedPayload = {
        unitId: 'player-1',
        cause: 'damage',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.MovementDeclared,
          payload: movementPayload,
          actorId: 'player-1',
        }),
        makeEvent({
          sequence: 2,
          type: GameEventType.UnitDestroyed,
          payload: destroyPayload,
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 1);

      const playerToken = state.tokens.find((t) => t.unitId === 'player-1');
      expect(playerToken?.position).toEqual({ q: 2, r: 2 });
      expect(playerToken?.isDestroyed).toBe(false);
    });
  });

  describe('spec scenario: Backward cursor seek returns correct earlier state', () => {
    it('re-running with a smaller cursor strips later mutations', () => {
      const move1Payload: IMovementDeclaredPayload = {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 2, r: 2 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        mpUsed: 2,
        heatGenerated: 0,
      };
      const move2Payload: IMovementDeclaredPayload = {
        unitId: 'player-1',
        from: { q: 2, r: 2 },
        to: { q: 5, r: 5 },
        facing: Facing.South,
        movementType: MovementType.Walk,
        mpUsed: 3,
        heatGenerated: 0,
      };
      const destroyPayload: IUnitDestroyedPayload = {
        unitId: 'player-1',
        cause: 'damage',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.MovementDeclared,
          payload: move1Payload,
          actorId: 'player-1',
        }),
        makeEvent({
          sequence: 2,
          type: GameEventType.MovementDeclared,
          payload: move2Payload,
          actorId: 'player-1',
        }),
        makeEvent({
          sequence: 3,
          type: GameEventType.UnitDestroyed,
          payload: destroyPayload,
        }),
      ];

      const stateAt5 = deriveHexMapStateFromEvents(events, 5);
      const stateAt2 = deriveHexMapStateFromEvents(events, 2);

      // Backward seek to cursor=2 must equal the state of walking 0..2
      // from scratch — destruction at sequence 3 must be absent.
      const playerAt2 = stateAt2.tokens.find((t) => t.unitId === 'player-1');
      expect(playerAt2?.position).toEqual({ q: 5, r: 5 });
      expect(playerAt2?.isDestroyed).toBe(false);

      // Sanity: at cursor=5 the destroy IS applied.
      const playerAt5 = stateAt5.tokens.find((t) => t.unitId === 'player-1');
      expect(playerAt5?.isDestroyed).toBe(true);
    });
  });

  describe('spec scenario: Truly empty event log returns empty defaults', () => {
    it('returns { tokens: [], hexTerrain: [], mapRadius: 0 } for an empty events array', () => {
      const events: IGameEvent[] = [];

      const state = deriveHexMapStateFromEvents(events, 100);

      expect(state.tokens).toEqual([]);
      expect(state.hexTerrain).toEqual([]);
      expect(state.mapRadius).toBe(0);
    });
  });

  describe('spec scenario: Lossy fallback synthesizes tokens for legacy NDJSON without GameCreated', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('synthesizes Mech-default tokens from actorIds when no GameCreated is present', () => {
      const movementPayload1: IMovementDeclaredPayload = {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 2, r: 2 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        mpUsed: 2,
        heatGenerated: 0,
      };
      const movementPayload2: IMovementDeclaredPayload = {
        unitId: 'opponent-2',
        from: { q: 5, r: 5 },
        to: { q: 6, r: 6 },
        facing: Facing.North,
        movementType: MovementType.Walk,
        mpUsed: 1,
        heatGenerated: 0,
      };
      const events: IGameEvent[] = [
        makeEvent({
          sequence: 0,
          type: GameEventType.MovementDeclared,
          payload: movementPayload1,
          actorId: 'player-1',
        }),
        makeEvent({
          sequence: 1,
          type: GameEventType.MovementDeclared,
          payload: movementPayload2,
          actorId: 'opponent-2',
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 100);

      const ids = state.tokens.map((t) => t.unitId).sort();
      expect(ids).toEqual(['opponent-2', 'player-1']);
      expect(state.mapRadius).toBe(17);
    });

    it('derives side from id prefix on synthesized tokens', () => {
      const movementPlayer: IMovementDeclaredPayload = {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 2, r: 2 },
        facing: Facing.North,
        movementType: MovementType.Walk,
        mpUsed: 2,
        heatGenerated: 0,
      };
      const movementOpponent: IMovementDeclaredPayload = {
        unitId: 'opponent-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        facing: Facing.South,
        movementType: MovementType.Walk,
        mpUsed: 1,
        heatGenerated: 0,
      };
      const events: IGameEvent[] = [
        makeEvent({
          sequence: 0,
          type: GameEventType.MovementDeclared,
          payload: movementPlayer,
          actorId: 'player-1',
        }),
        makeEvent({
          sequence: 1,
          type: GameEventType.MovementDeclared,
          payload: movementOpponent,
          actorId: 'opponent-1',
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 100);

      const playerToken = state.tokens.find((t) => t.unitId === 'player-1');
      const opponentToken = state.tokens.find((t) => t.unitId === 'opponent-1');
      expect(playerToken?.side).toBe(GameSide.Player);
      expect(opponentToken?.side).toBe(GameSide.Opponent);
      // Per spec: synthesized tokens default to Mech variant.
      expect(playerToken?.unitType).toBe(TokenUnitType.Mech);
    });

    it('emits a single warning signaling the fallback path activated', () => {
      const movementPayload: IMovementDeclaredPayload = {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 2, r: 2 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        mpUsed: 2,
        heatGenerated: 0,
      };
      const events: IGameEvent[] = [
        makeEvent({
          sequence: 0,
          type: GameEventType.MovementDeclared,
          payload: movementPayload,
          actorId: 'player-1',
        }),
      ];

      deriveHexMapStateFromEvents(events, 100);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('No GameCreated event found');
    });

    it('subsequent MovementDeclared still updates the synthesized token', () => {
      const movement: IMovementDeclaredPayload = {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 5, r: 5 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        mpUsed: 5,
        heatGenerated: 0,
      };
      const events: IGameEvent[] = [
        makeEvent({
          sequence: 0,
          type: GameEventType.MovementDeclared,
          payload: movement,
          actorId: 'player-1',
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 100);

      const token = state.tokens.find((t) => t.unitId === 'player-1');
      expect(token?.position).toEqual({ q: 5, r: 5 });
      expect(token?.facing).toBe(Facing.Southeast);
    });
  });

  describe('spec scenario: Idempotent on repeated invocation', () => {
    it('produces structurally equivalent results on repeated invocation', () => {
      const movementPayload: IMovementDeclaredPayload = {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 2, r: 2 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        mpUsed: 2,
        heatGenerated: 0,
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.MovementDeclared,
          payload: movementPayload,
          actorId: 'player-1',
        }),
      ];

      const a = deriveHexMapStateFromEvents(events, 1);
      const b = deriveHexMapStateFromEvents(events, 1);

      // Deep-equal across both calls. Reference identity is NOT
      // expected since `derive` is the bare projection (memoization
      // happens in the React-hook wrapper).
      expect(a).toEqual(b);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases beyond the spec scenarios
  // ---------------------------------------------------------------------------

  describe('edge case: DamageApplied without locationDestroyed leaves isDestroyed false', () => {
    it('treats armor-only damage as a no-op for token isDestroyed', () => {
      const damagePayload: IDamageAppliedPayload = {
        unitId: 'player-1',
        location: 'CT',
        damage: 5,
        armorRemaining: 10,
        structureRemaining: 20,
        locationDestroyed: false,
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.DamageApplied,
          payload: damagePayload,
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 1);

      expect(
        state.tokens.find((t) => t.unitId === 'player-1')?.isDestroyed,
      ).toBe(false);
    });
  });

  describe('edge case: out-of-band event types pass through silently', () => {
    it('does not mutate any token when an unhandled event type is encountered', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        // Phase change event is not a covered family — must pass through.
        makeEvent({
          sequence: 1,
          type: GameEventType.PhaseChanged,
          payload: {
            fromPhase: GamePhase.Movement,
            toPhase: GamePhase.WeaponAttack,
          } as never,
        }),
      ];

      const stateBefore = deriveHexMapStateFromEvents(events, 0);
      const stateAfter = deriveHexMapStateFromEvents(events, 1);

      expect(stateAfter.tokens).toEqual(stateBefore.tokens);
      expect(stateAfter.mapRadius).toBe(stateBefore.mapRadius);
    });
  });

  describe('edge case: cursor at MAX_SAFE_INTEGER applies all events', () => {
    it('walks the entire log when cursor exceeds the max sequence', () => {
      const destroyPayload: IUnitDestroyedPayload = {
        unitId: 'player-1',
        cause: 'damage',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 5,
          type: GameEventType.UnitDestroyed,
          payload: destroyPayload,
        }),
      ];

      const state = deriveHexMapStateFromEvents(
        events,
        Number.MAX_SAFE_INTEGER,
      );

      expect(
        state.tokens.find((t) => t.unitId === 'player-1')?.isDestroyed,
      ).toBe(true);
    });
  });

  describe('edge case: multi-unit damage isolation', () => {
    it('destroying one unit leaves the other intact', () => {
      const destroyPayload: IUnitDestroyedPayload = {
        unitId: 'opponent-2',
        cause: 'ammo_explosion',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.UnitDestroyed,
          payload: destroyPayload,
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 1);

      expect(
        state.tokens.find((t) => t.unitId === 'player-1')?.isDestroyed,
      ).toBe(false);
      expect(
        state.tokens.find((t) => t.unitId === 'opponent-2')?.isDestroyed,
      ).toBe(true);
    });
  });

  // ===========================================================================
  // add-replay-timeline-markers — ComponentDestroyed + CriticalHitResolved
  // populate IMechToken.armorPipState
  // ===========================================================================

  describe('spec scenario: ComponentDestroyed populates Mech armorPipState', () => {
    it('humanoid Mech: actuator on LA → leftArm transitions to structure', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.ComponentDestroyed,
          actorId: 'opponent-2',
          payload: {
            unitId: 'player-1',
            location: 'LA',
            componentType: 'actuator',
            slotIndex: 0,
          },
        }),
      ];
      const state = deriveHexMapStateFromEvents(events, 1);
      const mech = requireMechToken(
        state.tokens.find((t) => t.unitId === 'player-1'),
        'player-1',
      );
      // armorPipState should be populated.
      const pipState = requireHumanoidArmorPipState(mech.armorPipState);
      expect(pipState.locations.leftArm).toBe('structure');
      // All other locations remain 'full'.
      expect(pipState.locations.head).toBe('full');
      expect(pipState.locations.rightArm).toBe('full');
      expect(pipState.locations.centerTorso).toBe('full');
    });
  });

  describe('spec scenario: First non-internal damage transitions full → partial', () => {
    it('armor componentType on RT → rightTorso becomes partial', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.ComponentDestroyed,
          payload: {
            unitId: 'player-1',
            location: 'RT',
            componentType: 'armor',
            slotIndex: 0,
          },
        }),
      ];
      const state = deriveHexMapStateFromEvents(events, 1);
      const mech = requireMechToken(
        state.tokens.find((t) => t.unitId === 'player-1'),
        'player-1',
      );
      const pipState = requireHumanoidArmorPipState(mech.armorPipState);
      expect(pipState.locations.rightTorso).toBe('partial');
    });
  });

  describe('spec scenario: LocationDestroyed plus ComponentDestroyed transitions to destroyed', () => {
    it('LL: LocationDestroyed at seq 5 + ComponentDestroyed at seq 10 → leftLeg destroyed', () => {
      const locDestroyedPayload: ILocationDestroyedPayload = {
        unitId: 'player-1',
        location: 'LL',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 5,
          type: GameEventType.LocationDestroyed,
          payload: locDestroyedPayload,
        }),
        makeEvent({
          sequence: 10,
          type: GameEventType.ComponentDestroyed,
          payload: {
            unitId: 'player-1',
            location: 'LL',
            componentType: 'actuator',
            slotIndex: 0,
          },
        }),
      ];
      const state = deriveHexMapStateFromEvents(events, 10);
      const mech = requireMechToken(
        state.tokens.find((t) => t.unitId === 'player-1'),
        'player-1',
      );
      const pipState = requireHumanoidArmorPipState(mech.armorPipState);
      expect(pipState.locations.leftLeg).toBe('destroyed');
    });
  });

  describe('spec scenario: ComponentDestroyed on a vehicle is a no-op', () => {
    it('vehicle token has no armorPipState and reducer does not throw', () => {
      const vehiclePayload: IGameCreatedPayload = {
        config: {
          mapRadius: 17,
          turnLimit: 0,
          victoryConditions: ['destruction'],
          optionalRules: [],
        },
        units: [
          {
            id: 'tank-1',
            name: 'Test Tank',
            side: GameSide.Player,
            unitRef: 'tank-ref',
            pilotRef: 'pilot-tank',
            gunnery: 4,
            piloting: 5,
            // Force Vehicle path explicitly. UnitType.VEHICLE === 'Vehicle'.
            unitType: UnitType.VEHICLE,
          },
        ],
      };
      const events: IGameEvent[] = [
        makeEvent({
          sequence: 0,
          type: GameEventType.GameCreated,
          payload: vehiclePayload,
        }),
        makeEvent({
          sequence: 1,
          type: GameEventType.ComponentDestroyed,
          payload: {
            unitId: 'tank-1',
            location: 'turret',
            componentType: 'weapon',
            slotIndex: 0,
          },
        }),
      ];
      // Must not throw.
      const state = deriveHexMapStateFromEvents(events, 1);
      const tank = state.tokens.find((t) => t.unitId === 'tank-1');
      expect(tank).toBeDefined();
      expect(tank?.unitType).toBe(TokenUnitType.Vehicle);
      expect('armorPipState' in (tank ?? {})).toBe(false);
    });
  });

  describe('spec scenario: CriticalHitResolved follows the same projection rules', () => {
    it('engine on CT (internal) → centerTorso transitions to structure', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.CriticalHitResolved,
          payload: {
            unitId: 'player-1',
            location: 'CT',
            slotIndex: 0,
            componentType: 'engine',
            componentName: 'Engine',
            effect: 'destroyed',
            destroyed: true,
          },
        }),
      ];
      const state = deriveHexMapStateFromEvents(events, 1);
      const mech = requireMechToken(
        state.tokens.find((t) => t.unitId === 'player-1'),
        'player-1',
      );
      const pipState = requireHumanoidArmorPipState(mech.armorPipState);
      expect(pipState.locations.centerTorso).toBe('structure');
    });
  });

  // ===========================================================================
  // Audit 2026-06-09 G (W5.1b) — posture-as-movement events must reach the
  // replay token projection. Live play commits voluntary posture changes as
  // `MovementDeclared` payload flags / steps (see `goProneActiveUnitLogic` /
  // `standActiveUnitLogic` in `useGameplayStore.combatFlows.ts`), and the
  // authoritative state reducer derives prone in `applyMovementDeclared`
  // (`src/utils/gameplay/gameState/actionLocking.ts`). The replay reducer
  // mirrors that derivation and projects it onto `IUnitToken.isProne`.
  // ===========================================================================

  describe('posture-as-movement: MovementDeclared posture flags project isProne', () => {
    /** Same-hex Stationary move carrying posture flags, like live play emits. */
    function postureMovementEvent(
      sequence: number,
      payload: Partial<IMovementDeclaredPayload> &
        Pick<IMovementDeclaredPayload, 'unitId'>,
    ): IGameEvent {
      const fullPayload: IMovementDeclaredPayload = {
        from: { q: 0, r: 0 },
        to: { q: 0, r: 0 },
        facing: Facing.North,
        movementType: MovementType.Stationary,
        mpUsed: 0,
        heatGenerated: 0,
        ...payload,
      };
      return makeEvent({
        sequence,
        type: GameEventType.MovementDeclared,
        payload: fullPayload,
        actorId: payload.unitId,
      });
    }

    function tokenFor(
      events: readonly IGameEvent[],
      cursor: number,
      unitId: string,
    ): IUnitToken | undefined {
      return deriveHexMapStateFromEvents(events, cursor).tokens.find(
        (t) => t.unitId === unitId,
      );
    }

    it('voluntary go-prone (goProneAttempt) renders the token prone from that cursor onward', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        postureMovementEvent(1, { unitId: 'player-1', goProneAttempt: true }),
      ];

      expect(tokenFor(events, 0, 'player-1')?.isProne).toBe(false);
      expect(tokenFor(events, 1, 'player-1')?.isProne).toBe(true);
    });

    it('goProne step in payload.steps renders the token prone (runner step chain)', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        postureMovementEvent(1, {
          unitId: 'player-1',
          steps: [{ kind: 'goProne', index: 0, at: { q: 0, r: 0 }, mpCost: 1 }],
        }),
      ];

      expect(tokenFor(events, 1, 'player-1')?.isProne).toBe(true);
    });

    it('successful stand-up clears prone again; cursor before the stand-up still shows prone', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        postureMovementEvent(1, { unitId: 'player-1', goProneAttempt: true }),
        postureMovementEvent(2, {
          unitId: 'player-1',
          movementType: MovementType.Walk,
          standUpAttempt: true,
          standUpSucceeded: true,
          mpUsed: 2,
        }),
      ];

      expect(tokenFor(events, 1, 'player-1')?.isProne).toBe(true);
      expect(tokenFor(events, 2, 'player-1')?.isProne).toBe(false);
    });

    it('failed stand-up attempt leaves the token prone', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        postureMovementEvent(1, { unitId: 'player-1', goProneAttempt: true }),
        postureMovementEvent(2, {
          unitId: 'player-1',
          standUpAttempt: true,
          standUpSucceeded: false,
          mpUsed: 2,
        }),
      ];

      expect(tokenFor(events, 2, 'player-1')?.isProne).toBe(true);
    });

    it('hull-down entry does not mark the token prone', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        postureMovementEvent(1, {
          unitId: 'player-1',
          hullDownEntryAttempt: true,
        }),
      ];

      expect(tokenFor(events, 1, 'player-1')?.isProne).toBe(false);
    });

    it('UnitFell marks the token prone and UnitStood clears it (projection pin)', () => {
      // Pins the previously write-only accumulator prone state: before the
      // W5.1b fix, UnitFell/UnitStood mutated the accumulator but the token
      // never carried the result.
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.UnitFell,
          payload: {
            unitId: 'player-1',
            fallDamage: 5,
            newFacing: Facing.South,
            pilotDamage: 0,
          } as never,
        }),
        makeEvent({
          sequence: 2,
          type: GameEventType.UnitStood,
          payload: {
            unitId: 'player-1',
            turn: 2,
            roll: 8,
            targetNumber: 6,
          } as never,
        }),
      ];

      expect(tokenFor(events, 1, 'player-1')?.isProne).toBe(true);
      expect(tokenFor(events, 2, 'player-1')?.isProne).toBe(false);
    });

    it('ordinary movement by a fallen unit without posture flags renders standing (legacy mirror)', () => {
      // Mirrors the applyMovementDeclared fallback branch: a prone unit that
      // commits a non-stationary move with no stand-up flags is treated as
      // standing (legacy event streams predating posture flags).
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.UnitFell,
          payload: {
            unitId: 'player-1',
            fallDamage: 5,
            newFacing: Facing.South,
            pilotDamage: 0,
          } as never,
        }),
        postureMovementEvent(2, {
          unitId: 'player-1',
          movementType: MovementType.Walk,
          to: { q: 1, r: 0 },
          mpUsed: 1,
        }),
      ];

      expect(tokenFor(events, 2, 'player-1')?.isProne).toBe(false);
    });
  });

  describe('edge case: unrecognized location code is silently ignored', () => {
    it('does not throw and does not allocate armorPipState', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.ComponentDestroyed,
          payload: {
            unitId: 'player-1',
            location: 'UNKNOWN_LOC',
            componentType: 'actuator',
            slotIndex: 0,
          },
        }),
      ];
      const state = deriveHexMapStateFromEvents(events, 1);
      const mech = requireMechToken(
        state.tokens.find((t) => t.unitId === 'player-1'),
        'player-1',
      );
      expect(mech.armorPipState).toBeUndefined();
    });
  });
});
