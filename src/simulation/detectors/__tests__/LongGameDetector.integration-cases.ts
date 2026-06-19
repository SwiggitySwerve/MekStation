import {
  createTurnEndedEvent,
  createDamageEvent,
  type IGameEvent,
  type LongGameDetectorTestContext,
} from './LongGameDetector.test-helpers';

export function runLongGameIntegrationTests({
  getDetector,
}: LongGameDetectorTestContext): void {
  describe('threshold variations', () => {
    it('respects custom threshold of 10', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 11),
      ];

      const anomalies = getDetector().detect(events, 10);

      expect(anomalies).toHaveLength(1);
    });

    it('respects custom threshold of 100', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 101),
      ];

      const anomalies = getDetector().detect(events, 100);

      expect(anomalies).toHaveLength(1);
    });

    it('respects custom threshold of 200', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 150),
      ];

      const anomalies = getDetector().detect(events, 200);

      expect(anomalies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('integration scenarios', () => {
    it('handles realistic battle with mixed events', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createDamageEvent('game-1', 5),
        createTurnEndedEvent('game-1', 10),
        createDamageEvent('game-1', 25),
        createTurnEndedEvent('game-1', 50),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });

    it('handles multiple battles with different thresholds', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 101),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(2);
    });

    it('detects long game in second battle only', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 25),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].battleId).toBe('game-2');
    });
  });
}
