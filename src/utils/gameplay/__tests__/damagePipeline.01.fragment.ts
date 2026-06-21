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

describe('emitCriticalEvents - linked critical metadata', () => {
  it('preserves represented linked-equipment critical weapon ids through session emission', () => {
    const session = createGameSession(createTestConfig(), [
      createTestUnit({ id: 'target' }),
    ]);

    const next = emitCriticalEvents(
      session,
      [
        {
          type: 'critical_hit_resolved',
          payload: {
            unitId: 'target',
            location: 'right_torso',
            slotIndex: 2,
            componentType: 'equipment',
            componentName: 'RISC Laser Pulse Module',
            effect: 'Weapon destroyed: Medium Laser',
            destroyed: true,
            linkedCriticalWeaponId: 'medium-laser-0',
            linkedCriticalWeaponName: 'Medium Laser',
          },
        },
      ],
      1,
      'target',
    );

    const resolved = next.events.find(
      (event) => event.type === GameEventType.CriticalHitResolved,
    );

    expect(resolved?.payload as ICriticalHitResolvedPayload).toMatchObject({
      componentName: 'RISC Laser Pulse Module',
      linkedCriticalWeaponId: 'medium-laser-0',
      linkedCriticalWeaponName: 'Medium Laser',
      effect: 'Weapon destroyed: Medium Laser',
      destroyed: true,
    });
  });
});

// =============================================================================
// Armor Absorption Tests
// =============================================================================

describe('Damage Pipeline - Armor Absorption', () => {
  it('should absorb all damage in armor when armor exceeds damage', () => {
    const state = createTestDamageState();
    const result = resolveDamage(state, 'center_torso', 10);

    expect(result.result.locationDamages[0].armorDamage).toBe(10);
    expect(result.result.locationDamages[0].structureDamage).toBe(0);
    expect(result.result.locationDamages[0].armorRemaining).toBe(10);
    expect(result.result.locationDamages[0].destroyed).toBe(false);
  });

  it('should fully deplete armor before touching structure', () => {
    const state = createTestDamageState();
    const result = resolveDamage(state, 'left_arm', 10);

    expect(result.result.locationDamages[0].armorDamage).toBe(10);
    expect(result.result.locationDamages[0].armorRemaining).toBe(0);
    expect(result.result.locationDamages[0].structureDamage).toBe(0);
  });
});

// =============================================================================
// Structure Penetration Tests
// =============================================================================

describe('Damage Pipeline - Structure Penetration', () => {
  it('should apply excess damage to structure after armor depleted', () => {
    const state = createTestDamageState();
    // left_arm has 10 armor, 8 structure. 15 damage should do 10 armor + 5 structure
    const result = resolveDamage(state, 'left_arm', 15);

    expect(result.result.locationDamages[0].armorDamage).toBe(10);
    expect(result.result.locationDamages[0].structureDamage).toBe(5);
    expect(result.result.locationDamages[0].armorRemaining).toBe(0);
    expect(result.result.locationDamages[0].structureRemaining).toBe(3);
  });

  it('should destroy location when structure reaches 0', () => {
    const state = createTestDamageState();
    // left_arm: 10 armor + 8 structure = 18. 20 damage should destroy it
    const result = resolveDamage(state, 'left_arm', 20);

    expect(result.result.locationDamages[0].destroyed).toBe(true);
  });

  it('should trigger pilot damage on head structure penetration', () => {
    const state = createTestDamageState({
      armor: {
        ...createTestDamageState().armor,
        head: 0,
      },
    });
    const result = resolveDamage(state, 'head', 2);

    expect(result.result.pilotDamage).toBeDefined();
    expect(result.result.pilotDamage!.woundsInflicted).toBe(1);
    expect(result.result.pilotDamage!.source).toBe('head_hit');
  });
});

// =============================================================================
// Damage Transfer Chain Tests
// =============================================================================

describe('Damage Pipeline - Transfer Chain', () => {
  it('should transfer excess damage from arm to side torso', () => {
    const state = createTestDamageState();
    // Destroy left arm (10 armor + 8 structure = 18), then 5 more transfers to left torso
    const result = applyDamageWithTransfer(state, 'left_arm', 23);

    expect(result.results.length).toBe(2);
    expect(result.results[0].location).toBe('left_arm');
    expect(result.results[0].destroyed).toBe(true);
    expect(result.results[1].location).toBe('left_torso');
    expect(result.results[1].damage).toBe(5);
  });

  it('should chain transfer: arm → side torso → center torso', () => {
    const state = createTestDamageState({
      armor: {
        ...createTestDamageState().armor,
        left_arm: 0,
        left_torso: 0,
      },
      structure: {
        ...createTestDamageState().structure,
        left_arm: 1,
        left_torso: 1,
      },
    });

    // 1 damage destroys left arm (1 IS left), excess 4 goes to LT (1 IS left), excess 3 goes to CT
    const result = applyDamageWithTransfer(state, 'left_arm', 5);

    expect(result.results.length).toBe(3);
    expect(result.results[0].location).toBe('left_arm');
    expect(result.results[0].destroyed).toBe(true);
    expect(result.results[1].location).toBe('left_torso');
    expect(result.results[1].destroyed).toBe(true);
    expect(result.results[2].location).toBe('center_torso');
  });

  it('should transfer leg damage to side torso', () => {
    const state = createTestDamageState({
      armor: {
        ...createTestDamageState().armor,
        right_leg: 0,
      },
      structure: {
        ...createTestDamageState().structure,
        right_leg: 1,
      },
    });

    const result = applyDamageWithTransfer(state, 'right_leg', 5);

    expect(result.results.length).toBe(2);
    expect(result.results[0].location).toBe('right_leg');
    expect(result.results[0].destroyed).toBe(true);
    expect(result.results[1].location).toBe('right_torso');
  });

  it('should destroy unit when center torso structure reaches 0', () => {
    const state = createTestDamageState({
      armor: {
        ...createTestDamageState().armor,
        center_torso: 0,
      },
      structure: {
        ...createTestDamageState().structure,
        center_torso: 1,
      },
    });

    const result = resolveDamage(state, 'center_torso', 5);
    expect(result.result.unitDestroyed).toBe(true);
    expect(result.result.destructionCause).toBe('ct_destroyed');
  });
});

// =============================================================================
// Side Torso Cascade Tests
// =============================================================================
