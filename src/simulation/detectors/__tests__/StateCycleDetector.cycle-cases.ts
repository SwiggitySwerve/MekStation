import {
  GameSide,
  createBattleState,
  createDamageEvent,
  createHeatEvent,
  createTurnEndedEvent,
  type StateCycleDetectorTestContext,
  type IGameEvent,
} from './StateCycleDetector.test-helpers';

export function runStateCycleCycleTests({
  getDetector,
}: StateCycleDetectorTestContext): void {
  describe('basic state cycle detection', () => {
    it('detects state cycle after threshold repetitions', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
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
        createHeatEvent('game-1', 1, 'unit-1', 10, 2),
        createTurnEndedEvent('game-1', 1, 3),
        // Turn 2: Same state (cycle 1)
        createTurnEndedEvent('game-1', 2, 4),
        // Turn 3: Same state (cycle 2)
        createTurnEndedEvent('game-1', 3, 5),
        // Turn 4: Same state (cycle 3 - triggers anomaly)
        createTurnEndedEvent('game-1', 4, 6),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]).toMatchObject({
        type: 'state-cycle',
        severity: 'critical',
        thresholdUsed: 3,
      });
    });

    it('ignores state cycle before threshold', () => {
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
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('uses default threshold of 3', () => {
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
      ];

      const anomalies = getDetector().detect(events, battleState);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(3);
    });

    it('detects multiple state cycles', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        // First cycle (turns 1-3)
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
        // Break cycle with damage
        createDamageEvent({
          gameId: 'game-1',
          turn: 4,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 19,
          structureRemaining: 14,
          sequence: 5,
        }),
        createTurnEndedEvent('game-1', 4, 6),
        // Second cycle (turns 5-7)
        createTurnEndedEvent('game-1', 5, 7),
        createTurnEndedEvent('game-1', 6, 8),
        createTurnEndedEvent('game-1', 7, 9),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(3);
    });
  });

  describe('state comparison (armor, structure, heat)', () => {
    it('detects cycle when armor changes', () => {
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
        createDamageEvent({
          gameId: 'game-1',
          turn: 2,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 19,
          structureRemaining: 15,
          sequence: 3,
        }),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('detects cycle when structure changes', () => {
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
        createDamageEvent({
          gameId: 'game-1',
          turn: 2,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 14,
          sequence: 3,
        }),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('detects cycle when heat changes', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 10, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createHeatEvent('game-1', 2, 'unit-1', 11, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('detects cycle with multiple units', () => {
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
        createDamageEvent({
          gameId: 'game-1',
          turn: 1,
          unitId: 'unit-2',
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
  });
}
