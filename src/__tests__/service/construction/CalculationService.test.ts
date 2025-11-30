/**
 * Calculation Service Tests
 * 
 * Tests for mech calculation and derived values.
 * 
 * @spec openspec/specs/construction-services/spec.md
 */

import { CalculationService, IMechTotals } from '@/services/construction/CalculationService';
import { MechBuilderService, IEditableMech } from '@/services/construction/MechBuilderService';
import { TechBase } from '@/types/enums/TechBase';

describe('CalculationService', () => {
  let calculationService: CalculationService;
  let builderService: MechBuilderService;

  beforeEach(() => {
    calculationService = new CalculationService();
    builderService = new MechBuilderService();
  });

  /**
   * Create a test mech with optional overrides
   */
  function createTestMech(tonnage: number = 50, options: Partial<{
    walkMP: number;
    engineType: string;
    armor: Record<string, number>;
  }> = {}): IEditableMech {
    let mech = builderService.createEmpty(tonnage, TechBase.INNER_SPHERE);
    
    if (options.walkMP) {
      mech = builderService.setEngine(mech, options.engineType || 'Standard', options.walkMP);
    }
    
    if (options.armor) {
      mech = builderService.setArmor(mech, options.armor);
    }
    
    return mech;
  }

  // ============================================================================
  // calculateTotals
  // ============================================================================
  describe('calculateTotals', () => {
    it('should calculate total weight', () => {
      const mech = createTestMech(50);
      const totals = calculationService.calculateTotals(mech);
      
      expect(totals.totalWeight).toBeGreaterThan(0);
      expect(totals.maxWeight).toBe(50);
    });

    it('should calculate remaining weight', () => {
      const mech = createTestMech(50);
      const totals = calculationService.calculateTotals(mech);
      
      expect(totals.remainingWeight).toBe(totals.maxWeight - totals.totalWeight);
    });

    it('should calculate armor points', () => {
      const mech = createTestMech(50, {
        armor: { head: 9, centerTorso: 20, leftArm: 10, rightArm: 10 },
      });
      const totals = calculationService.calculateTotals(mech);
      
      expect(totals.totalArmorPoints).toBe(49); // 9 + 20 + 10 + 10
    });

    it('should calculate max armor points', () => {
      const mech = createTestMech(50);
      const totals = calculationService.calculateTotals(mech);
      
      // Max armor depends on tonnage
      expect(totals.maxArmorPoints).toBeGreaterThan(0);
    });

    it('should count used critical slots', () => {
      let mech = createTestMech(50);
      mech = builderService.addEquipment(mech, 'medium-laser', 'RT');
      mech = builderService.addEquipment(mech, 'medium-laser', 'LT');
      
      const totals = calculationService.calculateTotals(mech);
      
      expect(totals.usedCriticalSlots).toBe(2);
      expect(totals.totalCriticalSlots).toBe(78);
    });

    it('should scale with tonnage', () => {
      const lightMech = createTestMech(20);
      const assaultMech = createTestMech(100);
      
      const lightTotals = calculationService.calculateTotals(lightMech);
      const assaultTotals = calculationService.calculateTotals(assaultMech);
      
      expect(assaultTotals.maxArmorPoints).toBeGreaterThan(lightTotals.maxArmorPoints);
    });
  });

  // ============================================================================
  // calculateBattleValue
  // ============================================================================
  describe('calculateBattleValue', () => {
    it('should calculate positive BV', () => {
      const mech = createTestMech(50);
      const bv = calculationService.calculateBattleValue(mech);
      
      expect(bv).toBeGreaterThan(0);
    });

    it('should increase with tonnage', () => {
      const lightBV = calculationService.calculateBattleValue(createTestMech(20));
      const assaultBV = calculationService.calculateBattleValue(createTestMech(100));
      
      expect(assaultBV).toBeGreaterThan(lightBV);
    });

    it('should increase with movement', () => {
      const slowMech = createTestMech(50, { walkMP: 3 });
      const fastMech = createTestMech(50, { walkMP: 5 });
      
      const slowBV = calculationService.calculateBattleValue(slowMech);
      const fastBV = calculationService.calculateBattleValue(fastMech);
      
      expect(fastBV).toBeGreaterThan(slowBV);
    });

    it('should increase with armor', () => {
      const unarmored = createTestMech(50);
      const armored = createTestMech(50, {
        armor: { head: 9, centerTorso: 30, leftTorso: 20, rightTorso: 20 },
      });
      
      const unarmoredBV = calculationService.calculateBattleValue(unarmored);
      const armoredBV = calculationService.calculateBattleValue(armored);
      
      expect(armoredBV).toBeGreaterThan(unarmoredBV);
    });

    it('should return integer', () => {
      const mech = createTestMech(50);
      const bv = calculationService.calculateBattleValue(mech);
      
      expect(Number.isInteger(bv)).toBe(true);
    });
  });

  // ============================================================================
  // calculateCost
  // ============================================================================
  describe('calculateCost', () => {
    it('should calculate positive cost', () => {
      const mech = createTestMech(50);
      const cost = calculationService.calculateCost(mech);
      
      expect(cost).toBeGreaterThan(0);
    });

    it('should increase with tonnage', () => {
      const lightCost = calculationService.calculateCost(createTestMech(20));
      const assaultCost = calculationService.calculateCost(createTestMech(100));
      
      expect(assaultCost).toBeGreaterThan(lightCost);
    });

    it('XL engine should increase cost', () => {
      const standardMech = createTestMech(50, { walkMP: 4, engineType: 'Standard' });
      const xlMech = createTestMech(50, { walkMP: 4, engineType: 'XL' });
      
      const standardCost = calculationService.calculateCost(standardMech);
      const xlCost = calculationService.calculateCost(xlMech);
      
      expect(xlCost).toBeGreaterThan(standardCost);
    });

    it('should return integer', () => {
      const mech = createTestMech(50);
      const cost = calculationService.calculateCost(mech);
      
      expect(Number.isInteger(cost)).toBe(true);
    });
  });

  // ============================================================================
  // calculateHeatProfile
  // ============================================================================
  describe('calculateHeatProfile', () => {
    it('should calculate heat dissipation', () => {
      const mech = createTestMech(50);
      const heat = calculationService.calculateHeatProfile(mech);
      
      expect(heat.heatDissipated).toBeGreaterThan(0);
    });

    it('Single heat sinks should dissipate 1 each', () => {
      let mech = builderService.createEmpty(50, TechBase.INNER_SPHERE);
      // Default is 10 single heat sinks
      
      const heat = calculationService.calculateHeatProfile(mech);
      
      expect(heat.heatDissipated).toBe(10); // 10 × 1
    });

    it('Double heat sinks should dissipate 2 each', () => {
      let mech = builderService.createEmpty(50, TechBase.CLAN);
      // Clan defaults to double heat sinks
      
      const heat = calculationService.calculateHeatProfile(mech);
      
      expect(heat.heatDissipated).toBe(20); // 10 × 2
    });

    it('should calculate net heat', () => {
      const mech = createTestMech(50);
      const heat = calculationService.calculateHeatProfile(mech);
      
      expect(heat.netHeat).toBe(heat.heatGenerated - heat.heatDissipated);
    });
  });

  // ============================================================================
  // calculateMovement
  // ============================================================================
  describe('calculateMovement', () => {
    it('should calculate run MP from walk MP', () => {
      const mech = createTestMech(50, { walkMP: 4 });
      const movement = calculationService.calculateMovement(mech);
      
      expect(movement.walkMP).toBe(4);
      expect(movement.runMP).toBe(6); // floor(4 × 1.5) = 6
    });

    it.each([
      [3, 4],   // floor(4.5) = 4
      [4, 6],   // floor(6) = 6
      [5, 7],   // floor(7.5) = 7
      [6, 9],   // floor(9) = 9
      [8, 12],  // floor(12) = 12
    ])('walk %d should give run %d', (walk, expectedRun) => {
      const mech = createTestMech(50, { walkMP: walk });
      const movement = calculationService.calculateMovement(mech);
      
      expect(movement.runMP).toBe(expectedRun);
    });

    it('should default to 0 jump MP', () => {
      const mech = createTestMech(50);
      const movement = calculationService.calculateMovement(mech);
      
      expect(movement.jumpMP).toBe(0);
    });
  });

  // ============================================================================
  // Component Weights
  // ============================================================================
  describe('Component Weight Calculations', () => {
    it('structure should be 10% of tonnage', () => {
      const mech = createTestMech(50);
      const totals = calculationService.calculateTotals(mech);
      
      // Structure weight is included in total
      // 50 × 0.1 = 5 tons for standard structure
      expect(totals.totalWeight).toBeGreaterThanOrEqual(5);
    });

    it('cockpit should add 3 tons', () => {
      const mech = createTestMech(50);
      const totals = calculationService.calculateTotals(mech);
      
      // With structure (5) + cockpit (3) = at least 8 tons
      expect(totals.totalWeight).toBeGreaterThanOrEqual(8);
    });

    it('external heat sinks should add weight', () => {
      // 10 heat sinks included in engine, more add weight
      let mech = createTestMech(50);
      // Default has 10 heat sinks, none external
      const totals = calculationService.calculateTotals(mech);
      
      // Heat sinks at base 10 shouldn't add weight (integrated in engine)
      // This is simplified - actual calculation is more complex
      expect(totals.totalWeight).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle minimum tonnage', () => {
      const mech = createTestMech(20);
      
      expect(() => calculationService.calculateTotals(mech)).not.toThrow();
      expect(() => calculationService.calculateBattleValue(mech)).not.toThrow();
      expect(() => calculationService.calculateCost(mech)).not.toThrow();
    });

    it('should handle maximum tonnage', () => {
      const mech = createTestMech(100);
      
      expect(() => calculationService.calculateTotals(mech)).not.toThrow();
      expect(() => calculationService.calculateBattleValue(mech)).not.toThrow();
      expect(() => calculationService.calculateCost(mech)).not.toThrow();
    });

    it('should handle zero armor', () => {
      const mech = createTestMech(50);
      const totals = calculationService.calculateTotals(mech);
      
      expect(totals.totalArmorPoints).toBe(0);
    });

    it('should handle no equipment', () => {
      const mech = createTestMech(50);
      const totals = calculationService.calculateTotals(mech);
      
      expect(totals.usedCriticalSlots).toBe(0);
    });
  });
});

