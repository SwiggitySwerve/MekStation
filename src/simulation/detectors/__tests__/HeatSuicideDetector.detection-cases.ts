import {
  GameSide,
  createHeatEvent,
  createBattleState,
  type IGameEvent,
  type HeatSuicideDetectorTestContext,
} from './HeatSuicideDetector.test-helpers';

export function runHeatSuicideDetectionTests({
  getDetector,
}: HeatSuicideDetectorTestContext): void {
  describe('basic heat detection', () => {
    it('detects heat above threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]).toMatchObject({
        type: 'heat-suicide',
        severity: 'warning',
        unitId: 'unit-1',
        actualValue: 35,
        thresholdUsed: 30,
        configKey: 'heatSuicideThreshold',
      });
    });

    it('ignores heat at threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 30, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('ignores heat below threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 25, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('uses default threshold of 30', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 31, 1),
      ];

      const anomalies = getDetector().detect(events, battleState);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(30);
    });
  });

  // =========================================================================
  // Last-Ditch Exemption Tests
  // =========================================================================

  describe('last-ditch exemption (3:1 outnumbering)', () => {
    it('exempts unit outnumbered 3:1', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
        { id: 'opponent-2', name: 'Flea', side: GameSide.Opponent },
        { id: 'opponent-3', name: 'Spider', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'player-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('exempts unit outnumbered 4:1', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
        { id: 'opponent-2', name: 'Flea', side: GameSide.Opponent },
        { id: 'opponent-3', name: 'Spider', side: GameSide.Opponent },
        { id: 'opponent-4', name: 'Commando', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'player-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('detects heat when outnumbered 2:1 (not last-ditch)', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
        { id: 'opponent-2', name: 'Flea', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'player-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
    });

    it('detects heat when outnumbered 1:1 (not last-ditch)', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'player-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
    });

    it('exempts opponent unit outnumbered 3:1', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'player-2', name: 'Jagermech', side: GameSide.Player },
        { id: 'player-3', name: 'Enforcer', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'opponent-1', 35, 1),
      ];

      const anomalies = getDetector().detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Anomaly Structure Tests
  // =========================================================================
}
