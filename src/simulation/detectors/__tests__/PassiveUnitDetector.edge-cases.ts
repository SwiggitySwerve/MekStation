import {
  GameEventType,
  GamePhase,
  GameSide,
  createAttackEvent,
  createBattleState,
  createMovementEvent,
  createTurnEndedEvent,
  type PassiveUnitDetectorTestContext,
  type IGameEvent,
} from './PassiveUnitDetector.test-helpers';

export function runPassiveUnitEdgeTests({
  getDetector,
}: PassiveUnitDetectorTestContext): void {
  describe('edge cases', () => {
    it('handles empty event list', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const anomalies = getDetector().detect([], battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('handles no turn ended events', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createMovementEvent('game-1', 1, 'unit-1', 1),
        createAttackEvent('game-1', 2, 'unit-1', 2),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('handles threshold of 1', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [createTurnEndedEvent('game-1', 1)];

      const anomalies = getDetector().detect(events, battleState, 1);

      expect(anomalies).toHaveLength(1);
    });

    it('handles high threshold', () => {
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

    it('handles unknown unit ID gracefully', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createMovementEvent('game-1', 1, 'unknown-unit', 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].unitId).toBe('unit-1');
    });

    it('handles single unit in battle', () => {
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

      expect(anomalies).toHaveLength(1);
    });
  });

  describe('custom thresholds', () => {
    it('respects custom threshold of 3', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(3);
    });

    it('respects custom threshold of 10', () => {
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

      const anomalies = getDetector().detect(events, battleState, 10);

      expect(anomalies).toHaveLength(0);
    });
  });

  describe('multiple anomalies per unit', () => {
    it('detects multiple inactivity periods for same unit', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createMovementEvent('game-1', 6, 'unit-1', 1),
        createTurnEndedEvent('game-1', 6, 2),
        createTurnEndedEvent('game-1', 7, 3),
        createTurnEndedEvent('game-1', 8, 4),
        createTurnEndedEvent('game-1', 9, 5),
        createTurnEndedEvent('game-1', 10, 6),
        createTurnEndedEvent('game-1', 11, 7),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].turn).toBe(5);
      expect(anomalies[1].turn).toBe(11);
    });
  });

  describe('coverage edge cases', () => {
    it('handles untracked event types', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        {
          id: 'event-phase-changed',
          gameId: 'game-1',
          sequence: 1,
          timestamp: new Date().toISOString(),
          type: GameEventType.PhaseChanged,
          turn: 1,
          phase: GamePhase.Movement,
          payload: {},
        },
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });

    it('handles unit name fallback for unknown units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        {
          id: 'event-destroyed-unknown',
          gameId: 'game-1',
          sequence: 1,
          timestamp: new Date().toISOString(),
          type: GameEventType.UnitDestroyed,
          turn: 1,
          phase: GamePhase.End,
          payload: { unitId: 'unknown-unit' },
        },
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].message).toContain('Atlas');
    });
  });
}
