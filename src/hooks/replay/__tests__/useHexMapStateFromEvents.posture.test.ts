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

describe('deriveHexMapStateFromEvents posture scenarios', () => {
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
});
