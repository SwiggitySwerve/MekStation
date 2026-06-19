import {
  GameSide,
  createBattleState,
  createMovementEvent,
  createTurnEndedEvent,
  type PassiveUnitDetectorTestContext,
  type IGameEvent,
} from './PassiveUnitDetector.test-helpers';

export function runPassiveUnitMetadataTests({
  getDetector,
}: PassiveUnitDetectorTestContext): void {
  describe('anomaly structure and metadata', () => {
    it('includes correct anomaly type and severity', () => {
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

      expect(anomalies[0].type).toBe('passive-unit');
      expect(anomalies[0].severity).toBe('warning');
    });

    it('includes threshold and actual value', () => {
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

      expect(anomalies[0].thresholdUsed).toBe(5);
      expect(anomalies[0].actualValue).toBe(5);
    });

    it('includes config key', () => {
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

      expect(anomalies[0].configKey).toBe('passiveUnitThreshold');
    });

    it('includes unit ID and name in message', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas AS7-D', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies[0].unitId).toBe('unit-1');
      expect(anomalies[0].message).toContain('Atlas AS7-D');
      expect(anomalies[0].message).toContain('5');
    });

    it('includes turn number', () => {
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

      expect(anomalies[0].turn).toBe(5);
    });

    it('includes battle ID', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('battle-123', 1),
        createTurnEndedEvent('battle-123', 2),
        createTurnEndedEvent('battle-123', 3),
        createTurnEndedEvent('battle-123', 4),
        createTurnEndedEvent('battle-123', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies[0].battleId).toBe('battle-123');
    });

    it('includes timestamp', () => {
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

      expect(anomalies[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe('multiple units', () => {
    it('detects inactivity for multiple units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Jagermech', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].unitId).toBe('unit-1');
      expect(anomalies[1].unitId).toBe('unit-2');
    });

    it('detects selective inactivity', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Jagermech', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createMovementEvent('game-1', 1, 'unit-1', 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].unitId).toBe('unit-2');
    });
  });
}
