import {
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  Facing,
  createBattleState,
  createDamageEvent,
  createHeatEvent,
  createTurnEndedEvent,
  type StateCycleDetectorTestContext,
  type IGameEvent,
} from './StateCycleDetector.test-helpers';

export function runStateCycleIntegrationTests({
  getDetector,
}: StateCycleDetectorTestContext): void {
  describe('integration scenarios', () => {
    it('handles complex multi-unit battle with cycles', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
        { id: 'unit-3', name: 'Jagermech', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        // Turn 1: Initial state
        createDamageEvent({
          gameId: 'game-1',
          turn: 1,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 15,
          sequence: 1,
        }),
        createDamageEvent({
          gameId: 'game-1',
          turn: 1,
          unitId: 'unit-2',
          location: 'left_arm',
          armorRemaining: 10,
          structureRemaining: 5,
          sequence: 2,
        }),
        createHeatEvent('game-1', 1, 'unit-3', 15, 3),
        createTurnEndedEvent('game-1', 1, 4),
        // Turn 2: Same state
        createTurnEndedEvent('game-1', 2, 5),
        // Turn 3: Same state
        createTurnEndedEvent('game-1', 3, 6),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(
        (anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-1'],
      ).toEqual({
        center_torso: 20,
      });
      expect(
        (anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-2'],
      ).toEqual({
        left_arm: 10,
      });
    });

    it('handles rapid state changes followed by cycle', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        // Rapid changes
        createDamageEvent({
          gameId: 'game-1',
          turn: 1,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 15,
          sequence: 1,
        }),
        createTurnEndedEvent('game-1', 1, 2),
        createDamageEvent({
          gameId: 'game-1',
          turn: 2,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 19,
          structureRemaining: 14,
          sequence: 3,
        }),
        createTurnEndedEvent('game-1', 2, 4),
        createDamageEvent({
          gameId: 'game-1',
          turn: 3,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 18,
          structureRemaining: 13,
          sequence: 5,
        }),
        createTurnEndedEvent('game-1', 3, 6),
        // Then cycle
        createTurnEndedEvent('game-1', 4, 7),
        createTurnEndedEvent('game-1', 5, 8),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(5);
    });
  });

  describe('PT-001: position-aware cycle detection', () => {
    const createMovementEventWithPosition = (
      gameId: string,
      turn: number,
      unitId: string,
      to: { q: number; r: number },
      sequence: number = 1,
    ): IGameEvent => ({
      id: `event-movement-${sequence}`,
      gameId,
      sequence,
      timestamp: new Date().toISOString(),
      type: GameEventType.MovementDeclared,
      turn,
      phase: GamePhase.Movement,
      actorId: unitId,
      payload: {
        unitId,
        from: { q: 0, r: 0 },
        to,
        facing: Facing.North,
        movementType: MovementType.Walk,
        mpUsed: 1,
        heatGenerated: 0,
      },
    });

    it('does NOT register a cycle when units repositioned between identical heat/damage snapshots', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      // Same damage + heat across 4 turns, but unit moves to a new hex each
      // turn — pre-PT-001 this would trigger a cycle anomaly; post-fix it
      // should not (real progress).
      const events: IGameEvent[] = [
        createDamageEvent({
          gameId: 'game-1',
          turn: 1,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 15,
          sequence: 1,
        }),
        createHeatEvent('game-1', 1, 'unit-1', 5, 2),
        createMovementEventWithPosition(
          'game-1',
          1,
          'unit-1',
          { q: 1, r: 0 },
          3,
        ),
        createTurnEndedEvent('game-1', 1, 4),

        createMovementEventWithPosition(
          'game-1',
          2,
          'unit-1',
          { q: 2, r: 0 },
          5,
        ),
        createTurnEndedEvent('game-1', 2, 6),

        createMovementEventWithPosition(
          'game-1',
          3,
          'unit-1',
          { q: 3, r: 0 },
          7,
        ),
        createTurnEndedEvent('game-1', 3, 8),

        createMovementEventWithPosition(
          'game-1',
          4,
          'unit-1',
          { q: 4, r: 0 },
          9,
        ),
        createTurnEndedEvent('game-1', 4, 10),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('DOES register a cycle when units stay at the same position with identical heat/damage', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      // Same damage + heat + same position across 4 turns — genuine cycle.
      const events: IGameEvent[] = [
        createDamageEvent({
          gameId: 'game-1',
          turn: 1,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 15,
          sequence: 1,
        }),
        createHeatEvent('game-1', 1, 'unit-1', 5, 2),
        createMovementEventWithPosition(
          'game-1',
          1,
          'unit-1',
          { q: 5, r: 5 },
          3,
        ),
        createTurnEndedEvent('game-1', 1, 4),

        createTurnEndedEvent('game-1', 2, 5),
        createTurnEndedEvent('game-1', 3, 6),
        createTurnEndedEvent('game-1', 4, 7),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].type).toBe('state-cycle');
    });
  });
}
