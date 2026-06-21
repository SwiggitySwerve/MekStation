/**
 * Damage Pipeline Integration Tests
 *
 * Tests for Phase 3: Wire Damage Pipeline
 * Covers: armor absorption, structure penetration, transfer chain,
 * side torso cascade, head full damage, damageThisPhase tracking
 */

import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import {
  GamePhase,
  GameStatus,
  GameSide,
  GameEventType,
  LockState,
  Facing,
  MovementType,
  RangeBracket,
  FiringArc,
  IGameConfig,
  IGameUnit,
  IGameSession,
  IGameState,
  IUnitGameState,
  IAttackDeclaredPayload,
  IAttackResolvedPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IWeaponAttack,
} from '@/types/gameplay';

import {
  resolveDamage,
  applyDamageWithTransfer,
  applyDamageToLocation,
  createDamageState,
  IUnitDamageState,
} from '../damage';
import { createDamageAppliedEvent } from '../gameEvents';
import {
  createGameSession,
  startGame,
  declareAttack,
  lockAttack,
  resolveAttack,
  resolveAllAttacks,
  DiceRoller,
} from '../gameSession';
import { rollInitiative, advancePhase } from '../gameSession';
import { emitCriticalEvents } from '../gameSessionAttackResolutionHelpers';
import { applyEvent, createInitialUnitState } from '../gameState';

// =============================================================================
// Helpers
// =============================================================================

function createTestConfig(): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function createTestUnit(overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id: 'unit-1',
    name: 'Test Mech',
    side: GameSide.Player,
    unitRef: 'test',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
    // Seed ammo bins so ammo-consuming weapon tests (AC/20, etc.) can
    // fire. Per wire-ammo-consumption, firing with no matching non-empty
    // bin emits AttackInvalid instead of AttackResolved.
    ammoConstruction: [
      {
        binId: 'bin-ac20-1',
        weaponType: 'AC/20',
        location: 'rt',
        maxRounds: 40,
        damagePerRound: 20,
        isExplosive: true,
      },
    ],
    ...overrides,
  };
}

function createTestDamageState(
  overrides: Partial<IUnitDamageState> = {},
): IUnitDamageState {
  return {
    armor: {
      head: 9,
      center_torso: 20,
      left_torso: 15,
      right_torso: 15,
      left_arm: 10,
      right_arm: 10,
      left_leg: 12,
      right_leg: 12,
      center_torso_rear: 0,
      left_torso_rear: 0,
      right_torso_rear: 0,
    },
    rearArmor: {
      center_torso: 10,
      left_torso: 7,
      right_torso: 7,
    },
    structure: {
      head: 3,
      center_torso: 16,
      left_torso: 12,
      right_torso: 12,
      left_arm: 8,
      right_arm: 8,
      left_leg: 12,
      right_leg: 12,
      center_torso_rear: 16,
      left_torso_rear: 12,
      right_torso_rear: 12,
    },
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    ...overrides,
  };
}

describe('Damage Pipeline - Side Torso Cascade', () => {
  it('should cascade left torso destruction to left arm in reducer', () => {
    const initialUnit: IUnitGameState = {
      id: 'unit-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: Facing.North,
      heat: 0,
      movementThisTurn: MovementType.Stationary,
      hexesMovedThisTurn: 0,
      armor: {
        head: 9,
        center_torso: 20,
        left_torso: 0,
        right_torso: 15,
        left_arm: 10,
        right_arm: 10,
        left_leg: 12,
        right_leg: 12,
      },
      structure: {
        head: 3,
        center_torso: 16,
        left_torso: 0,
        right_torso: 12,
        left_arm: 8,
        right_arm: 8,
        left_leg: 12,
        right_leg: 12,
      },
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: LockState.Pending,
    };

    const state: IGameState = {
      gameId: 'test',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.WeaponAttack,
      activationIndex: 0,
      units: { 'unit-1': initialUnit },
      turnEvents: [],
    };

    const damageEvent = createDamageAppliedEvent(
      'test',
      1,
      1,
      'unit-1',
      'left_torso',
      5,
      0,
      0,
      true,
    );

    const newState = applyEvent(state, damageEvent);
    const unit = newState.units['unit-1'];

    expect(unit.destroyedLocations).toContain('left_torso');
    expect(unit.destroyedLocations).toContain('left_arm');
    expect(unit.armor['left_arm']).toBe(0);
    expect(unit.structure['left_arm']).toBe(0);
  });

  it('should cascade right torso destruction to right arm in reducer', () => {
    const initialUnit: IUnitGameState = {
      id: 'unit-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: Facing.North,
      heat: 0,
      movementThisTurn: MovementType.Stationary,
      hexesMovedThisTurn: 0,
      armor: {
        head: 9,
        center_torso: 20,
        left_torso: 15,
        right_torso: 0,
        left_arm: 10,
        right_arm: 10,
        left_leg: 12,
        right_leg: 12,
      },
      structure: {
        head: 3,
        center_torso: 16,
        left_torso: 12,
        right_torso: 0,
        left_arm: 8,
        right_arm: 8,
        left_leg: 12,
        right_leg: 12,
      },
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: LockState.Pending,
    };

    const state: IGameState = {
      gameId: 'test',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.WeaponAttack,
      activationIndex: 0,
      units: { 'unit-1': initialUnit },
      turnEvents: [],
    };

    const damageEvent = createDamageAppliedEvent(
      'test',
      1,
      1,
      'unit-1',
      'right_torso',
      5,
      0,
      0,
      true,
    );

    const newState = applyEvent(state, damageEvent);
    const unit = newState.units['unit-1'];

    expect(unit.destroyedLocations).toContain('right_torso');
    expect(unit.destroyedLocations).toContain('right_arm');
    expect(unit.armor['right_arm']).toBe(0);
    expect(unit.structure['right_arm']).toBe(0);
  });

  it('should not cascade if arm is already destroyed', () => {
    const initialUnit: IUnitGameState = {
      id: 'unit-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: Facing.North,
      heat: 0,
      movementThisTurn: MovementType.Stationary,
      hexesMovedThisTurn: 0,
      armor: {
        head: 9,
        center_torso: 20,
        left_torso: 0,
        right_torso: 15,
        left_arm: 0,
        right_arm: 10,
        left_leg: 12,
        right_leg: 12,
      },
      structure: {
        head: 3,
        center_torso: 16,
        left_torso: 0,
        right_torso: 12,
        left_arm: 0,
        right_arm: 8,
        left_leg: 12,
        right_leg: 12,
      },
      destroyedLocations: ['left_arm'],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: LockState.Pending,
    };

    const state: IGameState = {
      gameId: 'test',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.WeaponAttack,
      activationIndex: 0,
      units: { 'unit-1': initialUnit },
      turnEvents: [],
    };

    const damageEvent = createDamageAppliedEvent(
      'test',
      1,
      1,
      'unit-1',
      'left_torso',
      5,
      0,
      0,
      true,
    );

    const newState = applyEvent(state, damageEvent);
    const unit = newState.units['unit-1'];

    // Only 2 entries: the already-destroyed left_arm + newly destroyed left_torso
    expect(unit.destroyedLocations).toContain('left_torso');
    expect(unit.destroyedLocations).toContain('left_arm');
    expect(
      unit.destroyedLocations.filter((l) => l === 'left_arm'),
    ).toHaveLength(1);
  });
});

// =============================================================================
// Head Cap Tests
// =============================================================================
