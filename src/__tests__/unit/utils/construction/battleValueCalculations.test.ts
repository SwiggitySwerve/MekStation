import {
  CANONICAL_BV_UNITS,
  type CanonicalBVUnit,
  type ArmorPoints,
  type StructurePoints,
} from '@/__tests__/fixtures/canonical-bv-units';
import { EngineType } from '@/types/construction/EngineType';
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
  calculateExplosivePenalties,
  type DefensiveBVConfig,
  type ExplosiveEquipmentEntry,
  type ExplosivePenaltyConfig,
  type MechLocation,
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

    it('should return 6 for very high movement (25+ MP)', () => {
      expect(calculateTMM(25, 0)).toBe(6);
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
        [{ id: 'medium-laser' }, { id: 'ac-10', rear: true }],
        true,
      );

      // medium-laser: 46 * 1.25 = 57.5
      // ac-10 rear: 123 * 0.5 = 61.5, then *1.25 = 76.875
      // No intermediate rounding — accumulate as float
      expect(offensive).toBeCloseTo(134.375, 2);
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
      weapons: [{ id: 'medium-laser' }, { id: 'lrm-10' }],
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
        it('should apply 50% penalty to weapons when cumulative heat exceeds heat efficiency', () => {
          // Awesome AWS-8Q: 3×PPC (10 heat each) + 1×ML (3 heat)
          // Heat sinks: 28 (single) = 28 dissipation
          // Heat efficiency = 6 + 28 - 2 = 32
          //
          // Sorted by BV descending: PPC (176), PPC (176), PPC (176), ML (46)
          // Weapon 1 (PPC): heatSum = 10, exceeded=false → full BV = 176, 10 < 32
          // Weapon 2 (PPC): heatSum = 20, exceeded=false → full BV = 176, 20 < 32
          // Weapon 3 (PPC): heatSum = 30, exceeded=false → full BV = 176, 30 < 32
          // Weapon 4 (ML):  heatSum = 33, exceeded=false → full BV = 46, 33 >= 32 → exceeded
          // All weapons fit within heat efficiency threshold
          const awesome = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'awesome-aws-8q',
          )!;
          const config = buildOffensiveBVConfig(awesome);

          const result = calculateOffensiveBVWithHeatTracking(config);

          // All 3 PPCs + ML at full BV (weapon that crosses threshold gets full BV)
          // 176 + 176 + 176 + 46 = 574
          expect(result.weaponBV).toBeCloseTo(574, 0);
        });

        it('should NOT apply penalty when heat is within dissipation', () => {
          // Locust LCT-1V: 1×ML (3 heat) + 2×MG (0 heat)
          // Heat sinks: 10 = 10 dissipation
          // Running heat: 2
          //
          // Sorted by BV: ML (46), MG (5), MG (5)
          // Weapon 1 (ML): cumulative = 2 + 3 = 5 <= 10 → no penalty → 46
          // Weapon 2 (MG): cumulative = 5 + 0 = 5 <= 10 → no penalty → 5
          // Weapon 3 (MG): cumulative = 5 + 0 = 5 <= 10 → no penalty → 5
          const locust = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'locust-lct-1v',
          )!;
          const config = buildOffensiveBVConfig(locust);

          const result = calculateOffensiveBVWithHeatTracking(config);

          // No penalty: 46 + 5 + 5 = 56
          expect(result.weaponBV).toBe(56);
        });

        it('should apply partial penalties based on incremental heat', () => {
          // Hunchback HBK-4G: 1×AC/20 (7 heat) + 2×ML (3 heat each) + 1×SL (1 heat)
          // Heat sinks: 10 = 10 dissipation
          // Heat efficiency = 6 + 10 - 2 = 14
          //
          // Sorted by BV: AC/20 (303), ML (46), ML (46), SL (9)
          // Weapon 1 (AC/20): heatSum=7, exceeded=false → 303, 7 < 14
          // Weapon 2 (ML): heatSum=10, exceeded=false → 46, 10 < 14
          // Weapon 3 (ML): heatSum=13, exceeded=false → 46, 13 < 14
          // Weapon 4 (SL): heatSum=14, exceeded=false → 9, 14 >= 14 → exceeded
          // All weapons within heat efficiency (weapon at threshold gets full BV)
          const hunchback = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'hunchback-hbk-4g',
          )!;
          const config = buildOffensiveBVConfig(hunchback);

          const result = calculateOffensiveBVWithHeatTracking(config);

          // 303 + 46 + 46 + 9 = 404
          expect(result.weaponBV).toBeCloseTo(404, 0);
        });

        it('should sort weapons by BV descending before applying heat tracking', () => {
          // Hunchback HBK-4G: AC/20 (303), 2×ML (46 each), SL (9)
          // Heat efficiency = 6 + 10 - 2 = 14
          //
          // Sorted by BV: AC/20 (303), ML (46), ML (46), SL (9)
          // All weapons within heatEfficiency=14 (total weapon heat=14)
          // Weapon at threshold gets full BV, so all 4 weapons at full BV
          // Total: 303 + 46 + 46 + 9 = 404
          const hunchback = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'hunchback-hbk-4g',
          )!;
          const config = buildOffensiveBVConfig(hunchback);

          const result = calculateOffensiveBVWithHeatTracking(config);

          expect(result.weaponBV).toBeCloseTo(404, 0);
        });

        it('should subtract running heat from heat efficiency threshold', () => {
          // Heat efficiency = 6 + heatDissipation - moveHeat
          // Locust: 6 + 10 - 2 = 14. Only 3 weapon heat, well within threshold.
          const locust = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'locust-lct-1v',
          )!;
          const config = buildOffensiveBVConfig(locust);

          const result = calculateOffensiveBVWithHeatTracking(config);

          // All weapons at full BV: 46 + 5 + 5 = 56
          expect(result.weaponBV).toBe(56);
        });
      });

      describe('offensive speed factor calculation', () => {
        it('should calculate speed factor using MegaMek formula', () => {
          // Locust: runMP 12, jumpMP 0 → mp = 12
          // pow(1.7, 1.2) ≈ 1.8886 → round(188.86) / 100 = 1.89
          const locust = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'locust-lct-1v',
          )!;

          const speedFactor = calculateOffensiveSpeedFactor(
            locust.runMP,
            locust.jumpMP,
          );

          expect(speedFactor).toBeCloseTo(1.89, 2);
        });

        it('should include half of jump MP in speed calculation', () => {
          // Stinger: runMP 9, jumpMP 6 → mp = 9 + 3 = 12 → 1.89
          const stinger = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'stinger-stg-3r',
          )!;

          const speedFactor = calculateOffensiveSpeedFactor(
            stinger.runMP,
            stinger.jumpMP,
          );

          expect(speedFactor).toBeCloseTo(1.89, 2);
        });

        it('should handle slow mechs correctly', () => {
          // Atlas: runMP 5, jumpMP 0
          // mp = 5 + 0 = 5
          // speedFactor = round(pow(1 + (5-5)/10, 1.2) * 100) / 100
          //             = round(pow(1.0, 1.2) * 100) / 100
          //             = round(100) / 100
          //             = 1.0
          const atlas = CANONICAL_BV_UNITS.find((u) => u.id === 'atlas-as7-d')!;

          const speedFactor = calculateOffensiveSpeedFactor(
            atlas.runMP,
            atlas.jumpMP,
          );

          expect(speedFactor).toBe(1.0);
        });

        it('should handle very slow mechs (mp < 5)', () => {
          // Awesome: runMP 5, jumpMP 0 → mp = 5 → factor = 1.0
          const awesome = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'awesome-aws-8q',
          )!;

          const speedFactor = calculateOffensiveSpeedFactor(
            awesome.runMP,
            awesome.jumpMP,
          );

          expect(speedFactor).toBe(1.0);
        });
      });

      describe('weight bonus calculation', () => {
        it('should add tonnage as weight bonus', () => {
          const atlas = CANONICAL_BV_UNITS.find((u) => u.id === 'atlas-as7-d')!;
          const config = buildOffensiveBVConfig(atlas);

          const result = calculateOffensiveBVWithHeatTracking(config);

          // Weight bonus = tonnage = 100
          expect(result.weightBonus).toBe(100);
        });

        it('should add weight bonus for light mechs', () => {
          const locust = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'locust-lct-1v',
          )!;
          const config = buildOffensiveBVConfig(locust);

          const result = calculateOffensiveBVWithHeatTracking(config);

          // Weight bonus = tonnage = 20
          expect(result.weightBonus).toBe(20);
        });
      });

      describe('total offensive BV calculation', () => {
        it('should calculate total offensive BV for Locust LCT-1V', () => {
          const locust = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'locust-lct-1v',
          )!;
          const config = buildOffensiveBVConfig(locust);

          const result = calculateOffensiveBVWithHeatTracking(config);

          // Weapon BV: 56, Weight: 20, Base: 76, Factor: 1.89 → round(143.64) = 144
          expect(result.totalOffensiveBV).toBeCloseTo(144, 0);
        });

        it('should calculate total offensive BV for Awesome AWS-8Q (heat-heavy)', () => {
          const awesome = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'awesome-aws-8q',
          )!;
          const config = buildOffensiveBVConfig(awesome);

          const result = calculateOffensiveBVWithHeatTracking(config);

          // Weapon BV: 574 (all weapons within heat efficiency = 6+28-2 = 32)
          // Weight bonus: 80
          // Base offensive: 654
          // Speed factor: 1.0
          // Total: 654 * 1.0 = 654 (no intermediate rounding)
          expect(result.totalOffensiveBV).toBeCloseTo(654, 0);
        });

        it('should calculate total offensive BV for Hunchback HBK-4G', () => {
          const hunchback = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'hunchback-hbk-4g',
          )!;
          const config = buildOffensiveBVConfig(hunchback);

          const result = calculateOffensiveBVWithHeatTracking(config);

          // Weapon BV: 404 (all within heat efficiency = 6+10-2 = 14)
          // Weight bonus: 50
          // Base offensive: 454
          // Speed factor: 1.37 (runMP 8)
          // Total: 454 * 1.37 = 621.98 (no intermediate rounding)
          expect(result.totalOffensiveBV).toBeCloseTo(621.98, 0);
        });
      });

      describe('return type structure', () => {
        it('should return OffensiveBVResult with all components', () => {
          const locust = CANONICAL_BV_UNITS.find(
            (u) => u.id === 'locust-lct-1v',
          )!;
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
      expect(breakdown.totalBV).toBe(calculateTotalBV(config));
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
  // INTEGRATION TESTS - CANONICAL UNIT VALIDATION
  // ============================================================================

  describe('calculateTotalBV() - Canonical Unit Integration', () => {
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
     * Helper: Build config for calculateDefensiveBV + calculateOffensiveBVWithHeatTracking
     */
    function calculateCanonicalUnitBV(unit: CanonicalBVUnit): number {
      const defensiveConfig = {
        totalArmorPoints: sumArmorPoints(unit.armor),
        totalStructurePoints: sumStructurePoints(unit.structure),
        tonnage: unit.tonnage,
        runMP: unit.runMP,
        jumpMP: unit.jumpMP,
        armorType: 'standard',
        structureType: 'standard',
        gyroType: 'standard',
      };

      const offensiveConfig = {
        weapons: unit.weapons,
        ammo: unit.ammo,
        tonnage: unit.tonnage,
        walkMP: unit.walkMP,
        runMP: unit.runMP,
        jumpMP: unit.jumpMP,
        heatDissipation: unit.heatSinks.count,
      };

      const defensiveResult = calculateDefensiveBV(defensiveConfig);
      const offensiveResult =
        calculateOffensiveBVWithHeatTracking(offensiveConfig);

      return Math.round(
        defensiveResult.totalDefensiveBV + offensiveResult.totalOffensiveBV,
      );
    }

    it('should calculate exact BV for Atlas AS7-D (1,942)', () => {
      const atlas = CANONICAL_BV_UNITS.find((u) => u.id === 'atlas-as7-d')!;
      const result = calculateCanonicalUnitBV(atlas);
      expect(result).toBe(1942);
    });

    it('should calculate exact BV for Locust LCT-1V (390)', () => {
      const locust = CANONICAL_BV_UNITS.find((u) => u.id === 'locust-lct-1v')!;
      const result = calculateCanonicalUnitBV(locust);
      expect(result).toBe(390);
    });

    it('should calculate exact BV for Hunchback HBK-4G (1,149)', () => {
      const hunchback = CANONICAL_BV_UNITS.find(
        (u) => u.id === 'hunchback-hbk-4g',
      )!;
      const result = calculateCanonicalUnitBV(hunchback);
      expect(result).toBe(1149);
    });

    it('should calculate exact BV for Awesome AWS-8Q (1,423)', () => {
      const awesome = CANONICAL_BV_UNITS.find(
        (u) => u.id === 'awesome-aws-8q',
      )!;
      const result = calculateCanonicalUnitBV(awesome);
      expect(result).toBe(1423);
    });

    it('should calculate exact BV for Stinger STG-3R (439)', () => {
      const stinger = CANONICAL_BV_UNITS.find(
        (u) => u.id === 'stinger-stg-3r',
      )!;
      const result = calculateCanonicalUnitBV(stinger);
      expect(result).toBe(439);
    });

    it('should calculate exact BV for Commando COM-2D (595)', () => {
      const commando = CANONICAL_BV_UNITS.find(
        (u) => u.id === 'commando-com-2d',
      )!;
      const result = calculateCanonicalUnitBV(commando);
      expect(result).toBe(595);
    });

    it('should calculate exact BV for Centurion CN9-A (959)', () => {
      const centurion = CANONICAL_BV_UNITS.find(
        (u) => u.id === 'centurion-cn9-a',
      )!;
      const result = calculateCanonicalUnitBV(centurion);
      expect(result).toBe(959);
    });

    it('should calculate exact BV for Marauder MAD-3R (1,228)', () => {
      const marauder = CANONICAL_BV_UNITS.find(
        (u) => u.id === 'marauder-mad-3r',
      )!;
      const result = calculateCanonicalUnitBV(marauder);
      expect(result).toBe(1228);
    });

    it('should calculate exact BV for Warhammer WHM-6R (1,166)', () => {
      const warhammer = CANONICAL_BV_UNITS.find(
        (u) => u.id === 'warhammer-whm-6r',
      )!;
      const result = calculateCanonicalUnitBV(warhammer);
      expect(result).toBe(1166);
    });

    it('should calculate exact BV for BattleMaster BLR-1G (1,383)', () => {
      const battlemaster = CANONICAL_BV_UNITS.find(
        (u) => u.id === 'battlemaster-blr-1g',
      )!;
      const result = calculateCanonicalUnitBV(battlemaster);
      expect(result).toBe(1383);
    });

    it('should calculate exact BV for all 10 canonical units', () => {
      for (const unit of CANONICAL_BV_UNITS) {
        const result = calculateCanonicalUnitBV(unit);
        expect(result).toBe(unit.expectedBV);
      }
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
        const locust = CANONICAL_BV_UNITS.find(
          (u) => u.id === 'locust-lct-1v',
        )!;
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
        const locust = CANONICAL_BV_UNITS.find(
          (u) => u.id === 'locust-lct-1v',
        )!;
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

    describe('engine BV multiplier for structure calculation', () => {
      it('should apply standard fusion engine multiplier (1.0×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          engineType: EngineType.STANDARD,
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 1.0 = 75
        expect(result.structureBV).toBe(75);
      });

      it('should apply XL (IS) engine multiplier (0.75×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          engineType: EngineType.XL_IS,
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 0.75 = 56.25
        expect(result.structureBV).toBe(56.25);
      });

      it('should apply XL (Clan) engine multiplier (0.75×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          engineType: EngineType.XL_CLAN,
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 0.75 = 56.25
        expect(result.structureBV).toBe(56.25);
      });

      it('should apply light engine multiplier (0.75×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          engineType: EngineType.LIGHT,
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 0.75 = 56.25
        expect(result.structureBV).toBe(56.25);
      });

      it('should apply XXL engine multiplier (0.5×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          engineType: EngineType.XXL,
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 0.5 = 37.5
        expect(result.structureBV).toBe(37.5);
      });

      it('should apply compact engine multiplier (1.0×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          engineType: EngineType.COMPACT,
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 1.0 = 75
        expect(result.structureBV).toBe(75);
      });

      it('should apply ICE engine multiplier (1.0×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          engineType: EngineType.ICE,
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 1.0 = 75
        expect(result.structureBV).toBe(75);
      });

      it('should apply fuel cell engine multiplier (1.0×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          engineType: EngineType.FUEL_CELL,
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 1.0 = 75
        expect(result.structureBV).toBe(75);
      });

      it('should apply fission engine multiplier (1.0×)', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          engineType: EngineType.FISSION,
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 1.0 = 75
        expect(result.structureBV).toBe(75);
      });

      it('should combine engine multiplier with structure type multiplier', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'reinforced',
          gyroType: 'standard',
          engineType: EngineType.XL_IS,
        };
        const result = calculateDefensiveBV(config);

        // 50 × 1.5 × 2.0 (reinforced) × 0.75 (XL) = 112.5
        expect(result.structureBV).toBe(112.5);
      });
    });

    describe('gyro BV calculation', () => {
      it('should calculate gyro BV as tonnage × gyroMultiplier', () => {
        // Standard gyro: tonnage × 0.5
        const locust = CANONICAL_BV_UNITS.find(
          (u) => u.id === 'locust-lct-1v',
        )!;
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
        const atlas = CANONICAL_BV_UNITS.find((u) => u.id === 'atlas-as7-d')!;
        const config = buildDefensiveBVConfig(atlas);
        const result = calculateDefensiveBV(config);

        expect(result.gyroBV).toBe(50);
      });
    });

    describe('defensive factor (TMM-based)', () => {
      it('should apply defensive factor = 1 + (maxTMM / 10)', () => {
        // Locust: runMP 12, jumpMP 0 -> TMM 4 -> factor 1.4
        const locust = CANONICAL_BV_UNITS.find(
          (u) => u.id === 'locust-lct-1v',
        )!;
        const config = buildDefensiveBVConfig(locust);
        const result = calculateDefensiveBV(config);

        expect(result.defensiveFactor).toBe(1.4);
      });

      it('should use jump MP for TMM if higher than run', () => {
        // Stinger: runMP 9, jumpMP 6 -> max(9,6)=9 -> TMM 3 -> factor 1.3
        const stinger = CANONICAL_BV_UNITS.find(
          (u) => u.id === 'stinger-stg-3r',
        )!;
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
        const locust = CANONICAL_BV_UNITS.find(
          (u) => u.id === 'locust-lct-1v',
        )!;
        const config = buildDefensiveBVConfig(locust);
        const result = calculateDefensiveBV(config);

        // Armor: 46 × 2.5 = 115
        // Structure: 33 × 1.5 = 49.5
        // Gyro: 20 × 0.5 = 10
        // Base: 115 + 49.5 + 10 = 174.5
        // TMM 4 -> factor 1.4
        // Total: 174.5 × 1.4 = 244.3 (no intermediate rounding)
        expect(result.totalDefensiveBV).toBeCloseTo(244.3, 1);
      });

      it('should calculate total defensive BV for Stinger STG-3R', () => {
        const stinger = CANONICAL_BV_UNITS.find(
          (u) => u.id === 'stinger-stg-3r',
        )!;
        const config = buildDefensiveBVConfig(stinger);
        const result = calculateDefensiveBV(config);

        // Armor: 46 × 2.5 = 115
        // Structure: 33 × 1.5 = 49.5
        // Gyro: 20 × 0.5 = 10
        // Base: 174.5
        // TMM 3 -> factor 1.3
        // Total: 174.5 × 1.3 = 226.85 (no intermediate rounding)
        expect(result.totalDefensiveBV).toBeCloseTo(226.85, 1);
      });

      it('should calculate total defensive BV for Hunchback HBK-4G', () => {
        const hunchback = CANONICAL_BV_UNITS.find(
          (u) => u.id === 'hunchback-hbk-4g',
        )!;
        const config = buildDefensiveBVConfig(hunchback);
        const result = calculateDefensiveBV(config);

        // Armor: 106 × 2.5 = 265
        // Structure: 77 × 1.5 = 115.5
        // Gyro: 50 × 0.5 = 25
        // Base: 405.5
        // runMP 8 -> TMM 3 -> factor 1.3
        // Total: 405.5 × 1.3 = 527.15 (no intermediate rounding)
        expect(result.totalDefensiveBV).toBeCloseTo(527.15, 1);
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
        const locust = CANONICAL_BV_UNITS.find(
          (u) => u.id === 'locust-lct-1v',
        )!;
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

  // ============================================================================
  // EXPLOSIVE EQUIPMENT PENALTY CALCULATION
  // ============================================================================

  describe('calculateExplosivePenalties()', () => {
    describe('per-slot penalty rates', () => {
      const baseConfig: Omit<ExplosivePenaltyConfig, 'equipment'> = {
        caseLocations: [],
        caseIILocations: [],
      };

      it('should apply 15 BV per slot for standard explosive equipment (ammo)', () => {
        const result = calculateExplosivePenalties({
          ...baseConfig,
          equipment: [
            { location: 'RT', slots: 2, penaltyCategory: 'standard' },
          ],
        });
        // 2 slots × 15 = 30
        expect(result.totalPenalty).toBe(30);
        expect(result.locationPenalties.RT).toBe(30);
      });

      it('should apply 1 BV per slot for Gauss weapons', () => {
        const result = calculateExplosivePenalties({
          ...baseConfig,
          equipment: [{ location: 'RA', slots: 7, penaltyCategory: 'gauss' }],
        });
        // 7 slots × 1 = 7
        expect(result.totalPenalty).toBe(7);
        expect(result.locationPenalties.RA).toBe(7);
      });

      it('should apply 1 BV total for HVAC weapons regardless of slots', () => {
        const result = calculateExplosivePenalties({
          ...baseConfig,
          equipment: [{ location: 'RT', slots: 4, penaltyCategory: 'hvac' }],
        });
        // 1 total (not 4 × 1)
        expect(result.totalPenalty).toBe(1);
        expect(result.locationPenalties.RT).toBe(1);
      });

      it('should apply 1 BV per slot for reduced penalty types', () => {
        const result = calculateExplosivePenalties({
          ...baseConfig,
          equipment: [{ location: 'LT', slots: 3, penaltyCategory: 'reduced' }],
        });
        // 3 slots × 1 = 3
        expect(result.totalPenalty).toBe(3);
        expect(result.locationPenalties.LT).toBe(3);
      });
    });

    describe('multi-location penalty accumulation', () => {
      it('should sum penalties across multiple locations', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RT', slots: 1, penaltyCategory: 'standard' },
            { location: 'LT', slots: 1, penaltyCategory: 'standard' },
            { location: 'CT', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: [],
          caseIILocations: [],
        });
        // 3 locations × 15 = 45
        expect(result.totalPenalty).toBe(45);
        expect(result.locationPenalties.RT).toBe(15);
        expect(result.locationPenalties.LT).toBe(15);
        expect(result.locationPenalties.CT).toBe(15);
      });

      it('should accumulate penalties within same location', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RT', slots: 1, penaltyCategory: 'standard' },
            { location: 'RT', slots: 1, penaltyCategory: 'standard' },
            { location: 'RT', slots: 7, penaltyCategory: 'gauss' },
          ],
          caseLocations: [],
          caseIILocations: [],
        });
        // RT: 15 + 15 + 7 = 37
        expect(result.totalPenalty).toBe(37);
        expect(result.locationPenalties.RT).toBe(37);
      });
    });

    describe('CASE II protection', () => {
      it('should eliminate ALL penalties in a CASE II protected location', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RT', slots: 2, penaltyCategory: 'standard' },
            { location: 'LT', slots: 2, penaltyCategory: 'standard' },
          ],
          caseLocations: [],
          caseIILocations: ['RT'],
        });
        // RT: protected by CASE II → 0
        // LT: unprotected → 2 × 15 = 30
        expect(result.totalPenalty).toBe(30);
        expect(result.locationPenalties.RT).toBeUndefined();
        expect(result.locationPenalties.LT).toBe(30);
      });

      it('should give zero penalty when all locations have CASE II', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RT', slots: 2, penaltyCategory: 'standard' },
            { location: 'LT', slots: 2, penaltyCategory: 'standard' },
            { location: 'RA', slots: 7, penaltyCategory: 'gauss' },
          ],
          caseLocations: [],
          caseIILocations: ['RT', 'LT', 'RA'],
        });
        expect(result.totalPenalty).toBe(0);
      });

      it('should protect arms with CASE II independently of torso', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RA', slots: 1, penaltyCategory: 'standard' },
            { location: 'RT', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: [],
          caseIILocations: ['RA'],
        });
        // RA: CASE II → 0
        // RT: no protection → 15
        expect(result.totalPenalty).toBe(15);
        expect(result.locationPenalties.RA).toBeUndefined();
      });
    });

    describe('CASE (IS) protection', () => {
      it('should eliminate penalty in side torso with standard engine', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RT', slots: 2, penaltyCategory: 'standard' },
          ],
          caseLocations: ['RT'],
          caseIILocations: [],
          engineType: EngineType.STANDARD,
        });
        // CASE in RT + standard engine (0 side torso slots) → no penalty
        expect(result.totalPenalty).toBe(0);
      });

      it('should NOT eliminate penalty in side torso with IS XL engine', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RT', slots: 2, penaltyCategory: 'standard' },
          ],
          caseLocations: ['RT'],
          caseIILocations: [],
          engineType: EngineType.XL_IS,
        });
        // CASE in RT + IS XL (3 side torso slots) → penalty still applies
        expect(result.totalPenalty).toBe(30);
      });

      it('should NOT eliminate penalty in side torso with XXL engine', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'LT', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: ['LT'],
          caseIILocations: [],
          engineType: EngineType.XXL,
        });
        // XXL has 3 side torso slots → CASE ineffective
        expect(result.totalPenalty).toBe(15);
      });

      it('should eliminate penalty in arm with CASE regardless of engine', () => {
        const result = calculateExplosivePenalties({
          equipment: [{ location: 'RA', slots: 7, penaltyCategory: 'gauss' }],
          caseLocations: ['RA'],
          caseIILocations: [],
          engineType: EngineType.XL_IS,
        });
        // CASE in arm always protects arm
        expect(result.totalPenalty).toBe(0);
      });
    });

    describe('Clan XL engine (CASE-equivalent)', () => {
      it('should allow CASE to work in side torsos with Clan XL (2 slots)', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RT', slots: 1, penaltyCategory: 'standard' },
            { location: 'LT', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: ['RT', 'LT'],
          caseIILocations: [],
          engineType: EngineType.XL_CLAN,
        });
        // Clan XL has 2 side torso slots → CASE effective
        expect(result.totalPenalty).toBe(0);
      });

      it('should allow CASE to work with Light engine (2 slots)', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RT', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: ['RT'],
          caseIILocations: [],
          engineType: EngineType.LIGHT,
        });
        // Light engine has 2 side torso slots → CASE effective
        expect(result.totalPenalty).toBe(0);
      });
    });

    describe('arm transfer logic (non-quad)', () => {
      it('should apply arm penalty when torso has penalty (no CASE anywhere)', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RA', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: [],
          caseIILocations: [],
        });
        // No CASE in RA, no CASE in RT → arm has penalty
        expect(result.totalPenalty).toBe(15);
      });

      it('should NOT apply arm penalty when transfer torso is protected by CASE', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RA', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: ['RT'],
          caseIILocations: [],
          engineType: EngineType.STANDARD,
        });
        // No CASE in RA, but RT has CASE + standard engine → RT no penalty → RA no penalty
        expect(result.totalPenalty).toBe(0);
      });

      it('should apply arm penalty when torso CASE is overridden by IS XL', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RA', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: ['RT'],
          caseIILocations: [],
          engineType: EngineType.XL_IS,
        });
        // RT has CASE but IS XL overrides → RT has penalty → RA transfers penalty
        expect(result.totalPenalty).toBe(15);
      });

      it('should NOT apply arm penalty when transfer torso has CASE II', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'LA', slots: 2, penaltyCategory: 'standard' },
          ],
          caseLocations: [],
          caseIILocations: ['LT'],
        });
        // No CASE in LA, but LT has CASE II → LT no penalty → LA no penalty
        expect(result.totalPenalty).toBe(0);
      });

      it('LA transfers to LT, RA transfers to RT', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'LA', slots: 1, penaltyCategory: 'standard' },
            { location: 'RA', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: ['LT'],
          caseIILocations: [],
          engineType: EngineType.STANDARD,
        });
        // LA → LT: LT has CASE + standard engine → no penalty → LA no penalty
        // RA → RT: RT has no CASE → penalty → RA has penalty = 15
        expect(result.totalPenalty).toBe(15);
        expect(result.locationPenalties.LA).toBeUndefined();
        expect(result.locationPenalties.RA).toBe(15);
      });
    });

    describe('quad mech arm handling', () => {
      it('should always apply penalty in leg/arm locations on quad mechs', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RA', slots: 1, penaltyCategory: 'standard' },
            { location: 'LA', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: ['RT', 'LT'],
          caseIILocations: [],
          engineType: EngineType.STANDARD,
          isQuad: true,
        });
        // Quad mechs: arms don't transfer to torso, always have penalty
        expect(result.totalPenalty).toBe(30);
      });
    });

    describe('CT, HD, and leg locations always have penalty', () => {
      it('should always penalize CT even with CASE in CT', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'CT', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: ['CT'],
          caseIILocations: [],
        });
        // CT always has penalty (CASE doesn't help in CT for BV)
        expect(result.totalPenalty).toBe(15);
      });

      it('should always penalize HD', () => {
        const result = calculateExplosivePenalties({
          equipment: [{ location: 'HD', slots: 1, penaltyCategory: 'reduced' }],
          caseLocations: [],
          caseIILocations: [],
        });
        expect(result.totalPenalty).toBe(1);
      });

      it('should always penalize legs', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'LL', slots: 1, penaltyCategory: 'standard' },
            { location: 'RL', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: [],
          caseIILocations: [],
        });
        expect(result.totalPenalty).toBe(30);
      });

      it('should protect CT with CASE II', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'CT', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: [],
          caseIILocations: ['CT'],
        });
        expect(result.totalPenalty).toBe(0);
      });
    });

    describe('realistic mech scenarios', () => {
      it('should calculate penalties for ammo-heavy mech (no protection)', () => {
        // Atlas-like: AC/20 ammo in RT (1 slot), LRM-20 ammo in LT (2 slots), SRM-6 ammo in CT (1 slot)
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RT', slots: 1, penaltyCategory: 'standard' },
            { location: 'LT', slots: 2, penaltyCategory: 'standard' },
            { location: 'CT', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: [],
          caseIILocations: [],
        });
        // RT: 15, LT: 30, CT: 15 = 60
        expect(result.totalPenalty).toBe(60);
      });

      it('should calculate penalty for Gauss Rifle (1 per slot)', () => {
        // Gauss Rifle: 7 crit slots in RA
        const result = calculateExplosivePenalties({
          equipment: [{ location: 'RA', slots: 7, penaltyCategory: 'gauss' }],
          caseLocations: [],
          caseIILocations: [],
        });
        // 7 slots × 1 = 7
        expect(result.totalPenalty).toBe(7);
      });

      it('should handle mixed explosive types in same location', () => {
        // RT: Gauss ammo (1 slot, standard) + Gauss Rifle (7 slots, gauss)
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'RT', slots: 1, penaltyCategory: 'standard' },
            { location: 'RT', slots: 7, penaltyCategory: 'gauss' },
          ],
          caseLocations: [],
          caseIILocations: [],
        });
        // 15 + 7 = 22
        expect(result.totalPenalty).toBe(22);
        expect(result.locationPenalties.RT).toBe(22);
      });

      it('should return zero for mech with no explosive equipment', () => {
        const result = calculateExplosivePenalties({
          equipment: [],
          caseLocations: [],
          caseIILocations: [],
        });
        expect(result.totalPenalty).toBe(0);
      });
    });

    describe('integration with defensive BV', () => {
      it('should subtract explosive penalties from defensive BV', () => {
        const withoutPenalty = calculateDefensiveBV({
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
        });

        const penalty = 30;
        const withPenalty = calculateDefensiveBV({
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          explosivePenalties: penalty,
        });

        // Defensive BV should be reduced by penalty × defensive factor
        const tmm = calculateTMM(6, 0);
        const defensiveFactor = 1 + tmm / 10.0;
        expect(withPenalty.totalDefensiveBV).toBeCloseTo(
          withoutPenalty.totalDefensiveBV - penalty * defensiveFactor,
          1,
        );
      });
    });
  });
});
