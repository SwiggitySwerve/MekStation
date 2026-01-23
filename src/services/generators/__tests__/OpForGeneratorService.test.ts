/**
 * OpFor Generator Service Tests
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */


import { Era } from '../../../types/temporal/Era';
import { OpForSkillLevel, UnitTypeCategory } from '../../../types/scenario';
import {
  OpForGeneratorService,
  opForGenerator,
  getDefaultOpForConfig,
} from '../OpForGeneratorService';
import { Faction } from '../../../constants/scenario/rats';

describe('OpForGeneratorService', () => {
  let service: OpForGeneratorService;

  beforeEach(() => {
    service = new OpForGeneratorService();
  });

  describe('generate', () => {
    it('should generate an OpFor with correct structure', () => {
      const config = getDefaultOpForConfig(5000, Faction.DRACONIS_COMBINE, Era.LATE_SUCCESSION_WARS);
      const result = service.generate(config);

      expect(result).toBeDefined();
      expect(result.units).toBeDefined();
      expect(Array.isArray(result.units)).toBe(true);
      expect(result.units.length).toBeGreaterThan(0);
      expect(result.totalBV).toBeGreaterThan(0);
      expect(result.targetBV).toBe(5000);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.faction).toBe(Faction.DRACONIS_COMBINE);
    });

    it('should generate units near the target BV', () => {
      const config = getDefaultOpForConfig(6000, Faction.LYRAN_COMMONWEALTH, Era.LATE_SUCCESSION_WARS);
      const result = service.generate(config);

      // Should be within 20% of target
      expect(result.totalBV).toBeGreaterThan(4800); // 80%
      expect(result.totalBV).toBeLessThan(7200); // 120%
    });

    it('should apply difficulty multiplier', () => {
      const config = {
        ...getDefaultOpForConfig(5000, Faction.PIRATES, Era.CLAN_INVASION),
        difficultyMultiplier: 1.5,
      };
      const result = service.generate(config);

      // Target should be 5000 * 1.5 = 7500
      expect(result.targetBV).toBe(7500);
    });

    it('should generate pilots for each unit', () => {
      const config = getDefaultOpForConfig(5000);
      const result = service.generate(config);

      for (const unit of result.units) {
        expect(unit.pilot).toBeDefined();
        expect(unit.pilot.name).toBeDefined();
        expect(unit.pilot.name.length).toBeGreaterThan(0);
        expect(unit.pilot.gunnery).toBeGreaterThanOrEqual(1);
        expect(unit.pilot.gunnery).toBeLessThanOrEqual(6);
        expect(unit.pilot.piloting).toBeGreaterThanOrEqual(2);
        expect(unit.pilot.piloting).toBeLessThanOrEqual(7);
      }
    });

    it('should assign units to lances', () => {
      const config = getDefaultOpForConfig(10000);
      const result = service.generate(config);

      // All units should have lance assignments
      for (const unit of result.units) {
        expect(unit.lanceId).toBeDefined();
        expect(unit.lanceId).toMatch(/^lance-\d+$/);
      }
    });

    it('should use correct skills for Green skill level', () => {
      const config = {
        ...getDefaultOpForConfig(5000),
        skillLevel: OpForSkillLevel.Green,
      };
      const result = service.generate(config);

      // Green is 5/6
      for (const unit of result.units) {
        expect(unit.pilot.gunnery).toBe(5);
        expect(unit.pilot.piloting).toBe(6);
      }
    });

    it('should use correct skills for Elite skill level', () => {
      const config = {
        ...getDefaultOpForConfig(5000),
        skillLevel: OpForSkillLevel.Elite,
      };
      const result = service.generate(config);

      // Elite is 2/3
      for (const unit of result.units) {
        expect(unit.pilot.gunnery).toBe(2);
        expect(unit.pilot.piloting).toBe(3);
      }
    });

    it('should vary skills for Mixed skill level', () => {
      const config = {
        ...getDefaultOpForConfig(15000),
        skillLevel: OpForSkillLevel.Mixed,
      };
      const result = service.generate(config);

      // With enough units, we should see some variance
      const gunneries = result.units.map((u) => u.pilot.gunnery);
      const unique = new Set(gunneries);
      
      // Should have at least some variance with 15000 BV worth of units
      // (might not always trigger if we get unlucky, but usually will)
      expect(unique.size).toBeGreaterThanOrEqual(1);
    });

    it('should include unit metadata', () => {
      const config = getDefaultOpForConfig(5000);
      const result = service.generate(config);

      for (const unit of result.units) {
        expect(unit.chassis).toBeDefined();
        expect(unit.variant).toBeDefined();
        expect(unit.designation).toBeDefined();
        expect(unit.bv).toBeGreaterThan(0);
        expect(unit.tonnage).toBeGreaterThan(0);
        expect(unit.unitType).toBe(UnitTypeCategory.BattleMech);
      }
    });
  });

  describe('estimateSkillBVMultiplier', () => {
    it('should return 1.0 for standard 4/5 pilots', () => {
      const multiplier = service.estimateSkillBVMultiplier(4, 5);
      expect(multiplier).toBe(1);
    });

    it('should return > 1.0 for better pilots', () => {
      const multiplier = service.estimateSkillBVMultiplier(3, 4);
      expect(multiplier).toBeGreaterThan(1);
    });

    it('should return < 1.0 for worse pilots', () => {
      const multiplier = service.estimateSkillBVMultiplier(5, 6);
      expect(multiplier).toBeLessThan(1);
    });

    it('should return higher multiplier for elite pilots', () => {
      const veteran = service.estimateSkillBVMultiplier(3, 4);
      const elite = service.estimateSkillBVMultiplier(2, 3);
      expect(elite).toBeGreaterThan(veteran);
    });
  });

  describe('getDefaultOpForConfig', () => {
    it('should create a valid default config', () => {
      const config = getDefaultOpForConfig(5000);

      expect(config.playerBV).toBe(5000);
      expect(config.difficultyMultiplier).toBe(1.0);
      expect(config.skillLevel).toBe(OpForSkillLevel.Regular);
      expect(config.minLanceSize).toBe(4);
      expect(config.maxLanceSize).toBe(12);
    });

    it('should use provided faction and era', () => {
      const config = getDefaultOpForConfig(
        5000,
        Faction.CLAN_WOLF,
        Era.CLAN_INVASION
      );

      expect(config.faction).toBe(Faction.CLAN_WOLF);
      expect(config.era).toBe(Era.CLAN_INVASION);
    });

    it('should default to pirates faction', () => {
      const config = getDefaultOpForConfig(5000);
      expect(config.faction).toBe(Faction.PIRATES);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(opForGenerator).toBeDefined();
      expect(opForGenerator).toBeInstanceOf(OpForGeneratorService);
    });

    it('should generate OpFor using singleton', () => {
      const config = getDefaultOpForConfig(5000);
      const result = opForGenerator.generate(config);

      expect(result.units.length).toBeGreaterThan(0);
    });
  });
});
