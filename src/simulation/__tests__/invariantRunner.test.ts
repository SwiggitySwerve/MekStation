/**
 * Tests for InvariantRunner
 */

import {
  IGameState,
  GameStatus,
  GamePhase,
  LockState,
  GameSide,
} from '@/types/gameplay';
import { Facing, MovementType } from '@/types/gameplay';

import { InvariantRunner } from '../invariants/InvariantRunner';
import { IInvariant, IViolation } from '../invariants/types';

function createMinimalGameState(): IGameState {
  return {
    gameId: 'test-game',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      unit1: {
        id: 'unit1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        facing: Facing.North,
        heat: 0,
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
        armor: { head: 9 },
        structure: { head: 3 },
        destroyedLocations: [],
        destroyedEquipment: [],
        ammo: {},
        pilotWounds: 0,
        pilotConscious: true,
        destroyed: false,
        lockState: LockState.Pending,
      },
    },
    turnEvents: [],
  };
}

describe('InvariantRunner', () => {
  describe('register', () => {
    it('should register an invariant', () => {
      const runner = new InvariantRunner();
      const invariant: IInvariant = {
        name: 'test_invariant',
        description: 'Test invariant',
        severity: 'critical',
        check: () => [],
      };

      runner.register(invariant);
      const violations = runner.runAll(createMinimalGameState());
      expect(violations).toEqual([]);
    });

    it('should register multiple invariants', () => {
      const runner = new InvariantRunner();
      const invariant1: IInvariant = {
        name: 'test_invariant_1',
        description: 'Test invariant 1',
        severity: 'critical',
        check: () => [],
      };
      const invariant2: IInvariant = {
        name: 'test_invariant_2',
        description: 'Test invariant 2',
        severity: 'warning',
        check: () => [],
      };

      runner.register(invariant1);
      runner.register(invariant2);

      const violations = runner.runAll(createMinimalGameState());
      expect(violations).toEqual([]);
    });
  });

  describe('runAll', () => {
    it('should return empty array when all invariants pass', () => {
      const runner = new InvariantRunner();
      const invariant: IInvariant = {
        name: 'always_pass',
        description: 'Always passes',
        severity: 'critical',
        check: () => [],
      };

      runner.register(invariant);
      const violations = runner.runAll(createMinimalGameState());
      expect(violations).toEqual([]);
    });

    it('should collect violations from all invariants', () => {
      const runner = new InvariantRunner();

      const invariant1: IInvariant = {
        name: 'invariant_1',
        description: 'First invariant',
        severity: 'critical',
        check: () => [
          {
            invariant: 'invariant_1',
            severity: 'critical',
            message: 'Violation 1',
            context: {},
          },
        ],
      };

      const invariant2: IInvariant = {
        name: 'invariant_2',
        description: 'Second invariant',
        severity: 'warning',
        check: () => [
          {
            invariant: 'invariant_2',
            severity: 'warning',
            message: 'Violation 2',
            context: {},
          },
        ],
      };

      runner.register(invariant1);
      runner.register(invariant2);

      const violations = runner.runAll(createMinimalGameState());
      expect(violations).toHaveLength(2);
      expect(violations[0].invariant).toBe('invariant_1');
      expect(violations[1].invariant).toBe('invariant_2');
    });

    it('should handle invariants that return multiple violations', () => {
      const runner = new InvariantRunner();

      const invariant: IInvariant = {
        name: 'multi_violation',
        description: 'Returns multiple violations',
        severity: 'critical',
        check: () => [
          {
            invariant: 'multi_violation',
            severity: 'critical',
            message: 'Violation 1',
            context: { index: 1 },
          },
          {
            invariant: 'multi_violation',
            severity: 'critical',
            message: 'Violation 2',
            context: { index: 2 },
          },
        ],
      };

      runner.register(invariant);
      const violations = runner.runAll(createMinimalGameState());
      expect(violations).toHaveLength(2);
    });

    it('should work with no registered invariants', () => {
      const runner = new InvariantRunner();
      const violations = runner.runAll(createMinimalGameState());
      expect(violations).toEqual([]);
    });
  });

  describe('filterBySeverity', () => {
    it('should filter critical violations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'test1',
          severity: 'critical',
          message: 'Critical violation',
          context: {},
        },
        {
          invariant: 'test2',
          severity: 'warning',
          message: 'Warning violation',
          context: {},
        },
        {
          invariant: 'test3',
          severity: 'critical',
          message: 'Another critical',
          context: {},
        },
      ];

      const runner = new InvariantRunner();
      const filtered = runner.filterBySeverity(violations, 'critical');
      expect(filtered).toHaveLength(2);
      expect(filtered[0].severity).toBe('critical');
      expect(filtered[1].severity).toBe('critical');
    });

    it('should filter warning violations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'test1',
          severity: 'critical',
          message: 'Critical violation',
          context: {},
        },
        {
          invariant: 'test2',
          severity: 'warning',
          message: 'Warning violation',
          context: {},
        },
      ];

      const runner = new InvariantRunner();
      const filtered = runner.filterBySeverity(violations, 'warning');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].severity).toBe('warning');
    });

    it('should return empty array when no violations match', () => {
      const violations: IViolation[] = [
        {
          invariant: 'test1',
          severity: 'critical',
          message: 'Critical violation',
          context: {},
        },
      ];

      const runner = new InvariantRunner();
      const filtered = runner.filterBySeverity(violations, 'warning');
      expect(filtered).toEqual([]);
    });

    it('should handle empty violations array', () => {
      const runner = new InvariantRunner();
      const filtered = runner.filterBySeverity([], 'critical');
      expect(filtered).toEqual([]);
    });
  });

  describe('integration', () => {
    it('should run all registered invariants and filter results', () => {
      const runner = new InvariantRunner();

      const criticalInvariant: IInvariant = {
        name: 'critical_check',
        description: 'Critical check',
        severity: 'critical',
        check: () => [
          {
            invariant: 'critical_check',
            severity: 'critical',
            message: 'Critical issue',
            context: {},
          },
        ],
      };

      const warningInvariant: IInvariant = {
        name: 'warning_check',
        description: 'Warning check',
        severity: 'warning',
        check: () => [
          {
            invariant: 'warning_check',
            severity: 'warning',
            message: 'Warning issue',
            context: {},
          },
        ],
      };

      runner.register(criticalInvariant);
      runner.register(warningInvariant);

      const allViolations = runner.runAll(createMinimalGameState());
      expect(allViolations).toHaveLength(2);

      const criticalOnly = runner.filterBySeverity(allViolations, 'critical');
      expect(criticalOnly).toHaveLength(1);
      expect(criticalOnly[0].severity).toBe('critical');

      const warningsOnly = runner.filterBySeverity(allViolations, 'warning');
      expect(warningsOnly).toHaveLength(1);
      expect(warningsOnly[0].severity).toBe('warning');
    });
  });
});
