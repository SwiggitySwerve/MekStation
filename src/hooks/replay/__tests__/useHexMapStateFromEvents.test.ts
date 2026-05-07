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
  IDamageAppliedPayload,
  IGameCreatedPayload,
  IGameEvent,
  IGameUnit,
  ILocationDestroyedPayload,
  IMovementDeclaredPayload,
  IUnitDestroyedPayload,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';

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
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
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

    it('emits a single console.warn signaling the fallback path activated', () => {
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
});
