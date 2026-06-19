import {
  createTurnEndedEvent,
  type IGameEvent,
  type LongGameDetectorTestContext,
} from './LongGameDetector.test-helpers';

export function runLongGameThresholdTests({
  getDetector,
}: LongGameDetectorTestContext): void {
  describe('basic threshold detection', () => {
    it('detects long game when turns exceed threshold', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 25),
        createTurnEndedEvent('game-1', 50),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]).toMatchObject({
        type: 'long-game',
        severity: 'info',
        actualValue: 51,
        thresholdUsed: 50,
      });
    });

    it('ignores battles within threshold', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 25),
        createTurnEndedEvent('game-1', 50),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(0);
    });

    it('uses default threshold of 50', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 50),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(50);
    });

    it('detects long game at exact threshold + 1', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 10),
        createTurnEndedEvent('game-1', 11),
      ];

      const anomalies = getDetector().detect(events, 10);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(11);
    });

    it('does not detect at exact threshold', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 10),
      ];

      const anomalies = getDetector().detect(events, 10);

      expect(anomalies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Battle-Level Anomaly Tests
  // =========================================================================

  describe('battle-level anomaly structure', () => {
    it('creates battle-level anomaly with turn=null', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].turn).toBeNull();
    });

    it('creates battle-level anomaly with unitId=null', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].unitId).toBeNull();
    });

    it('includes correct battleId in anomaly', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-123', 1),
        createTurnEndedEvent('game-123', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].battleId).toBe('game-123');
    });

    it('includes correct message format', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 75),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].message).toContain('exceeded expected duration');
      expect(anomalies[0].message).toContain('turn 75');
      expect(anomalies[0].message).toContain('threshold: 50');
    });

    it('includes correct configKey', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].configKey).toBe('longGameThreshold');
    });
  });

  // =========================================================================
  // Single Anomaly Per Battle Tests
  // =========================================================================

  describe('single anomaly per battle', () => {
    it('creates only one anomaly even if turns continue increasing', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-1', 75),
        createTurnEndedEvent('game-1', 100),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });

    it('records max turn at time of threshold breach', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-1', 100),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].actualValue).toBe(51);
    });

    it('does not create duplicate anomalies for same battle', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-1', 52),
        createTurnEndedEvent('game-1', 53),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Multiple Battles Tests
  // =========================================================================

  describe('multiple battles', () => {
    it('detects long games in multiple battles', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 75),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].battleId).toBe('game-1');
      expect(anomalies[1].battleId).toBe('game-2');
    });

    it('tracks separate max turns for different battles', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 100),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies[0].actualValue).toBe(51);
      expect(anomalies[1].actualValue).toBe(100);
    });

    it('does not detect long game in short battle when another is long', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 25),
      ];

      const anomalies = getDetector().detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].battleId).toBe('game-1');
    });
  });

  // =========================================================================
  // Event Type Handling Tests
  // =========================================================================
}
