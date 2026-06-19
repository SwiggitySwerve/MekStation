import {
  GameSide,
  createHeatEvent,
  createDestroyedEvent,
  createBattleState,
  type IGameEvent,
  type HeatSuicideDetectorTestContext,
} from './HeatSuicideDetector.test-helpers';

export function runHeatSuicideEdgeTests({
  getDetector,
}: HeatSuicideDetectorTestContext): void {
  describe('edge cases', () => {
    it('handles empty event list', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const anomalies = getDetector().detect([], battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('handles no heat events', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDestroyedEvent('game-1', 1, 'unit-1', 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('handles zero threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 1, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 0);

      expect(anomalies).toHaveLength(1);
    });

    it('handles high threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 50, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 100);

      expect(anomalies).toHaveLength(0);
    });

    it('handles unknown unit ID gracefully', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unknown-unit', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].message).toContain('unknown-unit');
    });

    it('handles single unit in battle', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Deduplication Tests
  // =========================================================================

  describe('deduplication per unit per turn', () => {
    it('creates separate anomalies for different turns', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
        createHeatEvent('game-1', 2, 'unit-1', 35, 2),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(2);
    });

    it('creates separate anomalies for different units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Jagermech', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
        createHeatEvent('game-1', 1, 'unit-2', 35, 2),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(2);
    });
  });

  // =========================================================================
  // Custom Threshold Tests
  // =========================================================================

  describe('custom thresholds', () => {
    it('respects custom threshold of 20', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 21, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 20);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(20);
    });

    it('respects custom threshold of 50', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 49, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 50);

      expect(anomalies).toHaveLength(0);
    });
  });
}
