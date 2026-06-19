import {
  GameEventType,
  GamePhase,
  GameSide,
  createBattleState,
  createDamageEvent,
  createHeatEvent,
  createTurnEndedEvent,
  type StateCycleDetectorTestContext,
  type IGameEvent,
} from './StateCycleDetector.test-helpers';

export function runStateCycleSnapshotTests({
  getDetector,
}: StateCycleDetectorTestContext): void {
  describe('snapshot serialization', () => {
    it('serializes armor in snapshot', () => {
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

      expect(anomalies[0].snapshot?.armor).toBeDefined();
      expect(
        (anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-1'],
      ).toEqual({
        center_torso: 20,
      });
    });

    it('serializes structure in snapshot', () => {
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

      expect(anomalies[0].snapshot?.structure).toBeDefined();
      expect(
        (anomalies[0].snapshot?.structure as Record<string, unknown>)['unit-1'],
      ).toEqual({
        center_torso: 15,
      });
    });

    it('serializes heat in snapshot', () => {
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
        createHeatEvent('game-1', 1, 'unit-1', 25, 2),
        createTurnEndedEvent('game-1', 1, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies[0].snapshot?.heat).toBeDefined();
      expect(
        (anomalies[0].snapshot?.heat as Record<string, unknown>)['unit-1'],
      ).toBe(25);
    });

    it('includes turn number in snapshot', () => {
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

      expect(anomalies[0].snapshot?.turn).toBe(3);
    });
  });

  describe('additional coverage', () => {
    it('handles unit name lookup in anomaly creation', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas AS7-D', side: GameSide.Player },
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

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].battleId).toBe('game-1');
    });

    it('handles multiple armor locations per unit', () => {
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
        createDamageEvent({
          gameId: 'game-1',
          turn: 1,
          unitId: 'unit-1',
          location: 'left_torso',
          armorRemaining: 15,
          structureRemaining: 10,
          sequence: 2,
        }),
        createDamageEvent({
          gameId: 'game-1',
          turn: 1,
          unitId: 'unit-1',
          location: 'right_torso',
          armorRemaining: 15,
          structureRemaining: 10,
          sequence: 3,
        }),
        createTurnEndedEvent('game-1', 1, 4),
        createTurnEndedEvent('game-1', 2, 5),
        createTurnEndedEvent('game-1', 3, 6),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(
        (anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-1'],
      ).toHaveProperty('center_torso');
      expect(
        (anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-1'],
      ).toHaveProperty('left_torso');
      expect(
        (anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-1'],
      ).toHaveProperty('right_torso');
    });

    it('handles threshold of 1', () => {
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

      const anomalies = getDetector().detect(events, battleState, 1);

      expect(anomalies).toHaveLength(1);
    });

    it('detects cycle with heat changes across multiple units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 20, 1),
        createHeatEvent('game-1', 1, 'unit-2', 10, 2),
        createTurnEndedEvent('game-1', 1, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(
        (anomalies[0].snapshot?.heat as Record<string, unknown>)['unit-1'],
      ).toBe(20);
      expect(
        (anomalies[0].snapshot?.heat as Record<string, unknown>)['unit-2'],
      ).toBe(10);
    });

    it('handles very long cycle detection', () => {
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
        createTurnEndedEvent('game-1', 5, 6),
        createTurnEndedEvent('game-1', 6, 7),
        createTurnEndedEvent('game-1', 7, 8),
        createTurnEndedEvent('game-1', 8, 9),
        createTurnEndedEvent('game-1', 9, 10),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(3);
    });

    it('handles unknown event types gracefully', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const unknownEvent: IGameEvent = {
        id: 'event-unknown-1',
        gameId: 'game-1',
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: 999 as unknown as GameEventType,
        turn: 1,
        phase: GamePhase.End,
        payload: {},
      };

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
        unknownEvent,
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = getDetector().detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles unit not found in battle state', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent({
          gameId: 'game-1',
          turn: 1,
          unitId: 'unit-unknown',
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

      expect(anomalies).toHaveLength(1);
    });
  });
}
