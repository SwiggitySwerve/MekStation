/**
 * Damage Application Tests
 *
 * Tests for BattleTech damage application mechanics.
 */

import {
  applyDamageToLocation,
  applyDamageWithTransfer,
  checkCriticalHitTrigger,
  getCriticalHitCount,
  IUnitDamageState,
  STANDARD_STRUCTURE_TABLE,
} from '../damage';
import type { CombatLocation } from '@/types/gameplay';

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a test unit damage state with standard values.
 */
function createTestState(overrides: Partial<IUnitDamageState> = {}): IUnitDamageState {
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
      // Rear locations have 0 front armor (handled by rearArmor)
      center_torso_rear: 0,
      left_torso_rear: 0,
      right_torso_rear: 0,
    },
    rearArmor: {
      center_torso: 8,
      left_torso: 6,
      right_torso: 6,
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
      // Rear locations share structure with front
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

// =============================================================================
// Structure Table Tests
// =============================================================================

describe('STANDARD_STRUCTURE_TABLE', () => {
  it('should have structure values for standard tonnages', () => {
    const tonnages = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
    
    for (const tonnage of tonnages) {
      expect(STANDARD_STRUCTURE_TABLE[tonnage]).toBeDefined();
      expect(STANDARD_STRUCTURE_TABLE[tonnage].head).toBeGreaterThan(0);
      expect(STANDARD_STRUCTURE_TABLE[tonnage].centerTorso).toBeGreaterThan(0);
    }
  });

  it('should have correct head structure (always 3)', () => {
    for (const tonnage of Object.keys(STANDARD_STRUCTURE_TABLE)) {
      expect(STANDARD_STRUCTURE_TABLE[Number(tonnage)].head).toBe(3);
    }
  });

  it('should have structure values that increase with tonnage', () => {
    expect(STANDARD_STRUCTURE_TABLE[20].centerTorso).toBeLessThan(
      STANDARD_STRUCTURE_TABLE[100].centerTorso
    );
  });
});

// =============================================================================
// applyDamageToLocation Tests
// =============================================================================

describe('applyDamageToLocation', () => {
  describe('damage to armor only', () => {
    it('should reduce armor without affecting structure', () => {
      const state = createTestState();
      const { state: newState, result } = applyDamageToLocation(
        state,
        'center_torso',
        5
      );

      expect(result.armorDamage).toBe(5);
      expect(result.structureDamage).toBe(0);
      expect(result.armorRemaining).toBe(15); // 20 - 5
      expect(result.structureRemaining).toBe(16);
      expect(result.destroyed).toBe(false);
      expect(newState.armor['center_torso']).toBe(15);
    });

    it('should handle damage equal to armor', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 10 },
      });
      const { result } = applyDamageToLocation(state, 'left_arm', 10);

      expect(result.armorDamage).toBe(10);
      expect(result.structureDamage).toBe(0);
      expect(result.armorRemaining).toBe(0);
      expect(result.destroyed).toBe(false);
    });
  });

  describe('damage through armor to structure', () => {
    it('should apply excess damage to structure', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 5 },
      });
      const { state: newState, result } = applyDamageToLocation(
        state,
        'left_arm',
        10
      );

      expect(result.armorDamage).toBe(5);
      expect(result.structureDamage).toBe(5);
      expect(result.armorRemaining).toBe(0);
      expect(result.structureRemaining).toBe(3); // 8 - 5
      expect(result.destroyed).toBe(false);
      expect(newState.structure['left_arm']).toBe(3);
    });
  });

  describe('location destruction', () => {
    it('should destroy location when structure is depleted', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 0 },
        structure: { ...createTestState().structure, left_arm: 5 },
      });
      const { state: newState, result } = applyDamageToLocation(
        state,
        'left_arm',
        10
      );

      expect(result.structureDamage).toBe(5);
      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(5); // 10 - 5 structure
      expect(result.transferLocation).toBe('left_torso');
      expect(newState.destroyedLocations).toContain('left_arm');
    });
  });

  describe('already destroyed locations', () => {
    it('should transfer all damage from destroyed location', () => {
      const state = createTestState({
        destroyedLocations: ['left_arm'],
      });
      const { result } = applyDamageToLocation(state, 'left_arm', 10);

      expect(result.armorDamage).toBe(0);
      expect(result.structureDamage).toBe(0);
      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(10);
      expect(result.transferLocation).toBe('left_torso');
    });
  });

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const state = createTestState();
      const originalArmor = state.armor['center_torso'];
      
      applyDamageToLocation(state, 'center_torso', 5);
      
      // Original state should be unchanged
      expect(state.armor['center_torso']).toBe(originalArmor);
    });
  });
});

// =============================================================================
// applyDamageWithTransfer Tests
// =============================================================================

describe('applyDamageWithTransfer', () => {
  it('should apply damage without transfer if no destruction', () => {
    const state = createTestState();
    const { results } = applyDamageWithTransfer(
      state,
      'center_torso',
      5
    );

    expect(results.length).toBe(1);
    expect(results[0].armorDamage).toBe(5);
    expect(results[0].transferredDamage).toBe(0);
  });

  it('should handle damage transfer chain', () => {
    // Arm has low armor/structure, damage should transfer to torso
    const state = createTestState({
      armor: { ...createTestState().armor, left_arm: 2 },
      structure: { ...createTestState().structure, left_arm: 3 },
    });
    
    // 20 damage: 2 armor + 3 structure = 5, then 15 transfers to left torso
    const { state: newState, results } = applyDamageWithTransfer(
      state,
      'left_arm',
      20
    );

    expect(results.length).toBe(2);
    
    // First result: arm destruction
    expect(results[0].location).toBe('left_arm');
    expect(results[0].armorDamage).toBe(2);
    expect(results[0].structureDamage).toBe(3);
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(15);
    
    // Second result: torso takes transferred damage
    expect(results[1].location).toBe('left_torso');
    expect(results[1].damage).toBe(15);
    
    expect(newState.destroyedLocations).toContain('left_arm');
  });

  it('should handle multiple transfer steps', () => {
    // Set up a chain: arm -> torso, torso has low structure too
    const state = createTestState({
      armor: {
        ...createTestState().armor,
        left_arm: 0,
        left_torso: 0,
      },
      structure: {
        ...createTestState().structure,
        left_arm: 2,
        left_torso: 3,
      },
    });
    
    // 15 damage: 2 arm structure -> 13 transfer -> 3 torso structure -> 10 to CT
    const { results } = applyDamageWithTransfer(
      state,
      'left_arm',
      15
    );

    expect(results.length).toBe(3);
    expect(results[0].location).toBe('left_arm');
    expect(results[1].location).toBe('left_torso');
    expect(results[2].location).toBe('center_torso');
  });
});

// =============================================================================
// Critical Hit Tests
// =============================================================================

describe('checkCriticalHitTrigger', () => {
  it('should not trigger for zero structure damage', () => {
    const result = checkCriticalHitTrigger(0);
    expect(result.triggered).toBe(false);
  });

  it('should return roll details when structure damage occurs', () => {
    const result = checkCriticalHitTrigger(5);
    expect(result.roll).toBeDefined();
    expect(result.roll.total).toBeGreaterThanOrEqual(2);
    expect(result.roll.total).toBeLessThanOrEqual(12);
  });
});

describe('getCriticalHitCount', () => {
  it('should return 0 for rolls below 8', () => {
    expect(getCriticalHitCount(2)).toBe(0);
    expect(getCriticalHitCount(7)).toBe(0);
  });

  it('should return 1 for rolls 8-9', () => {
    expect(getCriticalHitCount(8)).toBe(1);
    expect(getCriticalHitCount(9)).toBe(1);
  });

  it('should return 2 for rolls 10-11', () => {
    expect(getCriticalHitCount(10)).toBe(2);
    expect(getCriticalHitCount(11)).toBe(2);
  });

  it('should return 3 for roll 12', () => {
    expect(getCriticalHitCount(12)).toBe(3);
  });
});
