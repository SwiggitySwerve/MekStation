import {
  GameSide,
  createHeatEvent,
  createDestroyedEvent,
  createBattleState,
  type IGameEvent,
  type HeatSuicideDetectorTestContext,
} from './HeatSuicideDetector.test-helpers';

export function runHeatSuicideMetadataTests({
  getDetector,
}: HeatSuicideDetectorTestContext): void {
  describe('anomaly structure and metadata', () => {
    it('includes correct anomaly type and severity', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies[0].type).toBe('heat-suicide');
      expect(anomalies[0].severity).toBe('warning');
    });

    it('includes threshold and actual value', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 42, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies[0].thresholdUsed).toBe(30);
      expect(anomalies[0].actualValue).toBe(42);
    });

    it('includes config key', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies[0].configKey).toBe('heatSuicideThreshold');
    });

    it('includes unit ID and name in message', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas AS7-D', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies[0].unitId).toBe('unit-1');
      expect(anomalies[0].message).toContain('Atlas AS7-D');
      expect(anomalies[0].message).toContain('35');
      expect(anomalies[0].message).toContain('30');
    });

    it('includes turn number', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 5, 'unit-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies[0].turn).toBe(5);
    });

    it('includes battle ID', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('battle-123', 1, 'unit-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies[0].battleId).toBe('battle-123');
    });

    it('includes timestamp', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies[0].timestamp).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Multiple Events Tests
  // =========================================================================

  describe('multiple heat events per unit', () => {
    it('detects multiple heat events from same unit', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
        createHeatEvent('game-1', 2, 'unit-1', 40, 2),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].turn).toBe(1);
      expect(anomalies[1].turn).toBe(2);
    });

    it('detects heat from multiple units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Jagermech', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
        createHeatEvent('game-1', 1, 'unit-2', 32, 2),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].unitId).toBe('unit-1');
      expect(anomalies[1].unitId).toBe('unit-2');
    });
  });

  // =========================================================================
  // Shutdown Unit Tests
  // =========================================================================

  describe('shutdown units', () => {
    it('detects heat from destroyed unit before destruction event', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
        createDestroyedEvent('game-1', 1, 'unit-1', 2),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
    });

    it('exempts destroyed unit from last-ditch calculation', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
        { id: 'opponent-2', name: 'Flea', side: GameSide.Opponent },
        { id: 'opponent-3', name: 'Spider', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        // Destroy one opponent unit first
        createDestroyedEvent('game-1', 1, 'opponent-3', 1),
        // Now player is outnumbered 2:1, not 3:1, so heat should be detected
        createHeatEvent('game-1', 2, 'player-1', 35, 2),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================
}
