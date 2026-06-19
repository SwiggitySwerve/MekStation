import {
  GameSide,
  createBattleState,
  createDamageEvent,
  createHeatEvent,
  createTurnEndedEvent,
  type StateCycleDetectorTestContext,
  type IGameEvent,
} from './StateCycleDetector.test-helpers';

export function runStateCycleMetadataTests({
  getDetector,
}: StateCycleDetectorTestContext): void {
  describe('anomaly structure and metadata', () => {
    it('includes snapshot in anomaly', () => {
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
        createHeatEvent('game-1', 1, 'unit-1', 10, 2),
        createTurnEndedEvent('game-1', 1, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies[0].snapshot).toBeDefined();
      expect(anomalies[0].snapshot).toHaveProperty('armor');
      expect(anomalies[0].snapshot).toHaveProperty('structure');
      expect(anomalies[0].snapshot).toHaveProperty('heat');
    });

    it('sets severity to critical', () => {
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

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies[0].severity).toBe('critical');
    });

    it('includes correct anomaly type', () => {
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

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies[0].type).toBe('state-cycle');
    });

    it('includes battleId in anomaly', () => {
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

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies[0].battleId).toBe('game-1');
    });

    it('includes turn number in anomaly', () => {
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

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies[0].turn).toBe(3);
    });

    it('sets unitId to null', () => {
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

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies[0].unitId).toBeNull();
    });

    it('includes configKey in anomaly', () => {
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

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies[0].configKey).toBe('stateCycleThreshold');
    });
  });

  describe('threshold variations', () => {
    it('respects custom threshold of 2', () => {
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

      const anomalies = getDetector().detect(events, battleState, 2);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(2);
    });

    it('respects custom threshold of 5', () => {
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
        createTurnEndedEvent('game-1', 4, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('triggers at exactly threshold', () => {
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
        createTurnEndedEvent('game-1', 4, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 4);

      expect(anomalies).toHaveLength(1);
    });
  });
}
