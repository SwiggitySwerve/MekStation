import {
  GameEventType,
  GamePhase,
  GameSide,
  createAttackEvent,
  createBattleState,
  createDestroyedEvent,
  createMovementEvent,
  createTurnEndedEvent,
  type PassiveUnitDetectorTestContext,
  type IGameEvent,
} from './PassiveUnitDetector.test-helpers';

export function runPassiveUnitActivityTests({
  getDetector,
}: PassiveUnitDetectorTestContext): void {
  describe('basic inactivity detection', () => {
    it('detects unit inactive for threshold turns', () => {
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

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].unitId).toBe('unit-1');
      expect(anomalies[1].unitId).toBe('unit-2');
    });

    it('ignores unit active within threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createMovementEvent('game-1', 1, 'unit-1', 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
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
  });

  describe('counter reset on action', () => {
    it('resets counter on movement', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createMovementEvent('game-1', 4, 'unit-1', 1),
        createTurnEndedEvent('game-1', 4, 2),
        createTurnEndedEvent('game-1', 5, 3),
        createTurnEndedEvent('game-1', 6, 4),
        createTurnEndedEvent('game-1', 7, 5),
        createTurnEndedEvent('game-1', 8, 6),
        createTurnEndedEvent('game-1', 9, 7),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(9);
    });

    it('resets counter on attack', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createAttackEvent('game-1', 4, 'unit-1', 1),
        createTurnEndedEvent('game-1', 4, 2),
        createTurnEndedEvent('game-1', 5, 3),
        createTurnEndedEvent('game-1', 6, 4),
        createTurnEndedEvent('game-1', 7, 5),
        createTurnEndedEvent('game-1', 8, 6),
        createTurnEndedEvent('game-1', 9, 7),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(9);
    });

    it('resets counter on movement locked', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        {
          id: 'event-movement-locked',
          gameId: 'game-1',
          sequence: 1,
          timestamp: new Date().toISOString(),
          type: GameEventType.MovementLocked,
          turn: 4,
          phase: GamePhase.Movement,
          actorId: 'unit-1',
          payload: { unitId: 'unit-1' },
        },
        createTurnEndedEvent('game-1', 4, 2),
        createTurnEndedEvent('game-1', 5, 3),
        createTurnEndedEvent('game-1', 6, 4),
        createTurnEndedEvent('game-1', 7, 5),
        createTurnEndedEvent('game-1', 8, 6),
        createTurnEndedEvent('game-1', 9, 7),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });

    it('resets counter on attack locked', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        {
          id: 'event-attack-locked',
          gameId: 'game-1',
          sequence: 1,
          timestamp: new Date().toISOString(),
          type: GameEventType.AttackLocked,
          turn: 4,
          phase: GamePhase.WeaponAttack,
          actorId: 'unit-1',
          payload: {
            attackerId: 'unit-1',
            targetId: 'target-unit',
            weaponId: 'weapon-1',
            roll: 10,
            toHitNumber: 8,
            hit: true,
          },
        },
        createTurnEndedEvent('game-1', 4, 2),
        createTurnEndedEvent('game-1', 5, 3),
        createTurnEndedEvent('game-1', 6, 4),
        createTurnEndedEvent('game-1', 7, 5),
        createTurnEndedEvent('game-1', 8, 6),
        createTurnEndedEvent('game-1', 9, 7),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });
  });

  describe('destroyed unit exemption', () => {
    it('exempts destroyed unit from detection', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createDestroyedEvent('game-1', 2, 'unit-1', 1),
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

    it('detects destroyed unit before destruction event', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createDestroyedEvent('game-1', 5, 'unit-1', 6),
      ];

      const anomalies = getDetector().detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });
  });
}
