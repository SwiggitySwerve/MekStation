import {
  calculateTMM,
  calculateSpeedFactor,
  calculateDefensiveBV,
  calculateOffensiveBV,
  calculateTotalBV,
  getBVBreakdown,
  SPEED_FACTORS,
  calculateOffensiveBVWithHeatTracking,
  calculateOffensiveSpeedFactor,
  type DefensiveBVConfig,
} from '@/utils/construction/battleValueCalculations';
import {
  CANONICAL_BV_UNITS,
  type CanonicalBVUnit,
  type ArmorPoints,
  type StructurePoints,
} from '@/__tests__/fixtures/canonical-bv-units';

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

  describe('calculateDefensiveBV() - legacy tests', () => {
    it('should return DefensiveBVResult object', () => {
      const result = calculateDefensiveBV({
        totalArmorPoints: 100,
        totalStructurePoints: 50,
        tonnage: 50,
        runMP: 6,
        jumpMP: 0,
      });
      expect(result).toHaveProperty('totalDefensiveBV');
      expect(typeof result.totalDefensiveBV).toBe('number');
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
      tonnage: 50,
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

  // ============================================================================
  // OFFENSIVE BV CALCULATION - TDD TESTS (MegaMek-accurate with Heat Tracking)
  // ============================================================================

  describe('calculateOffensiveBV() - MegaMek-accurate with Heat Tracking', () => {
    /**
     * Helper: Sum armor points from all locations
     */
    function sumArmorPoints(armor: ArmorPoints): number {
      return (
        armor.head +
        armor.centerTorso +
        armor.centerTorsoRear +
        armor.leftTorso +
        armor.leftTorsoRear +
        armor.rightTorso +
        armor.rightTorsoRear +
        armor.leftArm +
        armor.rightArm +
        armor.leftLeg +
        armor.rightLeg
      );
    }

    /**
     * Helper: Sum structure points from all locations
     */
    function sumStructurePoints(structure: StructurePoints): number {
      return (
        structure.head +
        structure.centerTorso +
        structure.leftTorso +
        structure.rightTorso +
        structure.leftArm +
        structure.rightArm +
        structure.leftLeg +
        structure.rightLeg
      );
    }

    /**
     * Helper: Build offensive BV config from a canonical unit fixture
     */
    function buildOffensiveBVConfig(unit: CanonicalBVUnit) {
      return {
        weapons: unit.weapons,
        tonnage: unit.tonnage,
        walkMP: unit.walkMP,
        runMP: unit.runMP,
        jumpMP: unit.jumpMP,
        heatDissipation: unit.heatSinks.count, // Single heat sinks = count dissipation
      };
    }

    describe('heat tracking algorithm', () => {
      it('should apply 50% penalty to weapons when cumulative heat exceeds dissipation', () => {
        // Awesome AWS-8Q: 3×PPC (15 heat each) + 1×ML (3 heat)
        // Heat sinks: 15 (single) = 15 dissipation
        // Running heat: 2
        // 
        // Sorted by BV descending: PPC (191), PPC (191), PPC (191), ML (39)
        // Weapon 1 (PPC): cumulative = 2 + 15 = 17 > 15 → 50% penalty → 95.5
        // Weapon 2 (PPC): cumulative = 17 + 15 = 32 > 15 → 50% penalty → 95.5
        // Weapon 3 (PPC): cumulative = 32 + 15 = 47 > 15 → 50% penalty → 95.5
        // Weapon 4 (ML):  cumulative = 47 + 3 = 50 > 15 → 50% penalty → 19.5
        const awesome = CANONICAL_BV_UNITS.find(u => u.id === 'awesome-aws-8q')!;
        const config = buildOffensiveBVConfig(awesome);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // All weapons should get 50% penalty because running heat of 2 + first PPC heat of 15 = 17 > 15
        // (191 + 191 + 191 + 39) × 0.5 = 306
        expect(result.weaponBV).toBeCloseTo(306, 0);
      });

      it('should NOT apply penalty when heat is within dissipation', () => {
        // Locust LCT-1V: 1×ML (3 heat) + 2×MG (0 heat)
        // Heat sinks: 10 = 10 dissipation
        // Running heat: 2
        //
        // Sorted by BV: ML (39), MG (5), MG (5)
        // Weapon 1 (ML): cumulative = 2 + 3 = 5 <= 10 → no penalty → 39
        // Weapon 2 (MG): cumulative = 5 + 0 = 5 <= 10 → no penalty → 5
        // Weapon 3 (MG): cumulative = 5 + 0 = 5 <= 10 → no penalty → 5
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const config = buildOffensiveBVConfig(locust);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // No penalty: 39 + 5 + 5 = 49
        expect(result.weaponBV).toBe(49);
      });

      it('should apply partial penalties based on incremental heat', () => {
        // Hunchback HBK-4G: 1×AC/20 (7 heat) + 2×ML (3 heat each) + 1×SL (1 heat)
        // Heat sinks: 10 = 10 dissipation
        // Running heat: 2
        //
        // Sorted by BV: AC/20 (303), ML (39), ML (39), SL (14)
        // Weapon 1 (AC/20): cumulative = 2 + 7 = 9 <= 10 → no penalty → 303
        // Weapon 2 (ML): cumulative = 9 + 3 = 12 > 10 → 50% penalty → 19.5
        // Weapon 3 (ML): cumulative = 12 + 3 = 15 > 10 → 50% penalty → 19.5
        // Weapon 4 (SL): cumulative = 15 + 1 = 16 > 10 → 50% penalty → 7
        const hunchback = CANONICAL_BV_UNITS.find(u => u.id === 'hunchback-hbk-4g')!;
        const config = buildOffensiveBVConfig(hunchback);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // 303 + 19.5 + 19.5 + 7 = 349
        expect(result.weaponBV).toBeCloseTo(349, 0);
      });

      it('should sort weapons by BV descending before applying heat tracking', () => {
        // Verify that higher BV weapons are counted first (at full value if possible)
        // Atlas AS7-D: 2×PPC (191 each), 3×ML (39 each), 2×SL (14 each)
        // Heat sinks: 17 = 17 dissipation
        // Running heat: 2
        //
        // Sorted by BV: PPC (191), PPC (191), ML (39), ML (39), ML (39), SL (14), SL (14)
        // Heat sequence: 2+15=17, 17+15=32, 32+3=35, 35+3=38, 38+3=41, 41+1=42, 42+1=43
        // All exceed 17 after first PPC, so first PPC is at cumulative 17 (equal, no penalty)
        // Actually: cumulative <= dissipation means no penalty, so first is OK
        const atlas = CANONICAL_BV_UNITS.find(u => u.id === 'atlas-as7-d')!;
        const config = buildOffensiveBVConfig(atlas);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // First PPC: 2 + 15 = 17 <= 17 → no penalty → 191
        // Second PPC: 17 + 15 = 32 > 17 → 50% → 95.5
        // First ML: 32 + 3 = 35 > 17 → 50% → 19.5
        // Second ML: 35 + 3 = 38 > 17 → 50% → 19.5
        // Third ML: 38 + 3 = 41 > 17 → 50% → 19.5
        // First SL: 41 + 1 = 42 > 17 → 50% → 7
        // Second SL: 42 + 1 = 43 > 17 → 50% → 7
        // Total: 191 + 95.5 + 19.5 + 19.5 + 19.5 + 7 + 7 = 359
        expect(result.weaponBV).toBeCloseTo(359, 0);
      });

      it('should start with running heat of 2', () => {
        // The running heat represents movement heat in MegaMek
        // Even a mech with zero-heat weapons starts at heat level 2
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const config = buildOffensiveBVConfig(locust);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // With 10 heat sinks and only 3 heat from ML, running heat 2 + 3 = 5 <= 10
        // All weapons should be at full BV
        expect(result.weaponBV).toBe(49);
      });
    });

    describe('offensive speed factor calculation', () => {
      it('should calculate speed factor using MegaMek formula', () => {
        // Locust: runMP 12, jumpMP 0 → mp = 12
        // pow(1.7, 1.2) ≈ 1.8886 → round(188.86) / 100 = 1.89
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        
        const speedFactor = calculateOffensiveSpeedFactor(locust.runMP, locust.jumpMP);
        
        expect(speedFactor).toBeCloseTo(1.89, 2);
      });

      it('should include half of jump MP in speed calculation', () => {
        // Stinger: runMP 9, jumpMP 6 → mp = 9 + 3 = 12 → 1.89
        const stinger = CANONICAL_BV_UNITS.find(u => u.id === 'stinger-stg-3r')!;
        
        const speedFactor = calculateOffensiveSpeedFactor(stinger.runMP, stinger.jumpMP);
        
        expect(speedFactor).toBeCloseTo(1.89, 2);
      });

      it('should handle slow mechs correctly', () => {
        // Atlas: runMP 5, jumpMP 0
        // mp = 5 + 0 = 5
        // speedFactor = round(pow(1 + (5-5)/10, 1.2) * 100) / 100
        //             = round(pow(1.0, 1.2) * 100) / 100
        //             = round(100) / 100
        //             = 1.0
        const atlas = CANONICAL_BV_UNITS.find(u => u.id === 'atlas-as7-d')!;
        
        const speedFactor = calculateOffensiveSpeedFactor(atlas.runMP, atlas.jumpMP);
        
        expect(speedFactor).toBe(1.0);
      });

      it('should handle very slow mechs (mp < 5)', () => {
        // Awesome: runMP 5, jumpMP 0 → mp = 5 → factor = 1.0
        const awesome = CANONICAL_BV_UNITS.find(u => u.id === 'awesome-aws-8q')!;
        
        const speedFactor = calculateOffensiveSpeedFactor(awesome.runMP, awesome.jumpMP);
        
        expect(speedFactor).toBe(1.0);
      });
    });

    describe('weight bonus calculation', () => {
      it('should add tonnage as weight bonus', () => {
        const atlas = CANONICAL_BV_UNITS.find(u => u.id === 'atlas-as7-d')!;
        const config = buildOffensiveBVConfig(atlas);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // Weight bonus = tonnage = 100
        expect(result.weightBonus).toBe(100);
      });

      it('should add weight bonus for light mechs', () => {
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const config = buildOffensiveBVConfig(locust);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // Weight bonus = tonnage = 20
        expect(result.weightBonus).toBe(20);
      });
    });

    describe('total offensive BV calculation', () => {
      it('should calculate total offensive BV for Locust LCT-1V', () => {
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const config = buildOffensiveBVConfig(locust);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // Weapon BV: 49, Weight: 20, Base: 69, Factor: 1.89 → round(130.41) = 130
        expect(result.totalOffensiveBV).toBeCloseTo(130, 0);
      });

      it('should calculate total offensive BV for Awesome AWS-8Q (heat-heavy)', () => {
        const awesome = CANONICAL_BV_UNITS.find(u => u.id === 'awesome-aws-8q')!;
        const config = buildOffensiveBVConfig(awesome);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // Weapon BV: 306 (all 50% penalty)
        // Weight bonus: 80
        // Base offensive: 386
        // Speed factor: 1.0 (slow mech)
        // Total: round(386 * 1.0) = 386
        expect(result.totalOffensiveBV).toBeCloseTo(386, 0);
      });

      it('should calculate total offensive BV for Atlas AS7-D', () => {
        const atlas = CANONICAL_BV_UNITS.find(u => u.id === 'atlas-as7-d')!;
        const config = buildOffensiveBVConfig(atlas);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // Weapon BV: 359 (partial heat penalties)
        // Weight bonus: 100
        // Base offensive: 459
        // Speed factor: 1.0
        // Total: round(459 * 1.0) = 459
        expect(result.totalOffensiveBV).toBeCloseTo(459, 0);
      });
    });

    describe('return type structure', () => {
      it('should return OffensiveBVResult with all components', () => {
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const config = buildOffensiveBVConfig(locust);
        
        const result = calculateOffensiveBVWithHeatTracking(config);
        
        // Verify all properties exist
        expect(result).toHaveProperty('weaponBV');
        expect(result).toHaveProperty('weightBonus');
        expect(result).toHaveProperty('speedFactor');
        expect(result).toHaveProperty('totalOffensiveBV');
        
        // Verify types
        expect(typeof result.weaponBV).toBe('number');
        expect(typeof result.weightBonus).toBe('number');
        expect(typeof result.speedFactor).toBe('number');
        expect(typeof result.totalOffensiveBV).toBe('number');
      });
    });
  });

    it('should provide a consistent breakdown', () => {
      const breakdown = getBVBreakdown(config);
      expect(breakdown.defensiveBV).toBeGreaterThanOrEqual(0);
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

  // ============================================================================
  // DEFENSIVE BV CALCULATION - TDD TESTS (MegaMek-accurate)
  // ============================================================================

  describe('calculateDefensiveBV() - MegaMek-accurate', () => {
    /**
     * Helper: Sum armor points from all locations
     */
    function sumArmorPoints(armor: ArmorPoints): number {
      return (
        armor.head +
        armor.centerTorso +
        armor.centerTorsoRear +
        armor.leftTorso +
        armor.leftTorsoRear +
        armor.rightTorso +
        armor.rightTorsoRear +
        armor.leftArm +
        armor.rightArm +
        armor.leftLeg +
        armor.rightLeg
      );
    }

    /**
     * Helper: Sum structure points from all locations
     */
    function sumStructurePoints(structure: StructurePoints): number {
      return (
        structure.head +
        structure.centerTorso +
        structure.leftTorso +
        structure.rightTorso +
        structure.leftArm +
        structure.rightArm +
        structure.leftLeg +
        structure.rightLeg
      );
    }

    /**
     * Helper: Build DefensiveBVConfig from a canonical unit fixture
     */
    function buildDefensiveBVConfig(unit: CanonicalBVUnit): DefensiveBVConfig {
      return {
        totalArmorPoints: sumArmorPoints(unit.armor),
        totalStructurePoints: sumStructurePoints(unit.structure),
        tonnage: unit.tonnage,
        runMP: unit.runMP,
        jumpMP: unit.jumpMP,
        armorType: 'standard',
        structureType: 'standard',
        gyroType: 'standard',
      };
    }

    describe('armor BV calculation', () => {
      it('should calculate armor BV as totalArmor × 2.5 × armorMultiplier', () => {
        // Locust LCT-1V: 46 armor points × 2.5 = 115 base armor BV
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const totalArmor = sumArmorPoints(locust.armor);
        expect(totalArmor).toBe(46);

        const config = buildDefensiveBVConfig(locust);
        const result = calculateDefensiveBV(config);

        // Armor BV component should be 46 × 2.5 = 115
        // (before defensive factor applied)
        expect(result.armorBV).toBe(115);
      });

      it('should apply hardened armor multiplier (2.0×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'hardened',
          structureType: 'standard',
          gyroType: 'standard',
        };
        const result = calculateDefensiveBV(config);

        // 100 × 2.5 × 2.0 = 500
        expect(result.armorBV).toBe(500);
      });

      it('should apply reactive armor multiplier (1.5×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'reactive',
          structureType: 'standard',
          gyroType: 'standard',
        };
        const result = calculateDefensiveBV(config);

        // 100 × 2.5 × 1.5 = 375
        expect(result.armorBV).toBe(375);
      });
    });

    describe('structure BV calculation', () => {
      it('should calculate structure BV as totalStructure × 1.5 × structureMultiplier', () => {
        // Locust LCT-1V: 33 structure points × 1.5 = 49.5 -> 50 (rounded)
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const totalStructure = sumStructurePoints(locust.structure);
        expect(totalStructure).toBe(33);

        const config = buildDefensiveBVConfig(locust);
        const result = calculateDefensiveBV(config);

        // Structure BV component should be 33 × 1.5 = 49.5
        expect(result.structureBV).toBe(49.5);
      });

      it('should apply reinforced structure multiplier (2.0×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'reinforced',
          gyroType: 'standard',
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 2.0 = 150
        expect(result.structureBV).toBe(150);
      });

      it('should apply industrial structure multiplier (0.5×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'industrial',
          gyroType: 'standard',
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 0.5 = 37.5
        expect(result.structureBV).toBe(37.5);
      });
    });

    describe('gyro BV calculation', () => {
      it('should calculate gyro BV as tonnage × gyroMultiplier', () => {
        // Standard gyro: tonnage × 0.5
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const config = buildDefensiveBVConfig(locust);
        const result = calculateDefensiveBV(config);

        // 20 tons × 0.5 = 10
        expect(result.gyroBV).toBe(10);
      });

      it('should apply heavy-duty gyro multiplier (1.0×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 75,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'heavy-duty',
        };
        const result = calculateDefensiveBV(config);

        // 75 tons × 1.0 = 75
        expect(result.gyroBV).toBe(75);
      });

      it('should calculate gyro BV for assault mechs', () => {
        // Atlas AS7-D: 100 tons × 0.5 = 50 gyro BV
        const atlas = CANONICAL_BV_UNITS.find(u => u.id === 'atlas-as7-d')!;
        const config = buildDefensiveBVConfig(atlas);
        const result = calculateDefensiveBV(config);

        expect(result.gyroBV).toBe(50);
      });
    });

    describe('defensive factor (TMM-based)', () => {
      it('should apply defensive factor = 1 + (maxTMM / 10)', () => {
        // Locust: runMP 12, jumpMP 0 -> TMM 4 -> factor 1.4
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const config = buildDefensiveBVConfig(locust);
        const result = calculateDefensiveBV(config);

        expect(result.defensiveFactor).toBe(1.4);
      });

      it('should use jump MP for TMM if higher than run', () => {
        // Stinger: runMP 9, jumpMP 6 -> max(9,6)=9 -> TMM 3 -> factor 1.3
        const stinger = CANONICAL_BV_UNITS.find(u => u.id === 'stinger-stg-3r')!;
        const config = buildDefensiveBVConfig(stinger);
        const result = calculateDefensiveBV(config);

        expect(result.defensiveFactor).toBe(1.3);
      });

      it('should handle slow mechs (TMM 0)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 100,
          runMP: 2,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
        };
        const result = calculateDefensiveBV(config);

        // runMP 2 -> TMM 0 -> factor 1.0
        expect(result.defensiveFactor).toBe(1.0);
      });
    });

    describe('total defensive BV calculation', () => {
      it('should calculate total defensive BV for Locust LCT-1V', () => {
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const config = buildDefensiveBVConfig(locust);
        const result = calculateDefensiveBV(config);

        // Armor: 46 × 2.5 = 115
        // Structure: 33 × 1.5 = 49.5
        // Gyro: 20 × 0.5 = 10
        // Base: 115 + 49.5 + 10 = 174.5
        // TMM 4 -> factor 1.4
        // Total: 174.5 × 1.4 = 244.3 -> round to 244
        expect(result.totalDefensiveBV).toBe(244);
      });

      it('should calculate total defensive BV for Stinger STG-3R', () => {
        const stinger = CANONICAL_BV_UNITS.find(u => u.id === 'stinger-stg-3r')!;
        const config = buildDefensiveBVConfig(stinger);
        const result = calculateDefensiveBV(config);

        // Armor: 46 × 2.5 = 115
        // Structure: 33 × 1.5 = 49.5
        // Gyro: 20 × 0.5 = 10
        // Base: 174.5
        // TMM 3 -> factor 1.3
        // Total: 174.5 × 1.3 = 226.85 -> round to 227
        expect(result.totalDefensiveBV).toBe(227);
      });

      it('should calculate total defensive BV for Atlas AS7-D', () => {
        const atlas = CANONICAL_BV_UNITS.find(u => u.id === 'atlas-as7-d')!;
        const config = buildDefensiveBVConfig(atlas);
        const result = calculateDefensiveBV(config);

        // Armor: 239 × 2.5 = 597.5
        // Structure: 152 × 1.5 = 228
        // Gyro: 100 × 0.5 = 50
        // Base: 875.5
        // runMP 5 -> TMM 2 -> factor 1.2
        // Total: 875.5 × 1.2 = 1050.6 -> round to 1051
        expect(result.totalDefensiveBV).toBe(1051);
      });

      it('should calculate total defensive BV for all canonical units', () => {
        // This test verifies the formula works across all unit types
        for (const unit of CANONICAL_BV_UNITS) {
          const config = buildDefensiveBVConfig(unit);
          const result = calculateDefensiveBV(config);

          // Defensive BV should be positive
          expect(result.totalDefensiveBV).toBeGreaterThan(0);

          // Defensive BV should be less than total BV (offensive adds more)
          expect(result.totalDefensiveBV).toBeLessThan(unit.expectedBV);
        }
      });
    });

    describe('return type structure', () => {
      it('should return DefensiveBVResult with all components', () => {
        const locust = CANONICAL_BV_UNITS.find(u => u.id === 'locust-lct-1v')!;
        const config = buildDefensiveBVConfig(locust);
        const result = calculateDefensiveBV(config);

        // Verify all properties exist
        expect(result).toHaveProperty('armorBV');
        expect(result).toHaveProperty('structureBV');
        expect(result).toHaveProperty('gyroBV');
        expect(result).toHaveProperty('defensiveFactor');
        expect(result).toHaveProperty('totalDefensiveBV');

        // Verify types
        expect(typeof result.armorBV).toBe('number');
        expect(typeof result.structureBV).toBe('number');
        expect(typeof result.gyroBV).toBe('number');
        expect(typeof result.defensiveFactor).toBe('number');
        expect(typeof result.totalDefensiveBV).toBe('number');
      });
    });
  });
});

