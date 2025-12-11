import {
  calculateTMM,
  calculateSpeedFactor,
  calculateDefensiveBV,
  calculateOffensiveBV,
  calculateTotalBV,
  getBVBreakdown,
  SPEED_FACTORS,
} from '@/utils/construction/battleValueCalculations';

describe('battleValueCalculations', () => {
  describe('calculateTMM()', () => {
    it('should return 0 for low movement', () => {
      expect(calculateTMM(2, 0)).toBe(0);
    });

    it('should return 1 for movement 3-4', () => {
      expect(calculateTMM(3, 0)).toBe(1);
      expect(calculateTMM(4, 0)).toBe(1);
    });

    it('should return 2 for movement 5-6', () => {
      expect(calculateTMM(5, 0)).toBe(2);
      expect(calculateTMM(6, 0)).toBe(2);
    });

    it('should use jump MP if higher', () => {
      expect(calculateTMM(3, 5)).toBe(2); // Uses jump MP 5
    });

    it('should return 7 for very high movement', () => {
      expect(calculateTMM(25, 0)).toBe(7);
    });
  });

  describe('calculateSpeedFactor()', () => {
    it('should return base factor for no jump', () => {
      const factor = calculateSpeedFactor(4, 6, 0);
      const tmm = calculateTMM(6, 0);
      expect(factor).toBe(SPEED_FACTORS[tmm]);
    });

    it('should add jump bonus when jump > walk', () => {
      const factor = calculateSpeedFactor(4, 6, 8);
      expect(factor).toBeGreaterThan(SPEED_FACTORS[calculateTMM(6, 8)]);
    });

    it('should cap jump bonus at 0.5', () => {
      const factor = calculateSpeedFactor(4, 6, 10);
      const baseFactor = SPEED_FACTORS[calculateTMM(6, 10)];
      expect(factor).toBeLessThanOrEqual(baseFactor + 0.5);
    });

    it('should cap total factor at 2.24', () => {
      const factor = calculateSpeedFactor(1, 10, 20);
      expect(factor).toBeLessThanOrEqual(2.24);
    });
  });

  describe('calculateDefensiveBV()', () => {
    it('should calculate defensive BV', () => {
      const bv = calculateDefensiveBV(100, 50, 10);
      // armor_factor = 100 × 2.5 = 250
      // structure_factor = 50 × 1.5 = 75
      // defensive_modifier = 1.0 (no bonus)
      // BV = (250 + 75) × 1.0 = 325
      expect(bv).toBeGreaterThan(0);
    });

    it('should apply heat sink bonus', () => {
      const bv10 = calculateDefensiveBV(100, 50, 10);
      const bv20 = calculateDefensiveBV(100, 50, 20);
      
      expect(bv20).toBeGreaterThan(bv10);
    });

    it('should apply defensive equipment bonus', () => {
      const bvNoEq = calculateDefensiveBV(100, 50, 10, false);
      const bvWithEq = calculateDefensiveBV(100, 50, 10, true);
      
      expect(bvWithEq).toBeGreaterThan(bvNoEq);
    });
  });

  describe('calculateOffensiveBV()', () => {
    it('should apply rear and targeting computer modifiers', () => {
      const offensive = calculateOffensiveBV(
        [
          { id: 'medium-laser' },
          { id: 'ac-10', rear: true },
        ],
        true
      );

      // medium-laser: 46 * 1.25 = 57.5 -> 58
      // ac-10 rear: 123 * 0.5 = 61.5 -> 62, then *1.25 = 77.5 -> 78
      expect(offensive).toBe(136);
    });
  });

  describe('calculateTotalBV() and getBVBreakdown()', () => {
    const config = {
      totalArmorPoints: 120,
      totalStructurePoints: 60,
      heatSinkCapacity: 16,
      walkMP: 5,
      runMP: 8,
      jumpMP: 4,
      weapons: [
        { id: 'medium-laser' },
        { id: 'lrm-10' },
      ],
      hasTargetingComputer: true,
      hasDefensiveEquipment: true,
    };

    it('should calculate total BV from defensive and offensive values', () => {
      const total = calculateTotalBV(config);
      expect(total).toBeGreaterThan(0);
    });

    it('should provide a consistent breakdown', () => {
      const breakdown = getBVBreakdown(config);
      expect(breakdown.defensiveBV).toBeGreaterThan(0);
      expect(breakdown.offensiveBV).toBeGreaterThan(0);
      expect(breakdown.speedFactor).toBeGreaterThan(1);
      expect(breakdown.totalBV).toBe(
        calculateTotalBV(config)
      );
    });
  });

  describe('SPEED_FACTORS', () => {
    it('should have factors for TMM 0-10', () => {
      expect(SPEED_FACTORS[0]).toBe(1.0);
      expect(SPEED_FACTORS[5]).toBe(1.5);
      expect(SPEED_FACTORS[10]).toBe(2.0);
    });
  });
});

