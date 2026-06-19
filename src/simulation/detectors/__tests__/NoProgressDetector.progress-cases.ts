import {
  GameSide,
  createBattleState,
  createDamageEvent,
  createMovementEvent,
  createTurnEndedEvent,
  type NoProgressDetectorTestContext,
  type IGameEvent,
} from './NoProgressDetector.test-helpers';

export function runNoProgressProgressTests({
  getDetector,
}: NoProgressDetectorTestContext): void {
  describe('basic no-progress detection', () => {
    it('detects no progress after threshold turns', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
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
      expect(anomalies[0]).toMatchObject({
        type: 'no-progress',
        severity: 'warning',
        actualValue: 5,
        thresholdUsed: 5,
      });
    });

    it('ignores no-progress before threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('uses default threshold of 5', () => {
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

      const anomalies = getDetector().detect(events, battleState);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(5);
    });

    it('detects multiple no-progress periods', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        // First no-progress period (turns 1-5)
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        // Progress (damage)
        createDamageEvent({
          gameId: 'game-1',
          turn: 6,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 15,
          sequence: 6,
        }),
        createTurnEndedEvent('game-1', 6),
        // Second no-progress period (turns 7-11)
        createTurnEndedEvent('game-1', 7),
        createTurnEndedEvent('game-1', 8),
        createTurnEndedEvent('game-1', 9),
        createTurnEndedEvent('game-1', 10),
        createTurnEndedEvent('game-1', 11),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].turn).toBe(5);
      expect(anomalies[1].turn).toBe(11);
    });
  });

  describe('movement detection and progress reset', () => {
    it('resets counter when unit moves', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createMovementEvent('game-1', 4, 'unit-1', 4),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('counts movement-only changes as progress', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createMovementEvent('game-1', 3, 'unit-1', 3),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('detects no-progress after movement stops', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createMovementEvent('game-1', 1, 'unit-1', 1),
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 6),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(6);
    });
  });

  describe('armor damage detection', () => {
    it('detects armor changes as progress', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createDamageEvent({
          gameId: 'game-1',
          turn: 3,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 15,
          sequence: 3,
        }),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('resets counter on armor damage', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createDamageEvent({
          gameId: 'game-1',
          turn: 4,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 15,
          sequence: 4,
        }),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('detects multiple armor locations', () => {
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
        createTurnEndedEvent('game-1', 1),
        createDamageEvent({
          gameId: 'game-1',
          turn: 2,
          unitId: 'unit-1',
          location: 'left_arm',
          armorRemaining: 10,
          structureRemaining: 8,
          sequence: 2,
        }),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });
  });
}
