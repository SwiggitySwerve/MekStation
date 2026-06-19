import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IDamageAppliedPayload,
  IGameCreatedPayload,
  IGameEvent,
  IHexTerrain,
  ILocationDestroyedPayload,
  IMovementDeclaredPayload,
  ITerrainChangedPayload,
  IUnitDestroyedPayload,
  IUnitToken,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { logger } from '@/utils/logger';

import { deriveHexMapStateFromEvents } from '../useHexMapStateFromEvents';
import {
  makeEvent,
  makeStandardGameCreatedEvent,
  requireHumanoidArmorPipState,
  requireMechToken,
} from './useHexMapStateFromEvents.test-helpers';

describe('deriveHexMapStateFromEvents core scenarios', () => {
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
});
