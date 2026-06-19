import {
  GameSide,
  createBattleState,
  createDamageEvent,
  createDestroyedEvent,
  createHeatEvent,
  createTurnEndedEvent,
  type NoProgressDetectorTestContext,
  type IGameEvent,
} from './NoProgressDetector.test-helpers';

export function runNoProgressStateTests({
  getDetector,
}: NoProgressDetectorTestContext): void {
  describe('structure damage detection', () => {
    it('detects structure changes as progress', () => {
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
          structureRemaining: 14,
          sequence: 3,
        }),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('resets counter on structure damage', () => {
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
          structureRemaining: 14,
          sequence: 4,
        }),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });
  });

  describe('heat detection', () => {
    it('detects heat changes as progress', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createHeatEvent('game-1', 3, 'unit-1', 15, 3),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('resets counter on heat generation', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createHeatEvent('game-1', 4, 'unit-1', 15, 4),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('detects heat dissipation as progress', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 20, 1),
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createHeatEvent('game-1', 3, 'unit-1', 10, 3),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });
  });

  describe('combined state changes', () => {
    it('detects any combination of armor, structure, heat changes', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createDamageEvent({
          gameId: 'game-1',
          turn: 2,
          unitId: 'unit-1',
          location: 'center_torso',
          armorRemaining: 20,
          structureRemaining: 15,
          sequence: 2,
        }),
        createHeatEvent('game-1', 2, 'unit-1', 10, 3),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('detects no-progress with multiple units', () => {
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
    });
  });

  describe('destroyed unit handling', () => {
    it('tracks destroyed units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createDestroyedEvent('game-1', 2, 'unit-2', 2),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('destroyed units do not prevent no-progress detection', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createDestroyedEvent('game-1', 1, 'unit-2', 1),
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
}
