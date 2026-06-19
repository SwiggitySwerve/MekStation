import {
  GameSide,
  createBattleState,
  createDamageEvent,
  createDestroyedEvent,
  createHeatEvent,
  createMovementEvent,
  createTurnEndedEvent,
  type NoProgressDetectorTestContext,
  type IGameEvent,
} from './NoProgressDetector.test-helpers';

export function runNoProgressMetadataTests({
  getDetector,
}: NoProgressDetectorTestContext): void {
  describe('anomaly structure and metadata', () => {
    it('creates anomaly with correct structure', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies[0]).toMatchObject({
        // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.stringContaining('anom-no-progress'),
        type: 'no-progress',
        severity: 'warning',
        battleId: 'game-1',
        turn: 5,
        unitId: null,
        // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: expect.stringContaining('Battle state unchanged'),
        thresholdUsed: 5,
        actualValue: 5,
        configKey: 'noProgressThreshold',
        // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
        timestamp: expect.any(Number),
      });
    });

    it('includes correct turn in anomaly', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 6),
        createTurnEndedEvent('game-1', 7),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies[0].turn).toBe(5);
    });

    it('includes correct threshold in anomaly', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies[0].thresholdUsed).toBe(3);
      expect(anomalies[0].actualValue).toBe(3);
    });

    it('generates unique anomaly IDs', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createDamageEvent({
          gameId: 'game-1',
          turn: 6,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 15,
          sequence: 6,
        }),
        createTurnEndedEvent('game-1', 6),
        createTurnEndedEvent('game-1', 7),
        createTurnEndedEvent('game-1', 8),
        createTurnEndedEvent('game-1', 9),
        createTurnEndedEvent('game-1', 10),
        createTurnEndedEvent('game-1', 11),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].id).not.toBe(anomalies[1].id);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('handles empty event list', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const anomalies = getDetector().detect([], battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('handles single turn', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [createTurnEndedEvent('game-1', 1)];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('handles threshold of 1', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
      ];

      const anomalies = getDetector().detect(events, battleState, 1);

      expect(anomalies).toHaveLength(1);
    });

    it('handles large threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 100);

      expect(anomalies).toHaveLength(0);
    });

    it('handles empty battle state', () => {
      const battleState = createBattleState([]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });

    it('handles events with non-sequential turns', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 7),
        createTurnEndedEvent('game-1', 9),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });

    it('only triggers anomaly once per no-progress period', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 6),
        createTurnEndedEvent('game-1', 7),
        createTurnEndedEvent('game-1', 8),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(5);
    });
  });

  describe('integration scenarios', () => {
    it('handles realistic battle scenario with mixed events', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        // Turn 1: Both units move
        createMovementEvent('game-1', 1, 'unit-1', 1),
        createMovementEvent('game-1', 1, 'unit-2', 2),
        createTurnEndedEvent('game-1', 1),
        // Turn 2: Unit 1 takes damage
        createDamageEvent({
          gameId: 'game-1',
          turn: 2,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 15,
          sequence: 3,
        }),
        createTurnEndedEvent('game-1', 2),
        // Turn 3: Unit 2 generates heat
        createHeatEvent('game-1', 3, 'unit-2', 10, 4),
        createTurnEndedEvent('game-1', 3),
        // Turns 4-8: No progress
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 6),
        createTurnEndedEvent('game-1', 7),
        createTurnEndedEvent('game-1', 8),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(8);
    });

    it('handles battle with unit destruction', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createDestroyedEvent('game-1', 3, 'unit-2', 3),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 6),
        createTurnEndedEvent('game-1', 7),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });
  });
}
