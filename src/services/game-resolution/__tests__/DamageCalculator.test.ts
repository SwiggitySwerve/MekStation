/**
 * Tests for Damage Calculator
 */

import {
  calculateDamagePercent,
  assessUnitDamage,
  getLocationDamage,
  estimateRepairCost,
  needsCriticalRepair,
  estimateRepairTime,
  isSalvageable,
} from '../DamageCalculator';
import {
  IUnitGameState,
  GameSide,
  Facing,
  MovementType,
  LockState,
} from '@/types/gameplay';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockUnit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    id: 'test-unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    ...overrides,
  };
}

const MOCK_MAX_ARMOR: Record<string, number> = {
  head: 9,
  center_torso: 30,
  left_torso: 20,
  right_torso: 20,
  left_arm: 16,
  right_arm: 16,
  left_leg: 20,
  right_leg: 20,
};

const MOCK_MAX_STRUCTURE: Record<string, number> = {
  head: 3,
  center_torso: 21,
  left_torso: 14,
  right_torso: 14,
  left_arm: 10,
  right_arm: 10,
  left_leg: 14,
  right_leg: 14,
};

// =============================================================================
// Tests
// =============================================================================

describe('DamageCalculator', () => {
  describe('calculateDamagePercent', () => {
    it('should return 0% for undamaged unit', () => {
      const percent = calculateDamagePercent(MOCK_MAX_ARMOR, MOCK_MAX_ARMOR);
      expect(percent).toBe(0);
    });

    it('should return 100% for fully destroyed armor', () => {
      const noArmor: Record<string, number> = {};
      for (const loc of Object.keys(MOCK_MAX_ARMOR)) {
        noArmor[loc] = 0;
      }

      const percent = calculateDamagePercent(noArmor, MOCK_MAX_ARMOR);
      expect(percent).toBe(100);
    });

    it('should calculate partial damage correctly', () => {
      const halfArmor: Record<string, number> = {};
      for (const [loc, val] of Object.entries(MOCK_MAX_ARMOR)) {
        halfArmor[loc] = val / 2;
      }

      const percent = calculateDamagePercent(halfArmor, MOCK_MAX_ARMOR);
      expect(percent).toBe(50);
    });

    it('should handle missing locations', () => {
      const partialArmor = { head: 0, center_torso: 30 }; // Only 2 locations
      const partialMax = { head: 9, center_torso: 30 };

      // Head is destroyed (9 damage), CT is fine
      const percent = calculateDamagePercent(partialArmor, partialMax);
      expect(percent).toBeCloseTo((9 / 39) * 100, 1);
    });

    it('should return 0 for empty armor', () => {
      const percent = calculateDamagePercent({}, {});
      expect(percent).toBe(0);
    });
  });

  describe('assessUnitDamage', () => {
    it('should return operational status for undamaged unit', () => {
      const unit = createMockUnit({
        armor: { ...MOCK_MAX_ARMOR },
        structure: { ...MOCK_MAX_STRUCTURE },
      });

      const assessment = assessUnitDamage(unit, MOCK_MAX_ARMOR, MOCK_MAX_STRUCTURE);

      expect(assessment.status).toBe('operational');
      expect(assessment.armorDamagePercent).toBe(0);
      expect(assessment.structureDamagePercent).toBe(0);
      expect(assessment.combatEffective).toBe(true);
    });

    it('should detect damaged status', () => {
      // Light armor damage (~30%)
      const damagedArmor = { ...MOCK_MAX_ARMOR };
      damagedArmor.head = 0;
      damagedArmor.left_arm = 0;

      const unit = createMockUnit({
        armor: damagedArmor,
        structure: { ...MOCK_MAX_STRUCTURE },
      });

      const assessment = assessUnitDamage(unit, MOCK_MAX_ARMOR, MOCK_MAX_STRUCTURE);

      expect(assessment.armorDamagePercent).toBeGreaterThan(0);
      expect(['operational', 'damaged']).toContain(assessment.status);
    });

    it('should detect destroyed status', () => {
      const unit = createMockUnit({
        destroyed: true,
      });

      const assessment = assessUnitDamage(unit, MOCK_MAX_ARMOR, MOCK_MAX_STRUCTURE);

      expect(assessment.status).toBe('destroyed');
      expect(assessment.combatEffective).toBe(false);
    });

    it('should count destroyed locations', () => {
      const unit = createMockUnit({
        destroyedLocations: ['left_arm', 'right_arm'],
      });

      const assessment = assessUnitDamage(unit, MOCK_MAX_ARMOR, MOCK_MAX_STRUCTURE);

      expect(assessment.destroyedLocations).toBe(2);
    });

    it('should count destroyed components', () => {
      const unit = createMockUnit({
        destroyedEquipment: ['medium_laser_1', 'heat_sink_3'],
      });

      const assessment = assessUnitDamage(unit, MOCK_MAX_ARMOR, MOCK_MAX_STRUCTURE);

      expect(assessment.destroyedComponents).toBe(2);
    });

    it('should mark unconscious pilot as not combat effective', () => {
      const unit = createMockUnit({
        pilotConscious: false,
        armor: { ...MOCK_MAX_ARMOR },
        structure: { ...MOCK_MAX_STRUCTURE },
      });

      const assessment = assessUnitDamage(unit, MOCK_MAX_ARMOR, MOCK_MAX_STRUCTURE);

      expect(assessment.combatEffective).toBe(false);
    });
  });

  describe('getLocationDamage', () => {
    it('should return damage for all locations', () => {
      const unit = createMockUnit({
        armor: { ...MOCK_MAX_ARMOR },
        structure: { ...MOCK_MAX_STRUCTURE },
      });

      const locations = getLocationDamage(unit, MOCK_MAX_ARMOR, MOCK_MAX_STRUCTURE);

      expect(locations.length).toBe(8); // Standard mech locations
    });

    it('should identify destroyed locations', () => {
      const unit = createMockUnit({
        armor: { ...MOCK_MAX_ARMOR },
        structure: { ...MOCK_MAX_STRUCTURE },
        destroyedLocations: ['left_arm'],
      });

      const locations = getLocationDamage(unit, MOCK_MAX_ARMOR, MOCK_MAX_STRUCTURE);
      const leftArm = locations.find((l) => l.location === 'left_arm');

      expect(leftArm?.isDestroyed).toBe(true);
    });
  });

  describe('estimateRepairCost', () => {
    it('should return 0 for undamaged unit', () => {
      const assessment = {
        armorDamagePercent: 0,
        structureDamagePercent: 0,
        overallDamagePercent: 0,
        destroyedLocations: 0,
        destroyedComponents: 0,
        status: 'operational' as const,
        combatEffective: true,
      };

      const cost = estimateRepairCost(assessment, 1000000);

      expect(cost).toBe(0);
    });

    it('should increase with damage percentage', () => {
      const lowDamage = {
        armorDamagePercent: 10,
        structureDamagePercent: 0,
        overallDamagePercent: 10,
        destroyedLocations: 0,
        destroyedComponents: 0,
        status: 'damaged' as const,
        combatEffective: true,
      };

      const highDamage = {
        ...lowDamage,
        overallDamagePercent: 50,
      };

      const lowCost = estimateRepairCost(lowDamage, 1000000);
      const highCost = estimateRepairCost(highDamage, 1000000);

      expect(highCost).toBeGreaterThan(lowCost);
    });

    it('should add cost for destroyed locations', () => {
      const noDamage = {
        armorDamagePercent: 0,
        structureDamagePercent: 0,
        overallDamagePercent: 0,
        destroyedLocations: 0,
        destroyedComponents: 0,
        status: 'operational' as const,
        combatEffective: true,
      };

      const withLocations = {
        ...noDamage,
        destroyedLocations: 2,
      };

      const baseCost = estimateRepairCost(noDamage, 1000000);
      const locationCost = estimateRepairCost(withLocations, 1000000);

      expect(locationCost).toBeGreaterThan(baseCost);
    });
  });

  describe('needsCriticalRepair', () => {
    it('should return false for armor-only damage', () => {
      const assessment = {
        armorDamagePercent: 50,
        structureDamagePercent: 0,
        overallDamagePercent: 15,
        destroyedLocations: 0,
        destroyedComponents: 0,
        status: 'damaged' as const,
        combatEffective: true,
      };

      expect(needsCriticalRepair(assessment)).toBe(false);
    });

    it('should return true for structure damage', () => {
      const assessment = {
        armorDamagePercent: 100,
        structureDamagePercent: 10,
        overallDamagePercent: 37,
        destroyedLocations: 0,
        destroyedComponents: 0,
        status: 'heavy_damage' as const,
        combatEffective: true,
      };

      expect(needsCriticalRepair(assessment)).toBe(true);
    });

    it('should return true for destroyed locations', () => {
      const assessment = {
        armorDamagePercent: 0,
        structureDamagePercent: 0,
        overallDamagePercent: 0,
        destroyedLocations: 1,
        destroyedComponents: 0,
        status: 'operational' as const,
        combatEffective: true,
      };

      expect(needsCriticalRepair(assessment)).toBe(true);
    });
  });

  describe('estimateRepairTime', () => {
    it('should return 0 for undamaged unit', () => {
      const assessment = {
        armorDamagePercent: 0,
        structureDamagePercent: 0,
        overallDamagePercent: 0,
        destroyedLocations: 0,
        destroyedComponents: 0,
        status: 'operational' as const,
        combatEffective: true,
      };

      expect(estimateRepairTime(assessment)).toBe(0);
    });

    it('should increase with damage', () => {
      const lowDamage = {
        armorDamagePercent: 10,
        structureDamagePercent: 0,
        overallDamagePercent: 10,
        destroyedLocations: 0,
        destroyedComponents: 0,
        status: 'damaged' as const,
        combatEffective: true,
      };

      const highDamage = {
        ...lowDamage,
        overallDamagePercent: 80,
        destroyedLocations: 2,
        destroyedComponents: 3,
      };

      const lowTime = estimateRepairTime(lowDamage);
      const highTime = estimateRepairTime(highDamage);

      expect(highTime).toBeGreaterThan(lowTime);
    });
  });

  describe('isSalvageable', () => {
    it('should return true for damaged but not destroyed', () => {
      const assessment = {
        armorDamagePercent: 80,
        structureDamagePercent: 50,
        overallDamagePercent: 59,
        destroyedLocations: 2,
        destroyedComponents: 5,
        status: 'critical' as const,
        combatEffective: false,
      };

      expect(isSalvageable(assessment)).toBe(true);
    });

    it('should return true for destroyed with few location losses', () => {
      const assessment = {
        armorDamagePercent: 100,
        structureDamagePercent: 100,
        overallDamagePercent: 100,
        destroyedLocations: 3,
        destroyedComponents: 10,
        status: 'destroyed' as const,
        combatEffective: false,
      };

      expect(isSalvageable(assessment)).toBe(true);
    });

    it('should return false for destroyed with too many location losses', () => {
      const assessment = {
        armorDamagePercent: 100,
        structureDamagePercent: 100,
        overallDamagePercent: 100,
        destroyedLocations: 5, // More than half
        destroyedComponents: 15,
        status: 'destroyed' as const,
        combatEffective: false,
      };

      expect(isSalvageable(assessment)).toBe(false);
    });
  });
});
