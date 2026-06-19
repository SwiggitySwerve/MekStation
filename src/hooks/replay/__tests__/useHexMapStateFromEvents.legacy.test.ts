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

describe('deriveHexMapStateFromEvents legacy fallback scenarios', () => {
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
});
