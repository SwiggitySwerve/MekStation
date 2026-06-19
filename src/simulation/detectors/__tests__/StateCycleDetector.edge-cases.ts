import {
  GameSide,
  createBattleState,
  createDamageEvent,
  createDestroyedEvent,
  createHeatEvent,
  createMovementEvent,
  createTurnEndedEvent,
  type StateCycleDetectorTestContext,
  type IGameEvent,
} from './StateCycleDetector.test-helpers';

export function runStateCycleEdgeTests({
  getDetector,
}: StateCycleDetectorTestContext): void {
  describe('edge cases and boundary conditions', () => {
    it('handles empty event list', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const anomalies = getDetector().detect([], battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('handles single turn', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

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
        createTurnEndedEvent('game-1', 1, 2),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('handles no damage events', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1, 1),
        createTurnEndedEvent('game-1', 2, 2),
        createTurnEndedEvent('game-1', 3, 3),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles destroyed units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

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
        createTurnEndedEvent('game-1', 1, 2),
        createDestroyedEvent('game-1', 2, 'unit-2', 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles multiple damage locations per unit', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

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
        createDamageEvent({
          gameId: 'game-1',
          turn: 1,
          unitId: 'unit-1',
          location: 'left_arm',
          armorRemaining: 10,
          structureRemaining: 5,
          sequence: 2,
        }),
        createTurnEndedEvent('game-1', 1, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles zero heat', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 0, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles high heat values', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 50, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles state inheritance from previous turn', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

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
        createTurnEndedEvent('game-1', 1, 2),
        // Turn 2: No damage, inherits from turn 1
        createTurnEndedEvent('game-1', 2, 3),
        // Turn 3: No damage, inherits from turn 2
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('only triggers anomaly once per cycle', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

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
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        // Continue cycling
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles movement events without breaking cycle', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

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
        createTurnEndedEvent('game-1', 1, 2),
        createMovementEvent('game-1', 2, 'unit-1', 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });
  });
}
