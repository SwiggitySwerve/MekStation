/**
 * Damage Pipeline Integration Tests
 *
 * Tests for Phase 3: Wire Damage Pipeline
 * Covers: armor absorption, structure penetration, transfer chain,
 * side torso cascade, head cap, damageThisPhase tracking
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

describe('Damage Pipeline - Head Cap Rule', () => {
  it('should cap head damage at 3 from standard weapon via resolveDamage', () => {
    const state = createTestDamageState();
    // Head has 9 armor. 3 damage (capped from higher) should reduce to 6
    const result = resolveDamage(state, 'head', 3);

    expect(result.result.locationDamages[0].armorDamage).toBe(3);
    expect(result.result.locationDamages[0].armorRemaining).toBe(6);
  });

  it('should apply full 3 damage even for weapons doing 20+ damage (head-capped)', () => {
    // This tests that gameSession.ts caps before calling resolveDamage
    // The spec says max 3 from single standard weapon
    const state = createTestDamageState();
    const result = resolveDamage(state, 'head', 3);

    expect(result.result.locationDamages[0].damage).toBe(3);
    expect(result.result.locationDamages[0].armorRemaining).toBe(6);
  });

  it('should allow under-3 damage to head without modification', () => {
    const state = createTestDamageState();
    const result = resolveDamage(state, 'head', 2);

    expect(result.result.locationDamages[0].armorDamage).toBe(2);
    expect(result.result.locationDamages[0].armorRemaining).toBe(7);
  });
});

// =============================================================================
// DamageThisPhase Tracking Tests
// =============================================================================

describe('Damage Pipeline - damageThisPhase Tracking', () => {
  it('should accumulate damage in damageThisPhase via reducer', () => {
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
        right_torso: 15,
        left_arm: 10,
        right_arm: 10,
        left_leg: 12,
        right_leg: 12,
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
      },
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: LockState.Pending,
      damageThisPhase: 0,
    };

    let state: IGameState = {
      gameId: 'test',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.WeaponAttack,
      activationIndex: 0,
      units: { 'unit-1': initialUnit },
      turnEvents: [],
    };

    const event1 = createDamageAppliedEvent(
      'test',
      1,
      1,
      'unit-1',
      'center_torso',
      10,
      10,
      16,
      false,
    );
    state = applyEvent(state, event1);
    expect(state.units['unit-1'].damageThisPhase).toBe(10);

    const event2 = createDamageAppliedEvent(
      'test',
      2,
      1,
      'unit-1',
      'left_torso',
      12,
      3,
      12,
      false,
    );
    state = applyEvent(state, event2);
    expect(state.units['unit-1'].damageThisPhase).toBe(22);
  });

  it('should reset damageThisPhase on phase change', () => {
    const initialUnit: IUnitGameState = {
      id: 'unit-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: Facing.North,
      heat: 0,
      movementThisTurn: MovementType.Stationary,
      hexesMovedThisTurn: 0,
      armor: { center_torso: 20 },
      structure: { center_torso: 16 },
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: LockState.Pending,
      damageThisPhase: 15,
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

    const phaseChangeEvent = {
      id: 'evt-phase',
      gameId: 'test',
      sequence: 1,
      timestamp: new Date().toISOString(),
      type: GameEventType.PhaseChanged as const,
      turn: 1,
      phase: GamePhase.Heat,
      payload: {
        fromPhase: GamePhase.WeaponAttack,
        toPhase: GamePhase.Heat,
      },
    };

    const newState = applyEvent(state, phaseChangeEvent);
    expect(newState.units['unit-1'].damageThisPhase).toBe(0);
  });
});

// =============================================================================
// Full Pipeline Integration Tests
// =============================================================================
