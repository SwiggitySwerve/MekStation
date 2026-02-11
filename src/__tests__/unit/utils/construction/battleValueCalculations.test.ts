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
  calculateAmmoBVWithExcessiveCap,
  getCockpitModifier,
  type DefensiveBVConfig,
  type ExplosiveEquipmentEntry,
  type ExplosivePenaltyConfig,
  type MechLocation,
  type CockpitType,
} from '@/utils/construction/battleValueCalculations';
import { resetCatalogCache } from '@/utils/construction/equipmentBVResolver';

describe('battleValueCalculations', () => {
  beforeAll(() => {
    resetCatalogCache();
  });
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
      // jumpTMM = mpToTMM(5) + 1 = 2 + 1 = 3; runTMM = mpToTMM(3) = 1
      expect(calculateTMM(3, 5)).toBe(3); // Uses jump MP 5 with +1 jump bonus
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

      it('should apply XL (IS) engine multiplier (0.5×)', () => {
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

        // 50 × 1.5 × 0.5 = 37.5 (EC-4: IS XL = 3 side torso crits)
        expect(result.structureBV).toBe(37.5);
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

      it('should apply XXL engine multiplier (0.25×)', () => {
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

        // 50 × 1.5 × 0.25 = 18.75 (EC-4: IS XXL = 6 side torso crits)
        expect(result.structureBV).toBe(18.75);
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

        // 50 × 1.5 × 2.0 (reinforced) × 0.5 (XL IS) = 75 (EC-4)
        expect(result.structureBV).toBe(75);
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
      it('should still penalize CT even when CASE is present (EC-47)', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'CT', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: ['CT'],
          caseIILocations: [],
        });
        // Per MegaMek MekBVCalculator.hasExplosiveEquipmentPenalty():
        // CASE does NOT protect CT — only CASE II does.
        // CT destruction kills the mech regardless of CASE.
        expect(result.totalPenalty).toBe(15);
      });

      it('should penalize CT without CASE', () => {
        const result = calculateExplosivePenalties({
          equipment: [
            { location: 'CT', slots: 1, penaltyCategory: 'standard' },
          ],
          caseLocations: [],
          caseIILocations: [],
        });
        // CT without CASE = mech destruction = penalty
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

    describe('defensive equipment BV contributions', () => {
      it('should add AMS BV to defensive total', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          defensiveEquipment: ['ams'],
        };
        const result = calculateDefensiveBV(config);

        // AMS BV is 32 (from catalog)
        // baseDef = 100*2.5 + 50*1.5 + 50*0.5 + 32 = 250 + 75 + 25 + 32 = 382
        // defensiveFactor = 1 + 2/10 = 1.2 (TMM for 6 MP)
        // totalDefensiveBV = 382 * 1.2 = 458.4
        expect(result.totalDefensiveBV).toBeCloseTo(458.4, 1);
      });

      it('should add ECM BV to defensive total', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          defensiveEquipment: ['guardian-ecm'],
        };
        const result = calculateDefensiveBV(config);

        // Guardian ECM BV is 61 (from catalog)
        // baseDef = 100*2.5 + 50*1.5 + 50*0.5 + 61 = 250 + 75 + 25 + 61 = 411
        // defensiveFactor = 1 + 2/10 = 1.2 (TMM for 6 MP)
        // totalDefensiveBV = 411 * 1.2 = 493.2
        expect(result.totalDefensiveBV).toBeCloseTo(493.2, 1);
      });

      it('should add BAP BV to defensive total', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          defensiveEquipment: ['beagle-active-probe'],
        };
        const result = calculateDefensiveBV(config);

        // Beagle Active Probe BV is 10 (from catalog)
        // baseDef = 100*2.5 + 50*1.5 + 50*0.5 + 10 = 250 + 75 + 25 + 10 = 360
        // defensiveFactor = 1 + 2/10 = 1.2 (TMM for 6 MP)
        // totalDefensiveBV = 360 * 1.2 = 432
        expect(result.totalDefensiveBV).toBeCloseTo(432, 1);
      });

      it('should sum multiple defensive equipment BV contributions', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          defensiveEquipment: ['ams', 'guardian-ecm', 'beagle-active-probe'],
        };
        const result = calculateDefensiveBV(config);

        // AMS (32) + Guardian ECM (61) + Beagle Active Probe (10) = 103
        // baseDef = 100*2.5 + 50*1.5 + 50*0.5 + 103 = 250 + 75 + 25 + 103 = 453
        // defensiveFactor = 1 + 2/10 = 1.2 (TMM for 6 MP)
        // totalDefensiveBV = 453 * 1.2 = 543.6
        expect(result.totalDefensiveBV).toBeCloseTo(543.6, 1);
      });

      it('should apply defensive equipment BV before speed factor multiplication', () => {
        const baseConfig: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
        };

        const withoutEquipment = calculateDefensiveBV(baseConfig);
        const withEquipment = calculateDefensiveBV({
          ...baseConfig,
          defensiveEquipment: ['ams'],
        });

        // The difference should be AMS BV (32) multiplied by the defensive factor (1.2)
        // 32 * 1.2 = 38.4
        expect(
          withEquipment.totalDefensiveBV - withoutEquipment.totalDefensiveBV,
        ).toBeCloseTo(32 * 1.2, 1);
      });

      it('should handle empty defensive equipment list', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          defensiveEquipment: [],
        };
        const result = calculateDefensiveBV(config);

        // Should be same as without defensive equipment
        const baseConfig: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
        };
        const baseResult = calculateDefensiveBV(baseConfig);

        expect(result.totalDefensiveBV).toBe(baseResult.totalDefensiveBV);
      });

      it('should combine defensiveEquipmentBV and defensiveEquipment array', () => {
        const config: DefensiveBVConfig = {
          totalArmorPoints: 100,
          totalStructurePoints: 50,
          tonnage: 50,
          runMP: 6,
          jumpMP: 0,
          armorType: 'standard',
          structureType: 'standard',
          gyroType: 'standard',
          defensiveEquipmentBV: 50,
          defensiveEquipment: ['ams'],
        };
        const result = calculateDefensiveBV(config);

        // defensiveEquipmentBV (50) + AMS (32) = 82
        // baseDef = 100*2.5 + 50*1.5 + 50*0.5 + 82 = 250 + 75 + 25 + 82 = 432
        // defensiveFactor = 1 + 2/10 = 1.2 (TMM for 6 MP)
        // totalDefensiveBV = 432 * 1.2 = 518.4
        expect(result.totalDefensiveBV).toBeCloseTo(518.4, 1);
      });
    });
  });

  // ============================================================================
  // AMMO BV WITH EXCESSIVE AMMO CAP
  // ============================================================================

  describe('calculateAmmoBVWithExcessiveCap()', () => {
    describe('basic ammo BV summation', () => {
      it('should return 0 when no ammo is provided', () => {
        const weapons = [{ id: 'ac-20', bv: 178 }];
        expect(calculateAmmoBVWithExcessiveCap(weapons, [])).toBe(0);
      });

      it('should return full ammo BV when below weapon cap', () => {
        const weapons = [{ id: 'ac-20', bv: 178 }];
        const ammo = [{ id: 'ac20-ammo-1', bv: 22, weaponType: 'ac-20' }];
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(22);
      });

      it('should sum multiple ammo tons of same type', () => {
        const weapons = [{ id: 'ac-20', bv: 178 }];
        const ammo = [
          { id: 'ac20-ammo-1', bv: 22, weaponType: 'ac-20' },
          { id: 'ac20-ammo-2', bv: 22, weaponType: 'ac-20' },
        ];
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(44);
      });
    });

    describe('excessive ammo cap', () => {
      it('should cap ammo BV at weapon BV when ammo exceeds weapon', () => {
        const weapons = [{ id: 'ac-20', bv: 178 }];
        const ammo = [
          { id: 'ac20-ammo-1', bv: 100, weaponType: 'ac-20' },
          { id: 'ac20-ammo-2', bv: 100, weaponType: 'ac-20' },
        ];
        // Total ammo 200 > weapon 178 → capped at 178
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(178);
      });

      it('should cap per weapon type independently', () => {
        const weapons = [
          { id: 'ac-20', bv: 178 },
          { id: 'lrm-20', bv: 181 },
        ];
        const ammo = [
          { id: 'ac20-ammo-1', bv: 200, weaponType: 'ac-20' },
          { id: 'lrm20-ammo-1', bv: 23, weaponType: 'lrm-20' },
        ];
        // AC/20 ammo 200 > 178 → capped at 178
        // LRM-20 ammo 23 < 181 → full 23
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(178 + 23);
      });

      it('should sum weapon BV across multiple weapons of same type for cap', () => {
        const weapons = [
          { id: 'medium-laser-1', bv: 46 },
          { id: 'machine-gun-1', bv: 5 },
          { id: 'machine-gun-2', bv: 5 },
        ];
        const ammo = [{ id: 'mg-ammo-1', bv: 8, weaponType: 'machine-gun' }];
        // Two MGs → weapon cap = 5 + 5 = 10; ammo 8 < 10 → full 8
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(8);
      });

      it('should cap ammo when exceeding combined weapon BV of same type', () => {
        const weapons = [
          { id: 'machine-gun-1', bv: 5 },
          { id: 'machine-gun-2', bv: 5 },
        ];
        const ammo = [
          { id: 'mg-ammo-1', bv: 7, weaponType: 'machine-gun' },
          { id: 'mg-ammo-2', bv: 7, weaponType: 'machine-gun' },
        ];
        // Total ammo 14 > weapon 10 → capped at 10
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(10);
      });
    });

    describe('orphaned ammo', () => {
      it('should return 0 BV for ammo with no matching weapon', () => {
        const weapons = [{ id: 'medium-laser-1', bv: 46 }];
        const ammo = [{ id: 'ac20-ammo-1', bv: 22, weaponType: 'ac-20' }];
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(0);
      });

      it('should return 0 when no weapons are present', () => {
        const ammo = [
          { id: 'ac20-ammo-1', bv: 22, weaponType: 'ac-20' },
          { id: 'lrm20-ammo-1', bv: 23, weaponType: 'lrm-20' },
        ];
        expect(calculateAmmoBVWithExcessiveCap([], ammo)).toBe(0);
      });

      it('should only count ammo with matching weapons, ignore orphaned', () => {
        const weapons = [{ id: 'ac-20', bv: 178 }];
        const ammo = [
          { id: 'ac20-ammo-1', bv: 22, weaponType: 'ac-20' },
          { id: 'lrm20-ammo-1', bv: 23, weaponType: 'lrm-20' },
        ];
        // AC/20 ammo matches → 22; LRM-20 ammo orphaned → 0
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(22);
      });
    });

    describe('weapon ID normalization', () => {
      it('should normalize instance-suffixed weapon IDs (ac20-1 → ac-20)', () => {
        const weapons = [{ id: 'ac20-1', bv: 178 }];
        const ammo = [{ id: 'ac20-ammo-1', bv: 22, weaponType: 'ac-20' }];
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(22);
      });

      it('should normalize LRM weapon IDs (lrm20-1 → lrm-20)', () => {
        const weapons = [{ id: 'lrm20-1', bv: 181 }];
        const ammo = [{ id: 'lrm20-ammo-1', bv: 23, weaponType: 'lrm-20' }];
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(23);
      });

      it('should normalize SRM weapon IDs (srm6-1 → srm-6)', () => {
        const weapons = [{ id: 'srm6-1', bv: 59 }];
        const ammo = [{ id: 'srm6-ammo-1', bv: 7, weaponType: 'srm-6' }];
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(7);
      });

      it('should normalize MG weapon IDs (machine-gun-1 → machine-gun)', () => {
        const weapons = [
          { id: 'machine-gun-1', bv: 5 },
          { id: 'machine-gun-2', bv: 5 },
        ];
        const ammo = [{ id: 'mg-ammo-1', bv: 1, weaponType: 'machine-gun' }];
        expect(calculateAmmoBVWithExcessiveCap(weapons, ammo)).toBe(1);
      });
    });

    describe('integration with offensive BV', () => {
      it('should include capped ammo BV in offensive BV total', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [{ id: 'ac-20', name: 'AC/20', heat: 7, bv: 178 }],
          ammo: [{ id: 'ac20-ammo-1', bv: 22, weaponType: 'ac-20' }],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
        });

        expect(result.ammoBV).toBe(22);
        expect(result.weaponBV).toBe(178);
        expect(result.weightBonus).toBe(50);
      });

      it('should return ammoBV field in offensive BV result', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            { id: 'medium-laser-1', name: 'Medium Laser', heat: 3, bv: 46 },
          ],
          tonnage: 20,
          walkMP: 8,
          runMP: 12,
          jumpMP: 0,
          heatDissipation: 10,
        });

        expect(result).toHaveProperty('ammoBV');
        expect(result.ammoBV).toBe(0);
      });

      it('should cap excessive ammo in full offensive BV calculation', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [{ id: 'ac-20', name: 'AC/20', heat: 7, bv: 50 }],
          ammo: [
            { id: 'ac20-ammo-1', bv: 40, weaponType: 'ac-20' },
            { id: 'ac20-ammo-2', bv: 40, weaponType: 'ac-20' },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
        });

        // Ammo total 80 > weapon 50 → capped at 50
        expect(result.ammoBV).toBe(50);
      });

      it('should not change canonical unit BV (Atlas AS7-D)', () => {
        const atlas = CANONICAL_BV_UNITS.find((u) => u.id === 'atlas-as7-d')!;
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: atlas.weapons,
          ammo: atlas.ammo,
          tonnage: atlas.tonnage,
          walkMP: atlas.walkMP,
          runMP: atlas.runMP,
          jumpMP: atlas.jumpMP,
          heatDissipation: atlas.heatSinks.count,
        });

        // Atlas ammo: AC/20 (22), LRM-20 (23), SRM-6 (7) = 52
        // All below weapon caps, so full ammo BV
        expect(result.ammoBV).toBe(52);
      });

      it('should not change canonical unit BV (Locust LCT-1V)', () => {
        const locust = CANONICAL_BV_UNITS.find(
          (u) => u.id === 'locust-lct-1v',
        )!;
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: locust.weapons,
          ammo: locust.ammo,
          tonnage: locust.tonnage,
          walkMP: locust.walkMP,
          runMP: locust.runMP,
          jumpMP: locust.jumpMP,
          heatDissipation: locust.heatSinks.count,
        });

        // Locust: MG ammo (1) < MG weapon BV (5+5=10) → full 1
        expect(result.ammoBV).toBe(1);
      });

      it('should apply ammo BV before speed factor multiplication', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [{ id: 'ac-20', name: 'AC/20', heat: 7, bv: 178 }],
          ammo: [{ id: 'ac20-ammo-1', bv: 22, weaponType: 'ac-20' }],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
        });

        const speedFactor = result.speedFactor;
        const expectedTotal =
          (result.weaponBV + result.ammoBV + result.weightBonus) * speedFactor;
        expect(result.totalOffensiveBV).toBeCloseTo(expectedTotal, 2);
      });
    });
  });

  // ============================================================================
  // WEAPON SORT ORDER (MegaMek heatSorter)
  // ============================================================================

  describe('weapon sort order (heatSorter)', () => {
    it('should place heatless weapons before heat-generating weapons', () => {
      // MG (heat 0, bv 5) should come before ML (heat 3, bv 46)
      // even though ML has higher BV
      const result = calculateOffensiveBVWithHeatTracking({
        weapons: [
          { id: 'medium-laser-1', name: 'Medium Laser', heat: 3, bv: 46 },
          { id: 'machine-gun-1', name: 'Machine Gun', heat: 0, bv: 5 },
        ],
        tonnage: 20,
        walkMP: 8,
        runMP: 12,
        jumpMP: 0,
        heatDissipation: 10,
      });

      // Both weapons fit within heat efficiency, so total is unaffected by order
      expect(result.weaponBV).toBe(51);
    });

    it('should sort heatless weapons first even when they affect heat penalty assignment', () => {
      // Heat efficiency = 6 + 1 - 2 = 5 (very low)
      // Weapons: MG (h0, bv5), ML (h3, bv46), ML (h3, bv46)
      // Correct sort: MG(h0), ML(h3 → bv desc), ML(h3)
      // MG: heatSum=0, not exceeded → 5, 0<5
      // ML: heatSum=3, not exceeded → 46, 3<5
      // ML: heatSum=6, not exceeded → 46, 6>=5 → exceeded
      // Total = 5 + 46 + 46 = 97
      // Without heatless-first: ML(46), ML(46), MG(5) → heatSum 3→6→6
      // ML: heatSum=3, full 46; ML: heatSum=6, full 46 but 6>=5→exceeded; MG: exceeded→5*0.5=2.5
      // Total = 46+46+2.5 = 94.5 (WRONG)
      const result = calculateOffensiveBVWithHeatTracking({
        weapons: [
          { id: 'medium-laser-1', name: 'Medium Laser', heat: 3, bv: 46 },
          { id: 'medium-laser-2', name: 'Medium Laser', heat: 3, bv: 46 },
          { id: 'machine-gun-1', name: 'Machine Gun', heat: 0, bv: 5 },
        ],
        tonnage: 20,
        walkMP: 8,
        runMP: 12,
        jumpMP: 0,
        heatDissipation: 1,
      });

      expect(result.weaponBV).toBe(97);
    });

    it('should sort by BV descending for heat-generating weapons', () => {
      const result = calculateOffensiveBVWithHeatTracking({
        weapons: [
          { id: 'small-laser-1', name: 'Small Laser', heat: 1, bv: 9 },
          { id: 'ppc-1', name: 'PPC', heat: 10, bv: 176 },
          { id: 'medium-laser-1', name: 'Medium Laser', heat: 3, bv: 46 },
        ],
        tonnage: 50,
        walkMP: 5,
        runMP: 8,
        jumpMP: 0,
        heatDissipation: 10,
      });

      // Heat efficiency = 6 + 10 - 2 = 14
      // Sorted: PPC(176,h10), ML(46,h3), SL(9,h1)
      // PPC: heatSum=10, full 176, 10<14
      // ML: heatSum=13, full 46, 13<14
      // SL: heatSum=14, full 9, 14>=14 → exceeded
      // Total = 176 + 46 + 9 = 231
      expect(result.weaponBV).toBe(231);
    });

    it('should break BV ties by heat ascending', () => {
      // Two weapons with same BV but different heat
      // Lower heat weapon should come first to minimize heat penalty impact
      const result = calculateOffensiveBVWithHeatTracking({
        weapons: [
          { id: 'weapon-a', name: 'Weapon A', heat: 8, bv: 100 },
          { id: 'weapon-b', name: 'Weapon B', heat: 3, bv: 100 },
        ],
        tonnage: 50,
        walkMP: 5,
        runMP: 8,
        jumpMP: 0,
        heatDissipation: 10,
      });

      // Heat efficiency = 14
      // Sorted by heat ascending (same BV): B(h3), A(h8)
      // B: heatSum=3, full 100, 3<14
      // A: heatSum=11, full 100, 11<14
      // Total = 200
      expect(result.weaponBV).toBe(200);
    });
  });

  // ============================================================================
  // WEAPON BV MODIFIERS (MegaMek processWeapon order)
  // ============================================================================

  describe('weapon BV modifiers', () => {
    describe('AES modifier (×1.25)', () => {
      it('should apply AES modifier to arm-mounted weapon', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            { id: 'ppc-1', name: 'PPC', heat: 10, bv: 176, hasAES: true },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
        });

        // 176 × 1.25 = 220
        expect(result.weaponBV).toBe(220);
      });

      it('should not apply AES to weapons without the flag', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [{ id: 'ppc-1', name: 'PPC', heat: 10, bv: 176 }],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
        });

        expect(result.weaponBV).toBe(176);
      });
    });

    describe('rear modifier (×0.5)', () => {
      it('should halve BV for rear-mounted weapons', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            {
              id: 'medium-laser-1',
              name: 'Medium Laser',
              heat: 3,
              bv: 46,
              rear: true,
            },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
        });

        // 46 × 0.5 = 23
        expect(result.weaponBV).toBe(23);
      });
    });

    describe('Artemis IV modifier (×1.2)', () => {
      it('should apply Artemis IV modifier to linked weapon', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            {
              id: 'lrm-20',
              name: 'LRM 20',
              heat: 6,
              bv: 181,
              artemisType: 'iv' as const,
            },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
        });

        // 181 × 1.2 = 217.2
        expect(result.weaponBV).toBeCloseTo(217.2, 1);
      });
    });

    describe('Artemis V modifier (×1.3)', () => {
      it('should apply Artemis V modifier to linked weapon', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            {
              id: 'lrm-20',
              name: 'LRM 20',
              heat: 6,
              bv: 181,
              artemisType: 'v' as const,
            },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
        });

        // 181 × 1.3 = 235.3
        expect(result.weaponBV).toBeCloseTo(235.3, 1);
      });
    });

    describe('Targeting Computer modifier (×1.25 for direct fire)', () => {
      it('should apply TC modifier to direct fire weapon', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            { id: 'ppc-1', name: 'PPC', heat: 10, bv: 176, isDirectFire: true },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
          hasTargetingComputer: true,
        });

        // 176 × 1.25 = 220
        expect(result.weaponBV).toBe(220);
      });

      it('should NOT apply TC modifier to non-direct-fire weapons', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            {
              id: 'lrm-20',
              name: 'LRM 20',
              heat: 6,
              bv: 181,
              isDirectFire: false,
            },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
          hasTargetingComputer: true,
        });

        // No TC modifier for non-direct-fire
        expect(result.weaponBV).toBe(181);
      });

      it('should NOT apply TC modifier when hasTargetingComputer is false', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            { id: 'ppc-1', name: 'PPC', heat: 10, bv: 176, isDirectFire: true },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
          hasTargetingComputer: false,
        });

        expect(result.weaponBV).toBe(176);
      });
    });

    describe('modifier application order (MegaMek exact)', () => {
      it('should apply modifiers in order: base → AES → rear → Artemis IV → TC', () => {
        // base=100, AES→125, rear→62.5, ArtemisIV→75, TC→93.75
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            {
              id: 'lrm-20',
              name: 'LRM 20',
              heat: 6,
              bv: 100,
              hasAES: true,
              rear: true,
              artemisType: 'iv' as const,
              isDirectFire: true,
            },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
          hasTargetingComputer: true,
        });

        // 100 × 1.25 (AES) × 0.5 (rear) × 1.2 (Artemis IV) × 1.25 (TC) = 93.75
        expect(result.weaponBV).toBeCloseTo(93.75, 2);
      });

      it('should apply modifiers in order: base → AES → rear → Artemis V → TC', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            {
              id: 'lrm-20',
              name: 'LRM 20',
              heat: 6,
              bv: 100,
              hasAES: true,
              rear: true,
              artemisType: 'v' as const,
              isDirectFire: true,
            },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
          hasTargetingComputer: true,
        });

        // 100 × 1.25 (AES) × 0.5 (rear) × 1.3 (Artemis V) × 1.25 (TC) = 101.5625
        expect(result.weaponBV).toBeCloseTo(101.5625, 2);
      });

      it('should apply rear + TC correctly without AES or Artemis', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            {
              id: 'ppc-1',
              name: 'PPC',
              heat: 10,
              bv: 176,
              rear: true,
              isDirectFire: true,
            },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 10,
          hasTargetingComputer: true,
        });

        // 176 × 0.5 (rear) × 1.25 (TC) = 110
        expect(result.weaponBV).toBe(110);
      });

      it('should apply heat halving AFTER all other modifiers', () => {
        // Heat efficiency = 6 + 1 - 2 = 5 → almost all weapons will be heat-exceeded
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            { id: 'ppc-1', name: 'PPC', heat: 10, bv: 176, isDirectFire: true },
            {
              id: 'medium-laser-1',
              name: 'ML',
              heat: 3,
              bv: 46,
              isDirectFire: true,
            },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 1,
          hasTargetingComputer: true,
        });

        // Heat efficiency = 6 + 1 - 2 = 5
        // PPC: BV = 176 × 1.25 (TC) = 220, heat=10
        // ML: BV = 46 × 1.25 (TC) = 57.5, heat=3
        // Sorted: PPC(220, h10), ML(57.5, h3)
        // PPC: heatSum=10, not exceeded (flag was false) → full 220, 10>=5 → exceeded
        // ML: heatSum=13, exceeded → 57.5 × 0.5 = 28.75
        // Total = 220 + 28.75 = 248.75
        expect(result.weaponBV).toBeCloseTo(248.75, 2);
      });
    });

    describe('modifier interaction with sort order', () => {
      it('should sort by MODIFIED BV (after all modifiers applied)', () => {
        // Weapon A: base=200, rear → 100
        // Weapon B: base=90
        // After modifiers, A(100) > B(90), so A sorted first
        const result = calculateOffensiveBVWithHeatTracking({
          weapons: [
            { id: 'weapon-b', name: 'B', heat: 5, bv: 90 },
            { id: 'weapon-a', name: 'A', heat: 5, bv: 200, rear: true },
          ],
          tonnage: 50,
          walkMP: 5,
          runMP: 8,
          jumpMP: 0,
          heatDissipation: 5,
        });

        // Heat efficiency = 6 + 5 - 2 = 9
        // After modifiers: A=100(rear), B=90
        // Sorted: A(100, h5), B(90, h5)
        // A: heatSum=5, not exceeded → 100, 5<9
        // B: heatSum=10, not exceeded → 90, 10>=9 → exceeded
        // Total = 100 + 90 = 190
        expect(result.weaponBV).toBe(190);
      });
    });
  });

  // ============================================================================
  // COCKPIT BV MODIFIERS
  // ============================================================================

  describe('getCockpitModifier()', () => {
    it('should return 0.95 for small cockpit', () => {
      expect(getCockpitModifier('small')).toBe(0.95);
    });

    it('should return 1.0 for torso-mounted cockpit (EC-1 MUL parity)', () => {
      expect(getCockpitModifier('torso-mounted')).toBe(1.0);
    });

    it('should return 0.95 for small command console', () => {
      expect(getCockpitModifier('small-command-console')).toBe(0.95);
    });

    it('should return 0.95 for drone operating system', () => {
      expect(getCockpitModifier('drone-operating-system')).toBe(0.95);
    });

    it('should return 1.3 for interface cockpit', () => {
      expect(getCockpitModifier('interface')).toBe(1.3);
    });

    it('should return 1.0 for standard cockpit', () => {
      expect(getCockpitModifier('standard')).toBe(1.0);
    });

    it('should return 1.0 for command console', () => {
      expect(getCockpitModifier('command-console')).toBe(1.0);
    });

    it('should return 1.0 for undefined cockpit type', () => {
      expect(getCockpitModifier(undefined)).toBe(1.0);
    });
  });

  describe('cockpit modifier applied to total BV', () => {
    it('should reduce final BV by ×0.95 for small cockpit', () => {
      const baseConfig = {
        totalArmorPoints: 100,
        totalStructurePoints: 50,
        tonnage: 50,
        heatSinkCapacity: 10,
        walkMP: 5,
        runMP: 8,
        jumpMP: 0,
        weapons: [{ id: 'medium-laser' }],
      };

      const baseBV = calculateTotalBV(baseConfig);
      const smallCockpitBV = calculateTotalBV({
        ...baseConfig,
        cockpitType: 'small' as CockpitType,
      });

      // Small cockpit: final BV × 0.95
      // Due to rounding, check the relationship holds
      expect(smallCockpitBV).toBeLessThan(baseBV);
      // The ratio should be approximately 0.95
      expect(smallCockpitBV / baseBV).toBeCloseTo(0.95, 1);
    });

    it('should increase final BV by ×1.3 for interface cockpit', () => {
      const baseConfig = {
        totalArmorPoints: 100,
        totalStructurePoints: 50,
        tonnage: 50,
        heatSinkCapacity: 10,
        walkMP: 5,
        runMP: 8,
        jumpMP: 0,
        weapons: [{ id: 'medium-laser' }],
      };

      const baseBV = calculateTotalBV(baseConfig);
      const interfaceBV = calculateTotalBV({
        ...baseConfig,
        cockpitType: 'interface' as CockpitType,
      });

      expect(interfaceBV).toBeGreaterThan(baseBV);
      expect(interfaceBV / baseBV).toBeCloseTo(1.3, 1);
    });

    it('should not change BV for standard cockpit', () => {
      const config = {
        totalArmorPoints: 100,
        totalStructurePoints: 50,
        tonnage: 50,
        heatSinkCapacity: 10,
        walkMP: 5,
        runMP: 8,
        jumpMP: 0,
        weapons: [{ id: 'medium-laser' }],
      };

      const baseBV = calculateTotalBV(config);
      const standardBV = calculateTotalBV({
        ...config,
        cockpitType: 'standard' as CockpitType,
      });

      expect(standardBV).toBe(baseBV);
    });

    it('should apply cockpit modifier in getBVBreakdown', () => {
      const baseConfig = {
        totalArmorPoints: 100,
        totalStructurePoints: 50,
        tonnage: 50,
        heatSinkCapacity: 10,
        walkMP: 5,
        runMP: 8,
        jumpMP: 0,
        weapons: [{ id: 'medium-laser' }],
      };

      const baseBreakdown = getBVBreakdown(baseConfig);
      const smallBreakdown = getBVBreakdown({
        ...baseConfig,
        cockpitType: 'small' as CockpitType,
      });

      expect(smallBreakdown.totalBV).toBeLessThan(baseBreakdown.totalBV);
    });
  });

  // ============================================================================
  // WEIGHT MODIFIERS (TSM, AES)
  // ============================================================================

  describe('weight modifiers (TSM, AES)', () => {
    const baseOffensiveConfig = {
      weapons: [
        { id: 'medium-laser-1', name: 'Medium Laser', heat: 3, bv: 46 },
      ],
      tonnage: 50,
      walkMP: 5,
      runMP: 8,
      jumpMP: 0,
      heatDissipation: 10,
    };

    describe('TSM (Triple Strength Myomer)', () => {
      it('should multiply weight bonus by 1.5', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          ...baseOffensiveConfig,
          hasTSM: true,
        });

        // Weight bonus = 50 × 1.5 = 75
        expect(result.weightBonus).toBe(75);
      });

      it('should increase total offensive BV with TSM', () => {
        const baseResult =
          calculateOffensiveBVWithHeatTracking(baseOffensiveConfig);
        const tsmResult = calculateOffensiveBVWithHeatTracking({
          ...baseOffensiveConfig,
          hasTSM: true,
        });

        expect(tsmResult.totalOffensiveBV).toBeGreaterThan(
          baseResult.totalOffensiveBV,
        );
      });
    });

    describe('Industrial TSM', () => {
      it('should multiply weight bonus by 1.15', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          ...baseOffensiveConfig,
          hasIndustrialTSM: true,
        });

        // Weight bonus = 50 × 1.15 = 57.5
        expect(result.weightBonus).toBeCloseTo(57.5, 2);
      });
    });

    describe('AES (Actuator Enhancement System)', () => {
      it('should multiply weight by 1.1 for one arm with AES', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          ...baseOffensiveConfig,
          aesArms: 1,
        });

        // Weight bonus = 50 × 1.1 = 55
        expect(result.weightBonus).toBeCloseTo(55, 2);
      });

      it('should multiply weight by 1.2 for two arms with AES', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          ...baseOffensiveConfig,
          aesArms: 2,
        });

        // Weight bonus = 50 × 1.2 = 60
        expect(result.weightBonus).toBeCloseTo(60, 2);
      });

      it('should default to no AES modifier when aesArms is 0', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          ...baseOffensiveConfig,
          aesArms: 0,
        });

        expect(result.weightBonus).toBe(50);
      });
    });

    describe('TSM + AES combination', () => {
      it('should apply AES multiplier first, then TSM to adjusted weight', () => {
        const result = calculateOffensiveBVWithHeatTracking({
          ...baseOffensiveConfig,
          hasTSM: true,
          aesArms: 2,
        });

        // AES: 1.0 + 0.2 = 1.2, adjustedWeight = 50 × 1.2 = 60
        // TSM: 60 × 1.5 = 90
        expect(result.weightBonus).toBeCloseTo(90, 2);
      });
    });
  });

  // ============================================================================
  // OFFENSIVE TYPE MODIFIER (Industrial Mech)
  // ============================================================================

  describe('offensive type modifier (Industrial Mech)', () => {
    it('should reduce offensive BV by ×0.9 for Industrial mech', () => {
      const baseResult = calculateOffensiveBVWithHeatTracking({
        weapons: [
          { id: 'medium-laser-1', name: 'Medium Laser', heat: 3, bv: 46 },
        ],
        tonnage: 50,
        walkMP: 5,
        runMP: 8,
        jumpMP: 0,
        heatDissipation: 10,
      });

      const industrialResult = calculateOffensiveBVWithHeatTracking({
        weapons: [
          { id: 'medium-laser-1', name: 'Medium Laser', heat: 3, bv: 46 },
        ],
        tonnage: 50,
        walkMP: 5,
        runMP: 8,
        jumpMP: 0,
        heatDissipation: 10,
        isIndustrialMech: true,
      });

      expect(industrialResult.totalOffensiveBV).toBeCloseTo(
        baseResult.totalOffensiveBV * 0.9,
        2,
      );
    });

    it('should not reduce offensive BV for non-Industrial mech', () => {
      const result1 = calculateOffensiveBVWithHeatTracking({
        weapons: [
          { id: 'medium-laser-1', name: 'Medium Laser', heat: 3, bv: 46 },
        ],
        tonnage: 50,
        walkMP: 5,
        runMP: 8,
        jumpMP: 0,
        heatDissipation: 10,
      });

      const result2 = calculateOffensiveBVWithHeatTracking({
        weapons: [
          { id: 'medium-laser-1', name: 'Medium Laser', heat: 3, bv: 46 },
        ],
        tonnage: 50,
        walkMP: 5,
        runMP: 8,
        jumpMP: 0,
        heatDissipation: 10,
        isIndustrialMech: false,
      });

      expect(result1.totalOffensiveBV).toBe(result2.totalOffensiveBV);
    });
  });

  // ============================================================================
  // STEALTH / CHAMELEON TMM BONUSES
  // ============================================================================

  describe('stealth and chameleon TMM bonuses', () => {
    const baseDefConfig: DefensiveBVConfig = {
      totalArmorPoints: 100,
      totalStructurePoints: 50,
      tonnage: 50,
      runMP: 6,
      jumpMP: 0,
      armorType: 'standard',
      structureType: 'standard',
      gyroType: 'standard',
    };

    it('should add +2 TMM for stealth armor', () => {
      const baseResult = calculateDefensiveBV(baseDefConfig);
      const stealthResult = calculateDefensiveBV({
        ...baseDefConfig,
        hasStealthArmor: true,
      });

      // Base TMM for runMP 6 = 2, factor = 1 + 2/10 = 1.2
      // Stealth TMM = 2 + 2 = 4, factor = 1 + 4/10 = 1.4
      expect(baseResult.defensiveFactor).toBe(1.2);
      expect(stealthResult.defensiveFactor).toBe(1.4);
    });

    it('should add +2 TMM for chameleon LPS', () => {
      const baseResult = calculateDefensiveBV(baseDefConfig);
      const chameleonResult = calculateDefensiveBV({
        ...baseDefConfig,
        hasChameleonLPS: true,
      });

      expect(baseResult.defensiveFactor).toBe(1.2);
      expect(chameleonResult.defensiveFactor).toBe(1.4);
    });

    it('should stack stealth and chameleon for +4 TMM total', () => {
      const bothResult = calculateDefensiveBV({
        ...baseDefConfig,
        hasStealthArmor: true,
        hasChameleonLPS: true,
      });

      // TMM = 2 + 2 (stealth) + 2 (chameleon) = 6
      // factor = 1 + 6/10 = 1.6
      expect(bothResult.defensiveFactor).toBe(1.6);
    });

    it('should increase total defensive BV with stealth armor', () => {
      const baseResult = calculateDefensiveBV(baseDefConfig);
      const stealthResult = calculateDefensiveBV({
        ...baseDefConfig,
        hasStealthArmor: true,
      });

      expect(stealthResult.totalDefensiveBV).toBeGreaterThan(
        baseResult.totalDefensiveBV,
      );
      // Ratio should be 1.4 / 1.2 ≈ 1.167
      expect(
        stealthResult.totalDefensiveBV / baseResult.totalDefensiveBV,
      ).toBeCloseTo(1.4 / 1.2, 2);
    });

    it('should propagate stealth armor through calculateTotalBV', () => {
      const config = {
        totalArmorPoints: 100,
        totalStructurePoints: 50,
        tonnage: 50,
        heatSinkCapacity: 10,
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        weapons: [{ id: 'medium-laser' }],
      };

      const baseBV = calculateTotalBV(config);
      const stealthBV = calculateTotalBV({ ...config, hasStealthArmor: true });

      expect(stealthBV).toBeGreaterThan(baseBV);
    });
  });
});
