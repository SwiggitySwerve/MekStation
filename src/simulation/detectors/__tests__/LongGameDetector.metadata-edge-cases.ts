import {
  createTurnEndedEvent,
  createDamageEvent,
  type IGameEvent,
  type LongGameDetectorTestContext,
} from './LongGameDetector.test-helpers';

export function runLongGameMetadataEdgeTests({
  getDetector,
}: LongGameDetectorTestContext): void {
  describe('event type handling', () => {
    it('detects long game from any event type', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createDamageEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
    });

    it('processes events in order regardless of type', () => {
      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1),
        createTurnEndedEvent('game-1', 25),
        createDamageEvent('game-1', 51),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });
  });

  // =========================================================================
  // Anomaly Metadata Tests
  // =========================================================================

  describe('anomaly metadata', () => {
    it('generates unique anomaly IDs', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].id).not.toBe(anomalies[1].id);
      expect(anomalies[0].id).toContain('anom-long-game');
    });

    it('includes timestamp in anomaly', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].timestamp).toBeGreaterThan(0);
      expect(typeof anomalies[0].timestamp).toBe('number');
    });

    it('sets severity to info', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].severity).toBe('info');
    });

    it('includes threshold and actual value', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 75),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].thresholdUsed).toBe(50);
      expect(anomalies[0].actualValue).toBe(75);
    });
  });

  // =========================================================================
  // Edge Cases and Boundary Conditions
  // =========================================================================

  describe('edge cases and boundary conditions', () => {
    it('handles empty event list', () => {
      const anomalies = getDetector().detect([], 50);

      expect(anomalies).toHaveLength(0);
    });

    it('handles single event', () => {
      const events: IGameEvent[] = [createTurnEndedEvent('game-1', 1)];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(0);
    });

    it('handles threshold of 1', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
      ];

      const anomalies = getDetector().detect(events, 1);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(2);
    });

    it('handles very large threshold', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 100),
        createTurnEndedEvent('game-1', 1000),
      ];

      const anomalies = getDetector().detect(events, 10000);

      expect(anomalies).toHaveLength(0);
    });

    it('handles very large turn numbers', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 999999),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(999999);
    });

    it('handles non-sequential turns', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 10),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });

    it('handles turns in reverse order', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 100),
        createTurnEndedEvent('game-1', 75),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(100);
    });

    it('handles duplicate turn numbers', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
    });

    it('handles turn 0', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 0),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });

    it('handles negative turn numbers', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', -10),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });
  });

  // =========================================================================
  // Threshold Variation Tests
  // =========================================================================
}
